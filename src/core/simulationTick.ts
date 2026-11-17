import type { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { SolvedCircuit } from './circuitSolver';
import { behaviorFor } from './behaviors/registry';

/** Simulation step used by the app while the grid is energized (seconds). */
export const TICK_SECONDS = 0.5;

/** True when at least one device has time-dependent behaviour, so the app needs to run the tick. */
export function needsTick(devices: ElectricalDevice[]): boolean {
  return devices.some((d) => !!behaviorFor(d.type)?.tick);
}

/**
 * Advances every time-dependent device (timers, meters, fuses, generators ...) by `dtSec`.
 * Returns the same array when nothing changed, so callers can skip a state update.
 */
export function tickSimulation(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  solved: SolvedCircuit,
  gridFrequency: number,
  dtSec: number = TICK_SECONDS
): ElectricalDevice[] {
  let changed = false;
  const next = devices.map((dev) => {
    const tick = behaviorFor(dev.type)?.tick;
    if (!tick) return dev;
    const updated = tick(dev, { solved, wires, gridFrequency }, dtSec);
    if (updated !== dev) changed = true;
    return updated;
  });
  return changed ? next : devices;
}
