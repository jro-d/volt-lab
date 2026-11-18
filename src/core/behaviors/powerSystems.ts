import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior, TickContext } from './types';
import { terminalCurrent, withState } from './util';

/**
 * Batch 3.2 - sources and power systems. Behaviours here are deliberately simple teaching models; the
 * simplifications are listed in the README ("Sources and power systems").
 */

const CW_SEQUENCES = ['L1,L2,L3', 'L2,L3,L1', 'L3,L1,L2'];
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const live = (ctx: TickContext, key: string) => ctx.solved.nodePotentials[key] === 'live';
const neutral = (ctx: TickContext, key: string) => ctx.solved.nodePotentials[key] === 'neutral';

/** A coil / control input between a hot and a return terminal (either way round). */
const coilOn = (ctx: TickContext, id: string, a: string, b: string) => {
  const ka = `${id}:${a}`;
  const kb = `${id}:${b}`;
  if ((live(ctx, ka) && neutral(ctx, kb)) || (live(ctx, kb) && neutral(ctx, ka))) return true;
  // line-to-line control supply: two live nodes on different phases
  const pa = ctx.solved.nodePhases[ka];
  const pb = ctx.solved.nodePhases[kb];
  return live(ctx, ka) && live(ctx, kb) && !!pa && !!pb && pa !== pb;
};

// ── Manual transfer switch ────────────────────────────────────────────────────────────────────
/**
 * Manual changeover switch I - 0 - II. The handle has to pass through the 0 (off) position, so the load is
 * always disconnected before it is reconnected (break-before-make) and the two sources can never be joined
 * (mechanical interlock). The handle is operated on the device face.
 */
export const manualTransferBehavior: DeviceBehavior = {
  types: ['transfer_switch_manual'],
  edges: (dev) => {
    if (dev.state.position === 'generator') return [['gen_l', 'load_l'], ['gen_n', 'load_n']];
    if (dev.state.position === 'off') return [];
    return [['norm_l', 'load_l'], ['norm_n', 'load_n']];
  },
};

// ── UPS ────────────────────────────────────────────────────────────────────────────────────────
/** Simulated minutes that pass per real second for battery energy (so a discharge can be watched). */
export const UPS_TIME_SCALE = 60;

/**
 * UPS with battery and charger. Input live: the load is fed through, the battery charges. Input lost: the
 * output is driven from the battery until the state of charge reaches 0. The static transfer happens on
 * the next simulation step (up to 0.5 s here; a real static switch takes a few milliseconds).
 * Load power is read from the output current at 230 V.
 */
export const upsBehavior: DeviceBehavior = {
  types: ['ups_battery'],

  edges: (dev) => (dev.state.onBattery ? [] : [['in_l', 'out_l'], ['in_n', 'out_n']]),

  seeds: (dev) => (dev.state.onBattery && Number(dev.state.socPct) > 0 ? { live: ['out_l'], neutral: ['out_n'] } : {}),

  tick(dev, ctx, dt) {
    const inputLive = live(ctx, `${dev.id}:in_l`) && neutral(ctx, `${dev.id}:in_n`);
    const cap = Number(dev.state.capacityWh) || 500;
    let soc = Number(dev.state.socPct);
    if (!Number.isFinite(soc)) soc = 100;
    const loadW = round((ctx.solved.nodeVoltages[`${dev.id}:out_l`] || 230) * terminalCurrent(dev, 'out_l', ctx.wires, ctx.solved.wireCurrents), 1);
    let onBattery = !!dev.state.onBattery;
    if (inputLive) {
      onBattery = false;
      soc = Math.min(100, soc + ((Number(dev.state.chargePctPerMin) || 2) * dt * UPS_TIME_SCALE) / 60);
    } else if (soc > 0) {
      onBattery = true;
      soc = Math.max(0, soc - ((loadW * dt * UPS_TIME_SCALE) / 3600 / cap) * 100);
      if (soc <= 0) onBattery = false;
    } else {
      onBattery = false;
    }
    const autonomyMin = loadW > 0 ? round(((soc / 100) * cap) / loadW * 60, 1) : 999;
    return withState(dev, { socPct: round(soc, 2), onBattery, loadW, autonomyMin, inputLive });
  },
};

// ── PV chain ───────────────────────────────────────────────────────────────────────────────────
/** PV string: a DC source whose power follows the irradiance slider. dcDomain.ts floods its nets. */
export const pvStringBehavior: DeviceBehavior = {
  types: ['pv_string'],
  tick(dev) {
    const irr = Math.max(0, Math.min(100, Number(dev.state.irradiance) || 0));
    const voc = Number(dev.state.voc) || 360;
    return withState(dev, {
      dcOutputOn: irr > 0,
      powerW: round((Number(dev.state.kwp) || 3) * 1000 * (irr / 100), 0),
      dcVolts: irr > 0 ? round(voc * (0.8 + 0.2 * (irr / 100)), 0) : 0,
    });
  },
};

/** DC isolator: two poles, in -> out while the handle is closed. */
export const dcIsolatorBehavior: DeviceBehavior = {
  types: ['dc_isolator'],
  edges: (dev) => (dev.state.closed === false ? [] : [['in_pos', 'out_pos'], ['in_neg', 'out_neg']]),
};

/** Seconds a grid-tie inverter waits after the grid returns before it exports again. */
export const INVERTER_RECONNECT_SEC = 5;

/**
 * Grid-tie inverter. It never drives the AC net itself: it only exports while it sees the grid on its AC
 * terminals, so with the grid lost it shuts down (anti-islanding) and the island stays dead. Export power
 * is the string power x efficiency, limited to the rating; the net meter does the accounting.
 */
export const inverterBehavior: DeviceBehavior = {
  types: ['inverter_gridtie'],
  tick(dev, ctx, dt) {
    const dcOk = ctx.solved.dcPotentials[`${dev.id}:pv_pos`] === 'dc_pos' && ctx.solved.dcPotentials[`${dev.id}:pv_neg`] === 'dc_neg';
    const gridOk = live(ctx, `${dev.id}:out_l`) && neutral(ctx, `${dev.id}:out_n`);
    const stringId = ctx.solved.dcSourceOf?.[`${dev.id}:pv_pos`];
    const string = ctx.devices.find((d) => d.id === stringId);
    const dcW = Number(string?.state.powerW) || 0;
    let reconnect = Number(dev.state.reconnectSec) || 0;
    let status = '';
    let acW = 0;
    if (!dcOk || dcW <= 0) {
      status = 'NO DC INPUT';
    } else if (!gridOk) {
      status = 'ANTI-ISLANDING: GRID LOST';
      reconnect = INVERTER_RECONNECT_SEC;
    } else if (reconnect > 0) {
      status = 'RECONNECTING';
      reconnect = Math.max(0, round(reconnect - dt, 2));
    } else {
      status = 'EXPORTING';
      acW = Math.min(Number(dev.state.ratedW) || 3000, round(dcW * 0.96, 0));
    }
    return withState(dev, { status, acPowerW: acW, reconnectSec: reconnect, dcW });
  },
};

/** Simulated minutes per real second for the net meter register. */
export const NET_METER_TIME_SCALE = 60;

/**
 * Net (bidirectional) meter, in series with the service. The solver only follows power from the grid to
 * the loads, so import and export are computed from the balance: site load (read at the meter) minus the
 * power the inverters report. Surplus is counted as export.
 */
export const netMeterBehavior: DeviceBehavior = {
  types: ['net_meter'],
  edges: () => [['l_in', 'l_out'], ['n_in', 'n_out']],
  tick(dev, ctx, dt) {
    const volts = ctx.solved.nodeVoltages[`${dev.id}:l_out`] || 230;
    const loadW = volts * terminalCurrent(dev, 'l_out', ctx.wires, ctx.solved.wireCurrents);
    const pvW = ctx.devices.filter((d) => d.type === 'inverter_gridtie').reduce((sum, d) => sum + (Number(d.state.acPowerW) || 0), 0);
    const net = loadW - pvW;
    const importW = Math.max(0, net);
    const exportW = Math.max(0, -net);
    const k = (dt * (Number(dev.state.timeScale) || NET_METER_TIME_SCALE)) / 3_600_000;
    return withState(dev, {
      loadW: round(loadW, 0),
      pvW: round(pvW, 0),
      importW: round(importW, 0),
      exportW: round(exportW, 0),
      importKwh: round((Number(dev.state.importKwh) || 0) + importW * k, 4),
      exportKwh: round((Number(dev.state.exportKwh) || 0) + exportW * k, 4),
    });
  },
};

// ── Transformer display values ─────────────────────────────────────────────────────────────────
/**
 * The solver derives the secondary from the primary (ratio); this adds the loaded voltage: the unloaded
 * secondary voltage minus the regulation drop at the present load fraction.
 */
export const distributionTransformerBehavior: DeviceBehavior = {
  types: ['transformer_1p_pole', 'transformer_3p_delta_wye'],
  tick(dev, ctx) {
    const unloaded = Number(dev.state.secondaryUnloadedV) || 0;
    const is3p = dev.type === 'transformer_3p_delta_wye';
    const kva = Number(dev.state.kva) || (is3p ? 75 : 25);
    const phases = is3p ? ['x1', 'x2', 'x3'] : ['x1'];
    let amps = 0;
    for (const t of phases) amps = Math.max(amps, terminalCurrent(dev, t, ctx.wires, ctx.solved.wireCurrents));
    const secV = is3p ? unloaded / Math.sqrt(3) : unloaded;
    const loadKva = (secV * amps * (is3p ? 3 : 1)) / 1000;
    const frac = Math.min(1.5, loadKva / kva);
    const loaded = round(unloaded * (1 - ((Number(dev.state.regulationPct) || 3) / 100) * frac), 1);
    return withState(dev, { loadKva: round(loadKva, 2), loadPct: round(frac * 100, 0), secondaryLoadedV: unloaded > 0 ? loaded : 0 });
  },
};

// ── Power factor correction ───────────────────────────────────────────────────────────────────
const INDUCTIVE_PF: Record<string, number> = {
  motor_ac_industrial: 0.85,
  motor_6lead_star_delta: 0.85,
  pump_booster_3p: 0.85,
  pump_booster_1p: 0.85,
  motor_1p: 0.8,
  appliance_ac: 0.9,
  appliance_fan: 0.85,
  vfd_drive: 0.95,
};

/**
 * Plant power triangle: active power from the solver total, reactive power from the energized inductive
 * loads (P x tan(acos(pf)), pf from the device or a typical value), minus whatever capacitor steps are in.
 */
export function plantTriangle(devices: ElectricalDevice[], ctx: TickContext) {
  const kw = (ctx.solved.totalWatts || 0) / 1000;
  let kvarLoad = 0;
  for (const d of devices) {
    const pf0 = INDUCTIVE_PF[d.type];
    if (!pf0 || !ctx.solved.deviceEnergized[d.id]) continue;
    const pf = Number(d.state.powerFactor) || pf0;
    const p = (Number(d.state.wattage) || (Number(d.state.kw) || 0) * 1000) / 1000;
    kvarLoad += p * Math.tan(Math.acos(Math.min(1, pf)));
  }
  const kvarCap = devices.filter((d) => d.type === 'capacitor_bank_3p').reduce((s, d) => s + (Number(d.state.kvarOn) || 0), 0);
  const kvarNet = kvarLoad - kvarCap;
  const kva = Math.hypot(kw, kvarNet);
  return { kw, kvarLoad, kvarCap, kvarNet, kva, pf: kva > 0.01 ? kw / kva : 1 };
}

/** Seconds a capacitor step must stay open to discharge before it may be switched in again. */
export const CAP_DISCHARGE_SEC = 3;

/**
 * Capacitor bank with capacitor-duty step contactors built in. Step i is switched in while its control
 * input c_i is energized against cn, the bank is live on L1-L2-L3, and the step has had time to discharge
 * since it was last switched out.
 */
export const capacitorBankBehavior: DeviceBehavior = {
  types: ['capacitor_bank_3p'],
  tick(dev, ctx, dt) {
    const steps = Math.max(1, Math.min(4, Number(dev.state.steps) || 4));
    const perStep = Number(dev.state.kvarPerStep) || 5;
    const powered = ['l1', 'l2', 'l3'].every((t) => live(ctx, `${dev.id}:${t}`));
    const discharge = Number(dev.state.dischargeSec) || CAP_DISCHARGE_SEC;
    const patch: Record<string, unknown> = {};
    let on = 0;
    for (let i = 1; i <= steps; i++) {
      const cmd = powered && coilOn(ctx, dev.id, `c${i}`, 'cn');
      const wasOn = !!dev.state[`on${i}`];
      let lock = Number(dev.state[`lock${i}`]) || 0;
      if (wasOn && !cmd) lock = discharge;
      else if (lock > 0) lock = Math.max(0, round(lock - dt, 2));
      const nowOn = cmd && lock <= 0;
      patch[`on${i}`] = nowOn;
      patch[`lock${i}`] = lock;
      if (nowOn) on++;
    }
    patch.stepsOn = on;
    patch.kvarOn = on * perStep;
    patch.powered = powered;
    return withState(dev, patch);
  },
};

/**
 * Power factor controller: reads the plant triangle and commands capacitor steps (dry contacts com-k1..k4)
 * toward the target power factor, one step per `stepDelaySec`. It adds a step while the supply is still
 * lagging and the next step helps, and removes one when the plant has been over-corrected (leading).
 */
export const pfControllerBehavior: DeviceBehavior = {
  types: ['pf_controller'],
  edges: (dev) => {
    const n = Number(dev.state.stepsCmd) || 0;
    return [1, 2, 3, 4].filter((i) => i <= n).map((i) => ['com', `k${i}`] as [string, string]);
  },
  tick(dev, ctx, dt) {
    const powered = coilOn(ctx, dev.id, 'a1', 'a2');
    const tri = plantTriangle(ctx.devices, ctx);
    const bank = ctx.devices.find((d) => d.type === 'capacitor_bank_3p');
    const stepKvar = Number(bank?.state.kvarPerStep) || 5;
    const target = Number(dev.state.targetPf) || 0.95;
    let cmd = Number(dev.state.stepsCmd) || 0;
    let timer = (Number(dev.state.stepTimerSec) || 0) + dt;
    if (!powered) {
      cmd = 0;
      timer = 0;
    } else if (timer >= (Number(dev.state.stepDelaySec) || 2)) {
      const lagging = tri.kvarNet > stepKvar * 0.6 && tri.pf < target;
      const leading = tri.kvarNet < -stepKvar * 0.4;
      if (lagging && cmd < 4) {
        cmd++;
        timer = 0;
      } else if (leading && cmd > 0) {
        cmd--;
        timer = 0;
      }
    }
    return withState(dev, {
      powered,
      stepsCmd: cmd,
      stepTimerSec: round(Math.min(timer, 100), 2),
      kw: round(tri.kw, 2),
      kvar: round(tri.kvarNet, 2),
      kvarLoad: round(tri.kvarLoad, 2),
      pf: round(tri.pf, 3),
      leading: tri.kvarNet < -0.05,
    });
  },
};

// ── Marine ─────────────────────────────────────────────────────────────────────────────────────
/**
 * Shore connection box: a 3-pole switch with a phase-sequence indicator on the shore side. A wrong
 * sequence lights the red lamp (it does not stop you closing, which is the point of the lamp).
 */
export const shoreBoxBehavior: DeviceBehavior = {
  types: ['shore_connection_box'],
  edges: (dev) =>
    dev.state.closed === false
      ? []
      : [['in_l1', 'out_l1'], ['in_l2', 'out_l2'], ['in_l3', 'out_l3'], ['in_pe', 'out_pe']],
  tick(dev, ctx) {
    const keys = ['in_l1', 'in_l2', 'in_l3'].map((t) => `${dev.id}:${t}`);
    const present = keys.map((k) => live(ctx, k) && !!ctx.solved.nodePhases[k]);
    let fault = '';
    if (!present.some(Boolean)) fault = 'NO SHORE POWER';
    else if (present.some((p) => !p)) fault = 'LOST PHASE';
    else if (!CW_SEQUENCES.includes(keys.map((k) => ctx.solved.nodePhases[k]).join(','))) fault = 'WRONG SEQUENCE';
    return withState(dev, { seqOk: fault === '', seqFault: fault, shorePresent: present.some(Boolean) });
  },
};

/**
 * Ground detection lamps on an ungrounded (IT) system: one lamp from each line to earth. With no fault all
 * three glow evenly. A first earth fault on a line puts that lamp out and the other two glow brighter;
 * nothing trips (the solver does not clear a single earth fault on an isolated system).
 */
export const groundDetectionBehavior: DeviceBehavior = {
  types: ['ground_detection_lamps'],
  tick(dev, ctx) {
    const powered = ['l1', 'l2', 'l3'].every((t) => live(ctx, `${dev.id}:${t}`));
    const phase = (ctx.solved.itEarthFaultPhases || [])[0] || '';
    const idx: Record<string, number> = { L1: 1, L2: 2, L3: 3 };
    const patch: Record<string, unknown> = { powered, faultPhase: powered ? phase : '' };
    for (let i = 1; i <= 3; i++) {
      patch[`lamp${i}`] = !powered ? 'off' : !phase ? 'dim' : idx[phase] === i ? 'dark' : 'bright';
    }
    return withState(dev, patch);
  },
};

// ── Paralleling ────────────────────────────────────────────────────────────────────────────────
/** Phase slip is slowed by this factor so a synchroscope needle can be followed at the 0.5 s tick. */
export const SYNC_SLIP_SCALE = 0.1;

/**
 * Synchroscope with sync lamps. It compares the generator driving the bus side with the one driving the
 * incoming side (found through the solver's source tracking). The phase difference rotates at
 * 360 x (frequency difference), slowed by SYNC_SLIP_SCALE; the permissive contact (perm_a - perm_b) closes
 * within 10 degrees and 0.25 Hz. Nothing here blocks a breaker: the permissive is a signal to wire.
 */
export const synchroscopeBehavior: DeviceBehavior = {
  types: ['synchroscope'],
  edges: (dev) => (dev.state.inSync ? [['perm_a', 'perm_b']] : []),
  tick(dev, ctx) {
    const gen = (terminal: string) => {
      const src = ctx.solved.nodeSource?.[`${dev.id}:${terminal}`];
      const g = ctx.devices.find((d) => d.id === src);
      return g && (g.type === 'generator_set_1p' || g.type === 'generator_set_3p') && g.state.running ? g : undefined;
    };
    const bus = gen('bus_l');
    const inc = gen('inc_l');
    if (!bus || !inc || bus.id === inc.id) {
      return withState(dev, { phaseDiffDeg: 0, deltaHz: 0, inSync: false, lampBright: 0, status: bus && inc ? 'ONE SET (PARALLEL)' : 'NEED TWO RUNNING SETS' });
    }
    const diff = ((((Number(inc.state.phaseAngleDeg) || 0) - (Number(bus.state.phaseAngleDeg) || 0) + 540) % 360) + 360) % 360 - 180;
    const f = (g: ElectricalDevice) => (Number(g.state.frequencyHz) || 60) + (Number(g.state.freqOffsetHz) || 0);
    const deltaHz = f(inc) - f(bus);
    const inSync = Math.abs(diff) < 10 && Math.abs(deltaHz) < 0.25;
    return withState(dev, {
      phaseDiffDeg: round(diff, 1),
      deltaHz: round(deltaHz, 2),
      inSync,
      lampBright: round(Math.abs(Math.sin((diff * Math.PI) / 360)), 2),
      status: inSync ? 'IN SYNC: CLOSE NOW' : deltaHz > 0.02 ? 'INCOMING FAST' : deltaHz < -0.02 ? 'INCOMING SLOW' : 'ADJUST',
    });
  },
};

/** Generator behind a relay's sense terminals, found through the solver's source tracking. */
function senseGenerator(dev: ElectricalDevice, ctx: TickContext) {
  const src = ctx.solved.nodeSource?.[`${dev.id}:sense_l`];
  const g = ctx.devices.find((d) => d.id === src);
  return g && (g.type === 'generator_set_1p' || g.type === 'generator_set_3p') ? g : undefined;
}

/**
 * Reverse-power relay: trips (com-no closes) when the monitored generator is motoring (its `motoring`
 * property: engine failure while still connected) for `delaySec`. Releases when the condition clears.
 */
export const reversePowerBehavior: DeviceBehavior = {
  types: ['reverse_power_relay'],
  edges: (dev) => (dev.state.tripped ? [['com_15', 'no_18']] : [['com_15', 'nc_16']]),
  tick(dev, ctx, dt) {
    const gen = senseGenerator(dev, ctx);
    const reverse = !!gen && !!gen.state.running && !!gen.state.motoring;
    const delay = Number(dev.state.delaySec) || 3;
    const t = reverse ? Math.min(delay, round((Number(dev.state.timerSec) || 0) + dt, 2)) : 0;
    return withState(dev, { timerSec: t, tripped: reverse && t >= delay, reversePower: reverse });
  },
};

/**
 * Preferential trip relay: when the monitored generator runs above `thresholdPct` of its rating for
 * `delaySec` (shorter than the set's own overload trip) the contact closes and stays closed (latched) until
 * reset, so non-essential feeders can be shed before the set trips.
 */
export const preferentialTripBehavior: DeviceBehavior = {
  types: ['preferential_trip_relay'],
  edges: (dev) => (dev.state.tripped ? [['com_15', 'no_18']] : [['com_15', 'nc_16']]),
  tick(dev, ctx, dt) {
    const gen = senseGenerator(dev, ctx);
    const rated = Number(gen?.state.ratedKva) || 0;
    const loadPct = gen && gen.state.running && rated > 0 ? ((Number(gen.state.loadKw) || 0) / rated) * 100 : 0;
    const over = loadPct > (Number(dev.state.thresholdPct) || 90);
    const delay = Number(dev.state.delaySec) || 1;
    let t = over ? round((Number(dev.state.timerSec) || 0) + dt, 2) : 0;
    let tripped = !!dev.state.tripped;
    if (t >= delay) tripped = true;
    if (!gen || !gen.state.running) {
      tripped = false;
      t = 0;
    }
    return withState(dev, { timerSec: Math.min(t, delay), tripped, loadPct: round(loadPct, 0) });
  },
};
