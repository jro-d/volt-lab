import { ElectricalProject, ElectricalDevice, ElectricalWire, CodeStandard } from '../types/electrical';
import { createDeviceFromCatalog } from './defaultComponents';

export type LabCategory = 'all' | 'sockets' | 'lighting' | 'splice' | 'appliances' | 'residential' | 'industrial' | 'automation';

export interface LabLesson {
  id: string;
  title: string;
  subtitle: string;
  category: LabCategory;
  badge: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  objectives: string[];
  project: ElectricalProject;
}

export const LAB_LESSONS: LabLesson[] = [
  // 0. ROYU PHILIPPINE HARDWARE ECOSYSTEM LAB
  {
    id: 'lab-royu-residential-ecosystem',
    title: '🇵🇭 ROYU Residential Branch Circuit: ACU Safety Breaker & Modular Switch-Outlet Combo',
    subtitle: 'PEC 2017 Art. 4.40 & Art. 4.4 / 4.6 Philippine Residential Installation',
    category: 'residential',
    badge: '🇵🇭 ROYU Hardware',
    difficulty: 'Intermediate',
    description: 'A realistic Philippine residential branch circuit featuring standard ROYU hardware: 2P Main Breaker on DIN rail, Octagonal Orange PVC Junction Box distributing to a 2P 30A ROYU Enclosed Safety Breaker for a 1.5 HP Inverter Air Conditioner (PEC Art. 4.40), and a ROYU Wide-Series Combo Plate (1-Way Switch controlling a ceiling light + Neon Red Pilot Lamp + Universal 3-Prong Grounded Outlet).',
    objectives: [
      'Understand how Philippine residential installations use 2-pole breakers for 230V line-to-line electrical systems.',
      'Inspect the ROYU 2P 30A Safety Breaker local disconnect installed within sight of the 1.5 HP Air Conditioner (PEC 4.40.2.1).',
      'Examine the ROYU Wide-Series Combo Plate in Rear View and trace the common live jumper strap across the switch, pilot lamp, and convenience receptacle.',
      'Toggle the Safety Breaker cover open/closed to inspect the internal 2P bolt-on breaker mechanism, copper lugs, and equipment grounding.',
    ],
    project: {
      id: 'proj_royu_ecosystem',
      title: 'ROYU Residential Installation: ACU Disconnect & Modular Combo',
      description: 'Philippine 230V residential installation with ROYU 2P Breakers, Safety Disconnect, Octagonal Box, and Wide-Series Combo.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('din_rail_track', 50, 70, 'din_track'),
          name: 'Panel DIN-Rail (35mm)',
          state: { trackWidth: 160 }
        },
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 50, 'mcb_main'),
          name: 'Main 2P 30A ROYU Breaker',
          brand: 'ROYU',
          modelNumber: 'ROYU RCB220',
          kaRating: 10,
          mountingType: 'bolt_on',
          state: { closed: true, tripped: false, ratedAmps: 30, tripCurve: 'C', breakerProfile: 'royu_bolt_on' }
        },
        {
          ...createDeviceFromCatalog('earth_busbar', 80, 200, 'pe_bar'),
          name: 'PE Ground Busbar'
        },
        {
          ...createDeviceFromCatalog('ground_pit', 80, 390, 'earth_rod'),
          name: 'Ground Inspection Pit'
        },
        {
          ...createDeviceFromCatalog('junction_box_octagonal_orange', 270, 70, 'jbox_main'),
          name: 'ROYU Octagonal Orange Box'
        },
        {
          ...createDeviceFromCatalog('royu_safety_breaker_2p', 470, 50, 'acu_safety'),
          name: 'ROYU 2P 30A Safety Breaker (ACU)',
          brand: 'ROYU',
          modelNumber: 'ROYU RSB230',
          kaRating: 10,
          state: { closed: true, tripped: false, ratedAmps: 30, tripCurve: 'C', enclosureCoverOpen: false }
        },
        {
          ...createDeviceFromCatalog('appliance_ac', 670, 80, 'appliance_ac'),
          name: '1.5 HP Inverter Aircon',
          state: { wattage: 1200, powered: true }
        },
        {
          ...createDeviceFromCatalog('utility_box_surface_pvc', 280, 270, 'util_box'),
          name: 'ROYU 2"x4" Utility Box'
        },
        {
          ...createDeviceFromCatalog('royu_modular_combo_plate', 470, 250, 'combo_plate'),
          name: 'ROYU Wide Combo Plate',
          brand: 'ROYU',
          modelNumber: 'ROYU RWS103',
          mountingType: 'flush_utility',
          state: {
            viewMode: 'front',
            closed: true,
            switchClosed: true,
            comboSlot2: 'pilot',
            pilotLit: true,
            receptaclePowered: true,
            hasPluggedLoad: false,
          }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 680, 270, 'room_lamp'),
          name: 'Ceiling Room Lamp',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        }
      ],
      wires: [
        {
          id: 'w_gnd_pit',
          fromDeviceId: 'earth_rod',
          fromTerminalId: 'clamp',
          toDeviceId: 'pe_bar',
          toTerminalId: 'pe_main',
          wireGauge: '8 AWG (8.0 mm²)',
          color: '#16a34a',
          lengthMeters: 3,
          conductorRole: 'earth_ground'
        },
        {
          id: 'w_feed_l',
          fromDeviceId: 'mcb_main',
          fromTerminalId: 'out_1',
          toDeviceId: 'jbox_main',
          toTerminalId: 'l_in',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#dc2626',
          lengthMeters: 4,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_feed_n',
          fromDeviceId: 'mcb_main',
          fromTerminalId: 'out_2',
          toDeviceId: 'jbox_main',
          toTerminalId: 'n_in',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#2563eb',
          lengthMeters: 4,
          conductorRole: 'return_neutral'
        },
        {
          id: 'w_feed_pe',
          fromDeviceId: 'pe_bar',
          fromTerminalId: 'pe_1',
          toDeviceId: 'jbox_main',
          toTerminalId: 'pe_in',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#16a34a',
          lengthMeters: 4,
          conductorRole: 'earth_ground'
        },
        {
          id: 'w_acu_l',
          fromDeviceId: 'jbox_main',
          fromTerminalId: 'l_out',
          toDeviceId: 'acu_safety',
          toTerminalId: 'in_l',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#dc2626',
          lengthMeters: 3,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_acu_n',
          fromDeviceId: 'jbox_main',
          fromTerminalId: 'n_out',
          toDeviceId: 'acu_safety',
          toTerminalId: 'in_n',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#2563eb',
          lengthMeters: 3,
          conductorRole: 'return_neutral'
        },
        {
          id: 'w_acu_pe',
          fromDeviceId: 'jbox_main',
          fromTerminalId: 'pe_out',
          toDeviceId: 'acu_safety',
          toTerminalId: 'pe',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#16a34a',
          lengthMeters: 3,
          conductorRole: 'earth_ground'
        },
        {
          id: 'w_load_ac_l',
          fromDeviceId: 'acu_safety',
          fromTerminalId: 'out_l',
          toDeviceId: 'appliance_ac',
          toTerminalId: 'line',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#dc2626',
          lengthMeters: 2,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_load_ac_n',
          fromDeviceId: 'acu_safety',
          fromTerminalId: 'out_n',
          toDeviceId: 'appliance_ac',
          toTerminalId: 'neutral',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#2563eb',
          lengthMeters: 2,
          conductorRole: 'return_neutral'
        },
        {
          id: 'w_load_ac_pe',
          fromDeviceId: 'acu_safety',
          fromTerminalId: 'pe',
          toDeviceId: 'appliance_ac',
          toTerminalId: 'ground',
          wireGauge: '10 AWG (5.5 mm²)',
          color: '#16a34a',
          lengthMeters: 2,
          conductorRole: 'earth_ground'
        },
        {
          id: 'w_drop_l',
          fromDeviceId: 'jbox_main',
          fromTerminalId: 'l_out',
          toDeviceId: 'util_box',
          toTerminalId: 'l_in',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#dc2626',
          lengthMeters: 3,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_drop_n',
          fromDeviceId: 'jbox_main',
          fromTerminalId: 'n_out',
          toDeviceId: 'util_box',
          toTerminalId: 'n_in',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#2563eb',
          lengthMeters: 3,
          conductorRole: 'return_neutral'
        },
        {
          id: 'w_drop_pe',
          fromDeviceId: 'jbox_main',
          fromTerminalId: 'pe_out',
          toDeviceId: 'util_box',
          toTerminalId: 'pe_in',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#16a34a',
          lengthMeters: 3,
          conductorRole: 'earth_ground'
        },
        {
          id: 'w_combo_feed_l',
          fromDeviceId: 'util_box',
          fromTerminalId: 'l_out',
          toDeviceId: 'combo_plate',
          toTerminalId: 'sw_in',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#dc2626',
          lengthMeters: 1,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_jumper_rec_l',
          fromDeviceId: 'combo_plate',
          fromTerminalId: 'sw_in',
          toDeviceId: 'combo_plate',
          toTerminalId: 'rec_l',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#dc2626',
          lengthMeters: 0.2,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_jumper_pilot_l',
          fromDeviceId: 'combo_plate',
          fromTerminalId: 'sw_in',
          toDeviceId: 'combo_plate',
          toTerminalId: 'pilot_l',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#dc2626',
          lengthMeters: 0.2,
          conductorRole: 'feed_live'
        },
        {
          id: 'w_combo_feed_n',
          fromDeviceId: 'util_box',
          fromTerminalId: 'n_out',
          toDeviceId: 'combo_plate',
          toTerminalId: 'rec_n',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#2563eb',
          lengthMeters: 1,
          conductorRole: 'return_neutral'
        },
        {
          id: 'w_jumper_pilot_n',
          fromDeviceId: 'combo_plate',
          fromTerminalId: 'rec_n',
          toDeviceId: 'combo_plate',
          toTerminalId: 'pilot_n',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#2563eb',
          lengthMeters: 0.2,
          conductorRole: 'return_neutral'
        },
        {
          id: 'w_combo_feed_pe',
          fromDeviceId: 'util_box',
          fromTerminalId: 'pe_out',
          toDeviceId: 'combo_plate',
          toTerminalId: 'rec_pe',
          wireGauge: '12 AWG (3.5 mm²)',
          color: '#16a34a',
          lengthMeters: 1,
          conductorRole: 'earth_ground'
        },
        {
          id: 'w_sw_to_lamp',
          fromDeviceId: 'combo_plate',
          fromTerminalId: 'sw_out',
          toDeviceId: 'room_lamp',
          toTerminalId: 'hot',
          wireGauge: '14 AWG (2.0 mm²)',
          color: '#ea580c',
          lengthMeters: 3,
          conductorRole: 'switched_live'
        },
        {
          id: 'w_lamp_return_n',
          fromDeviceId: 'room_lamp',
          fromTerminalId: 'neutral',
          toDeviceId: 'util_box',
          toTerminalId: 'n_out',
          wireGauge: '14 AWG (2.0 mm²)',
          color: '#2563eb',
          lengthMeters: 3,
          conductorRole: 'return_neutral'
        }
      ]
    }
  },
  // 1. SOCKET WITH GFCI
  {
    id: 'lab-socket-gfci',
    title: 'Socket Outlet with GFCI / RCD Shock Protection',
    subtitle: 'PEC 2.10.1.8 & IEC 60364-4-41 Life Safety Protection',
    category: 'sockets',
    badge: 'GFCI Protection',
    difficulty: 'Beginner',
    description: 'A 230V convenience receptacle circuit protected by a 30mA high-sensitivity Residual Current Device (RCD/GFCI) and full Equipment Grounding Conductor (EGC). Protects humans against fatal ventricular fibrillation.',
    objectives: [
      'Understand how 30mA differential current detection trips the RCD before lethal current enters a human body.',
      'Click the RCD [TEST] button to simulate ground leakage tripping.',
      'Verify that the green grounding conductor provides a zero-impedance fault return path to the PE busbar.'
    ],
    project: {
      id: 'proj_socket_gfci',
      title: 'Duplex Socket with GFCI / RCD 30mA Protection',
      description: 'Code-compliant branch circuit with RCD and Equipment Grounding Conductor.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 80, 'mcb_main'),
          name: 'Main 2P 20A Breaker',
          state: { closed: true, tripped: false, ratedAmps: 20, tripCurve: 'C' }
        },
        {
          ...createDeviceFromCatalog('rcd_2p', 200, 80, 'rcd_prot'),
          name: '30mA RCD / GFCI',
          state: { closed: true, tripped: false, ratedAmps: 25, sensitivityMa: 30 }
        },
        {
          ...createDeviceFromCatalog('earth_busbar', 80, 240, 'pe_bar'),
          name: 'PE Ground Busbar'
        },
        {
          ...createDeviceFromCatalog('ground_pit', 80, 420, 'earth_rod'),
          name: 'Grounding Electrode Pit'
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 420, 140, 'rec_gfci'),
          name: 'Duplex Receptacle',
          state: { viewMode: 'front', hasPluggedLoad: true }
        },
        {
          ...createDeviceFromCatalog('appliance_tv', 435, 290, 'tv_gfci'),
          name: 'Connected 4K TV (120W)',
          state: { wattage: 120, powered: true }
        }
      ],
      wires: [
        { id: 'w_l1', fromDeviceId: 'mcb_main', fromTerminalId: 'out_1', toDeviceId: 'rcd_prot', toTerminalId: 'in_l', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 1.0, conductorRole: 'feed_live' },
        { id: 'w_n1', fromDeviceId: 'mcb_main', fromTerminalId: 'out_2', toDeviceId: 'rcd_prot', toTerminalId: 'in_n', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 1.0, conductorRole: 'return_neutral' },
        { id: 'w_l2', fromDeviceId: 'rcd_prot', fromTerminalId: 'out_l', toDeviceId: 'rec_gfci', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 4.0, conductorRole: 'feed_live' },
        { id: 'w_n2', fromDeviceId: 'rcd_prot', fromTerminalId: 'out_n', toDeviceId: 'rec_gfci', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 4.0, conductorRole: 'return_neutral' },
        { id: 'w_pe1', fromDeviceId: 'earth_rod', fromTerminalId: 'clamp', toDeviceId: 'pe_bar', toTerminalId: 'pe_main', wireGauge: '8 AWG (8.0 mm²)', color: '#16a34a', lengthMeters: 2.0, conductorRole: 'earth_ground' },
        { id: 'w_pe2', fromDeviceId: 'pe_bar', fromTerminalId: 'pe_1', toDeviceId: 'rec_gfci', toTerminalId: 'ground', wireGauge: '12 AWG (3.5 mm²)', color: '#16a34a', lengthMeters: 4.0, conductorRole: 'earth_ground' },
        { id: 'w_plug', fromDeviceId: 'rec_gfci', fromTerminalId: 'line', toDeviceId: 'tv_gfci', toTerminalId: 'plug_in', wireGauge: '14 AWG (2.0 mm²)', color: '#1e293b', lengthMeters: 1.5 }
      ]
    }
  },

  // 2. SOCKET WITHOUT GFCI (SHOCK HAZARD AUDIT)
  {
    id: 'lab-socket-no-gfci',
    title: 'Socket Outlet WITHOUT GFCI (Ungrounded Shock Hazard)',
    subtitle: 'Demonstrates Code Violations & Electrocution Vulnerabilities',
    category: 'sockets',
    badge: 'Shock Hazard Audit',
    difficulty: 'Beginner',
    description: 'A 2-wire non-grounded circuit lacking both an Equipment Grounding Conductor (EGC) and an RCD. Inspect the Code Inspector HUD to see how the PEC compliance engine flags the absence of human shock protection.',
    objectives: [
      'Observe the code violations flagged in the HUD (PEC 2.50.6.13 ungrounded receptacle and PEC 2.10.1.8 missing GFCI).',
      'Understand why non-GFCI breakers fail to protect humans: a 20A breaker requires 20,000mA to trip, but 50mA is fatal to a human.',
      'Practice dragging wires and adding an EGC ground wire to fix the violations.'
    ],
    project: {
      id: 'proj_socket_no_gfci',
      title: 'Ungrounded Receptacle without GFCI Protection',
      description: '2-Wire ungrounded circuit demonstrating PEC compliance audit alerts.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 100, 120, 'mcb_no_gfci'),
          name: '2P 20A Breaker',
          state: { closed: true, tripped: false, ratedAmps: 20, tripCurve: 'C' }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 380, 120, 'rec_no_gfci'),
          name: 'Duplex Receptacle (Ungrounded)',
          state: { viewMode: 'front', hasPluggedLoad: true }
        },
        {
          ...createDeviceFromCatalog('appliance_tv', 395, 270, 'tv_no_gfci'),
          name: 'Connected TV (120W)',
          state: { wattage: 120, powered: true }
        }
      ],
      wires: [
        { id: 'w_ng_l', fromDeviceId: 'mcb_no_gfci', fromTerminalId: 'out_1', toDeviceId: 'rec_no_gfci', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 4.0, conductorRole: 'feed_live' },
        { id: 'w_ng_n', fromDeviceId: 'mcb_no_gfci', fromTerminalId: 'out_2', toDeviceId: 'rec_no_gfci', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 4.0, conductorRole: 'return_neutral' },
        { id: 'w_ng_tv', fromDeviceId: 'rec_no_gfci', fromTerminalId: 'line', toDeviceId: 'tv_no_gfci', toTerminalId: 'plug_in', wireGauge: '14 AWG (2.0 mm²)', color: '#1e293b', lengthMeters: 1.5 }
      ]
    }
  },

  // 3. SINGLE LAMP LIGHTING (1-WAY SWITCH)
  {
    id: 'lab-lighting-single',
    title: 'Single Lamp Lighting Circuit (1-Way Wall Switch)',
    subtitle: 'Standard Single-Pole Switch Drop with Continuous Neutral Return',
    category: 'lighting',
    badge: 'Basic Lighting',
    difficulty: 'Beginner',
    description: 'Fundamental branch lighting circuit. The Phase conductor is routed through the single-pole wall switch, creating a switched hot leg to the lamp. The Neutral conductor returns directly to the panel busbar.',
    objectives: [
      'Understand why the switch must interrupt the ungrounded Phase wire (PEC 4.4.1.2) and never the Neutral.',
      'Toggle the wall switch to observe real-time circuit solution: voltage, current flow, and tungsten filament illumination.',
      'Inspect wire gauge ampacity: 14 AWG (2.0 mm²) copper wire protected by a 10A lighting breaker.'
    ],
    project: {
      id: 'proj_lighting_single',
      title: 'Single Lamp Controlled by 1-Way Switch',
      description: 'Standard 10A lighting branch circuit.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_1p', 80, 100, 'mcb_light_1p'),
          name: 'MCB 10A Lighting',
          state: { closed: true, tripped: false, ratedAmps: 10, tripCurve: 'B' }
        },
        {
          ...createDeviceFromCatalog('neutral_busbar', 80, 240, 'n_bar_light'),
          name: 'Neutral Busbar'
        },
        {
          ...createDeviceFromCatalog('switch_1gang', 260, 180, 'sw_1g'),
          name: '1-Gang Wall Switch',
          state: { closed: true }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 480, 120, 'lamp_01'),
          name: 'Incandescent / LED Lamp',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        }
      ],
      wires: [
        { id: 'w_s1', fromDeviceId: 'mcb_light_1p', fromTerminalId: 'out', toDeviceId: 'sw_1g', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 3.0, conductorRole: 'feed_live' },
        { id: 'w_s2', fromDeviceId: 'sw_1g', fromTerminalId: 'sw_out', toDeviceId: 'lamp_01', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 2.5, conductorRole: 'switched_live' },
        { id: 'w_s3', fromDeviceId: 'lamp_01', fromTerminalId: 'neutral', toDeviceId: 'n_bar_light', toTerminalId: 'n_1', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 4.5, conductorRole: 'return_neutral' }
      ]
    }
  },

  // 4. SWITCHED NEUTRAL ELECTROCUTION HAZARD
  {
    id: 'lab-lighting-switched-neutral',
    title: 'Wiring Mistake: Switched Neutral Electrocution Hazard',
    subtitle: 'PEC 4.4.1.2 & 4.10.10.2 Violation: 230V Shock at Bulb Base',
    category: 'lighting',
    badge: 'Deadly Mistake',
    difficulty: 'Intermediate',
    description: 'In this deadly scenario, the single-pole switch is mistakenly installed on the Neutral return wire instead of the Phase feed. The lamp still turns on and off when you click the switch, tricking students into thinking it is fine — but when switched OFF, the lamp threaded screw shell remains continuously energized at 230V live!',
    objectives: [
      'Observe that the lamp illuminates even with inverted polarity, creating a deceptive false sense of security.',
      'Notice the HUD alert: ⚡ FATAL ELECTROCUTION HAZARD: Switched Neutral (PEC 4.4.1.2).',
      'Understand the real-world hazard: Anyone changing the lightbulb who accidentally brushes against the brass screw base will be electrocuted to earth.',
      'Correct the wiring by rerouting the Phase wire through the switch.'
    ],
    project: {
      id: 'proj_switched_neutral',
      title: 'Deadly Mistake: Switched Neutral Circuit',
      description: 'Teaches electricians never to switch neutral conductors.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_1p', 80, 100, 'mcb_deadly'),
          name: 'MCB 10A Breaker',
          state: { closed: true, tripped: false, ratedAmps: 10 }
        },
        {
          ...createDeviceFromCatalog('neutral_busbar', 80, 240, 'n_bar_deadly'),
          name: 'Neutral Busbar'
        },
        {
          ...createDeviceFromCatalog('switch_1gang', 260, 240, 'sw_wrong'),
          name: 'Wall Switch (Mistakenly on Neutral)',
          state: { closed: true }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 480, 100, 'lamp_deadly'),
          name: 'Ceiling Lamp (Shell Live at 230V!)',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        }
      ],
      wires: [
        // Live directly to lamp hot terminal!
        { id: 'w_d1', fromDeviceId: 'mcb_deadly', fromTerminalId: 'out', toDeviceId: 'lamp_deadly', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 4.0, conductorRole: 'feed_live' },
        // Neutral routed into switch
        { id: 'w_d2', fromDeviceId: 'n_bar_deadly', fromTerminalId: 'n_1', toDeviceId: 'sw_wrong', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        // Switched neutral returning from switch to lamp
        { id: 'w_d3', fromDeviceId: 'sw_wrong', fromTerminalId: 'sw_out', toDeviceId: 'lamp_deadly', toTerminalId: 'neutral', wireGauge: '14 AWG (2.0 mm²)', color: '#2563eb', lengthMeters: 3.0, conductorRole: 'return_neutral' }
      ]
    }
  },

  // 5. STAIRCASE 2-WAY SWITCHING (TWO 3-WAY SWITCHES)
  {
    id: 'lab-lighting-2way',
    title: 'Staircase 2-Way Switching (Two 3-Way Switches)',
    subtitle: 'Controlling 1 Lamp Independently from Upstairs & Downstairs',
    category: 'lighting',
    badge: '3-Way / 2-Way',
    difficulty: 'Intermediate',
    description: 'Classic residential staircase lighting arrangement. Two 3-way single-pole double-throw (SPDT) switches connected by two traveler conductors (t1 and t2). Either switch toggles the lamp independently from bottom or top of stairs.',
    objectives: [
      'Learn how the Common (COM) terminal connects to Line on Switch 1, and Switched Hot on Switch 2.',
      'Trace the dual traveler wires (Orange & Yellow) linking terminals 1 and 2 of both switches.',
      'Click either switch to verify that toggling either switch inverts state and turns the lamp ON or OFF.'
    ],
    project: {
      id: 'proj_2way_staircase',
      title: 'Staircase 2-Way Switching Circuit',
      description: 'Two 3-way switches controlling one lamp fixture.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_1p', 60, 100, 'mcb_stair'),
          name: 'MCB 10A Lighting',
          state: { closed: true, tripped: false, ratedAmps: 10 }
        },
        {
          ...createDeviceFromCatalog('neutral_busbar', 60, 240, 'n_bar_stair'),
          name: 'Neutral Busbar'
        },
        {
          ...createDeviceFromCatalog('switch_3way', 200, 140, 'sw_3w_1'),
          name: '3-Way Switch A (Downstairs)',
          state: { position: 'A' }
        },
        {
          ...createDeviceFromCatalog('switch_3way', 420, 140, 'sw_3w_2'),
          name: '3-Way Switch B (Upstairs)',
          state: { position: 'A' }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 620, 120, 'lamp_stair'),
          name: 'Staircase Chandelier Lamp',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        }
      ],
      wires: [
        { id: 'w_st1', fromDeviceId: 'mcb_stair', fromTerminalId: 'out', toDeviceId: 'sw_3w_1', toTerminalId: 'com', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'w_st2', fromDeviceId: 'sw_3w_1', fromTerminalId: 't1', toDeviceId: 'sw_3w_2', toTerminalId: 't1', wireGauge: '14 AWG (2.0 mm²)', color: '#ea580c', lengthMeters: 6.0, conductorRole: 'switched_live' },
        { id: 'w_st3', fromDeviceId: 'sw_3w_1', fromTerminalId: 't2', toDeviceId: 'sw_3w_2', toTerminalId: 't2', wireGauge: '14 AWG (2.0 mm²)', color: '#eab308', lengthMeters: 6.0, conductorRole: 'switched_live' },
        { id: 'w_st4', fromDeviceId: 'sw_3w_2', fromTerminalId: 'com', toDeviceId: 'lamp_stair', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.5, conductorRole: 'switched_live' },
        { id: 'w_st5', fromDeviceId: 'lamp_stair', fromTerminalId: 'neutral', toDeviceId: 'n_bar_stair', toTerminalId: 'n_1', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 7.0, conductorRole: 'return_neutral' }
      ]
    }
  },

  // 6. MULTI-LOCATION 3-WAY & 4-WAY INTERMEDIATE SWITCHING
  {
    id: 'lab-lighting-intermediate',
    title: 'Multi-Location Switching (Two 3-Ways + One 4-Way)',
    subtitle: 'Corridor & Long Hallway Lighting Controlled from 3 Locations',
    category: 'lighting',
    badge: 'Intermediate 4-Way',
    difficulty: 'Advanced',
    description: 'When a lighting load needs to be controlled from 3 or more locations (long hallways, open-plan living rooms), 4-way intermediate switches are placed between two 3-way end switches.',
    objectives: [
      'Understand the reversing contact mechanism inside a 4-way intermediate crossover switch.',
      'Toggle any of the 3 switches and verify that the lamp state changes seamlessly.',
      'Trace how adding additional 4-way switches allows infinite control points along a corridor.'
    ],
    project: {
      id: 'proj_4way_intermediate',
      title: 'Hallway 3-Location Lighting with 4-Way Intermediate Switch',
      description: 'Two 3-way switches and one 4-way switch controlling one lamp.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_1p', 50, 100, 'mcb_hall'),
          name: 'MCB 10A Lighting',
          state: { closed: true, tripped: false, ratedAmps: 10 }
        },
        {
          ...createDeviceFromCatalog('neutral_busbar', 50, 240, 'n_bar_hall'),
          name: 'Neutral Busbar'
        },
        {
          ...createDeviceFromCatalog('switch_3way', 160, 140, 'sw_end_1'),
          name: '3-Way Switch 1 (Entrance)',
          state: { position: 'A' }
        },
        {
          ...createDeviceFromCatalog('switch_4way', 330, 140, 'sw_mid_4w'),
          name: '4-Way Intermediate (Mid Hall)',
          state: { crossState: false }
        },
        {
          ...createDeviceFromCatalog('switch_3way', 500, 140, 'sw_end_2'),
          name: '3-Way Switch 2 (Exit)',
          state: { position: 'A' }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 680, 120, 'lamp_hall'),
          name: 'Corridor Ceiling Luminaire',
          state: { wattage: 80, lit: true, brightness: 1.0 }
        }
      ],
      wires: [
        { id: 'w_h1', fromDeviceId: 'mcb_hall', fromTerminalId: 'out', toDeviceId: 'sw_end_1', toTerminalId: 'com', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'w_h2', fromDeviceId: 'sw_end_1', fromTerminalId: 't1', toDeviceId: 'sw_mid_4w', toTerminalId: 'in_1', wireGauge: '14 AWG (2.0 mm²)', color: '#ea580c', lengthMeters: 3.5, conductorRole: 'switched_live' },
        { id: 'w_h3', fromDeviceId: 'sw_end_1', fromTerminalId: 't2', toDeviceId: 'sw_mid_4w', toTerminalId: 'in_2', wireGauge: '14 AWG (2.0 mm²)', color: '#eab308', lengthMeters: 3.5, conductorRole: 'switched_live' },
        { id: 'w_h4', fromDeviceId: 'sw_mid_4w', fromTerminalId: 'out_1', toDeviceId: 'sw_end_2', toTerminalId: 't1', wireGauge: '14 AWG (2.0 mm²)', color: '#ea580c', lengthMeters: 3.5, conductorRole: 'switched_live' },
        { id: 'w_h5', fromDeviceId: 'sw_mid_4w', fromTerminalId: 'out_2', toDeviceId: 'sw_end_2', toTerminalId: 't2', wireGauge: '14 AWG (2.0 mm²)', color: '#eab308', lengthMeters: 3.5, conductorRole: 'switched_live' },
        { id: 'w_h6', fromDeviceId: 'sw_end_2', fromTerminalId: 'com', toDeviceId: 'lamp_hall', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'switched_live' },
        { id: 'w_h7', fromDeviceId: 'lamp_hall', fromTerminalId: 'neutral', toDeviceId: 'n_bar_hall', toTerminalId: 'n_1', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 8.0, conductorRole: 'return_neutral' }
      ]
    }
  },

  // 7. MULTIPLE LAMPS IN PARALLEL
  {
    id: 'lab-lighting-multiple',
    title: 'Multiple Ceiling Lamps in Parallel Branch Circuit',
    subtitle: 'Equal 230V Potential Across Multiple Fixtures (PEC 2.10)',
    category: 'lighting',
    badge: 'Parallel Branch',
    difficulty: 'Intermediate',
    description: '3 lamps connected in parallel on a single switched branch. Shows why residential loads are always connected in parallel: each luminaire gets full 230V voltage, and if one bulb burns out or is removed, the others remain illuminated.',
    objectives: [
      'Observe parallel voltage distribution: all lamps receive 230V line-to-neutral potential.',
      'Check current summing: HUD shows cumulative branch current I = P1/V + P2/V + P3/V.',
      'Flip the master switch to simultaneously command all three lamps.'
    ],
    project: {
      id: 'proj_lighting_parallel',
      title: 'Three Lamps in Parallel Branch Circuit',
      description: 'Single-switch control of 3 parallel ceiling lights.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_1p', 60, 100, 'mcb_multi_l'),
          name: 'MCB 10A Lighting',
          state: { closed: true, tripped: false, ratedAmps: 10 }
        },
        {
          ...createDeviceFromCatalog('neutral_busbar', 60, 240, 'n_bar_multi_l'),
          name: 'Neutral Busbar'
        },
        {
          ...createDeviceFromCatalog('switch_1gang', 180, 200, 'sw_multi_l'),
          name: 'Master Room Switch',
          state: { closed: true }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 340, 100, 'lamp_p1'),
          name: 'Ceiling Lamp 1 (60W)',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 490, 100, 'lamp_p2'),
          name: 'Ceiling Lamp 2 (60W)',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        },
        {
          ...createDeviceFromCatalog('light_bulb', 640, 100, 'lamp_p3'),
          name: 'Ceiling Lamp 3 (60W)',
          state: { wattage: 60, lit: true, brightness: 1.0 }
        }
      ],
      wires: [
        { id: 'w_p1', fromDeviceId: 'mcb_multi_l', fromTerminalId: 'out', toDeviceId: 'sw_multi_l', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        // Switched feed parallel bus
        { id: 'w_p2', fromDeviceId: 'sw_multi_l', fromTerminalId: 'sw_out', toDeviceId: 'lamp_p1', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 2.5, conductorRole: 'switched_live' },
        { id: 'w_p3', fromDeviceId: 'lamp_p1', fromTerminalId: 'hot', toDeviceId: 'lamp_p2', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 2.0, conductorRole: 'switched_live' },
        { id: 'w_p4', fromDeviceId: 'lamp_p2', fromTerminalId: 'hot', toDeviceId: 'lamp_p3', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 2.0, conductorRole: 'switched_live' },
        // Neutral return parallel bus
        { id: 'w_p5', fromDeviceId: 'lamp_p3', fromTerminalId: 'neutral', toDeviceId: 'lamp_p2', toTerminalId: 'neutral', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'w_p6', fromDeviceId: 'lamp_p2', fromTerminalId: 'neutral', toDeviceId: 'lamp_p1', toTerminalId: 'neutral', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'w_p7', fromDeviceId: 'lamp_p1', fromTerminalId: 'neutral', toDeviceId: 'n_bar_multi_l', toTerminalId: 'n_1', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 3.5, conductorRole: 'return_neutral' }
      ]
    }
  },

  // 8. SPLICE TUTORIAL: JUNCTION BOX & WIRE NUTS
  {
    id: 'lab-splice-tutorial',
    title: 'Splice Tutorial: Junction Box & Wire Nut Branching',
    subtitle: 'How to Use Wire Nuts & Octagonal J-Boxes to Branch Conductors',
    category: 'splice',
    badge: 'Splice Tutorial',
    difficulty: 'Intermediate',
    description: 'Learn how electricians split and branch conductors inside an enclosure without daisy-chaining screws. Feeder Live (Red) enters the J-Box and connects to the Red Wire Nut, branching out to the Electric Fan and Duplex Outlet. Feeder Neutral (Blue/Black) connects to the Neutral Wire Nut, branching to both loads.',
    objectives: [
      'Understand the purpose of a wire nut (twist-on connector): mechanically joining and insulating 3 or more conductors.',
      'See how the Octagonal J-Box groups splices: Live splice group, Neutral splice group, and Earth splice group.',
      'Observe the electric fan spinning and socket TV running concurrently from the single branched feeder.',
      'Learn PEC 3.0.1.14 rules: all splices MUST be enclosed inside an approved junction box, never free-air in walls.'
    ],
    project: {
      id: 'proj_splice_tutorial',
      title: 'Branch Circuit Splice with Wire Nuts in J-Box',
      description: 'Educational demonstration of junction box conductor branching.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 80, 'mcb_splice'),
          name: '2P 20A Feeder Breaker',
          state: { closed: true, tripped: false, ratedAmps: 20 }
        },
        {
          ...createDeviceFromCatalog('earth_busbar', 80, 240, 'pe_bar_splice'),
          name: 'PE Earth Busbar'
        },
        {
          ...createDeviceFromCatalog('junction_box_octagonal_orange', 280, 160, 'jbox_tutorial'),
          name: 'Orange PVC Octagonal Box',
          state: { boxMaterial: 'orange_pvc', hasCover: false }
        },
        {
          ...createDeviceFromCatalog('appliance_fan', 500, 60, 'fan_branch'),
          name: 'Ceiling/Desk Fan (65W)',
          state: { wattage: 65, powered: true }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 500, 260, 'rec_branch'),
          name: 'Wall Outlet (Grounded)',
          state: { viewMode: 'front', hasPluggedLoad: true }
        },
        {
          ...createDeviceFromCatalog('appliance_tv', 515, 410, 'tv_branch'),
          name: 'Connected 4K TV (120W)',
          state: { wattage: 120, powered: true }
        }
      ],
      wires: [
        // Feeder cable from MCB to J-Box
        { id: 'w_sp1', fromDeviceId: 'mcb_splice', fromTerminalId: 'out_1', toDeviceId: 'jbox_tutorial', toTerminalId: 'l_in', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 3.0, conductorRole: 'feed_live' },
        { id: 'w_sp2', fromDeviceId: 'mcb_splice', fromTerminalId: 'out_2', toDeviceId: 'jbox_tutorial', toTerminalId: 'n_in', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 3.0, conductorRole: 'return_neutral' },
        { id: 'w_sp3', fromDeviceId: 'pe_bar_splice', fromTerminalId: 'pe_1', toDeviceId: 'jbox_tutorial', toTerminalId: 'pe_in', wireGauge: '12 AWG (3.5 mm²)', color: '#16a34a', lengthMeters: 3.0, conductorRole: 'earth_ground' },

        // Branch 1: J-Box Splice Drop to Electric Fan
        { id: 'w_sp4', fromDeviceId: 'jbox_tutorial', toDeviceId: 'fan_branch', fromTerminalId: 'l_out', toTerminalId: 'line', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.5, conductorRole: 'feed_live' },
        { id: 'w_sp5', fromDeviceId: 'jbox_tutorial', toDeviceId: 'fan_branch', fromTerminalId: 'n_out', toTerminalId: 'neutral', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 2.5, conductorRole: 'return_neutral' },
        { id: 'w_sp6', fromDeviceId: 'jbox_tutorial', toDeviceId: 'fan_branch', fromTerminalId: 'pe_out', toTerminalId: 'ground', wireGauge: '14 AWG (2.0 mm²)', color: '#16a34a', lengthMeters: 2.5, conductorRole: 'earth_ground' },

        // Branch 2: J-Box Splice Drop to Duplex Receptacle
        { id: 'w_sp7', fromDeviceId: 'jbox_tutorial', toDeviceId: 'rec_branch', fromTerminalId: 'l_out', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.5, conductorRole: 'feed_live' },
        { id: 'w_sp8', fromDeviceId: 'jbox_tutorial', toDeviceId: 'rec_branch', fromTerminalId: 'n_out', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.5, conductorRole: 'return_neutral' },
        { id: 'w_sp9', fromDeviceId: 'jbox_tutorial', toDeviceId: 'rec_branch', fromTerminalId: 'pe_out', toTerminalId: 'ground', wireGauge: '12 AWG (3.5 mm²)', color: '#16a34a', lengthMeters: 2.5, conductorRole: 'earth_ground' },

        // TV cord plugged in
        { id: 'w_sp10', fromDeviceId: 'rec_branch', fromTerminalId: 'line', toDeviceId: 'tv_branch', toTerminalId: 'plug_in', wireGauge: '14 AWG (2.0 mm²)', color: '#1e293b', lengthMeters: 1.5 }
      ]
    }
  },

  // 9. AIR CONDITIONER (1.5 HP INVERTER) DEDICATED CIRCUIT
  {
    id: 'lab-ac-dedicated',
    title: 'Air Conditioner (1.5 HP Inverter) Dedicated Circuit',
    subtitle: 'PEC Art. 4.40 Motor-Compressor Circuit with Grounding & Digital Display',
    category: 'appliances',
    badge: 'Heavy Appliance',
    difficulty: 'Intermediate',
    description: 'Dedicated 230V branch circuit engineered for a 1.5 HP inverter split-type air conditioner (1200W). Protected by a 2P 20A breaker with continuous grounding. Features illuminated "16°C COOL" digital readout and motorized airflow louvers.',
    objectives: [
      'Learn PEC Article 4.40: room air conditioners must be supplied by an individual dedicated branch circuit.',
      'Verify the continuous green Equipment Grounding Conductor preventing touch-voltage hazards on the metal chassis.',
      'Check starting vs continuous ampacity on the HUD: 1200W draws ~5.22A continuous operating current.'
    ],
    project: {
      id: 'proj_ac_dedicated',
      title: 'Dedicated 1.5 HP Air Conditioning Circuit',
      description: 'PEC 4.40 compliant dedicated branch circuit with inverter indoor unit.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 100, 'mcb_ac_2p'),
          name: '2P 20A AC Breaker',
          state: { closed: true, tripped: false, ratedAmps: 20, tripCurve: 'C' }
        },
        {
          ...createDeviceFromCatalog('earth_busbar', 80, 240, 'pe_bar_ac'),
          name: 'PE Ground Busbar'
        },
        {
          ...createDeviceFromCatalog('ground_pit', 80, 420, 'earth_pit_ac'),
          name: 'Ground Electrode'
        },
        {
          ...createDeviceFromCatalog('appliance_ac', 360, 140, 'ac_inverter'),
          name: '1.5 HP Inverter AC Unit',
          state: { wattage: 1200, powered: true, setTemp: 16 }
        }
      ],
      wires: [
        { id: 'w_ac1', fromDeviceId: 'mcb_ac_2p', fromTerminalId: 'out_1', toDeviceId: 'ac_inverter', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 6.0, conductorRole: 'feed_live' },
        { id: 'w_ac2', fromDeviceId: 'mcb_ac_2p', fromTerminalId: 'out_2', toDeviceId: 'ac_inverter', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 6.0, conductorRole: 'return_neutral' },
        { id: 'w_ac3', fromDeviceId: 'earth_pit_ac', fromTerminalId: 'clamp', toDeviceId: 'pe_bar_ac', toTerminalId: 'pe_main', wireGauge: '8 AWG (8.0 mm²)', color: '#16a34a', lengthMeters: 2.0, conductorRole: 'earth_ground' },
        { id: 'w_ac4', fromDeviceId: 'pe_bar_ac', fromTerminalId: 'pe_1', toDeviceId: 'ac_inverter', toTerminalId: 'ground', wireGauge: '12 AWG (3.5 mm²)', color: '#16a34a', lengthMeters: 6.0, conductorRole: 'earth_ground' }
      ]
    }
  },

  // 10. VENTILATION ELECTRIC FAN CIRCUIT
  {
    id: 'lab-fan-circuit',
    title: 'Electric Ventilation Fan with Wall Switch Control',
    subtitle: 'Smooth 60fps Blade Rotation Animation & Speed Control',
    category: 'appliances',
    badge: 'Rotating Motor Load',
    difficulty: 'Beginner',
    description: 'Interactive single-phase motor load circuit. A 1-gang wall switch commands an electric desk/ceiling ventilation fan. When powered, the 3 aerodynamic blue rotor blades spin with continuous SVG rotation animation.',
    objectives: [
      'Flip the wall switch to observe motor startup and rotating blade animation.',
      'Examine the inductive motor load current (65W) and branch voltage drop in the HUD.',
      'Verify protective earth bonding to the fan metal motor housing.'
    ],
    project: {
      id: 'proj_fan_circuit',
      title: 'Switched Electric Ventilation Fan Circuit',
      description: 'Single-pole switch controlling an electric rotating fan load.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_1p', 80, 100, 'mcb_fan_1p'),
          name: 'MCB 10A Branch',
          state: { closed: true, tripped: false, ratedAmps: 10 }
        },
        {
          ...createDeviceFromCatalog('neutral_busbar', 80, 240, 'n_bar_fan'),
          name: 'Neutral Busbar'
        },
        {
          ...createDeviceFromCatalog('earth_busbar', 80, 380, 'pe_bar_fan'),
          name: 'PE Busbar'
        },
        {
          ...createDeviceFromCatalog('switch_1gang', 260, 180, 'sw_fan'),
          name: 'Fan Wall Switch',
          state: { closed: true }
        },
        {
          ...createDeviceFromCatalog('appliance_fan', 480, 100, 'fan_load'),
          name: 'Ventilation Fan (65W)',
          state: { wattage: 65, powered: true }
        }
      ],
      wires: [
        { id: 'w_fn1', fromDeviceId: 'mcb_fan_1p', fromTerminalId: 'out', toDeviceId: 'sw_fan', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 3.0, conductorRole: 'feed_live' },
        { id: 'w_fn2', fromDeviceId: 'sw_fan', fromTerminalId: 'sw_out', toDeviceId: 'fan_load', toTerminalId: 'line', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 2.5, conductorRole: 'switched_live' },
        { id: 'w_fn3', fromDeviceId: 'fan_load', fromTerminalId: 'neutral', toDeviceId: 'n_bar_fan', toTerminalId: 'n_1', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 4.5, conductorRole: 'return_neutral' },
        { id: 'w_fn4', fromDeviceId: 'pe_bar_fan', fromTerminalId: 'pe_1', toDeviceId: 'fan_load', toTerminalId: 'ground', wireGauge: '14 AWG (2.0 mm²)', color: '#16a34a', lengthMeters: 4.5, conductorRole: 'earth_ground' }
      ]
    }
  },

  // 11. COMPLETE RESIDENTIAL INSTALLATION (MASTER REFERENCE)
  {
    id: 'lab-1-reference',
    title: 'Complete Residential Installation (VoltLab 364 Master)',
    subtitle: 'Service Entrance, Dual Earth Pits, RCD 30mA, SPD, J-Box & Branch Loads',
    category: 'residential',
    badge: 'Master Reference',
    difficulty: 'Advanced',
    description: 'The master distribution installation model featuring a digital kWh meter, 2P main service disconnect, dual earthing pits, 30mA RCD, surge arrester (SPD), DIN-rail branch breakers, octagonal junction box with internal wire nuts, switch loop, ceiling lamp, and grounded duplex receptacle with TV.',
    objectives: [
      'Trace conductors from the utility service entrance into the kWh meter and main disconnect.',
      'Examine the TT / TN-S earthing system with independent meter ground and consumer unit earth busbars.',
      'Understand how the junction box branches paired Live and Neutral conductors to the switch drop and lamp fixture.',
      'Test the RCD push-to-test button and observe safety trip of downstream branch circuits.'
    ],
    project: {
      id: 'proj_lab1',
      title: 'Residential Installation with Junction Box & Return Wires',
      description: 'Single-phase 230V 60Hz installation with J-Box, paired wires, and earth electrode.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TT',
      devices: [
        { ...createDeviceFromCatalog('kwh_meter_1p', 80, 40, 'meter_01') },
        { ...createDeviceFromCatalog('service_disconnect_2p', 260, 100, 'main_cutoff'), state: { closed: true, tripped: false, ratedAmps: 63, tripCurve: 'C' } },
        { ...createDeviceFromCatalog('ground_pit', 30, 260, 'earth_pit_1') },
        { ...createDeviceFromCatalog('earth_busbar', 160, 240, 'pe_bar_meter') },
        { ...createDeviceFromCatalog('ground_pit', 320, 260, 'earth_pit_2') },
        { ...createDeviceFromCatalog('earth_busbar', 440, 100, 'pe_bar_main') },
        { ...createDeviceFromCatalog('rcd_2p', 500, 70, 'rcd_main'), state: { closed: true, tripped: false, ratedAmps: 40, sensitivityMa: 30 } },
        { ...createDeviceFromCatalog('spd_surge', 600, 70, 'spd_main') },
        { ...createDeviceFromCatalog('neutral_busbar', 680, 100, 'n_bar_main') },
        { ...createDeviceFromCatalog('mcb_1p', 500, 240, 'mcb_light'), name: 'MCB 10A (Lighting)', state: { closed: true, tripped: false, ratedAmps: 10, tripCurve: 'B' } },
        { ...createDeviceFromCatalog('mcb_1p', 555, 240, 'mcb_socket'), name: 'MCB 16A (Sockets)', state: { closed: true, tripped: false, ratedAmps: 16, tripCurve: 'C' } },
        { ...createDeviceFromCatalog('mcb_1p', 610, 240, 'mcb_spare'), name: 'MCB 20A (Spare)', state: { closed: false, tripped: false, ratedAmps: 20, tripCurve: 'C' } },
        { ...createDeviceFromCatalog('junction_box_4way', 740, 220, 'jbox_01'), name: 'Ceiling Junction Box (J-Box)' },
        { ...createDeviceFromCatalog('switch_1gang', 740, 380, 'sw_01'), name: 'Wall Switch (1-Gang)', state: { closed: true } },
        { ...createDeviceFromCatalog('light_bulb', 840, 310, 'lamp_01'), name: 'Ceiling Lamp (60W)', state: { wattage: 60, lit: true, brightness: 1.0 } },
        { ...createDeviceFromCatalog('socket_duplex', 530, 420, 'socket_01'), name: 'Duplex Receptacle', state: { viewMode: 'front', hasPluggedLoad: true } },
        { ...createDeviceFromCatalog('appliance_tv', 545, 570, 'tv_01'), name: 'Smart TV (120W)', state: { wattage: 120, powered: true } }
      ],
      wires: [
        { id: 'w1', fromDeviceId: 'meter_01', fromTerminalId: 'l_out', toDeviceId: 'main_cutoff', toTerminalId: 'in_l', wireGauge: '6 AWG (14 mm²)', color: '#dc2626', lengthMeters: 1.5, conductorRole: 'feed_live' },
        { id: 'w2', fromDeviceId: 'meter_01', fromTerminalId: 'n_out', toDeviceId: 'main_cutoff', toTerminalId: 'in_n', wireGauge: '6 AWG (14 mm²)', color: '#0f172a', lengthMeters: 1.5, conductorRole: 'return_neutral' },
        { id: 'w3', fromDeviceId: 'earth_pit_1', fromTerminalId: 'clamp', toDeviceId: 'pe_bar_meter', toTerminalId: 'pe_main', wireGauge: '6 AWG (14 mm²)', color: '#16a34a', lengthMeters: 2.0, conductorRole: 'earth_ground' },
        { id: 'w4', fromDeviceId: 'pe_bar_meter', fromTerminalId: 'pe_1', toDeviceId: 'meter_01', toTerminalId: 'l_in', wireGauge: '10 AWG (5.5 mm²)', color: '#16a34a', lengthMeters: 1.5, conductorRole: 'earth_ground' },
        { id: 'w5', fromDeviceId: 'earth_pit_2', fromTerminalId: 'clamp', toDeviceId: 'pe_bar_main', toTerminalId: 'pe_main', wireGauge: '6 AWG (14 mm²)', color: '#16a34a', lengthMeters: 2.5, conductorRole: 'earth_ground' },
        { id: 'w6', fromDeviceId: 'main_cutoff', fromTerminalId: 'out_l', toDeviceId: 'rcd_main', toTerminalId: 'in_l', wireGauge: '8 AWG (8.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'w7', fromDeviceId: 'main_cutoff', fromTerminalId: 'out_n', toDeviceId: 'rcd_main', toTerminalId: 'in_n', wireGauge: '8 AWG (8.0 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'w8', fromDeviceId: 'rcd_main', fromTerminalId: 'out_n', toDeviceId: 'n_bar_main', toTerminalId: 'n_main', wireGauge: '8 AWG (8.0 mm²)', color: '#0f172a', lengthMeters: 1.5, conductorRole: 'return_neutral' },
        { id: 'w9', fromDeviceId: 'rcd_main', fromTerminalId: 'out_l', toDeviceId: 'spd_main', toTerminalId: 'in_l', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 1.0, conductorRole: 'feed_live' },
        { id: 'w10', fromDeviceId: 'spd_main', fromTerminalId: 'pe_ground', toDeviceId: 'pe_bar_main', toTerminalId: 'pe_1', wireGauge: '10 AWG (5.5 mm²)', color: '#16a34a', lengthMeters: 1.0, conductorRole: 'earth_ground' },
        { id: 'w11', fromDeviceId: 'rcd_main', fromTerminalId: 'out_l', toDeviceId: 'mcb_light', toTerminalId: 'in', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 1.2, conductorRole: 'feed_live' },
        { id: 'w12', fromDeviceId: 'mcb_light', fromTerminalId: 'in', toDeviceId: 'mcb_socket', toTerminalId: 'in', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 0.5, conductorRole: 'feed_live' },
        { id: 'w13', fromDeviceId: 'mcb_socket', fromTerminalId: 'in', toDeviceId: 'mcb_spare', toTerminalId: 'in', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 0.5, conductorRole: 'feed_live' },
        { id: 'w14', fromDeviceId: 'mcb_light', fromTerminalId: 'out', toDeviceId: 'jbox_01', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 4.0, conductorRole: 'feed_live' },
        { id: 'w15', fromDeviceId: 'n_bar_main', fromTerminalId: 'n_1', toDeviceId: 'jbox_01', toTerminalId: 'n_in', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 4.0, conductorRole: 'return_neutral' },
        { id: 'w16', fromDeviceId: 'jbox_01', fromTerminalId: 'l_out', toDeviceId: 'sw_01', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'w17', fromDeviceId: 'sw_01', fromTerminalId: 'sw_out', toDeviceId: 'jbox_01', toTerminalId: 'sw_in', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 2.0, conductorRole: 'switched_live' },
        { id: 'w18', fromDeviceId: 'jbox_01', fromTerminalId: 'sw_out', toDeviceId: 'lamp_01', toTerminalId: 'hot', wireGauge: '14 AWG (2.0 mm²)', color: '#d97706', lengthMeters: 1.5, conductorRole: 'switched_live' },
        { id: 'w19', fromDeviceId: 'lamp_01', fromTerminalId: 'neutral', toDeviceId: 'jbox_01', toTerminalId: 'n_out', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 1.5, conductorRole: 'return_neutral' },
        { id: 'w20', fromDeviceId: 'mcb_socket', fromTerminalId: 'out', toDeviceId: 'socket_01', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 5.0, conductorRole: 'feed_live' },
        { id: 'w21', fromDeviceId: 'n_bar_main', fromTerminalId: 'n_2', toDeviceId: 'socket_01', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 5.0, conductorRole: 'return_neutral' },
        { id: 'w22', fromDeviceId: 'pe_bar_main', fromTerminalId: 'pe_2', toDeviceId: 'socket_01', toTerminalId: 'ground', wireGauge: '12 AWG (3.5 mm²)', color: '#16a34a', lengthMeters: 5.0, conductorRole: 'earth_ground' },
        { id: 'w23', fromDeviceId: 'socket_01', fromTerminalId: 'line', toDeviceId: 'tv_01', toTerminalId: 'plug_in', wireGauge: '14 AWG (2.0 mm²)', color: '#1e293b', lengthMeters: 1.5 }
      ]
    }
  },

  // 12. OUTLET PIGTAIL SPLICE (SYSTEM A - PEC COMPLIANT)
  {
    id: 'lab-outlet-pigtail',
    title: 'Outlet Wiring: Pigtail Splice System (System A - PEC Compliant)',
    subtitle: 'Continuous Feeder with T-Tap Wire Nut Drops (PEC 3.0.1.13(B))',
    category: 'splice',
    badge: 'PEC Topology A',
    difficulty: 'Advanced',
    description: 'Model the code-compliant Pigtail (T-Tap Splice) wiring method. Feeder conductors run continuously with branch pigtails dropping to each outlet. If an outlet is pulled for servicing, downstream continuity is completely uninterrupted.',
    objectives: [
      'Route continuous feeder line through the orange PVC octagonal box with wire nut / pigtail drops.',
      'Feed each duplex outlet independently via pigtails so downstream devices do not depend on upstream terminal screws.',
      'Toggle between Front Faceplate and Rear Mechanism views to understand field electrician workmanship.'
    ],
    project: {
      id: 'proj_lab7_pigtail',
      title: 'Convenience Outlets: Pigtail T-Tap Splice (System A)',
      description: 'PEC-compliant continuous feeder with wire-nut pigtails feeding 3 Duplex Outlets in parallel.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 110, 60, 'mcb_branch_2p_a'),
          name: '2P 20A Molded Case Breaker',
          state: { closed: true, tripped: false, ratedAmps: 20, tripCurve: 'C', mccbStyle: 'industrial_black' }
        },
        {
          ...createDeviceFromCatalog('junction_box_octagonal_orange', 95, 230, 'jbox_pvc_01_a'),
          name: 'Orange PVC Octagonal Box',
          state: { boxMaterial: 'orange_pvc', hasCover: false }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 280, 250, 'rec_pigtail_01'),
          name: 'Duplex Receptacle 1 (Pigtail Tap)',
          state: { viewMode: 'rear', hasPluggedLoad: false }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 480, 250, 'rec_pigtail_02'),
          name: 'Duplex Receptacle 2 (Pigtail Tap)',
          state: { viewMode: 'rear', hasPluggedLoad: false }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 680, 250, 'rec_pigtail_03'),
          name: 'Duplex Receptacle 3 (Pigtail Tap)',
          state: { viewMode: 'rear', hasPluggedLoad: true }
        },
        {
          ...createDeviceFromCatalog('appliance_tv', 695, 390, 'tv_load_end_a'),
          name: 'Connected TV Appliance (120W)',
          state: { wattage: 120, powered: true }
        }
      ],
      wires: [
        { id: 'a_w1', fromDeviceId: 'mcb_branch_2p_a', fromTerminalId: 'out_1', toDeviceId: 'jbox_pvc_01_a', toTerminalId: 'l_in', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.5, conductorRole: 'feed_live' },
        { id: 'a_w2', fromDeviceId: 'mcb_branch_2p_a', fromTerminalId: 'out_2', toDeviceId: 'jbox_pvc_01_a', toTerminalId: 'n_in', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.5, conductorRole: 'return_neutral' },
        { id: 'a_w3', fromDeviceId: 'jbox_pvc_01_a', fromTerminalId: 'l_out', toDeviceId: 'rec_pigtail_01', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'a_w4', fromDeviceId: 'jbox_pvc_01_a', fromTerminalId: 'n_out', toDeviceId: 'rec_pigtail_01', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'a_w5', fromDeviceId: 'jbox_pvc_01_a', fromTerminalId: 'l_out', toDeviceId: 'rec_pigtail_02', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 4.0, conductorRole: 'feed_live' },
        { id: 'a_w6', fromDeviceId: 'jbox_pvc_01_a', fromTerminalId: 'n_out', toDeviceId: 'rec_pigtail_02', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 4.0, conductorRole: 'return_neutral' },
        { id: 'a_w7', fromDeviceId: 'jbox_pvc_01_a', fromTerminalId: 'l_out', toDeviceId: 'rec_pigtail_03', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 6.0, conductorRole: 'feed_live' },
        { id: 'a_w8', fromDeviceId: 'jbox_pvc_01_a', fromTerminalId: 'n_out', toDeviceId: 'rec_pigtail_03', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 6.0, conductorRole: 'return_neutral' },
        { id: 'a_w9', fromDeviceId: 'rec_pigtail_03', fromTerminalId: 'line', toDeviceId: 'tv_load_end_a', toTerminalId: 'plug_in', wireGauge: '14 AWG (2.0 mm²)', color: '#1e293b', lengthMeters: 1.5 }
      ]
    }
  },

  // 13. OUTLET DAISY-CHAIN FEED-THROUGH (SYSTEM B)
  {
    id: 'lab-outlet-daisy-chain',
    title: 'Outlet Wiring: Daisy-Chain System (System B - Terminal Feed-Through)',
    subtitle: 'Terminal Screw Feed-Through with Neutral Interruption Risk',
    category: 'sockets',
    badge: 'Daisy-Chain B',
    difficulty: 'Intermediate',
    description: 'In System B, incoming conductors land on the top screw terminals, and brass bridge tabs feed current through to the bottom screws to power the next receptacle down the line. If a device is removed, downstream receptacles lose neutral return.',
    objectives: [
      'Trace how power hops from outlet to outlet through the device body screws.',
      'Notice the HUD alert: PEC Art. 3.0.1.13(B) requires continuity of grounded neutral conductor not to depend on receptacle terminal screws.',
      'Contrast this with System A (Pigtail Splice).'
    ],
    project: {
      id: 'proj_lab6_daisychain',
      title: 'Convenience Outlets: Daisy-Chain Feed-Through (System B)',
      description: 'Feed-through terminal screw arrangement across 3 Duplex Receptacles in series-parallel.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 110, 60, 'mcb_branch_2p'),
          name: '2P 20A Molded Case Breaker',
          state: { closed: true, tripped: false, ratedAmps: 20, tripCurve: 'C', mccbStyle: 'industrial_black' }
        },
        {
          ...createDeviceFromCatalog('junction_box_octagonal_orange', 95, 230, 'jbox_pvc_01'),
          name: 'Orange PVC Octagonal Box',
          state: { boxMaterial: 'orange_pvc', hasCover: false }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 280, 240, 'rec_gang_01'),
          name: 'Duplex Receptacle 1 (Upstream)',
          state: { viewMode: 'rear', hasPluggedLoad: false }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 480, 240, 'rec_gang_02'),
          name: 'Duplex Receptacle 2 (Middle)',
          state: { viewMode: 'rear', hasPluggedLoad: false }
        },
        {
          ...createDeviceFromCatalog('socket_duplex', 680, 240, 'rec_gang_03'),
          name: 'Duplex Receptacle 3 (End)',
          state: { viewMode: 'rear', hasPluggedLoad: true }
        },
        {
          ...createDeviceFromCatalog('appliance_tv', 695, 390, 'tv_load_end'),
          name: 'Connected TV Appliance (120W)',
          state: { wattage: 120, powered: true }
        }
      ],
      wires: [
        { id: 'b_w1', fromDeviceId: 'mcb_branch_2p', fromTerminalId: 'out_1', toDeviceId: 'jbox_pvc_01', toTerminalId: 'l_in', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.5, conductorRole: 'feed_live' },
        { id: 'b_w2', fromDeviceId: 'mcb_branch_2p', fromTerminalId: 'out_2', toDeviceId: 'jbox_pvc_01', toTerminalId: 'n_in', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.5, conductorRole: 'return_neutral' },
        { id: 'b_w3', fromDeviceId: 'jbox_pvc_01', fromTerminalId: 'l_out', toDeviceId: 'rec_gang_01', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'b_w4', fromDeviceId: 'jbox_pvc_01', fromTerminalId: 'n_out', toDeviceId: 'rec_gang_01', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'b_w5', fromDeviceId: 'rec_gang_01', fromTerminalId: 'line_out', toDeviceId: 'rec_gang_02', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'b_w6', fromDeviceId: 'rec_gang_01', fromTerminalId: 'neutral_out', toDeviceId: 'rec_gang_02', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'b_w7', fromDeviceId: 'rec_gang_02', fromTerminalId: 'line_out', toDeviceId: 'rec_gang_03', toTerminalId: 'line', wireGauge: '12 AWG (3.5 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'b_w8', fromDeviceId: 'rec_gang_02', fromTerminalId: 'neutral_out', toDeviceId: 'rec_gang_03', toTerminalId: 'neutral', wireGauge: '12 AWG (3.5 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'b_w9', fromDeviceId: 'rec_gang_03', fromTerminalId: 'line', toDeviceId: 'tv_load_end', toTerminalId: 'plug_in', wireGauge: '14 AWG (2.0 mm²)', color: '#1e293b', lengthMeters: 1.5 }
      ]
    }
  },

  // 7. DOL MOTOR STARTER WITH CONTACTOR & 3-WIRE SEAL-IN LATCH
  {
    id: 'lab-dol-starter',
    title: 'DOL Motor Starter with Contactor & 3-Wire Seal-In Control',
    subtitle: 'Industrial Motor Control: Start NO, Stop NC, Auxiliary NO (13-14) & Running Pilot',
    category: 'industrial',
    badge: 'DOL Starter',
    difficulty: 'Intermediate',
    description: 'The foundation of industrial motor control. Momentarily pressing START (NO) energizes contactor coil KM1 (A1-A2), pulling in main power poles (L1-T1, L2-T2) and auxiliary contact NO 13-14. Contact 13-14 acts as an electrical latch ("seal-in circuit") maintaining coil power even when Start is released. Pressing STOP (NC) or E-STOP drops out the contactor and halts the 3-phase motor.',
    objectives: [
      'Observe the 3-wire seal-in circuit: Aux NO 13-14 wired in parallel with the momentary Start button.',
      'Click the green START button in the device properties or directly on canvas to energize the contactor.',
      'Verify that the 3-phase induction motor spins and the green pilot indicator illuminates.',
      'Click STOP or trip the E-Stop to break the control circuit and safely de-energize the motor.'
    ],
    project: {
      id: 'proj_dol_motor_starter',
      title: 'Direct-On-Line (DOL) Contactor Motor Starter',
      description: '3-Phase AC motor starting circuit with contactor latching and emergency stop protection.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 80, 'mcb_feeder'),
          name: 'Main Feeder 2P 32A Breaker',
          state: { closed: true, tripped: false, ratedAmps: 32, tripCurve: 'D', mccbStyle: 'din_rail' }
        },
        {
          ...createDeviceFromCatalog('push_button_estop', 80, 270, 'pb_estop'),
          name: 'Emergency Stop Mushroom',
          state: { latched: false }
        },
        {
          ...createDeviceFromCatalog('push_button_station', 260, 80, 'pb_station'),
          name: 'Start/Stop Pushbutton Station',
          state: { startPressed: false, stopPressed: false }
        },
        {
          ...createDeviceFromCatalog('contactor_3p', 440, 80, 'km_contactor'),
          name: '3-Pole Power Contactor KM1',
          state: { closed: false, coilEnergized: false, ratedAmps: 25 }
        },
        {
          ...createDeviceFromCatalog('pilot_light_indicator', 454, 260, 'pl_run'),
          name: 'Running Pilot Indicator',
          state: { lit: false, pilotColor: 'green', wattage: 5 }
        },
        {
          ...createDeviceFromCatalog('motor_ac_industrial', 640, 90, 'ind_motor'),
          name: '3-Phase AC Induction Motor (3 HP)',
          state: { motorRunning: false, wattage: 2200, motorHp: 3.0, motorRpm: 1750 }
        },
        {
          ...createDeviceFromCatalog('earth_busbar', 660, 270, 'pe_motor_bus'),
          name: 'PE Ground Busbar'
        }
      ],
      wires: [
        // Control Circuit: Live Feeder -> E-Stop NC11
        { id: 'cw_1', fromDeviceId: 'mcb_feeder', fromTerminalId: 'out_1', toDeviceId: 'pb_estop', toTerminalId: 'nc_11', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        // E-Stop NC12 -> Stop Button NC1
        { id: 'cw_2', fromDeviceId: 'pb_estop', fromTerminalId: 'nc_12', toDeviceId: 'pb_station', toTerminalId: 'stop_1', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 1.5, conductorRole: 'feed_live' },
        // Stop Button NC2 -> Start Button NO3
        { id: 'cw_3', fromDeviceId: 'pb_station', fromTerminalId: 'stop_2', toDeviceId: 'pb_station', toTerminalId: 'start_3', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 0.5, conductorRole: 'feed_live' },
        // Stop Button NC2 -> Contactor Aux NO 13 (Seal-in feed)
        { id: 'cw_4', fromDeviceId: 'pb_station', fromTerminalId: 'stop_2', toDeviceId: 'km_contactor', toTerminalId: 'no_13', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        // Start Button NO4 -> Contactor Coil A1
        { id: 'cw_5', fromDeviceId: 'pb_station', fromTerminalId: 'start_4', toDeviceId: 'km_contactor', toTerminalId: 'a1', wireGauge: '14 AWG (2.0 mm²)', color: '#8b5cf6', lengthMeters: 2.0, conductorRole: 'switched_live' },
        // Contactor Aux NO 14 -> Contactor Coil A1 (Seal-in return loop)
        { id: 'cw_6', fromDeviceId: 'km_contactor', fromTerminalId: 'no_14', toDeviceId: 'km_contactor', toTerminalId: 'a1', wireGauge: '14 AWG (2.0 mm²)', color: '#8b5cf6', lengthMeters: 0.5, conductorRole: 'switched_live' },
        // Contactor Coil A2 -> Feeder Neutral return
        { id: 'cw_7', fromDeviceId: 'km_contactor', fromTerminalId: 'a2', toDeviceId: 'mcb_feeder', toTerminalId: 'out_2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 3.5, conductorRole: 'return_neutral' },

        // Power Circuit: Feeder Live & Neutral to Contactor L1 & L2
        { id: 'pw_1', fromDeviceId: 'mcb_feeder', fromTerminalId: 'out_1', toDeviceId: 'km_contactor', toTerminalId: 'l1', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 3.5, conductorRole: 'feed_live' },
        { id: 'pw_2', fromDeviceId: 'mcb_feeder', fromTerminalId: 'out_2', toDeviceId: 'km_contactor', toTerminalId: 'l2', wireGauge: '10 AWG (5.5 mm²)', color: '#0f172a', lengthMeters: 3.5, conductorRole: 'return_neutral' },

        // Power Circuit: Contactor T1 & T2 to Motor U1 & V1
        { id: 'pw_3', fromDeviceId: 'km_contactor', fromTerminalId: 't1', toDeviceId: 'ind_motor', toTerminalId: 'u1', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'pw_4', fromDeviceId: 'km_contactor', fromTerminalId: 't2', toDeviceId: 'ind_motor', toTerminalId: 'v1', wireGauge: '10 AWG (5.5 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },
        { id: 'pw_pe', fromDeviceId: 'pe_motor_bus', fromTerminalId: 'pe_1', toDeviceId: 'ind_motor', toTerminalId: 'pe', wireGauge: '10 AWG (5.5 mm²)', color: '#16a34a', lengthMeters: 1.0, conductorRole: 'earth_ground' },

        // Indicator Pilot Light: From Contactor T1 (Live when contactor closed) to X1, and X2 to Neutral
        { id: 'pl_w1', fromDeviceId: 'km_contactor', fromTerminalId: 't1', toDeviceId: 'pl_run', toTerminalId: 'x1', wireGauge: '14 AWG (2.0 mm²)', color: '#16a34a', lengthMeters: 1.5, conductorRole: 'switched_live' },
        { id: 'pl_w2', fromDeviceId: 'km_contactor', fromTerminalId: 't2', toDeviceId: 'pl_run', toTerminalId: 'x2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 1.5, conductorRole: 'return_neutral' },
      ]
    }
  },

  // 8. RELAY INTERLOCK & SIGNALING (RUN/STANDBY CHANGEOVER)
  {
    id: 'lab-relay-signaling',
    title: 'Industrial Control Relay: Run / Standby Annunciation',
    subtitle: 'DPDT Form-C Contacts Driving Green (Running) & Red (Standby) Pilot Lamps',
    category: 'industrial',
    badge: 'Relay Interlock',
    difficulty: 'Beginner',
    description: 'Electromechanical ice-cube control relays are universal in industrial machinery for signal inversion and interlocks. Here, a DPDT relay uses its Normally Closed (NC 12) contact to keep the Red "STANDBY" lamp lit while off. When the master control switch energizes relay coil A1-A2, the internal armature flips: the Red lamp turns off, and the Green "RUNNING" lamp turns on via Normally Open (NO 14) contact.',
    objectives: [
      'Examine Form-C changeover contact behavior (Common 11, NC 12, NO 14).',
      'Toggle the 1-gang control switch to observe the electromagnetic coil energization.',
      'Watch the relay LED illuminate and contacts swap between Red Standby and Green Running.'
    ],
    project: {
      id: 'proj_relay_signaling',
      title: 'Industrial Control Relay Changeover Signaling',
      description: 'DPDT ice-cube relay controlling red/green status pilot lamps.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 80, 'mcb_relay'),
          name: 'Control Feeder 2P 16A',
          state: { closed: true, tripped: false, ratedAmps: 16, tripCurve: 'C', mccbStyle: 'din_rail' }
        },
        {
          ...createDeviceFromCatalog('switch_1gang', 240, 80, 'sw_relay_ctrl'),
          name: 'Master Control Switch',
          state: { closed: false }
        },
        {
          ...createDeviceFromCatalog('industrial_relay_dpdt', 400, 80, 'cr_relay_01'),
          name: 'DPDT Control Relay (CR1)',
          state: { coilEnergized: false }
        },
        {
          ...createDeviceFromCatalog('pilot_light_indicator', 600, 60, 'pl_green_run'),
          name: 'RUNNING Pilot (Green)',
          state: { lit: false, pilotColor: 'green', wattage: 5 }
        },
        {
          ...createDeviceFromCatalog('pilot_light_indicator', 600, 200, 'pl_red_standby'),
          name: 'STANDBY Pilot (Red)',
          state: { lit: true, pilotColor: 'red', wattage: 5 }
        }
      ],
      wires: [
        // Live to Switch L_IN
        { id: 'rw_1', fromDeviceId: 'mcb_relay', fromTerminalId: 'out_1', toDeviceId: 'sw_relay_ctrl', toTerminalId: 'l_in', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 1.5, conductorRole: 'feed_live' },
        // Switch Out to Relay Coil A1
        { id: 'rw_2', fromDeviceId: 'sw_relay_ctrl', fromTerminalId: 'sw_out', toDeviceId: 'cr_relay_01', toTerminalId: 'a1', wireGauge: '14 AWG (2.0 mm²)', color: '#8b5cf6', lengthMeters: 1.5, conductorRole: 'switched_live' },
        // Relay Coil A2 to Neutral
        { id: 'rw_3', fromDeviceId: 'cr_relay_01', fromTerminalId: 'a2', toDeviceId: 'mcb_relay', toTerminalId: 'out_2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 2.5, conductorRole: 'return_neutral' },
        // Live to Relay Common 11
        { id: 'rw_4', fromDeviceId: 'mcb_relay', fromTerminalId: 'out_1', toDeviceId: 'cr_relay_01', toTerminalId: 'com_1', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.5, conductorRole: 'feed_live' },
        // Relay NO 14 to Green Pilot X1
        { id: 'rw_5', fromDeviceId: 'cr_relay_01', fromTerminalId: 'no_1', toDeviceId: 'pl_green_run', toTerminalId: 'x1', wireGauge: '14 AWG (2.0 mm²)', color: '#16a34a', lengthMeters: 2.0, conductorRole: 'switched_live' },
        // Relay NC 12 to Red Pilot X1
        { id: 'rw_6', fromDeviceId: 'cr_relay_01', fromTerminalId: 'nc_1', toDeviceId: 'pl_red_standby', toTerminalId: 'x1', wireGauge: '14 AWG (2.0 mm²)', color: '#ef4444', lengthMeters: 2.0, conductorRole: 'switched_live' },
        // Pilots X2 to Neutral
        { id: 'rw_7', fromDeviceId: 'pl_green_run', fromTerminalId: 'x2', toDeviceId: 'mcb_relay', toTerminalId: 'out_2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 4.0, conductorRole: 'return_neutral' },
        { id: 'rw_8', fromDeviceId: 'pl_red_standby', fromTerminalId: 'x2', toDeviceId: 'mcb_relay', toTerminalId: 'out_2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 4.0, conductorRole: 'return_neutral' },
      ]
    }
  },

  // 9. MICRO PLC AUTOMATED MOTOR & MACHINE CONTROLLER
  {
    id: 'lab-plc-automation',
    title: 'Micro PLC Automated Motor & Machine Controller',
    subtitle: 'Digital Inputs (I1: Start, I2: E-Stop) Executing Ladder Logic to Drive Relay Output Q1',
    category: 'automation',
    badge: 'PLC Automation',
    difficulty: 'Advanced',
    description: 'Modern factories replace bulky relay panels with Programmable Logic Controllers (PLCs). In this lab, push buttons connect to digital inputs I1 and I2 of a compact DIN-rail Micro PLC. The PLC CPU executes internal ladder logic: energizing output relay contact Q1, which drives the power contactor and starts the 3-phase AC induction motor with LCD status display.',
    objectives: [
      'Examine the separation between the 230V CPU power supply, digital input sensing, and isolated relay outputs.',
      'Toggle input push buttons to see PLC input LEDs (I1, I2) and output relays (Q1) activate.',
      'Verify how PLC relay output Q1 energizes the contactor and drives the high-power 3-phase motor.'
    ],
    project: {
      id: 'proj_plc_controller',
      title: 'Micro PLC Automated Machine Starter',
      description: 'Micro PLC controller with digital I/O driving contactor and 3-phase motor.',
      codeStandard: 'PEC',
      gridVoltage: 230,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: [
        {
          ...createDeviceFromCatalog('mcb_2p', 80, 80, 'mcb_plc_feed'),
          name: 'Main Feeder 2P 32A',
          state: { closed: true, tripped: false, ratedAmps: 32, tripCurve: 'C', mccbStyle: 'din_rail' }
        },
        {
          ...createDeviceFromCatalog('plc_micro_controller', 260, 80, 'plc_controller'),
          name: 'Micro PLC Controller (PLC-01)',
          state: { plcRunning: true, wattage: 15 }
        },
        {
          ...createDeviceFromCatalog('push_button_station', 80, 260, 'pb_plc_station'),
          name: 'Operator Pushbutton Station',
          state: { startPressed: false, stopPressed: false }
        },
        {
          ...createDeviceFromCatalog('contactor_3p', 480, 80, 'km_plc_contactor'),
          name: '3-Pole Contactor KM1',
          state: { closed: false, coilEnergized: false }
        },
        {
          ...createDeviceFromCatalog('motor_ac_industrial', 680, 80, 'ind_plc_motor'),
          name: '3-Phase AC Induction Motor',
          state: { motorRunning: false, wattage: 2200, motorHp: 3.0 }
        },
        {
          ...createDeviceFromCatalog('pilot_light_indicator', 494, 260, 'pl_plc_run'),
          name: 'PLC Run Indicator',
          state: { lit: false, pilotColor: 'green' }
        }
      ],
      wires: [
        // PLC CPU Power: Line to P_L, Neutral to P_N
        { id: 'plcw_1', fromDeviceId: 'mcb_plc_feed', fromTerminalId: 'out_1', toDeviceId: 'plc_controller', toTerminalId: 'p_l', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 1.5, conductorRole: 'feed_live' },
        { id: 'plcw_2', fromDeviceId: 'mcb_plc_feed', fromTerminalId: 'out_2', toDeviceId: 'plc_controller', toTerminalId: 'p_n', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 1.5, conductorRole: 'return_neutral' },

        // Input 1 Sensing: Line to Pushbutton Start NO3 -> Start NO4 to PLC I1
        { id: 'plcw_3', fromDeviceId: 'mcb_plc_feed', fromTerminalId: 'out_1', toDeviceId: 'pb_plc_station', toTerminalId: 'start_3', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'plcw_4', fromDeviceId: 'pb_plc_station', fromTerminalId: 'start_4', toDeviceId: 'plc_controller', toTerminalId: 'i1', wireGauge: '14 AWG (2.0 mm²)', color: '#06b6d4', lengthMeters: 2.0, conductorRole: 'switched_live' },

        // Output Q1 Control: Line to Q1_1 -> Q1_2 to Contactor Coil A1
        { id: 'plcw_5', fromDeviceId: 'mcb_plc_feed', fromTerminalId: 'out_1', toDeviceId: 'plc_controller', toTerminalId: 'q1_1', wireGauge: '14 AWG (2.0 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'plcw_6', fromDeviceId: 'plc_controller', toTerminalId: 'a1', fromTerminalId: 'q1_2', toDeviceId: 'km_plc_contactor', wireGauge: '14 AWG (2.0 mm²)', color: '#f97316', lengthMeters: 2.0, conductorRole: 'switched_live' },
        // Contactor Coil A2 to Neutral
        { id: 'plcw_7', fromDeviceId: 'km_plc_contactor', fromTerminalId: 'a2', toDeviceId: 'mcb_plc_feed', toTerminalId: 'out_2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 3.5, conductorRole: 'return_neutral' },

        // Power lines to Contactor L1/L2
        { id: 'plcw_8', fromDeviceId: 'mcb_plc_feed', fromTerminalId: 'out_1', toDeviceId: 'km_plc_contactor', toTerminalId: 'l1', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 3.0, conductorRole: 'feed_live' },
        { id: 'plcw_9', fromDeviceId: 'mcb_plc_feed', fromTerminalId: 'out_2', toDeviceId: 'km_plc_contactor', toTerminalId: 'l2', wireGauge: '10 AWG (5.5 mm²)', color: '#0f172a', lengthMeters: 3.0, conductorRole: 'return_neutral' },

        // Contactor T1/T2 to Motor U1/V1
        { id: 'plcw_10', fromDeviceId: 'km_plc_contactor', fromTerminalId: 't1', toDeviceId: 'ind_plc_motor', toTerminalId: 'u1', wireGauge: '10 AWG (5.5 mm²)', color: '#dc2626', lengthMeters: 2.0, conductorRole: 'feed_live' },
        { id: 'plcw_11', fromDeviceId: 'km_plc_contactor', fromTerminalId: 't2', toDeviceId: 'ind_plc_motor', toTerminalId: 'v1', wireGauge: '10 AWG (5.5 mm²)', color: '#0f172a', lengthMeters: 2.0, conductorRole: 'return_neutral' },

        // Pilot light from Contactor T1
        { id: 'plcw_12', fromDeviceId: 'km_plc_contactor', fromTerminalId: 't1', toDeviceId: 'pl_plc_run', toTerminalId: 'x1', wireGauge: '14 AWG (2.0 mm²)', color: '#16a34a', lengthMeters: 1.5, conductorRole: 'switched_live' },
        { id: 'plcw_13', fromDeviceId: 'km_plc_contactor', fromTerminalId: 't2', toDeviceId: 'pl_plc_run', toTerminalId: 'x2', wireGauge: '14 AWG (2.0 mm²)', color: '#0f172a', lengthMeters: 1.5, conductorRole: 'return_neutral' },
      ]
    }
  }
];

export function createBlankProject(standard: CodeStandard = 'PEC'): ElectricalProject {
  return {
    id: `project_${Date.now()}`,
    title: 'Blank Installation Canvas',
    description: 'Clean workspace ready for custom electrical installation planning.',
    codeStandard: standard,
    gridVoltage: standard === 'PEC' ? 230 : 230,
    gridFrequency: standard === 'PEC' ? 60 : 50,
    systemEarthing: 'TN-S',
    devices: [],
    wires: []
  };
}
