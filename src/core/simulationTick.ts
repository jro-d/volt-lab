import type { ElectricalDevice, ElectricalWire, ProcessState } from '../types/electrical';
import type { SolvedCircuit } from './circuitSolver';
import { behaviorFor } from './behaviors/registry';
import { PROCESS_DEVICE_TYPES } from './process';

/** Simulation step used by the app while the grid is energized (seconds). */
export const TICK_SECONDS = 0.5;

/** True when at least one device has time-dependent behaviour, so the app needs to run the tick. */
export function needsTick(devices: ElectricalDevice[]): boolean {
  return devices.some((d) => !!behaviorFor(d.type)?.tick || PROCESS_DEVICE_TYPES.has(d.type));
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
  dtSec: number = TICK_SECONDS,
  process?: ProcessState
): ElectricalDevice[] {
  let changed = false;
  const next = devices.map((dev) => {
    const tick = behaviorFor(dev.type)?.tick;
    if (!tick) return dev;
    const updated = tick(dev, { solved, wires, gridFrequency, process }, dtSec);
    if (updated !== dev) changed = true;
    return updated;
  });
  return changed ? next : devices;
}

/**
 * Persists what the protective devices did in the last solve: tripped breakers / RCDs open and stay open,
 * and devices that cleared a fault without opening as a whole (a blown fuse link) get their state patch.
 * Returns the same array when nothing needs to change.
 */
export function applyProtectiveOutcome(
  devices: ElectricalDevice[],
  result: Pick<SolvedCircuit, 'trippedDevices' | 'tripReasons' | 'devicePatches'>
): ElectricalDevice[] {
  const patches = result.devicePatches || {};
  let changed = false;
  const next = devices.map((d) => {
    let state = d.state;
    if (result.trippedDevices.includes(d.id) && !state.tripped) {
      state = { ...state, tripped: true, closed: false, tripReason: result.tripReasons[d.id] };
    }
    const patch = patches[d.id];
    if (patch && Object.keys(patch).some((k) => !Object.is(state[k], patch[k]))) {
      state = { ...state, ...patch, ...(result.tripReasons[d.id] && !state.tripReason ? { tripReason: result.tripReasons[d.id] } : {}) };
    }
    if (state === d.state) return d;
    changed = true;
    return { ...d, state };
  });
  return changed ? next : devices;
}
