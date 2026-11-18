import type { DeviceBehavior } from './types';
import { withState } from './util';

/**
 * Automatic transfer switch (IEC 60947-6-1) with a transfer delay.
 *
 * - Normal supply live: the load is on normal.
 * - Normal dead and the generator live: transfer to the generator after `transferDelaySec` (the load is
 *   dead meanwhile). The two sources are never connected at the same time (circuitSolver.ts only joins one).
 * - Normal returns: retransfer to normal at once.
 *
 * Applies only when `transferDelaySec` is above zero; older saved ATS devices without it keep the previous
 * instant transfer handled in circuitSolver.ts.
 */
export const atsTransferBehavior: DeviceBehavior = {
  types: ['ats_changeover'],

  tick(dev, ctx, dtSec) {
    const delay = Number(dev.state.transferDelaySec) || 0;
    if (delay <= 0 || dev.state.autoMode === false) return dev;

    const normLive = ctx.solved.nodePotentials[`${dev.id}:norm_l`] === 'live';
    const genLive = ctx.solved.nodePotentials[`${dev.id}:gen_l`] === 'live';
    const source = dev.state.source === 'generator' ? 'generator' : 'normal';

    if (source === 'normal') {
      if (!normLive && genLive) {
        const waited = Math.round(((Number(dev.state.transferSec) || 0) + dtSec) * 1000) / 1000;
        if (waited >= delay) return withState(dev, { source: 'generator', transferSec: 0 });
        return withState(dev, { transferSec: waited });
      }
      return withState(dev, { transferSec: 0 });
    }
    // On generator: go back as soon as the normal supply returns
    if (normLive) return withState(dev, { source: 'normal', transferSec: 0 });
    return withState(dev, { transferSec: 0 });
  },
};
