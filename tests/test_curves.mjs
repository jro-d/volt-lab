import assert from 'node:assert/strict';
import { dev } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import {
  curveForDevice, bandAt, nominalTime, findOverlap, cableDamageTime, cableLimitSpec, motorStartSpec, MOTOR_START_MULTIPLE,
  operatingAmps, plotRange, BAND_TOLERANCE,
} from '../src/core/curves.ts';
import { MOTOR_START_SEC } from '../src/core/tripCurves.ts';

console.log('--- Device to curve mapping ---');
{
  const mcb = curveForDevice(dev('mcb_3p', 'q', { ratedAmps: 16, tripCurve: 'D' }));
  assert.equal(mcb.kind, 'mcb_D');
  assert.equal(mcb.rated, 16);
  assert.equal(curveForDevice(dev('mcb_1p', 'q', { ratedAmps: 10, tripCurve: 'B' })).kind, 'mcb_B');
  assert.equal(curveForDevice(dev('mcb_1p', 'q', { ratedAmps: 10 })).kind, 'mcb_C', 'default is C');
  assert.equal(curveForDevice(dev('fuse_switch_disconnector_3p', 'f', { fuseKind: 'gG', ratedAmps: 25 })).kind, 'fuse_gG');
  assert.equal(curveForDevice(dev('fuse_switch_disconnector_3p', 'f', { fuseKind: 'aM', ratedAmps: 25 })).kind, 'fuse_aM');
  const olr = curveForDevice(dev('thermal_overload_relay', 'r', { tripAmps: 6 }));
  assert.equal(olr.kind, 'overload_class10');
  assert.equal(olr.rated, 6);
  assert.equal(curveForDevice(dev('contactor_3p', 'k', {})), null, 'a contactor has no curve');
  assert.equal(curveForDevice(dev('light_bulb', 'l', {})), null);
}

console.log('--- Bands ---');
{
  const specs = [
    curveForDevice(dev('mcb_3p', 'a', { ratedAmps: 16, tripCurve: 'C' })),
    curveForDevice(dev('mcb_3p', 'b', { ratedAmps: 32, tripCurve: 'B' })),
    curveForDevice(dev('fuse_switch_disconnector_3p', 'c', { fuseKind: 'gG', ratedAmps: 25 })),
    curveForDevice(dev('thermal_overload_relay', 'd', { tripAmps: 6 })),
  ];
  for (const s of specs) {
    for (const mult of [1.3, 2, 3, 5, 10, 20, 50]) {
      const b = bandAt(s, s.rated * mult);
      if (!b) continue;
      assert.ok(b.tMin <= b.tMax, `${s.label} x${mult}: min <= max`);
      const nom = nominalTime(s, s.rated * mult);
      if (Number.isFinite(nom)) {
        assert.ok(nom >= b.tMin * 0.999 && nom <= b.tMax * 1.001, `${s.label} x${mult}: nominal ${nom} inside [${b.tMin}, ${b.tMax}]`);
      }
    }
  }
  // time falls as current rises
  const c16 = specs[0];
  assert.ok(bandAt(c16, 16 * 3).tMax > bandAt(c16, 16 * 8).tMax, 'higher current trips faster');
  assert.equal(bandAt(c16, 0), null);
  assert.ok(BAND_TOLERANCE.mcb_C > BAND_TOLERANCE.fuse_gG, 'MCB band is wider than a fuse band');
}

console.log('--- Cable damage ---');
{
  // t = (k S / I)^2 : 2.5 mm2, k 115, 1000 A -> (115*2.5/1000)^2 = 0.0826 s
  const t = cableDamageTime({ area: 2.5, k: 115 }, 1000);
  assert.ok(Math.abs(t - 0.0826) < 0.0005, `2.5 mm2 at 1 kA: ${t}`);
  assert.equal(cableDamageTime({ area: 2.5, k: 115 }, 0), Infinity);
  // quadruples when the current halves
  const t2 = cableDamageTime({ area: 2.5, k: 115 }, 500);
  assert.ok(Math.abs(t2 / t - 4) < 1e-9);
  const spec = cableLimitSpec({ id: 'w', wireGauge: '12 AWG (3.5 mm²)' }, 'PEC');
  assert.ok(spec, 'PEC 12 AWG resolves to a cross-section');
  assert.ok(spec.area > 3 && spec.area < 4, `area ${spec.area}`);
  assert.equal(spec.kNeedsVerification, true, 'the k constant is flagged for verification');
  assert.equal(cableLimitSpec({ id: 'w', wireGauge: 'no such gauge' }, 'PEC'), null);
}

console.log('--- Motor starting ---');
{
  const m = dev('motor_ac_industrial', 'm', { wattage: 2200 });
  const s = motorStartSpec(m, 440);
  assert.ok(s.fla > 4 && s.fla < 6, `FLA ${s.fla}`);
  assert.ok(Math.abs(s.startAmps / s.fla - MOTOR_START_MULTIPLE) < 1e-9);
  assert.equal(s.startSec, MOTOR_START_SEC);
}

console.log('--- Overlap / selectivity ---');
{
  const up = curveForDevice(dev('fuse_switch_disconnector_3p', 'up', { fuseKind: 'gG', ratedAmps: 25 }));
  const down = curveForDevice(dev('mcb_3p', 'down', { ratedAmps: 16, tripCurve: 'D' }));
  const o = findOverlap(up, down, 1, 10000);
  assert.equal(o.upstreamId, 'up');
  assert.equal(o.downstreamId, 'down');
  assert.ok(o.ranges.length > 0, 'a 25 A fuse over a 16 A D-curve MCB is not selective at high currents');
  assert.ok(o.selectiveUpTo > 16, `selective only above the rating: ${o.selectiveUpTo}`);

  // a very small downstream breaker under a large slow fuse: selective at least at low fault levels
  const small = curveForDevice(dev('mcb_1p', 'small', { ratedAmps: 6, tripCurve: 'B' }));
  const big = curveForDevice(dev('fuse_switch_disconnector_3p', 'big', { fuseKind: 'gG', ratedAmps: 100 }));
  const o2 = findOverlap(big, small, 1, 400);
  assert.ok(o2.ranges.length === 0 || o2.selectiveUpTo > 50, `6 A B-curve under 100 A gG: ${JSON.stringify(o2)}`);

  // a device never overlaps with itself in the "upstream cannot be faster" sense: same curve = overlap everywhere it operates
  const o3 = findOverlap(up, up, 1, 10000);
  assert.ok(o3.ranges.length > 0);
}

console.log('--- Plot range ---');
{
  const [lo, hi] = plotRange([curveForDevice(dev('mcb_3p', 'a', { ratedAmps: 16 }))], [96]);
  assert.ok(lo <= 10 && lo >= 0.1);
  assert.ok(hi >= 16 * 40);
  const [lo0, hi0] = plotRange([]);
  assert.ok(lo0 < hi0);
}

console.log('--- Lab: motor feeder coordination ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-curves-motor-feeder');
  assert.ok(lab, 'lab registered');
  const p = lab.project;
  assert.ok(p.curves, 'the lab carries a curves preset');
  assert.deepEqual(p.curves.chain, ['mdol_fs', 'mdol_q1', 'mdol_f2']);
  for (const id of p.curves.chain) {
    const d = p.devices.find((x) => x.id === id);
    assert.ok(d, `${id} exists`);
    assert.ok(curveForDevice(d), `${id} has a curve`);
  }
  const wire = p.wires.find((w) => w.id === p.curves.wireId);
  assert.ok(wire, 'cable wire exists');
  assert.ok(cableLimitSpec(wire, 'PEC'), 'cable limit resolves');
  assert.ok(p.devices.find((d) => d.id === p.curves.motorId));
  // the lab is wired: with the motor stopped, the power path reaches the starter
  const solved = solveCircuit(p.devices, p.wires, p.codeStandard, p.gridVoltage);
  const q1 = p.devices.find((d) => d.id === 'mdol_q1');
  assert.equal(operatingAmps(q1, p.wires, solved.wireCurrents), 0, 'idle: no current on Q1');
  // run the motor: put the contactor in and read the live current through the MCB and the relay
  const dp = JSON.parse(JSON.stringify(p.devices)).map((d) => (d.id === 'mdol_km1' ? { ...d, state: { ...d.state, coilEnergized: true } } : d));
  const s2 = solveCircuit(dp, p.wires, p.codeStandard, p.gridVoltage);
  const a = operatingAmps(dp.find((d) => d.id === 'mdol_f2'), p.wires, s2.wireCurrents);
  assert.ok(a >= 0);
}

console.log('curves tests passed');
