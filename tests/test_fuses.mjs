import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { applyProtectiveOutcome } from '../src/core/simulationTick.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = (id) => {
  const l = LAB_LESSONS.find((x) => x.id === id);
  assert.ok(l, `lab ${id} exists`);
  return clone(l.project);
};

console.log('--- Fuse holder 1P: gG overload then short circuit ---');
{
  const p = lab('lab-fuse-gg-overload-short');
  const heaterOn = (d) => !!byId(d, 'wh').state.powered;

  // A short run: heat is building but the link is intact and the heater is on
  let devices = run(p.devices, p.wires, 2, 0.5);
  assert.equal(heaterOn(devices), true, 'heater runs at first');
  assert.ok(byId(devices, 'f1').state.heat > 0 && !byId(devices, 'f1').state.blown, 'link heating, not blown yet');

  // Overload: 15 A on a 6 A link (2.5x) melts it along the gG curve
  devices = run(devices, p.wires, 40, 0.5);
  const f1 = byId(devices, 'f1');
  assert.equal(f1.state.blown, true, 'the 6 A fuse blows under the 3.5 kW heater');
  assert.ok(/Fuse blown/.test(f1.state.tripReason), 'reason is recorded');
  devices = run(devices, p.wires, 1, 0.5);
  assert.equal(heaterOn(devices), false, 'a blown fuse opens the circuit');
  console.log(`✓ overload: heat built up, link blew, heater dead (${f1.state.tripReason})`);

  // A blown fuse stays open for as long as the simulation runs
  devices = run(devices, p.wires, 20, 0.5);
  assert.equal(heaterOn(devices), false, 'stays blown until replaced');

  // Replace with a 16 A link: 15.2 A is 0.95x, so it never blows
  const replaced = clone(devices);
  Object.assign(byId(replaced, 'f1').state, { blown: false, tripped: false, closed: true, heat: 0, onSec: 0, ratedAmps: 16 });
  const longRun = run(replaced, p.wires, 400, 0.5);
  assert.equal(byId(longRun, 'f1').state.blown, false, '16 A link survives 200 s of real time');
  assert.equal(heaterOn(longRun), true);
  console.log('✓ replaced with a 16 A link: heater runs and the fuse never blows');

  // Short circuit: instant, no heating delay
  const shorted = clone(longRun);
  byId(shorted, 'sw_short').state.closed = true;
  const after = run(shorted, p.wires, 1, 0.5);
  assert.equal(byId(after, 'f1').state.blown, true, 'bolted fault blows the fuse in the first solve');
  console.log('✓ short circuit: fuse blows immediately');
}

console.log('\n--- aM vs gG on a motor start ---');
{
  const build = (kind) => {
    const src = dev('source_3phase_440v', 'src');
    const fs = dev('fuse_switch_disconnector_3p', 'fs', { fuseKind: kind, ratedAmps: 6 });
    const motor = dev('motor_ac_industrial', 'mot', { wattage: 2200 });
    const wires = [
      wire('a1', 'src', 'l1', 'fs', 'in_l1'), wire('a2', 'src', 'l2', 'fs', 'in_l2'), wire('a3', 'src', 'l3', 'fs', 'in_l3'),
      wire('b1', 'fs', 'out_l1', 'mot', 'u1'), wire('b2', 'fs', 'out_l2', 'mot', 'v1'), wire('b3', 'fs', 'out_l3', 'mot', 'w1'),
      wire('pe', 'src', 'pe', 'mot', 'pe', { color: '#16a34a', conductorRole: 'earth_ground' }),
    ];
    return { devices: [src, fs, motor], wires };
  };
  const solved = (() => { const b = build('aM'); return solve(b.devices, b.wires, 'PEC', 440); })();
  assert.ok(solved.inrushByDevice['fs'] > 20, `motor inrush is reported to the fuse (${solved.inrushByDevice['fs']})`);

  const am = build('aM');
  const amAfter = run(am.devices, am.wires, 20, 0.5, { volts: 440 });
  const anyAmBlown = ['blown_l1', 'blown_l2', 'blown_l3'].some((k) => byId(amAfter, 'fs').state[k]);
  assert.equal(anyAmBlown, false, 'aM 6 A link rides through the start');
  assert.equal(byId(amAfter, 'mot').state.running, true, 'motor keeps running');

  const gg = build('gG');
  const ggAfter = run(gg.devices, gg.wires, 20, 0.5, { volts: 440 });
  const blownLinks = ['blown_l1', 'blown_l2', 'blown_l3'].filter((k) => byId(ggAfter, 'fs').state[k]);
  assert.ok(blownLinks.length > 0, 'a gG 6 A link blows on the 4.8x start inrush');
  console.log(`✓ aM survives the start; gG ${blownLinks.join(', ')} blew (use aM for motors)`);
}

console.log('\n--- Fuse switch disconnector 3P ---');
{
  // Each link blows independently on a short circuit; the handle stays closed
  const src = dev('source_3phase_440v', 'src');
  const fs = dev('fuse_switch_disconnector_3p', 'fs');
  const wires = [
    wire('a1', 'src', 'l1', 'fs', 'in_l1'), wire('a2', 'src', 'l2', 'fs', 'in_l2'), wire('a3', 'src', 'l3', 'fs', 'in_l3'),
    wire('x', 'fs', 'out_l2', 'src', 'pe', { color: '#16a34a', conductorRole: 'earth_ground' }), // L2 shorted to earth
  ];
  const after = run([src, fs], wires, 2, 0.5, { volts: 440 });
  const s = byId(after, 'fs').state;
  assert.equal(s.blown_l2, true, 'only the faulted link blows');
  assert.equal(!!s.blown_l1 || !!s.blown_l3, false, 'the other links are intact');
  assert.equal(s.closed, true, 'the handle is not moved');
  console.log('✓ L2 short to earth: link L2 blew, L1 and L3 intact, handle still closed');

  // Open handle isolates the load
  const open = [dev('source_3phase_440v', 'src'), dev('fuse_switch_disconnector_3p', 'fs', { closed: false }), dev('motor_ac_industrial', 'mot')];
  const ow = [
    wire('a1', 'src', 'l1', 'fs', 'in_l1'), wire('a2', 'src', 'l2', 'fs', 'in_l2'), wire('a3', 'src', 'l3', 'fs', 'in_l3'),
    wire('b1', 'fs', 'out_l1', 'mot', 'u1'), wire('b2', 'fs', 'out_l2', 'mot', 'v1'), wire('b3', 'fs', 'out_l3', 'mot', 'w1'),
  ];
  const sol = solve(open, ow, 'PEC', 440);
  assert.notEqual(sol.nodePotentials['mot:u1'], 'live', 'open handle isolates the motor');
  console.log('✓ open handle isolates the load');
}

console.log('\n--- Single phasing lab ---');
{
  const p = lab('lab-fuse-single-phasing');
  byId(p.devices, 'mdol_s1').state.startPressed = true;
  const blownRun = run(p.devices, p.wires, 4, 0.5, { volts: 440 });
  const m = byId(blownRun, 'mdol_m1').state;
  assert.ok(/SINGLE PHASING/.test(m.motorFault || ''), `motor reports single-phasing: ${m.motorFault}`);
  assert.equal(!!m.running, false, 'motor does not run on two phases');
  console.log(`✓ one blown link -> motor fault "${m.motorFault}"`);

  const fixed = clone(p.devices);
  Object.assign(byId(fixed, 'mdol_q1').state, { blown_l3: false, heat_l3: 0 });
  byId(fixed, 'mdol_s1').state.startPressed = true;
  const fixedRun = run(fixed, p.wires, 4, 0.5, { volts: 440 });
  assert.equal(!!byId(fixedRun, 'mdol_m1').state.running, true, 'replacing the link restores the motor');
  assert.equal(byId(fixedRun, 'mdol_m1').state.motorFault, null);
  console.log('✓ link replaced -> motor runs');
}

console.log('\n--- Compliance rules ---');
{
  // Fuses count as overcurrent protection for conductor ampacity, like breakers
  const src = dev('kwh_meter_1p', 'src');
  const f = dev('fuse_holder_1p', 'f', { ratedAmps: 63 });
  const wires = [wire('w', 'src', 'l_out', 'f', 'in_l', { wireGauge: '14 AWG (2.0 mm²)' })];
  const sol = solve([src, f], wires);
  const v = analyzeCodeCompliance([src, f], wires, sol, 'PEC', 230).violations;
  assert.ok(v.some((x) => x.category === 'ampacity' && x.affectedDeviceId === 'f'), 'a 63 A fuse on 2.0 mm² flags ampacity');
  console.log('✓ fuse counts as overcurrent protection in the ampacity rule');

  // A fuse in the neutral conductor of a TN system is flagged
  const nf = dev('fuse_holder_1p', 'nf');
  const lamp = dev('light_bulb', 'lamp');
  const nw = [
    wire('l', 'src', 'l_out', 'lamp', 'hot'),
    wire('n1', 'src', 'n_out', 'nf', 'in_l', { color: '#0f172a', conductorRole: 'return_neutral' }),
    wire('n2', 'nf', 'out_l', 'lamp', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' }),
  ];
  const ns = solve([src, nf, lamp], nw);
  const nv = analyzeCodeCompliance([src, nf, lamp], nw, ns, 'PEC', 230).violations;
  assert.ok(nv.some((x) => x.id === 'viol_neutral_fuse_nf'), 'fuse in the neutral is flagged');
  const live = analyzeCodeCompliance([src, f], wires, sol, 'PEC', 230).violations;
  assert.ok(!live.some((x) => x.id.startsWith('viol_neutral_fuse')), 'a fuse in the live conductor is not flagged');
  console.log('✓ fuse in the neutral flagged; fuse in the live conductor not');
}

// applyProtectiveOutcome leaves state alone when nothing happened
{
  const d = [dev('fuse_holder_1p', 'f')];
  assert.equal(applyProtectiveOutcome(d, { trippedDevices: [], tripReasons: {}, devicePatches: {} }), d);
}
console.log('FUSE TESTS PASSED');
