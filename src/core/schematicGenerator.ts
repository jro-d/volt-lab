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
    | 'pushbutton3';
  status?: string;
}

export interface SchematicEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'live' | 'neutral' | 'earth' | 'control';
}

export function generateSchematicModel(devices: ElectricalDevice[], wires: ElectricalWire[]) {
  const nodes: SchematicNode[] = devices.map(d => {
    let symbol: SchematicNode['symbol'] = 'breaker';
    if (d.type === 'thermal_overload_relay') symbol = 'tor';
    else if (d.type === 'control_transformer') symbol = 'transformer';
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
    else if (d.type.includes('switch') || d.type === 'royu_modular_combo_plate') symbol = 'switch';
    else if (d.type.includes('bulb')) symbol = 'light';
    else if (d.type.includes('socket')) symbol = 'socket';
    else if (d.type.includes('earth') || d.type.includes('pit')) symbol = 'earth';
    else if (d.type.includes('motor')) symbol = 'motor';
    else if (d.type === 'appliance_fan') symbol = 'fan';
    else if (d.type === 'appliance_ac') symbol = 'ac';
    else if (d.type === 'appliance_water_heater') symbol = 'heater';
    else if (d.type.includes('junction_box') || d.type === 'utility_box_surface_pvc') symbol = 'junction';
    else if (d.type.includes('splice') || d.type.includes('wago')) symbol = 'splice';
    else if (d.type === 'royu_safety_breaker_2p') symbol = 'breaker';

    return {
      id: d.id,
      type: d.type,
      label: d.name,
      x: d.x,
      y: d.y,
      symbol,
      status: d.state.tripped
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
