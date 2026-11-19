import assert from 'node:assert/strict';
import { dev, wire, solve } from './helpers.mjs';
import { runLength, wiresBetween, planRuns, applyRunLengths, linkableDevices, planBounds, DEFAULT_PLAN, SYMBOL_SPECS, specFor } from '../src/core/floorPlan.ts';
import { buildLoadSchedule } from '../src/core/loadSchedule.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };

console.log('--- Run lengths ---');
{
  assert.equal(runLength({ x: 0, y: 0 }, { x: 3, y: 4 }, 'straight'), 5, 'a 3-4-5 triangle');
  assert.equal(runLength({ x: 0, y: 0 }, { x: 3, y: 4 }, 'orthogonal'), 7, 'along the walls: 3 + 4');
  assert.equal(runLength({ x: 1, y: 1 }, { x: 1, y: 1 }, 'straight'), 0);
  assert.equal(runLength({ x: 0, y: 0 }, { x: 3, y: 4 }, 'straight', 2.5), 7.5, 'a drop / allowance is added');
  assert.equal(runLength({ x: 2.5, y: 0 }, { x: 0, y: 0 }, 'orthogonal'), 2.5);
  assert.equal(runLength({ x: 0, y: 0 }, { x: 1, y: 1 }, 'straight'), 1.4, 'rounded to 0.1 m');
  assert.equal(SYMBOL_SPECS.length, 6, 'lights, switches, sockets, fans, appliances and panels');
  console.log('✓ straight, along-the-walls, drop allowance and rounding');
}

console.log('\n--- Runs set the wire lengths ---');
{
  const devices = [dev('kwh_meter_1p', 'grid'), dev('mcb_1p', 'q', { ratedAmps: 16 }), dev('appliance_water_heater', 'wh', { wattage: 3500 }), dev('light_bulb', 'lamp')];
  const wires = [
    wire('a', 'grid', 'l_out', 'q', 'in', { wireGauge: '10 AWG (5.5 mm²)', lengthMeters: 1 }),
    wire('b', 'q', 'out', 'wh', 'line', { wireGauge: '10 AWG (5.5 mm²)', lengthMeters: 2 }),
    wire('c', 'grid', 'n_out', 'wh', 'neutral', { ...N, wireGauge: '10 AWG (5.5 mm²)', lengthMeters: 2 }),
    wire('d', 'q', 'out', 'lamp', 'hot', { wireGauge: '14 AWG (2.0 mm²)', lengthMeters: 2 }),
  ];
  const plan = {
    ...DEFAULT_PLAN,
    rooms: [{ id: 'r1', name: 'Bathroom', x: 0, y: 0, w: 4, h: 3 }],
    symbols: [
      { id: 'sp', kind: 'panel', x: 0, y: 0, label: 'Panel', deviceId: 'q' },
      { id: 'sw', kind: 'appliance', x: 12, y: 5, label: 'Heater', deviceId: 'wh' },
      { id: 'sl', kind: 'light', x: 3, y: 4, label: 'Light' },
    ],
    runs: [
      { id: 'run1', fromSymbolId: 'sw', toSymbolId: 'sp', mode: 'orthogonal' },
      { id: 'run2', fromSymbolId: 'sl', toSymbolId: 'sp', mode: 'straight' },
    ],
  };
  assert.deepEqual(wiresBetween(wires, 'q', 'wh').map((w) => w.id), ['b']);
  const reports = planRuns(plan, wires);
  assert.equal(reports[0].lengthM, 17, '12 + 5 along the walls');
  assert.equal(reports[0].linked, true);
  assert.deepEqual(reports[0].wireIds, ['b']);
  assert.equal(reports[1].linked, false, 'the light is not linked to a device yet');
  assert.deepEqual(reports[1].wireIds, []);

  const before = solve(devices, wires).wireVoltageDropPercents.b;
  const applied = applyRunLengths(plan, wires);
  assert.equal(applied.changed, 1, 'only the wire between the linked devices changes');
  assert.equal(applied.wires.find((w) => w.id === 'b').lengthMeters, 17);
  assert.equal(applied.wires.find((w) => w.id === 'd').lengthMeters, 2, 'an unlinked run leaves its wires alone');
  assert.equal(wires.find((w) => w.id === 'b').lengthMeters, 2, 'the input is not mutated');
  const after = solve(devices, applied.wires).wireVoltageDropPercents.b;
  assert.ok(after > before * 7, `voltage drop follows the plan length: ${before} % -> ${after} %`);
  // linking the light makes its run count too
  const linked = { ...plan, symbols: plan.symbols.map((s) => (s.id === 'sl' ? { ...s, deviceId: 'lamp' } : s)) };
  const again = applyRunLengths(linked, applied.wires);
  assert.equal(again.wires.find((w) => w.id === 'd').lengthMeters, 5, 'straight run (3, 4) = 5 m');
  assert.equal(applyRunLengths(linked, again.wires).changed, 0, 'applying twice changes nothing');
  // the load schedule picks the longer conductor up
  const sched = buildLoadSchedule(devices, applied.wires, 'PEC', 230);
  assert.equal(sched.rows.find((r) => r.deviceId === 'wh').lengthM, 17);
  console.log('✓ the home run sets the wire length, voltage drop and the load schedule follow, unlinked runs do nothing');
}

console.log('\n--- Linking symbols to devices ---');
{
  const devices = [dev('light_bulb', 'l1'), dev('light_bulb', 'l2'), dev('switch_1gang', 's1'), dev('mcb_2p', 'p')];
  const plan = { ...DEFAULT_PLAN, symbols: [{ id: 'a', kind: 'light', x: 1, y: 1, label: 'L', deviceId: 'l1' }, { id: 'b', kind: 'light', x: 2, y: 1, label: 'L2' }] };
  const forB = linkableDevices(plan, devices, plan.symbols[1]).map((d) => d.id);
  assert.deepEqual(forB, ['l2'], 'a device already used by another symbol is not offered again, and only matching types');
  assert.ok(specFor('panel').types.includes('mcb_2p'));
  assert.deepEqual(linkableDevices(plan, devices, plan.symbols[0]).map((d) => d.id), ['l1', 'l2'], 'its own device stays available');
  assert.deepEqual(planBounds(DEFAULT_PLAN), { w: 10, h: 8 });
  assert.equal(planBounds({ ...plan, rooms: [{ id: 'r', name: 'x', x: 0, y: 0, w: 20, h: 5 }] }).w, 21);
  console.log('✓ type-filtered, one symbol per device, canvas grows with the plan');
}

console.log('\nFLOOR PLAN TESTS PASSED');
