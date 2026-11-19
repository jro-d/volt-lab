import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { applyProtectiveOutcome, tickSimulation } from '../src/core/simulationTick.ts';
import { tickProcess, DEFAULT_PROCESS } from '../src/core/process.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 0;
const w = (a, at, b, bt, extra) => wire(`f${++seq}`, a, at, b, bt, extra);
const L = (b, bt) => w('grid', 'l_out', b, bt);
const Nn = (b, bt) => w('grid', 'n_out', b, bt, N);
const grid = () => dev('kwh_meter_1p', 'grid');
const lamp = (id) => dev('pilot_light_indicator', id);
const lampOn = (devices, wires, id) => !!solve(devices, wires).deviceEnergized[id];
const setState = (devices, id, patch) => {
  const d = clone(devices);
  Object.assign(byId(d, id).state, patch);
  return d;
};

/** One app step with the process model (as App.tsx does). */
function step(project, dt = 0.5) {
  const solved = solveCircuit(project.devices, project.wires, 'PEC', project.gridVoltage || 230);
  let devices = applyProtectiveOutcome(project.devices, solved);
  devices = tickSimulation(devices, project.wires, solved, 60, dt, project.process);
  const process = tickProcess(devices, project.process, dt);
  return { ...project, devices, process };
}
const steps = (project, n) => {
  let p = project;
  for (let i = 0; i < n; i++) p = step(p);
  return p;
};

console.log('--- Electrode level relay ---');
{
  const make = (level, mode = 'fill') => ({
    devices: [grid(), dev('electrode_level_relay', 'kl', { mode, minPct: 30, maxPct: 70 }), lamp('pump')],
    wires: [L('kl', 'a1'), Nn('kl', 'a2'), L('kl', 'com'), w('kl', 'no', 'pump', 'x1'), Nn('pump', 'x2')],
    process: { ...DEFAULT_PROCESS, tankLevel: level, drawOffLpm: 0 },
    gridVoltage: 230,
  });
  let p = steps(make(20), 1);
  assert.ok(byId(p.devices, 'kl').state.out && lampOn(p.devices, p.wires, 'pump'), 'below the min probe: the fill pump is called');
  p = steps({ ...p, process: { ...p.process, tankLevel: 50 } }, 1);
  assert.ok(byId(p.devices, 'kl').state.out, 'between the probes it keeps its state (hysteresis)');
  p = steps({ ...p, process: { ...p.process, tankLevel: 72 } }, 1);
  assert.ok(!byId(p.devices, 'kl').state.out, 'at the max probe the pump stops');
  p = steps({ ...p, process: { ...p.process, tankLevel: 50 } }, 1);
  assert.ok(!byId(p.devices, 'kl').state.out, 'and stays off between the probes');
  const drain = steps(make(80, 'drain'), 1);
  assert.ok(byId(drain.devices, 'kl').state.out, 'drain mode: output on at the max probe');
  const dead = steps({ ...make(20), devices: [dev('electrode_level_relay', 'kl')] }, 1);
  assert.ok(!byId(dead.devices, 'kl').state.out, 'no supply: the output stays off');
  console.log('✓ fill and drain modes with hysteresis between the probes');
}

console.log('\n--- Thermostat and heater control loop ---');
{
  const devices = [grid(), dev('appliance_water_heater', 'wh', { wattage: 1500 }), dev('thermostat', 'st', { setpointC: 22, hystC: 2, ambientC: 10, tempC: 15, heaterId: 'wh', heatRate: 0.5 })];
  const wires = [L('st', 'com'), w('st', 'no', 'wh', 'line'), Nn('wh', 'neutral')];
  let d = run(devices, wires, 1);
  assert.ok(byId(d, 'st').state.out, 'cold: the heating contact calls for heat');
  d = run(d, wires, 30);
  const t1 = byId(d, 'st').state.tempC;
  assert.ok(t1 > 15, `the heater raises the sensed temperature (${t1})`);
  let cycled = false;
  let min = 99;
  let max = -99;
  for (let i = 0; i < 200; i++) {
    d = run(d, wires, 1);
    const s = byId(d, 'st').state;
    if (i > 60) { min = Math.min(min, s.tempC); max = Math.max(max, s.tempC); }
    if (!s.out && i > 5) cycled = true;
  }
  assert.ok(cycled, 'the thermostat switches the heater off once warm');
  assert.ok(min > 18 && max < 26, `temperature held around the setpoint (${min}..${max})`);
  const cool = run([dev('thermostat', 'st', { mode: 'cool', setpointC: 22, tempC: 30, ambientC: 30 })], [], 1);
  assert.ok(byId(cool, 'st').state.out, 'cooling mode: NO closes when hot');
  console.log('✓ heater and thermostat hold the setpoint within the band');
}

console.log('\n--- Temperature controller and thermocouple ---');
{
  const devices = [
    grid(), dev('temp_controller', 'tic', { setpointC: 60, hystC: 4 }), dev('thermocouple_k', 'tc', { tempC: 20, ambientC: 20, heaterId: 'wh', heatRate: 1 }),
    dev('appliance_water_heater', 'wh', { wattage: 1000 }),
  ];
  const wires = [
    L('tic', 'l'), Nn('tic', 'n'), w('tic', 'tc_pos', 'tc', 'tc_pos', { conductorRole: 'switched_live' }), w('tic', 'tc_neg', 'tc', 'tc_neg', { conductorRole: 'switched_live' }),
    L('tic', 'com'), w('tic', 'no', 'wh', 'line'), Nn('wh', 'neutral'),
  ];
  let d = run(devices, wires, 2);
  assert.equal(byId(d, 'tic').state.fault, '', 'thermocouple wired: no fault');
  assert.ok(byId(d, 'tic').state.pv >= 20, 'process value read from the probe');
  assert.ok(byId(d, 'tic').state.out, 'below setpoint: heating output on');
  d = run(d, wires, 100);
  assert.ok(byId(d, 'tc').state.tempC > 40, `the probe warms (${byId(d, 'tc').state.tempC})`);
  d = run(setState(d, 'tc', { tempC: 70 }), wires, 1);
  assert.ok(!byId(d, 'tic').state.out, 'above setpoint + band: output off');
  const broken = run(devices, wires.filter((x) => x.fromTerminalId !== 'tc_neg'), 2);
  assert.equal(byId(broken, 'tic').state.fault, 'SENSOR BREAK', 'one leg missing: sensor break');
  assert.ok(!byId(broken, 'tic').state.out, 'sensor break: output off (fail safe)');
  console.log('✓ controller reads the wired probe, switches with hysteresis and fails safe on a sensor break');
}

console.log('\n--- Reed switch ---');
{
  const make = (position) => {
    const devices = [grid(), dev('reed_switch', 'sr', { position }), lamp('l')];
    const wires = [L('sr', 'no_13'), w('sr', 'no_14', 'l', 'x1'), Nn('l', 'x2')];
    return lampOn(devices, wires, 'l');
  };
  assert.deepEqual([0, 39, 40, 50, 60, 61, 100].map(make), [false, false, true, true, true, false, false]);
  console.log('✓ closes only while the magnet is inside the operating window');
}

console.log('\n--- Photocell and PIR sensor ---');
{
  let devices = [grid(), dev('photocell_switch', 'bp', { lux: 500, thresholdLux: 50 }), lamp('l')];
  const wires = [L('bp', 'l'), Nn('bp', 'n'), w('bp', 'out', 'l', 'x1'), Nn('l', 'x2')];
  devices = run(devices, wires, 1);
  assert.ok(!lampOn(devices, wires, 'l'), 'daylight: off');
  devices = run(setState(devices, 'bp', { lux: 20 }), wires, 1);
  assert.ok(lampOn(devices, wires, 'l'), 'dusk: on');
  devices = run(setState(devices, 'bp', { lux: 60 }), wires, 1);
  assert.ok(lampOn(devices, wires, 'l'), 'just above the threshold the hysteresis keeps it on');
  devices = run(setState(devices, 'bp', { lux: 100 }), wires, 1);
  assert.ok(!lampOn(devices, wires, 'l'), 'bright enough: off again');

  let pir = [grid(), dev('pir_sensor', 'bm', { holdSec: 3 }), lamp('l')];
  const pw = [L('bm', 'l'), Nn('bm', 'n'), w('bm', 'out', 'l', 'x1'), Nn('l', 'x2')];
  pir = run(pir, pw, 1);
  assert.ok(!lampOn(pir, pw, 'l'));
  pir = run(setState(pir, 'bm', { motion: true }), pw, 1);
  pir = run(setState(pir, 'bm', { motion: false }), pw, 3);
  assert.ok(lampOn(pir, pw, 'l'), 'holds after the movement stops');
  pir = run(pir, pw, 6);
  assert.ok(!lampOn(pir, pw, 'l'), 'hold time over: off');
  pir = run(setState(pir, 'bm', { motion: true, daylightLock: true, lux: 500 }), pw, 2);
  assert.ok(!lampOn(pir, pw, 'l'), 'daylight lock blocks the detection');
  console.log('✓ dusk switch with hysteresis, PIR hold time and daylight lock');
}

console.log('\n--- Flow switch and zero-speed switch ---');
{
  const tickOnly = (devices, process) => tickSimulation(devices, [], { nodePotentials: {}, deviceEnergized: {}, wireCurrents: {} }, 60, 0.5, process);
  let d = [dev('flow_switch', 'sf', { thresholdLpm: 5 })];
  d = tickOnly(d, { ...DEFAULT_PROCESS, lineBar: 3, drawOffLpm: 10 });
  assert.ok(byId(d, 'sf').state.flowing, 'draw-off above the set flow on a pressurised line');
  d = tickOnly(d, { ...DEFAULT_PROCESS, lineBar: 3, drawOffLpm: 2 });
  assert.ok(!byId(d, 'sf').state.flowing);
  d = tickOnly(d, { ...DEFAULT_PROCESS, lineBar: 0, drawOffLpm: 20 });
  assert.ok(!byId(d, 'sf').state.flowing, 'no pressure, no flow');

  let z = [dev('motor_ac_industrial', 'm', { running: true }), dev('zero_speed_switch', 'sz', { motorId: 'm', coastSec: 4, setPct: 5 })];
  const tick = (devs) => tickSimulation(devs, [], { nodePotentials: {}, deviceEnergized: {}, wireCurrents: {} }, 60, 0.5);
  z = tick(z);
  assert.ok(!byId(z, 'sz').state.zero && byId(z, 'sz').state.speedPct === 100, 'motor running: not zero speed');
  z = setState(z, 'm', { running: false });
  z = tick(z);
  assert.ok(!byId(z, 'sz').state.zero, 'just stopped: still coasting');
  for (let i = 0; i < 8; i++) z = tick(z);
  assert.ok(byId(z, 'sz').state.zero, 'after the coast-down time: standstill');
  const edges = (zero) => {
    const devices = [grid(), dev('zero_speed_switch', 'sz', { zero }), lamp('no'), lamp('nc')];
    const wires = [L('sz', 'com'), w('sz', 'no', 'no', 'x1'), Nn('no', 'x2'), w('sz', 'nc', 'nc', 'x1'), Nn('nc', 'x2')];
    return [lampOn(devices, wires, 'no'), lampOn(devices, wires, 'nc')];
  };
  assert.deepEqual(edges(true), [true, false]);
  assert.deepEqual(edges(false), [false, true]);
  console.log('✓ flow needs pressure and draw-off; zero speed follows a coast-down after the motor stops');
}

console.log('\n--- Solenoid valve ---');
{
  const devices = [grid(), dev('solenoid_valve', 'yv')];
  const wires = [L('yv', 'a1'), Nn('yv', 'a2')];
  assert.ok(byId(run(devices, wires, 1), 'yv').state.open, 'coil powered: open');
  assert.ok(!byId(run([dev('solenoid_valve', 'yv')], [], 1), 'yv').state.open, 'no coil: closed');
  assert.ok(byId(run([dev('solenoid_valve', 'yv', { manual: true })], [], 1), 'yv').state.open, 'manual override opens it');
  console.log('✓ opens with its coil or the manual override');
}

console.log('\n--- Fire alarm loop ---');
{
  const make = () => [grid(), dev('fire_alarm_panel', 'fa'), dev('smoke_detector', 'sd1'), dev('smoke_detector', 'sd2'), dev('manual_call_point', 'mcp'), dev('buzzer_horn', 'bell', { supply: 'ac230' }), lamp('relay')];
  const wires = [
    L('fa', 'l'), Nn('fa', 'n'),
    ...['sd1', 'sd2', 'mcp'].flatMap((id) => [w('fa', 'loop_out', id, 'a'), w(id, 'b', 'fa', 'loop_in')]),
    w('fa', 'bell', 'bell', 'a1'), Nn('bell', 'a2'),
    L('fa', 'com'), w('fa', 'no', 'relay', 'x1'), Nn('relay', 'x2'),
  ];
  let d = run(make(), wires, 3);
  assert.ok(byId(d, 'fa').state.powered && !byId(d, 'fa').state.alarm, 'powered, loop quiet');
  d = run(setState(d, 'sd2', { smoke: true }), wires, 2);
  assert.ok(byId(d, 'fa').state.alarm, 'a detector closes the loop: ALARM');
  assert.ok(lampOn(d, wires, 'relay'), 'the alarm relay changes over');
  assert.ok(solve(d, wires).deviceEnergized.bell, 'the bell sounds');
  d = run(setState(d, 'sd2', { smoke: false }), wires, 2);
  assert.ok(byId(d, 'fa').state.alarm, 'the alarm is latched after the smoke clears');
  d = run(setState(d, 'fa', { silenced: true }), wires, 1);
  assert.ok(!solve(d, wires).deviceEnergized.bell && byId(d, 'fa').state.alarm, 'silenced: bell off, alarm stays');
  d = run(setState(d, 'mcp', { pulled: true }), wires, 1);
  d = run(setState(d, 'fa', { resetRequested: true }), wires, 2);
  assert.ok(byId(d, 'fa').state.alarm, 'reset refused while a call point is still operated');
  d = run(setState(setState(d, 'mcp', { pulled: false }), 'fa', { resetRequested: true }), wires, 2);
  assert.ok(!byId(d, 'fa').state.alarm, 'reset works once the loop is clear');
  console.log('✓ detectors and call point in parallel, latched alarm, bell, silence and reset');
}

console.log('\n--- Labs ---');
{
  const load = (id) => {
    const lab = LAB_LESSONS.find((l) => l.id === id);
    assert.ok(lab, `${id} registered`);
    const ids = new Set(lab.project.devices.map((d) => d.id));
    for (const x of lab.project.wires) assert.ok(ids.has(x.fromDeviceId) && ids.has(x.toDeviceId), `${id}: wire ${x.id} references real devices`);
    return clone(lab.project);
  };
  // tank level control
  {
    const p0 = load('lab-fld-electrode-level');
    let p = { ...p0, process: { ...DEFAULT_PROCESS, tankLevel: 20, drawOffLpm: 4 } };
    p = steps(p, 4);
    assert.ok(byId(p.devices, 'kl').state.out, 'the pump is called when the tank is low');
    let top = 0;
    for (let i = 0; i < 400; i++) {
      p = step(p);
      top = Math.max(top, p.process.tankLevel);
    }
    assert.ok(top >= 60 && top < 95, `the electrode relay stops the pump near the max probe (peak ${top})`);
  }
  // heater control
  {
    let p = load('lab-fld-thermal-control');
    p = steps(p, 100);
    assert.ok(byId(p.devices, 'st').state.tempC > 15, 'thermostat room warms');
    assert.ok(byId(p.devices, 'tc').state.tempC > 25, 'oven probe warms');
    assert.equal(byId(p.devices, 'tic').state.fault, '');
  }
  // fire alarm and security light
  {
    let p = load('lab-fld-fire-security');
    p = steps(p, 3);
    assert.ok(!byId(p.devices, 'fa').state.alarm);
    p = steps({ ...p, devices: setState(p.devices, 'sd1', { smoke: true }) }, 3);
    assert.ok(byId(p.devices, 'fa').state.alarm, 'fire alarm lab: smoke raises the alarm');
    p = steps({ ...p, devices: setState(p.devices, 'bp', { lux: 10 }) }, 2);
    assert.ok(!solve(p.devices, p.wires).deviceEnergized.yard, 'dark but nobody there: yard light off');
    p = steps({ ...p, devices: setState(p.devices, 'bm', { motion: true }) }, 2);
    assert.ok(solve(p.devices, p.wires).deviceEnergized.yard, 'dark and movement: yard light on');
  }
  console.log('✓ three labs run through their objectives');
}

console.log('\nFIELD DEVICE TESTS PASSED');
