import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { applyProtectiveOutcome, tickSimulation } from '../src/core/simulationTick.ts';
import { tickProcess, DEFAULT_PROCESS } from '../src/core/process.ts';
import { rvStartMultiple } from '../src/core/behaviors/drives.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
let seq = 0;
const w = (a, at, b, bt, extra) => wire(`d${++seq}`, a, at, b, bt, { wireGauge: '12 AWG (3.5 mm²)', ...extra });
const three = (a, ats, b, bts) => ats.map((t, i) => w(a, t, b, bts[i]));
const opts = { volts: 440 };
const go = (devices, wires, n) => run(devices, wires, n, 0.5, opts);
const src = () => dev('source_3phase_440v', 'src');
const setState = (devices, id, patch) => {
  const d = clone(devices);
  Object.assign(byId(d, id).state, patch);
  return d;
};
/** coil on line-to-line 440 V: A1 from L1, A2 from L2 */
const coil = (id) => [w('src', 'l1', id, 'a1'), w('src', 'l2', id, 'a2')];

console.log('--- Soft starter ---');
{
  const make = (soft) => {
    const devices = [src(), dev('mcb_3p', 'q', { ratedAmps: 16, tripCurve: 'C' }), dev('motor_ac_industrial', 'm', { wattage: 2200 }), ...(soft ? [dev('soft_starter', 'ss', { rampSec: 2, startMult: 3 })] : [])];
    const wires = [
      ...three('src', ['l1', 'l2', 'l3'], 'q', ['in_l1', 'in_l2', 'in_l3']),
      ...(soft
        ? [...three('q', ['out_l1', 'out_l2', 'out_l3'], 'ss', ['l1', 'l2', 'l3']), ...three('ss', ['t1', 't2', 't3'], 'm', ['u1', 'v1', 'w1']), ...coil('ss')]
        : three('q', ['out_l1', 'out_l2', 'out_l3'], 'm', ['u1', 'v1', 'w1'])),
    ];
    return { devices, wires };
  };
  const dol = make(false);
  const dolSolved = solveCircuit(dol.devices, dol.wires, 'PEC', 440);
  const dolInrush = dolSolved.inrushByDevice.q;
  assert.ok(dolInrush > 0, 'DOL inrush recorded at the breaker');
  let s = make(true);
  s.devices = go(s.devices, s.wires, 1);
  assert.ok(byId(s.devices, 'ss').state.on && byId(s.devices, 'ss').state.phase === 'ramp', 'command on: ramping');
  s.devices = go(s.devices, s.wires, 1);
  assert.ok(byId(s.devices, 'm').state.running, 'the motor runs through the soft starter');
  const softInrush = solveCircuit(s.devices, s.wires, 'PEC', 440).inrushByDevice.q;
  assert.ok(Math.abs(softInrush / dolInrush - 0.5) < 0.02, `soft start draws half the DOL inrush (${softInrush} vs ${dolInrush})`);
  const early = byId(s.devices, 'ss').state.rampPct;
  assert.ok(early > 30 && early < 100, `ramp in progress (${early} %)`);
  s.devices = go(s.devices, s.wires, 4);
  assert.equal(byId(s.devices, 'ss').state.phase, 'done', 'ramp complete');
  assert.equal(byId(s.devices, 'ss').state.rampPct, 100);
  const off = go(setState(s.devices, 'ss', {}), s.wires.filter((x) => x.toTerminalId !== 'a2'), 2);
  assert.ok(!byId(off, 'ss').state.on && !byId(off, 'm').state.running, 'command removed: the motor stops');
  console.log('✓ ramp, motor runs, inrush limited to 3 x instead of 6 x, stops with the command');
}

console.log('\n--- Reduced-voltage starter ---');
{
  assert.ok(Math.abs(rvStartMultiple({ method: 'autotransformer', tapPct: 65 }) - 6 * 0.65 * 0.65) < 1e-9);
  assert.ok(Math.abs(rvStartMultiple({ method: 'primary_resistor', resistorDropPct: 30 }) - 4.2) < 1e-9);
  assert.equal(rvStartMultiple({ method: 'part_winding' }), 3);
  const devices = [src(), dev('starter_reduced_voltage', 'rv', { method: 'part_winding', startSec: 2 }), dev('motor_ac_industrial', 'm1'), dev('motor_ac_industrial', 'm2')];
  const wires = [...three('src', ['l1', 'l2', 'l3'], 'rv', ['l1', 'l2', 'l3']), ...coil('rv'), ...three('rv', ['t1', 't2', 't3'], 'm1', ['u1', 'v1', 'w1']), ...three('rv', ['r1', 'r2', 'r3'], 'm2', ['u1', 'v1', 'w1'])];
  let d = go(devices, wires, 3);
  assert.equal(byId(d, 'rv').state.phase, 'start');
  assert.ok(byId(d, 'm1').state.running && !byId(d, 'm2').state.running, 'part winding: first winding only while starting');
  d = go(d, wires, 4);
  assert.equal(byId(d, 'rv').state.phase, 'run');
  assert.ok(byId(d, 'm2').state.running, 'second winding joins at the end of the start time');
  console.log('✓ start multiples per method; part winding adds the second winding after the start time');
}

console.log('\n--- Dahlander motor ---');
{
  const make = (extra) => ({ devices: [src(), dev('motor_dahlander', 'm')], wires: extra });
  const low = make(three('src', ['l1', 'l2', 'l3'], 'm', ['u1', 'v1', 'w1']));
  let d = go(low.devices, low.wires, 4);
  assert.equal(byId(d, 'm').state.speedSet, 'low');
  assert.ok(byId(d, 'm').state.speedPct >= 50 - 0.1, `low speed ${byId(d, 'm').state.speedPct}`);
  const star = [w('m', 'u1', 'm', 'v1'), w('m', 'v1', 'm', 'w1')];
  const high = make([...three('src', ['l1', 'l2', 'l3'], 'm', ['u2', 'v2', 'w2']), ...star]);
  d = go(high.devices, high.wires, 8);
  assert.equal(byId(d, 'm').state.speedSet, 'high');
  assert.ok(byId(d, 'm').state.speedPct > 90, 'high speed reached');
  const noStar = make(three('src', ['l1', 'l2', 'l3'], 'm', ['u2', 'v2', 'w2']));
  d = go(noStar.devices, noStar.wires, 3);
  assert.ok(!byId(d, 'm').state.running && /star/i.test(byId(d, 'm').state.fault3), 'high speed without the star point is refused');
  const both = make([...three('src', ['l1', 'l2', 'l3'], 'm', ['u1', 'v1', 'w1']), ...three('src', ['l1', 'l2', 'l3'], 'm', ['u2', 'v2', 'w2'])]);
  d = go(both.devices, both.wires, 3);
  assert.ok(!byId(d, 'm').state.running && /BOTH/.test(byId(d, 'm').state.fault3), 'both sets live: interlock fault');
  console.log('✓ low speed, high speed with the star point, and both fault cases');
}

console.log('\n--- Wound-rotor motor and rotor bank ---');
{
  const stator = three('src', ['l1', 'l2', 'l3'], 'm', ['u1', 'v1', 'w1']);
  const rotorWires = ['k', 'l', 'm'].map((t) => w('m', t, 'rb', t));
  const mk = (withBank) => [src(), dev('motor_wound_rotor', 'm'), ...(withBank ? [dev('rotor_resistor_bank', 'rb')] : [])];
  let d = go(mk(false), stator, 8);
  assert.ok(byId(d, 'm').state.speedPct === 0 && /ROTOR OPEN/.test(byId(d, 'm').state.rotorNote), 'no bank: rotor open, no torque');
  const wires = [...stator, ...rotorWires, w('src', 'l1', 'rb', 'c1'), w('src', 'l2', 'rb', 'cn')];
  d = go(mk(true), wires, 12);
  assert.equal(byId(d, 'rb').state.stages, 1);
  const s1 = byId(d, 'm').state.speedPct;
  assert.ok(s1 >= 54 && s1 <= 56, `one stage shorted: about 55 % (${s1})`);
  const all = [...wires, w('src', 'l1', 'rb', 'c2'), w('src', 'l1', 'rb', 'c3')];
  d = go(mk(true), all, 20);
  assert.equal(byId(d, 'rb').state.stages, 3, 'three stages');
  assert.ok(byId(d, 'm').state.speedPct > 95, 'all stages in: near full speed');
  const skip = go(mk(true), [...stator, ...rotorWires, w('src', 'l1', 'rb', 'c3'), w('src', 'l2', 'rb', 'cn')], 4);
  assert.equal(byId(skip, 'rb').state.stages, 0, 'stage 3 alone does not count');
  console.log('✓ rotor open without a bank; the speed steps up as stages are shorted in order');
}

console.log('\n--- DC shunt motor (24 V) ---');
{
  const grid = dev('kwh_meter_1p', 'grid');
  const psu = dev('psu_24vdc', 'psu');
  const m = dev('motor_dc_shunt', 'm', { startSec: 3 });
  const N = { color: '#0f172a', conductorRole: 'return_neutral' };
  const wires = [
    wire('a', 'grid', 'l_out', 'psu', 'in_l'), wire('b', 'grid', 'n_out', 'psu', 'in_n', N),
    wire('c', 'psu', 'v_pos', 'm', 'a_pos'), wire('d', 'psu', 'v_neg', 'm', 'a_neg'),
    wire('e', 'psu', 'v_pos', 'm', 'f_pos'), wire('f', 'psu', 'v_neg', 'm', 'f_neg'),
  ];
  let d = run([grid, psu, m], wires, 14);
  assert.ok(byId(d, 'm').state.armPowered && byId(d, 'm').state.fieldPowered, 'both windings on 24 V');
  assert.equal(byId(d, 'm').state.starterStep, 3, 'starter fully out');
  assert.ok(byId(d, 'm').state.speedPct > 95 && !byId(d, 'm').state.overspeed, 'normal running speed');
  const noField = run([dev('kwh_meter_1p', 'grid'), dev('psu_24vdc', 'psu'), dev('motor_dc_shunt', 'm', { startSec: 3 })], wires.filter((x) => x.toTerminalId !== 'f_pos'), 40);
  assert.ok(byId(noField, 'm').state.overspeed && byId(noField, 'm').state.speedPct > 150, `field loss: runaway (${byId(noField, 'm').state.speedPct})`);
  console.log('✓ timed starter, normal speed, and runaway when the field is lost');
}

console.log('\n--- Brake motor and DC injection ---');
{
  const m = dev('motor_brake', 'm');
  const wires = [...three('src', ['l1', 'l2', 'l3'], 'm', ['u1', 'v1', 'w1']), w('src', 'l1', 'm', 'br1'), w('src', 'l2', 'm', 'br2')];
  let d = go([src(), m], wires, 6);
  assert.ok(byId(d, 'm').state.running && byId(d, 'm').state.speedPct > 90, 'brake released: runs');
  d = go(d, wires.filter((x) => !x.toTerminalId.startsWith('br')), 2);
  assert.ok(byId(d, 'm').state.speedPct === 0 && !byId(d, 'm').state.running, 'coil dropped: the brake stops it at once');
  const locked = go([src(), dev('motor_brake', 'm')], three('src', ['l1', 'l2', 'l3'], 'm', ['u1', 'v1', 'w1']), 3);
  assert.ok(byId(locked, 'm').state.locked && byId(locked, 'm').state.speedPct === 0, 'power without the brake coil: locked rotor');

  // DC injection: braking after the run command drops, and a zero-speed switch sees the shorter stop
  const grid = dev('kwh_meter_1p', 'grid');
  const N = { color: '#0f172a', conductorRole: 'return_neutral' };
  const sw = dev('switch_1gang', 'run', { closed: true });
  const ib = dev('dc_injection_brake', 'ib', { brakeSec: 3 });
  const iw = [wire('a', 'grid', 'l_out', 'ib', 'l'), wire('b', 'grid', 'n_out', 'ib', 'n', N), wire('c', 'grid', 'l_out', 'run', 'l_in'), wire('d', 'run', 'sw_out', 'ib', 'a1'), wire('e', 'grid', 'n_out', 'ib', 'a2', N)];
  let e = run([grid, sw, ib], iw, 3);
  assert.ok(!byId(e, 'ib').state.braking, 'running: no braking');
  e = run(setState(e, 'run', { closed: false }), iw, 1);
  assert.ok(byId(e, 'ib').state.braking, 'run command dropped: injecting DC');
  e = run(e, iw, 8);
  assert.ok(!byId(e, 'ib').state.braking, 'the brake time ends the injection');
  console.log('✓ brake motor spring brake and DC injection timing');
}

console.log('\n--- VFD speed potentiometer ---');
{
  const devices = [dev('vfd_drive', 'vfd'), dev('speed_potentiometer', 'pot', { value: 50, vfdId: 'vfd' })];
  let d = run(devices, [], 1);
  assert.equal(byId(d, 'vfd').state.freqHz, 30, '50 % of 60 Hz');
  d = run(setState(d, 'pot', { value: 100 }), [], 1);
  assert.equal(byId(d, 'vfd').state.freqHz, 60);
  const unlinked = run([dev('vfd_drive', 'vfd', { freqHz: 42 }), dev('speed_potentiometer', 'pot', { value: 10 })], [], 1);
  assert.equal(byId(unlinked, 'vfd').state.freqHz, 42, 'an unlinked pot leaves the drive alone');
  console.log('✓ a linked pot sets the drive frequency');
}

console.log('\n--- Submersible pump, compressor, hoist ---');
{
  const step = (project, dt = 0.5) => {
    const solved = solveCircuit(project.devices, project.wires, 'PEC', 440);
    let devices = applyProtectiveOutcome(project.devices, solved);
    devices = tickSimulation(devices, project.wires, solved, 60, dt, project.process);
    return { ...project, devices, process: tickProcess(devices, project.process, dt) };
  };
  const steps = (p, n) => { for (let i = 0; i < n; i++) p = step(p); return p; };
  const wiresFor = (id) => three('src', ['l1', 'l2', 'l3'], id, ['u1', 'v1', 'w1']);
  let sub = steps({ devices: [src(), dev('pump_submersible_3p', 'p')], wires: wiresFor('p'), process: { ...DEFAULT_PROCESS, tankLevel: 40, lineBar: 0, drawOffLpm: 0 } }, 6);
  assert.ok(byId(sub.devices, 'p').state.pumping && sub.process.tankLevel > 40 && sub.process.lineBar > 0, 'submersible pump fills the tank and raises the pressure');
  let comp = steps({ devices: [src(), dev('air_compressor_3p', 'c')], wires: wiresFor('c'), process: { ...DEFAULT_PROCESS, tankLevel: 40, lineBar: 0, drawOffLpm: 0 } }, 6);
  assert.ok(comp.process.lineBar > 0 && comp.process.tankLevel === 40, 'compressor raises the pressure only');

  const hoistWires = (swap) => three('src', ['l1', swap ? 'l3' : 'l2', swap ? 'l2' : 'l3'], 'h', ['u1', 'v1', 'w1']);
  let up = go([src(), dev('hoist_conveyor', 'h', { position: 10, ratePctPerSec: 10 })], hoistWires(false), 6);
  assert.ok(byId(up, 'h').state.position > 10, `forward raises the load (${byId(up, 'h').state.position})`);
  let down = go([src(), dev('hoist_conveyor', 'h', { position: 50, ratePctPerSec: 10 })], hoistWires(true), 6);
  assert.ok(byId(down, 'h').state.position < 50, 'reverse lowers it');
  const top = go([src(), dev('hoist_conveyor', 'h', { position: 97, ratePctPerSec: 10 })], hoistWires(false), 14);
  assert.equal(byId(top, 'h').state.position, 100);
  assert.ok(byId(top, 'h').state.stalled, 'driven into the end stop: stall');
  const lamp = dev('pilot_light_indicator', 'lamp');
  const grid = dev('kwh_meter_1p', 'grid');
  const N = { color: '#0f172a', conductorRole: 'return_neutral' };
  const limitWires = [wire('a', 'grid', 'l_out', 'h', 'nc_11'), wire('b', 'h', 'nc_12', 'lamp', 'x1'), wire('c', 'grid', 'n_out', 'lamp', 'x2', N)];
  assert.ok(solve([grid, dev('hoist_conveyor', 'h', { position: 50 }), lamp], limitWires).deviceEnergized.lamp, 'mid travel: the upper limit contact is closed');
  assert.ok(!solve([dev('kwh_meter_1p', 'grid'), dev('hoist_conveyor', 'h', { position: 99 }), dev('pilot_light_indicator', 'lamp')], limitWires).deviceEnergized.lamp, 'at the top the upper limit contact opens');
  console.log('✓ pump and compressor feed the process; hoist travels, stalls and opens its limit contacts');
}

console.log('\n--- Labs ---');
{
  const load = (id) => {
    const lab = LAB_LESSONS.find((l) => l.id === id);
    assert.ok(lab, `${id} registered`);
    const ids = new Set(lab.project.devices.map((d) => d.id));
    for (const x of lab.project.wires) assert.ok(ids.has(x.fromDeviceId) && ids.has(x.toDeviceId), `${id}: wire ${x.id} references real devices`);
    return clone(lab.project);
  };
  {
    const p = load('lab-drv-soft-starter');
    let d = go(setState(p.devices, 'start', { pos: 1 }), p.wires, 4);
    assert.ok(byId(d, 'ss').state.on && byId(d, 'm1').state.running, 'soft start lab: motor runs');
    d = go(d, p.wires, 14);
    assert.equal(byId(d, 'ss').state.phase, 'done');
  }
  {
    const p = load('lab-drv-wound-rotor');
    let d = go(p.devices, p.wires, 12);
    assert.ok(byId(d, 'm1').state.running && byId(d, 'm1').state.speedPct >= 34 && byId(d, 'm1').state.speedPct <= 36, 'wound rotor lab: slow with all resistance in');
    d = go(setState(setState(setState(d, 'st1', { pos: 1 }), 'st2', { pos: 1 }), 'st3', { pos: 1 }), p.wires, 20);
    assert.ok(byId(d, 'm1').state.speedPct > 95, 'all stages shorted: full speed');
  }
  {
    const p = load('lab-drv-compressor-pressure');
    const step = (project) => {
      const solved = solveCircuit(project.devices, project.wires, 'PEC', 440);
      let devices = applyProtectiveOutcome(project.devices, solved);
      devices = tickSimulation(devices, project.wires, solved, 60, 0.5, project.process);
      return { ...project, devices, process: tickProcess(devices, project.process, 0.5) };
    };
    let q = { ...p, process: { ...DEFAULT_PROCESS, lineBar: 1, drawOffLpm: 10, tankLevel: 50 } };
    let peak = 0;
    let starts = 0;
    let was = false;
    for (let i = 0; i < 400; i++) {
      q = step(q);
      peak = Math.max(peak, q.process.lineBar);
      const on = !!byId(q.devices, 'c1').state.running;
      if (on && !was) starts++;
      was = on;
    }
    assert.ok(peak >= 3.4 && peak < 4.2, `pressure stops near the 3.5 bar cut-out (peak ${peak})`);
    assert.ok(starts >= 2, `the compressor cycles on the pressure switch (${starts} starts)`);
  }
  console.log('✓ three labs run through their objectives');
}

console.log('\nDRIVE TESTS PASSED');
