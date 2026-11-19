import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior, TickContext } from './types';
import { coilPowered, dcCoilPowered, withState } from './util';

/**
 * Batch 3.5 (motors, starters, drives). Series devices (soft starter, reduced-voltage starter) conduct while
 * their start command is on and declare how far they limit the motor starting current (limitsInrush); the new
 * motors declare a three-phase load (loads3p) and keep a speed estimate in their tick.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const LINES: [string, string][] = [['l1', 't1'], ['l2', 't2'], ['l3', 't3']];

/** Move `speed` towards `target` at `ratePerSec` percent per second. */
const approach = (speed: number, target: number, ratePerSec: number, dt: number) =>
  round1(speed < target ? Math.min(target, speed + ratePerSec * dt) : Math.max(target, speed - ratePerSec * dt));

// ── Soft starter ─────────────────────────────────────────────────────────────────────────────
/** Start command on A1-A2: the output voltage ramps from startPct to 100 % over rampSec; the end-of-ramp contact then closes. */
export const softStarterBehavior: DeviceBehavior = {
  types: ['soft_starter'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 3 }],
  edges: (dev) => (dev.state.on ? [...LINES, ...(dev.state.phase === 'done' ? [['eor_13', 'eor_14'] as [string, string]] : [])] : []),
  limitsInrush: (dev) => num(dev.state.startMult, 3),
  tick(dev, ctx, dt) {
    const on = coilPowered(ctx.solved, dev, 'a1', 'a2');
    if (!on) return withState(dev, { on: false, phase: 'idle', elapsedSec: 0, rampPct: 0 });
    const ramp = Math.max(num(dev.state.rampSec, 6), 0.5);
    const start = num(dev.state.startPct, 30);
    const elapsed = Math.min(ramp, Math.round((num(dev.state.elapsedSec, 0) + dt) * 1000) / 1000);
    const done = elapsed >= ramp;
    return withState(dev, { on: true, phase: done ? 'done' : 'ramp', elapsedSec: elapsed, rampPct: round1(start + (100 - start) * (elapsed / ramp)) });
  },
};

// ── Reduced-voltage starter ──────────────────────────────────────────────────────────────────
export type RvMethod = 'autotransformer' | 'primary_resistor' | 'part_winding';

/** Starting-current multiple of each method while starting (6 x FLA is the direct-on-line figure). */
export function rvStartMultiple(state: Record<string, any>): number {
  const method = (state.method as RvMethod) || 'autotransformer';
  if (method === 'autotransformer') return 6 * Math.pow(num(state.tapPct, 65) / 100, 2);
  if (method === 'primary_resistor') return 6 * (1 - num(state.resistorDropPct, 30) / 100);
  return 6 * 0.5;
}

/**
 * Start command on A1-A2. Autotransformer / primary resistor: the outputs T1-T3 are fed through the tap / resistor
 * for startSec and then at full voltage. Part winding: T1-T3 feed the first winding, R1-R3 the second winding
 * once startSec has passed. The starting current multiple (closed transition) feeds the breaker inrush check.
 */
export const reducedVoltageBehavior: DeviceBehavior = {
  types: ['starter_reduced_voltage'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 4 }],
  edges(dev) {
    if (!dev.state.on) return [];
    const out: [string, string][] = [...LINES];
    if (dev.state.method === 'part_winding' && dev.state.phase === 'run') out.push(['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']);
    return out;
  },
  limitsInrush: (dev) => rvStartMultiple(dev.state),
  tick(dev, ctx, dt) {
    const on = coilPowered(ctx.solved, dev, 'a1', 'a2');
    if (!on) return withState(dev, { on: false, phase: 'idle', elapsedSec: 0 });
    const startSec = Math.max(num(dev.state.startSec, 6), 0.5);
    const elapsed = Math.min(startSec, Math.round((num(dev.state.elapsedSec, 0) + dt) * 1000) / 1000);
    return withState(dev, { on: true, phase: elapsed >= startSec ? 'run' : 'start', elapsedSec: elapsed });
  },
};

// ── Dahlander two-speed motor ────────────────────────────────────────────────────────────────
const LOW = ['u1', 'v1', 'w1'] as const;
const HIGH = ['u2', 'v2', 'w2'] as const;

/**
 * Dahlander pole-changing motor. Low speed: supply on 1U-1V-1W with 2U-2V-2W open. High speed: supply on
 * 2U-2V-2W with 1U-1V-1W joined (star point). Both sets live at once is an interlock fault (the star contactor
 * would short the supply).
 */
export const dahlanderBehavior: DeviceBehavior = {
  types: ['motor_dahlander'],
  loads3p(dev, probe) {
    const live = (set: readonly string[]) => set.every((t) => probe.potential(t) === 'live');
    const lowLive = live(LOW);
    const highLive = live(HIGH);
    const wLow = num(dev.state.wattageLow, 1100);
    const wHigh = num(dev.state.wattageHigh, 2200);
    if (lowLive && highLive) return { terminals: [...LOW], watts: 0, fault: 'BOTH SPEED SETS LIVE (interlock fault)' };
    if (highLive) {
      const star = probe.connected('u1', 'v1') && probe.connected('v1', 'w1');
      return star ? { terminals: [...HIGH], watts: wHigh, startMult: 6 } : { terminals: [...HIGH], watts: 0, fault: 'HIGH SPEED: join 1U-1V-1W (star point)' };
    }
    return { terminals: [...LOW], watts: wLow, startMult: 5 };
  },
  tick(dev, ctx, dt) {
    const running = !!ctx.solved.deviceEnergized[dev.id];
    const high = running && HIGH.every((t) => ctx.solved.nodePotentials[`${dev.id}:${t}`] === 'live');
    const target = running ? (high ? 100 : 50) : 0;
    const speed = approach(num(dev.state.speedPct, 0), target, running ? 25 : 12, dt);
    return withState(dev, { running, speedSet: running ? (high ? 'high' : 'low') : 'off', speedPct: speed });
  },
};

// ── Wound-rotor motor and rotor resistor bank ────────────────────────────────────────────────
/** The resistor bank wired to the motor's slip rings k, l, m (all three to the same bank). */
export function findRotorBank(ctx: TickContext, dev: ElectricalDevice): ElectricalDevice | null {
  let bank: string | null = null;
  for (const term of ['k', 'l', 'm']) {
    const w = ctx.wires.find((x) => (x.fromDeviceId === dev.id && x.fromTerminalId === term) || (x.toDeviceId === dev.id && x.toTerminalId === term));
    if (!w) return null;
    const other = w.fromDeviceId === dev.id ? [w.toDeviceId, w.toTerminalId] : [w.fromDeviceId, w.fromTerminalId];
    if (other[1] !== term) return null;
    if (bank && bank !== other[0]) return null;
    bank = other[0];
  }
  const b = ctx.devices.find((d) => d.id === bank);
  return b && b.type === 'rotor_resistor_bank' ? b : null;
}

/** Stage contactors: coil c1 / c2 / c3 (against cn) shorts one more resistor step each. */
export const rotorBankBehavior: DeviceBehavior = {
  types: ['rotor_resistor_bank'],
  coils: () => [{ a: 'c1', b: 'cn', watts: 3 }, { a: 'c2', b: 'cn', watts: 3 }, { a: 'c3', b: 'cn', watts: 3 }],
  tick(dev, ctx) {
    const s = [1, 2, 3].map((n) => coilPowered(ctx.solved, dev, `c${n}`, 'cn'));
    // steps are taken in order: stage n only counts when the stages before it are in
    const stages = s[0] ? (s[1] ? (s[2] ? 3 : 2) : 1) : 0;
    return withState(dev, { stages });
  },
};

const ROTOR_TARGET = [35, 55, 80, 98];
export const woundRotorBehavior: DeviceBehavior = {
  types: ['motor_wound_rotor'],
  loads3p: (dev) => ({ terminals: ['u1', 'v1', 'w1'], watts: num(dev.state.wattage, 3700), startMult: num(dev.state.startMultNow, 1.8) }),
  tick(dev, ctx, dt) {
    const running = !!ctx.solved.deviceEnergized[dev.id];
    const bank = findRotorBank(ctx, dev);
    const stages = bank ? num(bank.state.stages, 0) : -1;
    const target = running && stages >= 0 ? ROTOR_TARGET[stages] : 0;
    const speed = approach(num(dev.state.speedPct, 0), target, running ? 12 : 10, dt);
    return withState(dev, {
      running, stages, speedPct: speed, startMultNow: stages < 0 ? 1.8 : [1.8, 2, 2.2, 2.5][stages],
      rotorNote: !running ? '' : bank ? '' : 'ROTOR OPEN: no torque (connect a resistor bank to K-L-M)',
    });
  },
};

// ── DC shunt motor (24 V DC) ─────────────────────────────────────────────────────────────────
/**
 * 24 V DC shunt motor with its own timed starter (armature resistance shorted in 3 steps). Speed follows the
 * armature voltage and falls with the field flux; lose the field with the armature on and it runs away.
 */
export const dcShuntBehavior: DeviceBehavior = {
  types: ['motor_dc_shunt'],
  tick(dev, ctx, dt) {
    const arm = dcCoilPowered(ctx.solved, dev, 'a_pos', 'a_neg');
    const field = dcCoilPowered(ctx.solved, dev, 'f_pos', 'f_neg');
    const startSec = Math.max(num(dev.state.startSec, 3), 0.5);
    const elapsed = arm ? Math.min(startSec, num(dev.state.elapsedSec, 0) + dt) : 0;
    const step = arm ? Math.min(3, Math.floor((elapsed / startSec) * 3 + 0.0001)) : 0;
    // speed target: (V / flux). A shunt motor with no field runs away to a multiple of rated speed.
    const target = !arm ? 0 : field ? 100 * (0.3 + 0.7 * (step / 3)) : 250;
    const speed = approach(num(dev.state.speedPct, 0), Math.min(target, field ? 100 : 250), arm ? 20 : 8, dt);
    return withState(dev, {
      armPowered: arm, fieldPowered: field, elapsedSec: round1(elapsed * 10) / 10, starterStep: step, speedPct: speed,
      overspeed: arm && !field && speed > 120,
    });
  },
};

// ── Brake motor and DC injection module ──────────────────────────────────────────────────────
/** 3-phase motor with a spring-applied brake whose coil (BR1-BR2) must be powered to release it. */
export const brakeMotorBehavior: DeviceBehavior = {
  types: ['motor_brake'],
  coils: () => [{ a: 'br1', b: 'br2', watts: 25 }],
  loads3p: (dev) => ({ terminals: ['u1', 'v1', 'w1'], watts: num(dev.state.wattage, 1500), startMult: 6 }),
  tick(dev, ctx, dt) {
    const powered = !!ctx.solved.deviceEnergized[dev.id];
    const released = coilPowered(ctx.solved, dev, 'br1', 'br2');
    const live = ['u1', 'v1', 'w1'].every((t) => ctx.solved.nodePotentials[`${dev.id}:${t}`] === 'live');
    const running = live && released;
    const target = running ? 100 : 0;
    const rate = running ? 40 : released ? 15 : 300; // an applied brake stops it almost at once
    return withState(dev, { running, brakeReleased: released, locked: live && !released, speedPct: approach(num(dev.state.speedPct, 0), target, rate, dt), powered });
  },
};

/** DC injection brake: after the run command (A1-A2) drops it injects DC for brakeSec; a linked zero-speed switch sees the shorter stop. */
export const dcInjectionBehavior: DeviceBehavior = {
  types: ['dc_injection_brake'],
  coils: () => [{ a: 'l', b: 'n', watts: 3 }, { a: 'a1', b: 'a2', watts: 1 }],
  tick(dev, ctx, dt) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    const run = coilPowered(ctx.solved, dev, 'a1', 'a2');
    let remaining = num(dev.state.remainingSec, 0);
    if (!powered) remaining = 0;
    else if (run) remaining = 0;
    else if (dev.state.runPrev) remaining = num(dev.state.brakeSec, 3); // run command dropped: start braking
    else remaining = Math.max(0, Math.round((remaining - dt) * 1000) / 1000);
    return withState(dev, { runPrev: run, remainingSec: remaining, braking: remaining > 0, powered });
  },
};

// ── VFD accessories ──────────────────────────────────────────────────────────────────────────
/** A speed potentiometer linked to a VFD (`vfdId`) sets that drive's output frequency (0-100 % of 60 Hz). */
export const vfdLinkBehavior: DeviceBehavior = {
  types: ['vfd_drive'],
  tick(dev, ctx) {
    const pot = ctx.devices.find((d) => d.type === 'speed_potentiometer' && d.state.vfdId === dev.id);
    if (!pot) return dev;
    const hz = Math.round((num(pot.state.value, 50) / 100) * 60);
    return withState(dev, { freqHz: hz, potLinked: true });
  },
};

/** Line reactor: series conductor in each line (a passive impedance, no state). */
export const lineReactorBehavior: DeviceBehavior = {
  types: ['line_reactor'],
  edges: () => LINES,
};

// ── Submersible pump, air compressor, hoist / conveyor ───────────────────────────────────────
const threePhaseLoad = (defaultW: number): DeviceBehavior['loads3p'] => (dev) => ({ terminals: ['u1', 'v1', 'w1'], watts: num(dev.state.wattage, defaultW), startMult: 6 });

/** `pumping` feeds the shared process model, like the booster pumps. */
export const submersiblePumpBehavior: DeviceBehavior = {
  types: ['pump_submersible_3p'],
  loads3p: threePhaseLoad(1500),
  tick(dev, ctx) {
    const running = !!ctx.solved.deviceEnergized[dev.id];
    return withState(dev, { running, pumping: running, kw: num(dev.state.wattage, 1500) / 1000 });
  },
};

export const compressorBehavior: DeviceBehavior = {
  types: ['air_compressor_3p'],
  loads3p: threePhaseLoad(3000),
  tick(dev, ctx) {
    const running = !!ctx.solved.deviceEnergized[dev.id];
    // pumping raises the shared line pressure; kw stays 0 so it does not fill the tank
    return withState(dev, { running, pumping: running, kw: 0 });
  },
};

/** Position limits: the upper limit NC opens at the top, the lower at the bottom. */
export const hoistLimits = (state: Record<string, any>) => ({ up: num(state.position, 0) < 98, down: num(state.position, 0) > 2 });

export const hoistConveyorBehavior: DeviceBehavior = {
  types: ['hoist_conveyor'],
  loads3p: threePhaseLoad(2200),
  edges(dev) {
    const lim = hoistLimits(dev.state);
    const out: [string, string][] = [];
    if (lim.up) out.push(['nc_11', 'nc_12']);
    if (lim.down) out.push(['nc_21', 'nc_22']);
    return out;
  },
  tick(dev, ctx, dt) {
    const running = !!ctx.solved.deviceEnergized[dev.id];
    const dir = ctx.solved.deviceEnergized[dev.id] ? ((dev.state.direction as string) || 'CW') : 'CW';
    const rate = num(dev.state.ratePctPerSec, 8);
    let pos = num(dev.state.position, 0);
    let stalled = num(dev.state.stallSec, 0);
    if (running) {
      const next = Math.min(100, Math.max(0, pos + (dir === 'CW' ? rate : -rate) * dt));
      stalled = next === pos ? stalled + dt : 0;
      pos = round1(next);
    } else stalled = 0;
    return withState(dev, { running, position: pos, moving: running && stalled === 0, stallSec: Math.round(stalled * 10) / 10, stalled: stalled >= 3 });
  },
};
