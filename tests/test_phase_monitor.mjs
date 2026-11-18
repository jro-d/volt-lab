import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));

console.log('--- Phase monitor relay ---');
{
  /** Relay supplied across L1-L2 with the sense inputs on the given source lines (null = not wired). */
  const build = (sense, lineVoltage = 440, supplied = true) => {
    const src = dev('source_3phase_440v', 'src', { lineVoltage });
    const kp = dev('phase_monitor_relay', 'kp');
    const wires = [];
    ['l1', 'l2', 'l3'].forEach((t, i) => {
      if (sense[i]) wires.push(wire(`s${i}`, 'src', sense[i], 'kp', t));
    });
    if (supplied) {
      wires.push(wire('a1', 'src', 'l1', 'kp', 'a1'));
      wires.push(wire('a2', 'src', 'l2', 'kp', 'a2'));
    }
    const devices = [src, kp];
    solve(devices, wires, 'PEC', lineVoltage);
    return kp.state;
  };

  let s = build(['l1', 'l2', 'l3']);
  assert.equal(s.phaseOk, true, 'complete supply in sequence');
  assert.equal(s.phaseFault, '');
  assert.deepEqual(s.phasePresent, { l1: true, l2: true, l3: true });
  console.log('✓ all three phases, correct sequence, nominal voltage -> output energized');

  s = build(['l2', 'l3', 'l1']);
  assert.equal(s.phaseOk, true, 'a cyclic rotation is still L1-L2-L3 sequence');

  s = build(['l1', 'l2', null]);
  assert.equal(s.phaseOk, false);
  assert.equal(s.phaseFault, 'LOST PHASE');
  console.log('✓ lost phase detected');

  s = build(['l1', 'l3', 'l2']);
  assert.equal(s.phaseOk, false);
  assert.equal(s.phaseFault, 'WRONG SEQUENCE');
  console.log('✓ swapped phases detected');

  assert.equal(build(['l1', 'l2', 'l3'], 380).phaseFault, 'UNDERVOLTAGE');
  assert.equal(build(['l1', 'l2', 'l3'], 400).phaseOk, true, '-9 % is inside the band');
  assert.equal(build(['l1', 'l2', 'l3'], 485).phaseFault, 'OVERVOLTAGE');
  console.log('✓ under / over voltage outside +/-10 % detected, -9 % accepted');

  assert.equal(build(['l1', 'l2', 'l3'], 440, false).phaseFault, 'NO SUPPLY');
  console.log('✓ no supply on A1 / A2 -> output released');
}

console.log('\n--- DOL starter with a phase monitor (lab) ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-phase-monitor-dol');
  assert.ok(lab, 'lab exists');
  assert.ok(lab.project.targetLadder?.length, 'reference ladder provided');
  const start = (project) => {
    const p = clone(project);
    byId(p.devices, 'mdol_s1').state.startPressed = true;
    return p;
  };

  const good = start(lab.project);
  const goodRun = run(good.devices, good.wires, 4, 0.5, { volts: 440 });
  assert.equal(byId(goodRun, 'mdol_kp1').state.phaseOk, true);
  assert.equal(!!byId(goodRun, 'mdol_m1').state.running, true, 'motor runs on a good supply');
  console.log('✓ good supply: relay OK, motor runs');

  // Swap two phases at the Q1 incoming terminals (feeder L2 <-> L3)
  const swapped = start(lab.project);
  for (const w of swapped.wires) {
    if (w.fromDeviceId === 'mdol_src' && w.toDeviceId === 'mdol_q1' && w.toTerminalId === 'in_l2') w.toTerminalId = 'in_l3';
    else if (w.fromDeviceId === 'mdol_src' && w.toDeviceId === 'mdol_q1' && w.toTerminalId === 'in_l3') w.toTerminalId = 'in_l2';
  }
  const swapRun = run(swapped.devices, swapped.wires, 4, 0.5, { volts: 440 });
  assert.equal(byId(swapRun, 'mdol_kp1').state.phaseFault, 'WRONG SEQUENCE');
  assert.equal(!!byId(swapRun, 'mdol_km1').state.coilEnergized, false, 'the contactor cannot pull in');
  assert.equal(!!byId(swapRun, 'mdol_m1').state.running, false, 'the starter refuses to run');
  console.log('✓ swapped phases: WRONG SEQUENCE, starter refuses to run');

  // The same swap WITHOUT a monitor (the marine DOL lab) still runs, just in reverse
  const plain = clone(LAB_LESSONS.find((l) => l.id === 'lab-marine-dol-440v').project);
  for (const w of plain.wires) {
    if (w.fromDeviceId === 'mdol_src' && w.toDeviceId === 'mdol_q1' && w.toTerminalId === 'in_l2') w.toTerminalId = 'in_l3';
    else if (w.fromDeviceId === 'mdol_src' && w.toDeviceId === 'mdol_q1' && w.toTerminalId === 'in_l3') w.toTerminalId = 'in_l2';
  }
  byId(plain.devices, 'mdol_s1').state.startPressed = true;
  const plainRun = run(plain.devices, plain.wires, 4, 0.5, { volts: 440 });
  assert.equal(!!byId(plainRun, 'mdol_m1').state.running, true, 'without a monitor the starter runs');
  assert.equal(byId(plainRun, 'mdol_m1').state.motorDirection, 'CCW', 'but the motor turns the wrong way');
  console.log('✓ without a monitor the swapped supply reverses the motor (CCW)');

  // Compliance note (info level) for a motor without phase protection
  const noteOf = (project) => {
    const p = clone(project);
    const sol = solveCircuit(p.devices, p.wires, 'PEC', 440);
    return analyzeCodeCompliance(p.devices, p.wires, sol, 'PEC', 440).violations.filter((v) => v.id.startsWith('viol_motor_no_phase_protection'));
  };
  const without = noteOf(LAB_LESSONS.find((l) => l.id === 'lab-marine-dol-440v').project);
  assert.equal(without.length, 1);
  assert.equal(without[0].severity, 'info', 'information only, never an error');
  assert.equal(noteOf(lab.project).length, 0, 'no note when a phase monitor is present');
  console.log('✓ info-level note for a motor without phase protection, none with the monitor');
}
console.log('PHASE MONITOR TESTS PASSED');
