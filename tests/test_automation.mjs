import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { tickSimulation } from '../src/core/simulationTick.ts';
import { analogChannel, hmiInputs } from '../src/core/behaviors/automation.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 0;
const w = (a, at, b, bt, extra) => wire(`a${++seq}`, a, at, b, bt, extra);
const L = (b, bt) => w('grid', 'l_out', b, bt);
const Nn = (b, bt) => w('grid', 'n_out', b, bt, N);
const grid = () => dev('kwh_meter_1p', 'grid');
const sw = (id, on = false) => dev('switch_1gang', id, { closed: on });
const lamp = (id) => dev('pilot_light_indicator', id);
const lampOn = (devices, wires, id) => !!solve(devices, wires).deviceEnergized[id];
const setState = (devices, id, patch) => {
  const d = clone(devices);
  Object.assign(byId(d, id).state, patch);
  return d;
};

console.log('--- 5/2 valve and cylinder ---');
{
  const devices = [grid(), sw('s1'), sw('s2'), dev('valve_52', 'yv'), dev('cylinder_da', 'cyl', { valveId: 'yv', strokeSec: 2 }), dev('reed_switch', 'rx', { cylinderId: 'cyl', endPos: 'extended' }), dev('reed_switch', 'rr', { cylinderId: 'cyl', endPos: 'retracted' }), lamp('lx'), lamp('lr')];
  const wires = [
    L('s1', 'l_in'), w('s1', 'sw_out', 'yv', 'y1_a1'), Nn('yv', 'y1_a2'),
    L('s2', 'l_in'), w('s2', 'sw_out', 'yv', 'y2_a1'), Nn('yv', 'y2_a2'),
    L('rx', 'no_13'), w('rx', 'no_14', 'lx', 'x1'), Nn('lx', 'x2'),
    L('rr', 'no_13'), w('rr', 'no_14', 'lr', 'x1'), Nn('lr', 'x2'),
  ];
  let d = run(devices, wires, 3);
  assert.ok(byId(d, 'cyl').state.atRetracted && lampOn(d, wires, 'lr') && !lampOn(d, wires, 'lx'), 'at rest: retracted, the retracted reed is closed');
  d = run(setState(d, 's1', { closed: true }), wires, 3);
  assert.ok(byId(d, 'cyl').state.position > 0 && byId(d, 'cyl').state.position < 100, `moving (${byId(d, 'cyl').state.position})`);
  assert.ok(!lampOn(d, wires, 'lr') && !lampOn(d, wires, 'lx'), 'mid stroke: neither reed is closed');
  d = run(d, wires, 4);
  assert.ok(byId(d, 'cyl').state.atExtended && lampOn(d, wires, 'lx'), 'extended: the extended reed closes');
  d = run(setState(d, 's1', { closed: false }), wires, 4);
  assert.equal(byId(d, 'cyl').state.position, 100, 'double solenoid: both coils off keeps the position');
  d = run(setState(d, 's2', { closed: true }), wires, 6);
  assert.ok(byId(d, 'cyl').state.atRetracted, 'Y2 retracts it');
  d = run(setState(setState(d, 's1', { closed: true }), 's2', { closed: true }), wires, 4);
  assert.equal(byId(d, 'yv').state.spool, 'blocked', 'both coils on: blocked');
  assert.ok(byId(d, 'cyl').state.atRetracted, 'blocked: no movement');
  console.log('✓ advance, memory, retract, blocked, and the reed switches at the end positions');
}

console.log('\n--- Analog channels ---');
{
  assert.equal(analogChannel('4-20mA', 0, 0, 100).raw, 4);
  assert.equal(analogChannel('4-20mA', 50, 0, 100).raw, 12);
  assert.equal(analogChannel('4-20mA', 100, 0, 100).raw, 20);
  assert.equal(analogChannel('0-10V', 50, 0, 100).raw, 5);
  assert.equal(analogChannel('4-20mA', 25, 0, 200).eng, 50, 'scaled 0-200');
  assert.equal(analogChannel('4-20mA', 50, 0, 100).fault, '');
  assert.match(analogChannel('4-20mA', 50, 0, 100, true).fault, /WIRE BREAK/, '4-20 mA broken wire is detected');
  assert.equal(analogChannel('0-10V', 50, 0, 100, true).raw, 0);
  const powered = { nodePotentials: {}, nodePhases: {}, deviceEnergized: {}, wireCurrents: {}, dcPotentials: { 'a:l_pos': 'dc_pos', 'a:m_neg': 'dc_neg' } };
  let d = tickSimulation([dev('analog_io_module', 'a', { pv1: 75, hi1: 200 })], [], powered, 60, 0.5);
  assert.equal(byId(d, 'a').state.raw1, 16, '75 % of 4-20 mA');
  assert.equal(byId(d, 'a').state.eng1, 150);
  const off = tickSimulation(d, [], { ...powered, dcPotentials: {} }, 60, 0.5);
  assert.equal(byId(off, 'a').state.raw1, 0, 'no 24 V: dead');
  console.log('✓ 4-20 mA / 0-10 V conversion, scaling and wire-break fault');
}

console.log('\n--- HMI panel and PLC ---');
{
  // Q0.0 = I0.4 (an HMI button), 24 V PLC on the shared supply
  const prog = { v: 1, scanMs: 100, symbols: {}, rungs: [{ id: 'r1', blocks: [{ id: 'b1', branches: [[{ id: 'e1', kind: 'NO', tag: 'I0.4', sub: '', address: 'I0.4' }]] }], output: { id: 'e2', kind: 'COIL', tag: 'Q0.0', sub: '', address: 'Q0.0' } }] };
  const psu = dev('psu_24vdc', 'psu');
  const plc = dev('plc_24vdc_16io', 'plc', { program: 'user', plcProgram: prog });
  const hmi = dev('hmi_panel', 'hmi', { plcId: 'plc' });
  const wires = [
    w('grid', 'l_out', 'psu', 'in_l'), w('grid', 'n_out', 'psu', 'in_n', N),
    w('psu', 'v_pos', 'plc', 'l_pos'), w('psu', 'v_neg', 'plc', 'm_neg'),
    w('psu', 'v_pos', 'hmi', 'l_pos'), w('psu', 'v_neg', 'hmi', 'm_neg'),
  ];
  let d = run([grid(), psu, plc, hmi], wires, 4);
  assert.ok(byId(d, 'hmi').state.powered && byId(d, 'hmi').state.linked, 'HMI powered and bound to the PLC');
  assert.ok(!byId(d, 'hmi').state.lamp1, 'no button: lamp off');
  d = run(setState(d, 'hmi', { btn1: true }), wires, 3);
  assert.ok(byId(d, 'plc').state.plcOutputs.q0, 'the soft button drives the PLC input I0.4 and output Q0.0');
  assert.ok(byId(d, 'hmi').state.lamp1, 'lamp 1 shows Q0.0');
  d = run(setState(d, 'hmi', { btn1: false }), wires, 3);
  assert.ok(!byId(d, 'hmi').state.lamp1, 'button off: lamp off');
  assert.deepEqual(hmiInputs([{ id: 'h', type: 'hmi_panel', state: { plcId: 'p', powered: true, btn2: true, btn2Addr: 'I0.0' } }], 'p'), { 'I0.0': true }, 'a button can be rebound to another address');
  assert.deepEqual(hmiInputs([{ id: 'h', type: 'hmi_panel', state: { plcId: 'other', powered: true, btn1: true } }], 'p'), {}, 'buttons of another PLC are ignored');
  console.log('✓ soft buttons raise PLC inputs; lamps read PLC bits');
}

console.log('\n--- Lab ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-aut-cylinder-reeds');
  assert.ok(lab, 'lab registered');
  const p = clone(lab.project);
  const ids = new Set(p.devices.map((d) => d.id));
  for (const x of p.wires) assert.ok(ids.has(x.fromDeviceId) && ids.has(x.toDeviceId), `wire ${x.id} references real devices`);
  let d = run(p.devices, p.wires, 3);
  assert.ok(lampOn(d, p.wires, 'l_ret'), 'retracted lamp on at rest');
  d = run(setState(d, 'adv', { pos: 1 }), p.wires, 10);
  assert.ok(byId(d, 'cyl').state.atExtended && lampOn(d, p.wires, 'l_ext') && !lampOn(d, p.wires, 'l_ret'), 'extended lamp on after the stroke');
  console.log('✓ cylinder lab runs through its objectives');
}

console.log('\nAUTOMATION TESTS PASSED');
