import { ElectricalDevice } from '../types/electrical';

/**
 * State keys that are *derived* by the circuit solver while the grid is energized.
 * In Edit Mode (de-energized) they must read as "off" so the workbench never shows a
 * lit lamp, spinning motor, pulled-in contactor, etc. without power.
 */
const BOOLEAN_TRANSIENT_KEYS = [
  'lit',
  'powered',
  'running',
  'motorRunning',
  'pilotLit',
  'coilEnergized',
  'plcPowered',
];

/** Return a copy of the device with all solver-derived (energized) state cleared. */
export function resetTransientState(device: ElectricalDevice): ElectricalDevice {
  const state = { ...device.state };

  for (const key of BOOLEAN_TRANSIENT_KEYS) {
    if (key in state) state[key] = false;
  }
  if ('brightness' in state) state.brightness = 0;
  if ('plcInputs' in state) state.plcInputs = {};
  if ('plcOutputs' in state) state.plcOutputs = {};
  // A contactor's `closed` flag is purely coil-driven (unlike breakers / switches, where it is user state)
  if (device.type === 'contactor_3p') state.closed = false;

  return { ...device, state };
}

/** Re-arm a tripped breaker / RCD (closes it and clears the trip reason). */
export function resetTripState(device: ElectricalDevice): ElectricalDevice {
  if (!device.state.tripped) return device;
  return {
    ...device,
    state: { ...device.state, tripped: false, closed: true, tripReason: undefined },
  };
}

/** Full "safe edit mode" normalisation: de-energise visuals and re-arm trips. */
export function toEditModeDevices(devices: ElectricalDevice[]): ElectricalDevice[] {
  return devices.map((d) => resetTripState(resetTransientState(d)));
}
