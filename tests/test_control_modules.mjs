import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 0;
const w = (a, at, b, bt, extra) => wire(`w${++seq}`, a, at, b, bt, extra);
/** live from the grid meter */
const L = (b, bt) => w('grid', 'l_out', b, bt);
const Nn = (b, bt) => w('grid', 'n_out', b, bt, N);
/** a switch fed from live: its sw_out is the controlled live */
const sw = (id, on = false) => dev('switch_1gang', id, { closed: on });
const swWires = (id) => [L(id, 'l_in')];
const lamp = (id) => dev('pilot_light_indicator', id);
const lampOn = (devices, wires, id) => !!solve(devices, wires).deviceEnergized[id];
const setState = (devices, id, patch) => {
  const d = clone(devices);
  Object.assign(byId(d, id).state, patch);
  return d;
};
const grid = () => dev('kwh_meter_1p', 'grid');

console.log('--- Star-delta timer ---');
{
  // coil from a switch; star contact feeds lamp S, delta contact feeds lamp D
  let devices = [grid(), sw('s1'), dev('star_delta_timer', 'kt', { starSec: 2, pauseMs: 100 }), lamp('ls'), lamp('ld')];
  const wires = [
    ...swWires('s1'), w('s1', 'sw_out', 'kt', 'a1'), Nn('kt', 'a2'),
    L('kt', 'y_13'), w('kt', 'y_14', 'ls', 'x1'), Nn('ls', 'x2'),
    L('kt', 'd_23'), w('kt', 'd_24', 'ld', 'x1'), Nn('ld', 'x2'),
  ];
  devices = setState(devices, 's1', { closed: true });
  devices = run(devices, wires, 1);
  assert.equal(byId(devices, 'kt').state.phase, 'star', 'coil on starts the star phase');
  assert.ok(lampOn(devices, wires, 'ls') && !lampOn(devices, wires, 'ld'), 'star contact closed, delta open');
  devices = run(devices, wires, 3); // 2 s of star in total
  assert.equal(byId(devices, 'kt').state.phase, 'pause', 'star time over: both contacts open');
  assert.ok(!lampOn(devices, wires, 'ls') && !lampOn(devices, wires, 'ld'), 'transition pause: neither contactor is energized');
  devices = run(devices, wires, 1);
  assert.equal(byId(devices, 'kt').state.phase, 'delta');
  assert.ok(!lampOn(devices, wires, 'ls') && lampOn(devices, wires, 'ld'), 'delta closed, star open');
  devices = run(setState(devices, 's1', { closed: false }), wires, 1);
  assert.equal(byId(devices, 'kt').state.phase, 'idle', 'coil off resets the timer');
  console.log('✓ star -> pause -> delta, never both closed, reset when the coil drops');
}

console.log('\n--- Counter relay ---');
{
  let devices = [grid(), sw('cnt'), sw('rst'), dev('counter_relay', 'kc', { preset: 3 }), lamp('lout')];
  const wires = [
    ...swWires('cnt'), ...swWires('rst'),
    w('cnt', 'sw_out', 'kc', 'c1'), Nn('kc', 'c2'), w('rst', 'sw_out', 'kc', 'r1'), Nn('kc', 'r2'),
    L('kc', 'com_11'), w('kc', 'no_14', 'lout', 'x1'), Nn('lout', 'x2'),
  ];
  const pulse = (d) => run(setState(run(setState(d, 'cnt', { closed: true }), wires, 1), 'cnt', { closed: false }), wires, 1);
  devices = pulse(devices);
  devices = pulse(devices);
  assert.equal(byId(devices, 'kc').state.count, 2);
  assert.ok(!lampOn(devices, wires, 'lout'), 'below the preset the output is off');
  devices = pulse(devices);
  assert.equal(byId(devices, 'kc').state.count, 3);
  assert.ok(lampOn(devices, wires, 'lout'), 'at the preset the output changes over');
  // holding the count coil on is one pulse, not many
  devices = run(setState(devices, 'cnt', { closed: true }), wires, 4);
  assert.equal(byId(devices, 'kc').state.count, 4, 'a held pulse counts once');
  devices = run(setState(devices, 'cnt', { closed: false }), wires, 1);
  assert.ok(lampOn(devices, wires, 'lout'), 'the output stays latched');
  devices = run(setState(devices, 'rst', { closed: true }), wires, 1);
  assert.equal(byId(devices, 'kc').state.count, 0);
  assert.ok(!lampOn(devices, wires, 'lout'), 'reset clears count and output');
  console.log('✓ counts rising edges, latches at the preset, reset clears');
}

console.log('\n--- Impulse relay ---');
{
  let devices = [grid(), sw('p1'), dev('impulse_relay', 'ki'), lamp('l1')];
  const wires = [...swWires('p1'), w('p1', 'sw_out', 'ki', 'a1'), Nn('ki', 'a2'), L('ki', 'no_13'), w('ki', 'no_14', 'l1', 'x1'), Nn('l1', 'x2')];
  const press = (d) => run(setState(run(setState(d, 'p1', { closed: true }), wires, 1), 'p1', { closed: false }), wires, 1);
  assert.ok(!lampOn(devices, wires, 'l1'));
  devices = press(devices);
  assert.ok(lampOn(devices, wires, 'l1'), 'first pulse: on, and it stays on after release');
  devices = press(devices);
  assert.ok(!lampOn(devices, wires, 'l1'), 'second pulse: off');
  devices = press(devices);
  assert.ok(lampOn(devices, wires, 'l1'), 'third pulse: on again');
  console.log('✓ every pulse toggles the contacts');
}

console.log('\n--- Staircase timer ---');
{
  let devices = [grid(), sw('pb'), dev('staircase_timer', 'ks', { timeSec: 3 }), lamp('light')];
  const wires = [L('ks', 'l'), Nn('ks', 'n'), ...swWires('pb'), w('pb', 'sw_out', 'ks', 'pb'), w('ks', 'out', 'light', 'x1'), Nn('light', 'x2')];
  devices = run(devices, wires, 2);
  assert.ok(!lampOn(devices, wires, 'light'), 'idle: light off');
  devices = run(setState(devices, 'pb', { closed: true }), wires, 1);
  devices = setState(devices, 'pb', { closed: false });
  devices = run(devices, wires, 1);
  assert.ok(lampOn(devices, wires, 'light'), 'a push starts the run time');
  devices = run(devices, wires, 3);
  assert.ok(lampOn(devices, wires, 'light'), 're-trigger test: still running before the time is up');
  devices = run(setState(devices, 'pb', { closed: true }), wires, 1); // restart
  devices = setState(devices, 'pb', { closed: false });
  devices = run(devices, wires, 4);
  assert.ok(lampOn(devices, wires, 'light'), 'pressing again restarted the 3 s run time');
  devices = run(devices, wires, 4);
  assert.ok(!lampOn(devices, wires, 'light'), 'run time over: light off');
  console.log('✓ re-triggerable run time');
}

console.log('\n--- 24-hour time switch ---');
{
  let devices = [grid(), dev('time_switch_24h', 'kt', { clockMin: 350, onMin: 360, offMin: 1080, speed: 3600 }), lamp('light')];
  const wires = [L('kt', 'l'), Nn('kt', 'n'), L('kt', 'com'), w('kt', 'no', 'light', 'x1'), Nn('light', 'x2')];
  assert.ok(!lampOn(devices, wires, 'light'));
  devices = run(devices, wires, 2); // 05:50 -> 06:50
  assert.ok(byId(devices, 'kt').state.clockMin > 360, 'clock advanced');
  assert.ok(lampOn(devices, wires, 'light'), 'inside the window the contact is closed');
  devices = run(devices, wires, 22); // +11 h -> 17:50
  assert.ok(lampOn(devices, wires, 'light'));
  devices = run(devices, wires, 2); // past 18:00
  assert.ok(!lampOn(devices, wires, 'light'), 'after the off time the contact opens');
  devices = run(setState(devices, 'kt', { mode: 'on' }), wires, 1);
  assert.ok(lampOn(devices, wires, 'light'), 'manual on overrides the schedule');
  // a schedule that crosses midnight
  devices = run(setState(devices, 'kt', { mode: 'auto', onMin: 1200, offMin: 300, clockMin: 1300 }), wires, 1);
  assert.ok(lampOn(devices, wires, 'light'), '22:00-05:00 window includes 21:50+');
  // no supply: the clock stops
  const dead = [dev('time_switch_24h', 'kt', { clockMin: 100, speed: 3600 })];
  assert.equal(byId(run(dead, [], 3), 'kt').state.clockMin, 100, 'unpowered: the clock does not run');
  console.log('✓ schedule, manual override, midnight wrap, clock only runs when powered');
}

console.log('\n--- Alternating relay ---');
{
  let devices = [grid(), sw('lvl'), dev('alternating_relay', 'ka'), lamp('p1'), lamp('p2')];
  const wires = [...swWires('lvl'), w('lvl', 'sw_out', 'ka', 'a1'), Nn('ka', 'a2'), L('ka', 'no_13'), w('ka', 'no_14', 'p1', 'x1'), Nn('p1', 'x2'), L('ka', 'no_23'), w('ka', 'no_24', 'p2', 'x1'), Nn('p2', 'x2')];
  const cycle = (d, on) => run(setState(d, 'lvl', { closed: on }), wires, 2);
  devices = cycle(devices, true);
  assert.ok(lampOn(devices, wires, 'p1') && !lampOn(devices, wires, 'p2'), 'first start: pump 1 leads');
  devices = cycle(devices, false);
  assert.ok(!lampOn(devices, wires, 'p1') && !lampOn(devices, wires, 'p2'));
  devices = cycle(devices, true);
  assert.ok(!lampOn(devices, wires, 'p1') && lampOn(devices, wires, 'p2'), 'second start: pump 2 leads');
  devices = cycle(cycle(devices, false), true);
  assert.ok(lampOn(devices, wires, 'p1') && !lampOn(devices, wires, 'p2'), 'third start: back to pump 1');
  console.log('✓ the lead flips on every start');
}

console.log('\n--- Solid-state relay ---');
{
  let devices = [grid(), sw('in'), dev('ssr_1p', 'ssr'), lamp('load')];
  const wires = [...swWires('in'), w('in', 'sw_out', 'ssr', 'a1'), Nn('ssr', 'a2'), L('ssr', 't1'), w('ssr', 't2', 'load', 'x1'), Nn('load', 'x2')];
  devices = run(devices, wires, 1);
  assert.ok(!lampOn(devices, wires, 'load'), 'input off: output open');
  devices = run(setState(devices, 'in', { closed: true }), wires, 2);
  assert.ok(lampOn(devices, wires, 'load'), 'input on: output closed');
  assert.equal(byId(devices, 'ssr').state.leakageMa, 5);
  console.log('✓ output follows the control input');
}

console.log('\n--- Operators ---');
{
  const contact = (state) => {
    const devices = [grid(), dev('operator_pilot', 'op', state), lamp('a'), lamp('b'), lamp('nc')];
    const wires = [
      L('op', 'no_13'), w('op', 'no_14', 'a', 'x1'), Nn('a', 'x2'),
      L('op', 'no_23'), w('op', 'no_24', 'b', 'x1'), Nn('b', 'x2'),
      L('op', 'nc_21'), w('op', 'nc_22', 'nc', 'x1'), Nn('nc', 'x2'),
    ];
    return [lampOn(devices, wires, 'a'), lampOn(devices, wires, 'b'), lampOn(devices, wires, 'nc')];
  };
  assert.deepEqual(contact({ operatorKind: 'illuminated_pb', pressed: false }), [false, false, true], 'released: NC closed');
  assert.deepEqual(contact({ operatorKind: 'illuminated_pb', pressed: true }), [true, false, false], 'pressed: NO closed, NC open');
  assert.deepEqual(contact({ operatorKind: 'selector_2pos', pos: 1 }), [true, false, false], 'selector turned: stays');
  assert.deepEqual(contact({ operatorKind: 'foot_switch', pressed: true, guardOpen: false }), [false, false, true], 'foot switch: guard down blocks the press');
  assert.deepEqual(contact({ operatorKind: 'foot_switch', pressed: true, guardOpen: true }), [true, false, false]);
  assert.deepEqual(contact({ operatorKind: 'pendant_station', pressed: true }), [true, false, false], 'pendant UP');
  assert.deepEqual(contact({ operatorKind: 'pendant_station', pressedB: true }), [false, true, false], 'pendant DOWN');
  assert.deepEqual(contact({ operatorKind: 'pendant_station', pressed: true, pressedB: true }), [false, false, false], 'both pressed: interlocked, neither closes');
  // illuminated: the lamp is on its own X1-X2 terminals
  let devices = [grid(), dev('operator_pilot', 'op', { operatorKind: 'illuminated_pb' })];
  const wires = [L('op', 'x1'), Nn('op', 'x2')];
  devices = run(devices, wires, 1);
  assert.equal(byId(devices, 'op').state.lit, true, 'the lamp lights from its own terminals');
  console.log('✓ five operator variants');
}

console.log('\n--- Aux contact block and mechanical interlock ---');
{
  let devices = [grid(), sw('s'), dev('contactor_3p', 'km'), dev('aux_contact_block', 'aux', { parentId: 'km' }), lamp('lno'), lamp('lnc')];
  const wires = [
    ...swWires('s'), w('s', 'sw_out', 'km', 'a1'), Nn('km', 'a2'),
    L('aux', 'no_53'), w('aux', 'no_54', 'lno', 'x1'), Nn('lno', 'x2'),
    L('aux', 'nc_71'), w('aux', 'nc_72', 'lnc', 'x1'), Nn('lnc', 'x2'),
  ];
  devices = run(devices, wires, 2);
  assert.ok(!lampOn(devices, wires, 'lno') && lampOn(devices, wires, 'lnc'), 'contactor released: NC closed');
  devices = run(setState(devices, 's', { closed: true }), wires, 3);
  assert.ok(lampOn(devices, wires, 'lno') && !lampOn(devices, wires, 'lnc'), 'contactor pulled in: the block follows');
  console.log('✓ aux block follows its contactor');

  // interlock: both coils powered, only the first closes
  let two = [grid(), sw('sa', true), sw('sb', true), dev('contactor_3p', 'ka'), dev('contactor_3p', 'kb'), dev('mechanical_interlock', 'mi', { a: 'ka', b: 'kb' })];
  const tw = [...swWires('sa'), ...swWires('sb'), w('sa', 'sw_out', 'ka', 'a1'), Nn('ka', 'a2'), w('sb', 'sw_out', 'kb', 'a1'), Nn('kb', 'a2')];
  two = run(two, tw, 3);
  assert.ok(byId(two, 'ka').state.coilEnergized && !byId(two, 'kb').state.coilEnergized, 'the interlock holds B out while A is in');
  two = run(setState(two, 'sa', { closed: false }), tw, 3);
  assert.ok(!byId(two, 'ka').state.coilEnergized && byId(two, 'kb').state.coilEnergized, 'A drops, B may close');
  const free = run([grid(), sw('sa', true), sw('sb', true), dev('contactor_3p', 'ka'), dev('contactor_3p', 'kb')], tw, 3);
  assert.ok(byId(free, 'ka').state.coilEnergized && byId(free, 'kb').state.coilEnergized, 'without the interlock both close');
  console.log('✓ the mechanical interlock blocks the second contactor');
}

console.log('\n--- Safety relay, door interlock ---');
{
  const base = () => [
    grid(), dev('safety_relay', 'sr'), dev('door_interlock_switch', 'door'), sw('start'), lamp('out'),
  ];
  const wires = [
    L('sr', 'a1'), Nn('sr', 'a2'),
    w('sr', 's11', 'door', 'nc_11'), w('door', 'nc_12', 'sr', 's12'),
    w('sr', 's21', 'door', 'nc_21'), w('door', 'nc_22', 'sr', 's22'),
    w('sr', 'x1', 'start', 'l_in'), w('start', 'sw_out', 'sr', 'x2'),
    L('sr', 'no_13'), w('sr', 'no_14', 'out', 'x1'), Nn('out', 'x2'),
  ];
  let devices = run(base(), wires, 3);
  let sr = () => byId(devices, 'sr').state;
  assert.ok(sr().powered && sr().ch1 && sr().ch2, 'door closed: both channels are made');
  assert.ok(!sr().outOn && !lampOn(devices, wires, 'out'), 'monitored start: nothing until START is pressed');
  devices = run(setState(devices, 'start', { closed: true }), wires, 2);
  assert.ok(sr().outOn && lampOn(devices, wires, 'out'), 'START closes the safety outputs');
  devices = run(setState(devices, 'start', { closed: false }), wires, 2);
  assert.ok(sr().outOn, 'the outputs stay closed after START is released');
  devices = run(setState(devices, 'door', { doorClosed: false }), wires, 2);
  assert.ok(!sr().outOn && !lampOn(devices, wires, 'out') && !sr().fault, 'opening the door drops the outputs, no fault when both channels open together');
  devices = run(setState(devices, 'door', { doorClosed: true }), wires, 3);
  assert.ok(!sr().outOn, 'closing the door does not restart a monitored relay');
  devices = run(setState(devices, 'start', { closed: true }), wires, 2);
  assert.ok(sr().outOn, 'START after the channels are made restarts it');

  // auto start
  const auto = run(setState(base(), 'sr', { startMode: 'auto' }), wires, 3);
  assert.ok(byId(auto, 'sr').state.outOn, 'automatic start closes as soon as both channels are made');

  // discrepancy: channel 2 broken (no wire back to s22)
  const broken = wires.filter((x) => !(x.fromTerminalId === 'nc_22'));
  let fault = run(base(), broken, 4);
  assert.ok(byId(fault, 'sr').state.ch1 && !byId(fault, 'sr').state.ch2, 'one channel made, one open');
  assert.ok(byId(fault, 'sr').state.fault, 'a persistent discrepancy is a fault');
  fault = run(setState(fault, 'start', { closed: true }), broken, 3);
  assert.ok(!byId(fault, 'sr').state.outOn, 'a faulted relay cannot be started');
  console.log('✓ dual-channel monitoring, manual / automatic start, discrepancy fault');
}

console.log('\n--- Two-hand station ---');
{
  const make = (state) => {
    let devices = [grid(), dev('two_hand_station', 'th', state), lamp('out')];
    const wires = [L('th', 'a1'), Nn('th', 'a2'), L('th', 'no_13'), w('th', 'no_14', 'out', 'x1'), Nn('out', 'x2')];
    devices = run(devices, wires, 2);
    return { devices, wires };
  };
  let t = make({ leftPressed: true, rightPressed: true, leftAt: 1000, rightAt: 1300 });
  assert.ok(byId(t.devices, 'th').state.armed && lampOn(t.devices, t.wires, 'out'), 'both pressed within 0.5 s: output closes');
  t.devices = run(setState(t.devices, 'th', { rightPressed: false }), t.wires, 1);
  assert.ok(!byId(t.devices, 'th').state.armed && !lampOn(t.devices, t.wires, 'out'), 'releasing one hand opens it');
  t.devices = run(setState(t.devices, 'th', { rightPressed: true, rightAt: 5000 }), t.wires, 2);
  assert.ok(!byId(t.devices, 'th').state.armed, 'a re-press while the other is held is refused');
  t.devices = run(setState(t.devices, 'th', { leftPressed: false, rightPressed: false }), t.wires, 1);
  assert.ok(!byId(t.devices, 'th').state.needRelease, 'both released: ready again');
  t = make({ leftPressed: true, rightPressed: true, leftAt: 1000, rightAt: 2000 });
  assert.ok(!byId(t.devices, 'th').state.armed && byId(t.devices, 'th').state.needRelease, 'presses 1 s apart: refused, release both');
  console.log('✓ synchronous press within 0.5 s, anti-tie-down');
}

console.log('\n--- Pull-cord switch ---');
{
  const pc = (state) => {
    const devices = [grid(), dev('pull_cord_switch', 'pc', state), lamp('nc'), lamp('no')];
    const wires = [L('pc', 'nc_11'), w('pc', 'nc_12', 'nc', 'x1'), Nn('nc', 'x2'), L('pc', 'no_23'), w('pc', 'no_24', 'no', 'x1'), Nn('no', 'x2')];
    return [lampOn(devices, wires, 'nc'), lampOn(devices, wires, 'no')];
  };
  assert.deepEqual(pc({ pulled: false }), [true, false]);
  assert.deepEqual(pc({ pulled: true }), [false, true]);
  console.log('✓ the NC opens and the NO closes when the cord is pulled');
}

console.log('\n--- Labs ---');
{
  const load = (id) => {
    const lab = LAB_LESSONS.find((l) => l.id === id);
    assert.ok(lab, `${id} registered`);
    const ids = new Set(lab.project.devices.map((d) => d.id));
    for (const x of lab.project.wires) assert.ok(ids.has(x.fromDeviceId) && ids.has(x.toDeviceId), `${id}: wire ${x.id} references real devices`);
    return { devices: clone(lab.project.devices), wires: lab.project.wires, volts: lab.project.gridVoltage };
  };
  const go = (l, devices, n) => run(devices, l.wires, n, 0.5, { volts: l.volts });
  const on = (l, devices, id) => !!solve(devices, l.wires, 'PEC', l.volts).deviceEnergized[id];

  // A: star-delta timer
  {
    const l = load('lab-ctl-star-delta-timer');
    let d = go(l, setState(l.devices, 'start', { pos: 1 }), 3);
    assert.ok(on(l, d, 'pl_star') && !on(l, d, 'pl_delta'), 'star first');
    d = go(l, d, 7); // 10 steps = 5 s of star
    assert.ok(!on(l, d, 'pl_star') && !on(l, d, 'pl_delta'), 'then the pause');
    d = go(l, d, 1);
    assert.ok(!on(l, d, 'pl_star') && on(l, d, 'pl_delta'), 'then delta');
  }
  // B: staircase timer and impulse relay
  {
    const l = load('lab-ctl-staircase-impulse');
    let d = go(l, setState(l.devices, 'pb1', { pressed: true }), 1);
    d = go(l, setState(d, 'pb1', { pressed: false }), 1);
    assert.ok(on(l, d, 'stair_light'), 'staircase light on after a push');
    d = go(l, d, 45);
    assert.ok(!on(l, d, 'stair_light'), 'and off after the run time');
    d = go(l, setState(d, 'pb3', { pressed: true }), 1);
    d = go(l, setState(d, 'pb3', { pressed: false }), 1);
    assert.ok(on(l, d, 'hall_light'), 'impulse: first push latches the hall light on');
    d = go(l, setState(d, 'pb4', { pressed: true }), 1);
    d = go(l, setState(d, 'pb4', { pressed: false }), 1);
    assert.ok(!on(l, d, 'hall_light'), 'a second push from the other button switches it off');
  }
  // C: safety circuit
  {
    const l = load('lab-ctl-safety-chain');
    let d = go(l, l.devices, 3);
    assert.ok(byId(d, 'sr').state.ch1 && byId(d, 'sr').state.ch2, 'both channels made');
    assert.ok(!byId(d, 'km1').state.coilEnergized && on(l, d, 'pl_stop'), 'not started: contactor off, STOP lamp on');
    d = go(l, setState(d, 'start', { pressed: true }), 2);
    d = go(l, setState(d, 'start', { pressed: false }), 2);
    assert.ok(byId(d, 'km1').state.coilEnergized && on(l, d, 'pl_safe') && !on(l, d, 'pl_stop'), 'started: KM1 in');
    d = go(l, setState(d, 'door', { doorClosed: false }), 3);
    assert.ok(!byId(d, 'km1').state.coilEnergized && on(l, d, 'pl_stop'), 'door open: machine stops');
    d = go(l, setState(d, 'door', { doorClosed: true }), 3);
    assert.ok(!byId(d, 'km1').state.coilEnergized, 'door closed again: no automatic restart');
    d = go(l, setState(d, 'estop', { estopActive: true, latched: true }), 3);
    assert.ok(!byId(d, 'sr').state.ch1 && byId(d, 'sr').state.ch2, 'E-stop opens channel 1 only');
  }
  // D: counter, alternating relay, time switch
  {
    const l = load('lab-ctl-counter-alternating');
    let d = l.devices;
    for (let i = 0; i < 5; i++) {
      d = go(l, setState(d, 'cnt_pb', { pressed: true }), 1);
      d = go(l, setState(d, 'cnt_pb', { pressed: false }), 1);
    }
    assert.equal(byId(d, 'kc').state.count, 5);
    assert.ok(on(l, d, 'pl_batch'), 'batch lamp lit at the preset');
    d = go(l, setState(d, 'rst_pb', { pressed: true }), 1);
    assert.equal(byId(d, 'kc').state.count, 0, 'reset clears the batch');
    d = go(l, setState(d, 'rst_pb', { pressed: false }), 1);
    d = go(l, setState(d, 'level', { pos: 1 }), 2);
    assert.ok(on(l, d, 'pl_p1') && !on(l, d, 'pl_p2'), 'pump 1 first');
    d = go(l, setState(go(l, setState(d, 'level', { pos: 0 }), 2), 'level', { pos: 1 }), 2);
    assert.ok(!on(l, d, 'pl_p1') && on(l, d, 'pl_p2'), 'then pump 2');
    d = go(l, d, 12); // clock x600: 5 min per step
    assert.ok(byId(d, 'ts').state.clockMin >= 1080, 'time switch clock reached 18:00');
    assert.ok(on(l, d, 'yard'), 'yard light on inside 18:00-22:00');
  }
  console.log('✓ four labs run through their objectives');
}

console.log('\nCONTROL MODULE TESTS PASSED');
