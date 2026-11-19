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
  if (device.type === 'plc_micro_controller' || device.type === 'plc_24vdc_16io') {
    // The scan memory (timers, counters, latches) clears with the PLC power; the program itself stays
    state.plcRuntime = undefined;
    state.plcScans = 0;
  }
  if (device.type === 'pump_booster_1p' || device.type === 'pump_booster_3p') state.pumping = false;
  // Batch 3.2: live readouts clear; stored energy (UPS charge, meter registers) and handle positions stay
  if (device.type === 'ups_battery') {
    state.onBattery = false;
    state.loadW = 0;
  }
  if (device.type === 'inverter_gridtie') {
    state.acPowerW = 0;
    state.reconnectSec = 0;
    state.status = 'NO DC INPUT';
  }
  if (device.type === 'pv_string') {
    state.dcOutputOn = false;
    state.powerW = 0;
  }
  if (device.type === 'capacitor_bank_3p') {
    for (let i = 1; i <= 4; i++) {
      state[`on${i}`] = false;
      state[`lock${i}`] = 0;
    }
    state.stepsOn = 0;
    state.kvarOn = 0;
  }
  if (device.type === 'pf_controller') state.stepsCmd = 0;
  if (device.type === 'preferential_trip_relay' || device.type === 'reverse_power_relay') {
    state.tripped = false;
    state.timerSec = 0;
  }
  if (device.type === 'synchroscope') state.inSync = false;
  // Batch 3.3: control modules return to their power-up state (set points and handle positions stay)
  if (device.type === 'star_delta_timer') {
    state.phase = 'idle';
    state.elapsedSec = 0;
  }
  if (device.type === 'counter_relay') {
    state.count = 0;
    state.out = false;
    state.countPrev = false;
  }
  if (device.type === 'impulse_relay') {
    state.latched = false;
    state.coilPrev = false;
  }
  if (device.type === 'staircase_timer') {
    state.remainingSec = 0;
    state.active = false;
  }
  if (device.type === 'time_switch_24h') state.out = false;
  if (device.type === 'alternating_relay') {
    state.lead = 2;
    state.coilOn = false;
  }
  if (device.type === 'ssr_1p') state.on = false;
  if (device.type === 'operator_pilot') state.lit = false;
  if (device.type === 'aux_contact_block') state.engaged = false;
  if (device.type === 'safety_relay') {
    state.powered = false;
    state.ch1 = false;
    state.ch2 = false;
    state.outOn = false;
    state.fault = false;
    state.discrepancy = false;
    state.x2Prev = false;
  }
  if (device.type === 'two_hand_station') {
    state.armed = false;
    state.needRelease = false;
  }
  // Batch 3.4: outputs and measured values clear; set points, targets and positions stay
  if (device.type === 'electrode_level_relay') {
    state.out = false;
    state.powered = false;
  }
  if (device.type === 'thermostat') {
    state.out = false;
    state.tempC = Number(state.ambientC) || 15;
  }
  if (device.type === 'thermocouple_k') state.tempC = Number(state.ambientC) || 20;
  if (device.type === 'temp_controller') {
    state.out = false;
    state.pv = 0;
    state.fault = '';
  }
  if (device.type === 'photocell_switch') state.on = false;
  if (device.type === 'pir_sensor') {
    state.on = false;
    state.remainingSec = 0;
  }
  if (device.type === 'flow_switch') {
    state.flowing = false;
    state.lpm = 0;
  }
  if (device.type === 'zero_speed_switch') {
    state.speedPct = 0;
    state.zero = false;
  }
  if (device.type === 'solenoid_valve') state.open = false;
  // Batch 3.5: speeds, ramps and positions return to standstill; set points stay
  if (['soft_starter', 'starter_reduced_voltage'].includes(device.type)) {
    state.on = false;
    state.phase = 'idle';
    state.elapsedSec = 0;
    state.rampPct = 0;
  }
  if (['motor_dahlander', 'motor_wound_rotor', 'motor_dc_shunt', 'motor_brake'].includes(device.type)) {
    state.speedPct = 0;
    state.running = false;
  }
  if (device.type === 'motor_dahlander') state.speedSet = 'off';
  if (device.type === 'motor_wound_rotor') state.stages = -1;
  if (device.type === 'rotor_resistor_bank') state.stages = 0;
  if (device.type === 'motor_dc_shunt') {
    state.elapsedSec = 0;
    state.starterStep = 0;
    state.armPowered = false;
    state.fieldPowered = false;
    state.overspeed = false;
  }
  if (device.type === 'motor_brake') {
    state.brakeReleased = false;
    state.locked = false;
  }
  if (device.type === 'dc_injection_brake') {
    state.remainingSec = 0;
    state.braking = false;
    state.runPrev = false;
  }
  if (device.type === 'pump_submersible_3p' || device.type === 'air_compressor_3p') {
    state.running = false;
    state.pumping = false;
  }
  if (device.type === 'hoist_conveyor') {
    state.running = false;
    state.moving = false;
    state.stalled = false;
    state.stallSec = 0;
  }
  if (device.type === 'fire_alarm_panel') {
    state.powered = false;
    state.alarm = false;
    state.silenced = false;
    state.loopTripped = false;
    state.resetRequested = false;
  }
  if (device.type === 'generator_set_1p' || device.type === 'generator_set_3p') state.phaseAngleDeg = 0;
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
