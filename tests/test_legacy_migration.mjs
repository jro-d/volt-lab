import assert from 'node:assert/strict';
import { migrateLegacyProject } from '../src/utils/projectMigration.ts';
import { COMPONENT_CATALOG, createDeviceFromCatalog } from '../src/data/defaultComponents.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

console.log('--- Legacy project migration ---');

const src = createDeviceFromCatalog('source_3phase_440v', 0, 0, 'src');
const legacyMotor = {
  ...createDeviceFromCatalog('motor_ac_industrial', 300, 120, 'm1'),
  type: 'motor_3phase_dol',
  name: '3-Phase Induction Motor & Starter',
  rotation: 90,
  state: { wattage: 3000, running: true, rpm: 1440 },
  terminals: [
    { id: 'l1', name: 'Line 1 (L1)', type: 'phase', relX: 0.2, relY: 0.1, label: 'L1' },
    { id: 'l2', name: 'Line 2 (L2)', type: 'phase2', relX: 0.4, relY: 0.1, label: 'L2' },
    { id: 'l3', name: 'Line 3 (L3)', type: 'phase3', relX: 0.6, relY: 0.1, label: 'L3' },
    { id: 'pe', name: 'Frame Earth (PE)', type: 'earth', relX: 0.8, relY: 0.1, label: 'PE' },
  ],
};
const srcTerms = src.terminals.map((t) => t.id);
console.log('source terminals:', srcTerms.join(','));
const pick = (type) => src.terminals.find((t) => t.type === type)?.id;
const wire = (id, fromT, toT, extra = {}) => ({
  id, fromDeviceId: 'src', fromTerminalId: fromT, toDeviceId: 'm1', toTerminalId: toT,
  wireGauge: '2.5 mm²', color: '#dc2626', lengthMeters: 3, conductorRole: 'feed_live', ...extra,
});
const wires = [
  wire('w1', pick('phase'), 'l1', { cableBundleId: 'bundle_1' }),
  wire('w2', pick('phase2'), 'l2', { cableBundleId: 'bundle_1' }),
  wire('w3', pick('phase3'), 'l3'),
];

const out = migrateLegacyProject([src, legacyMotor], wires);
const m = out.devices.find((d) => d.id === 'm1');
assert.equal(m.type, 'motor_ac_industrial');
assert.equal(m.x, 300); assert.equal(m.y, 120); assert.equal(m.rotation, 90);
assert.equal(m.state.wattage, 3000);
assert.notEqual(m.state.running, true, 'running state reset');
const defTerms = COMPONENT_CATALOG.find((c) => c.type === 'motor_ac_industrial').terminals.map((t) => t.id);
assert.deepEqual(m.terminals.map((t) => t.id), defTerms);
console.log('✓ device converted, position/rotation/wattage kept, terminals rebuilt');

assert.deepEqual(out.wires.map((w) => w.toTerminalId), ['u1', 'v1', 'w1']);
assert.equal(out.wires[0].cableBundleId, 'bundle_1', 'cableBundleId tolerated');
console.log('✓ wires re-pointed l1/l2/l3 -> u1/v1/w1; cableBundleId preserved');

const solved = solveCircuit(out.devices, out.wires, 'PEC', 230);
assert.ok(solved);
console.log('✓ migrated project solves');
console.log('LEGACY MIGRATION TESTS PASSED');

// Removed generic junction box -> octagonal box; wires on matching terminal ids survive
const jb = { ...createDeviceFromCatalog('junction_box_octagonal_orange', 50, 60, 'jb'), type: 'junction_box' };
const jbWires = [
  { id: 'j1', fromDeviceId: 'src', fromTerminalId: pick('phase'), toDeviceId: 'jb', toTerminalId: 'l_in', wireGauge: '2.5 mm²', color: '#dc2626', lengthMeters: 2 },
  { id: 'j2', fromDeviceId: 'src', fromTerminalId: pick('phase'), toDeviceId: 'jb', toTerminalId: 'bogus', wireGauge: '2.5 mm²', color: '#dc2626', lengthMeters: 2 },
];
const jbOut = migrateLegacyProject([src, jb], jbWires);
assert.equal(jbOut.devices.find((d) => d.id === 'jb').type, 'junction_box_octagonal_orange');
assert.deepEqual(jbOut.wires.map((w) => w.id), ['j1'], 'wire to a missing terminal is dropped');
console.log('✓ junction_box -> junction_box_octagonal_orange');
console.log('JUNCTION BOX MIGRATION PASSED');

// Removed panelboard frame -> neutral bus bar + earth bus bar; n_bus / pe_bus wires follow
const pb = { id: 'pb', type: 'panelboard_frame', category: 'protection', name: '8-Branch Distribution Panelboard Frame', x: 100, y: 200, width: 340, height: 240, state: { label: 'LP-1' },
  terminals: [
    { id: 'n_bus', name: 'Neutral Busbar', type: 'neutral', relX: 0.14, relY: 0.88 },
    { id: 'pe_bus', name: 'Ground Busbar', type: 'earth', relX: 0.86, relY: 0.88 },
  ] };
const pbWires = [
  { id: 'p1', fromDeviceId: 'src', fromTerminalId: 'pe', toDeviceId: 'pb', toTerminalId: 'pe_bus', wireGauge: '2.5 mm²', color: '#16a34a', lengthMeters: 1 },
  { id: 'p2', fromDeviceId: 'pb', fromTerminalId: 'n_bus', toDeviceId: 'src', toTerminalId: pick('neutral') ?? 'pe', wireGauge: '2.5 mm²', color: '#2563eb', lengthMeters: 1 },
];
const pbOut = migrateLegacyProject([src, pb], pbWires);
const types = pbOut.devices.map((d) => d.type).sort();
assert.deepEqual(types, ['earth_busbar', 'neutral_busbar', 'source_3phase_440v'].sort());
const earthBar = pbOut.devices.find((d) => d.type === 'earth_busbar');
const neutralBar = pbOut.devices.find((d) => d.type === 'neutral_busbar');
assert.equal(pbOut.wires.find((w) => w.id === 'p1').toDeviceId, earthBar.id);
assert.equal(pbOut.wires.find((w) => w.id === 'p1').toTerminalId, 'pe_main');
assert.equal(pbOut.wires.find((w) => w.id === 'p2').fromDeviceId, neutralBar.id);
assert.equal(pbOut.wires.find((w) => w.id === 'p2').fromTerminalId, 'n_main');
console.log('✓ panelboard_frame -> neutral + earth bus bars, wires remapped');
console.log('PANELBOARD MIGRATION PASSED');
