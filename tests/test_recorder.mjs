import assert from 'node:assert/strict';
import { dev, wire, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { applyProtectiveOutcome, tickSimulation } from '../src/core/simulationTick.ts';
import { Recorder, RECORDER_CAPACITY, signalsForDevice, firstRise, toCsv } from '../src/core/recorder.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const N = { color: '#0f172a', conductorRole: 'return_neutral' };

/** One app step with recording: solve, persist protection, tick, then sample (as App.tsx does). */
function step(project, rec, dt = 0.5) {
  const solved = solveCircuit(project.devices, project.wires, 'PEC', project.gridVoltage || 230);
  let devices = applyProtectiveOutcome(project.devices, solved);
  devices = tickSimulation(devices, project.wires, solved, 60, dt, project.process);
  rec.sample(project.recorder?.channels ?? [], devices, solved, dt);
  return { ...project, devices };
}

console.log('--- Ring buffer ---');
{
  const rec = new Recorder(5);
  const channels = [{ id: 'a', label: 'A', kind: 'analog', source: { kind: 'state', deviceId: 'd', key: 'v' } }];
  const d = dev('light_bulb', 'd', { v: 0 });
  const solved = { deviceEnergized: {}, nodeVoltages: {}, wireCurrents: {} };
  for (let i = 0; i < 8; i++) {
    d.state.v = i;
    rec.sample(channels, [d], solved, 1);
  }
  const snap = rec.snapshot();
  assert.equal(snap.times.length, 5, 'capacity holds');
  assert.deepEqual(snap.values[0], [3, 4, 5, 6, 7], 'oldest samples are overwritten, order kept');
  assert.deepEqual(snap.times, [3, 4, 5, 6, 7]);
  assert.equal(new Recorder().capacity, 20000);
  assert.equal(RECORDER_CAPACITY, 20000);
  rec.paused = true;
  rec.sample(channels, [d], solved, 1);
  assert.equal(rec.snapshot().times.length, 5);
  assert.deepEqual(rec.snapshot().times, [3, 4, 5, 6, 7], 'paused recorder takes no samples');
  rec.clear();
  assert.equal(rec.count, 0);
  console.log('✓ 20,000-sample ring buffer (small one tested): wraps, keeps order, pauses, clears');
}

console.log('\n--- Signals and CSV ---');
{
  const timer = dev('timer_relay', 'kt', { tag: 'KT1' });
  const sigs = signalsForDevice(timer);
  assert.ok(sigs.some((s) => s.kind === 'digital' && s.source.kind === 'state' && s.source.key === 'timedOut'), 'boolean state is a digital channel');
  assert.ok(sigs.some((s) => s.kind === 'analog' && s.source.kind === 'state' && s.source.key === 'elapsedSec'), 'numeric state is an analog channel');
  assert.ok(sigs.some((s) => s.source.kind === 'voltage' && s.source.terminalId === 'a1'), 'terminal voltages are offered');
  assert.ok(sigs.some((s) => s.source.kind === 'energized'));
  assert.ok(!sigs.some((s) => s.source.kind === 'state' && ['x', 'y', 'width'].includes(s.source.key)), 'geometry is not offered');

  const rec = new Recorder(10);
  const ch = [
    { id: 'a', label: 'Coil, "A"', kind: 'digital', source: { kind: 'state', deviceId: 'kt', key: 'timedOut' } },
    { id: 'b', label: 'Elapsed', kind: 'analog', unit: 's', source: { kind: 'state', deviceId: 'kt', key: 'elapsedSec' } },
  ];
  timer.state.timedOut = true;
  timer.state.elapsedSec = 2.5;
  rec.sample(ch, [timer], { deviceEnergized: {}, nodeVoltages: {}, wireCurrents: {} }, 0.5);
  const csv = toCsv(rec.snapshot(), ch).split('\n');
  assert.equal(csv[0], 'time_s,"Coil, ""A""",Elapsed (s)');
  assert.equal(csv[1], '0.00,1,2.5');
  console.log('✓ signals offered per device; CSV header is escaped and digital channels are 0 / 1');
}

console.log('\n--- Timer: the recorded transition is within one tick of 5 s ---');
{
  const src = dev('kwh_meter_1p', 'src');
  const timer = dev('timer_relay', 'kt', { delaySec: 5, timerMode: 'on_delay' });
  const wires = [wire('a', 'src', 'l_out', 'kt', 'a1'), wire('b', 'src', 'n_out', 'kt', 'a2', N)];
  let project = {
    devices: clone([src, timer]),
    wires,
    gridVoltage: 230,
    recorder: {
      v: 1,
      channels: [
        { id: 'c1', label: 'KT1 coil', kind: 'digital', source: { kind: 'energized', deviceId: 'kt' } },
        { id: 'c2', label: 'KT1 contact', kind: 'digital', source: { kind: 'state', deviceId: 'kt', key: 'timedOut' } },
      ],
    },
  };
  const rec = new Recorder();
  for (let i = 0; i < 30; i++) project = step(project, rec);
  const snap = rec.snapshot();
  const coilOn = firstRise(snap, 0);
  const contact = firstRise(snap, 1);
  assert.ok(coilOn !== null && coilOn <= 0.5, `coil energizes at the start (${coilOn} s)`);
  assert.ok(contact !== null, 'contact transferred');
  const delay = contact - coilOn;
  assert.ok(Math.abs(delay - 5) <= 0.5, `contact transfers ${delay} s after the coil (5 s delay, tick 0.5 s)`);
  console.log(`✓ coil at ${coilOn} s, contact at ${contact} s: ${delay} s apart (delaySec = 5)`);
}

console.log('\n--- Y-delta lab preset ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-wye-delta-starter');
  assert.ok(lab.project.recorder && lab.project.recorder.v === 1, 'versioned recorder field');
  assert.deepEqual(lab.project.recorder.channels.map((c) => c.label), ['KM1 coil', 'KMY coil (star)', 'KMD coil (delta)', 'KT1 contact transferred', 'M1 running']);
  let project = clone(lab.project);
  byId(project.devices, 'wyd_s1').state.startPressed = true;
  const rec = new Recorder();
  for (let i = 0; i < 26; i++) {
    project = step(project, rec);
    if (i === 1) byId(project.devices, 'wyd_s1').state.startPressed = false; // released after a moment
  }
  const snap = rec.snapshot();
  const idx = Object.fromEntries(lab.project.recorder.channels.map((c, i) => [c.label, i]));
  const kmyOn = firstRise(snap, idx['KMY coil (star)']);
  const kmdOn = firstRise(snap, idx['KMD coil (delta)']);
  const kt = firstRise(snap, idx['KT1 contact transferred']);
  assert.ok(kmyOn !== null && kmdOn !== null && kt !== null, 'star, delta and the timer contact all appear');
  assert.ok(kmdOn - kmyOn >= 4.5 && kmdOn - kmyOn <= 6, `delta follows star after about 5 s (${kmdOn - kmyOn} s)`);
  assert.ok(Math.abs(kt - kmdOn) <= 1, 'the KT1 contact transfer drives the delta contactor');
  const kmyEnd = snap.values[idx['KMY coil (star)']].lastIndexOf(1);
  assert.ok(snap.times[kmyEnd] < kmdOn + 0.5, 'star drops out as delta pulls in');
  assert.equal(snap.values[idx['KM1 coil']].at(-1), 1, 'the main contactor stays in');
  console.log(`✓ Y-delta: star at ${kmyOn} s, delta at ${kmdOn} s (${(kmdOn - kmyOn).toFixed(1)} s later), KT1 contact at ${kt} s`);
}
console.log('RECORDER TESTS PASSED');
