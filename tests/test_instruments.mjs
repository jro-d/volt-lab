import assert from 'node:assert/strict';
import { run, byId, solve } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { measureInsulation, measureEarthResistance, measureRotation, measureContinuity } from '../src/core/instruments.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = LAB_LESSONS.find((l) => l.id === 'lab-dead-testing-motor');
assert.ok(lab, 'lab exists');
const devices = () => clone(lab.project.devices);
const wires = clone(lab.project.wires);

console.log('--- Test instruments ---');
{
  const d = devices();
  const r = measureInsulation(d, wires, ['mdol_m1', 'u1'], ['mdol_m1', 'pe'], 500, false);
  assert.equal(r.ok, false);
  assert.match(r.primary, /0\.30 MΩ/);
  console.log('✓ damaged winding reads 0.30 MΩ on the insulation tester');
  byId(d, 'mdol_m1').state.insulationMOhm = 999;
  const good = measureInsulation(d, wires, ['mdol_m1', 'u1'], ['mdol_m1', 'pe'], 500, false);
  assert.equal(good.ok, true);
  assert.match(good.primary, /^>999/);
  console.log('✓ healthy winding reads above range');
  const live = measureInsulation(d, wires, ['mdol_m1', 'u1'], ['mdol_m1', 'pe'], 500, true);
  assert.equal(live.primary, 'ENERGIZED');
  assert.equal(live.ok, false);
  console.log('✓ refuses on an energized circuit');
  const short = measureInsulation(d, wires, ['mdol_src', 'l1'], ['mdol_src', 'l1'], 500, false);
  assert.match(short.primary, /^0\.00/);
  console.log('✓ two points on one net read 0 MΩ (short)');
}
{
  const d = devices();
  // Q1 in (open breaker blocks the path at rest) vs the feeder side
  const r = measureContinuity(d, wires, ['mdol_src', 'l1'], ['mdol_q1', 'in_l1'], false);
  assert.equal(r.ok, true, 'feeder wire is a closed path');
  assert.equal(r.beep, true);
  const open = measureContinuity(d, wires, ['mdol_src', 'l1'], ['mdol_src', 'l2'], false);
  assert.equal(open.ok, false, 'two different phases are not connected');
  assert.equal(open.primary, 'OPEN');
  const live = measureContinuity(d, wires, ['mdol_src', 'l1'], ['mdol_q1', 'in_l1'], true);
  assert.equal(live.primary, 'ENERGIZED');
  console.log('✓ continuity: closed path beeps, different phases open, refuses when energized');
}
{
  const d = devices();
  const e = measureEarthResistance(d, 'mdol_pit');
  assert.equal(e.primary, '5.0 Ω');
  byId(d, 'mdol_pit').state.earthResistanceOhms = 60;
  assert.equal(measureEarthResistance(d, 'mdol_pit').ok, false);
  assert.equal(measureEarthResistance(d, 'mdol_m1').primary, 'NO ELECTRODE');
  const report = analyzeCodeCompliance(d, wires, solveCircuit(clone(d), wires, 'PEC', 440), 'PEC', 440);
  assert.ok(report.violations.some((v) => v.id.startsWith('viol_high_earth_resistance_') && v.severity === 'info'));
  console.log('✓ earth tester reads the pit; a high value raises an info note (no clause cited)');
}
{
  const d = devices();
  const solved = solve(clone(d), wires, 'PEC', 440);
  const cw = measureRotation(solved, [['mdol_src', 'l1'], ['mdol_src', 'l2'], ['mdol_src', 'l3']]);
  assert.match(cw.primary, /^CW/);
  const ccw = measureRotation(solved, [['mdol_src', 'l1'], ['mdol_src', 'l3'], ['mdol_src', 'l2']]);
  assert.match(ccw.primary, /^CCW/);
  assert.equal(measureRotation(solved, [['mdol_src', 'l1'], ['mdol_src', 'l1'], ['mdol_src', 'l2']]).primary, 'SAME PHASE');
  assert.equal(measureRotation({ nodePhases: {} }, [['a', 'b'], ['c', 'd'], ['e', 'f']]).primary, 'NO PHASE');
  console.log('✓ rotation meter: CW, CCW, same phase, dead');
}
console.log('\nINSTRUMENT TESTS PASSED');
