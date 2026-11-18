import assert from 'node:assert/strict';
import { dev, wire, solve, run, byId } from './helpers.mjs';
import { findAcDcCrossWires } from '../src/core/dcDomain.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };
const clone = (x) => JSON.parse(JSON.stringify(x));
const approx = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('--- Manual transfer switch ---');
{
  const grid = dev('kwh_meter_1p', 'grid');
  const gen = dev('generator_set_1p', 'gen', { running: true, runRequested: true });
  const mts = dev('transfer_switch_manual', 'mts');
  const lamp = dev('light_bulb', 'lamp');
  const wires = [
    wire('a', 'grid', 'l_out', 'mts', 'norm_l'), wire('b', 'grid', 'n_out', 'mts', 'norm_n', N),
    wire('c', 'gen', 'l_out', 'mts', 'gen_l'), wire('d', 'gen', 'n_out', 'mts', 'gen_n', N),
    wire('e', 'mts', 'load_l', 'lamp', 'hot'), wire('f', 'mts', 'load_n', 'lamp', 'neutral', N),
  ];
  const withPos = (position) => {
    const devices = clone([grid, gen, mts, lamp]);
    byId(devices, 'mts').state.position = position;
    return solve(devices, wires);
  };
  assert.equal(withPos('normal').nodeSource['mts:load_l'], 'grid');
  assert.equal(withPos('generator').nodeSource['mts:load_l'], 'gen');
  const off = withPos('off');
  assert.notEqual(off.nodePotentials['mts:load_l'], 'live', 'position 0 disconnects the load (break before make)');
  console.log('✓ I feeds from the grid, II from the generator, 0 isolates the load; the sources are never joined');
}

console.log('\n--- UPS with battery ---');
{
  const grid = dev('kwh_meter_1p', 'grid');
  const mains = dev('service_disconnect_2p', 'mains', { closed: true, ratedAmps: 63 });
  const ups = dev('ups_battery', 'ups', { capacityWh: 100, socPct: 100 });
  const heater = dev('appliance_water_heater', 'wh', { wattage: 1000 });
  const wires = [
    wire('a', 'grid', 'l_out', 'mains', 'in_l'), wire('b', 'grid', 'n_out', 'mains', 'in_n', N),
    wire('c', 'mains', 'out_l', 'ups', 'in_l'), wire('d', 'mains', 'out_n', 'ups', 'in_n', N),
    wire('e', 'ups', 'out_l', 'wh', 'line'), wire('f', 'ups', 'out_n', 'wh', 'neutral', N),
  ];
  let devices = run([grid, mains, ups, heater], wires, 4);
  assert.equal(!!byId(devices, 'wh').state.powered, true);
  assert.equal(byId(devices, 'ups').state.onBattery, false);
  assert.equal(byId(devices, 'ups').state.socPct, 100);
  console.log('✓ input live: load fed through, battery full');

  byId(devices, 'mains').state.closed = false;
  devices = run(devices, wires, 4);
  assert.equal(byId(devices, 'ups').state.onBattery, true, 'loss of input: the battery takes over');
  assert.equal(!!byId(devices, 'wh').state.powered, true, 'the load keeps running on battery');
  const soc1 = byId(devices, 'ups').state.socPct;
  assert.ok(soc1 < 100, 'the battery discharges');
  assert.ok(byId(devices, 'ups').state.autonomyMin < 20, 'autonomy follows the load');
  devices = run(devices, wires, 4);
  assert.ok(byId(devices, 'ups').state.socPct < soc1, 'and keeps discharging');
  console.log(`✓ input lost: battery carries the 1 kW load (charge ${soc1} %, autonomy ${byId(devices, 'ups').state.autonomyMin} min)`);

  devices = run(devices, wires, 80);
  assert.equal(byId(devices, 'ups').state.socPct, 0);
  assert.equal(!!byId(devices, 'wh').state.powered, false, 'empty battery: the output drops');
  console.log('✓ empty battery: output drops');

  byId(devices, 'mains').state.closed = true;
  devices = run(devices, wires, 6);
  assert.equal(!!byId(devices, 'wh').state.powered, true, 'input returns: load restored');
  assert.ok(byId(devices, 'ups').state.socPct > 0, 'and the charger refills the battery');
  console.log('✓ input returns: load restored, battery charging');
}

console.log('\n--- PV string, DC isolator, grid-tie inverter, net meter ---');
{
  const build = () => {
    const grid = dev('kwh_meter_1p', 'grid');
    const mains = dev('service_disconnect_2p', 'mains', { closed: true, ratedAmps: 63 });
    const net = dev('net_meter', 'net');
    const pv = dev('pv_string', 'pv', { kwp: 3, irradiance: 100 });
    const iso = dev('dc_isolator', 'iso');
    const inv = dev('inverter_gridtie', 'inv', { ratedW: 3000 });
    const heater = dev('appliance_water_heater', 'wh', { wattage: 1000 });
    const wires = [
      wire('g1', 'grid', 'l_out', 'mains', 'in_l'), wire('g2', 'grid', 'n_out', 'mains', 'in_n', N),
      wire('m1', 'mains', 'out_l', 'net', 'l_in'), wire('m2', 'mains', 'out_n', 'net', 'n_in', N),
      wire('s1', 'net', 'l_out', 'inv', 'out_l'), wire('s2', 'net', 'n_out', 'inv', 'out_n', N),
      wire('s3', 'net', 'l_out', 'wh', 'line'), wire('s4', 'net', 'n_out', 'wh', 'neutral', N),
      wire('d1', 'pv', 'pos', 'iso', 'in_pos', { color: '#dc2626' }), wire('d2', 'pv', 'neg', 'iso', 'in_neg', { color: '#0f172a' }),
      wire('d3', 'iso', 'out_pos', 'inv', 'pv_pos', { color: '#dc2626' }), wire('d4', 'iso', 'out_neg', 'inv', 'pv_neg', { color: '#0f172a' }),
    ];
    return { devices: [grid, mains, net, pv, iso, inv, heater], wires };
  };

  let { devices, wires } = build();
  devices = run(devices, wires, 16);
  let inv = byId(devices, 'inv').state;
  assert.equal(inv.status, 'EXPORTING');
  assert.equal(inv.acPowerW, 2880, '3 kWp x 96 % efficiency');
  let net = byId(devices, 'net').state;
  assert.equal(net.exportW, 2880 - net.loadW, 'surplus after the 1 kW load is exported');
  assert.ok(net.loadW > 900, `site load read at the meter (${net.loadW} W)`);
  assert.ok(net.exportKwh > 0, 'export register counts');
  console.log(`✓ sun: inverter exports ${inv.acPowerW} W, meter exports ${net.exportW} W (load ${net.loadW} W), ${net.exportKwh} kWh so far`);

  // Less sun than load: the meter imports
  byId(devices, 'pv').state.irradiance = 20;
  devices = run(devices, wires, 6);
  net = byId(devices, 'net').state;
  assert.ok(net.importW > 0 && net.exportW === 0, `cloudy: importing ${net.importW} W`);
  console.log('✓ low irradiance: the meter imports the shortfall');

  // Anti-islanding
  byId(devices, 'pv').state.irradiance = 100;
  byId(devices, 'mains').state.closed = false;
  devices = run(devices, wires, 6);
  inv = byId(devices, 'inv').state;
  assert.equal(inv.status, 'ANTI-ISLANDING: GRID LOST');
  assert.equal(inv.acPowerW, 0);
  assert.equal(!!byId(devices, 'wh').state.powered, false, 'the island stays dead: the inverter does not drive the net');
  console.log('✓ grid lost: inverter shuts down (anti-islanding), the island stays dead');

  byId(devices, 'mains').state.closed = true;
  devices = run(devices, wires, 2);
  assert.equal(byId(devices, 'inv').state.status, 'RECONNECTING');
  devices = run(devices, wires, 14);
  assert.equal(byId(devices, 'inv').state.status, 'EXPORTING');
  console.log('✓ grid back: 5 s reconnect delay, then it exports again');

  // Isolator open: no DC at the inverter
  byId(devices, 'iso').state.closed = false;
  devices = run(devices, wires, 4);
  assert.equal(byId(devices, 'inv').state.status, 'NO DC INPUT');
  console.log('✓ DC isolator open: the string is isolated');

  // The DC chain may not be wired to AC
  const bad = build();
  bad.wires.push(wire('x', 'pv', 'pos', 'mains', 'out_l', { color: '#dc2626' }));
  assert.ok(findAcDcCrossWires(bad.devices, bad.wires).length > 0, 'PV wired to an AC line is a cross-connection');
  assert.equal(findAcDcCrossWires(build().devices, build().wires).length, 0, 'the correct wiring is clean');
  console.log('✓ PV + wired to an AC line is reported as an AC/DC cross-connection');
}

console.log('\n--- Distribution transformers ---');
{
  const grid = dev('kwh_meter_1p', 'grid');
  const t = dev('transformer_1p_pole', 't', { kva: 1 });
  const heater = dev('appliance_water_heater', 'wh', { wattage: 800 });
  const wires = [
    wire('a', 'grid', 'l_out', 't', 'h1'), wire('b', 'grid', 'n_out', 't', 'h2', N),
    wire('c', 't', 'x1', 'wh', 'line'), wire('d', 't', 'x2', 'wh', 'neutral', N),
  ];
  const devices = run([grid, t, heater], wires, 2);
  const s = byId(devices, 't').state;
  assert.equal(s.primaryV, 230);
  assert.equal(s.secondaryUnloadedV, 120, '230 V / 1.91');
  assert.equal(!!byId(devices, 'wh').state.powered, true, 'the secondary drives a load');
  assert.ok(s.secondaryLoadedV < s.secondaryUnloadedV, `loaded ${s.secondaryLoadedV} V is below unloaded ${s.secondaryUnloadedV} V`);
  assert.ok(s.loadPct > 30, `${s.loadPct} % loaded`);
  console.log(`✓ 1-phase: 230 V -> ${s.secondaryUnloadedV} V unloaded, ${s.secondaryLoadedV} V at ${s.loadPct} % load`);

  const src = dev('source_3phase_440v', 'src');
  const t3 = dev('transformer_3p_delta_wye', 't3', { ratio: 2 });
  const motor = dev('motor_ac_industrial', 'mot', { wattage: 1500 });
  const w3 = [
    wire('p1', 'src', 'l1', 't3', 'h1'), wire('p2', 'src', 'l2', 't3', 'h2'), wire('p3', 'src', 'l3', 't3', 'h3'),
    wire('s1', 't3', 'x1', 'mot', 'u1'), wire('s2', 't3', 'x2', 'mot', 'v1'), wire('s3', 't3', 'x3', 'mot', 'w1'),
  ];
  const sol = solve([src, t3, motor], w3, 'PEC', 440);
  assert.equal(sol.nodePotentials['t3:x0'], 'neutral', 'the wye secondary has a neutral');
  assert.equal(sol.nodePhases['t3:x1'], 'L1');
  assert.equal(sol.nodePhases['t3:x3'], 'L3');
  assert.equal(sol.nodeVoltages['t3:x1'], Math.round(220 / Math.sqrt(3)), '440 V / 2 = 220 V line, 127 V to neutral');
  assert.equal(t3.state.secondaryUnloadedV, 220);
  assert.equal(!!motor.state.running, true, 'a motor runs from the secondary');
  console.log('✓ 3-phase delta-wye: 440 V / 2 = 220 V line, 127 V to neutral, phases carried to the secondary');
  const dead = solve([dev('source_3phase_440v', 'src', { closed: false }), dev('transformer_3p_delta_wye', 't3')], [wire('p1', 'src', 'l1', 't3', 'h1')], 'PEC', 440);
  assert.notEqual(dead.nodePotentials['t3:x1'], 'live', 'no complete primary, no secondary');
}

console.log('\n--- Capacitor bank and power factor controller ---');
{
  const build = (motors) => {
    const src = dev('source_3phase_440v', 'src');
    const bank = dev('capacitor_bank_3p', 'bank');
    const pfc = dev('pf_controller', 'pfc');
    const loads = Array.from({ length: motors }, (_, i) => dev('motor_ac_industrial', `m${i}`, { wattage: 3000 }));
    const wires = [
      wire('b1', 'src', 'l1', 'bank', 'l1'), wire('b2', 'src', 'l2', 'bank', 'l2'), wire('b3', 'src', 'l3', 'bank', 'l3'),
      wire('p1', 'src', 'l1', 'pfc', 'a1'), wire('p2', 'src', 'l2', 'pfc', 'a2'),
      wire('p3', 'src', 'l1', 'pfc', 'com'),
      wire('c1', 'pfc', 'k1', 'bank', 'c1'), wire('c2', 'pfc', 'k2', 'bank', 'c2'), wire('c3', 'pfc', 'k3', 'bank', 'c3'), wire('c4', 'pfc', 'k4', 'bank', 'c4'),
      wire('cn', 'src', 'l2', 'bank', 'cn'),
    ];
    loads.forEach((m, i) => {
      wires.push(wire(`u${i}`, 'src', 'l1', m.id, 'u1'), wire(`v${i}`, 'src', 'l2', m.id, 'v1'), wire(`w${i}`, 'src', 'l3', m.id, 'w1'));
    });
    return { devices: [src, bank, pfc, ...loads], wires };
  };

  const { devices: d0, wires } = build(2);
  let devices = run(d0, wires, 14, 0.5, { volts: 440 });
  const pfc = byId(devices, 'pfc').state;
  const bank = byId(devices, 'bank').state;
  assert.ok(pfc.stepsCmd >= 1, `controller commands a step (${pfc.stepsCmd})`);
  assert.equal(bank.stepsOn, pfc.stepsCmd, 'the bank follows the controller');
  assert.ok(pfc.pf >= 0.95, `power factor corrected to ${pfc.pf} (target 0.95)`);
  assert.ok(pfc.pf < 1.001);
  console.log(`✓ lagging plant: ${pfc.stepsCmd} step(s) in, power factor ${pfc.pf} (kW ${pfc.kw}, kvar ${pfc.kvar})`);

  // Without the bank the plant is lagging
  const lag = clone(d0);
  byId(lag, 'pfc').state.targetPf = 0.5;
  assert.ok(run(lag, wires, 1, 0.5, { volts: 440 }) && true);

  // Over-correction: steps commanded with no load come back out
  const over = clone(build(0).devices);
  const ow = build(0).wires;
  byId(over, 'pfc').state.stepsCmd = 3;
  const overRun = run(over, ow, 14, 0.5, { volts: 440 });
  assert.equal(byId(overRun, 'pfc').state.stepsCmd, 0, 'leading plant: the controller removes the steps again');
  console.log('✓ over-correction (leading): the controller steps back out');

  // Discharge lock: a step that was just switched out cannot come straight back
  const probe = [dev('source_3phase_440v', 'src'), dev('capacitor_bank_3p', 'bank')];
  const pw = [
    wire('a', 'src', 'l1', 'bank', 'l1'), wire('b', 'src', 'l2', 'bank', 'l2'), wire('c', 'src', 'l3', 'bank', 'l3'),
    wire('cn', 'src', 'l2', 'bank', 'cn'), wire('k', 'src', 'l1', 'bank', 'c1'),
  ];
  let bd = run(probe, pw, 3, 0.5, { volts: 440 });
  assert.equal(byId(bd, 'bank').state.on1, true, 'step 1 switched in');
  const cut = clone(bd);
  const kw = pw.filter((w) => w.id !== 'k');
  bd = run(cut, kw, 1, 0.5, { volts: 440 });
  assert.equal(byId(bd, 'bank').state.on1, false);
  assert.ok(byId(bd, 'bank').state.lock1 > 0, 'step is locked while it discharges');
  bd = run(bd, pw, 1, 0.5, { volts: 440 }); // command again straight away
  assert.equal(byId(bd, 'bank').state.on1, false, 'cannot re-engage during the discharge time');
  bd = run(bd, pw, 8, 0.5, { volts: 440 });
  assert.equal(byId(bd, 'bank').state.on1, true, 'and comes back after 3 s');
  console.log('✓ capacitor discharge lock: no re-engage for 3 s after switching out');
}

console.log('\n--- Shore connection box ---');
{
  const build = (lines, closed = true) => {
    const src = dev('source_3phase_440v', 'src');
    const box = dev('shore_connection_box', 'box', { closed });
    const wires = lines.map((l, i) => l && wire(`w${i}`, 'src', l, 'box', `in_l${i + 1}`)).filter(Boolean);
    const devices = clone([src, box]);
    return { devices: run(devices, wires, 2, 0.5, { volts: 440 }), wires };
  };
  let { devices } = build(['l1', 'l2', 'l3']);
  assert.equal(byId(devices, 'box').state.seqOk, true);
  ({ devices } = build(['l1', 'l3', 'l2']));
  assert.equal(byId(devices, 'box').state.seqFault, 'WRONG SEQUENCE');
  ({ devices } = build(['l1', 'l2', null]));
  assert.equal(byId(devices, 'box').state.seqFault, 'LOST PHASE');
  ({ devices } = build([null, null, null]));
  assert.equal(byId(devices, 'box').state.seqFault, 'NO SHORE POWER');
  console.log('✓ sequence lamp: OK / WRONG SEQUENCE / LOST PHASE / NO SHORE POWER');

  const closedRun = build(['l1', 'l2', 'l3']);
  const sol = solve(closedRun.devices, closedRun.wires, 'PEC', 440);
  assert.equal(sol.nodePotentials['box:out_l1'], 'live');
  const open = build(['l1', 'l2', 'l3'], false);
  assert.notEqual(solve(open.devices, open.wires, 'PEC', 440).nodePotentials['box:out_l1'], 'live');
  console.log('✓ closed: the ship side is live; open: dead');
}

console.log('\n--- Ground detection lamps on an IT system ---');
{
  const build = (earthing, faultLines) => {
    const src = dev('source_3phase_440v', 'src', { earthing });
    const gd = dev('ground_detection_lamps', 'gd');
    const bar = dev('earth_busbar', 'bar', { isEarth: true });
    const wires = [
      wire('a', 'src', 'l1', 'gd', 'l1'), wire('b', 'src', 'l2', 'gd', 'l2'), wire('c', 'src', 'l3', 'gd', 'l3'),
      wire('e', 'bar', 'pe_1', 'gd', 'pe', { color: '#16a34a', conductorRole: 'earth_ground' }),
    ];
    faultLines.forEach((l, i) => wires.push(wire(`f${i}`, 'src', l, 'bar', `pe_${i + 2}`, { color: '#dc2626' })));
    const devices = clone([src, gd, bar]);
    const out = run(devices, wires, 2, 0.5, { volts: 440 });
    const solved = solve(out, wires, 'PEC', 440);
    return { out, solved };
  };

  let r = build('isolated', []);
  assert.deepEqual(['lamp1', 'lamp2', 'lamp3'].map((k) => byId(r.out, 'gd').state[k]), ['dim', 'dim', 'dim']);
  console.log('✓ healthy: three lamps glow evenly');

  r = build('isolated', ['l1']);
  assert.deepEqual(['lamp1', 'lamp2', 'lamp3'].map((k) => byId(r.out, 'gd').state[k]), ['dark', 'bright', 'bright']);
  assert.equal(r.solved.sparks.length, 0, 'no arc / short on the first fault');
  assert.equal(r.solved.trippedDevices.length, 0, 'nothing trips on the first earth fault');
  assert.equal(byId(r.out, 'gd').state.faultPhase, 'L1');
  console.log('✓ first earth fault on L1: its lamp out, the others bright, nothing trips');

  r = build('isolated', ['l1', 'l2']);
  assert.ok(r.solved.faults.length > 0 && r.solved.sparks.length > 0, 'a second earth fault on another line is a real fault (line-to-line through earth)');
  console.log('✓ second earth fault on L2: now a fault');

  r = build('solid', ['l1']);
  assert.ok(r.solved.faults.some((f) => f.kind === 'phase_earth'), 'an earthed (TN) system short-circuits on the first fault, as before');
  console.log('✓ solidly earthed feeder: the first earth fault is a short circuit (unchanged)');
}

console.log('\n--- Synchroscope ---');
{
  const build = (offset) => {
    const a = dev('generator_set_1p', 'ga', { runRequested: true, running: true });
    const b = dev('generator_set_1p', 'gb', { runRequested: true, running: true, freqOffsetHz: offset });
    const sy = dev('synchroscope', 'sy');
    const lamp = dev('light_bulb', 'lamp');
    const wires = [
      wire('a1', 'ga', 'l_out', 'sy', 'bus_l'), wire('a2', 'ga', 'n_out', 'sy', 'bus_n', N),
      wire('b1', 'gb', 'l_out', 'sy', 'inc_l'), wire('b2', 'gb', 'n_out', 'sy', 'inc_n', N),
      wire('p1', 'ga', 'l_out', 'sy', 'perm_a'), wire('p2', 'sy', 'perm_b', 'lamp', 'hot'), wire('p3', 'ga', 'n_out', 'lamp', 'neutral', N),
    ];
    return { devices: [a, b, sy, lamp], wires };
  };
  let { devices, wires } = build(0);
  devices = run(devices, wires, 4);
  assert.equal(byId(devices, 'sy').state.inSync, true, 'same frequency, same angle');
  assert.equal(!!byId(devices, 'lamp').state.lit, true, 'permissive contact closes');
  console.log('✓ in sync: permissive contact closes');

  ({ devices, wires } = build(0.5));
  devices = run(devices, wires, 6);
  const sy = byId(devices, 'sy').state;
  assert.equal(sy.inSync, false);
  assert.equal(sy.deltaHz, 0.5);
  assert.equal(sy.status, 'INCOMING FAST');
  assert.ok(Math.abs(sy.phaseDiffDeg) > 20, `phase difference slips (${sy.phaseDiffDeg}°)`);
  assert.equal(!!byId(devices, 'lamp').state.lit, false, 'no permissive out of sync');
  console.log(`✓ incoming set 0.5 Hz fast: phase difference slips (${sy.phaseDiffDeg}°), INCOMING FAST, no permissive`);

  ({ devices, wires } = build(0.2));
  devices = run(devices, wires, 2);
  assert.equal(byId(devices, 'sy').state.inSync, true, 'inside 10 degrees and 0.25 Hz');
  devices = run(devices, wires, 4);
  assert.equal(byId(devices, 'sy').state.inSync, false, 'the window closes as the phase slips');
  console.log('✓ the synchronising window is 10° and 0.25 Hz');
}

console.log('\n--- Reverse power and preferential trip relays ---');
{
  const rp = (() => {
    const gen = dev('generator_set_1p', 'gen', { runRequested: true, running: true });
    const relay = dev('reverse_power_relay', 'rp', { delaySec: 3 });
    const lamp = dev('light_bulb', 'lamp');
    const wires = [
      wire('s1', 'gen', 'l_out', 'rp', 'sense_l'), wire('s2', 'gen', 'n_out', 'rp', 'sense_n', N),
      wire('c1', 'gen', 'l_out', 'rp', 'com_15'), wire('c2', 'rp', 'no_18', 'lamp', 'hot'), wire('c3', 'gen', 'n_out', 'lamp', 'neutral', N),
    ];
    return { devices: [gen, relay, lamp], wires };
  })();
  let devices = run(rp.devices, rp.wires, 4);
  assert.equal(byId(devices, 'rp').state.tripped, false);
  byId(devices, 'gen').state.motoring = true;
  devices = run(devices, rp.wires, 4); // 2 s: below the 3 s delay
  assert.equal(byId(devices, 'rp').state.tripped, false, 'not before the delay');
  devices = run(devices, rp.wires, 4);
  assert.equal(byId(devices, 'rp').state.tripped, true, 'motoring for 3 s trips the relay');
  assert.equal(!!byId(devices, 'lamp').state.lit, true, 'its contact closes');
  byId(devices, 'gen').state.motoring = false;
  devices = run(devices, rp.wires, 2);
  assert.equal(byId(devices, 'rp').state.tripped, false, 'released when the condition clears');
  console.log('✓ reverse power: trips after the delay, releases when the set stops motoring');

  // Preferential trip sheds a feeder before the set trips on overload
  const build = (withRelay) => {
    const gen = dev('generator_set_3p', 'gen', { runRequested: true, running: true, ratedKva: 7 });
    const essential = dev('motor_ac_industrial', 'm1', { wattage: 2200 });
    const other = dev('motor_ac_industrial', 'm2', { wattage: 2200 });
    const feeder = dev('mccb_3p', 'q2', { shuntTrip: true, closed: true, tripped: false });
    const relay = dev('preferential_trip_relay', 'pt', { thresholdPct: 90, delaySec: 0.5 });
    const wires = [
      wire('e1', 'gen', 'l1_out', 'm1', 'u1'), wire('e2', 'gen', 'l2_out', 'm1', 'v1'), wire('e3', 'gen', 'l3_out', 'm1', 'w1'),
      wire('f1', 'gen', 'l1_out', 'q2', 'in_l1'), wire('f2', 'gen', 'l2_out', 'q2', 'in_l2'), wire('f3', 'gen', 'l3_out', 'q2', 'in_l3'),
      wire('g1', 'q2', 'out_l1', 'm2', 'u1'), wire('g2', 'q2', 'out_l2', 'm2', 'v1'), wire('g3', 'q2', 'out_l3', 'm2', 'w1'),
    ];
    const devices = [gen, essential, other, feeder];
    if (withRelay) {
      devices.push(relay);
      wires.push(
        wire('s1', 'gen', 'l1_out', 'pt', 'sense_l'), wire('s2', 'gen', 'l2_out', 'pt', 'sense_n'),
        wire('c1', 'gen', 'l1_out', 'pt', 'com_15'), wire('c2', 'pt', 'no_18', 'q2', 'sht_a1'), wire('c3', 'gen', 'l2_out', 'q2', 'sht_a2')
      );
    }
    return { devices, wires };
  };

  const without = build(false);
  const noRelay = run(without.devices, without.wires, 16, 0.5, { volts: 440 });
  assert.equal(byId(noRelay, 'gen').state.overloaded, true, 'without the relay the set trips on overload');

  const withR = build(true);
  const shed = run(withR.devices, withR.wires, 16, 0.5, { volts: 440 });
  assert.equal(byId(shed, 'pt').state.tripped, true, 'the relay trips first');
  assert.equal(byId(shed, 'q2').state.tripped, true, 'and sheds the non-essential feeder through its shunt trip');
  assert.equal(!!byId(shed, 'gen').state.overloaded, false, 'the set survives');
  assert.equal(!!byId(shed, 'm1').state.running, true, 'the essential load keeps running');
  assert.equal(!!byId(shed, 'm2').state.running, false, 'the non-essential load is shed');
  console.log('✓ preferential trip: feeder shed before the 2 s overload trip, set and essential load survive');
}
console.log('POWER SYSTEMS TESTS PASSED');
