import type { ElectricalDevice, ProcessState } from '../types/electrical';

/**
 * A deliberately tiny process model so a pump, a float switch and a pressure switch can close their own loop.
 * It is not a fluid simulator: one tank and one line per project.
 *
 *  - Tank: TANK_LITRES. A running pump adds PUMP_LPM_PER_KW litres per minute per kW; the draw-off slider
 *    (`drawOffLpm`) removes litres per minute. tankLevel is a percentage, 0-100.
 *  - Line pressure: a running pump raises `lineBar` by PUMP_BAR_PER_SEC; with the pump off it falls by
 *    BAR_DECAY_BASE plus BAR_DECAY_PER_LPM per litre per minute of draw-off. Limits: 0 to MAX_BAR.
 *  - The tank runs PROCESS_TIME_SCALE times faster than the wall clock so a cycle can be watched
 *    (the bar rates are already per real second).
 */
export const DEFAULT_PROCESS: ProcessState = { tankLevel: 50, lineBar: 0, drawOffLpm: 10 };

export const TANK_LITRES = 500;
export const PROCESS_TIME_SCALE = 30;
export const PUMP_LPM_PER_KW = 40;
export const PUMP_BAR_PER_SEC = 0.1;
export const BAR_DECAY_BASE = 0.02;
export const BAR_DECAY_PER_LPM = 0.004;
export const MAX_BAR = 5;

export const PUMP_TYPES = new Set(['pump_booster_1p', 'pump_booster_3p', 'pump_submersible_3p', 'air_compressor_3p']);
export const PROCESS_DEVICE_TYPES = new Set(['pump_booster_1p', 'pump_booster_3p', 'pump_submersible_3p', 'air_compressor_3p', 'float_switch', 'pressure_switch']);

export const isPump = (d: ElectricalDevice) => PUMP_TYPES.has(d.type);
/** A pump is pumping when its motor is electrically running (set by the solver). */
export const isPumping = (d: ElectricalDevice) => isPump(d) && !!d.state.pumping;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Pump flow (litres per minute) delivered by the running pumps. */
export function pumpFlowLpm(devices: ElectricalDevice[]): number {
  let lpm = 0;
  for (const d of devices) if (isPumping(d)) lpm += (Number(d.state.kw) || 0) * PUMP_LPM_PER_KW;
  return lpm;
}

/**
 * Advances the shared process by `dtSec`. Returns the same object when nothing changes, and the input
 * (possibly undefined) when the project has no process devices.
 */
export function tickProcess(devices: ElectricalDevice[], process: ProcessState | undefined, dtSec: number): ProcessState | undefined {
  if (!process && !devices.some((d) => PROCESS_DEVICE_TYPES.has(d.type))) return process;
  const p = process || DEFAULT_PROCESS;
  const pumping = devices.some(isPumping);
  const flow = pumpFlowLpm(devices);
  const draw = Math.max(0, Number(p.drawOffLpm) || 0);

  const dLevel = ((flow - draw) / TANK_LITRES) * 100 * (dtSec / 60) * PROCESS_TIME_SCALE;
  const tankLevel = round(clamp(p.tankLevel + dLevel, 0, 100), 2);

  const dBar = pumping ? PUMP_BAR_PER_SEC * dtSec : -(BAR_DECAY_BASE + BAR_DECAY_PER_LPM * draw) * dtSec;
  const lineBar = round(clamp(p.lineBar + dBar, 0, MAX_BAR), 3);

  if (process && tankLevel === process.tankLevel && lineBar === process.lineBar) return process;
  return { ...p, tankLevel, lineBar };
}
