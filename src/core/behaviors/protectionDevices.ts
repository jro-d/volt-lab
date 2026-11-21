import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior, TerminalPair } from './types';
import { terminalCurrent, withState } from './util';
import { timeToTrip } from '../tripCurves';
import { DEFAULT_FUSE_TIME_SCALE } from './fuse';

const pairs = (names: string[], a: string, b: string): TerminalPair[] => names.map((n) => [`${a}_${n}`, `${b}_${n}`] as TerminalPair);
const PHASES = ['l1', 'l2', 'l3'];
const closedAndOk = (dev: ElectricalDevice) => !!dev.state.closed && !dev.state.tripped;

/** RCCB 4P: all four conductors switched together while closed. */
export const rcd4pBehavior: DeviceBehavior = {
  types: ['rcd_4p'],
  edges: (dev) => (closedAndOk(dev) ? pairs([...PHASES, 'n'], 'in', 'out') : []),
};

/** GFCI receptacle: LINE feeds the receptacle face and the LOAD terminals while it is closed. */
export const gfciBehavior: DeviceBehavior = {
  types: ['gfci_receptacle'],
  edges: (dev) =>
    closedAndOk(dev)
      ? [['line_l', 'load_l'], ['line_l', 'hot'], ['line_n', 'load_n'], ['line_n', 'neutral']]
      : [],
};

/** AFDD 1P+N: both poles through while closed. Overload / short-circuit rules are the standard breaker rules. */
export const afddBehavior: DeviceBehavior = {
  types: ['afdd_1pn'],
  edges: (dev) => (closedAndOk(dev) ? [['in_l', 'out_l'], ['in_n', 'out_n']] : []),
};

/** MCCB: closed and (if fitted) the undervoltage release is energized. */
export const mccbBehavior: DeviceBehavior = {
  types: ['mccb_3p'],
  edges: (dev) => (closedAndOk(dev) && (!dev.state.uvRelease || dev.state.uvPowered) ? pairs(PHASES, 'in', 'out') : []),
  tick: (dev, ctx, dt) => thermalMagnetic(dev, ctx.wires, ctx.solved.wireCurrents, dt, {
    ir: (Number(dev.state.ratedAmps) || 100) * (Number(dev.state.irFactor) || 1),
    curve: 'mccb_thermal',
    magMultiple: (Number(dev.state.imFactor) || 5),
    label: 'MCCB',
  }),
};

/** MPCB: class 10 thermal overload on the Ir dial plus a fixed magnetic trip at 13 x Ir. */
export const mpcbBehavior: DeviceBehavior = {
  types: ['mpcb_3p'],
  edges: (dev) => (closedAndOk(dev) ? pairs(PHASES, 'in', 'out') : []),
  tick: (dev, ctx, dt) => thermalMagnetic(dev, ctx.wires, ctx.solved.wireCurrents, dt, {
    ir: Number(dev.state.irAmps) || 6.3,
    curve: 'overload_class10',
    magMultiple: 13,
    label: 'MPCB',
  }),
};

/** Lockable rotary isolator: a padlock holds it open and blocks closing. */
export const isolatorBehavior: DeviceBehavior = {
  types: ['rotary_isolator_3p'],
  edges: (dev) => (closedAndOk(dev) && !dev.state.locked ? pairs(PHASES, 'in', 'out') : []),
};

function thermalMagnetic(
  dev: ElectricalDevice,
  wires: Parameters<typeof terminalCurrent>[2],
  currents: Record<string, number>,
  dtSec: number,
  cfg: { ir: number; curve: 'mccb_thermal' | 'overload_class10'; magMultiple: number; label: string }
): ElectricalDevice {
  if (!closedAndOk(dev)) return withState(dev, { heat: 0 });
  const amps = Math.max(...PHASES.map((p) => terminalCurrent(dev, `in_${p}`, wires, currents)));
  const magnetic = cfg.ir * cfg.magMultiple;
  if (amps > magnetic) {
    return withState(dev, { tripped: true, closed: false, heat: 1, tripReason: `${cfg.label} magnetic (instantaneous) trip: ${amps.toFixed(0)} A exceeds ${magnetic.toFixed(0)} A (${cfg.magMultiple} x Ir ${cfg.ir.toFixed(1)} A)` });
  }
  const simDt = dtSec * (Number(dev.state.timeScale) || DEFAULT_FUSE_TIME_SCALE);
  const t = timeToTrip(cfg.curve, cfg.ir, amps / cfg.ir);
  const heat0 = Number(dev.state.heat) || 0;
  const heat = Number.isFinite(t) ? heat0 + simDt / t : Math.max(0, heat0 - simDt / 600);
  if (heat >= 1) {
    return withState(dev, { tripped: true, closed: false, heat: 1, tripReason: `${cfg.label} thermal (overload) trip: ${amps.toFixed(1)} A is ${(amps / cfg.ir).toFixed(2)} x Ir (${cfg.ir.toFixed(1)} A)` });
  }
  return withState(dev, { heat: Math.round(heat * 1e4) / 1e4 });
}

/** Changeover output of the monitoring relays: com_15-no_18 when `relayOn`, com_15-nc_16 otherwise. */
const changeover = (dev: ElectricalDevice): TerminalPair[] => (dev.state.relayOn ? [['com_15', 'no_18']] : [['com_15', 'nc_16']]);

/**
 * Under/over-voltage relay. The solver reports `supplied` and `windowOk`; the output is on while the voltage is in
 * the window, and drops after `delaySec` outside it (or at once with no supply).
 */
export const voltageRelayBehavior: DeviceBehavior = {
  types: ['voltage_relay'],
  edges: changeover,
  tick(dev, _ctx, dt) {
    if (!dev.state.supplied) return withState(dev, { relayOn: false, timerSec: 0, relayFault: 'NO SUPPLY' });
    if (dev.state.windowOk) return withState(dev, { relayOn: true, timerSec: 0, relayFault: '' });
    const timer = (Number(dev.state.timerSec) || 0) + dt;
    const delay = Number(dev.state.delaySec) || 0;
    const fault = Number(dev.state.senseV) < Number(dev.state.nominalV) ? 'UNDERVOLTAGE' : 'OVERVOLTAGE';
    return timer >= delay ? withState(dev, { relayOn: false, timerSec: timer, relayFault: fault }) : withState(dev, { timerSec: timer });
  },
};

/** Earth-leakage relay: operates (output transfers) when the leakage stays above the sensitivity for the delay. */
export const earthLeakageRelayBehavior: DeviceBehavior = {
  types: ['earth_leakage_relay'],
  edges: changeover,
  tick(dev, _ctx, dt) {
    if (!dev.state.supplied) return withState(dev, { relayOn: false, timerSec: 0, relayFault: 'NO SUPPLY' });
    const leak = Number(dev.state.leakageMa) || 0;
    if (leak < (Number(dev.state.sensitivityMa) || 300)) return withState(dev, { relayOn: false, timerSec: 0, relayFault: '' });
    const timer = (Number(dev.state.timerSec) || 0) + dt;
    return timer >= (Number(dev.state.delaySec) || 0)
      ? withState(dev, { relayOn: true, timerSec: timer, relayFault: 'EARTH LEAKAGE' })
      : withState(dev, { timerSec: timer });
  },
};

/** PTC relay: the solver reads the watched motor's winding temperature and sets `relayOn` (healthy). */
export const ptcRelayBehavior: DeviceBehavior = {
  types: ['ptc_relay'],
  edges: changeover,
};

/** Core balance CT: the conductors pass straight through. */
export const coreBalanceCtBehavior: DeviceBehavior = {
  types: ['core_balance_ct'],
  edges: () => pairs([...PHASES, 'n'], 'in', 'out'),
};

/** Measuring CT: the primary conductor passes straight through P1-P2. */
export const currentTransformerBehavior: DeviceBehavior = {
  types: ['current_transformer'],
  edges: () => [['p1', 'p2']],
};

/** Terminal strip and distribution block. */
export const terminalBlockBehavior: DeviceBehavior = {
  types: ['terminal_block'],
  edges: (dev) => {
    const poles = [1, 2, 3, 4];
    if (dev.state.kind === 'pe') {
      const all = poles.flatMap((n) => [`a${n}`, `b${n}`]);
      return all.slice(1).map((t) => [all[0], t] as TerminalPair);
    }
    const open = (dev.state.openPoles || {}) as Record<string, boolean>;
    return poles.filter((n) => !(dev.state.kind === 'fused' && open[`p${n}`])).map((n) => [`a${n}`, `b${n}`] as TerminalPair);
  },
};
export const distributionBlockBehavior: DeviceBehavior = {
  types: ['distribution_block'],
  edges: () => ['o1', 'o2', 'o3', 'o4'].map((t) => ['in', t] as TerminalPair),
};

/**
 * Motor winding temperature (simple first-order model): steady temperature rises with the square of the load
 * ratio, 40 C ambient + 60 K at full load; a single-phasing motor behaves like a locked rotor (2.5 x).
 * Simulated time runs `timeScale` times faster than the wall clock.
 */
export const motorThermalBehavior: DeviceBehavior = {
  types: ['motor_ac_industrial', 'pump_booster_3p', 'motor_6lead_star_delta'],
  tick(dev, _ctx, dt) {
    const T = Number(dev.state.windingC);
    const temp = Number.isFinite(T) ? T : 40;
    const loadRatio = dev.state.motorRunning ? (Number(dev.state.loadPct) || 100) / 100 : /single/i.test(String(dev.state.motorFault || '')) ? 2.5 : 0;
    const target = 40 + 60 * loadRatio * loadRatio;
    const simDt = dt * (Number(dev.state.timeScale) || DEFAULT_FUSE_TIME_SCALE);
    const next = temp + (target - temp) * (1 - Math.exp(-simDt / 40));
    return withState(dev, { windingC: Math.round(next * 10) / 10 });
  },
};

/** Panel ammeter: its movement is a short path between I1 and I2 (the CT secondary loops through it). */
export const panelAmmeterBehavior: DeviceBehavior = {
  types: ['panel_ammeter'],
  edges: () => [['i1', 'i2']],
};
