import assert from 'node:assert/strict';
import { dev, wire } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import {
  computeFaultLevels, checkInterruptingRatings, sourceImpedance, ikAtResistance, DEFAULT_SHORT_CIRCUIT, R75_TO_R20,
} from '../src/core/shortCircuit.ts';

const within = (actual, expected, pct, msg) =>
  assert.ok(Math.abs(actual - expected) / expected <= pct / 100, `${msg}: ${actual} vs ${expected} (${pct} % allowed)`);
const L = (id, a, at, b, bt, extra) => wire(id, a, at, b, bt, extra);

console.log('--- Hand-calculated 3-phase case ---');
{
  // 440 V, 10 kA source, 50 m of 12 AWG (6.38 ohm/km at 75 C) to a breaker.
  //   R(75 C) = 50 x 6.38 / 1000 = 0.319 ohm  ->  R(20 C) = 0.319 / (1 + 0.00393 x 55) = 0.26231 ohm
  //   Zs = 440 / (sqrt(3) x 10000) = 0.025403 ohm
  //   Ik = 440 / (sqrt(3) x (0.025403 + 0.26231)) = 882.9 A
  const src = dev('source_3phase_440v', 'src');
  const q = dev('mcb_3p', 'q', { ratedAmps: 16 });
  const wires = ['l1', 'l2', 'l3'].map((t, i) =>
    L(`w${i}`, 'src', t, 'q', `in_${t}`, { wireGauge: '12 AWG (3.5 mm²)', lengthMeters: 50 }));
  const lv = computeFaultLevels([src, q], wires, 'PEC', 440, { v: 1, enabled: true, sourceKa: 10 });
  const r20 = (50 * 6.38 / 1000) / (1 + 0.00393 * 55);
  const zs = 440 / (Math.sqrt(3) * 10000);
  const expected = 440 / (Math.sqrt(3) * (zs + r20));
  within(expected, 882.9, 0.1, 'hand calculation itself');
  within(lv.byDevice.q.ik, expected, 2, 'Ik at the breaker');
  within(lv.byDevice.src.ik, 10000, 0.01, 'Ik at the source is the source level');
  assert.equal(lv.supplies.length, 1);
  assert.equal(lv.supplies[0].phases, 3);
  within(R75_TO_R20, 1 / 1.21615, 0.01, 'temperature factor');
}

console.log('--- Hand-calculated single-phase case ---');
{
  // 230 V, 6 kA, 20 m of 2.5 mm2 (7.41 ohm/km) to an MCB: loop = Zs + 2R
  const meter = dev('kwh_meter_1p', 'grid');
  const q = dev('mcb_1p', 'q', { ratedAmps: 16 });
  const wires = [L('w1', 'grid', 'l_out', 'q', 'in', { wireGauge: '2.5 mm²', lengthMeters: 20 })];
  const lv = computeFaultLevels([meter, q], wires, 'IEC', 230, { v: 1, enabled: true, sourceKa: 6 });
  const r20 = (20 * 7.41 / 1000) / (1 + 0.00393 * 55);
  const expected = 230 / (230 / 6000 + 2 * r20);
  within(expected, 815.5, 0.2, 'hand calculation itself');
  within(lv.byDevice.q.ik, expected, 2, 'single-phase Ik');
  assert.equal(lv.supplies[0].phases, 1);
  // a meter that is fed from another device is not a supply
  const fed = computeFaultLevels([dev('kwh_meter_1p', 'm2'), dev('mcb_1p', 'q2')], [L('w', 'q2', 'out', 'm2', 'l_in')], 'IEC', 230, { v: 1, enabled: true, sourceKa: 6 });
  assert.equal(fed.supplies.length, 0);
}

console.log('--- Transformer in series ---');
{
  // 100 kVA, 4 %: Zt = 0.04 x 440^2 / 100000 = 0.07744 ohm per phase
  const settings = { v: 1, enabled: true, sourceKa: 10, transformer: { kva: 100, zPct: 4 } };
  const zs = sourceImpedance(settings, 440, 3);
  within(zs, 440 / (Math.sqrt(3) * 10000) + 0.07744, 0.1, 'source impedance with transformer');
  within(ikAtResistance(3, 440, zs, 0), 440 / (Math.sqrt(3) * (0.025403 + 0.07744)), 0.1, 'Ik at the terminals');
  const lv = computeFaultLevels([dev('source_3phase_440v', 's')], [], 'PEC', 440, settings);
  within(lv.byDevice.s.ik, 2472, 1, 'transformer limits the fault level');
}

console.log('--- Interrupting rating check ---');
{
  const src = dev('source_3phase_440v', 'src');
  const mk = (id, ka, len) => {
    const q = dev('mcb_3p', id, { ratedAmps: 16 });
    q.kaRating = ka;
    const ws = ['l1', 'l2', 'l3'].map((t, i) => L(`${id}w${i}`, 'src', t, id, `in_${t}`, { wireGauge: '12 AWG (3.5 mm²)', lengthMeters: len }));
    return { q, ws };
  };
  const a = mk('low', 6, 1); // 10 kA available, 6 kA rated -> error
  const b = mk('close', 10, 0.54); // ~9 kA available, 10 kA rated -> warning (above 80 %)
  const c = mk('ok', 25, 1); // plenty of margin
  const devices = [src, a.q, b.q, c.q];
  const wires = [...a.ws, ...b.ws, ...c.ws];
  const lv = computeFaultLevels(devices, wires, 'PEC', 440, DEFAULT_SHORT_CIRCUIT);
  const checks = Object.fromEntries(checkInterruptingRatings(devices, lv).map((x) => [x.deviceId, x]));
  assert.equal(checks.low.status, 'error');
  assert.equal(checks.close.status, 'warning', `close: ${checks.close.ikKa} kA`);
  assert.equal(checks.ok.status, 'ok');

  // through the compliance rules
  const solved = solveCircuit(devices, wires, 'PEC', 440);
  const withCheck = analyzeCodeCompliance(devices, wires, solved, 'PEC', 440, lv);
  const icu = withCheck.violations.filter((v) => v.category === 'interrupting_rating');
  assert.equal(icu.length, 2);
  assert.equal(icu.find((v) => v.affectedDeviceId === 'low').severity, 'error');
  assert.equal(icu.find((v) => v.affectedDeviceId === 'close').severity, 'warning');
  assert.match(icu[0].articleRef, /verified/, 'no invented clause numbers');
  assert.equal(withCheck.isCompliant, false);
  const without = analyzeCodeCompliance(devices, wires, solved, 'PEC', 440);
  assert.equal(without.violations.filter((v) => v.category === 'interrupting_rating').length, 0, 'off unless enabled');
}

console.log('--- Fault level falls along a path; transformer isolates ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-marine-dol-440v');
  const p = lab.project;
  const lv = computeFaultLevels(p.devices, p.wires, 'PEC', p.gridVoltage, { v: 1, enabled: true, sourceKa: 10 });
  const ik = (id) => lv.byDevice[id]?.ik;
  assert.ok(ik('mdol_q1') > ik('mdol_km1') && ik('mdol_km1') >= ik('mdol_f2') && ik('mdol_f2') > ik('mdol_m1'), 'Ik falls from Q1 to the motor');
  // Q1 sits behind one 1.2 m run of 12 AWG: R(20 C) = 1.2 x 6.38 / 1000 / 1.21615 = 6.295 mohm, Zs = 25.403 mohm
  within(ik('mdol_q1'), 440 / (Math.sqrt(3) * (0.025403 + 0.006295)), 2, 'Q1 fault level');
  assert.equal(ik('mdol_pl_run'), undefined, 'the circuit behind the control transformer is not calculated');
  assert.ok(ik('mdol_q2') > 0, 'the control breaker is on the 440 V side');
}

console.log('--- Off by default in every lab ---');
{
  for (const lab of LAB_LESSONS) assert.equal(lab.project.shortCircuit, undefined, `${lab.id} has no short-circuit settings`);
}

console.log('short-circuit tests passed');
