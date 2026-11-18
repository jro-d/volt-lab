import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior } from './types';
import { terminalCurrent, withState } from './util';
import { SYNC_SLIP_SCALE } from './powerSystems';

/** Time from a run command to output voltage (simulated seconds). */
export const GENERATOR_START_DELAY_SEC = 3;
/** A load above rating for this long trips the set (simulated seconds). */
export const GENERATOR_OVERLOAD_DELAY_SEC = 2;

const is3p = (dev: ElectricalDevice) => dev.type === 'generator_set_3p';

/**
 * Generating set (ISO 8528-1) with a start/stop button and an optional remote-start input pair
 * (`start_a` / `start_b`: a closed external contact between them means run, e.g. a loss-of-mains relay).
 *
 * A run command starts a 3 s start delay; after it the set drives its output terminals like a supply
 * (see `seeds`). The output frequency follows the project (60 Hz PEC, 50 Hz IEC). `loadKw` is the load
 * read from the output currents (pf 1). A load above `ratedKva` for 2 s trips the set (`overloaded`); it
 * stays tripped until the run command is removed.
 */
export const generatorBehavior: DeviceBehavior = {
  types: ['generator_set_1p', 'generator_set_3p'],

  seeds(dev) {
    if (!dev.state.running || dev.state.overloaded) return {};
    if (is3p(dev)) {
      return {
        phases: [
          { terminal: 'l1_out', phase: 'L1' },
          { terminal: 'l2_out', phase: 'L2' },
          { terminal: 'l3_out', phase: 'L3' },
        ],
        neutral: ['n_out'],
        earth: ['pe'],
      };
    }
    return { live: ['l_out'], neutral: ['n_out'], earth: ['pe'] };
  },

  tick(dev, ctx, dtSec) {
    const requested = !!dev.state.runRequested || !!dev.state.remoteStart;
    // Phase angle only matters relative to another set: it slips at 360 deg x frequency offset (slowed for the synchroscope)
    const angle = dev.state.running
      ? (((Number(dev.state.phaseAngleDeg) || 0) + 360 * (Number(dev.state.freqOffsetHz) || 0) * dtSec * SYNC_SLIP_SCALE) % 360 + 360) % 360
      : Number(dev.state.phaseAngleDeg) || 0;
    const patch: Record<string, unknown> = { frequencyHz: ctx.gridFrequency, phaseAngleDeg: Math.round(angle * 10) / 10 };

    if (!requested) {
      Object.assign(patch, { running: false, startSec: 0, overloaded: false, overloadSec: 0, loadKw: 0 });
      return withState(dev, patch);
    }
    if (dev.state.overloaded) return withState(dev, { ...patch, running: false, loadKw: 0 });

    if (!dev.state.running) {
      const startSec = Math.round(((Number(dev.state.startSec) || 0) + dtSec) * 1000) / 1000;
      if (startSec >= GENERATOR_START_DELAY_SEC) {
        Object.assign(patch, { running: true, startSec: GENERATOR_START_DELAY_SEC, overloadSec: 0 });
      } else {
        Object.assign(patch, { running: false, startSec });
      }
      return withState(dev, patch);
    }

    // Running: read the load from the output currents
    const volts = Number(dev.state.voltage) || (is3p(dev) ? 440 : 230);
    let kw = 0;
    if (is3p(dev)) {
      const phaseVolts = volts / Math.sqrt(3);
      for (const t of ['l1_out', 'l2_out', 'l3_out']) kw += (phaseVolts * terminalCurrent(dev, t, ctx.wires, ctx.solved.wireCurrents)) / 1000;
    } else {
      kw = (volts * terminalCurrent(dev, 'l_out', ctx.wires, ctx.solved.wireCurrents)) / 1000;
    }
    const rated = Number(dev.state.ratedKva) || (is3p(dev) ? 20 : 5);
    const loadKw = Math.round(kw * 100) / 100;
    if (kw > rated) {
      const overloadSec = Math.round(((Number(dev.state.overloadSec) || 0) + dtSec) * 1000) / 1000;
      if (overloadSec >= GENERATOR_OVERLOAD_DELAY_SEC) {
        return withState(dev, { ...patch, running: false, overloaded: true, overloadSec, loadKw: 0 });
      }
      return withState(dev, { ...patch, loadKw, overloadSec });
    }
    return withState(dev, { ...patch, loadKw, overloadSec: 0 });
  },
};
