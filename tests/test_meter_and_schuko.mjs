import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId, approx } from './helpers.mjs';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';

console.log('--- 3-phase kWh meter ---');
{
  const src = dev('source_3phase_440v', 'src');
  const meter = dev('kwh_meter_3p', 'm');
  const motor = dev('motor_ac_industrial', 'mot', { wattage: 2200 });
  const wires = [
    wire('a1', 'src', 'l1', 'm', 'l1_in'), wire('a2', 'src', 'l2', 'm', 'l2_in'), wire('a3', 'src', 'l3', 'm', 'l3_in'),
    wire('b1', 'm', 'l1_out', 'mot', 'u1'), wire('b2', 'm', 'l2_out', 'mot', 'v1'), wire('b3', 'm', 'l3_out', 'mot', 'w1'),
    wire('pe', 'src', 'pe', 'mot', 'pe', { color: '#16a34a', conductorRole: 'earth_ground' }),
  ];
  const devices = [src, meter, motor];
  const solved = solve(devices, wires, 'PEC', 440);
  assert.equal(solved.nodePotentials['m:l2_out'], 'live', 'meter passes each phase through');
  assert.equal(solved.deviceEnergized['mot'], true, 'motor downstream of the meter runs');
  console.log('✓ meter passes L1/L2/L3 through to the load');

  // 50 real seconds at 60x = 3000 simulated seconds; 2200 W / 0.6 (model efficiency x pf) = 3667 W apparent
  const after = run(devices, wires, 100, 0.5, { volts: 440 });
  const m = byId(after, 'm');
  const expected = (2200 / 0.6 / 1000) * (3000 / 3600);
  assert.ok(approx(m.state.kwh, expected, expected * 0.02), `kwh ${m.state.kwh} ~ ${expected}`);
  const phases = [m.state.l1Kwh, m.state.l2Kwh, m.state.l3Kwh];
  assert.ok(phases.every((p) => approx(p, m.state.kwh / 3, m.state.kwh * 0.02)), 'balanced load -> equal phase energy');
  assert.ok(approx(m.state.l1Amps, 2200 / (Math.sqrt(3) * 440 * 0.6), 0.1));
  console.log(`✓ total ${m.state.kwh.toFixed(3)} kWh, per phase ${phases.map((p) => p.toFixed(3)).join(' / ')} kWh`);

  // No load (motor not connected): the register stays put
  const idle = run([src, dev('kwh_meter_3p', 'm2')], [wire('a1', 'src', 'l1', 'm2', 'l1_in')], 20, 0.5, { volts: 440 });
  assert.equal(byId(idle, 'm2').state.kwh, 0);
  console.log('✓ no load -> register does not move');
}

console.log('\n--- Schuko receptacle ---');
{
  const build = (type) => {
    const meter = dev('kwh_meter_1p', 'src');
    const sock = dev(type, 'sock');
    // Line and neutral deliberately swapped at the receptacle
    const wires = [
      wire('w1', 'src', 'l_out', 'sock', 'neutral'),
      wire('w2', 'src', 'n_out', 'sock', 'line', { color: '#2563eb', conductorRole: 'return_neutral' }),
      wire('w3', 'src', 'n_out', 'sock', 'ground', { color: '#16a34a', conductorRole: 'earth_ground' }),
    ];
    const devices = [meter, sock];
    const solved = solve(devices, wires);
    return analyzeCodeCompliance(devices, wires, solved, 'PEC', 230).violations;
  };
  const duplex = build('socket_duplex');
  assert.ok(duplex.some((v) => v.id.startsWith('viol_reversed_polarity')), 'duplex socket reports reversed polarity');
  const schuko = build('socket_schuko');
  assert.ok(!schuko.some((v) => v.id.startsWith('viol_reversed_polarity')), 'Schuko is reversible: no polarity violation');
  console.log('✓ reversed polarity flagged on the duplex, not on the Schuko');

  const noRcd = analyzeCodeCompliance([dev('kwh_meter_1p', 'src'), dev('socket_schuko', 'sock')], [], solve([dev('kwh_meter_1p', 'src'), dev('socket_schuko', 'sock')], []), 'PEC', 230).violations;
  assert.ok(noRcd.some((v) => v.id === 'viol_missing_rcd'), 'Schuko without RCD protection is flagged like any socket');
  console.log('✓ Schuko without an RCD is flagged (shares the socket RCD rule)');
}
console.log('METER AND SCHUKO TESTS PASSED');
