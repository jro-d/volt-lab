import type { DeviceBehavior } from './types';
import { coilPowered, withState } from './util';
import { APPLIANCE_KINDS, STRIP_LOADS } from '../../data/loadPresets';

/**
 * Batch 3.6 (residential and commercial loads): cycling appliances, emergency luminaires, the fan speed
 * regulator, a doorbell set and a power strip with a cord that can overheat. Loads are single-phase and
 * declare their present power through `loads1p`.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const GRID_V = 230;

// ── Generic appliance with a kind preset ────────────────────────────────────────────────────
/** Present power of an appliance kind `elapsed` seconds after it was switched on. */
export function applianceWatts(kind: string, state: Record<string, any>, elapsed: number): { watts: number; phase: string } {
  const full = num(state.wattage, APPLIANCE_KINDS[kind]?.wattage ?? 1000);
  switch (kind) {
    case 'range': {
      const t = elapsed % 60;
      return t < 40 ? { watts: full, phase: 'element on' } : { watts: 0, phase: 'element off' };
    }
    case 'refrigerator': {
      const t = elapsed % 60;
      return t < 30 ? { watts: full, phase: 'compressor on' } : { watts: 5, phase: 'standby' };
    }
    case 'washing_machine': {
      const program: [string, number, number][] = [['fill', 10, 50], ['heat', 40, full], ['wash', 60, 400], ['spin', 30, 600]];
      let t = elapsed;
      for (const [name, dur, w] of program) {
        if (t < dur) return { watts: w, phase: name };
        t -= dur;
      }
      return { watts: 0, phase: 'done' };
    }
    case 'rice_cooker':
      return elapsed < num(state.cookSec, 60) ? { watts: full, phase: 'cooking' } : { watts: 60, phase: 'keep warm' };
    case 'microwave':
      return num(state.timerSec, 0) > 0 ? { watts: full, phase: 'cooking' } : { watts: 3, phase: 'standby' };
    default:
      return { watts: full, phase: 'charging' };
  }
}

export const applianceBehavior: DeviceBehavior = {
  types: ['appliance_generic'],
  loads1p: (dev) => ({ line: 'line', neutral: 'neutral', watts: num(dev.state.wattsNow, 0), pf: num(dev.state.pf, APPLIANCE_KINDS[String(dev.state.applianceKind)]?.pf ?? 1) }),
  tick(dev, ctx, dt) {
    const powered = !!ctx.solved.deviceEnergized[dev.id];
    const kind = String(dev.state.applianceKind || 'range');
    if (!powered) return withState(dev, { elapsedSec: 0, wattsNow: 0, phase: 'off' });
    const elapsed = Math.round((num(dev.state.elapsedSec, 0) + dt) * 1000) / 1000;
    const timer = kind === 'microwave' ? Math.max(0, round1(num(dev.state.timerSec, 0) - dt)) : num(dev.state.timerSec, 0);
    const { watts, phase } = applianceWatts(kind, { ...dev.state, timerSec: timer }, elapsed);
    return withState(dev, { elapsedSec: elapsed, wattsNow: watts, phase, timerSec: timer });
  },
};

// ── Emergency luminaire / exit sign ─────────────────────────────────────────────────────────
/** Battery runs 60x faster than real time (a 3 h autonomy lasts 3 minutes). */
const EM_SCALE = 60;

export const emergencyLightBehavior: DeviceBehavior = {
  types: ['emergency_light'],
  loads1p: (dev, probe) => {
    const mains = probe.potential('l') === 'live' && probe.potential('n') === 'neutral';
    if (!mains) return null;
    const exit = dev.state.kind === 'exit_sign';
    return { line: 'l', neutral: 'n', watts: exit ? 4 : 2, pf: 0.9 };
  },
  tick(dev, ctx, dt) {
    const mains = coilPowered(ctx.solved, dev, 'l', 'n');
    const exit = dev.state.kind === 'exit_sign';
    const autonomyH = Math.max(num(dev.state.autonomyH, 3), 0.25);
    const perSec = 100 / (autonomyH * 3600 / EM_SCALE);
    let soc = num(dev.state.socPct, 100);
    const lit = exit ? mains || soc > 0 : !mains && soc > 0;
    if (mains) soc = Math.min(100, soc + perSec * dt * 0.5);
    else if (lit) soc = Math.max(0, soc - perSec * dt);
    return withState(dev, { mains, lit, onBattery: !mains && lit, socPct: Math.round(soc * 100) / 100 });
  },
};

// ── Fan speed regulator ─────────────────────────────────────────────────────────────────────
const FAN_FRACTION = [0.35, 0.5, 0.65, 0.8, 1];

/** Series dimmer-style regulator: passes the line through while it is on a step. */
export const fanRegulatorBehavior: DeviceBehavior = {
  types: ['fan_regulator'],
  edges: (dev) => (num(dev.state.step, 3) > 0 ? [['in', 'out']] : []),
};

/** A ceiling fan follows the speed step of a regulator linked to it (its power scales with the step). */
export const fanSpeedBehavior: DeviceBehavior = {
  types: ['appliance_fan'],
  tick(dev, ctx) {
    const reg = ctx.devices.find((d) => d.type === 'fan_regulator' && d.state.fanId === dev.id);
    if (!reg) return dev;
    const base = num(dev.state.baseWattage, num(dev.state.wattage, 65));
    const step = Math.min(5, Math.max(1, Math.round(num(reg.state.step, 3))));
    return withState(dev, { baseWattage: base, wattage: Math.round(base * FAN_FRACTION[step - 1]), speedStep: step });
  },
};

// ── Doorbell set ────────────────────────────────────────────────────────────────────────────
/** 230 V to 12 V bell transformer with a chime. A push button wired between B1 and B2 (12 V side) rings it. */
export const doorbellBehavior: DeviceBehavior = {
  types: ['doorbell_set'],
  loads1p: (dev, probe) => {
    const ringing = probe.connected('b1', 'b2');
    dev.state.pressedSense = ringing; // read back by the tick (the solver mutates device state in place)
    return { line: 'l', neutral: 'n', watts: ringing ? 8 : 0.5, pf: 0.6 };
  },
  tick(dev, ctx, dt) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    const ringing = powered && !!dev.state.pressedSense;
    return withState(dev, { secondaryV: powered ? 12 : 0, ringing, ringSec: ringing ? Math.round((num(dev.state.ringSec, 0) + dt) * 10) / 10 : 0 });
  },
};

// ── Power strip ─────────────────────────────────────────────────────────────────────────────
export const stripWatts = (state: Record<string, any>) =>
  ((state.slots as string[] | undefined) ?? []).reduce((sum, k) => sum + (STRIP_LOADS[k] || 0), 0);

/** Four sockets behind a cord of limited rating: more than its rating heats the cord until it burns out. */
export const powerStripBehavior: DeviceBehavior = {
  types: ['power_strip'],
  loads1p: (dev) => ({ line: 'line', neutral: 'neutral', watts: dev.state.burnt ? 0 : stripWatts(dev.state), pf: 0.95 }),
  tick(dev, ctx, dt) {
    const powered = !!ctx.solved.deviceEnergized[dev.id];
    const amps = dev.state.burnt || !powered ? 0 : stripWatts(dev.state) / (GRID_V * 0.95);
    const rated = Math.max(num(dev.state.cordAmps, 10), 1);
    const ratio = amps / rated;
    let heat = num(dev.state.cordHeat, 0);
    // heat rises with the square of the overload and falls back when the load is within the rating
    heat = ratio > 1 ? heat + (ratio * ratio - 1) * 0.12 * dt : Math.max(0, heat - 0.05 * dt);
    heat = Math.min(1, Math.round(heat * 1000) / 1000);
    return withState(dev, { loadAmps: round1(amps), overload: ratio > 1, cordHeat: heat, burnt: !!dev.state.burnt || heat >= 1 });
  },
};
