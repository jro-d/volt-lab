import assert from 'node:assert/strict';
import { COMPONENT_CATALOG } from '../src/data/defaultComponents.ts';
import { inferConductorRole } from '../src/core/conductorRole.ts';

const term = (type, id) => COMPONENT_CATALOG.find((c) => c.type === type).terminals.find((t) => t.id === id);

console.log('--- Conductor role inference ---');
const mcbOut = term('mcb_1p', 'out');
const socketLine = term('socket_duplex', 'line');
assert.ok(mcbOut && socketLine, 'catalog terminals exist');
assert.equal(inferConductorRole(mcbOut, socketLine), 'feed_live');
console.log('✓ MCB out -> socket line = feed_live');

const mcbIn = COMPONENT_CATALOG.find((c) => c.type === 'mcb_1p').terminals.find((t) => t.type === 'neutral');
const socketN = COMPONENT_CATALOG.find((c) => c.type === 'socket_duplex').terminals.find((t) => t.type === 'neutral');
if (mcbIn && socketN) {
  assert.equal(inferConductorRole(mcbIn, socketN), 'return_neutral');
  console.log('✓ neutral -> neutral = return_neutral');
}
assert.equal(inferConductorRole({ type: 'neutral' }, { type: 'neutral' }), 'return_neutral');
assert.equal(inferConductorRole({ type: 'earth' }, { type: 'earth' }), 'earth_ground');
assert.equal(inferConductorRole({ type: 'earth' }, { type: 'neutral' }), 'earth_ground');
assert.equal(inferConductorRole({ type: 'phase' }, { type: 'switched' }), 'switched_live');
assert.equal(inferConductorRole({ type: 'traveler' }, { type: 'phase' }), 'traveler');
assert.equal(inferConductorRole(undefined, undefined), 'feed_live');
console.log('✓ earth / neutral / switched / traveler / fallback');
console.log('CONDUCTOR ROLE TESTS PASSED');
