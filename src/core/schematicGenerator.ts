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
    | 'plc';
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
    if (d.type.includes('meter')) symbol = 'meter';
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
      status: d.state.tripped ? 'TRIPPED' : d.state.lit ? 'ON' : d.state.powered ? 'ENERGIZED' : 'NORMAL'
    };
  });

  const edges: SchematicEdge[] = wires.map(w => {
    let edgeType: SchematicEdge['type'] = 'live';
    if (w.fromTerminalId.includes('n') || w.toTerminalId.includes('n') || w.fromTerminalId === 'neutral' || w.toTerminalId === 'neutral') {
      edgeType = 'neutral';
    } else if (w.fromTerminalId.includes('pe') || w.toTerminalId.includes('pe') || w.fromTerminalId === 'ground' || w.toTerminalId === 'ground' || w.fromTerminalId === 'clamp') {
      edgeType = 'earth';
    } else if (w.fromTerminalId.includes('t') || w.toTerminalId.includes('t') || w.fromTerminalId === 'sw_out') {
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
