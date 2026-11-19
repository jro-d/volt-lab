import assert from 'node:assert/strict';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { deriveTarget, exerciseProject, gradeWork, resultJson, GRADED_LAB_IDS } from '../src/core/grading.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = (id) => LAB_LESSONS.find((l) => l.id === id);

console.log('--- Exercise from a lab ---');
{
  for (const id of GRADED_LAB_IDS) assert.ok(lab(id), `${id} is a registered lab`);
  assert.equal(GRADED_LAB_IDS.length, 7, 'six motor labs and the staircase lab');
  const l = lab('lab-marine-dol-440v');
  const ex = exerciseProject(l.project, l.id, l.title);
  assert.equal(ex.wires.length, 0, 'the exercise has no wiring');
  assert.equal(ex.devices.length, l.project.devices.length, 'but all the devices');
  assert.ok(ex.target && ex.target.labId === l.id);
  assert.ok(ex.target.connections.length > 20, 'the DOL starter needs many connections');
  assert.equal(ex.target.needsLadder, true, 'the DOL lab has a target ladder');
  assert.equal(ex.target.showSolution, false, 'the solution is hidden by default');
  assert.equal(l.project.wires.length > 0, true, 'the reference lab is untouched');
  console.log(`✓ the DOL exercise: ${ex.devices.length} devices, ${ex.target.connections.length} required connections, no wiring`);
}

console.log('\n--- Partial credit ---');
{
  const l = lab('lab-marine-dol-440v');
  const ref = clone(l.project);
  const ex = exerciseProject(ref, l.id, l.title);
  const target = ex.target;
  const errors = (project) => {
    const solved = solveCircuit(clone(project.devices), project.wires, project.codeStandard, project.gridVoltage);
    return analyzeCodeCompliance(project.devices, project.wires, solved, project.codeStandard, project.gridVoltage).violations.filter((v) => v.severity === 'error').length;
  };

  // nothing wired: devices score, connections do not, the inspector earns nothing for an empty project
  const empty = gradeWork(ex, target, errors(ex));
  const byId = (r, id) => r.items.find((i) => i.id === id);
  assert.equal(byId(empty, 'devices').status, 'pass');
  assert.equal(byId(empty, 'connections').status, 'fail');
  assert.equal(byId(empty, 'inspector').points, 0, 'an empty project has no errors but earns no credit');
  assert.equal(empty.score, byId(empty, 'devices').max, 'only the devices score');

  // half of the wiring
  const half = { ...ex, wires: ref.wires.slice(0, Math.floor(ref.wires.length / 2)) };
  const r = gradeWork(half, target, errors(half));
  assert.equal(byId(r, 'connections').status, 'partial');
  assert.ok(byId(r, 'connections').points > 0 && byId(r, 'connections').points < 50, `partial connections credit (${byId(r, 'connections').points})`);
  assert.ok(r.score > empty.score);

  // the full reference wiring passes everything it can pass
  const full = { ...ex, wires: ref.wires, ladder: [] };
  const rf = gradeWork(full, target, errors(full));
  assert.equal(byId(rf, 'devices').status, 'pass');
  assert.equal(byId(rf, 'connections').status, 'pass');
  assert.equal(byId(rf, 'connections').points, 50);
  assert.equal(byId(rf, 'ladder').status, 'fail', 'the ladder still has to be built');
  console.log(`✓ empty ${empty.percent} %, half the wiring ${r.percent} %, full wiring without the ladder ${rf.percent} %`);
}

console.log('\n--- Order independent, same-net connections ---');
{
  const l = lab('lab-marine-dol-440v');
  const ref = clone(l.project);
  const ex = exerciseProject(ref, l.id, l.title);
  // reverse the end order of every wire: the same connections
  const flipped = ref.wires.map((w) => ({ ...w, fromDeviceId: w.toDeviceId, fromTerminalId: w.toTerminalId, toDeviceId: w.fromDeviceId, toTerminalId: w.fromTerminalId }));
  const r = gradeWork({ ...ex, wires: flipped }, ex.target, 0);
  assert.equal(r.items.find((i) => i.id === 'connections').points, 50, 'the direction of a wire does not matter');
  // a connection made through an extra terminal in the same net still counts
  const t2 = deriveTarget({ ...ref, wires: [] , devices: ref.devices, targetLadder: [] }, 'x', 'x');
  assert.equal(t2.connections.length, 0);
  const small = { devices: ref.devices.slice(0, 3), wires: [], targetLadder: [] };
  const [a, b, c] = ref.devices.slice(0, 3).map((d) => `${d.id}:${d.terminals[0].id}`);
  const tgt = { v: 1, labId: 'x', title: 'x', devices: [], connections: [[a, c]], needsLadder: false, noErrors: false, showSolution: false };
  const viaB = [
    { id: 'w1', fromDeviceId: a.split(':')[0], fromTerminalId: a.split(':')[1], toDeviceId: b.split(':')[0], toTerminalId: b.split(':')[1] },
    { id: 'w2', fromDeviceId: b.split(':')[0], fromTerminalId: b.split(':')[1], toDeviceId: c.split(':')[0], toTerminalId: c.split(':')[1] },
  ];
  assert.equal(gradeWork({ ...small, wires: viaB }, tgt, 0).items.find((i) => i.id === 'connections').status, 'pass', 'joined through a third terminal: the same net');
  console.log('✓ wire direction and routing do not matter');
}

console.log('\n--- No spoilers unless allowed ---');
{
  const l = lab('lab-forward-reverse-interlock');
  const hidden = exerciseProject(l.project, l.id, l.title, false);
  const shown = exerciseProject(l.project, l.id, l.title, true);
  const rh = gradeWork(hidden, hidden.target, 0);
  const rs = gradeWork(shown, shown.target, 0);
  const dh = rh.items.find((i) => i.id === 'connections').detail;
  const ds = rs.items.find((i) => i.id === 'connections').detail;
  assert.ok(!dh.includes('Missing'), 'the default report only counts');
  assert.ok(ds.includes('Missing:') && ds.includes(':'), 'with showSolution it names the missing pairs');
  assert.ok(!JSON.stringify(rh).includes(l.project.wires[0].fromDeviceId + ':' + l.project.wires[0].fromTerminalId), 'no device:terminal pair leaks into the hidden report');
  console.log('✓ the checklist counts items and names nothing unless showSolution is on');
}

console.log('\n--- Result JSON ---');
{
  const l = lab('lab-ctl-staircase-impulse');
  const ex = exerciseProject(l.project, l.id, l.title);
  const r = gradeWork(ex, ex.target, 0);
  const json = JSON.parse(resultJson({ name: 'Test Student', course: 'EE 101', section: 'A' }, r, new Date('2026-11-19T10:00:00Z')));
  assert.equal(json.student.name, 'Test Student');
  assert.equal(json.labId, l.id);
  assert.equal(json.timestamp, '2026-11-19T10:00:00.000Z');
  assert.ok(Array.isArray(json.checklist) && json.checklist.length >= 2);
  assert.ok(!('solution' in json) && !('target' in json), 'no solution in the hand-in file');
  assert.equal(ex.target.needsLadder, false, 'the staircase lab has no target ladder');
  console.log('✓ a hand-in JSON with the header, the score and the timestamp');
}

console.log('\nGRADING TESTS PASSED');
