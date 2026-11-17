import type { DeviceBehavior } from './types';
import { terminalCurrent, withState } from './util';

/**
 * 3-phase kWh meter (IEC 62053-21 style): a series pass-through that totals each phase's
 * current x phase voltage into energy.
 *
 * Simulated time runs `timeScale` times faster than the wall clock (default 60: one real second is one
 * simulated minute) so the register visibly moves. Power is V x I per phase (resistive loads, pf = 1).
 */
export const PHASES = ['l1', 'l2', 'l3'] as const;

export const meter3pBehavior: DeviceBehavior = {
  types: ['kwh_meter_3p'],

  edges: () => [
    ['l1_in', 'l1_out'],
    ['l2_in', 'l2_out'],
    ['l3_in', 'l3_out'],
    ['n_in', 'n_out'],
  ],

  tick(dev, ctx, dtSec) {
    const timeScale = Number(dev.state.timeScale) || 60;
    const lineVolts = Number(dev.state.voltageIn) || 440;
    const phaseVolts = lineVolts / Math.sqrt(3);
    const patch: Record<string, unknown> = {};

    let totalKwh = Number(dev.state.kwh) || 0;
    let live = false;
    for (const p of PHASES) {
      const potential = ctx.solved.nodePotentials[`${dev.id}:${p}_out`];
      const amps = potential === 'live' ? terminalCurrent(dev, `${p}_out`, ctx.wires, ctx.solved.wireCurrents) : 0;
      if (potential === 'live') live = true;
      const prev = Number(dev.state[`${p}Kwh`]) || 0;
      const add = (phaseVolts * amps * dtSec * timeScale) / 3_600_000; // W·s -> kWh
      patch[`${p}Amps`] = Number(amps.toFixed(2));
      patch[`${p}Kwh`] = prev + add;
      totalKwh += add;
    }
    patch.kwh = totalKwh;
    patch.energized = live;
    return withState(dev, patch);
  },
};
