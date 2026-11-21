import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, GREEN, ORANGE, G12 } from './phase1Labs';

/**
 * Batch 3.2 labs: sources and power systems. Built from standard (brand-neutral) devices.
 */

const RED = '#dc2626';
const L1 = '#dc2626';
const L2 = '#eab308';
const L3 = '#2563eb';
const P = (...args: Parameters<typeof wr>) => wr(args[0], args[1], args[2], args[3], args[4], args[5] ?? G12);

// ── A · Standby supply chain: utility, manual transfer switch, generator, UPS ─────────────────
const standbyDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Utility Service Meter' }),
  dev('service_disconnect_2p', 250, 40, 'mains', { name: 'Utility Main (open it for an outage)', state: { closed: true, tripped: false, ratedAmps: 20 } }),
  dev('transfer_switch_manual', 220, 250, 'mts', { name: 'MTS1 Manual Transfer Switch', state: { position: 'normal' } }),
  dev('generator_set_1p', 430, 240, 'gen', { name: 'G1 Standby Generator 5 kVA', state: { ratedKva: 5 } }),
  dev('ups_battery', 230, 470, 'ups', { name: 'UPS1 Critical Load UPS', state: { capacityWh: 60, socPct: 100 } }),
  dev('light_bulb', 130, 680, 'lamp1', { name: 'Critical Lamp 1' }),
  dev('light_bulb', 280, 680, 'lamp2', { name: 'Critical Lamp 2' }),
];
const standbyWires: ElectricalWire[] = [
  P('grid', 'l_out', 'mains', 'in_l', RED), P('grid', 'n_out', 'mains', 'in_n', BLUE),
  P('mains', 'out_l', 'mts', 'norm_l', RED), P('mains', 'out_n', 'mts', 'norm_n', BLUE),
  P('gen', 'l_out', 'mts', 'gen_l', RED), P('gen', 'n_out', 'mts', 'gen_n', BLUE),
  P('mts', 'load_l', 'ups', 'in_l', RED), P('mts', 'load_n', 'ups', 'in_n', BLUE),
  P('ups', 'out_l', 'lamp1', 'hot', RED), P('ups', 'out_n', 'lamp1', 'neutral', BLUE),
  P('ups', 'out_l', 'lamp2', 'hot', RED), P('ups', 'out_n', 'lamp2', 'neutral', BLUE),
];

// ── B · Grid-tied PV with net metering ────────────────────────────────────────────────────────
const pvDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Utility Service Meter' }),
  dev('service_disconnect_2p', 230, 40, 'mains', { name: 'Utility Main (open it: grid lost)', state: { closed: true, tripped: false, ratedAmps: 20 } }),
  dev('net_meter', 410, 30, 'net', { name: 'Net Meter (import / export)' }),
  dev('rcd_2p', 640, 220, 'rcd', { name: 'RCD 30 mA (house)' }),
  dev('appliance_water_heater', 640, 60, 'wh', { name: 'House Load: Water Heater 1.5 kW', state: { wattage: 1500 } }),
  dev('pv_string', 60, 330, 'pv', { name: 'PV1 String 3 kWp', state: { kwp: 3, irradiance: 100 } }),
  dev('dc_isolator', 260, 320, 'iso', { name: 'QDC1 DC Isolator' }),
  dev('inverter_gridtie', 430, 300, 'inv', { name: 'INV1 Grid-Tie Inverter 3 kW', state: { ratedW: 3000 } }),
  dev('earth_busbar', 700, 330, 'pe', { name: 'PE Earth Bar', state: { isEarth: true } }),
];
const pvWires: ElectricalWire[] = [
  P('grid', 'l_out', 'mains', 'in_l', RED), P('grid', 'n_out', 'mains', 'in_n', BLUE),
  P('mains', 'out_l', 'net', 'l_in', RED), P('mains', 'out_n', 'net', 'n_in', BLUE),
  P('net', 'l_out', 'rcd', 'in_l', RED), P('net', 'n_out', 'rcd', 'in_n', BLUE),
  P('rcd', 'out_l', 'wh', 'line', RED), P('rcd', 'out_n', 'wh', 'neutral', BLUE),
  P('net', 'l_out', 'inv', 'out_l', RED), P('net', 'n_out', 'inv', 'out_n', BLUE),
  P('pv', 'pos', 'iso', 'in_pos', RED), P('pv', 'neg', 'iso', 'in_neg', '#0f172a'),
  P('iso', 'out_pos', 'inv', 'pv_pos', RED), P('iso', 'out_neg', 'inv', 'pv_neg', '#0f172a'),
  P('pe', 'pe_1', 'wh', 'ground', GREEN), P('pe', 'pe_2', 'inv', 'pe', GREEN),
];

// ── C · Power factor correction ───────────────────────────────────────────────────────────────
const pfDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'src', { name: '440V 3Φ 60Hz Feeder' }),
  dev('motor_ac_industrial', 40, 300, 'm1', { name: 'M1 Induction Motor 3 kW', state: { wattage: 3000 } }),
  dev('motor_ac_industrial', 220, 300, 'm2', { name: 'M2 Induction Motor 3 kW', state: { wattage: 3000 } }),
  dev('capacitor_bank_3p', 420, 40, 'bank', { name: 'C1 Capacitor Bank 4 x 5 kvar' }),
  dev('pf_controller', 640, 60, 'pfc', { name: 'KPF1 Power Factor Controller', state: { targetPf: 0.95, tag: 'KPF1' } }),
  dev('earth_busbar', 640, 300, 'pe', { name: 'PE Earth Bar' }),
];
const pfWires: ElectricalWire[] = [
  P('src', 'l1', 'm1', 'u1', L1), P('src', 'l2', 'm1', 'v1', L2), P('src', 'l3', 'm1', 'w1', L3),
  P('src', 'l1', 'm2', 'u1', L1), P('src', 'l2', 'm2', 'v1', L2), P('src', 'l3', 'm2', 'w1', L3),
  P('src', 'l1', 'bank', 'l1', L1), P('src', 'l2', 'bank', 'l2', L2), P('src', 'l3', 'bank', 'l3', L3),
  P('src', 'pe', 'pe', 'pe_main', GREEN), P('pe', 'pe_1', 'm1', 'pe', GREEN), P('pe', 'pe_2', 'm2', 'pe', GREEN),
  // controller supply across L1-L2, step contacts to the bank control inputs
  wr('src', 'l1', 'pfc', 'a1', ORANGE), wr('src', 'l2', 'pfc', 'a2', BLUE), wr('src', 'l1', 'pfc', 'com', ORANGE),
  wr('pfc', 'k1', 'bank', 'c1', ORANGE), wr('pfc', 'k2', 'bank', 'c2', ORANGE), wr('pfc', 'k3', 'bank', 'c3', ORANGE), wr('pfc', 'k4', 'bank', 'c4', ORANGE),
  wr('src', 'l2', 'bank', 'cn', BLUE),
];

// ── D · Marine switchboard: shore box, ground detection, delta-wye transformer ────────────────
const marineDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'shore', { name: 'Shore Supply 440V 3Φ (isolated, IT)', state: { earthing: 'isolated' } }),
  dev('shore_connection_box', 270, 30, 'box', { name: 'SC1 Shore Connection Box' }),
  dev('transformer_3p_delta_wye', 520, 40, 't1', { name: 'T1 Lighting Transformer 440/220 V', state: { ratio: 2, kva: 50 } }),
  dev('ground_detection_lamps', 270, 300, 'gd', { name: 'GD1 Ground Detection Lamps' }),
  dev('earth_busbar', 520, 340, 'hull', { name: 'Hull Earth Bar', state: { isEarth: true } }),
  dev('switch_1gang', 40, 330, 'f1', { name: 'Earth fault test: L1', state: { closed: false } }),
  dev('switch_1gang', 150, 330, 'f2', { name: 'Earth fault test: L2', state: { closed: false } }),
  dev('motor_ac_industrial', 720, 300, 'pump', { name: 'M1 Fire Pump Motor 1.5 kW', state: { wattage: 1500 } }),
];
const marineWires: ElectricalWire[] = [
  P('shore', 'l1', 'box', 'in_l1', L1), P('shore', 'l2', 'box', 'in_l2', L2), P('shore', 'l3', 'box', 'in_l3', L3),
  P('box', 'out_l1', 't1', 'h1', L1), P('box', 'out_l2', 't1', 'h2', L2), P('box', 'out_l3', 't1', 'h3', L3),
  P('box', 'out_l1', 'gd', 'l1', L1), P('box', 'out_l2', 'gd', 'l2', L2), P('box', 'out_l3', 'gd', 'l3', L3),
  P('hull', 'pe_1', 'gd', 'pe', GREEN),
  P('t1', 'x1', 'pump', 'u1', L1), P('t1', 'x2', 'pump', 'v1', L2), P('t1', 'x3', 'pump', 'w1', L3),
  P('hull', 'pe_2', 'pump', 'pe', GREEN),
  P('box', 'out_l1', 'f1', 'l_in', ORANGE), P('f1', 'sw_out', 'hull', 'pe_3', ORANGE),
  P('box', 'out_l2', 'f2', 'l_in', ORANGE), P('f2', 'sw_out', 'hull', 'pe_4', ORANGE),
];

// ── E · Generator paralleling: synchroscope and reverse power ─────────────────────────────────
const syncDevices: ElectricalDevice[] = [
  dev('generator_set_1p', 40, 40, 'ga', { name: 'G1 on the bus', state: { ratedKva: 5, runRequested: true, running: true } }),
  dev('generator_set_1p', 40, 360, 'gb', { name: 'G2 incoming', state: { ratedKva: 5, runRequested: true, running: true, freqOffsetHz: 0.4 } }),
  dev('synchroscope', 330, 120, 'sy', { name: 'SYN1 Synchroscope' }),
  dev('mcb_2p', 330, 360, 'qb', { name: 'QB G2 Breaker (close when in sync)', state: { closed: false, tripped: false, ratedAmps: 20 } }),
  dev('reverse_power_relay', 540, 360, 'rp', { name: 'KRP1 Reverse Power Relay', state: { delaySec: 3 } }),
  dev('light_bulb', 540, 140, 'ok', { name: 'SYNC OK lamp' }),
  dev('light_bulb', 700, 360, 'rev', { name: 'REVERSE POWER lamp' }),
  dev('light_bulb', 700, 140, 'bus', { name: 'Bus load lamp' }),
];
const syncWires: ElectricalWire[] = [
  // bus side (G1) and incoming side (G2) into the synchroscope
  P('ga', 'l_out', 'sy', 'bus_l', RED), P('ga', 'n_out', 'sy', 'bus_n', BLUE),
  P('gb', 'l_out', 'sy', 'inc_l', RED), P('gb', 'n_out', 'sy', 'inc_n', BLUE),
  // permissive contact lights the SYNC OK lamp
  P('ga', 'l_out', 'sy', 'perm_a', ORANGE), P('sy', 'perm_b', 'ok', 'hot', ORANGE), P('ga', 'n_out', 'ok', 'neutral', BLUE),
  // bus load
  P('ga', 'l_out', 'bus', 'hot', RED), P('ga', 'n_out', 'bus', 'neutral', BLUE),
  // G2 breaker onto the bus
  P('gb', 'l_out', 'qb', 'in_1', RED), P('gb', 'n_out', 'qb', 'in_2', BLUE),
  P('qb', 'out_1', 'ga', 'l_out', RED), P('qb', 'out_2', 'ga', 'n_out', BLUE),
  // reverse power relay on G2
  P('gb', 'l_out', 'rp', 'sense_l', RED), P('gb', 'n_out', 'rp', 'sense_n', BLUE),
  P('gb', 'l_out', 'rp', 'com_15', ORANGE), P('rp', 'no_18', 'rev', 'hot', ORANGE), P('gb', 'n_out', 'rev', 'neutral', BLUE),
];

// ── F · Preferential trip on generator overload ───────────────────────────────────────────────
const prefDevices: ElectricalDevice[] = [
  dev('generator_set_3p', 40, 30, 'gen', { name: 'G1 Emergency Generator 7 kVA', state: { ratedKva: 7, runRequested: true } }),
  dev('motor_ac_industrial', 40, 330, 'm1', { name: 'M1 Essential: Steering Pump 2.2 kW', state: { wattage: 2200 } }),
  dev('mccb_3p', 330, 190, 'q2', { name: 'Q2 Non-Essential Feeder (shunt trip)', state: { shuntTrip: true, closed: true, tripped: false, ratedAmps: 20 } }),
  dev('motor_ac_industrial', 330, 420, 'm2', { name: 'M2 Non-Essential: Galley Fan 2.2 kW', state: { wattage: 2200 } }),
  dev('preferential_trip_relay', 560, 60, 'pt', { name: 'KPT1 Preferential Trip Relay', state: { thresholdPct: 90, delaySec: 0.5 } }),
  dev('earth_busbar', 600, 340, 'pe', { name: 'PE Earth Bar' }),
];
const prefWires: ElectricalWire[] = [
  P('gen', 'l1_out', 'm1', 'u1', L1), P('gen', 'l2_out', 'm1', 'v1', L2), P('gen', 'l3_out', 'm1', 'w1', L3),
  P('gen', 'l1_out', 'q2', 'in_l1', L1), P('gen', 'l2_out', 'q2', 'in_l2', L2), P('gen', 'l3_out', 'q2', 'in_l3', L3),
  P('q2', 'out_l1', 'm2', 'u1', L1), P('q2', 'out_l2', 'm2', 'v1', L2), P('q2', 'out_l3', 'm2', 'w1', L3),
  P('gen', 'pe', 'pe', 'pe_main', GREEN), P('pe', 'pe_1', 'm1', 'pe', GREEN), P('pe', 'pe_2', 'm2', 'pe', GREEN),
  // sense across the generator output; contact energizes the Q2 shunt trip coil from L1-L2
  wr('gen', 'l1_out', 'pt', 'sense_l', ORANGE), wr('gen', 'l2_out', 'pt', 'sense_n', BLUE),
  wr('gen', 'l1_out', 'pt', 'com_15', ORANGE), wr('pt', 'no_18', 'q2', 'sht_a1', ORANGE), wr('gen', 'l2_out', 'q2', 'sht_a2', BLUE),
];

export const BATCH32_LABS: LabLesson[] = [
  {
    id: 'lab-power-standby-chain',
    title: 'Standby Supply Chain: Manual Transfer Switch, Generator and UPS',
    subtitle: 'Utility -> manual changeover (I-0-II) with a standby generator -> UPS -> critical lamps',
    category: 'residential',
    badge: '🔋 Standby Chain',
    difficulty: 'Intermediate',
    description:
      'The critical lamps are fed through a UPS, which is fed from a manual transfer switch that can select the utility or a standby generator. When the utility is lost the UPS battery carries the lamps while you start the generator and move the handle: it must pass through 0 (break-before-make), so the UPS rides through the gap and recharges afterwards.',
    objectives: [
      'Press ▶ Simulate: the lamps are on, the UPS is on LINE and fully charged.',
      'Open the Utility Main: the UPS switches to BATT, the lamps stay on and the charge falls. Read the autonomy on the UPS.',
      'Start the generator (3 s), then move the MTS handle I -> 0 -> II. At 0 the UPS carries the load alone, at II the generator feeds it and the battery recharges.',
      'Close the Utility Main and move the handle back through 0 to I. Why can the handle never go straight from I to II?',
    ],
    project: labProject('proj_power_standby_chain', 'Standby Supply Chain', 'Utility, manual transfer switch, generator and UPS.', standbyDevices, standbyWires),
  },
  {
    id: 'lab-pv-net-metering',
    title: 'Grid-Tied PV with Net Metering and Anti-Islanding',
    subtitle: 'PV string -> DC isolator -> grid-tie inverter -> net meter on the house service',
    category: 'residential',
    badge: '☀ Solar',
    difficulty: 'Advanced',
    description:
      'A 3 kWp PV string feeds a grid-tie inverter through a DC isolator. The inverter exports while it sees the grid; the net meter registers import and export (house load read at the meter minus the inverter output). Lose the grid and the inverter shuts down (anti-islanding): the house stays dead even in full sun.',
    objectives: [
      'Press ▶ Simulate in full sun: the inverter exports about 2.9 kW against the 1.5 kW heater, so the meter exports the surplus and the export register climbs.',
      'Reduce the irradiance on PV1 below about 50 %: the PV output falls under the load and the meter starts importing.',
      'Open the Utility Main: the inverter reports ANTI-ISLANDING and exports nothing, so the heater is dead although the sun is still shining.',
      'Close the Utility Main: the inverter waits 5 s before it exports again. Open the DC isolator to isolate the string.',
    ],
    project: labProject('proj_pv_net_metering', 'Grid-Tied PV with Net Metering', 'PV string, isolator, inverter, net meter.', pvDevices, pvWires),
  },
  {
    id: 'lab-power-factor-correction',
    title: 'Power Factor Correction: Controller, Capacitor Bank and Step Switching',
    subtitle: 'PF controller switches capacitor steps to reach the target power factor',
    category: 'industrial',
    badge: '📐 Power Factor',
    difficulty: 'Advanced',
    description:
      'Two induction motors make the plant lag. The power factor controller reads the plant power triangle and switches capacitor steps through its dry contacts into the bank control inputs until the power factor reaches the target. Each step needs 3 s to discharge before it can be switched in again, and the controller backs a step out when the plant is over-corrected.',
    objectives: [
      'Press ▶ Simulate: the controller shows a lagging power factor (about 0.85) and starts switching steps in one by one.',
      'Read the corrected PF on the controller and the kvar in service on the bank. Raise the target PF to 0.99 in the inspector and watch it add or hold a step.',
      'Remove one motor (delete it and re-simulate): the lagging kvar drops, so fewer steps are needed.',
      'Why does a bank that is too large create a leading power factor and a voltage problem?',
    ],
    project: labProject('proj_power_factor_correction', 'Power Factor Correction Panel', 'Controller and 4-step capacitor bank on two motors.', pfDevices, pfWires, 440),
  },
  {
    id: 'lab-marine-it-shore',
    title: 'Marine Switchboard: Shore Connection, Ground Detection and a Delta-Wye Transformer',
    subtitle: 'Ungrounded (IT) 440 V: the first earth fault shows on the lamps and nothing trips',
    category: 'industrial',
    badge: '⚓ IT System',
    difficulty: 'Advanced',
    description:
      'Shore power comes in through a shore connection box with a phase-sequence indicator and feeds a 440/220 V delta-wye lighting transformer and ground detection lamps. The feeder is isolated from earth (IT system), so a first earth fault does not trip: the faulted line lamp goes out and the other two glow bright. A second fault on another line is a real short circuit.',
    objectives: [
      'Press ▶ Simulate: the shore box shows SEQUENCE OK, the three ground lamps glow evenly and the transformer secondary runs the pump at 220 V.',
      'Close the "Earth fault test: L1" switch: lamp L1 goes out, L2 and L3 glow bright, and nothing trips. This is why IT systems keep running on a first fault.',
      'Now close the L2 test switch as well: two lines are earthed, which is a short circuit through the hull.',
      'Stop, swap two shore wires at the shore box and simulate again: the red WRONG lamp lights. Why does it matter for the pump motor?',
    ],
    project: labProject('proj_marine_it_shore', 'Marine Switchboard (IT System)', 'Shore box, transformer and ground detection.', marineDevices, marineWires, 440),
  },
  {
    id: 'lab-generator-sync',
    title: 'Generator Paralleling: Synchroscope, Sync Permissive and Reverse Power',
    subtitle: 'Bring the incoming set into sync before closing its breaker; a reverse-power relay guards it',
    category: 'industrial',
    badge: '🔄 Synchronising',
    difficulty: 'Advanced',
    description:
      'G1 feeds the bus. G2 is running 0.4 Hz fast, so its phase slips against the bus: the synchroscope needle rotates (slowed 4x so it can be followed) and the sync lamps pulse. Trim G2 speed in the inspector until the needle is nearly still, close the breaker when the SYNC OK lamp lights. A reverse-power relay on G2 trips if the set starts motoring. The model does not simulate the clash of closing out of sync: the permissive is a signal.',
    objectives: [
      'Press ▶ Simulate and press START on both generators (3 s each). Watch the synchroscope: G2 is FAST (0.4 Hz) so the needle rotates and the permissive is open.',
      'Select G2 and set the frequency offset to 0.05 Hz or less: the needle slows down. Wait for the needle to reach the top (SYNC OK lamp on) and close breaker QB.',
      'With G2 on the bus, select it and press "Simulate engine failure (motoring)". After 3 s the reverse-power relay trips and the REVERSE POWER lamp lights.',
      'Why must the breaker be closed just before the needle reaches the top, not when it is passing through quickly?',
    ],
    project: labProject('proj_generator_sync', 'Generator Paralleling', 'Synchroscope, breaker and reverse power relay.', syncDevices, syncWires),
  },
  {
    id: 'lab-preferential-trip',
    title: 'Generator Overload: Preferential Trip Sheds the Non-Essential Feeder',
    subtitle: 'The relay opens the galley feeder through its shunt trip before the set trips',
    category: 'industrial',
    badge: '⚡ Load Shedding',
    difficulty: 'Advanced',
    description:
      'A 7 kVA emergency generator carries the steering pump (essential) and a galley fan (non-essential) through a shunt-trip MCCB. Together they are above the set rating. The preferential trip relay sees the load above 90 % for 0.5 s and trips the non-essential feeder, well before the set would trip on its own 2 s overload timer. The essential pump keeps running.',
    objectives: [
      'Press ▶ Simulate and START the generator: after the 3 s start the set takes both motors and runs above its rating. The relay shows the load percentage.',
      'After half a second the relay trips (red lamp), closes its contact and Q2 opens through its shunt trip: the galley fan stops, the steering pump keeps running and the generator never overloads.',
      'Press RESET on the relay and re-close Q2: the cycle repeats. Now delete the relay wires (or the relay) and simulate again: the generator trips on overload after 2 s and both loads are lost.',
      'Why is the load shed in under a second while the set itself is allowed 2 s?',
    ],
    project: labProject('proj_preferential_trip', 'Preferential Trip Load Shedding', 'Shunt-trip feeder shed on generator overload.', prefDevices, prefWires, 440),
  },
];
