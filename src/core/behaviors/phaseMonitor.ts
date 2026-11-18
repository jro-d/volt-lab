import type { DeviceBehavior } from './types';

/**
 * Phase monitor relay: the contact changeover follows `phaseOk`, which the solver decides (it needs the
 * phase identity and voltage of the sense terminals, see circuitSolver.ts).
 */
export const phaseMonitorBehavior: DeviceBehavior = {
  types: ['phase_monitor_relay'],
  edges: (dev) => (dev.state.phaseOk ? [['com_15', 'no_18']] : [['com_15', 'nc_16']]),
};
