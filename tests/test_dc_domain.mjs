import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = LAB_LESSONS.find((l) => l.id === 'lab-conveyor-stop-dc');
assert.ok(lab, 'lab exists');
assert.ok(lab.project.targetLadder?.length, 'reference ladder provided');

/** Solve repeatedly (like the app) so the supply, sensor, PLC and relay settle; optional edit of devices / wires first. */
function settle(edit = () => {}, steps = 6) {
  const devices = clone(lab.project.devices);
  const wires = clone(lab.project.wires);
  edit(devices, wires);
  const d = run(devices, wires, steps, 0.5, { standard: 'PEC', volts: 440 });
  return { d, wires };
}

console.log('--- 24 V DC domain: conveyor stop lab ---');
{
  const { d } = settle();
  assert.equal(byId(d, 'ps1').state.dcOutputOn, true, 'supply on');
  assert.equal(byId(d, 'b1').state.sensorPowered, true);
  assert.equal(byId(d, 'b1').state.outActive, true, 'NC sensor, nothing in front: output high');
  assert.equal(byId(d, 'plc').state.plcInputs.i0, true);
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, true);
  assert.equal(byId(d, 'k1').state.coilEnergized, true);
  assert.equal(byId(d, 'km1').state.coilEnergized, true);
  console.log('✓ belt clear: 24 V up, sensor, PLC, relay and contactor all on');
}
{
  const { d } = settle((devices) => { byId(devices, 'b1').state.detected = true; });
  assert.equal(byId(d, 'b1').state.outActive, false);
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, false);
  assert.equal(byId(d, 'km1').state.coilEnergized, false, 'target present: conveyor stops');
  console.log('✓ target at the sensor stops the contactor');
}
{
  const { d } = settle((devices) => { byId(devices, 'b1').state.output = 'NPN'; });
  assert.equal(byId(d, 'km1').state.coilEnergized, false, 'NPN into a sinking input never works');
  assert.match(byId(d, 'b1').state.wiringNote, /NPN OUTPUT INTO PNP/);
  assert.match(byId(d, 'plc').state.dcNote, /NPN sensor on a SINKING/);
  console.log('✓ NPN sensor into a PNP input: visible fault note instead of silently not working');
}
{
  const { d } = settle((devices) => { byId(devices, 'b1').state.output = 'NPN'; byId(devices, 'plc').state.inputMode = 'sourcing'; });
  assert.equal(byId(d, 'b1').state.wiringNote, '');
  assert.equal(byId(d, 'plc').state.plcInputs.i0, true, 'NPN into a sourcing input works');
  console.log('✓ NPN sensor into a sourcing input works');
}
{
  const { d } = settle((devices, wires) => {
    for (const w of wires) {
      if (w.toDeviceId === 'b1' && w.toTerminalId === 'brown') w.toTerminalId = 'blue';
      else if (w.toDeviceId === 'b1' && w.toTerminalId === 'blue') w.toTerminalId = 'brown';
    }
  });
  assert.equal(byId(d, 'b1').state.sensorPowered, false);
  assert.match(byId(d, 'b1').state.supplyNote, /REVERSED SUPPLY/);
  console.log('✓ reversed sensor supply flagged');
}
{
  // Short the 24 V rails: current-limit shutdown, then recovery after the hold time
  const devices = clone(lab.project.devices);
  const wires = clone(lab.project.wires);
  wires.push(wire('short', 'ps1', 'v_pos', 'ps1', 'v_neg'));
  let d = run(devices, wires, 2, 0.5, { standard: 'PEC', volts: 440 });
  assert.equal(byId(d, 'ps1').state.psuTripped, true);
  assert.equal(byId(d, 'ps1').state.psuFault, 'OUTPUT SHORT');
  assert.equal(byId(d, 'ps1').state.dcOutputOn, false);
  wires.pop();
  d = run(d, wires, 8, 0.5, { standard: 'PEC', volts: 440 });
  assert.equal(byId(d, 'ps1').state.psuTripped, false, 'recovers after a few simulated seconds');
  assert.equal(byId(d, 'ps1').state.dcOutputOn, true);
  console.log('✓ short circuit trips the supply, which recovers once the fault is cleared');
}
{
  // AC/DC cross-connection: +24 V wired to the 220 V control hot
  const { d, wires } = settle((devices, w) => { w.push(wire('mix', 'ps1', 'v_pos', 'tc1', 'x1')); }, 2);
  const ps = byId(d, 'ps1');
  assert.equal(ps.state.psuTripped, true);
  assert.equal(ps.state.psuFault, 'AC/DC CROSS-CONNECTION');
  assert.equal(byId(d, 'km1').state.coilEnergized, false);
  const devices = clone(lab.project.devices);
  const solved = solveCircuit(devices, wires, 'PEC', 440);
  const report = analyzeCodeCompliance(devices, wires, solved, 'PEC', 440);
  assert.ok(report.violations.some((v) => v.id.startsWith('viol_ac_dc_mix_') && v.severity === 'error'), 'static check reports it');
  console.log('✓ AC / DC cross-connection shuts the supply down and is reported as an error');
}
{
  // The clean lab has no AC/DC violation
  const devices = clone(lab.project.devices);
  const wires = clone(lab.project.wires);
  const report = analyzeCodeCompliance(devices, wires, solveCircuit(devices, wires, 'PEC', 440), 'PEC', 440);
  assert.ok(!report.violations.some((v) => v.id.startsWith('viol_ac_dc_mix_')));
  console.log('✓ clean lab: no cross-connection');
}
{
  // Start / stop latch program
  const mk = () => {
    const devices = [
      dev('source_3phase_440v', 'src', { lineVoltage: 440 }),
      dev('control_transformer', 'tc1'),
      dev('psu_24vdc', 'ps1'),
      dev('plc_24vdc_16io', 'plc', { program: 'start_stop_latch' }),
      dev('sensor_inductive', 'start', { contact: 'NO' }),
      dev('sensor_inductive', 'stop', { contact: 'NC' }),
    ];
    const wires = [
      wire('h1', 'src', 'l1', 'tc1', 'h1'), wire('h2', 'src', 'l2', 'tc1', 'h2'),
      wire('p1', 'tc1', 'x1', 'ps1', 'in_l'), wire('p2', 'tc1', 'x2', 'ps1', 'in_n'),
      wire('a', 'ps1', 'v_pos', 'plc', 'l_pos'), wire('b', 'ps1', 'v_neg', 'plc', 'm_neg'),
      wire('c', 'ps1', 'v_pos', 'start', 'brown'), wire('d', 'ps1', 'v_neg', 'start', 'blue'),
      wire('e', 'ps1', 'v_pos', 'stop', 'brown'), wire('f', 'ps1', 'v_neg', 'stop', 'blue'),
      wire('g', 'start', 'black', 'plc', 'i0'), wire('h', 'stop', 'black', 'plc', 'i1'),
    ];
    return { devices, wires };
  };
  const { devices, wires } = mk();
  let d = run(devices, wires, 3, 0.5, { volts: 440 });
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, false, 'idle');
  byId(d, 'start').state.detected = true;
  d = run(d, wires, 3, 0.5, { volts: 440 });
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, true, 'START pressed');
  byId(d, 'start').state.detected = false;
  d = run(d, wires, 3, 0.5, { volts: 440 });
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, true, 'sealed in after START released');
  byId(d, 'stop').state.detected = true;
  d = run(d, wires, 3, 0.5, { volts: 440 });
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, false, 'STOP drops it out');
  byId(d, 'stop').state.detected = false;
  byId(d, 'plc').state.plcRunning = false;
  byId(d, 'start').state.detected = true;
  d = run(d, wires, 3, 0.5, { volts: 440 });
  assert.equal(byId(d, 'plc').state.plcOutputs.q0, false, 'CPU in STOP: outputs off');
  console.log('✓ start/stop latch program and RUN/STOP');
}
console.log('\nDC DOMAIN TESTS PASSED');
