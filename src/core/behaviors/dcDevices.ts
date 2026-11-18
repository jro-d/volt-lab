import type { DeviceBehavior } from './types';
import { withState } from './util';
import { plcProgramTick } from './plcProgram';

/** Seconds a current-limited supply stays off before it tries to restart ("hiccup" mode). */
export const PSU_RECOVERY_SEC = 3;

/** 24 V DC supply: the solver decides when it trips; the tick only counts the recovery time down. */
export const psuBehavior: DeviceBehavior = {
  types: ['psu_24vdc'],
  tick(dev, _ctx, dt) {
    if (!dev.state.psuTripped) return dev;
    const left = Math.max(0, (Number(dev.state.psuRecoverSec) || 0) - dt);
    return left > 0 ? withState(dev, { psuRecoverSec: left }) : withState(dev, { psuTripped: false, psuRecoverSec: 0, psuFault: '' });
  },
};

/**
 * Three-wire DC sensor. While `outActive` the output (black) is connected to + (PNP) or 0 V (NPN), which is how a
 * real transistor output behaves; the solver sets `outActive` from the supply, the target and the NO / NC form.
 */
export const dcSensorBehavior: DeviceBehavior = {
  types: ['sensor_inductive', 'sensor_capacitive', 'sensor_photoelectric'],
  edges: (dev) => (dev.state.outActive ? [dev.state.output === 'NPN' ? ['blue', 'black'] : ['brown', 'black']] : []),
};

/** 24 V DC PLC: each transistor output that is ON connects its terminal to L+ (sourcing output). */
export const plc24Behavior: DeviceBehavior = {
  types: ['plc_24vdc_16io'],
  // user-programmed scan (program === 'user'); otherwise the fixed demo behaviour in circuitSolver.ts
  tick: plcProgramTick,
  edges: (dev) => {
    const outs = (dev.state.plcOutputs || {}) as Record<string, boolean>;
    return Object.keys(outs).filter((k) => outs[k]).map((k) => ['l_pos', k] as [string, string]);
  },
};
