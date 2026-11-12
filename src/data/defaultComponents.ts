import { DeviceType, DeviceCategory, DeviceTerminal, ElectricalDevice } from '../types/electrical';

export interface ComponentDefinition {
  type: DeviceType;
  category: DeviceCategory;
  name: string;
  defaultLabel: string;
  width: number;
  height: number;
  description: string;
  brand?: 'ROYU' | 'Schneider' | 'Generic';
  modelNumber?: string;
  kaRating?: number;
  mountingType?: 'bolt_on' | 'plug_in' | 'din_rail' | 'flush_utility' | 'surface_nema3r';
  pecReference?: string;
  defaultProperties: Record<string, any>;
  terminals: DeviceTerminal[];
}

export const COMPONENT_CATALOG: ComponentDefinition[] = [
  {
    type: 'kwh_meter_1p',
    category: 'supply',
    name: 'Digital kWh Meter (1-Phase)',
    defaultLabel: 'METER-01',
    width: 140,
    height: 180,
    description: 'Utility energy meter measuring active energy (kWh), voltage, and power.',
    defaultProperties: {
      voltageIn: 230,
      kwh: 123.45,
      frequency: 60,
    },
    terminals: [
      { id: 'l_in', name: 'Line In (Utility)', type: 'phase', relX: 0.22, relY: 0.90, label: 'L_IN', phaseLabel: 'L' },
      { id: 'n_in', name: 'Neutral In (Utility)', type: 'neutral', relX: 0.40, relY: 0.90, label: 'N_IN', phaseLabel: 'N' },
      { id: 'n_out', name: 'Neutral Out (Load)', type: 'neutral', relX: 0.60, relY: 0.90, label: 'N_OUT', phaseLabel: 'N' },
      { id: 'l_out', name: 'Line Out (Load)', type: 'phase', relX: 0.78, relY: 0.90, label: 'L_OUT', phaseLabel: 'L' },
    ]
  },
  {
    type: 'service_disconnect_2p',
    category: 'protection',
    name: 'Service Disconnect Breaker',
    defaultLabel: 'MAIN-DISC',
    width: 60,
    height: 120,
    description: 'Main service entrance overcurrent disconnect device (63A 2-Pole).',
    defaultProperties: {
      closed: true,
      tripped: false,
      ratedAmps: 63,
      tripCurve: 'C'
    },
    terminals: [
      { id: 'in_l', name: 'Line In (Top)', type: 'phase', relX: 0.35, relY: 0.08, label: '1' },
      { id: 'in_n', name: 'Neutral In (Top)', type: 'neutral', relX: 0.65, relY: 0.08, label: 'N' },
      { id: 'out_l', name: 'Line Out (Bottom)', type: 'phase', relX: 0.35, relY: 0.92, label: '2' },
      { id: 'out_n', name: 'Neutral Out (Bottom)', type: 'neutral', relX: 0.65, relY: 0.92, label: 'N' },
    ]
  },
  {
    type: 'rcd_2p',
    category: 'protection',
    name: 'Residual Current Device (RCD / ELCB)',
    defaultLabel: 'RCD-30mA',
    width: 80,
    height: 120,
    description: '30mA sensitivity earth leakage circuit breaker with push-to-test button.',
    defaultProperties: {
      closed: true,
      tripped: false,
      ratedAmps: 40,
      sensitivityMa: 30,
      testPressed: false,
    },
    terminals: [
      { id: 'in_l', name: 'Line In', type: 'phase', relX: 0.35, relY: 0.08, label: '1' },
      { id: 'in_n', name: 'Neutral In', type: 'neutral', relX: 0.65, relY: 0.08, label: 'N' },
      { id: 'out_l', name: 'Line Out', type: 'phase', relX: 0.35, relY: 0.92, label: '2' },
      { id: 'out_n', name: 'Neutral Out', type: 'neutral', relX: 0.65, relY: 0.92, label: 'N' },
    ]
  },
  {
    type: 'spd_surge',
    category: 'protection',
    name: 'Surge Protective Device (SPD / DPS)',
    defaultLabel: 'SPD-T2',
    width: 50,
    height: 120,
    description: 'Transient overvoltage lightning and surge arrester (Type 2).',
    defaultProperties: {
      healthy: true,
      ucVolts: 275,
    },
    terminals: [
      { id: 'in_l', name: 'Phase Terminal', type: 'phase', relX: 0.35, relY: 0.08, label: 'L' },
      { id: 'in_n', name: 'Neutral Terminal', type: 'neutral', relX: 0.65, relY: 0.08, label: 'N' },
      { id: 'pe_ground', name: 'Earth Terminal', type: 'earth', relX: 0.50, relY: 0.92, label: 'PE' },
    ]
  },
  {
    type: 'mcb_1p',
    category: 'protection',
    name: 'MCB 1-Pole (Miniature Breaker)',
    defaultLabel: 'MCB-1P',
    width: 44,
    height: 110,
    brand: 'ROYU',
    modelNumber: 'ROYU RCB120',
    kaRating: 10,
    mountingType: 'bolt_on',
    pecReference: 'PEC 2017 Art. 2.40.1.4(D)',
    description: 'Single-pole bolt-on / DIN-rail breaker for lighting or socket branch circuit.',
    defaultProperties: {
      closed: true,
      tripped: false,
      ratedAmps: 16,
      tripCurve: 'C',
      breakerProfile: 'royu_bolt_on',
    },
    terminals: [
      { id: 'in', name: 'Line In (Top)', type: 'phase', relX: 0.50, relY: 0.08, label: '1' },
      { id: 'out', name: 'Line Out (Bottom)', type: 'phase', relX: 0.50, relY: 0.92, label: '2' },
    ]
  },
  {
    type: 'mcb_2p',
    category: 'protection',
    name: 'MCB 2-Pole Breaker',
    defaultLabel: 'MCB-2P',
    width: 70,
    height: 110,
    brand: 'ROYU',
    modelNumber: 'ROYU RCB220',
    kaRating: 10,
    mountingType: 'bolt_on',
    pecReference: 'PEC 2017 Art. 2.40.1.4(D)',
    description: 'Two-pole breaker for 230V line-to-line loads (water heater, aircon).',
    defaultProperties: {
      closed: true,
      tripped: false,
      ratedAmps: 32,
      tripCurve: 'C',
      breakerProfile: 'royu_bolt_on',
    },
    terminals: [
      { id: 'in_1', name: 'Line 1 In', type: 'phase', relX: 0.30, relY: 0.08, label: '1' },
      { id: 'in_2', name: 'Line 2 / N In', type: 'neutral', relX: 0.70, relY: 0.08, label: '3' },
      { id: 'out_1', name: 'Line 1 Out', type: 'phase', relX: 0.30, relY: 0.92, label: '2' },
      { id: 'out_2', name: 'Line 2 / N Out', type: 'neutral', relX: 0.70, relY: 0.92, label: '4' },
    ]
  },
  {
    type: 'mcb_3p',
    category: 'protection',
    name: 'MCB 3-Pole Breaker (3-Phase)',
    defaultLabel: 'MCB-3P',
    width: 95,
    height: 110,
    brand: 'Schneider',
    modelNumber: 'Acti9 iC60N',
    kaRating: 10,
    mountingType: 'din_rail',
    pecReference: 'PEC 2017 Art. 2.40 & 4.30',
    description: 'Three-pole DIN-rail breaker for 3-phase machinery and motors.',
    defaultProperties: {
      closed: true,
      tripped: false,
      ratedAmps: 32,
      tripCurve: 'D',
      breakerProfile: 'generic_iec',
    },
    terminals: [
      { id: 'in_l1', name: 'L1 In', type: 'phase', relX: 0.20, relY: 0.08, label: '1' },
      { id: 'in_l2', name: 'L2 In', type: 'phase2', relX: 0.50, relY: 0.08, label: '3' },
      { id: 'in_l3', name: 'L3 In', type: 'phase3', relX: 0.80, relY: 0.08, label: '5' },
      { id: 'out_l1', name: 'L1 Out', type: 'phase', relX: 0.20, relY: 0.92, label: '2' },
      { id: 'out_l2', name: 'L2 Out', type: 'phase2', relX: 0.50, relY: 0.92, label: '4' },
      { id: 'out_l3', name: 'L3 Out', type: 'phase3', relX: 0.80, relY: 0.92, label: '6' },
    ]
  },
  {
    type: 'earth_busbar',
    category: 'busbar',
    name: 'Earth Terminal Busbar (PE)',
    defaultLabel: 'PE-BAR',
    width: 30,
    height: 160,
    description: 'Copper/brass earthing bar on green insulated standoff brackets.',
    defaultProperties: {
      isEarth: true,
      potential: 0
    },
    terminals: [
      { id: 'pe_main', name: 'Main Ground In', type: 'earth', relX: 0.50, relY: 0.12, label: 'GND' },
      { id: 'pe_1', name: 'PE Terminal 1', type: 'earth', relX: 0.50, relY: 0.32, label: '1' },
      { id: 'pe_2', name: 'PE Terminal 2', type: 'earth', relX: 0.50, relY: 0.52, label: '2' },
      { id: 'pe_3', name: 'PE Terminal 3', type: 'earth', relX: 0.50, relY: 0.72, label: '3' },
      { id: 'pe_4', name: 'PE Terminal 4', type: 'earth', relX: 0.50, relY: 0.90, label: '4' },
    ]
  },
  {
    type: 'neutral_busbar',
    category: 'busbar',
    name: 'Neutral Terminal Busbar (N)',
    defaultLabel: 'N-BAR',
    width: 30,
    height: 160,
    description: 'Brass neutral distribution bar on blue insulated standoff brackets.',
    defaultProperties: {
      isNeutral: true,
    },
    terminals: [
      { id: 'n_main', name: 'Main Neutral In', type: 'neutral', relX: 0.50, relY: 0.12, label: 'N' },
      { id: 'n_1', name: 'Neutral Terminal 1', type: 'neutral', relX: 0.50, relY: 0.32, label: '1' },
      { id: 'n_2', name: 'Neutral Terminal 2', type: 'neutral', relX: 0.50, relY: 0.52, label: '2' },
      { id: 'n_3', name: 'Neutral Terminal 3', type: 'neutral', relX: 0.50, relY: 0.72, label: '3' },
      { id: 'n_4', name: 'Neutral Terminal 4', type: 'neutral', relX: 0.50, relY: 0.90, label: '4' },
    ]
  },
  {
    type: 'ground_pit',
    category: 'earthing',
    name: 'Ground Inspection Pit & Earth Rod',
    defaultLabel: 'EARTH-PIT',
    width: 90,
    height: 110,
    description: 'Underground earth electrode pit with copper-bonded ground rod and clamp.',
    defaultProperties: {
      earthResistanceOhms: 4.8,
    },
    terminals: [
      { id: 'clamp', name: 'Ground Rod Clamp Terminal', type: 'earth', relX: 0.50, relY: 0.28, label: 'ROD' },
    ]
  },
  {
    type: 'switch_1gang',
    category: 'control',
    name: '1-Gang 1-Way Wall Switch',
    defaultLabel: 'SW-1WAY',
    width: 70,
    height: 110,
    brand: 'ROYU',
    modelNumber: 'ROYU RWS101',
    mountingType: 'flush_utility',
    pecReference: 'PEC 2017 Art. 4.4.1.2',
    description: 'Single-pole standard flush wall switch with manual rocker click.',
    defaultProperties: {
      closed: false,
    },
    terminals: [
      { id: 'l_in', name: 'Line In (Hot)', type: 'phase', relX: 0.30, relY: 0.88, label: 'L' },
      { id: 'sw_out', name: 'Switched Line Out', type: 'switched', relX: 0.70, relY: 0.88, label: '1' },
    ]
  },
  {
    type: 'switch_3way',
    category: 'control',
    name: '3-Way Switch (Two-Way / Staircase)',
    defaultLabel: 'SW-3WAY',
    width: 70,
    height: 110,
    brand: 'ROYU',
    modelNumber: 'ROYU RWS301',
    mountingType: 'flush_utility',
    pecReference: 'PEC 2017 Art. 4.4.1.2',
    description: '3-way switch for multi-location lighting control with Common and Travelers.',
    defaultProperties: {
      position: 'A', // 'A' routes COM -> T1, 'B' routes COM -> T2
    },
    terminals: [
      { id: 'com', name: 'Common Terminal', type: 'common', relX: 0.50, relY: 0.12, label: 'COM' },
      { id: 't1', name: 'Traveler 1', type: 'traveler', relX: 0.30, relY: 0.88, label: 'T1' },
      { id: 't2', name: 'Traveler 2', type: 'traveler', relX: 0.70, relY: 0.88, label: 'T2' },
    ]
  },
  {
    type: 'switch_4way',
    category: 'control',
    name: '4-Way Switch (Intermediate)',
    defaultLabel: 'SW-4WAY',
    width: 70,
    height: 110,
    brand: 'ROYU',
    modelNumber: 'ROYU RWS401',
    mountingType: 'flush_utility',
    pecReference: 'PEC 2017 Art. 4.4.1.2',
    description: '4-way intermediate switch placed between two 3-way switches.',
    defaultProperties: {
      crossState: false, // straight or cross
    },
    terminals: [
      { id: 'in_1', name: 'In 1', type: 'traveler', relX: 0.30, relY: 0.12, label: '1' },
      { id: 'in_2', name: 'In 2', type: 'traveler', relX: 0.70, relY: 0.12, label: '2' },
      { id: 'out_1', name: 'Out 1', type: 'traveler', relX: 0.30, relY: 0.88, label: '3' },
      { id: 'out_2', name: 'Out 2', type: 'traveler', relX: 0.70, relY: 0.88, label: '4' },
    ]
  },
  {
    type: 'socket_duplex',
    category: 'receptacle',
    name: 'Duplex Wall Receptacle (Wide Series / PEC)',
    defaultLabel: 'REC-DUPLEX',
    width: 110,
    height: 70,
    brand: 'ROYU',
    modelNumber: 'ROYU RDU202',
    mountingType: 'flush_utility',
    pecReference: 'PEC 2017 Art. 4.6.1.1',
    description: 'Philippine Wide-Series 2-gang convenience outlet with front faceplate and rear snap-in modular mechanism.',
    defaultProperties: {
      hasPluggedLoad: true,
      pluggedAppliance: 'appliance_tv',
      viewMode: 'front',
    },
    terminals: [
      { id: 'line', name: 'Line Feed In (Module 1 Brass)', type: 'phase', relX: 0.28, relY: 0.88, label: 'L1' },
      { id: 'line_out', name: 'Line Feed Out / Loop (Module 2 Brass)', type: 'phase', relX: 0.72, relY: 0.88, label: 'L2' },
      { id: 'neutral', name: 'Neutral In (Module 1 Silver)', type: 'neutral', relX: 0.28, relY: 0.12, label: 'N1' },
      { id: 'neutral_out', name: 'Neutral Out / Loop (Module 2 Silver)', type: 'neutral', relX: 0.72, relY: 0.12, label: 'N2' },
      { id: 'ground', name: 'Earth Ground Screw (Green)', type: 'earth', relX: 0.50, relY: 0.50, label: 'PE' },
    ]
  },
  {
    type: 'light_bulb',
    category: 'load',
    name: 'Incandescent Lamp / Luminaire',
    defaultLabel: 'LAMP-01',
    width: 60,
    height: 90,
    description: 'E27 screw base incandescent light fixture (60W / 230V).',
    defaultProperties: {
      wattage: 60,
      resistanceOhms: 880,
      brightness: 0,
      lit: false,
    },
    terminals: [
      { id: 'hot', name: 'Switched Hot / Phase', type: 'switched', relX: 0.30, relY: 0.90, label: 'L' },
      { id: 'neutral', name: 'Neutral Return', type: 'neutral', relX: 0.70, relY: 0.90, label: 'N' },
    ]
  },
  {
    type: 'appliance_tv',
    category: 'load',
    name: 'Television & Entertainment Load',
    defaultLabel: 'TV-120W',
    width: 80,
    height: 70,
    description: 'Smart LED TV appliance plugged into socket outlet (120W).',
    defaultProperties: {
      wattage: 120,
      powered: false,
    },
    terminals: [
      { id: 'plug_in', name: 'Appliance Power Cord Terminal', type: 'load', relX: 0.50, relY: 0.20, label: 'PLUG' },
    ]
  },
  {
    type: 'appliance_water_heater',
    category: 'load',
    name: 'Instant Shower Water Heater (High Load)',
    defaultLabel: 'HEATER-3.5kW',
    width: 90,
    height: 120,
    description: '3500W instant heating load requiring dedicated circuit and grounding.',
    defaultProperties: {
      wattage: 3500,
      powered: false,
      hasEarthFault: false, // can trigger leakage fault in labs!
    },
    terminals: [
      { id: 'line', name: 'Line Terminal', type: 'phase', relX: 0.25, relY: 0.90, label: 'L' },
      { id: 'neutral', name: 'Neutral Terminal', type: 'neutral', relX: 0.50, relY: 0.90, label: 'N' },
      { id: 'ground', name: 'Chassis Earth', type: 'earth', relX: 0.75, relY: 0.90, label: 'PE' },
    ]
  },
  {
    type: 'appliance_fan',
    category: 'load',
    name: 'Electric Ventilation / Desk Fan (65W)',
    defaultLabel: 'FAN-65W',
    width: 85,
    height: 115,
    description: 'Oscillating electric fan with animated rotating blades when powered.',
    defaultProperties: {
      wattage: 65,
      powered: false,
      speed: 2,
    },
    terminals: [
      { id: 'line', name: 'Phase / Switched Live', type: 'switched', relX: 0.30, relY: 0.92, label: 'L' },
      { id: 'ground', name: 'Chassis Earth (PE)', type: 'earth', relX: 0.50, relY: 0.92, label: 'PE' },
      { id: 'neutral', name: 'Neutral Return', type: 'neutral', relX: 0.70, relY: 0.92, label: 'N' },
    ]
  },
  {
    type: 'appliance_ac',
    category: 'load',
    name: 'Air Conditioner 1.5 HP Inverter Split-Type',
    defaultLabel: 'AC-1.5HP',
    width: 130,
    height: 75,
    description: '1200W split-type room air conditioner with digital LED display and airflow louver.',
    defaultProperties: {
      wattage: 1200,
      powered: false,
      setTemp: 16,
    },
    terminals: [
      { id: 'line', name: 'Phase (L)', type: 'phase', relX: 0.25, relY: 0.92, label: 'L' },
      { id: 'ground', name: 'Chassis Earth (PE)', type: 'earth', relX: 0.50, relY: 0.92, label: 'PE' },
      { id: 'neutral', name: 'Neutral (N)', type: 'neutral', relX: 0.75, relY: 0.92, label: 'N' },
    ]
  },
  {
    type: 'motor_3phase_dol',
    category: 'load',
    name: '3-Phase Induction Motor & Starter',
    defaultLabel: 'MOTOR-3P',
    width: 140,
    height: 140,
    description: '3-Phase 2.2kW motor with integrated contactor, overload relay, and Start/Stop push buttons.',
    defaultProperties: {
      wattage: 2200,
      powerFactor: 0.85,
      running: false,
      rpm: 0,
    },
    terminals: [
      { id: 'l1', name: 'Line 1 (L1)', type: 'phase', relX: 0.20, relY: 0.10, label: 'L1' },
      { id: 'l2', name: 'Line 2 (L2)', type: 'phase2', relX: 0.40, relY: 0.10, label: 'L2' },
      { id: 'l3', name: 'Line 3 (L3)', type: 'phase3', relX: 0.60, relY: 0.10, label: 'L3' },
      { id: 'pe', name: 'Frame Earth (PE)', type: 'earth', relX: 0.80, relY: 0.10, label: 'PE' },
    ]
  },
  {
    type: 'junction_box_4way',
    category: 'splice',
    name: '4-Way Junction Box (J-Box)',
    defaultLabel: 'JBOX-01',
    width: 96,
    height: 96,
    description: 'Octagonal 4-way conduit enclosure with internal Line, Neutral, and Ground splice wire nuts.',
    defaultProperties: {
      hasCover: false,
      boxMaterial: 'galvanized_steel',
    },
    terminals: [
      // Line Feed & Branch Splice (Red Wire Nut)
      { id: 'l_in', name: 'Live Feed In', type: 'phase', relX: 0.25, relY: 0.20, label: 'L1', spliceGroup: 'live' },
      { id: 'l_out', name: 'Live Branch Out', type: 'phase', relX: 0.35, relY: 0.40, label: 'L2', spliceGroup: 'live' },
      // Neutral Return Splice (Blue Wire Nut)
      { id: 'n_in', name: 'Neutral Return In', type: 'neutral', relX: 0.65, relY: 0.20, label: 'N1', spliceGroup: 'neutral' },
      { id: 'n_out', name: 'Neutral Return Out', type: 'neutral', relX: 0.75, relY: 0.40, label: 'N2', spliceGroup: 'neutral' },
      // Earth Ground Splice (Green Wire Nut / Screw)
      { id: 'pe_in', name: 'Ground In', type: 'earth', relX: 0.25, relY: 0.80, label: 'PE1', spliceGroup: 'earth' },
      { id: 'pe_out', name: 'Ground Out', type: 'earth', relX: 0.35, relY: 0.65, label: 'PE2', spliceGroup: 'earth' },
      // Switched Return Splice (Amber Wire Nut)
      { id: 'sw_in', name: 'Switched Live In', type: 'switched', relX: 0.65, relY: 0.80, label: 'SW1', spliceGroup: 'switched' },
      { id: 'sw_out', name: 'Switched Live Out', type: 'switched', relX: 0.75, relY: 0.65, label: 'SW2', spliceGroup: 'switched' },
    ]
  },
  {
    type: 'junction_box_octagonal_orange',
    category: 'splice',
    name: 'Orange PVC Octagonal Junction Box (PEC)',
    defaultLabel: 'OCT-BOX',
    width: 96,
    height: 96,
    description: 'Standard Philippine thermoplastic orange octagonal utility box for ceiling and branch outlet drops.',
    defaultProperties: {
      hasCover: false,
      boxMaterial: 'orange_pvc',
    },
    terminals: [
      { id: 'l_in', name: 'Live Feeder In', type: 'phase', relX: 0.22, relY: 0.15, label: 'L1', spliceGroup: 'live' },
      { id: 'l_out', name: 'Live Branch T-Tap', type: 'phase', relX: 0.32, relY: 0.42, label: 'L2', spliceGroup: 'live' },
      { id: 'n_in', name: 'Neutral Feeder In', type: 'neutral', relX: 0.68, relY: 0.15, label: 'N1', spliceGroup: 'neutral' },
      { id: 'n_out', name: 'Neutral Branch T-Tap', type: 'neutral', relX: 0.78, relY: 0.42, label: 'N2', spliceGroup: 'neutral' },
      { id: 'pe_in', name: 'Ground Feeder In', type: 'earth', relX: 0.25, relY: 0.82, label: 'PE1', spliceGroup: 'earth' },
      { id: 'pe_out', name: 'Ground Branch T-Tap', type: 'earth', relX: 0.35, relY: 0.65, label: 'PE2', spliceGroup: 'earth' },
    ]
  },
  {
    type: 'splice_wire_nut',
    category: 'splice',
    name: 'Twist-On Wire Nut Splice',
    defaultLabel: 'NUT-01',
    width: 44,
    height: 48,
    description: 'Insulated twist-on wire connector joining 3 conductors together.',
    defaultProperties: {
      color: 'red',
    },
    terminals: [
      { id: 'port_1', name: 'Conductor Port 1', type: 'splice', relX: 0.25, relY: 0.88, label: '1', spliceGroup: 'nut' },
      { id: 'port_2', name: 'Conductor Port 2', type: 'splice', relX: 0.50, relY: 0.88, label: '2', spliceGroup: 'nut' },
      { id: 'port_3', name: 'Conductor Port 3', type: 'splice', relX: 0.75, relY: 0.88, label: '3', spliceGroup: 'nut' },
    ]
  },
  {
    type: 'wago_connector_3p',
    category: 'splice',
    name: 'WAGO 221 Lever Splice (3-Port)',
    defaultLabel: 'WAGO-3P',
    width: 48,
    height: 40,
    description: 'Compact transparent lever-clamp connector joining up to 3 conductors.',
    defaultProperties: {},
    terminals: [
      { id: 'w1', name: 'Lever Port 1', type: 'splice', relX: 0.25, relY: 0.85, label: '1', spliceGroup: 'wago' },
      { id: 'w2', name: 'Lever Port 2', type: 'splice', relX: 0.50, relY: 0.85, label: '2', spliceGroup: 'wago' },
      { id: 'w3', name: 'Lever Port 3', type: 'splice', relX: 0.75, relY: 0.85, label: '3', spliceGroup: 'wago' },
    ]
  },
  {
    type: 'industrial_relay_dpdt',
    category: 'industrial',
    name: 'Industrial DPDT Control Relay (8-Pin)',
    defaultLabel: 'CR1',
    width: 76,
    height: 114,
    description: 'Electromechanical ice-cube relay with DPDT contacts (2 NO, 2 NC), coil indicator LED, and DIN-rail socket base.',
    defaultProperties: {
      coilEnergized: false,
      coilVoltage: 230,
      ratedAmps: 10
    },
    terminals: [
      { id: 'a1', name: 'Coil A1 (Line)', type: 'coil', relX: 0.20, relY: 0.08, label: 'A1', phaseLabel: 'A1' },
      { id: 'no_1', name: 'NO Contact 1', type: 'no', relX: 0.40, relY: 0.08, label: '14', phaseLabel: 'NO' },
      { id: 'nc_1', name: 'NC Contact 1', type: 'nc', relX: 0.60, relY: 0.08, label: '12', phaseLabel: 'NC' },
      { id: 'com_1', name: 'Common Pole 1', type: 'common', relX: 0.80, relY: 0.08, label: '11', phaseLabel: 'COM' },
      { id: 'a2', name: 'Coil A2 (Neutral)', type: 'coil', relX: 0.20, relY: 0.92, label: 'A2', phaseLabel: 'A2' },
      { id: 'no_2', name: 'NO Contact 2', type: 'no', relX: 0.40, relY: 0.92, label: '24', phaseLabel: 'NO' },
      { id: 'nc_2', name: 'NC Contact 2', type: 'nc', relX: 0.60, relY: 0.92, label: '22', phaseLabel: 'NC' },
      { id: 'com_2', name: 'Common Pole 2', type: 'common', relX: 0.80, relY: 0.92, label: '21', phaseLabel: 'COM' },
    ]
  },
  {
    type: 'contactor_3p',
    category: 'industrial',
    name: '3-Pole Industrial Motor Contactor',
    defaultLabel: 'KM1',
    width: 88,
    height: 120,
    description: 'Heavy-duty magnetic contactor for 3-phase motors with 3 power poles (L1-T1, L2-T2, L3-T3), coil A1-A2, and auxiliary NO 13-14 seal-in contact.',
    defaultProperties: {
      coilEnergized: false,
      closed: false,
      ratedAmps: 25,
      motorKw: 7.5
    },
    terminals: [
      { id: 'a1', name: 'Coil A1 (Line)', type: 'coil', relX: 0.14, relY: 0.08, label: 'A1', phaseLabel: 'A1' },
      { id: 'l1', name: 'Line 1 (1/L1)', type: 'phase', relX: 0.38, relY: 0.08, label: '1/L1', phaseLabel: 'L1' },
      { id: 'l2', name: 'Line 2 (3/L2)', type: 'phase2', relX: 0.62, relY: 0.08, label: '3/L2', phaseLabel: 'L2' },
      { id: 'l3', name: 'Line 3 (5/L3)', type: 'phase3', relX: 0.86, relY: 0.08, label: '5/L3', phaseLabel: 'L3' },
      { id: 'no_13', name: 'Aux NO In (13)', type: 'no', relX: 0.14, relY: 0.44, label: '13', phaseLabel: 'NO' },
      { id: 'no_14', name: 'Aux NO Out (14)', type: 'no', relX: 0.14, relY: 0.70, label: '14', phaseLabel: 'NO' },
      { id: 'a2', name: 'Coil A2 (Neutral)', type: 'coil', relX: 0.14, relY: 0.92, label: 'A2', phaseLabel: 'A2' },
      { id: 't1', name: 'Motor T1 (2/T1)', type: 'load', relX: 0.38, relY: 0.92, label: '2/T1', phaseLabel: '1' },
      { id: 't2', name: 'Motor T2 (4/T2)', type: 'load', relX: 0.62, relY: 0.92, label: '4/T2', phaseLabel: '2' },
      { id: 't3', name: 'Motor T3 (6/T3)', type: 'load', relX: 0.86, relY: 0.92, label: '6/T3', phaseLabel: '3' },
    ]
  },
  {
    type: 'push_button_station',
    category: 'industrial',
    name: 'Dual Start-Stop Push Button Station',
    defaultLabel: 'PB-STATION',
    width: 76,
    height: 140,
    description: 'Heavy-duty industrial push button station with Green momentary START button (Normally Open) and Red STOP button (Normally Closed).',
    defaultProperties: {
      startPressed: false,
      stopPressed: false,
    },
    terminals: [
      { id: 'start_3', name: 'Start NO Terminal 3', type: 'no', relX: 0.30, relY: 0.10, label: '3', phaseLabel: 'NO' },
      { id: 'start_4', name: 'Start NO Terminal 4', type: 'no', relX: 0.70, relY: 0.10, label: '4', phaseLabel: 'NO' },
      { id: 'stop_1', name: 'Stop NC Terminal 1', type: 'nc', relX: 0.30, relY: 0.90, label: '1', phaseLabel: 'NC' },
      { id: 'stop_2', name: 'Stop NC Terminal 2', type: 'nc', relX: 0.70, relY: 0.90, label: '2', phaseLabel: 'NC' },
    ]
  },
  {
    type: 'push_button_estop',
    category: 'industrial',
    name: 'Emergency Stop Mushroom Button',
    defaultLabel: 'E-STOP',
    width: 76,
    height: 95,
    description: 'Twist-to-release 40mm red mushroom head emergency stop actuator with NC safety contact.',
    defaultProperties: {
      estopActive: false,
    },
    terminals: [
      { id: 'nc_11', name: 'Safety NC 11', type: 'nc', relX: 0.32, relY: 0.88, label: '11', phaseLabel: 'NC' },
      { id: 'nc_12', name: 'Safety NC 12', type: 'nc', relX: 0.68, relY: 0.88, label: '12', phaseLabel: 'NC' },
    ]
  },
  {
    type: 'pilot_light_indicator',
    category: 'industrial',
    name: '22mm Industrial Pilot Indicator Light',
    defaultLabel: 'PL1',
    width: 60,
    height: 80,
    description: 'Panel mount 230V LED indicator lamp with fresnel lens for machine running/fault signaling.',
    defaultProperties: {
      pilotLit: false,
      pilotColor: 'green',
      wattage: 5
    },
    terminals: [
      { id: 'x1', name: 'Lamp Phase (X1)', type: 'phase', relX: 0.30, relY: 0.88, label: 'X1', phaseLabel: 'L' },
      { id: 'x2', name: 'Lamp Neutral (X2)', type: 'neutral', relX: 0.70, relY: 0.88, label: 'X2', phaseLabel: 'N' },
    ]
  },
  {
    type: 'plc_micro_controller',
    category: 'automation',
    name: 'Micro PLC (Programmable Logic Controller)',
    defaultLabel: 'PLC-01',
    width: 156,
    height: 120,
    description: 'Compact DIN-rail PLC with 4 digital inputs (I1..I4), 4 relay outputs (Q1..Q4), diagnostic LCD, and RUN/STOP CPU switch.',
    defaultProperties: {
      plcRunning: true,
      wattage: 15,
      plcInputs: {},
      plcOutputs: {}
    },
    terminals: [
      { id: 'p_l', name: 'Power Line L (230V)', type: 'phase', relX: 0.12, relY: 0.09, label: 'L', phaseLabel: 'L' },
      { id: 'p_n', name: 'Power Neutral N', type: 'neutral', relX: 0.24, relY: 0.09, label: 'N', phaseLabel: 'N' },
      { id: 'i1', name: 'Digital Input I1', type: 'input', relX: 0.44, relY: 0.09, label: 'I1', phaseLabel: 'IN' },
      { id: 'i2', name: 'Digital Input I2', type: 'input', relX: 0.58, relY: 0.09, label: 'I2', phaseLabel: 'IN' },
      { id: 'i3', name: 'Digital Input I3', type: 'input', relX: 0.72, relY: 0.09, label: 'I3', phaseLabel: 'IN' },
      { id: 'i4', name: 'Digital Input I4', type: 'input', relX: 0.86, relY: 0.09, label: 'I4', phaseLabel: 'IN' },
      { id: 'q1_1', name: 'Relay Q1 Contact 1', type: 'output', relX: 0.14, relY: 0.91, label: '1', phaseLabel: 'OUT' },
      { id: 'q1_2', name: 'Relay Q1 Contact 2', type: 'output', relX: 0.26, relY: 0.91, label: '2', phaseLabel: 'OUT' },
      { id: 'q2_1', name: 'Relay Q2 Contact 1', type: 'output', relX: 0.40, relY: 0.91, label: '1', phaseLabel: 'OUT' },
      { id: 'q2_2', name: 'Relay Q2 Contact 2', type: 'output', relX: 0.52, relY: 0.91, label: '2', phaseLabel: 'OUT' },
      { id: 'q3_1', name: 'Relay Q3 Contact 1', type: 'output', relX: 0.66, relY: 0.91, label: '1', phaseLabel: 'OUT' },
      { id: 'q3_2', name: 'Relay Q3 Contact 2', type: 'output', relX: 0.76, relY: 0.91, label: '2', phaseLabel: 'OUT' },
      { id: 'q4_1', name: 'Relay Q4 Contact 1', type: 'output', relX: 0.86, relY: 0.91, label: '1', phaseLabel: 'OUT' },
      { id: 'q4_2', name: 'Relay Q4 Contact 2', type: 'output', relX: 0.94, relY: 0.91, label: '2', phaseLabel: 'OUT' },
    ]
  },
  {
    type: 'motor_ac_industrial',
    category: 'industrial',
    name: '3-Phase Industrial Induction Motor (3.0 HP)',
    defaultLabel: 'MOTOR-3P',
    width: 130,
    height: 115,
    description: 'Squirrel-cage AC induction motor with cast iron stator cooling fins, conduit terminal box, and keyed output shaft.',
    defaultProperties: {
      motorRunning: false,
      wattage: 2200,
      motorHp: 3.0,
      motorRpm: 1750
    },
    terminals: [
      { id: 'u1', name: 'Phase U1', type: 'phase', relX: 0.32, relY: 0.22, label: 'U1', phaseLabel: 'L1' },
      { id: 'v1', name: 'Phase V1', type: 'phase2', relX: 0.50, relY: 0.22, label: 'V1', phaseLabel: 'L2' },
      { id: 'w1', name: 'Phase W1', type: 'phase3', relX: 0.68, relY: 0.22, label: 'W1', phaseLabel: 'L3' },
      { id: 'pe', name: 'Chassis Earth (PE)', type: 'earth', relX: 0.84, relY: 0.22, label: 'PE', phaseLabel: 'PE' },
    ]
  },
  {
    type: 'royu_safety_breaker_2p',
    category: 'protection',
    name: 'ROYU 2P Safety Breaker (ACU Disconnect)',
    defaultLabel: 'SAFETY-DISC',
    width: 86,
    height: 136,
    brand: 'ROYU',
    modelNumber: 'ROYU RSB230',
    kaRating: 10,
    mountingType: 'surface_nema3r',
    pecReference: 'PEC 2017 Art. 4.40.2.1 & 4.22.3.1',
    description: 'Enclosed 2-pole 30A safety breaker in NEMA 1 thermoplastic enclosure with padlocking latch. Mandatory local disconnect beside 1.5-2.0 HP air conditioners.',
    defaultProperties: {
      closed: true,
      tripped: false,
      ratedAmps: 30,
      tripCurve: 'C',
      enclosureCoverOpen: false,
      breakerProfile: 'royu_bolt_on',
    },
    terminals: [
      { id: 'in_l', name: 'Line 1 Feed (L1)', type: 'phase', relX: 0.28, relY: 0.10, label: 'L1', phaseLabel: 'L1' },
      { id: 'in_n', name: 'Line 2 / Neutral Feed (L2/N)', type: 'neutral', relX: 0.72, relY: 0.10, label: 'L2', phaseLabel: 'L2' },
      { id: 'out_l', name: 'Load 1 to Appliance (T1)', type: 'phase', relX: 0.28, relY: 0.90, label: 'T1', phaseLabel: 'L1' },
      { id: 'out_n', name: 'Load 2 to Appliance (T2)', type: 'neutral', relX: 0.72, relY: 0.90, label: 'T2', phaseLabel: 'L2' },
      { id: 'pe', name: 'Equipment Ground Bonding Lug', type: 'earth', relX: 0.50, relY: 0.90, label: 'PE', phaseLabel: 'PE' },
    ]
  },
  {
    type: 'din_rail_track',
    category: 'busbar',
    name: 'DIN-Rail 35mm Mounting Track',
    defaultLabel: 'DIN-TRACK',
    width: 260,
    height: 36,
    brand: 'Generic',
    modelNumber: 'TS35/7.5 EN 50022',
    mountingType: 'din_rail',
    pecReference: 'PEC 2017 Art. 2.50.6.13 (Chassis Bonding)',
    description: 'Standard 35mm slotted zinc-plated steel top-hat mounting rail for panelboard layout with earth grounding bond screw.',
    defaultProperties: {
      trackWidth: 260,
    },
    terminals: [
      { id: 'pe', name: 'DIN Rail Chassis Ground Bonding Lug', type: 'earth', relX: 0.95, relY: 0.50, label: 'PE', phaseLabel: 'PE' },
    ]
  },
  {
    type: 'utility_box_surface_pvc',
    category: 'splice',
    name: 'ROYU 2"x4" Deep PVC Utility Box',
    defaultLabel: 'UTIL-BOX',
    width: 76,
    height: 120,
    brand: 'ROYU',
    modelNumber: 'ROYU RUB204',
    mountingType: 'flush_utility',
    pecReference: 'PEC 2017 Art. 3.14.2.2 (Box Fill)',
    description: 'Philippine standard 2"x4" surface/flush orange PVC utility box with 1/2" & 3/4" knockouts and internal pass-through splice clips.',
    defaultProperties: {
      boxMaterial: 'orange_pvc',
    },
    terminals: [
      { id: 'l_in', name: 'Phase In (Conduit Entry)', type: 'phase', relX: 0.25, relY: 0.12, label: 'L_IN', spliceGroup: 'L' },
      { id: 'n_in', name: 'Neutral In (Conduit Entry)', type: 'neutral', relX: 0.50, relY: 0.12, label: 'N_IN', spliceGroup: 'N' },
      { id: 'pe_in', name: 'Ground In (Conduit Entry)', type: 'earth', relX: 0.75, relY: 0.12, label: 'PE_IN', spliceGroup: 'PE' },
      { id: 'l_out', name: 'Phase Out (To Switch/Outlet)', type: 'phase', relX: 0.25, relY: 0.88, label: 'L_OUT', spliceGroup: 'L' },
      { id: 'n_out', name: 'Neutral Out (To Switch/Outlet)', type: 'neutral', relX: 0.50, relY: 0.88, label: 'N_OUT', spliceGroup: 'N' },
      { id: 'pe_out', name: 'Ground Out (To Switch/Outlet)', type: 'earth', relX: 0.75, relY: 0.88, label: 'PE_OUT', spliceGroup: 'PE' },
    ]
  },
  {
    type: 'royu_modular_combo_plate',
    category: 'control',
    name: 'ROYU Wide-Series Combo (Switch + Pilot + Outlet)',
    defaultLabel: 'ROYU-COMBO',
    width: 82,
    height: 130,
    brand: 'ROYU',
    modelNumber: 'ROYU RWS103',
    mountingType: 'flush_utility',
    pecReference: 'PEC 2017 Art. 4.4 & 4.6',
    description: 'Philippine ROYU Wide-Series 3-module strap plate with 1-Way Switch, Neon Red Pilot Lamp (or 2nd Switch), and Universal 3-Prong Grounded Outlet. Features Front/Rear wiring view.',
    defaultProperties: {
      viewMode: 'rear',
      closed: true,
      switchClosed: true,
      switch2Closed: false,
      comboSlot2: 'pilot',
      pilotLit: false,
      receptaclePowered: false,
    },
    terminals: [
      { id: 'sw_in', name: 'SW1 Line In (Feed)', type: 'phase', relX: 0.28, relY: 0.16, label: 'SW_L' },
      { id: 'sw_out', name: 'SW1 Line Out (To Lamp)', type: 'switched', relX: 0.72, relY: 0.16, label: 'SW_OUT' },
      { id: 'pilot_l', name: 'Neon Pilot Phase (L)', type: 'phase', relX: 0.28, relY: 0.48, label: 'PL_L' },
      { id: 'pilot_n', name: 'Neon Pilot Neutral (N)', type: 'neutral', relX: 0.72, relY: 0.48, label: 'PL_N' },
      { id: 'rec_l', name: 'Receptacle Line (L)', type: 'phase', relX: 0.25, relY: 0.82, label: 'REC_L' },
      { id: 'rec_n', name: 'Receptacle Neutral (N)', type: 'neutral', relX: 0.75, relY: 0.82, label: 'REC_N' },
      { id: 'rec_pe', name: 'Receptacle Ground (PE)', type: 'earth', relX: 0.50, relY: 0.90, label: 'REC_PE' },
    ]
  }
];

export function createDeviceFromCatalog(type: DeviceType, x: number, y: number, customId?: string): ElectricalDevice {
  const def = COMPONENT_CATALOG.find(c => c.type === type);
  if (!def) {
    throw new Error(`Device type ${type} not found in catalog.`);
  }

  const id = customId || `dev_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  return {
    id,
    type: def.type,
    category: def.category,
    name: def.name,
    x,
    y,
    width: def.width,
    height: def.height,
    brand: def.brand,
    modelNumber: def.modelNumber,
    kaRating: def.kaRating,
    mountingType: def.mountingType,
    pecReference: def.pecReference,
    terminals: def.terminals.map(t => ({ ...t })),
    state: { ...def.defaultProperties },
  };
}
