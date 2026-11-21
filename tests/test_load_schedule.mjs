import assert from 'node:assert/strict';
import { dev, wire } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { buildLoadSchedule, scheduleToCsv, loadSpec, BREAKER_SIZES } from '../src/core/loadSchedule.ts';
import { DEMAND_FACTORS } from '../src/data/standardsData.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const clone = (x) => JSON.parse(JSON.stringify(x));

console.log('--- Demand factors are data, left empty ---');
{
  for (const [type, v] of Object.entries(DEMAND_FACTORS)) {
    assert.equal(v.factor, null, `${type}: no unverified value is built in`);
    assert.equal(v.needsVerification, true);
  }
  console.log('✓ no demand factor is bundled');
}

console.log('\n--- A small hand-checked circuit ---');
{
  // 230 V, 20 A MCB -> 10 m of 12 AWG (6.38 ohm/km) -> 1500 W unity-pf heater
  const devices = [dev('kwh_meter_1p', 'grid'), dev('mcb_1p', 'q', { ratedAmps: 20, tripCurve: 'C' }), dev('appliance_water_heater', 'wh', { wattage: 1500 })];
  const wires = [
    wire('a', 'grid', 'l_out', 'q', 'in', { wireGauge: '12 AWG (3.5 mm²)', lengthMeters: 3 }),
    wire('b', 'q', 'out', 'wh', 'line', { wireGauge: '12 AWG (3.5 mm²)', lengthMeters: 10 }),
    wire('c', 'grid', 'n_out', 'wh', 'neutral', { ...N, wireGauge: '12 AWG (3.5 mm²)', lengthMeters: 10 }),
  ];
  const s = buildLoadSchedule(devices, wires, 'PEC', 230);
  assert.equal(s.rows.length, 1);
  const r = s.rows[0];
  assert.equal(r.breakerId, 'q', 'traced back to the MCB');
  assert.equal(r.breaker, '20 A C');
  assert.equal(r.conductor, '12 AWG (3.5 mm²)');
  assert.equal(r.lengthM, 10, 'only the run between the load and its breaker');
  assert.equal(r.va, 1500);
  assert.ok(Math.abs(r.amps - 1500 / 230) < 0.01);
  // VD % = 2 x I x R / V: I = 6.522 A, R = 10 m x 6.38 / 1000 = 0.0638 ohm -> 0.832 V -> 0.36 %
  assert.ok(Math.abs(r.vdPercent - 0.36) < 0.01, `voltage drop ${r.vdPercent}`);
  assert.equal(r.demandFactor, null);
  assert.deepEqual(s.missingDemandTypes, ['water heater'], 'blank demand factors are reported');
  assert.equal(s.suggestedMainBasis, 'connected');
  assert.equal(s.suggestedMainAmps, 15, 'a 6.5 A load picks the smallest standard size');
  // typed-in demand factors drive the totals
  const withDf = buildLoadSchedule(devices, wires, 'PEC', 230, { 'water heater': 0.8 });
  assert.equal(withDf.rows[0].demandVa, 1200);
  assert.equal(withDf.totalDemandVa, 1200);
  assert.equal(withDf.suggestedMainBasis, 'demand');
  assert.deepEqual(withDf.missingDemandTypes, []);
  assert.ok(BREAKER_SIZES.includes(withDf.suggestedMainAmps));
  // a too-large breaker for the conductor is noted
  const over = buildLoadSchedule([devices[0], dev('mcb_1p', 'q', { ratedAmps: 32 }), devices[2]], wires, 'PEC', 230);
  assert.match(over.rows[0].notes, /above the 20 A limit/);
  console.log('✓ breaker, conductor, length, voltage drop, demand factors and the main suggestion');
}

console.log('\n--- Power factor and CSV ---');
{
  const devices = [dev('kwh_meter_1p', 'grid'), dev('mcb_1p', 'q', { ratedAmps: 10 }), dev('light_bulb', 'tube', { wattage: 36, pf: 0.5 })];
  const wires = [wire('a', 'grid', 'l_out', 'q', 'in'), wire('b', 'q', 'out', 'tube', 'hot'), wire('c', 'grid', 'n_out', 'tube', 'neutral', N)];
  const s = buildLoadSchedule(devices, wires, 'PEC', 230);
  assert.equal(s.rows[0].va, 72, 'VA = W / pf');
  const csv = scheduleToCsv(s);
  const lines = csv.split('\r\n');
  assert.equal(lines[0].split(',')[0], 'Circuit');
  assert.ok(lines.some((l) => l.includes('TOTAL')));
  assert.ok(csv.includes('36'), 'the load row carries the watts');
  assert.equal(loadSpec(dev('mcb_1p', 'x')), null, 'a breaker is not a load');
  console.log('✓ VA from power factor, CSV with a header and a total');
}

console.log('\n--- Three-phase panel: phase assignment and balance ---');
{
  const src = dev('source_3phase_440v', 'src');
  const q1 = dev('mcb_1p', 'q1', { ratedAmps: 16 });
  const q2 = dev('mcb_1p', 'q2', { ratedAmps: 16 });
  const m = dev('motor_ac_industrial', 'm', { wattage: 2200 });
  const l1 = dev('appliance_water_heater', 'h1', { wattage: 2000 });
  const l2 = dev('appliance_water_heater', 'h2', { wattage: 1000 });
  const wires = [
    wire('a', 'src', 'l1', 'q1', 'in'), wire('b', 'q1', 'out', 'h1', 'line'),
    wire('c', 'src', 'l2', 'q2', 'in'), wire('d', 'q2', 'out', 'h2', 'line'),
  ];
  const s = buildLoadSchedule([src, q1, q2, m, l1, l2], wires, 'PEC', 440);
  const byDev = Object.fromEntries(s.rows.map((r) => [r.deviceId, r]));
  assert.equal(byDev.h1.phase, 'L1');
  assert.equal(byDev.h2.phase, 'L2');
  assert.equal(byDev.m.phase, 'L1-L2-L3', 'a three-phase motor sits on all lines');
  assert.ok(s.phaseVa.L1 > s.phaseVa.L3 && s.phaseVa.L2 > s.phaseVa.L3, 'L3 only carries a third of the motor');
  assert.ok(s.imbalancePercent > 0, 'imbalance reported');
  assert.equal(byDev.m.breakerId, null, 'an unprotected load is flagged');
  assert.match(byDev.m.notes, /no protective device/);
  console.log('✓ phase assignment from the source line, three-phase loads spread, imbalance');
}

console.log('\n--- Master residential lab totals equal the solver ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-1-reference');
  assert.ok(lab);
  const p = clone(lab.project);
  const solved = solveCircuit(clone(p.devices), p.wires, p.codeStandard, p.gridVoltage);
  const s = buildLoadSchedule(p.devices, p.wires, p.codeStandard, p.gridVoltage);
  assert.ok(s.rows.length >= 3, `the master lab has several loads (${s.rows.length})`);
  assert.ok(s.rows.every((r) => r.breakerId), `every load is traced to a breaker (untraced: ${s.rows.filter((r) => !r.breakerId).map((r) => r.deviceId).join(', ')})`);
  // loads the solver does not count while the circuit is idle (an unplugged socket, a switch that is off) are excluded
  // from the comparison: the schedule is the connected load, the solver is what is on
  assert.ok(s.totalWatts >= solved.totalWatts, `connected load (${s.totalWatts} W) is at least what the solver sees running (${solved.totalWatts} W)`);
  // with every switch closed and every load able to run, the two agree exactly
  const allOn = clone(p.devices).map((d) => (d.state && 'closed' in d.state && (d.type.startsWith('switch') || d.type === 'modular_combo_plate') ? { ...d, state: { ...d.state, closed: true, switchClosed: true } } : d));
  const solvedOn = solveCircuit(allOn, p.wires, p.codeStandard, p.gridVoltage);
  const counted = s.rows.filter((r) => solvedOn.deviceEnergized[r.deviceId]).reduce((sum, r) => sum + r.watts, 0);
  assert.ok(Math.abs(counted - solvedOn.totalWatts) <= 1, `energized loads ${counted} W vs solver ${solvedOn.totalWatts} W`);
  console.log(`✓ ${s.rows.length} loads, ${s.totalWatts} W connected, solver ${solvedOn.totalWatts} W with everything on`);
}

console.log('\nLOAD SCHEDULE TESTS PASSED');
