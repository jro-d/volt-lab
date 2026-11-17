import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));

console.log('--- Generator set: start delay, frequency, overload ---');
{
  const gen = dev('generator_set_1p', 'gen');
  const lamp = dev('light_bulb', 'lamp');
  const wires = [wire('l', 'gen', 'l_out', 'lamp', 'hot'), wire('n', 'gen', 'n_out', 'lamp', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' })];
  let devices = [gen, lamp];
  byId(devices, 'gen').state.runRequested = true;
  // 0.1 s steps: not running at 2.9 s, running at 3.1 s
  devices = run(devices, wires, 29, 0.1);
  assert.equal(!!byId(devices, 'gen').state.running, false, 'not running at 2.9 s');
  assert.equal(!!byId(devices, 'lamp').state.lit, false, 'no output voltage during the start delay');
  devices = run(devices, wires, 2, 0.1);
  assert.equal(!!byId(devices, 'gen').state.running, true, 'running at 3.1 s');
  devices = run(devices, wires, 1, 0.1);
  assert.equal(!!byId(devices, 'lamp').state.lit, true, 'a running set powers its load');
  console.log('✓ 3 s start delay, then the set drives live / neutral like a supply');

  // Stopping removes the supply
  byId(devices, 'gen').state.runRequested = false;
  devices = run(devices, wires, 2, 0.1);
  assert.equal(!!byId(devices, 'gen').state.running, false);
  assert.equal(!!byId(devices, 'lamp').state.lit, false);
  console.log('✓ stop: output dead');

  // Frequency follows the project standard
  const g50 = run([dev('generator_set_1p', 'g')], [], 1, 0.5, { frequency: 50 });
  const g60 = run([dev('generator_set_1p', 'g')], [], 1, 0.5, { frequency: 60 });
  assert.equal(byId(g50, 'g').state.frequencyHz, 50);
  assert.equal(byId(g60, 'g').state.frequencyHz, 60);
  console.log('✓ frequency: 50 Hz (IEC) / 60 Hz (PEC) from the project');

  // Overload: a 3 kVA set on a 3.5 kW heater trips after a short delay and stays tripped
  const og = dev('generator_set_1p', 'g', { ratedKva: 3, runRequested: true });
  const wh = dev('appliance_water_heater', 'wh', { wattage: 3500 });
  const ow = [wire('l', 'g', 'l_out', 'wh', 'line'), wire('n', 'g', 'n_out', 'wh', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' })];
  let od = run([og, wh], ow, 8, 0.5); // 4 s: started at 3 s, loaded for 1 s
  assert.equal(!!byId(od, 'g').state.overloaded, false, 'not overloaded yet (short delay)');
  assert.ok(byId(od, 'g').state.loadKw > 3, `load read from the output current (${byId(od, 'g').state.loadKw} kW)`);
  od = run(od, ow, 6, 0.5);
  assert.equal(byId(od, 'g').state.overloaded, true, 'trips after the overload delay');
  assert.equal(byId(od, 'g').state.running, false);
  assert.equal(!!byId(od, 'wh').state.powered, false, 'the load is dropped');
  console.log('✓ overload: load measured, set trips after the delay and stays tripped');
}

console.log('\n--- 3-phase generator ---');
{
  const gen = dev('generator_set_3p', 'gen', { runRequested: true });
  const motor = dev('motor_ac_industrial', 'mot', { wattage: 2200 });
  const wires = [
    wire('a1', 'gen', 'l1_out', 'mot', 'u1'), wire('a2', 'gen', 'l2_out', 'mot', 'v1'), wire('a3', 'gen', 'l3_out', 'mot', 'w1'),
    wire('pe', 'gen', 'pe', 'mot', 'pe', { color: '#16a34a', conductorRole: 'earth_ground' }),
  ];
  const after = run([gen, motor], wires, 10, 0.5, { volts: 440 });
  assert.equal(!!byId(after, 'mot').state.running, true, 'motor runs on the generator');
  assert.equal(byId(after, 'mot').state.motorDirection, 'CW');
  const kw = byId(after, 'gen').state.loadKw;
  assert.ok(Math.abs(kw - 2200 / 0.6 / 1000) < 0.2, `load ${kw} kW`);
  console.log(`✓ 3-phase set: motor runs CW, load ${kw} kW`);
}

console.log('\n--- Standby generator and ATS lab ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-standby-generator-ats');
  assert.ok(lab, 'lab exists');
  const p = clone(lab.project);
  const lit = (d) => !!byId(d, 'lamp1').state.lit && !!byId(d, 'lamp2').state.lit;
  const dead = (d) => !byId(d, 'lamp1').state.lit && !byId(d, 'lamp2').state.lit;
  const src = (d) => byId(d, 'ats').state.source;

  let devices = run(p.devices, p.wires, 2, 0.5);
  assert.equal(lit(devices), true, 'lamps on the grid');
  assert.equal(src(devices), 'normal');
  assert.equal(byId(devices, 'gen').state.running, false, 'generator in standby');
  assert.equal(!!byId(devices, 'gen').state.remoteStart, false, 'remote start open while the grid is live');
  console.log('✓ grid live: lamps on, ATS on grid, generator in standby');

  // Outage
  byId(devices, 'qmain').state.closed = false;
  devices = run(devices, p.wires, 2, 0.5); // 1 s into the outage
  assert.equal(dead(devices), true, 'lamps dark during the outage');
  assert.equal(!!byId(devices, 'gen').state.remoteStart, true, 'loss-of-mains relay closes the remote start');
  console.log('✓ outage: lamps dark, remote start closed by the relay');

  devices = run(devices, p.wires, 4, 0.5); // ~3 s: generator reaches voltage
  assert.equal(!!byId(devices, 'gen').state.running, true, 'generator up after 3 s');
  assert.equal(src(devices), 'normal', 'ATS still waits out its transfer delay');
  assert.equal(dead(devices), true, 'load still dead while the ATS waits');
  devices = run(devices, p.wires, 8, 0.5); // transfer delay 3 s
  assert.equal(src(devices), 'generator', 'ATS has transferred');
  assert.equal(lit(devices), true, 'lamps back on, from the generator');
  console.log('✓ generator up after 3 s, ATS transfers after its 3 s delay, lamps on generator power');

  // The ATS never connects both sources to the load
  const solved = solveCircuit(devices, p.wires, 'PEC', 230);
  const loadFromNormal = solved.nodePotentials['ats:norm_l'] === 'live';
  assert.equal(loadFromNormal, false, 'normal side is dead while on generator');
  console.log('✓ only one source feeds the load at a time');

  // Retransfer
  byId(devices, 'qmain').state.closed = true;
  devices = run(devices, p.wires, 2, 0.5);
  assert.equal(src(devices), 'normal', 'load returns to the grid');
  assert.equal(lit(devices), true, 'no gap on retransfer');
  devices = run(devices, p.wires, 2, 0.5);
  assert.equal(byId(devices, 'gen').state.running, false, 'generator stops when the grid returns');
  console.log('✓ grid returns: load goes back to normal, generator stops');
}

console.log('\n--- ATS: legacy devices without a delay transfer instantly ---');
{
  const gen = dev('generator_set_1p', 'gen', { running: true });
  const ats = dev('ats_changeover', 'ats');
  delete ats.state.transferDelaySec;
  const lamp = dev('light_bulb', 'lamp');
  const wires = [
    wire('g1', 'gen', 'l_out', 'ats', 'gen_l'), wire('g2', 'gen', 'n_out', 'ats', 'gen_n', { color: '#0f172a', conductorRole: 'return_neutral' }),
    wire('l1', 'ats', 'load_l', 'lamp', 'hot'), wire('l2', 'ats', 'load_n', 'lamp', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' }),
  ];
  const devices = [gen, ats, lamp];
  solveCircuit(devices, wires, 'PEC', 230);
  assert.equal(ats.state.source, 'generator', 'previous behaviour: instant transfer');
  console.log('✓ ATS without transferDelaySec keeps the instant transfer');
}
console.log('GENERATOR AND ATS TESTS PASSED');
