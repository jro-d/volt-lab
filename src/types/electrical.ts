import type { LadderRung } from './ladder';

export type CodeStandard = 'PEC' | 'IEC';


export type TerminalType = 
  | 'phase' 
  | 'phase2' 
  | 'phase3' 
  | 'neutral' 
  | 'earth' 
  | 'switched' 
  | 'load' 
  | 'common' 
  | 'traveler'
  | 'splice'
  | 'coil'
  | 'no'
  | 'nc'
  | 'input'
  | 'output';

export interface DeviceTerminal {
  id: string;
  name: string;
  type: TerminalType;
  relX: number; // percentage (0..1) or pixel relative to device width
  relY: number; // percentage (0..1) or pixel relative to device height
  label?: string;
  phaseLabel?: 'L' | 'L1' | 'L2' | 'L3' | 'W2' | 'U2' | 'V2' | 'N' | 'PE' | 'SW' | '1' | '2' | '3' | 'COM' | 'SPLICE' | 'A1' | 'A2' | 'NO' | 'NC' | 'IN' | 'OUT' | 'H1' | 'H2' | 'X1' | 'X2' | '+24V' | '0V' | 'SIG';
  spliceGroup?: string; // for junction boxes where terminals in the same group are shorted
}

export type DeviceCategory = 
  | 'supply' 
  | 'protection' 
  | 'busbar' 
  | 'control' 
  | 'receptacle' 
  | 'load' 
  | 'earthing' 
  | 'splice'
  | 'industrial'
  | 'automation';

export type DeviceType = 
  | 'kwh_meter_1p'
  | 'kwh_meter_3p'
  | 'service_disconnect_2p'
  | 'mcb_1p'
  | 'mcb_2p'
  | 'mcb_3p'
  | 'rcd_2p'
  | 'spd_surge'
  | 'earth_busbar'
  | 'neutral_busbar'
  | 'ground_pit'
  | 'switch_1gang'
  | 'switch_3way'
  | 'switch_4way'
  | 'socket_duplex'
  | 'socket_schuko'
  | 'light_bulb'
  | 'appliance_tv'
  | 'appliance_water_heater'
  | 'appliance_fan'
  | 'appliance_ac'
  | 'junction_box_4way'
  | 'junction_box_octagonal_orange'
  | 'splice_wire_nut'
  | 'lever_connector_3p'
  | 'industrial_relay_dpdt'
  | 'contactor_3p'
  | 'push_button_station'
  | 'push_button_estop'
  | 'pilot_light_indicator'
  | 'plc_micro_controller'
  | 'motor_ac_industrial'
  // Phase 2: Philippine residential hardware (brand-neutral standard devices)
  | 'safety_breaker_2p'
  | 'din_rail_track'
  | 'utility_box_surface_pvc'
  | 'modular_combo_plate'
  // Phase 3: Marine & Industrial Motor Control Trainer
  | 'thermal_overload_relay'
  | 'control_transformer'
  | 'source_3phase_440v'
  | 'push_button_fwd_rev'
  // Phase 4: Extended Residential, Commercial & Industrial Suite
  | 'switch_2gang'
  | 'switch_3gang'
  | 'dimmer_switch'
  | 'ats_changeover'
  | 'panel_meter'
  | 'timer_relay'
  | 'selector_hoa'
  | 'limit_switch'
  | 'vfd_drive'
  | 'motor_6lead_star_delta'
  // Roadmap phase 1
  | 'fuse_holder_1p'
  | 'fuse_switch_disconnector_3p'
  | 'rcbo_1pn'
  | 'generator_set_1p'
  | 'generator_set_3p'
  // Roadmap phase 2
  | 'float_switch'
  | 'pressure_switch'
  | 'pump_booster_1p'
  | 'pump_booster_3p'
  | 'phase_monitor_relay'
  // Batch 3.3: control and timing
  | 'star_delta_timer'
  | 'counter_relay'
  | 'impulse_relay'
  | 'staircase_timer'
  | 'time_switch_24h'
  | 'alternating_relay'
  | 'ssr_1p'
  | 'operator_pilot'
  | 'aux_contact_block'
  | 'mechanical_interlock'
  | 'safety_relay'
  | 'two_hand_station'
  | 'door_interlock_switch'
  | 'pull_cord_switch'
  // Batch 3.4: sensors and field devices
  | 'electrode_level_relay'
  | 'thermostat'
  | 'thermocouple_k'
  | 'temp_controller'
  | 'reed_switch'
  | 'photocell_switch'
  | 'pir_sensor'
  | 'flow_switch'
  | 'zero_speed_switch'
  | 'solenoid_valve'
  | 'smoke_detector'
  | 'manual_call_point'
  | 'fire_alarm_panel'
  // Batch 3.2: sources and power systems
  | 'transfer_switch_manual'
  | 'ups_battery'
  | 'pv_string'
  | 'dc_isolator'
  | 'inverter_gridtie'
  | 'net_meter'
  | 'transformer_1p_pole'
  | 'transformer_3p_delta_wye'
  | 'capacitor_bank_3p'
  | 'pf_controller'
  | 'shore_connection_box'
  | 'ground_detection_lamps'
  | 'synchroscope'
  | 'reverse_power_relay'
  | 'preferential_trip_relay'
  | 'psu_24vdc'
  | 'sensor_inductive'
  | 'sensor_capacitive'
  | 'sensor_photoelectric'
  | 'plc_24vdc_16io'
  | 'buzzer_horn'
  | 'beacon'
  | 'tower_light'
  | 'motor_1p'
  | 'capacitor_run'
  | 'rcd_4p'
  | 'gfci_receptacle'
  | 'afdd_1pn'
  | 'mccb_3p'
  | 'mpcb_3p'
  | 'rotary_isolator_3p'
  | 'voltage_relay'
  | 'earth_leakage_relay'
  | 'core_balance_ct'
  | 'ptc_relay'
  | 'current_transformer'
  | 'panel_ammeter'
  | 'voltmeter_selector'
  | 'terminal_block'
  | 'distribution_block';

export interface ElectricalDevice {
  id: string;
  type: DeviceType;
  category: DeviceCategory;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0, 90, 180, 270 degrees
  // Standard (brand-neutral) engineering specs
  /** Product standard the device is modelled on, e.g. 'IEC 60898-1' */
  productStandard?: string;
  modelNumber?: string;
  kaRating?: number; // Interrupting capacity in kA (e.g. 6kA or 10kA)
  mountingType?: 'bolt_on' | 'plug_in' | 'din_rail' | 'flush_utility' | 'surface_nema3r';
  pecReference?: string;
  terminals: DeviceTerminal[];
  state: {
    closed?: boolean; // for switches and breakers
    tripped?: boolean; // for MCBs / RCDs
    tripReason?: string;
    powered?: boolean; // for loads
    currentAmps?: number;
    voltageVolts?: number;
    wattage?: number;
    powerFactor?: number;
    ratedAmps?: number;
    tripCurve?: 'B' | 'C' | 'D';
    leakageMa?: number; // for RCD test or earth fault
    resistanceOhms?: number;
    hasCover?: boolean; // for junction boxes
    boxMaterial?: 'orange_pvc' | 'galvanized_steel';
    viewMode?: 'front' | 'rear' | 'cutaway'; // sockets/switches (faceplate vs mechanism) or contactor X-ray cutaway
    mccbStyle?: 'din_rail' | 'industrial_black';
    tabBroken?: boolean; // for duplex outlets with split brass tab
    topologyMode?: 'pigtail' | 'daisy_chain'; // for educational templates
    // Residential hardware states
    breakerProfile?: 'bolt_on' | 'din_rail';
    enclosureCoverOpen?: boolean; // enclosed safety breaker cover
    comboSlot2?: 'pilot' | 'switch2'; // wide-series combo plate middle module
    switchClosed?: boolean;
    switch2Closed?: boolean;
    pilotLit?: boolean;
    receptaclePowered?: boolean;
    trackWidth?: number; // for din_rail_track
    // Phase 3: motor control states
    tag?: string; // schematic device tag (KM1, KM2, F2, S1 ...)
    role?: string; // functional role shown on ladder (FOR, REV, RUN ...)
    tripAmps?: number; // thermal overload relay dial setting
    measuredAmps?: number; // solver-derived line current through a device
    motorDirection?: 'CW' | 'CCW' | null; // solver-derived rotation of 3-phase motor
    starterMode?: 'wye' | 'delta' | null; // solver-derived Wye-Delta starting stage
    motorFault?: string | null; // solver-derived motor fault (single phasing etc.)
    secondaryLive?: boolean; // control transformer secondary energized
    [key: string]: any;
  };
}

export interface ElectricalWire {
  id: string;
  fromDeviceId: string;
  fromTerminalId: string;
  toDeviceId: string;
  toTerminalId: string;
  wireGauge: string; // e.g. "14 AWG (2.0 mm²)" or "2.5 mm²"
  color: string; // hex color or standard code name
  userColorOverride?: string;
  lengthMeters: number;
  currentAmps?: number;
  voltageDropVolts?: number;
  voltageDropPercent?: number;
  waypoints?: { x: number; y: number }[];
  /** @deprecated No longer generated; kept so older saved projects keep type-checking and loading. */
  cableBundleId?: string;
  conductorRole?: 'feed_live' | 'return_neutral' | 'earth_ground' | 'switched_live' | 'traveler';
  label?: string; // Optional user circuit/wire tag (e.g. CKT-1 L1, T1, SW-RET)
}


/** Troubleshooting mode: hidden faults injected into a working circuit (see core/faults.ts). */
export type FaultKind =
  | 'open_coil'
  | 'welded_contact'
  | 'contact_open'
  | 'loose_neutral'
  | 'open_wire'
  | 'high_resistance_joint'
  | 'earth_fault_to_frame'
  | 'overload_setting_wrong'
  | 'blown_fuse'
  | 'swapped_phases';

export interface InjectedFault {
  id: string;
  /** The device the fault is on (for a wire fault: the device at the wire's start) */
  deviceId: string;
  kind: FaultKind;
  /** Kind-specific: wireId, wireA / wireB, terminalId, pair [a, b], dialAmps, ohms */
  params: Record<string, any>;
  revealed: boolean;
}

export interface ElectricalProject {
  id: string;
  title: string;
  description: string;
  codeStandard: CodeStandard;
  gridVoltage: number; // 230 for 1P, 400 or 220 for 3P
  gridFrequency: number; // 60 for PEC, 50 for IEC
  systemEarthing: 'TN-S' | 'TN-C-S' | 'TT';
  devices: ElectricalDevice[];
  wires: ElectricalWire[];
  /** Student-built control ladder (Rung Builder) */
  ladder?: LadderRung[];
  /** Lab reference ladder diagram (target logic) */
  targetLadder?: LadderRung[];
  /** Shared tank / line-pressure state for pumps, float and pressure switches (see core/process.ts) */
  process?: ProcessState;
  /** Troubleshooting faults, applied only while Troubleshoot mode is on. Absent in older saves. */
  faults?: InjectedFault[];
  faultsVersion?: number;
  /** Timing diagram recorder channels (versioned so older saves keep loading) */
  recorder?: { v: 1; channels: RecorderChannel[] };
  /** Coordination curves panel: the device chain (upstream first), a cable and a motor to plot */
  curves?: { v: 1; chain: string[]; wireId?: string; motorId?: string };
  /** Short-circuit check (off until enabled): source level and optional transformer, see core/shortCircuit.ts */
  shortCircuit?: ShortCircuitSettings;
}

/** Settings of the ohmic short-circuit check. */
export interface ShortCircuitSettings {
  v: 1;
  /** Fault levels, the inspector card, the canvas badges and the interrupting-rating rule are active */
  enabled: boolean;
  /** Short-circuit level at the supply terminals, kA */
  sourceKa: number;
  /** Supply transformer in series with the source, if any */
  transformer?: { kva: number; zPct: number };
}

/** One recorded signal: a device state value, the energized flag, a terminal voltage or a wire current. */
export interface RecorderChannel {
  id: string;
  label: string;
  kind: 'digital' | 'analog';
  unit?: string;
  source:
    | { kind: 'state'; deviceId: string; key: string }
    | { kind: 'energized'; deviceId: string }
    | { kind: 'voltage'; deviceId: string; terminalId: string }
    | { kind: 'current'; wireId: string };
}

/** Tank level (%), line pressure (bar) and the draw-off slider (litres per minute) of the project's process. */
export interface ProcessState {
  tankLevel: number;
  lineBar: number;
  drawOffLpm: number;
}
