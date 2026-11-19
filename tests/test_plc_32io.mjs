import assert from 'node:assert/strict';
import { dev, wire, run, byId } from './helpers.mjs';
import { addressKind, ioMap, scanProgram, emptyRuntime, ALL_INPUTS, ALL_OUTPUTS } from '../src/core/plcEngine.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { isPlc24, plc24Count } from '../src/core/dcDomain.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const el = (kind, address, extra = {}) => ({ id: `e${Math.random()}`, kind, tag: address, sub: '', address, ...extra });
const rung = (inAddr, outAddr) => ({ id: `r${Math.random()}`, blocks: [{ id: `b${Math.random()}`, branches: [[el('NO', inAddr)]] }], output: el('COIL', outAddr) });
const setup = (plc, extraWires = []) => {
  const devices = [dev('kwh_meter_1p', 'grid'), dev('psu_24vdc', 'psu'), plc];
  const wires = [
    wire('a', 'grid', 'l_out', 'psu', 'in_l'), wire('b', 'grid', 'n_out', 'psu', 'in_n', N),
    wire('c', 'psu', 'v_pos', 'plc', 'l_pos'), wire('d', 'psu', 'v_neg', 'plc', 'm_neg'),
    ...extraWires,
  ];
  return { devices, wires };
};

console.log('--- Addresses and I/O map ---');
{
  assert.equal(addressKind('I1.7'), 'I');
  assert.equal(addressKind('Q1.0'), 'Q');
  assert.equal(addressKind('I2.0'), null);
  assert.equal(addressKind('I0.8'), null);
  assert.equal(ALL_INPUTS.length, 16);
  assert.equal(ALL_OUTPUTS.length, 16);
  const big = ioMap('plc_24vdc_32io');
  assert.equal(Object.keys(big.inputs).length, 16);
  assert.equal(big.inputs['I1.4'], 'i12');
  assert.equal(big.outputs['Q1.7'], 'q15');
  assert.equal(Object.keys(ioMap('plc_24vdc_16io').inputs).length, 8, 'the 8 in / 8 out PLC is unchanged');
  assert.equal(Object.keys(ioMap('plc_micro_controller').inputs).length, 4);
  assert.ok(isPlc24('plc_24vdc_32io') && isPlc24('plc_24vdc_16io') && !isPlc24('psu_24vdc'));
  assert.equal(plc24Count('plc_24vdc_32io'), 16);
  const r = scanProgram({ v: 1, scanMs: 100, symbols: {}, rungs: [rung('I1.3', 'Q1.5')] }, emptyRuntime(), { 'I1.3': true });
  assert.equal(r.outputs['Q1.5'], true, 'the engine reads and writes the second byte');
  console.log('✓ I0.0-I1.7 / Q0.0-Q1.7, and the older PLCs keep their size');
}

console.log('\n--- Device on the 24 V domain ---');
{
  const plc = dev('plc_24vdc_32io', 'plc');
  assert.equal(plc.terminals.filter((t) => /^i\d+$/.test(t.id)).length, 16);
  assert.equal(plc.terminals.filter((t) => /^q\d+$/.test(t.id)).length, 16);
  // passthrough: wire +24 V to the sinking inputs I0.0 and I1.7 only
  const { devices, wires } = setup(plc, [wire('e', 'psu', 'v_pos', 'plc', 'i0'), wire('f', 'psu', 'v_pos', 'plc', 'i15')]);
  const d = run(devices, wires, 3);
  const p = byId(d, 'plc');
  assert.ok(p.state.plcPowered, 'powered from the 24 V supply');
  assert.equal(p.state.plcInputs.i0, true);
  assert.equal(p.state.plcInputs.i15, true, 'input I1.7 is read');
  assert.equal(p.state.plcInputs.i8, false);
  assert.equal(p.state.plcOutputs.q15, true, 'passthrough drives Q1.7');
  assert.equal(p.state.plcOutputs.q0, true);
  assert.equal(p.state.plcOutputs.q9, false);
  // the output terminal carries +24 V to a load wired to it (sourcing)
  const lamp = dev('beacon', 'lamp', { supply: 'dc24' });
  const wired = setup(dev('plc_24vdc_32io', 'plc'), [wire('e', 'psu', 'v_pos', 'plc', 'i15'), wire('g', 'plc', 'q15', 'lamp', 'a1'), wire('h', 'psu', 'v_neg', 'lamp', 'a2')]);
  const out = run([...wired.devices, lamp], wired.wires, 4);
  assert.ok(solveCircuit(out, wired.wires, 'PEC', 230).deviceEnergized.lamp, 'Q1.7 switches +24 V to the beacon');
  console.log('✓ sixteen inputs and outputs, passthrough on the second byte, a load on Q1.7');
}

console.log('\n--- User program and sensor note ---');
{
  const prog = { v: 1, scanMs: 100, symbols: {}, rungs: [rung('I1.0', 'Q1.0'), rung('I0.0', 'Q0.7')] };
  const { devices, wires } = setup(dev('plc_24vdc_32io', 'plc', { program: 'user', plcProgram: prog }), [wire('e', 'psu', 'v_pos', 'plc', 'i8')]);
  const d = run(devices, wires, 4);
  const p = byId(d, 'plc');
  assert.equal(p.state.plcOutputs.q8, true, 'I1.0 drives Q1.0 in the user program');
  assert.equal(p.state.plcOutputs.q7, false, 'I0.0 is off');
  // an NPN sensor on a sinking input of the big PLC gets the same mismatch note as on the small one
  const sensor = dev('sensor_inductive', 's', { output: 'NPN' });
  const s = setup(dev('plc_24vdc_32io', 'plc', { inputMode: 'sinking' }), [wire('p', 'psu', 'v_pos', 's', 'brown'), wire('q', 'psu', 'v_neg', 's', 'blue'), wire('r', 's', 'black', 'plc', 'i12')]);
  const sd = run([...s.devices, sensor], s.wires, 3);
  assert.match(byId(sd, 'plc').state.dcNote || '', /NPN/, 'the sensor / input type mismatch is reported on I1.4 too');
  console.log('✓ user program over both bytes; sensor mismatch note on a high input');
}

console.log('\nPLC 16/16 TESTS PASSED');
