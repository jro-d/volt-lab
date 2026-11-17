import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = (id) => {
  const l = LAB_LESSONS.find((x) => x.id === id);
  assert.ok(l, `lab ${id} exists`);
  return clone(l.project);
};

console.log('--- RCBO 1P+N: separate circuits ---');
{
  const p = lab('lab-rcbo-separate-circuits');
  let devices = run(p.devices, p.wires, 1);
  assert.equal(!!byId(devices, 'sock_a').state.powered, true, 'kitchen socket live');
  assert.equal(!!byId(devices, 'sock_b').state.powered, true, 'living room socket live');
  console.log('✓ both sockets energized through their RCBOs');

  // Earth leakage on the kitchen socket: only Q1 trips
  byId(devices, 'sock_a').state.hasEarthFault = true;
  devices = run(devices, p.wires, 2);
  const a = byId(devices, 'rcbo_a').state;
  const b = byId(devices, 'rcbo_b').state;
  assert.equal(a.tripped, true, 'Q1 trips on earth leakage');
  assert.ok(/Earth Leakage Trip/.test(a.tripReason), a.tripReason);
  assert.equal(!!b.tripped, false, 'Q2 does not trip');
  assert.equal(!!byId(devices, 'sock_a').state.powered, false, 'kitchen socket is dead');
  assert.equal(!!byId(devices, 'sock_b').state.powered, true, 'living room socket keeps its power');
  console.log('✓ earth fault on the kitchen socket: Q1 tripped, Q2 untouched, living room still live');
}

console.log('\n--- RCBO overload, short circuit and leakage ---');
{
  const build = (rated, load) => {
    const src = dev('kwh_meter_1p', 'src');
    const q = dev('rcbo_1pn', 'q', { ratedAmps: rated });
    const nbar = dev('neutral_busbar', 'nbar');
    const wh = dev('appliance_water_heater', 'wh', { wattage: load });
    const wires = [
      wire('l1', 'src', 'l_out', 'q', 'in_l'),
      wire('n0', 'src', 'n_out', 'nbar', 'n_main', { color: '#0f172a', conductorRole: 'return_neutral' }),
      wire('n1', 'nbar', 'n_1', 'q', 'in_n', { color: '#0f172a', conductorRole: 'return_neutral' }),
      wire('l2', 'q', 'out_l', 'wh', 'line'),
      wire('n2', 'q', 'out_n', 'wh', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' }),
    ];
    return { devices: [src, q, nbar, wh], wires };
  };

  // Overload (breaker rule): 3.5 kW = 15.2 A on a 10 A RCBO trips; on a 16 A RCBO it holds
  const over = build(10, 3500);
  const overRun = run(over.devices, over.wires, 2);
  assert.equal(byId(overRun, 'q').state.tripped, true, '10 A RCBO trips under 15.2 A');
  assert.ok(/Thermal Overload/.test(byId(overRun, 'q').state.tripReason));
  const ok = build(16, 3500);
  assert.equal(!!byId(run(ok.devices, ok.wires, 4), 'q').state.tripped, false, '16 A RCBO holds at 15.2 A');
  console.log('✓ overload trip like the MCB (trips at 15.2 A on 10 A, holds on 16 A)');

  // Short circuit: line bolted to neutral downstream
  const sc = build(16, 3500);
  sc.wires.push(wire('short', 'q', 'out_l', 'nbar', 'n_2', { color: '#dc2626' }));
  const scRun = run(sc.devices, sc.wires, 2);
  assert.equal(byId(scRun, 'q').state.tripped, true, 'RCBO clears the short circuit');
  assert.ok(/Magnetic/.test(byId(scRun, 'q').state.tripReason), byId(scRun, 'q').state.tripReason);
  console.log('✓ short circuit: magnetic trip');

  // A tripped RCBO opens line AND neutral
  const tripped = clone(ok.devices);
  Object.assign(byId(tripped, 'q').state, { tripped: true, closed: false });
  const so = solve(tripped, ok.wires);
  assert.notEqual(so.nodePotentials['q:out_l'], 'live');
  assert.notEqual(so.nodePotentials['q:out_n'], 'neutral');
  console.log('✓ tripped RCBO opens both line and neutral');

  // Earth leakage on a water heater trips the RCBO upstream of it
  const lk = build(16, 3500);
  byId(lk.devices, 'wh').state.hasEarthFault = true;
  const lkRun = run(lk.devices, lk.wires, 2);
  assert.ok(/Earth Leakage/.test(byId(lkRun, 'q').state.tripReason || ''), 'heater leakage trips the RCBO');
  console.log('✓ heater earth leakage trips its RCBO');
}

console.log('\n--- Existing RCD behaviour is unchanged ---');
{
  const src = dev('kwh_meter_1p', 'src');
  const rcd = dev('rcd_2p', 'rcd');
  const nbar = dev('neutral_busbar', 'nbar');
  const wh = dev('appliance_water_heater', 'wh', { hasEarthFault: true });
  const wires = [
    wire('l1', 'src', 'l_out', 'rcd', 'in_l'),
    wire('n0', 'src', 'n_out', 'nbar', 'n_main', { color: '#0f172a', conductorRole: 'return_neutral' }),
    wire('n1', 'nbar', 'n_1', 'rcd', 'in_n', { color: '#0f172a', conductorRole: 'return_neutral' }),
    wire('l2', 'rcd', 'out_l', 'wh', 'line'),
    wire('n2', 'rcd', 'out_n', 'wh', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' }),
  ];
  const after = run([src, rcd, nbar, wh], wires, 2);
  assert.equal(byId(after, 'rcd').state.tripped, true, 'rcd_2p still trips on a heater earth fault');
  console.log('✓ rcd_2p still trips on a water-heater earth fault');
}

console.log('\n--- Compliance ---');
{
  const src = dev('kwh_meter_1p', 'src');
  const sock = dev('socket_duplex', 'sock');
  const plain = analyzeCodeCompliance([src, sock], [], solve([src, sock], []), 'PEC', 230).violations;
  assert.ok(plain.some((v) => v.id === 'viol_missing_rcd'), 'sockets without RCD protection are flagged');
  const rcbo = dev('rcbo_1pn', 'q');
  const withRcbo = analyzeCodeCompliance([src, sock, rcbo], [], solve([src, sock, rcbo], []), 'PEC', 230).violations;
  assert.ok(!withRcbo.some((v) => v.id === 'viol_missing_rcd'), 'an RCBO satisfies the RCD rule for sockets');
  console.log('✓ RCBO counts as RCD protection for sockets');
}
console.log('RCBO TESTS PASSED');
