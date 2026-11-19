import { ElectricalDevice, ElectricalWire } from '../types/electrical';

export interface SchematicNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  symbol: 
    | 'grid' 
    | 'meter' 
    | 'breaker' 
    | 'rcd' 
    | 'spd' 
    | 'busbar' 
    | 'switch' 
    | 'light' 
    | 'socket' 
    | 'earth' 
    | 'motor'
    | 'fan'
    | 'ac'
    | 'heater'
    | 'junction'
    | 'splice'
    | 'relay'
    | 'contactor'
    | 'pushbutton'
    | 'estop'
    | 'pilot'
    | 'plc'
    | 'tor'
    | 'transformer'
    | 'source3p'
    | 'pushbutton3'
    | 'fuse'
    | 'generator'
    | 'pv'
    | 'inverter'
    | 'battery'
    | 'capacitor';
  status?: string;
}

interface SchematicEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'live' | 'neutral' | 'earth' | 'control';
}

export function generateSchematicModel(devices: ElectricalDevice[], wires: ElectricalWire[]) {
  const nodes: SchematicNode[] = devices.map(d => {
    let symbol: SchematicNode['symbol'] = 'breaker';
    if (d.type.startsWith('fuse')) symbol = 'fuse';
    else if (['star_delta_timer', 'counter_relay', 'impulse_relay', 'staircase_timer', 'time_switch_24h', 'alternating_relay', 'ssr_1p', 'safety_relay', 'aux_contact_block'].includes(d.type)) symbol = 'relay';
    else if (['operator_pilot', 'two_hand_station', 'door_interlock_switch', 'pull_cord_switch', 'mechanical_interlock'].includes(d.type)) symbol = 'switch';
    else if (['electrode_level_relay', 'thermostat', 'temp_controller', 'photocell_switch', 'pir_sensor', 'fire_alarm_panel', 'solenoid_valve'].includes(d.type)) symbol = 'relay';
    else if (['reed_switch', 'flow_switch', 'zero_speed_switch', 'smoke_detector', 'manual_call_point'].includes(d.type)) symbol = 'switch';
    else if (['soft_starter', 'starter_reduced_voltage', 'line_reactor', 'dc_injection_brake', 'rotor_resistor_bank', 'speed_potentiometer', 'braking_resistor'].includes(d.type)) symbol = 'relay';
    else if (['motor_dahlander', 'motor_wound_rotor', 'motor_dc_shunt', 'motor_brake', 'pump_submersible_3p', 'air_compressor_3p', 'hoist_conveyor'].includes(d.type)) symbol = 'motor';
    else if (['emergency_light', 'doorbell_set', 'fan_regulator'].includes(d.type)) symbol = 'relay';
    else if (['appliance_generic', 'power_strip'].includes(d.type)) symbol = 'motor';
    else if (['valve_52', 'analog_io_module', 'hmi_panel'].includes(d.type)) symbol = 'relay';
    else if (d.type === 'cylinder_da') symbol = 'motor';
    else if (d.type === 'pv_string') symbol = 'pv';
    else if (d.type === 'inverter_gridtie') symbol = 'inverter';
    else if (d.type === 'ups_battery') symbol = 'battery';
    else if (d.type === 'capacitor_bank_3p') symbol = 'capacitor';
    else if (d.type === 'synchroscope' || d.type === 'pf_controller' || d.type === 'reverse_power_relay' || d.type === 'preferential_trip_relay') symbol = 'relay';
    else if (d.type === 'transfer_switch_manual' || d.type === 'dc_isolator' || d.type === 'shore_connection_box') symbol = 'switch';
    else if (d.type === 'ground_detection_lamps') symbol = 'earth';
    else if (d.type.startsWith('generator')) symbol = 'generator';
    else if (d.type.startsWith('rcbo')) symbol = 'rcd';
    else if (d.type === 'thermal_overload_relay' || d.type === 'mpcb_3p') symbol = 'tor';
    else if (d.type === 'current_transformer' || d.type === 'core_balance_ct') symbol = 'transformer';
    else if (d.type === 'panel_ammeter' || d.type === 'voltmeter_selector') symbol = 'meter';
    else if (d.type === 'terminal_block' || d.type === 'distribution_block') symbol = 'busbar';
    else if (d.type === 'gfci_receptacle') symbol = 'rcd';
    else if (d.type === 'control_transformer' || d.type.startsWith('transformer')) symbol = 'transformer';
    else if (d.type === 'source_3phase_440v') symbol = 'source3p';
    else if (d.type === 'push_button_fwd_rev') symbol = 'pushbutton3';
    else if (d.type.includes('meter')) symbol = 'meter';
    else if (d.type.includes('rcd')) symbol = 'rcd';
    else if (d.type.includes('spd')) symbol = 'spd';
    else if (d.type.includes('busbar') || d.type === 'din_rail_track') symbol = 'busbar';
    else if (d.type.includes('relay')) symbol = 'relay';
    else if (d.type.includes('contactor')) symbol = 'contactor';
    else if (d.type === 'push_button_station') symbol = 'pushbutton';
    else if (d.type === 'push_button_estop') symbol = 'estop';
    else if (d.type === 'pilot_light_indicator') symbol = 'pilot';
    else if (d.type === 'plc_micro_controller') symbol = 'plc';
    else if (d.type.includes('switch') || d.type === 'modular_combo_plate') symbol = 'switch';
    else if (d.type.includes('bulb')) symbol = 'light';
    else if (d.type.includes('socket')) symbol = 'socket';
    else if (d.type.includes('earth') || d.type.includes('pit')) symbol = 'earth';
    else if (d.type.includes('motor') || d.type.includes('pump')) symbol = 'motor';
    else if (d.type === 'appliance_fan') symbol = 'fan';
    else if (d.type === 'appliance_ac') symbol = 'ac';
    else if (d.type === 'appliance_water_heater') symbol = 'heater';
    else if (d.type.includes('junction_box') || d.type === 'utility_box_surface_pvc') symbol = 'junction';
    else if (d.type.includes('splice') || d.type.includes('lever')) symbol = 'splice';
    else if (d.type === 'safety_breaker_2p') symbol = 'breaker';

    return {
      id: d.id,
      type: d.type,
      label: d.name,
      x: d.x,
      y: d.y,
      symbol,
      status: d.state.tripped || d.state.blown_l1 || d.state.blown_l2 || d.state.blown_l3
        ? 'TRIPPED'
        : d.state.lit || d.state.coilEnergized || d.state.motorRunning || d.state.secondaryLive
        ? 'ON'
        : d.state.powered
        ? 'ENERGIZED'
        : 'NORMAL'
    };
  });

  const termType = (devId: string, termId: string) =>
    devices.find(d => d.id === devId)?.terminals.find(t => t.id === termId)?.type;
  const CONTROL_TYPES = new Set(['coil', 'no', 'nc', 'switched', 'traveler', 'input', 'output', 'common']);

  const edges: SchematicEdge[] = wires.map(w => {
    const types = [termType(w.fromDeviceId, w.fromTerminalId), termType(w.toDeviceId, w.toTerminalId)];
    let edgeType: SchematicEdge['type'] = 'live';
    if (w.conductorRole === 'earth_ground' || types.includes('earth')) {
      edgeType = 'earth';
    } else if (w.conductorRole === 'return_neutral' || types.includes('neutral')) {
      edgeType = 'neutral';
    } else if (types.some(t => t && CONTROL_TYPES.has(t))) {
      edgeType = 'control';
    }

    return {
      id: w.id,
      fromId: w.fromDeviceId,
      toId: w.toDeviceId,
      type: edgeType
    };
  });

  return { nodes, edges };
}
