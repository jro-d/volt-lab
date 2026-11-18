import type { DeviceBehavior } from './types';
import { withState } from './util';

/**
 * Float switch (IEC 60947-5-1 style changeover): its contacts follow the shared tank level with hysteresis.
 *
 *  - 'NO_on_rise':  the NO contact (com-no) closes when the level rises to highTrip and reopens when it
 *                   falls to lowTrip.
 *  - 'NC_on_rise':  mounted the other way round: com-no closes when the level falls to lowTrip and reopens
 *                   when it rises to highTrip (the usual way to start a filling pump).
 * Between the two trip levels the contacts keep their last state. `contactClosed` means com-no is closed
 * (com-nc is closed otherwise).
 */
export const floatSwitchBehavior: DeviceBehavior = {
  types: ['float_switch'],

  edges: (dev) => (dev.state.contactClosed ? [['com', 'no']] : [['com', 'nc']]),

  tick(dev, ctx) {
    const level = ctx.process ? ctx.process.tankLevel : Number(dev.state.level) || 0;
    const high = Number(dev.state.highTrip) || 70;
    const low = Number(dev.state.lowTrip) || 30;
    let closed = !!dev.state.contactClosed;
    if (dev.state.contactForm === 'NC_on_rise') {
      if (level <= low) closed = true;
      else if (level >= high) closed = false;
    } else if (level >= high) closed = true;
    else if (level <= low) closed = false;
    return withState(dev, { level: Math.round(level * 10) / 10, contactClosed: closed });
  },
};

/**
 * Pressure switch: com-no closes (pump demand) when the line pressure falls to cutIn and opens again when it
 * rises to cutOut. The gap between them is the hysteresis band.
 */
export const pressureSwitchBehavior: DeviceBehavior = {
  types: ['pressure_switch'],

  edges: (dev) => (dev.state.contactClosed ? [['com', 'no']] : [['com', 'nc']]),

  tick(dev, ctx) {
    const bar = ctx.process ? ctx.process.lineBar : Number(dev.state.pressure) || 0;
    const cutIn = Number(dev.state.cutIn) || 2;
    const cutOut = Number(dev.state.cutOut) || 3;
    let closed = !!dev.state.contactClosed;
    if (bar <= cutIn) closed = true;
    else if (bar >= cutOut) closed = false;
    return withState(dev, { pressure: Math.round(bar * 100) / 100, contactClosed: closed });
  },
};
