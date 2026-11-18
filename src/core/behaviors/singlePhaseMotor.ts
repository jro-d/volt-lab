import type { DeviceBehavior } from './types';
import { withState } from './util';

/** Speed (%) at which the centrifugal switch drops the starting winding out. */
export const CENTRIFUGAL_PCT = 75;

/** Seconds from standstill to full speed for the demo motor. */
const RUN_UP_SEC = 2.5;

/**
 * Single-phase motor run-up. The solver says whether the motor can start (`startOk`: main winding powered and
 * either the start winding is energized or the rotor is already above the centrifugal switch speed); this tick turns
 * that into a speed, and the speed decides when the switch opens. A motor that cannot start just hums at 0 %.
 */
export const motor1pBehavior: DeviceBehavior = {
  types: ['motor_1p'],
  tick(dev, _ctx, dt) {
    const speed = Number(dev.state.speedPct) || 0;
    const next = dev.state.startOk
      ? Math.min(100, speed + (100 / RUN_UP_SEC) * dt)
      : dev.state.mainPowered
        ? speed // humming: no torque, no movement
        : Math.max(0, speed - (100 / 4) * dt); // coasting down
    const centrifugalOpen = next >= CENTRIFUGAL_PCT;
    return withState(dev, { speedPct: Math.round(next * 10) / 10, centrifugalOpen });
  },
};

/** Motor capacitor: conducts between its terminals unless it has failed open. */
export const capacitorBehavior: DeviceBehavior = {
  types: ['capacitor_run'],
  edges: (dev) => (dev.state.open ? [] : [['c1', 'c2']]),
};
