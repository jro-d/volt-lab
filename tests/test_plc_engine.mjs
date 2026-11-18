import assert from 'node:assert/strict';
import { dev, wire, run, byId } from './helpers.mjs';
import { emptyRuntime, scanProgram, validateProgram, addressKind, readNumber } from '../src/core/plcEngine.ts';
import { PLC_PRESETS, blankProgram } from '../src/data/plcPresets.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
let n = 0;
const el = (kind, address, extra = {}) => ({ id: `t${++n}`, kind, tag: address, sub: '', address, ...extra });
const rungOf = (contacts, output) => ({ id: `r${++n}`, blocks: contacts.map((e) => ({ id: `b${++n}`, branches: [[e]] })), output });
const program = (rungs, scanMs = 100) => ({ v: 1, scanMs, rungs, symbols: {} });

/** Run `scans` scans with a fixed input set; returns the final runtime + outputs. */
function runScans(prog, inputsAt, scans) {
  let rt = emptyRuntime();
  let out = {};
  for (let i = 0; i < scans; i++) {
    const r = scanProgram(prog, rt, typeof inputsAt === 'function' ? inputsAt(i) : inputsAt);
    rt = r.runtime;
    out = r.outputs;
  }
  return { rt, out };
}
const preset = (id) => PLC_PRESETS.find((p) => p.id === id).build();

console.log('--- Addresses ---');
assert.equal(addressKind('I0.7'), 'I');
assert.equal(addressKind('Q0.0'), 'Q');
assert.equal(addressKind('M0.4'), 'M');
assert.equal(addressKind('MW7'), 'MW');
assert.equal(addressKind('T3'), 'T');
assert.equal(addressKind('C0'), 'C');
assert.equal(addressKind('I0.8'), null);
assert.equal(addressKind('MW8'), null);
assert.equal(addressKind('X1'), null);
console.log('✓ I0.0-0.7, Q0.0-0.7, M0.0-0.7, MW0-7, T0-7, C0-7');

console.log('\n--- Contacts and coils ---');
{
  const p = program([
    rungOf([el('NO', 'I0.0')], el('COIL', 'Q0.0')),
    rungOf([el('NC', 'I0.0')], el('COIL', 'Q0.1')),
    rungOf([el('NO', 'I0.0')], el('NCOIL', 'Q0.2')),
  ]);
  let r = runScans(p, { 'I0.0': true }, 1);
  assert.deepEqual([r.out['Q0.0'], r.out['Q0.1'], r.out['Q0.2']], [true, false, false], 'NO passes, NC blocks, negated coil inverts');
  r = runScans(p, { 'I0.0': false }, 1);
  assert.deepEqual([r.out['Q0.0'], r.out['Q0.1'], r.out['Q0.2']], [false, true, true]);

  // set / reset keep their state
  const sr = program([rungOf([el('NO', 'I0.0')], el('SET', 'Q0.0')), rungOf([el('NO', 'I0.1')], el('RESET', 'Q0.0'))]);
  r = runScans(sr, (i) => ({ 'I0.0': i === 0, 'I0.1': i === 3 }), 3);
  assert.equal(r.out['Q0.0'], true, 'set holds after the input drops');
  r = runScans(sr, (i) => ({ 'I0.0': i === 0, 'I0.1': i === 3 }), 5);
  assert.equal(r.out['Q0.0'], false, 'reset clears it');

  // edge contacts fire for one scan only
  const ed = program([rungOf([el('PEDGE', 'I0.0')], el('COIL', 'M0.0')), rungOf([el('NEDGE', 'I0.0')], el('COIL', 'M0.1')), rungOf([el('NO', 'M0.0')], el('COIL', 'Q0.0')), rungOf([el('NO', 'M0.1')], el('COIL', 'Q0.1'))]);
  const seen = [];
  let rt = emptyRuntime();
  [false, true, true, false, false].forEach((v) => {
    const s = scanProgram(ed, rt, { 'I0.0': v });
    rt = s.runtime;
    seen.push([s.outputs['Q0.0'], s.outputs['Q0.1']]);
  });
  assert.deepEqual(seen, [[false, false], [true, false], [false, false], [false, true], [false, false]], 'positive edge on the rise, negative edge on the fall, one scan each');
  console.log('✓ NO / NC / negated coil, set / reset, positive and negative edge');
}

console.log('\n--- Timers ---');
{
  const ton = program([rungOf([el('NO', 'I0.0')], el('TON', 'T0', { preset: 1000 })), rungOf([el('NO', 'T0')], el('COIL', 'Q0.0'))]);
  assert.equal(runScans(ton, { 'I0.0': true }, 9).out['Q0.0'], false, 'TON: off before the preset (0.9 s)');
  assert.equal(runScans(ton, { 'I0.0': true }, 10).out['Q0.0'], true, 'TON: on at the preset (1.0 s)');
  assert.equal(runScans(ton, (i) => ({ 'I0.0': i < 5 }), 15).out['Q0.0'], false, 'TON: input dropped early, timer reset');

  const tof = program([rungOf([el('NO', 'I0.0')], el('TOF', 'T0', { preset: 1000 })), rungOf([el('NO', 'T0')], el('COIL', 'Q0.0'))]);
  assert.equal(runScans(tof, { 'I0.0': true }, 3).out['Q0.0'], true, 'TOF: on with the input');
  assert.equal(runScans(tof, (i) => ({ 'I0.0': i < 3 }), 12).out['Q0.0'], true, 'TOF: still on 0.9 s after the input drops');
  assert.equal(runScans(tof, (i) => ({ 'I0.0': i < 3 }), 14).out['Q0.0'], false, 'TOF: off after the preset');

  const tp = program([rungOf([el('NO', 'I0.0')], el('TP', 'T0', { preset: 500 })), rungOf([el('NO', 'T0')], el('COIL', 'Q0.0'))]);
  assert.equal(runScans(tp, (i) => ({ 'I0.0': i < 20 }), 4).out['Q0.0'], true, 'TP: pulse while within the preset');
  assert.equal(runScans(tp, (i) => ({ 'I0.0': i < 20 }), 10).out['Q0.0'], false, 'TP: pulse ends even though the input stays on');
  console.log('✓ TON, TOF and TP at 100 ms scans');
}

console.log('\n--- Counters, compare, MOV and ADD ---');
{
  const ctu = program([
    rungOf([el('NO', 'I0.0')], el('CTU', 'C0', { preset: 3, resetAddress: 'I0.1' })),
    rungOf([el('NO', 'C0')], el('COIL', 'Q0.0')),
  ]);
  const pulses = (k) => (i) => ({ 'I0.0': i % 2 === 1 && Math.floor(i / 2) < k });
  assert.equal(runScans(ctu, pulses(2), 10).out['Q0.0'], false, 'CTU: 2 of 3');
  assert.equal(runScans(ctu, pulses(3), 10).out['Q0.0'], true, 'CTU: 3 of 3');
  const afterReset = runScans(ctu, (i) => ({ ...pulses(3)(i), 'I0.1': i >= 8 }), 10);
  assert.equal(afterReset.out['Q0.0'], false, 'CTU: reset clears');
  assert.equal(afterReset.rt.counters.C0.acc, 0);

  const ctd = program([rungOf([el('NO', 'I0.0')], el('CTD', 'C0', { preset: 2 })), rungOf([el('NO', 'C0')], el('COIL', 'Q0.0'))]);
  assert.equal(runScans(ctd, pulses(1), 10).out['Q0.0'], false, 'CTD: 1 left');
  assert.equal(runScans(ctd, pulses(2), 10).out['Q0.0'], true, 'CTD: reached zero');

  const math = program([
    rungOf([el('NO', 'I0.0')], el('MOV', 'MW0', { operandA: 7 })),
    rungOf([el('NO', 'I0.0')], el('ADD', 'MW1', { operandA: 'MW0', operandB: 5 })),
    rungOf([el('EQ', 'MW1', { operandA: 'MW1', operandB: 12 })], el('COIL', 'Q0.0')),
    rungOf([el('GT', 'MW1', { operandA: 'MW1', operandB: 10 })], el('COIL', 'Q0.1')),
    rungOf([el('LT', 'MW1', { operandA: 'MW1', operandB: 10 })], el('COIL', 'Q0.2')),
  ]);
  const r = runScans(math, { 'I0.0': true }, 2);
  assert.equal(readNumber(r.rt, 'MW1'), 12);
  assert.deepEqual([r.out['Q0.0'], r.out['Q0.1'], r.out['Q0.2']], [true, true, false], 'EQ and GT true, LT false');
  console.log('✓ CTU / CTD with reset, MOV, ADD and EQ / GT / LT compare');
}

console.log('\n--- Forcing ---');
{
  const p = program([rungOf([el('NO', 'I0.0')], el('COIL', 'Q0.0'))]);
  let rt = emptyRuntime();
  let s = scanProgram(p, rt, { 'I0.0': false }, { inputs: { 'I0.0': true }, outputs: {} });
  assert.equal(s.outputs['Q0.0'], true, 'a forced input drives the program');
  s = scanProgram(p, rt, { 'I0.0': true }, { inputs: {}, outputs: { 'Q0.0': false } });
  assert.equal(s.outputs['Q0.0'], false, 'a forced output wins over the program');
  console.log('✓ forced inputs and outputs');
}

console.log('\n--- Validation ---');
{
  const dup = program([rungOf([el('NO', 'I0.0')], el('COIL', 'Q0.0')), rungOf([el('NO', 'I0.1')], el('COIL', 'Q0.0'))]);
  assert.ok(validateProgram(dup).some((i) => i.severity === 'error' && /Duplicate output coil Q0\.0/.test(i.message)));
  const open = program([{ id: 'x', blocks: [{ id: 'b', branches: [[el('NO', 'I0.0')]] }], output: null }]);
  assert.ok(validateProgram(open).some((i) => /no output/.test(i.message)), 'rung end not connected');
  const empty = program([{ id: 'x', blocks: [{ id: 'b', branches: [[]] }], output: el('COIL', 'Q0.0') }]);
  assert.ok(validateProgram(empty).some((i) => /empty branch/.test(i.message)));
  const unused = { ...program([rungOf([el('NO', 'I0.0')], el('COIL', 'Q0.0'))]), symbols: { 'I0.5': 'SPARE' } };
  assert.ok(validateProgram(unused).some((i) => /SPARE/.test(i.message)), 'unused symbol');
  const noWrite = program([rungOf([el('NO', 'M0.0')], el('COIL', 'Q0.0'))]);
  assert.ok(validateProgram(noWrite).some((i) => /M0\.0 is read but never written/.test(i.message)));
  const noPreset = program([rungOf([el('NO', 'I0.0')], el('TON', 'T0'))]);
  assert.ok(validateProgram(noPreset).some((i) => /no preset/.test(i.message)));
  for (const pr of PLC_PRESETS) {
    const errors = validateProgram(pr.build()).filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, `${pr.id}: ${errors.map((e) => e.message).join('; ')}`);
  }
  assert.equal(blankProgram().rungs.length, 0);
  console.log('✓ duplicate coils, open rung ends, empty branches, unused / unwritten addresses, missing presets; all presets validate');
}

console.log('\n--- Presets behave as described ---');
{
  // start / stop latch: pulse START, it seals in, STOP (true while healthy, false when pressed) drops it
  let p = preset('start_stop_latch');
  let r = runScans(p, (i) => ({ 'I0.0': i === 1, 'I0.1': i < 6 }), 4);
  assert.equal(r.out['Q0.0'], true, 'latched after START was released');
  r = runScans(p, (i) => ({ 'I0.0': i === 1, 'I0.1': i < 6 }), 8);
  assert.equal(r.out['Q0.0'], false, 'STOP drops it');

  // TON delayed start: 5 s
  p = preset('ton_delayed_start');
  assert.equal(runScans(p, { 'I0.0': true }, 49).out['Q0.0'], false);
  assert.equal(runScans(p, { 'I0.0': true }, 49).out['Q0.1'], true, 'waiting lamp while counting');
  r = runScans(p, { 'I0.0': true }, 50);
  assert.equal(r.out['Q0.0'], true, 'motor starts after 5 s');
  assert.equal(r.out['Q0.1'], false, 'waiting lamp off');

  // traffic light: red 4 s, green 4 s, amber 2 s, repeat
  p = preset('traffic_light');
  const light = (scans) => {
    const o = runScans(p, { 'I0.0': true }, scans).out;
    return o['Q0.0'] ? 'R' : o['Q0.2'] ? 'G' : o['Q0.1'] ? 'A' : '-';
  };
  assert.equal(light(20), 'R');
  assert.equal(light(60), 'G');
  assert.equal(light(90), 'A');
  assert.equal(light(125), 'R', 'the cycle repeats');
  assert.equal(light(165), 'G');

  // conveyor counter: stops after 5 parts, reset restarts
  p = preset('conveyor_counter');
  const parts = (k, reset = false) => (i) => ({ 'I0.2': true, 'I0.0': i % 2 === 1 && Math.floor(i / 2) < k, 'I0.1': reset && i >= 12 });
  assert.equal(runScans(p, parts(4), 12).out['Q0.0'], true, '4 parts: still running');
  r = runScans(p, parts(5), 12);
  assert.equal(r.out['Q0.0'], false, '5 parts: belt stops');
  assert.equal(r.out['Q0.1'], true, 'batch full lamp');
  assert.equal(runScans(p, parts(5, true), 14).out['Q0.0'], true, 'reset starts a new batch');

  // two-motor sequence
  p = preset('two_motor_sequence');
  const seqIn = (stopAt) => (i) => ({ 'I0.0': i === 1, 'I0.1': i < stopAt });
  r = runScans(p, seqIn(999), 20);
  assert.deepEqual([r.out['Q0.0'], r.out['Q0.1']], [true, false], 'motor 1 first');
  r = runScans(p, seqIn(999), 35);
  assert.deepEqual([r.out['Q0.0'], r.out['Q0.1']], [true, true], 'motor 2 follows after 3 s');
  r = runScans(p, seqIn(40), 45);
  assert.deepEqual([r.out['Q0.0'], r.out['Q0.1']], [false, false], 'STOP drops both');

  // tank level: set on low, reset on high, alarm after 8 s of running
  p = preset('tank_level');
  r = runScans(p, (i) => ({ 'I0.0': i < 3, 'I0.1': false }), 6);
  assert.equal(r.out['Q0.0'], true, 'pump starts on low level and holds');
  r = runScans(p, (i) => ({ 'I0.0': i < 3, 'I0.1': i > 20 }), 25);
  assert.equal(r.out['Q0.0'], false, 'pump stops on high level');
  r = runScans(p, (i) => ({ 'I0.0': i < 3, 'I0.1': false }), 100);
  assert.equal(r.out['Q0.1'], true, 'alarm when the pump runs for more than 8 s');
  console.log('✓ start / stop latch, TON delayed start, traffic light cycle, conveyor counter, two-motor sequence, tank level');
}

console.log('\n--- Device integration: the program drives a real circuit ---');
{
  const src = dev('kwh_meter_1p', 'src');
  const plc = dev('plc_micro_controller', 'plc', { program: 'user', plcProgram: preset('start_stop_latch') });
  const start = dev('switch_1gang', 'start', { closed: false });
  const lamp = dev('light_bulb', 'lamp');
  const wires = [
    wire('p1', 'src', 'l_out', 'plc', 'p_l'), wire('p2', 'src', 'n_out', 'plc', 'p_n', N),
    wire('s1', 'src', 'l_out', 'start', 'l_in'), wire('s2', 'start', 'sw_out', 'plc', 'i1'), // I0.0 START
    wire('t1', 'src', 'l_out', 'plc', 'i2'), // I0.1 STOP wired normally closed: always live here
    wire('o1', 'src', 'l_out', 'plc', 'q1_1'), wire('o2', 'plc', 'q1_2', 'lamp', 'hot'), wire('o3', 'src', 'n_out', 'lamp', 'neutral', N),
  ];
  let devices = run([src, plc, start, lamp], wires, 3);
  assert.equal(!!byId(devices, 'lamp').state.lit, false, 'idle');
  byId(devices, 'start').state.closed = true;
  devices = run(devices, wires, 3);
  assert.equal(!!byId(devices, 'lamp').state.lit, true, 'START: the program energizes Q0.0 and the lamp lights');
  byId(devices, 'start').state.closed = false;
  devices = run(devices, wires, 4);
  assert.equal(!!byId(devices, 'lamp').state.lit, true, 'the latch holds after START is released');
  assert.ok(byId(devices, 'plc').state.plcScans > 0, 'scan counter advances');
  console.log('✓ micro PLC with a user program: START -> latch -> relay output -> lamp');

  // old fixed behaviour is untouched
  const old = dev('plc_micro_controller', 'plc');
  assert.equal(old.state.program, undefined);
  const oldDevs = run([dev('kwh_meter_1p', 'src'), old, dev('switch_1gang', 'start', { closed: true })], [
    wire('p1', 'src', 'l_out', 'plc', 'p_l'), wire('p2', 'src', 'n_out', 'plc', 'p_n', N),
    wire('s1', 'src', 'l_out', 'start', 'l_in'), wire('s2', 'start', 'sw_out', 'plc', 'i1'),
  ], 2);
  assert.equal(byId(oldDevs, 'plc').state.plcOutputs.q1, true, 'without a user program the I1 -> Q1 demo behaviour still runs');
  console.log('✓ PLCs without a user program keep their previous demo behaviour');
}
console.log('PLC ENGINE TESTS PASSED');
