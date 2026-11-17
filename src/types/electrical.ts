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
  phaseLabel?: 'L' | 'L1' | 'L2' | 'L3' | 'W2' | 'U2' | 'V2' | 'N' | 'PE' | 'SW' | '1' | '2' | '3' | 'COM' | 'SPLICE' | 'A1' | 'A2' | 'NO' | 'NC' | 'IN' | 'OUT' | 'H1' | 'H2' | 'X1' | 'X2';
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
  | 'panelboard_frame'
  | 'panel_meter'
  | 'timer_relay'
  | 'selector_hoa'
  | 'limit_switch'
  | 'vfd_drive'
  | 'motor_6lead_star_delta';

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
}
