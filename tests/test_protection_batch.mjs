import assert from 'node:assert/strict';
import { run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { timeToTrip } from '../src/core/tripCurves.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = (id) => LAB_LESSONS.find((l) => l.id === id);
const prepare = (id, edit = () => {}) => {
  const p = clone(lab(id).project);
  edit(p.devices, p.wires);
  return p;
};
const go = (p, steps, volts) => run(p.devices, p.wires, steps, 0.5, { standard: 'PEC', volts });
const violations = (p, volts) => analyzeCodeCompliance(p.devices, p.wires, solveCircuit(clone(p.devices), p.wires, 'PEC', volts), 'PEC', volts).violations;

console.log('--- Feeder protection and metering lab ---');
{
  const id = 'lab-feeder-protection-metering';
  assert.ok(lab(id), 'lab exists');
  // Healthy: runs, ammeter reads the motor current, voltmeter reads 440 V
  let d = go(prepare(id, (devices) => { byId(devices, 'q1').state.irFactor = 1; }), 4, 440);
  assert.equal(byId(d, 'm1').state.motorRunning, true);
  const amps = byId(d, 'm1').state.measuredAmps;
  assert.ok(Math.abs(byId(d, 'pa1').state.readingA - amps) < 0.2, 'ammeter reads the primary current');
  assert.ok(Math.abs(byId(d, 'ct1').state.secondaryA - amps / 10) < 0.05, 'CT secondary is primary / ratio');
  assert.equal(byId(d, 'pv1').state.readingV, 440);
  byId(d, 'pv1').state.selector = 'OFF';
  d = run(d, wiresOf(id), 1, 0.5, { volts: 440 });
  assert.equal(byId(d, 'pv1').state.readingV, 0);
  console.log('✓ healthy feeder: motor runs, ammeter reads the primary current, voltmeter reads 440 V (0 on OFF)');
}
function wiresOf(id) { return clone(lab(id).project.wires); }
{
  const id = 'lab-feeder-protection-metering';
  const leak = (sens) => go(prepare(id, (devices) => {
    byId(devices, 'q1').state.irFactor = 1;
    byId(devices, 'm1').state.hasEarthFault = true;
    byId(devices, 'm1').state.faultMa = 500;
    byId(devices, 'elr').state.sensitivityMa = sens;
  }), 8, 440);
  const tripped = leak(300);
  assert.equal(byId(tripped, 'q1').state.tripped, true, 'the shunt trip opened the MCCB');
  assert.match(byId(tripped, 'q1').state.tripReason, /Shunt trip/);
  assert.equal(!!byId(tripped, 'm1').state.motorRunning, false);
  const notTripped = leak(1000);
  assert.equal(byId(notTripped, 'elr').state.relayOn, false, '500 mA is below a 1 A setting');
  assert.equal(byId(notTripped, 'elr').state.leakageMa, 500, 'but the relay does read the leakage');
  assert.equal(!!byId(notTripped, 'q1').state.tripped, false);
  console.log('✓ earth leakage: ELR operates, shunt trip opens the MCCB; a 1 A setting rides through 500 mA');
}
{
  const id = 'lab-feeder-protection-metering';
  // MCCB thermal: Ir at 0.4 x 63 = 25.2 A; the motor draws ~4.8 A, so it never trips. Lower the dial until the motor overloads it.
  const heavy = go(prepare(id, (devices) => { const q = byId(devices, 'q1'); q.state.ratedAmps = 63; q.state.irFactor = 0.4; byId(devices, 'm1').state.wattage = 30000; }), 40, 440);
  assert.equal(byId(heavy, 'q1').state.tripped, true, 'overload trips the MCCB thermally');
  assert.match(byId(heavy, 'q1').state.tripReason, /thermal/);
  const fine = go(prepare(id, (devices) => { const q = byId(devices, 'q1'); q.state.irFactor = 1; byId(devices, 'm1').state.wattage = 30000; }), 40, 440);
  assert.equal(!!byId(fine, 'q1').state.tripped, false, 'the same load is carried at Ir = 1.0');
  console.log('✓ MCCB Ir dial: the same overload trips at 0.4 x In and is carried at 1.0 x In');
  // Magnetic: Im = 2 x Ir with a stalled-motor style current
  const mag = go(prepare(id, (devices) => { const q = byId(devices, 'q1'); q.state.ratedAmps = 63; q.state.irFactor = 0.4; q.state.imFactor = 2; byId(devices, 'm1').state.wattage = 30000; }), 2, 440);
  assert.match(byId(mag, 'q1').state.tripReason || '', /magnetic/);
  console.log('✓ MCCB Im dial: a current above Im x Ir trips instantaneously');
  assert.ok(timeToTrip('mccb_thermal', 63, 2) > timeToTrip('mccb_thermal', 63, 6), 'curve falls with current');
}
{
  const id = 'lab-feeder-protection-metering';
  const p = prepare(id, (devices, wires) => {
    byId(devices, 'q1').state.irFactor = 1;
    const i = wires.findIndex((w) => w.fromDeviceId === 'pa1' && w.toDeviceId === 'ct1');
    wires.splice(i, 1);
  });
  // Ammeter wire to S1 remains but the return to S2 is gone: the secondary is open
  const d = go(p, 3, 440);
  assert.equal(byId(d, 'ct1').state.openSecondary, true);
  const p2 = { ...p, devices: d };
  assert.ok(violations(p2, 440).some((v) => v.id.startsWith('viol_ct_open_secondary_') && v.severity === 'error'));
  console.log('✓ open CT secondary flagged as an error');
}

console.log('\n--- AFDD and GFCI lab ---');
{
  const id = 'lab-afdd-gfci';
  assert.ok(lab(id));
  let d = go(prepare(id), 3, 230);
  assert.equal(byId(d, 'fan_a').state.powered, true);
  assert.equal(byId(d, 'fan_b').state.powered, true, 'LOAD side is live');
  const faultB = go(prepare(id, (devices) => { byId(devices, 'fan_b').state.hasEarthFault = true; }), 3, 230);
  assert.equal(byId(faultB, 'gfci').state.tripped, true, 'GFCI trips on a fault downstream of LOAD');
  assert.equal(!!byId(faultB, 'fan_a').state.powered, false, 'and the face is dead with it');
  const faultA = go(prepare(id, (devices) => { byId(devices, 'fan_a').state.hasEarthFault = true; }), 3, 230);
  assert.equal(byId(faultA, 'gfci').state.tripped, true, 'GFCI trips on a fault at its own face');
  console.log('✓ GFCI trips on earth faults at its face and on its LOAD side');
  const arc = go(prepare(id, (devices) => { byId(devices, 'fan_a').state.looseTerminal = true; }), 3, 230);
  assert.equal(byId(arc, 'afdd').state.tripped, true, 'AFDD trips on series arcing');
  assert.match(byId(arc, 'afdd').state.tripReason, /AFDD/);
  console.log('✓ AFDD trips on a loose terminal');
  // The same loose terminal behind an ordinary MCB is only a fire hazard note
  const p = prepare(id, (devices, wires) => {
    byId(devices, 'fan_a').state.looseTerminal = true;
    const i = devices.findIndex((x) => x.id === 'afdd');
    devices[i] = { ...devices[i], type: 'mcb_1p', terminals: [
      { id: 'in', name: 'in', type: 'phase', relX: 0.5, relY: 0.1, label: '1' },
      { id: 'out', name: 'out', type: 'phase', relX: 0.5, relY: 0.9, label: '2' },
      { id: 'in_n', name: 'n in', type: 'neutral', relX: 0.2, relY: 0.1, label: 'N' },
      { id: 'out_n', name: 'n out', type: 'neutral', relX: 0.2, relY: 0.9, label: 'N' },
    ], state: { closed: true, tripped: false, ratedAmps: 16, tripCurve: 'C' } };
    for (const w of wires) {
      if (w.toDeviceId === 'afdd' && w.toTerminalId === 'in_l') w.toTerminalId = 'in';
      if (w.fromDeviceId === 'afdd' && w.fromTerminalId === 'out_l') w.fromTerminalId = 'out';
      if (w.fromDeviceId === 'afdd' && w.fromTerminalId === 'out_n') { w.fromDeviceId = 'src'; w.fromTerminalId = 'n_out'; }
    }
    wires.splice(wires.findIndex((w) => w.toDeviceId === 'afdd' && w.toTerminalId === 'in_n'), 1);
  });
  const mcb = go(p, 3, 230);
  assert.equal(!!byId(mcb, 'afdd').state.tripped, false, 'an MCB does not see the arc');
  assert.equal(byId(mcb, 'fan_a').state.arcing, true);
  assert.ok(violations({ devices: mcb, wires: p.wires }, 230).some((v) => v.id.startsWith('viol_loose_terminal_')));
  console.log('✓ with an MCB the arc goes unseen: only a fire-hazard warning');
  // A 300 mA RCCB no longer counts as shock protection, a 30 mA one does
  const rccb = (ma) => {
    const q = prepare(id);
    q.devices = q.devices.filter((x) => x.id !== 'gfci');
    q.devices.push({ ...clone(lab('lab-feeder-protection-metering').project.devices[0]), id: 'r', type: 'rcd_4p', state: { sensitivityMa: ma, closed: true } });
    q.devices.push({ ...clone(q.devices.find((x) => x.id === 'fan_a')), id: 'sock', type: 'socket_duplex' });
    return violations(q, 230).some((v) => v.id === 'viol_missing_rcd');
  };
  assert.equal(rccb(300), true, '300 mA is fire protection, not shock protection');
  assert.equal(rccb(30), false);
  console.log('✓ RCCB 4P counts as shock protection only at 30 mA');
}

console.log('\n--- MPCB, PTC relay and isolator lab ---');
{
  const id = 'lab-mpcb-ptc-isolator';
  assert.ok(lab(id));
  const start = (extra = () => {}) => prepare(id, (devices) => { byId(devices, 's1').state.startPressed = true; extra(devices); });
  let d = go(start(), 4, 440);
  assert.equal(byId(d, 'm1').state.motorRunning, true, 'runs with an isolator, an MPCB and no overload relay');
  assert.equal(byId(d, 'xt1').state.kind, 'pe');
  const heating = start((devices) => { byId(devices, 'm1').state.loadPct = 150; });
  let hot = heating.devices;
  let peak = 0;
  for (let i = 0; i < 5; i++) {
    hot = run(hot, heating.wires, 1, 0.5, { volts: 440 });
    peak = Math.max(peak, byId(hot, 'm1').state.windingC);
  }
  assert.ok(peak >= 120, `winding temperature rose past the response temperature (${peak})`);
  assert.equal(byId(hot, 'kt1').state.ptcTripped, true, 'PTC relay released');
  assert.equal(!!byId(hot, 'km1').state.coilEnergized, false, 'the contactor dropped out');
  console.log('✓ PTC relay releases the starter when the winding overheats');
  const trip = go(start((devices) => { byId(devices, 'q1').state.irAmps = 2.5; }), 40, 440);
  assert.equal(byId(trip, 'q1').state.tripped, true, 'class 10 element trips with no overload relay');
  assert.match(byId(trip, 'q1').state.tripReason, /thermal/);
  console.log('✓ MPCB thermal element replaces the overload relay');
  const locked = go(prepare(id, (devices) => { byId(devices, 'q0').state.locked = true; byId(devices, 's1').state.startPressed = true; }), 3, 440);
  assert.equal(!!byId(locked, 'm1').state.motorRunning, false, 'a locked isolator keeps everything dead');
  console.log('✓ padlocked isolator: starter cannot run');
  byId(hot, 'm1').state.loadPct = 100;
  byId(hot, 's1').state.startPressed = false;
  const cooled = run(hot, heating.wires, 60, 0.5, { volts: 440 });
  assert.ok(byId(cooled, 'm1').state.windingC < 60, 'the winding cools once the starter is stopped');
  console.log('✓ winding cools back down when the load is removed');
}
console.log('\nPROTECTION BATCH TESTS PASSED');
