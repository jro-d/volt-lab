import type { DeviceBehavior } from './types';

/**
 * RCBO 1P+N (IEC 61009-1): a miniature circuit breaker and a residual-current device in one module.
 * Overload and short-circuit tripping reuse the breaker rules in circuitSolver.ts (it is listed in
 * BREAKER_TYPES); earth-leakage tripping is handled where a faulty load reports its leakage. This hook
 * only describes the conductive path: line and neutral are both switched, and open while tripped.
 * The `pe` terminal is a reference point and is not connected through.
 */
export const rcboBehavior: DeviceBehavior = {
  types: ['rcbo_1pn'],

  edges: (dev) =>
    dev.state.closed && !dev.state.tripped
      ? [
          ['in_l', 'out_l'],
          ['in_n', 'out_n'],
        ]
      : [],
};
