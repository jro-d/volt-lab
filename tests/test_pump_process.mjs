import assert from 'node:assert/strict';
import { dev, wire, solve, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { applyProtectiveOutcome, tickSimulation } from '../src/core/simulationTick.ts';
import { tickProcess, DEFAULT_PROCESS } from '../src/core/process.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));

/** One app step: solve, persist protection, tick devices and the process. */
function step(project, dt = 0.5) {
  const solved = solveCircuit(project.devices, project.wires, 'PEC', project.gridVoltage || 230);
  let devices = applyProtectiveOutcome(project.devices, solved);
  devices = tickSimulation(devices, project.wires, solved, 60, dt, project.process);
  const process = tickProcess(devices, project.process, dt);
  return { ...project, devices, process };
}
const runSteps = (project, n, dt = 0.5) => {
  let p = project;
  for (let i = 0; i < n; i++) p = step(p, dt);
  return p;
};
const tickOnly = (devices, process) => tickSimulation(devices, [], { nodePotentials: {}, deviceEnergized: {}, wireCurrents: {} }, 60, 0.5, process);

console.log('--- Float switch hysteresis ---');
{
  const probe = (form, levels) => {
    let d = [dev('float_switch', 'fl', { contactForm: form, highTrip: 70, lowTrip: 30 })];
    return levels.map((lv) => {
      d = tickOnly(d, { ...DEFAULT_PROCESS, tankLevel: lv });
      return !!byId(d, 'fl').state.contactClosed;
    });
  };
  // NO on rise: closes at 70, holds between, reopens at 30
  assert.deepEqual(probe('NO_on_rise', [50, 69, 70, 50, 31, 30, 50]), [false, false, true, true, true, false, false]);
  // NC on rise (mounted the other way round): com-no closes at 30, opens at 70
  assert.deepEqual(probe('NC_on_rise', [50, 31, 30, 50, 69, 70, 50]), [false, false, true, true, true, false, false]);
  console.log('✓ both contact forms change at the trip levels and hold in between');
}

console.log('\n--- Pressure switch ---');
{
  let d = [dev('pressure_switch', 'ps', { cutIn: 2, cutOut: 3 })];
  const seq = [2.5, 2.1, 2.0, 2.5, 2.9, 3.0, 2.5].map((bar) => {
    d = tickOnly(d, { ...DEFAULT_PROCESS, lineBar: bar });
    return !!byId(d, 'ps').state.contactClosed;
  });
  assert.deepEqual(seq, [false, false, true, true, true, false, false]);
  console.log('✓ closes at cut-in, opens at cut-out, holds in the band');
}

console.log('\n--- Process model ---');
{
  const pump = dev('pump_booster_1p', 'p', { kw: 0.75, pumping: true });
  let proc = { tankLevel: 20, lineBar: 0, drawOffLpm: 10 };
  proc = tickProcess([pump], proc, 1);
  assert.ok(proc.tankLevel > 20, 'a running pump raises the tank level');
  assert.ok(proc.lineBar > 0, 'and the line pressure');
  const idle = dev('pump_booster_1p', 'p', { pumping: false });
  const down = tickProcess([idle], { tankLevel: 50, lineBar: 3, drawOffLpm: 20 }, 1);
  assert.ok(down.tankLevel < 50 && down.lineBar < 3, 'draw-off drains the tank and the pressure falls');
  const floor = tickProcess([idle], { tankLevel: 0.1, lineBar: 0.01, drawOffLpm: 60 }, 5);
  assert.equal(floor.tankLevel, 0);
  assert.equal(floor.lineBar, 0);
  assert.equal(tickProcess([], undefined, 1), undefined, 'no process devices, no process');
  console.log('✓ pump fills, draw-off drains, limits hold');
}

console.log('\n--- Automatic pump control lab (closed loop) ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-pump-hoa-float');
  assert.ok(lab, 'lab exists');
  assert.ok(lab.project.targetLadder && lab.project.targetLadder.length === 3, 'reference ladder provided');
  let p = clone(lab.project);

  p = runSteps(p, 4);
  assert.equal(!!byId(p.devices, 'pump').state.running, true, 'low tank (20 %): the float starts the pump');
  assert.equal(!!byId(p.devices, 'pl_run').state.lit, true, 'run lamp lit');

  // Record the pump state over the cycle: it must stop near 70 % and restart near 30 %
  let stopsAt = null;
  let restartsAt = null;
  let wasRunning = true;
  for (let i = 0; i < 400 && restartsAt === null; i++) {
    p = step(p);
    const running = !!byId(p.devices, 'pump').state.running;
    if (wasRunning && !running && stopsAt === null) stopsAt = p.process.tankLevel;
    if (!wasRunning && running && stopsAt !== null) restartsAt = p.process.tankLevel;
    wasRunning = running;
  }
  assert.ok(stopsAt >= 70 && stopsAt < 76, `pump stops at the high trip (level ${stopsAt})`);
  assert.ok(restartsAt <= 33 && restartsAt > 24, `pump restarts at the low trip (level ${restartsAt}, one step after the float closed at 30)`);
  console.log(`✓ pump stops at ${stopsAt}% and restarts at ${restartsAt}% (hysteresis loop runs by itself)`);

  // HAND runs the pump regardless of level; OFF stops it
  const hand = clone(p);
  byId(hand.devices, 'sa1').state.mode = 'hand';
  hand.process = { ...hand.process, tankLevel: 90 };
  const handRun = runSteps(hand, 4);
  assert.equal(!!byId(handRun.devices, 'pump').state.running, true, 'HAND runs the pump with a full tank');
  const off = clone(handRun);
  byId(off.devices, 'sa1').state.mode = 'off';
  assert.equal(!!byId(runSteps(off, 4).devices, 'pump').state.running, false, 'OFF stops the pump');
  console.log('✓ HAND overrides the float, OFF stops the pump');

  // Overload: a 3.7 kW pump trips the 4 A overload relay and lights the fault lamp
  const heavy = clone(lab.project);
  Object.assign(byId(heavy.devices, 'pump').state, { kw: 3.7, wattage: 3700 });
  const tripped = runSteps(heavy, 6);
  assert.equal(!!byId(tripped.devices, 'f2').state.tripped, true, 'overload relay trips');
  assert.equal(!!byId(tripped.devices, 'pump').state.running, false, 'pump stops');
  assert.equal(!!byId(tripped.devices, 'pl_flt').state.lit, true, 'fault lamp lit');
  console.log('✓ overload: relay trips, pump stops, fault lamp lit');
}

console.log('\n--- 1-phase pump ---');
{
  const src = dev('kwh_meter_1p', 'src');
  const pump = dev('pump_booster_1p', 'p');
  const wires = [
    wire('l', 'src', 'l_out', 'p', 'line'),
    wire('n', 'src', 'n_out', 'p', 'neutral', { color: '#0f172a', conductorRole: 'return_neutral' }),
  ];
  const sol = solve([src, pump], wires);
  assert.equal(!!pump.state.pumping, true);
  assert.equal(sol.totalWatts, 750);
  console.log('✓ 1-phase pump powers up and draws its rated kW');
}
console.log('PUMP PROCESS TESTS PASSED');
