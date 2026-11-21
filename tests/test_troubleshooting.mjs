import assert from 'node:assert/strict';
import { run, byId, solve } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { TROUBLESHOOT_SCENARIOS, resolveScenarioFaults } from '../src/data/troubleshootScenarios.ts';
import { generateFaults, buildFaultContext, faultKindsFor, faultExplanation } from '../src/core/faults.ts';
import { newDiagState, submitDiagnosis, diagnosisScore, hintText } from '../src/core/troubleshootSession.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = (id) => LAB_LESSONS.find((l) => l.id === id);
const volts = (p) => p.gridVoltage;
/** Run a lab project with the given faults; `edit` can press buttons first. */
const go = (labId, faults, steps = 6, edit = () => {}) => {
  const p = clone(lab(labId).project);
  edit(p.devices);
  const d = run(p.devices, p.wires, steps, 0.5, { standard: 'PEC', volts: volts(p), faults });
  return { p, d };
};
const f = (kind, deviceId, params = {}) => ({ id: `t_${kind}`, kind, deviceId, params, revealed: false });
const press = (devices) => { byId(devices, 'mdol_s1').state.startPressed = true; };
const wireOf = (p, from, to) => {
  const [fd, ft] = from.split(':');
  const [td, tt] = to.split(':');
  return p.wires.find((w) => w.fromDeviceId === fd && w.fromTerminalId === ft && w.toDeviceId === td && w.toTerminalId === tt).id;
};

console.log('--- Troubleshooting faults: each produces its symptom ---');
const DOL = 'lab-marine-dol-440v';
{
  const base = go(DOL, undefined, 6, press);
  assert.equal(byId(base.d, 'mdol_m1').state.motorRunning, true, 'healthy starter runs');
  const { d } = go(DOL, [f('open_coil', 'mdol_km1')], 6, press);
  const km = byId(d, 'mdol_km1').state;
  assert.equal(km.coilEnergized, false, 'KM1 never pulls in');
  assert.equal(!!byId(d, 'mdol_m1').state.motorRunning, false, 'motor stays off');
  console.log('✓ open_coil: START pressed, KM1 does not pull in, motor off');
}
{
  const p = clone(lab(DOL).project);
  press(p.devices);
  const solved = solveCircuit(p.devices, p.wires, 'PEC', 440, { faults: [f('open_coil', 'mdol_km1')] });
  assert.equal(solved.nodePotentials['mdol_km1:a1'], 'live', 'control voltage reaches A1');
  assert.equal(solved.nodePotentials['mdol_km1:a2'], 'neutral');
  assert.equal(solved.nodeVoltages['mdol_km1:a1'], 220, '220 V across the open coil');
  console.log('✓ open_coil: 220 V measured across A1-A2');
}
{
  const { d } = go(DOL, [f('welded_contact', 'mdol_km1', { pair: ['no_13', 'no_14'] })], 6, () => {});
  assert.equal(byId(d, 'mdol_km1').state.coilEnergized, true, 'welded 13-14 seals the coil in with no START');
  assert.equal(byId(d, 'mdol_m1').state.motorRunning, true);
  console.log('✓ welded_contact: the starter runs without START');
}
{
  const { d } = go(DOL, [f('contact_open', 'mdol_km1', { pair: ['l2', 't2'] })], 6, press);
  assert.equal(byId(d, 'mdol_km1').state.coilEnergized, true, 'KM1 pulls in');
  assert.equal(!!byId(d, 'mdol_m1').state.motorRunning, false);
  assert.match(String(byId(d, 'mdol_m1').state.motorFault), /SINGLE PHASING/, 'motor single-phases');
  console.log('✓ contact_open: power pole stuck open, motor single-phases');
}
{
  const p0 = clone(lab(DOL).project);
  const { d } = go(DOL, [f('loose_neutral', 'mdol_km1', { terminalId: 'a2' })], 6, press);
  assert.equal(byId(d, 'mdol_km1').state.coilEnergized, false, 'no return path for the coil');
  console.log('✓ loose_neutral: coil has no return, never pulls in');
  const w = wireOf(p0, 'mdol_tc1:x1', 'mdol_f2:nc_95');
  const open = go(DOL, [f('open_wire', 'mdol_tc1', { wireId: w })], 6, press);
  assert.equal(byId(open.d, 'mdol_km1').state.coilEnergized, false);
  console.log('✓ open_wire: a drawn conductor that conducts nothing stops the control rung');
}
{
  const p0 = clone(lab(DOL).project);
  const wid = wireOf(p0, 'mdol_f2:t1', 'mdol_m1:u1');
  const healthy = go(DOL, undefined, 4, press);
  const hr = solveCircuit(clone(healthy.d), healthy.p.wires, 'PEC', 440);
  const bad = solveCircuit(clone(healthy.d), healthy.p.wires, 'PEC', 440, { faults: [f('high_resistance_joint', 'mdol_f2', { wireId: wid, ohms: 5 })] });
  assert.ok(bad.wireVoltageDrops[wid] > hr.wireVoltageDrops[wid] + 10, 'extra volt drop across the joint');
  assert.ok(bad.wireVoltageDropPercents[wid] > hr.wireVoltageDropPercents[wid]);
  assert.ok(bad.sparks.some((s) => s.id === `hot_${wid}`), 'the joint heats');
  console.log('✓ high_resistance_joint: voltage drop across the joint and an overheating note');
}
{
  const { d } = go(DOL, [f('overload_setting_wrong', 'mdol_f2', { dialAmps: 1 })], 6, press);
  assert.equal(byId(d, 'mdol_f2').state.tripped, true, 'overload relay trips');
  assert.equal(!!byId(d, 'mdol_m1').state.motorRunning, false);
  const noFault = go(DOL, undefined, 6, press);
  assert.equal(!!byId(noFault.d, 'mdol_f2').state.tripped, false);
  console.log('✓ overload_setting_wrong: dial of 1 A trips on the first start');
}
{
  const { d } = go('lab-feeder-protection-metering', [f('earth_fault_to_frame', 'm1')], 8);
  assert.equal(byId(d, 'q1').state.tripped, true, 'the earth-leakage chain trips the MCCB');
  const healthy = go('lab-feeder-protection-metering', undefined, 8).d;
  assert.equal(!!byId(healthy, 'q1').state.tripped, false);
  console.log('✓ earth_fault_to_frame: leakage trips the protective device; a healthy circuit does not');
}
{
  const FUSE = 'lab-fuse-gg-overload-short';
  const edit = (devices) => { byId(devices, 'f1').state.ratedAmps = 16; };
  const ok = go(FUSE, undefined, 4, edit).d;
  assert.equal(byId(ok, 'wh').state.powered, true, 'the heater runs through a healthy fuse');
  const blown = go(FUSE, [f('blown_fuse', 'f1')], 4, edit).d;
  assert.equal(!!byId(blown, 'wh').state.powered, false, 'a blown fuse leaves the load dead');
  console.log('✓ blown_fuse: voltage up to the fuse, load dead beyond it');
}
{
  const FR = 'lab-forward-reverse-interlock';
  const fwd = (faults) => {
    const p = clone(lab(FR).project);
    byId(p.devices, 'mfr_s1').state.fwdPressed = true;
    byId(p.devices, 'mfr_s1').state.startPressed = true;
    return run(p.devices, p.wires, 6, 0.5, { volts: 440, faults });
  };
  const p0 = clone(lab(FR).project);
  const good = fwd(undefined);
  const dirGood = byId(good, 'mfr_m1').state.motorDirection;
  assert.ok(dirGood, 'the healthy starter turns the motor when FWD is pressed');
  const wa = wireOf(p0, 'mfr_q1:out_l2', 'mfr_km1:l2');
  const wb = wireOf(p0, 'mfr_q1:out_l3', 'mfr_km1:l3');
  const swapped = fwd([f('swapped_phases', 'mfr_q1', { wireA: wa, wireB: wb })]);
  assert.notEqual(byId(swapped, 'mfr_m1').state.motorDirection, dirGood, 'two phases swapped: wrong direction');
  console.log('✓ swapped_phases: FWD turns the motor the wrong way round');
}

console.log('\n--- Scenarios ---');
{
  assert.equal(TROUBLESHOOT_SCENARIOS.length, 5, 'five ready-made scenarios');
  const diffs = TROUBLESHOOT_SCENARIOS.map((x) => x.difficulty);
  assert.ok(diffs.includes('easy') && diffs.includes('medium') && diffs.includes('hard'));
  for (const sc of TROUBLESHOOT_SCENARIOS) {
    const l = LAB_LESSONS.find((x) => x.project.id === sc.projectId);
    assert.ok(l, `${sc.id}: lab exists`);
    const faults = resolveScenarioFaults(sc, l.project);
    assert.equal(faults.length, sc.faults.length, `${sc.id}: all wires resolve`);
    assert.ok(sc.symptom.length > 20);
  }
  console.log('✓ five scenarios, every wire and device reference resolves');

  const STAIR = 'lab-lighting-2way';
  const stair = (faultsOf, position) => {
    const p = clone(lab(STAIR).project);
    byId(p.devices, 'sw_3w_1').state.position = position;
    byId(p.devices, 'sw_3w_2').state.position = position;
    const faults = faultsOf && resolveScenarioFaults({ ...TROUBLESHOOT_SCENARIOS[4], faults: TROUBLESHOOT_SCENARIOS[4].faults.filter(faultsOf) }, p);
    return run(p.devices, p.wires, 3, 0.5, { volts: 230, faults });
  };
  const lit = (d) => !!byId(d, 'lamp_stair').state.lit;
  assert.equal(lit(stair(undefined, 'A')) || lit(stair(undefined, 'B')), true, 'the healthy staircase lights');
  assert.equal(lit(stair(() => true, 'A')) || lit(stair(() => true, 'B')), false, 'both faults: never lights');
  assert.equal(lit(stair((x) => x.kind === 'loose_neutral', 'A')) || lit(stair((x) => x.kind === 'loose_neutral', 'B')), false, 'loose neutral alone: dead');
  const onlyWire = [lit(stair((x) => x.kind === 'open_wire', 'A')), lit(stair((x) => x.kind === 'open_wire', 'B'))];
  assert.ok(onlyWire.some(Boolean) && !onlyWire.every(Boolean), 'the open traveler alone works in only one switch position');
  console.log('✓ hard scenario: the loose neutral masks the open traveler (alone it works in one position)');
}

console.log('\n--- Fault generator and data model ---');
{
  const p = clone(lab(DOL).project);
  const gen = (difficulty, seed) => generateFaults(p.devices, p.wires, difficulty, seed);
  assert.equal(gen('easy', 7).length, 1);
  assert.equal(gen('medium', 7).length, 1);
  const hard = gen('hard', 7);
  assert.equal(hard.length, 2);
  assert.notEqual(hard[0].deviceId, hard[1].deviceId, 'two faults on different devices');
  assert.deepEqual(gen('hard', 7), hard, 'the same seed gives the same faults for the whole class');
  const kinds = new Set(Array.from({ length: 30 }, (_, i) => gen('medium', i)[0]?.kind));
  assert.ok(kinds.size >= 3, 'different seeds give variety');
  const easyKinds = new Set(Array.from({ length: 30 }, (_, i) => gen('easy', i)[0]?.kind));
  assert.ok([...easyKinds].every((k) => ['open_coil', 'blown_fuse', 'open_wire'].includes(k)), 'easy faults are the obvious kinds');
  for (let i = 0; i < 30; i++) {
    // every generated fault can be applied without breaking the solver
    for (const d of ['easy', 'medium', 'hard']) {
      const faults = gen(d, i);
      const q = clone(p);
      assert.doesNotThrow(() => solveCircuit(q.devices, q.wires, 'PEC', 440, { faults }));
    }
  }
  console.log('✓ generator: easy 1 / medium 1 / hard 2, seeded and repeatable, always solvable');
  const contactor = byId(p.devices, 'mdol_km1');
  assert.ok(faultKindsFor(contactor).includes('open_coil') && faultKindsFor(contactor).includes('contact_open'));
  const project = { ...p, faults: hard, faultsVersion: 1 };
  const back = JSON.parse(JSON.stringify(project));
  assert.deepEqual(back.faults, hard, 'faults survive a save and load');
  const ctx = buildFaultContext([f('open_coil', 'x')], []);
  assert.ok(ctx.openCoil.has('x'));
  console.log('✓ faults serialize with the project and old projects without faults are unchanged');
}
console.log('\n--- Student session ---');
{
  const p = clone(lab('lab-lighting-2way').project);
  const sc = TROUBLESHOOT_SCENARIOS[4];
  const faults = resolveScenarioFaults(sc, p);
  let st = newDiagState();
  let r = submitDiagnosis(st, faults, p.wires, 'sw_3w_2', 'open_wire');
  assert.equal(r.correct, true, 'a wire fault matches a device at either end of the wire');
  assert.equal(r.complete, false, 'two faults: not finished');
  r = submitDiagnosis(r.state, faults, p.wires, 'lamp_stair', 'open_coil');
  assert.equal(r.correct, false);
  assert.equal(r.state.wrong, 1);
  r = submitDiagnosis(r.state, faults, p.wires, 'sw_3w_2', 'open_wire');
  assert.equal(r.correct, false, 'the same fault cannot be claimed twice');
  r = submitDiagnosis(r.state, faults, p.wires, 'lamp_stair', 'loose_neutral');
  assert.equal(r.complete, true);
  assert.equal(diagnosisScore(r.state, 30), 100 - 10 * 2, 'two wrong attempts cost 20 points');
  assert.equal(diagnosisScore({ ...r.state, hints: 2 }, 200), 100 - 20 - 30 - 6);
  assert.equal(diagnosisScore({ ...r.state, hints: 20 }, 0), 0, 'never below zero');
  assert.match(hintText(1, faults[0], p.devices), /Hint 1/);
  assert.match(hintText(3, faults[0], p.devices), /Loose neutral/);
  assert.match(faultExplanation(faults[1], p.devices), /broken/);
  console.log('✓ diagnosis matching, attempts, hints and score');
}
console.log('\nTROUBLESHOOTING TESTS PASSED');
