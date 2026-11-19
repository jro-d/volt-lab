import assert from 'node:assert/strict';
import { dev } from './helpers.mjs';
import { ISOLATION_STEPS, DEFAULT_ISOLATION, completeStep, nextStep, simulateGate, isolatorOpen, lockFitted } from '../src/core/safeIsolation.ts';
import { exerciseProject, gradeWork, resultJson } from '../src/core/grading.ts';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const ids = ISOLATION_STEPS.map((s) => s.id);

console.log('--- Order of the steps ---');
{
  assert.deepEqual(ids, ['identify', 'isolate', 'lock_tag', 'prove_before', 'test_dead', 'prove_after', 'tests', 'remove_lock']);
  let s = DEFAULT_ISOLATION;
  assert.equal(s.mode, 'off', 'off by default');
  assert.equal(nextStep(s).id, 'identify');
  const skip = completeStep(s, 'test_dead', []);
  assert.equal(skip.ok, false);
  assert.match(skip.reason, /Identify the source/, 'the refusal names the step to do first');
  assert.deepEqual(skip.state, s, 'a refused step changes nothing');
  assert.equal(completeStep(s, 'identify', []).ok, true);
  console.log('✓ the steps run in order and a skipped step is refused by name');
}

console.log('\n--- Steps checked against the project ---');
{
  const q = dev('mcb_3p', 'q', { closed: true });
  const iso = dev('rotary_isolator_3p', 'iso', { closed: true, locked: false });
  let s = completeStep(DEFAULT_ISOLATION, 'identify', [q, iso]).state;
  // isolate: needs something really open
  let r = completeStep(s, 'isolate', [q, iso]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /open/);
  const open = [dev('mcb_3p', 'q', { closed: false }), dev('rotary_isolator_3p', 'iso', { closed: false, locked: false })];
  assert.equal(isolatorOpen(open), true);
  assert.equal(isolatorOpen([q, iso]), false);
  r = completeStep(s, 'isolate', open);
  assert.equal(r.ok, true);
  s = r.state;
  // lock and tag: needs a padlock on an open isolator
  assert.equal(completeStep(s, 'lock_tag', open).ok, false, 'no padlock yet');
  const locked = [open[0], dev('rotary_isolator_3p', 'iso', { closed: false, locked: true })];
  assert.equal(lockFitted(locked), true);
  assert.equal(lockFitted([open[0], dev('rotary_isolator_3p', 'iso', { closed: true, locked: true })]), false, 'a padlock on a closed isolator does not isolate');
  s = completeStep(s, 'lock_tag', locked).state;
  for (const id of ['prove_before', 'test_dead', 'prove_after', 'tests']) {
    const step = completeStep(s, id, locked);
    assert.equal(step.ok, true, id);
    s = step.state;
  }
  // remove the lock: refused while the padlock is still on
  assert.equal(completeStep(s, 'remove_lock', locked).ok, false);
  const done = completeStep(s, 'remove_lock', open);
  assert.equal(done.ok, true);
  assert.equal(nextStep(done.state), null, 'sequence complete');
  assert.equal(done.state.log.length, 8, 'every step is logged');
  assert.equal(completeStep(done.state, 'identify', open).ok, false, 'nothing left to do');
  console.log('✓ isolate, lock and remove-lock are verified against the isolating devices');
}

console.log('\n--- Gating Simulate ---');
{
  const base = DEFAULT_ISOLATION;
  assert.equal(simulateGate(undefined).allowed, true, 'no workflow: always allowed');
  assert.equal(simulateGate(base).allowed, true, 'off: allowed');
  const required = simulateGate({ ...base, mode: 'required' });
  assert.equal(required.allowed, false);
  assert.match(required.message, /Identify the source/, 'the block names the step');
  const part = simulateGate({ ...base, mode: 'required', done: ['identify', 'isolate'] });
  assert.match(part.message, /Lock and tag/);
  assert.equal(simulateGate({ ...base, mode: 'required', done: ids }).allowed, true, 'complete: allowed');
  // prompt: warn once, then allow
  const first = simulateGate({ ...base, mode: 'prompt' });
  assert.equal(first.allowed, false);
  assert.equal(first.markWarned, true);
  assert.match(first.message, /Press Simulate again/);
  const second = simulateGate({ ...base, mode: 'prompt', warned: true });
  assert.equal(second.allowed, true, 'the second press goes through');
  assert.equal(second.markWarned, false);
  console.log('✓ Off allows, Required blocks naming the step, Prompt warns once');
}

console.log('\n--- On the graded report ---');
{
  const l = LAB_LESSONS.find((x) => x.id === 'lab-marine-dol-440v');
  const ex = exerciseProject(clone(l.project), l.id, l.title);
  const r = gradeWork(ex, ex.target, 0);
  const withIso = JSON.parse(resultJson({ name: 'A', course: 'B', section: 'C' }, r, new Date(0), { mode: 'required', done: ['identify', 'isolate'] }));
  assert.deepEqual(withIso.safeIsolation, { mode: 'required', stepsDone: ['identify', 'isolate'] });
  const without = JSON.parse(resultJson({ name: 'A', course: 'B', section: 'C' }, r, new Date(0)));
  assert.equal('safeIsolation' in without, false, 'absent when the workflow was not used');
  console.log('✓ the hand-in JSON carries the isolation steps when they were done');
}

console.log('\nSAFE ISOLATION TESTS PASSED');
