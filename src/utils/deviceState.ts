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
  'secondaryLive',
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
  if ('measuredAmps' in state) state.measuredAmps = 0;
  if ('motorDirection' in state) state.motorDirection = null;
  if ('motorFault' in state) state.motorFault = null;
  if ('starterMode' in state) state.starterMode = null;
  if (device.type === 'pump_booster_1p' || device.type === 'pump_booster_3p') state.pumping = false;
  if (device.type === 'motor_ac_industrial' || device.type === 'pump_booster_3p' || device.type === 'motor_6lead_star_delta') state.windingC = 40;
  if (device.type === 'mccb_3p' || device.type === 'mpcb_3p') state.heat = 0;
  if (device.type === 'mccb_3p') state.uvPowered = false;
  if (device.type === 'voltage_relay' || device.type === 'earth_leakage_relay' || device.type === 'ptc_relay') {
    state.relayOn = false;
    state.supplied = false;
    state.timerSec = 0;
    state.relayFault = '';
    state.ptcTripped = false;
    state.windingC = 40;
    state.leakageMa = 0;
  }
  if (device.type === 'core_balance_ct') state.leakageMa = 0;
  if (device.type === 'current_transformer') {
    state.openSecondary = false;
    state.secondaryA = 0;
    state.primaryAmps = 0;
  }
  if (device.type === 'panel_ammeter') state.readingA = 0;
  if (device.type === 'voltmeter_selector') state.readingV = 0;
  if ('arcing' in state) state.arcing = false;
  if (device.type === 'psu_24vdc') {
    state.dcOutputOn = false;
    state.psuTripped = false;
    state.psuRecoverSec = 0;
    state.psuFault = '';
    state.dcLoadAmps = 0;
  }
  if (device.type === 'sensor_inductive' || device.type === 'sensor_capacitive' || device.type === 'sensor_photoelectric') {
    state.outActive = false;
    state.sensorPowered = false;
    state.wiringNote = '';
    state.supplyNote = '';
  }
  if (device.type === 'plc_24vdc_16io') state.dcNote = '';
  if (device.type === 'motor_1p') {
    state.speedPct = 0;
    state.startOk = false;
    state.centrifugalOpen = false;
    state.motorNote = '';
  }
  if (device.type === 'buzzer_horn' || device.type === 'beacon' || device.type === 'tower_light') {
    state.active = false;
    if ('segments' in state) state.segments = {};
  }
  if (device.type === 'industrial_relay_dpdt' && state.coilType === 'dc24') state.coilEnergized = false;
  if (device.type === 'float_switch' || device.type === 'pressure_switch') state.contactClosed = false;
  if (device.type === 'generator_set_1p' || device.type === 'generator_set_3p') {
    // A stopped plant when the grid is de-energized
    state.running = false;
    state.runRequested = false;
    state.remoteStart = false;
    state.startSec = 0;
    state.overloaded = false;
    state.overloadSec = 0;
    state.loadKw = 0;
  }
  if (device.type === 'ats_changeover') state.transferSec = 0;
  if (device.type === 'kwh_meter_3p') {
    // The energy register is kept; only the live readout clears
    state.energized = false;
    state.l1Amps = 0;
    state.l2Amps = 0;
    state.l3Amps = 0;
  }
  if (device.type === 'timer_relay') {
    state.energized = false;
    state.elapsedSec = 0;
    state.timedOut = false;
  }
  // Momentary push buttons spring back when the grid is de-energized
  for (const k of ['startPressed', 'stopPressed', 'fwdPressed', 'revPressed']) {
    if (k in state) state[k] = false;
  }
  // A contactor's `closed` flag is purely coil-driven (unlike breakers / switches, where it is user state)
  if (device.type === 'contactor_3p') state.closed = false;

  return { ...device, state };
}

/** Re-arm a tripped breaker / RCD (closes it and clears the trip reason). */
export function resetTripState(device: ElectricalDevice): ElectricalDevice {
  // Entering edit mode also fits a new link in any blown fuse (heat history is cleared)
  // A blown fuse link stays blown until the user replaces it (unlike a breaker it cannot be re-armed);
  // only the thermal history of the intact links is cleared.
  if (device.type === 'fuse_holder_1p') {
    return { ...device, state: { ...device.state, tripped: !!device.state.blown, tripReason: device.state.blown ? device.state.tripReason : undefined, heat: 0, onSec: 0 } };
  }
  if (device.type === 'fuse_switch_disconnector_3p') {
    const state: Record<string, any> = { ...device.state };
    for (const p of ['l1', 'l2', 'l3']) {
      state[`heat_${p}`] = 0;
      state[`onSec_${p}`] = 0;
    }
    return { ...device, state };
  }
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

/** Fit new links in any blown fuse (used by the Reset Simulation button). */
export function replaceBlownFuse(device: ElectricalDevice): ElectricalDevice {
  if (device.type === 'fuse_holder_1p') {
    return { ...device, state: { ...device.state, blown: false, tripped: false, closed: true, heat: 0, onSec: 0, tripReason: undefined } };
  }
  if (device.type === 'fuse_switch_disconnector_3p') {
    const state: Record<string, any> = { ...device.state };
    for (const p of ['l1', 'l2', 'l3']) {
      state[`blown_${p}`] = false;
      state[`heat_${p}`] = 0;
      state[`onSec_${p}`] = 0;
    }
    return { ...device, state };
  }
  return device;
}
