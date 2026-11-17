import assert from 'node:assert/strict';
import { timeToTrip, timeToTripAmps, MOTOR_START_SEC } from '../src/core/tripCurves.ts';

console.log('--- Trip curves ---');
const kinds = ['mcb_B', 'mcb_C', 'mcb_D', 'fuse_gG', 'fuse_aM', 'overload_class10'];

// Every curve is monotonically non-increasing (more current never takes longer)
for (const k of kinds) {
  let prev = Infinity;
  for (let m = 1; m <= 40; m += 0.05) {
    const t = timeToTrip(k, 16, m);
    assert.ok(t <= prev + 1e-9, `${k} not monotonic at ${m}x: ${t} > ${prev}`);
    prev = t;
  }
}
console.log('✓ all six curves are monotonically decreasing');

// IEC 60898-1 conventional values (B, C and D share the thermal region)
for (const k of ['mcb_B', 'mcb_C', 'mcb_D']) {
  assert.ok(timeToTrip(k, 16, 1.13) > 3600, `${k}: no trip within 1 h at 1.13 In`);
  assert.ok(timeToTrip(k, 16, 1.45) <= 3600, `${k}: trips within 1 h at 1.45 In`);
  const t255 = timeToTrip(k, 16, 2.55);
  assert.ok(t255 >= 1 && t255 <= 60, `${k}: 1-60 s at 2.55 In (got ${t255})`);
}
assert.ok(timeToTrip('mcb_B', 16, 5) < 0.1 && timeToTrip('mcb_C', 16, 10) < 0.1 && timeToTrip('mcb_D', 16, 20) < 0.1);
assert.ok(timeToTrip('mcb_C', 16, 4) > timeToTrip('mcb_B', 16, 4), 'C is slower than B at 4 In');
assert.ok(timeToTrip('mcb_D', 16, 8) > timeToTrip('mcb_C', 16, 8), 'D is slower than C at 8 In');
console.log('✓ B/C/D match the IEC 60898-1 conventional points and magnetic ranges');

// IEC 60269 gG
assert.ok(timeToTrip('fuse_gG', 16, 1.25) > 3600, 'gG: non-fusing at 1.25 In');
assert.ok(timeToTrip('fuse_gG', 16, 1.6) <= 3600, 'gG: fuses within 1 h at 1.6 In');
assert.ok(timeToTrip('fuse_gG', 16, 10) < 1);
assert.equal(timeToTrip('fuse_gG', 16, 1.0), Infinity);
console.log('✓ gG conventional non-fusing / fusing currents');

// aM rides through a motor start
assert.equal(timeToTrip('fuse_aM', 16, 2), Infinity, 'aM gives no overload protection');
assert.ok(timeToTrip('fuse_aM', 16, 6.3) > MOTOR_START_SEC, 'aM survives 6.3 In for the start duration');
console.log('✓ aM does not operate on overload and survives a motor start');

// IEC 60947-4-1 class 10
const t72 = timeToTrip('overload_class10', 6, 7.2);
assert.ok(t72 > 4 && t72 <= 10, `class 10 at 7.2 Ir: ${t72}`);
assert.ok(timeToTrip('overload_class10', 6, 1.5) <= 120);
assert.ok(timeToTrip('overload_class10', 6, 1.05) > 7200 - 1);
console.log('✓ overload class 10 trip times');

assert.equal(timeToTripAmps('fuse_gG', 16, 32), timeToTrip('fuse_gG', 16, 2));
console.log('TRIP CURVE TESTS PASSED');
