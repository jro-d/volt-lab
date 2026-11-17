import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior } from './types';
import { terminalCurrent, withState } from './util';
import { MOTOR_START_SEC, TripCurveKind, timeToTrip } from '../tripCurves';

export const FUSE_RATINGS = [6, 10, 16, 20, 25, 32, 40, 63] as const;
export const PHASE_KEYS = ['l1', 'l2', 'l3'] as const;

/**
 * Thermal fuse model shared by the 1-pole holder and the 3-pole fuse switch disconnector.
 *
 * Each link integrates a heat fraction: every step adds (simulated seconds / time-to-melt at the present
 * load multiple), using the gG or aM table from tripCurves.ts. The link blows when the fraction reaches 1.
 * Below the curve the link cools slowly. A short circuit blows the link instantly (see clearsFault).
 *
 * Simulated time runs `timeScale` times faster than the wall clock (default 20) so a thermal overload
 * can be watched; the motor-start window is measured in simulated seconds.
 *
 * aM links give no overload protection and ride through a motor start (see tripCurves.ts). A gG link
 * sized close to the motor current can blow on the start inrush, which is why aM links exist.
 */
export const DEFAULT_FUSE_TIME_SCALE = 20;

export const fuseCurve = (dev: ElectricalDevice): TripCurveKind => (dev.state.fuseKind === 'aM' ? 'fuse_aM' : 'fuse_gG');

interface LinkStep {
  heat: number;
  onSec: number;
  blown: boolean;
}

/**
 * One thermal step for a single link carrying `amps`. During the first MOTOR_START_SEC simulated seconds of
 * conduction a motor draws its starting current instead of its running current, so the step is split into
 * a start-up part and a running part.
 */
function stepLink(dev: ElectricalDevice, amps: number, inrushAmps: number, heat: number, onSec: number, dtSec: number): LinkStep {
  const scale = Number(dev.state.timeScale) || DEFAULT_FUSE_TIME_SCALE;
  const simDt = dtSec * scale;
  const rated = Number(dev.state.ratedAmps) || 16;
  const conducting = amps > 0.01;
  const kind = fuseCurve(dev);

  let nextHeat = heat;
  if (!conducting) {
    nextHeat = Math.max(0, heat - simDt / 600);
  } else {
    const startPart = inrushAmps > amps ? Math.max(0, Math.min(simDt, MOTOR_START_SEC - onSec)) : 0;
    const runPart = simDt - startPart;
    const heatFor = (loadAmps: number, seconds: number) => {
      if (seconds <= 0) return 0;
      const t = timeToTrip(kind, rated, loadAmps / rated);
      return Number.isFinite(t) ? seconds / t : -seconds / 600; // below the curve the link cools
    };
    nextHeat = Math.max(0, heat + heatFor(inrushAmps, startPart) + heatFor(amps, runPart));
  }
  const nextOn = conducting ? Math.min(onSec + simDt, MOTOR_START_SEC + 1) : 0;
  return { heat: Math.round(Math.min(1, nextHeat) * 10000) / 10000, onSec: Math.round(nextOn * 100) / 100, blown: nextHeat >= 1 };
}

/** 1-pole fuse holder (IEC 60269-1): in_l -> out_l through the link until it blows. */
export const fuse1pBehavior: DeviceBehavior = {
  types: ['fuse_holder_1p'],

  edges: (dev) => (dev.state.blown || dev.state.tripped ? [] : [['in_l', 'out_l']]),

  clearsFault: (dev) =>
    dev.state.blown || dev.state.tripped
      ? null
      : {
          patch: { blown: true, heat: 1 },
          reason: `Fuse blown (${dev.state.fuseKind || 'gG'} ${dev.state.ratedAmps || 16}A): short-circuit current melted the link instantly`,
          opensDevice: true,
        },

  tick(dev, ctx, dtSec) {
    if (dev.state.blown || dev.state.tripped) return dev;
    const amps = Math.max(terminalCurrent(dev, 'in_l', ctx.wires, ctx.solved.wireCurrents), terminalCurrent(dev, 'out_l', ctx.wires, ctx.solved.wireCurrents));
    const step = stepLink(dev, amps, ctx.solved.inrushByDevice?.[dev.id] || 0, Number(dev.state.heat) || 0, Number(dev.state.onSec) || 0, dtSec);
    if (step.blown) {
      const rated = Number(dev.state.ratedAmps) || 16;
      return withState(dev, {
        blown: true,
        tripped: true,
        closed: false,
        heat: 1,
        onSec: 0,
        tripReason: `Fuse blown (${dev.state.fuseKind || 'gG'} ${rated}A): ${amps.toFixed(1)}A (${(amps / rated).toFixed(2)}x) melted the link`,
      });
    }
    return withState(dev, { heat: step.heat, onSec: step.onSec });
  },
};

const LINK_TERMINALS = { l1: ['in_l1', 'out_l1'], l2: ['in_l2', 'out_l2'], l3: ['in_l3', 'out_l3'] } as const;

const phaseOfTerminal = (terminalId: string): (typeof PHASE_KEYS)[number] | null => {
  const m = /_(l[123])$/.exec(terminalId);
  return m ? (m[1] as (typeof PHASE_KEYS)[number]) : null;
};

/** 3-pole fuse switch disconnector (IEC 60947-3): one handle, three independent links. */
export const fuse3pBehavior: DeviceBehavior = {
  types: ['fuse_switch_disconnector_3p'],

  edges: (dev) => {
    if (dev.state.closed === false) return [];
    return PHASE_KEYS.filter((p) => !dev.state[`blown_${p}`]).map((p) => [LINK_TERMINALS[p][0], LINK_TERMINALS[p][1]] as [string, string]);
  },

  clearsFault: (dev, via) => {
    const p = phaseOfTerminal(via);
    if (!p || dev.state.closed === false || dev.state[`blown_${p}`]) return null;
    return {
      patch: { [`blown_${p}`]: true, [`heat_${p}`]: 1 },
      reason: `Fuse link ${p.toUpperCase()} blown (${dev.state.fuseKind || 'gG'} ${dev.state.ratedAmps || 32}A): short-circuit current melted the link instantly`,
      opensDevice: false, // the other two links and the handle stay as they are
    };
  },

  tick(dev, ctx, dtSec) {
    if (dev.state.closed === false) return dev;
    const patch: Record<string, unknown> = {};
    for (const p of PHASE_KEYS) {
      if (dev.state[`blown_${p}`]) continue;
      const [inT, outT] = LINK_TERMINALS[p];
      const amps = Math.max(terminalCurrent(dev, inT, ctx.wires, ctx.solved.wireCurrents), terminalCurrent(dev, outT, ctx.wires, ctx.solved.wireCurrents));
      const step = stepLink(dev, amps, ctx.solved.inrushByDevice?.[dev.id] || 0, Number(dev.state[`heat_${p}`]) || 0, Number(dev.state[`onSec_${p}`]) || 0, dtSec);
      patch[`heat_${p}`] = step.heat;
      patch[`onSec_${p}`] = step.onSec;
      if (step.blown) patch[`blown_${p}`] = true;
    }
    return withState(dev, patch);
  },
};
