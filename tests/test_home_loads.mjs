import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { LAMP_TYPES, APPLIANCE_KINDS } from '../src/data/loadPresets.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 0;
const w = (a, at, b, bt, extra) => wire(`h${++seq}`, a, at, b, bt, extra);
const L = (b, bt) => w('grid', 'l_out', b, bt);
const Nn = (b, bt) => w('grid', 'n_out', b, bt, N);
const grid = () => dev('kwh_meter_1p', 'grid');
const setState = (devices, id, patch) => {
  const d = clone(devices);
  Object.assign(byId(d, id).state, patch);
  return d;
};
const amps = (devices, wires, wireId) => solve(devices, wires).wireCurrents[wireId] || 0;

console.log('--- Lamp types ---');
{
  const make = (type) => {
    const p = LAMP_TYPES[type];
    const devices = [grid(), dev('light_bulb', 'lamp', { lampType: type, wattage: p.wattage, pf: p.pf })];
    const wires = [{ ...L('lamp', 'hot'), id: 'lw' }, Nn('lamp', 'neutral')];
    return amps(devices, wires, 'lw');
  };
  const inc = make('incandescent');
  assert.ok(Math.abs(inc - 60 / 230) < 0.005, `incandescent ${inc}`);
  const fl = make('fluorescent');
  assert.ok(Math.abs(fl - 36 / (230 * 0.5)) < 0.005, `fluorescent draws W / (V x pf): ${fl}`);
  assert.ok(fl > make('led') * 5, 'a 36 W tube draws much more than a 9 W LED');
  assert.ok(Object.keys(LAMP_TYPES).length === 5);
  // an old lamp with no pf behaves exactly as before
  const old = solve([grid(), dev('light_bulb', 'lamp')], [{ ...L('lamp', 'hot'), id: 'lw' }, Nn('lamp', 'neutral')]).wireCurrents.lw;
  assert.ok(Math.abs(old - 60 / 230) < 0.005);
  console.log('✓ current = W / (V x pf); lamps without a type are unchanged');
}

console.log('\n--- Appliance cycling ---');
{
  const make = (kind, extra = {}) => {
    const p = APPLIANCE_KINDS[kind];
    return { devices: [grid(), dev('appliance_generic', 'a', { applianceKind: kind, wattage: p.wattage, pf: p.pf, ...extra })], wires: [L('a', 'line'), Nn('a', 'neutral')] };
  };
  const watts = (d) => byId(d, 'a').state.wattsNow;
  // range: on for 40 s, off for 20 s
  let r = make('range');
  let seen = new Set();
  for (let i = 0; i < 130; i++) {
    r.devices = run(r.devices, r.wires, 1);
    seen.add(watts(r.devices));
  }
  assert.ok(seen.has(8000) && seen.has(0), 'range cycles between full power and off');
  // refrigerator
  let f = make('refrigerator');
  f.devices = run(f.devices, f.wires, 2);
  assert.equal(watts(f.devices), 150, 'compressor on first');
  f.devices = run(f.devices, f.wires, 62);
  assert.equal(watts(f.devices), 5, 'standby in the off half');
  // rice cooker: cook then keep warm
  let c = make('rice_cooker', { cookSec: 10 });
  c.devices = run(c.devices, c.wires, 4);
  assert.equal(watts(c.devices), 700);
  c.devices = run(c.devices, c.wires, 30);
  assert.equal(watts(c.devices), 60, 'keep warm after the cook time');
  // microwave: timer
  let m = make('microwave');
  m.devices = run(m.devices, m.wires, 2);
  assert.equal(watts(m.devices), 3, 'standby until started');
  m.devices = run(setState(m.devices, 'a', { timerSec: 4 }), m.wires, 2);
  assert.equal(watts(m.devices), 1200, 'timer running: full power');
  m.devices = run(m.devices, m.wires, 6);
  assert.equal(watts(m.devices), 3, 'timer finished');
  // washing machine program ends at idle
  let wm = make('washing_machine');
  const phases = [];
  for (let i = 0; i < 320; i++) {
    wm.devices = run(wm.devices, wm.wires, 1);
    const p = byId(wm.devices, 'a').state.phase;
    if (phases[phases.length - 1] !== p) phases.push(p);
  }
  assert.deepEqual(phases, ['fill', 'heat', 'wash', 'spin', 'done']);
  // the load shows up as wire current, with its power factor
  const solved = solve(setState(r.devices, 'a', { wattsNow: 2300, pf: 1 }), r.wires);
  assert.ok(solved.totalWatts >= 2300, 'real power is counted');
  // no supply: nothing and the cycle restarts
  const off = run(r.devices, [], 1);
  assert.equal(byId(off, 'a').state.elapsedSec, 0);
  console.log('✓ range, refrigerator, rice cooker, microwave and washing machine cycles');
}

console.log('\n--- Emergency luminaire and exit sign ---');
{
  const devices = [grid(), dev('emergency_light', 'em', { autonomyH: 3, socPct: 100 }), dev('emergency_light', 'ex', { kind: 'exit_sign', autonomyH: 3, socPct: 100 })];
  const wires = [L('em', 'l'), Nn('em', 'n'), L('ex', 'l'), Nn('ex', 'n')];
  let d = run(devices, wires, 2);
  assert.ok(!byId(d, 'em').state.lit, 'mains present: the non-maintained light is off');
  assert.ok(byId(d, 'ex').state.lit, 'the exit sign is always lit');
  // lose the supply
  d = run(d, [], 3);
  assert.ok(byId(d, 'em').state.lit && byId(d, 'em').state.onBattery, 'supply lost: the emergency light runs on its battery');
  assert.ok(byId(d, 'em').state.socPct < 100, 'the battery discharges');
  assert.ok(byId(d, 'ex').state.lit, 'the exit sign stays lit on battery');
  d = run(setState(d, 'em', { socPct: 0.2 }), [], 4);
  assert.ok(!byId(d, 'em').state.lit, 'flat battery: dark');
  d = run(d, wires, 10);
  assert.ok(byId(d, 'em').state.socPct > 0.2, 'mains back: it recharges');

  // switched feed rule
  const sw = dev('switch_1gang', 'sw', { closed: true });
  const lightWires = [L('sw', 'l_in'), w('sw', 'sw_out', 'em', 'l'), Nn('em', 'n')];
  const solved = solve([grid(), sw, dev('emergency_light', 'em')], lightWires);
  const flagged = analyzeCodeCompliance([grid(), sw, dev('emergency_light', 'em')], lightWires, solved, 'PEC', 230).violations.filter((v) => v.id.startsWith('viol_em_switched'));
  assert.equal(flagged.length, 1, 'a wall switch in the feed is flagged');
  assert.match(flagged[0].articleRef, /verified/, 'no invented clause number');
  const fine = analyzeCodeCompliance([grid(), dev('emergency_light', 'em')], [L('em', 'l'), Nn('em', 'n')], solve([grid(), dev('emergency_light', 'em')], [L('em', 'l'), Nn('em', 'n')]), 'PEC', 230).violations.filter((v) => v.id.startsWith('viol_em_switched'));
  assert.equal(fine.length, 0, 'an unswitched feed is fine');
  // through a junction box
  const box = dev('junction_box_octagonal_orange', 'jb');
  const boxT = box.terminals.filter((t) => t.spliceGroup).slice(0, 2).map((t) => t.id);
  if (boxT.length === 2) {
    const bw = [L('sw', 'l_in'), w('sw', 'sw_out', 'jb', boxT[0]), w('jb', boxT[1], 'em', 'l'), Nn('em', 'n')];
    const devs = [grid(), dev('switch_1gang', 'sw', { closed: true }), box, dev('emergency_light', 'em')];
    const v = analyzeCodeCompliance(devs, bw, solve(devs, bw), 'PEC', 230).violations.filter((x) => x.id.startsWith('viol_em_switched'));
    assert.equal(v.length, 1, 'the switch is found through a junction box');
  }
  console.log('✓ battery backup, maintained exit sign and the switched-feed warning');
}

console.log('\n--- Fan regulator ---');
{
  const devices = [grid(), dev('fan_regulator', 'reg', { step: 5, fanId: 'fan' }), dev('appliance_fan', 'fan')];
  const wires = [L('reg', 'in'), w('reg', 'out', 'fan', 'line'), Nn('fan', 'neutral')];
  let d = run(devices, wires, 2);
  assert.equal(byId(d, 'fan').state.wattage, 65, 'step 5: full power');
  d = run(setState(d, 'reg', { step: 1 }), wires, 2);
  assert.equal(byId(d, 'fan').state.wattage, Math.round(65 * 0.35), 'step 1: 35 %');
  assert.ok(solve(d, wires).deviceEnergized.fan);
  d = run(setState(d, 'reg', { step: 0 }), wires, 2);
  assert.ok(!solve(d, wires).deviceEnergized.fan, 'step 0: off');
  const unlinked = run([dev('appliance_fan', 'fan')], [], 1);
  assert.equal(byId(unlinked, 'fan').state.wattage, 65, 'a fan without a regulator is untouched');
  console.log('✓ speed steps scale the fan power; step 0 opens the feed');
}

console.log('\n--- Doorbell ---');
{
  const devices = [grid(), dev('doorbell_set', 'bell'), dev('switch_1gang', 'push', { closed: false })];
  const wires = [L('bell', 'l'), Nn('bell', 'n'), w('bell', 'b1', 'push', 'l_in'), w('push', 'sw_out', 'bell', 'b2')];
  let d = run(devices, wires, 2);
  assert.ok(byId(d, 'bell').state.secondaryV === 12 && !byId(d, 'bell').state.ringing, 'powered, loop open: 12 V, quiet');
  d = run(setState(d, 'push', { closed: true }), wires, 2);
  assert.ok(byId(d, 'bell').state.ringing, 'button pressed: rings');
  d = run(setState(d, 'push', { closed: false }), wires, 2);
  assert.ok(!byId(d, 'bell').state.ringing);
  console.log('✓ the push button closes the 12 V loop and the chime rings');
}

console.log('\n--- Power strip ---');
{
  const make = (slots, cord = 10) => ({ devices: [grid(), dev('power_strip', 'ps', { slots, cordAmps: cord })], wires: [L('ps', 'line'), Nn('ps', 'neutral')] });
  const ok = make(['tv', 'charger', 'none', 'none']);
  let d = run(ok.devices, ok.wires, 20);
  assert.ok(!byId(d, 'ps').state.overload && byId(d, 'ps').state.cordHeat === 0, 'a light load is fine');
  const bad = make(['kettle', 'heater', 'iron', 'tv']);
  d = run(bad.devices, bad.wires, 3);
  assert.ok(byId(d, 'ps').state.overload, 'more than the cord rating: overload');
  assert.ok(byId(d, 'ps').state.loadAmps > 20, `about 20 A (${byId(d, 'ps').state.loadAmps})`);
  d = run(d, bad.wires, 4);
  const hot = byId(d, 'ps').state.cordHeat;
  assert.ok(hot > 0, 'the cord heats');
  d = run(setState(d, 'ps', { slots: ['tv', 'none', 'none', 'none'] }), bad.wires, 30);
  assert.ok(byId(d, 'ps').state.cordHeat < hot, 'a lighter load lets it cool');
  d = run(setState(d, 'ps', { slots: ['kettle', 'heater', 'iron', 'tv'] }), bad.wires, 120);
  assert.ok(byId(d, 'ps').state.burnt, 'left overloaded: the cord burns out');
  assert.ok(solve(d, bad.wires).totalWatts < 200, 'the burnt strip takes no power');
  d = run(setState(d, 'ps', { burnt: false, cordHeat: 0, slots: ['tv', 'none', 'none', 'none'] }), bad.wires, 3);
  assert.ok(!byId(d, 'ps').state.burnt, 'replacing the cord restores it');
  console.log('✓ overload heats the cord, cools when relieved, burns out when ignored');
}

console.log('\n--- Labs ---');
{
  const load = (id) => {
    const lab = LAB_LESSONS.find((l) => l.id === id);
    assert.ok(lab, `${id} registered`);
    const ids = new Set(lab.project.devices.map((d) => d.id));
    for (const x of lab.project.wires) assert.ok(ids.has(x.fromDeviceId) && ids.has(x.toDeviceId), `${id}: wire ${x.id} references real devices`);
    return clone(lab.project);
  };
  {
    const p = load('lab-home-kitchen-loads');
    let d = run(p.devices, p.wires, 4);
    assert.ok(solve(d, p.wires).deviceEnergized.fridge && byId(d, 'fridge').state.wattsNow > 0, 'kitchen lab: appliances run');
    const total = solve(d, p.wires).totalWatts;
    assert.ok(total > 1000, `a heavy kitchen total (${total} W)`);
  }
  {
    const p = load('lab-home-octopus-overload');
    let d = run(p.devices, p.wires, 4);
    assert.ok(byId(d, 'strip').state.overload, 'octopus lab: overload');
    d = run(d, p.wires, 200);
    assert.ok(byId(d, 'strip').state.burnt, 'the cord burns out before the 32 A breaker acts');
    assert.ok(!solve(d, p.wires).trippedDevices.includes('q1'), 'the main breaker never tripped');
  }
  {
    const p = load('lab-home-emergency-extras');
    let d = run(p.devices, p.wires, 3);
    assert.ok(byId(d, 'exit').state.lit && !byId(d, 'em').state.lit, 'extras lab: exit sign lit, emergency light off');
    const outage = run(setState(d, 'q1', { closed: false }), p.wires, 3);
    assert.ok(byId(outage, 'em').state.lit && byId(outage, 'em').state.onBattery, 'outage: emergency light on battery');
    const ring = run(setState(d, 'push', { closed: true }), p.wires, 2);
    assert.ok(byId(ring, 'bell').state.ringing, 'doorbell rings');
  }
  console.log('✓ three labs run through their objectives');
}

console.log('\nHOME LOAD TESTS PASSED');
