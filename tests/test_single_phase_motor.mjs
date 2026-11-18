import assert from 'node:assert/strict';
import { run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = LAB_LESSONS.find((l) => l.id === 'lab-capacitor-start-motor');
assert.ok(lab, 'lab exists');

const go = (edit = () => {}, steps = 10) => {
  const devices = clone(lab.project.devices);
  const wires = clone(lab.project.wires);
  edit(devices, wires);
  return { d: run(devices, wires, steps, 0.5, { standard: 'PEC', volts: 230 }), wires };
};

console.log('--- Single-phase motors ---');
{
  const early = go(() => {}, 2).d;
  assert.ok(byId(early, 'm1').state.speedPct < 75, 'still starting');
  assert.equal(byId(early, 'm1').state.centrifugalOpen, false, 'switch closed while starting');
  const startAmps = byId(early, 'm1').state.measuredAmps;
  const { d } = go();
  const m = byId(d, 'm1').state;
  assert.equal(m.motorFault, null);
  assert.equal(m.motorRunning, true);
  assert.equal(m.speedPct, 100);
  assert.equal(m.centrifugalOpen, true, 'centrifugal switch opened at 75 %');
  assert.equal(m.auxActive, false, 'start winding dropped out');
  assert.equal(m.motorDirection, 'CW');
  assert.ok(startAmps > m.measuredAmps * 2, 'starting current well above running current');
  console.log('✓ runs up, centrifugal switch opens at 75 %, start current falls to running current');
}
{
  const { d } = go((devices, wires) => {
    const i = wires.findIndex((w) => w.fromDeviceId === 'c1' && w.toDeviceId === 'm1');
    wires.splice(i, 1);
  });
  const m = byId(d, 'm1').state;
  assert.equal(m.motorFault, 'no start capacitor');
  assert.equal(m.motorRunning, false);
  assert.equal(m.speedPct, 0, 'hums at standstill');
  assert.ok(m.measuredAmps > 5, 'locked-rotor current');
  console.log('✓ capacitor missing: hums, no start, high current');
}
{
  const { d } = go((devices) => { byId(devices, 'c1').state.open = true; });
  assert.equal(byId(d, 'm1').state.motorFault, 'no start capacitor');
  console.log('✓ capacitor failed open: no start');
}
{
  const good = byId(go().d, 'm1').state.measuredAmps;
  const { d } = go((devices) => { byId(devices, 'c1').state.uF = 12; });
  const m = byId(d, 'm1').state;
  assert.match(m.motorNote, /wrong capacitor value/);
  assert.equal(m.motorFault, null, 'it still starts');
  assert.ok(m.measuredAmps > good, 'high current');
  console.log('✓ wrong capacitor value: still starts, flagged, high current');
}
{
  const { d } = go((devices, wires) => {
    for (const w of wires) {
      if (w.toDeviceId === 'm1' && w.toTerminalId === 'z1') w.toTerminalId = 'z2';
      else if (w.toDeviceId === 'm1' && w.toTerminalId === 'z2') w.toTerminalId = 'z1';
    }
  });
  const m = byId(d, 'm1').state;
  assert.equal(m.motorDirection, 'CCW', 'swapping the start winding leads reverses rotation');
  assert.equal(m.motorRunning, true);
  console.log('✓ swapping Z1 / Z2 reverses rotation');
}
{
  // split-phase: no capacitor needed, start winding straight across the supply
  const { d } = go((devices, wires) => {
    byId(devices, 'm1').state.motorKind = 'split_phase';
    const i = wires.findIndex((w) => w.fromDeviceId === 'c1' && w.toDeviceId === 'm1');
    wires[i] = { ...wires[i], fromDeviceId: 'q1', fromTerminalId: 'out_l' };
  });
  assert.equal(byId(d, 'm1').state.motorRunning, true);
  assert.equal(byId(d, 'm1').state.centrifugalOpen, true);
  // PSC keeps the start winding (and its capacitor) on
  const psc = go((devices) => { byId(devices, 'm1').state.motorKind = 'psc'; byId(devices, 'c1').state.uF = 12; }).d;
  assert.equal(byId(psc, 'm1').state.auxActive, true, 'PSC start winding stays in circuit');
  assert.equal(byId(psc, 'm1').state.motorNote, '');
  console.log('✓ split-phase and PSC variants');
}
{
  const devices = clone(lab.project.devices);
  const wires = clone(lab.project.wires);
  const r = analyzeCodeCompliance(devices, wires, solveCircuit(devices, wires, 'PEC', 230), 'PEC', 230);
  console.log('  compliance:', r.violations.map((v) => `${v.severity}:${v.title}`).join(' | ') || 'clean');
}
console.log('\nSINGLE-PHASE MOTOR TESTS PASSED');
