import type { DeviceBehavior } from './types';
import { withState } from './util';

export type TimerMode = 'on_delay' | 'off_delay' | 'flasher' | 'one_shot';

export const TIMER_MODE_LABEL: Record<TimerMode, string> = {
  on_delay: 'On-delay',
  off_delay: 'Off-delay',
  flasher: 'Flasher',
  one_shot: 'One-shot',
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Timer relay (IEC 61812-1) with selectable function. `timedOut` is the contact state used by the solver
 * and the ladder: true = 15-18 closed / 15-16 open ("contacts transferred"). `energized` is the coil.
 *
 * - on_delay:  coil on -> transfer after delaySec; coil off -> release immediately
 * - off_delay: coil on -> transfer immediately; coil off -> release after delaySec
 * - flasher:   while the coil is on the contacts toggle every delaySec (rest first); coil off -> reset
 * - one_shot:  coil on -> transfer for delaySec, then release even if the coil stays on; re-arms when the coil drops
 */
export const timerModesBehavior: DeviceBehavior = {
  types: ['timer_relay'],

  tick(dev, ctx, dtSec) {
    const mode = (dev.state.timerMode as TimerMode) || 'on_delay';
    const delay = typeof dev.state.delaySec === 'number' ? dev.state.delaySec : 5;
    const coilOn = !!ctx.solved.deviceEnergized[dev.id];
    const elapsed = typeof dev.state.elapsedSec === 'number' ? dev.state.elapsedSec : 0;
    const wasCoilOn = !!dev.state.energized;
    const wasTransferred = !!dev.state.timedOut;

    let nextElapsed = elapsed;
    let transferred = wasTransferred;

    switch (mode) {
      case 'on_delay':
        if (coilOn) {
          nextElapsed = Math.min(delay, round3(elapsed + dtSec));
          transferred = nextElapsed >= delay;
        } else {
          nextElapsed = 0;
          transferred = false;
        }
        break;

      case 'off_delay':
        if (coilOn) {
          nextElapsed = 0;
          transferred = true;
        } else if (wasTransferred) {
          // Coil dropped: count the release delay from the moment it dropped
          nextElapsed = wasCoilOn ? round3(dtSec) : round3(elapsed + dtSec);
          transferred = nextElapsed < delay;
          if (!transferred) nextElapsed = 0;
        } else {
          nextElapsed = 0;
        }
        break;

      case 'flasher':
        if (coilOn) {
          const period = Math.max(delay, 0.001) * 2;
          nextElapsed = round3((elapsed + dtSec) % period);
          transferred = nextElapsed >= delay;
        } else {
          nextElapsed = 0;
          transferred = false;
        }
        break;

      case 'one_shot':
        if (coilOn) {
          // `oneShotDone` stays set while the coil stays on, so the pulse is not repeated
          if (dev.state.oneShotDone) {
            transferred = false;
          } else {
            nextElapsed = round3((wasCoilOn ? elapsed : 0) + dtSec);
            transferred = nextElapsed < delay;
            if (!transferred) return withState(dev, { energized: true, elapsedSec: 0, timedOut: false, oneShotDone: true });
          }
        } else {
          nextElapsed = 0;
          transferred = false;
          return withState(dev, { energized: false, elapsedSec: 0, timedOut: false, oneShotDone: false });
        }
        break;
    }

    return withState(dev, { energized: coilOn, elapsedSec: nextElapsed, timedOut: transferred });
  },
};
