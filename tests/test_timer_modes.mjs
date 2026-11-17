import assert from 'node:assert/strict';
import { dev, wire, run, byId } from './helpers.mjs';
import { tickSimulation } from '../src/core/simulationTick.ts';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';

console.log('--- Timer relay modes ---');

const DELAY = 2;
const timerAt = (mode) => dev('timer_relay', 'kt', { timerMode: mode, delaySec: DELAY });

/** Advance one timer by `seconds` in 0.1 s ticks with the coil on or off; returns the timer. */
function advance(timer, coil, seconds) {
  const solved = { deviceEnergized: { kt: coil } };
  let devices = [timer];
  const steps = Math.round(seconds / 0.1);
  for (let i = 0; i < steps; i++) devices = tickSimulation(devices, [], solved, 60, 0.1);
  return devices[0];
}
const tick0 = (timer, coil) => tickSimulation([timer], [], { deviceEnergized: { kt: coil } }, 60, 0)[0];
const transferred = (t) => !!t.state.timedOut;

// on-delay: coil on -> transfer after the delay; coil off -> release at once
{
  let t = tick0(timerAt('on_delay'), true);
  assert.equal(transferred(t), false, 'on_delay t=0');
  assert.equal(transferred(advance(t, true, DELAY - 0.1)), false, 'on_delay delay-0.1');
  const late = advance(t, true, DELAY + 0.1);
  assert.equal(transferred(late), true, 'on_delay delay+0.1');
  assert.equal(transferred(advance(late, false, 0.1)), false, 'on_delay releases at once');
  console.log('✓ on_delay: rest at 0 and delay-0.1, transferred at delay+0.1, releases immediately');
}

// off-delay: coil on -> transfer at once; coil off -> release after the delay
{
  const on = tick0(timerAt('off_delay'), true);
  assert.equal(transferred(on), true, 'off_delay t=0 (coil on)');
  assert.equal(transferred(advance(on, true, 5)), true, 'stays transferred while the coil is on');
  assert.equal(transferred(advance(on, false, DELAY - 0.1)), true, 'off_delay delay-0.1 after the coil drops');
  assert.equal(transferred(advance(on, false, DELAY + 0.1)), false, 'off_delay delay+0.1 after the coil drops');
  // Coil returning during the run-on restarts the full delay
  const mid = advance(on, false, DELAY - 0.5);
  const back = advance(advance(mid, true, 0.1), false, DELAY - 0.1);
  assert.equal(transferred(back), true, 're-energizing restarts the delay');
  console.log('✓ off_delay: transfers at 0, holds for delay-0.1, releases at delay+0.1, re-energizing restarts it');
}

// flasher: contacts toggle every delay while the coil is on; coil off resets
{
  const t = tick0(timerAt('flasher'), true);
  assert.equal(transferred(t), false, 'flasher t=0');
  assert.equal(transferred(advance(t, true, DELAY - 0.1)), false, 'flasher delay-0.1');
  assert.equal(transferred(advance(t, true, DELAY + 0.1)), true, 'flasher delay+0.1');
  assert.equal(transferred(advance(t, true, 2 * DELAY + 0.1)), false, 'flasher toggles back after a second period');
  assert.equal(transferred(advance(advance(t, true, DELAY + 0.1), false, 0.1)), false, 'coil off resets');
  console.log('✓ flasher: rest, rest, transferred, toggles back; coil off resets');
}

// one-shot: coil on -> transfer for one delay, then release even with the coil on; re-arms when the coil drops
{
  const t = tick0(timerAt('one_shot'), true);
  assert.equal(transferred(t), true, 'one_shot t=0');
  assert.equal(transferred(advance(t, true, DELAY - 0.1)), true, 'one_shot delay-0.1');
  const done = advance(t, true, DELAY + 0.1);
  assert.equal(transferred(done), false, 'one_shot delay+0.1');
  assert.equal(transferred(advance(done, true, 5)), false, 'does not repeat while the coil stays on');
  const rearmed = advance(advance(done, false, 0.2), true, 0.1);
  assert.equal(transferred(rearmed), true, 'a new pulse after the coil drops and returns');
  console.log('✓ one_shot: pulses for one delay, no repeat while on, re-arms after the coil drops');
}

// Default mode and the previous on-delay algorithm give identical results (labs unchanged)
{
  const ref = { elapsed: 0, timedOut: false, energized: false };
  const refStep = (coil, delay) => {
    if (!coil) { ref.elapsed = 0; ref.timedOut = false; ref.energized = false; return; }
    ref.elapsed = Math.min(delay, Number((ref.elapsed + 0.5).toFixed(1)));
    ref.timedOut = ref.elapsed >= delay;
    ref.energized = true;
  };
  let devices = [dev('timer_relay', 'kt', { delaySec: 3 })]; // no timerMode: default
  const pattern = [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1];
  for (const c of pattern) {
    refStep(!!c, 3);
    devices = tickSimulation(devices, [], { deviceEnergized: { kt: !!c } }, 60, 0.5);
    const s = devices[0].state;
    assert.equal(s.timedOut, ref.timedOut);
    assert.equal(s.elapsedSec, ref.elapsed);
    assert.equal(s.energized, ref.energized);
  }
  console.log('✓ default (on-delay) matches the previous timer algorithm step for step');
}

console.log('\n--- Timer labs ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-timer-offdelay-fan');
  assert.ok(lab, 'off-delay fan lab exists');
  const clone = () => JSON.parse(JSON.stringify(lab.project));
  const p = clone();
  byId(p.devices, 'sw').state.closed = true;
  // 4 s (8 ticks) with the switch closed: fan running
  let devices = run(p.devices, p.wires, 8, 0.5);
  assert.equal(!!byId(devices, 'fan').state.powered, true, 'fan runs while the switch is closed');
  // switch off: fan keeps running through the 5 s run-on
  byId(devices, 'sw').state.closed = false;
  devices = run(devices, p.wires, 6, 0.5); // 3 s after switch-off
  assert.equal(!!byId(devices, 'fan').state.powered, true, 'fan still runs 3 s after switch-off (delay 5 s)');
  devices = run(devices, p.wires, 6, 0.5); // 6 s after switch-off
  assert.equal(!!byId(devices, 'fan').state.powered, false, 'fan stops after the run-on delay');
  console.log('✓ off-delay fan lab: runs, keeps running through the delay, then stops');

  const f = LAB_LESSONS.find((l) => l.id === 'lab-timer-flasher-alarm');
  assert.ok(f, 'flasher lab exists');
  const fp = JSON.parse(JSON.stringify(f.project));
  byId(fp.devices, 'sw').state.closed = true;
  const samples = [];
  let fd = fp.devices;
  for (let i = 0; i < 16; i++) {
    fd = run(fd, fp.wires, 1, 0.5);
    samples.push(!!byId(fd, 'pl').state.lit);
  }
  assert.ok(samples.includes(true) && samples.includes(false), `lamp blinks: ${samples.map(Number).join('')}`);
  console.log(`✓ flasher lab: lamp blinks (${samples.map(Number).join('')})`);
}
console.log('TIMER MODE TESTS PASSED');
