import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { createDeviceFromCatalog } from './defaultComponents';
import type { LabLesson } from './labTemplates';
import { dolDevices, dolWires, dolTarget } from './motorControlLabs';

/**
 * Roadmap phase 1 labs: timer relay functions, fuses, RCBO and generator / ATS.
 * Built from standard (brand-neutral) devices.
 */

export const RED = '#dc2626';
export const BLUE = '#0f172a'; // neutral (drawn dark)
export const GREEN = '#16a34a';
export const ORANGE = '#d97706';
export const G14 = '14 AWG (2.0 mm²)';
export const G12 = '12 AWG (3.5 mm²)';

export const labDevice = (
  type: ElectricalDevice['type'],
  x: number,
  y: number,
  id: string,
  over: { name?: string; state?: Record<string, any> } = {}
): ElectricalDevice => {
  const d = createDeviceFromCatalog(type, x, y, id);
  return { ...d, name: over.name || d.name, state: { ...d.state, ...(over.state || {}) } };
};

let seq = 0;
export const labWire = (
  fromDeviceId: string,
  fromTerminalId: string,
  toDeviceId: string,
  toTerminalId: string,
  color: string,
  gauge: string = G14
): ElectricalWire => ({
  id: `p1_${++seq}`,
  fromDeviceId,
  fromTerminalId,
  toDeviceId,
  toTerminalId,
  color,
  wireGauge: gauge,
  lengthMeters: 3,
  conductorRole: color === GREEN ? 'earth_ground' : color === BLUE ? 'return_neutral' : color === ORANGE ? 'switched_live' : 'feed_live',
});

export const labProject = (
  id: string,
  title: string,
  description: string,
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  gridVoltage = 230
) => ({
  id,
  title,
  description,
  codeStandard: 'PEC' as const,
  gridVoltage,
  gridFrequency: 60,
  systemEarthing: 'TN-S' as const,
  devices,
  wires,
});

const dev = labDevice;
const wr = labWire;

// ── B1 · Ventilation fan with off-delay run-on ────────────────────────────────────────────────
const fanDevices: ElectricalDevice[] = [
  dev('mcb_1p', 60, 60, 'mcb', { name: 'MCB 10A Branch', state: { closed: true, tripped: false, ratedAmps: 10 } }),
  dev('neutral_busbar', 60, 220, 'nbar', { name: 'Neutral Busbar' }),
  dev('earth_busbar', 60, 400, 'pebar', { name: 'PE Busbar' }),
  dev('switch_1gang', 220, 60, 'sw', { name: 'Fan Call Switch', state: { closed: false } }),
  dev('timer_relay', 380, 60, 'kt1', { name: 'KT1 Run-On Timer (off-delay)', state: { tag: 'KT1', timerMode: 'off_delay', delaySec: 5 } }),
  dev('appliance_fan', 600, 60, 'fan', { name: 'Extractor Fan (65W)', state: { wattage: 65 } }),
];
const fanWires: ElectricalWire[] = [
  wr('mcb', 'out', 'sw', 'l_in', RED),
  wr('sw', 'sw_out', 'kt1', 'a1', ORANGE),
  wr('kt1', 'a2', 'nbar', 'n_1', BLUE),
  wr('mcb', 'out', 'kt1', 'com_15', RED),
  wr('kt1', 'no_18', 'fan', 'line', ORANGE),
  wr('fan', 'neutral', 'nbar', 'n_2', BLUE),
  wr('pebar', 'pe_1', 'fan', 'ground', GREEN),
];

// ── B1 · Flasher alarm lamp ───────────────────────────────────────────────────────────────────
const flashDevices: ElectricalDevice[] = [
  dev('mcb_1p', 60, 60, 'mcb', { name: 'MCB 6A Control', state: { closed: true, tripped: false, ratedAmps: 6 } }),
  dev('neutral_busbar', 60, 220, 'nbar', { name: 'Neutral Busbar' }),
  dev('switch_1gang', 220, 60, 'sw', { name: 'Alarm Enable Switch', state: { closed: false } }),
  dev('timer_relay', 380, 60, 'kt1', { name: 'KT1 Flasher', state: { tag: 'KT1', timerMode: 'flasher', delaySec: 2 } }),
  dev('pilot_light_indicator', 600, 60, 'pl', { name: 'Alarm Lamp (red)', state: { pilotColor: 'red' } }),
];
const flashWires: ElectricalWire[] = [
  wr('mcb', 'out', 'sw', 'l_in', RED),
  wr('sw', 'sw_out', 'kt1', 'a1', ORANGE),
  wr('kt1', 'a2', 'nbar', 'n_1', BLUE),
  wr('mcb', 'out', 'kt1', 'com_15', RED),
  wr('kt1', 'no_18', 'pl', 'x1', ORANGE),
  wr('pl', 'x2', 'nbar', 'n_2', BLUE),
];

// ── B2 · gG fuse: overload then short circuit ─────────────────────────────────────────────────
const gGDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 40, 'src', { name: 'Service Meter (source)' }),
  dev('rcd_2p', 220, 40, 'rcd', { name: 'RCD 30 mA' }),
  dev('fuse_holder_1p', 380, 60, 'f1', { name: 'F1 gG Fuse 6A (too small)', state: { fuseKind: 'gG', ratedAmps: 6 } }),
  dev('appliance_water_heater', 520, 60, 'wh', { name: 'Instant Water Heater (3.5 kW)', state: { wattage: 3500 } }),
  dev('switch_1gang', 380, 260, 'sw_short', { name: 'Short-Circuit Test Switch', state: { closed: false } }),
  dev('neutral_busbar', 660, 60, 'nbar', { name: 'Neutral Busbar' }),
  dev('earth_busbar', 740, 60, 'pebar', { name: 'PE Busbar', state: { isEarth: true } }),
];
const gGWires: ElectricalWire[] = [
  wr('src', 'l_out', 'rcd', 'in_l', RED, G12),
  wr('src', 'n_out', 'nbar', 'n_main', BLUE, G12),
  wr('nbar', 'n_1', 'rcd', 'in_n', BLUE, G12),
  wr('rcd', 'out_l', 'f1', 'in_l', RED, G12),
  wr('f1', 'out_l', 'wh', 'line', RED, G12),
  wr('f1', 'out_l', 'sw_short', 'l_in', RED, G12),
  wr('sw_short', 'sw_out', 'pebar', 'pe_2', GREEN, G12),
  wr('rcd', 'out_n', 'wh', 'neutral', BLUE, G12),
  wr('pebar', 'pe_1', 'wh', 'ground', GREEN, G12),
];

// ── B2 · One blown link on a DOL starter (single-phasing) ─────────────────────────────────────
// Same starter as the marine DOL lab, with Q1 replaced by a fuse switch disconnector whose L3 link has blown.
const singlePhaseDevices: ElectricalDevice[] = dolDevices.map((d) =>
  d.id === 'mdol_q1'
    ? dev('fuse_switch_disconnector_3p', d.x, d.y, 'mdol_q1', {
        name: 'Q1 Main Fuse Switch 3P (gG 16A)',
        state: { fuseKind: 'gG', ratedAmps: 16, blown_l3: true, heat_l3: 1 },
      })
    : d
);

// ── B3 · Two sockets on separate RCBOs ────────────────────────────────────────────────────────
const rcboDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 40, 'src', { name: 'Service Meter (source)' }),
  dev('rcbo_1pn', 250, 40, 'rcbo_a', { name: 'Q1 RCBO 16A (Kitchen)', state: { ratedAmps: 16, tripCurve: 'C', leakageMa: 30 } }),
  dev('rcbo_1pn', 400, 40, 'rcbo_b', { name: 'Q2 RCBO 16A (Living room)', state: { ratedAmps: 16, tripCurve: 'C', leakageMa: 30 } }),
  dev('socket_duplex', 250, 250, 'sock_a', { name: 'Kitchen Socket' }),
  dev('socket_duplex', 400, 250, 'sock_b', { name: 'Living Room Socket' }),
  dev('neutral_busbar', 560, 40, 'nbar', { name: 'Neutral Busbar' }),
  dev('earth_busbar', 640, 40, 'pebar', { name: 'PE Busbar', state: { isEarth: true } }),
];
const rcboWires: ElectricalWire[] = [
  wr('src', 'l_out', 'rcbo_a', 'in_l', RED, G12),
  wr('src', 'l_out', 'rcbo_b', 'in_l', RED, G12),
  wr('src', 'n_out', 'nbar', 'n_main', BLUE, G12),
  wr('nbar', 'n_1', 'rcbo_a', 'in_n', BLUE, G12),
  wr('nbar', 'n_2', 'rcbo_b', 'in_n', BLUE, G12),
  wr('rcbo_a', 'out_l', 'sock_a', 'line', RED, G12),
  wr('rcbo_a', 'out_n', 'sock_a', 'neutral', BLUE, G12),
  wr('rcbo_b', 'out_l', 'sock_b', 'line', RED, G12),
  wr('rcbo_b', 'out_n', 'sock_b', 'neutral', BLUE, G12),
  wr('pebar', 'pe_1', 'sock_a', 'ground', GREEN, G12),
  wr('pebar', 'pe_2', 'sock_b', 'ground', GREEN, G12),
];

// ── B4 · Standby generator and ATS ────────────────────────────────────────────────────────────
const standbyDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'util', { name: 'Utility Service Meter' }),
  dev('service_disconnect_2p', 250, 40, 'qmain', { name: 'Utility Main (open it for an outage)', state: { closed: true, tripped: false, ratedAmps: 20 } }),
  dev('industrial_relay_dpdt', 400, 40, 'rly', { name: 'K1 Loss-of-Mains Relay' }),
  dev('ats_changeover', 220, 260, 'ats', { name: 'Q2 Automatic Transfer Switch', state: { source: 'normal', autoMode: true, transferDelaySec: 3 } }),
  dev('generator_set_1p', 430, 250, 'gen', { name: 'G1 Standby Generator 5 kVA', state: { ratedKva: 5 } }),
  dev('light_bulb', 150, 470, 'lamp1', { name: 'Essential Lamp 1' }),
  dev('light_bulb', 300, 470, 'lamp2', { name: 'Essential Lamp 2' }),
];
const standbyWires: ElectricalWire[] = [
  wr('util', 'l_out', 'qmain', 'in_l', RED, G12),
  wr('util', 'n_out', 'qmain', 'in_n', BLUE, G12),
  wr('qmain', 'out_l', 'ats', 'norm_l', RED, G12),
  wr('qmain', 'out_n', 'ats', 'norm_n', BLUE, G12),
  wr('qmain', 'out_l', 'rly', 'a1', RED, G12),
  wr('qmain', 'out_n', 'rly', 'a2', BLUE, G12),
  wr('gen', 'l_out', 'ats', 'gen_l', RED, G12),
  wr('gen', 'n_out', 'ats', 'gen_n', BLUE, G12),
  wr('gen', 'start_a', 'rly', 'com_1', ORANGE, G12),
  wr('gen', 'start_b', 'rly', 'nc_1', ORANGE, G12),
  wr('ats', 'load_l', 'lamp1', 'hot', RED, G12),
  wr('ats', 'load_n', 'lamp1', 'neutral', BLUE, G12),
  wr('ats', 'load_l', 'lamp2', 'hot', RED, G12),
  wr('ats', 'load_n', 'lamp2', 'neutral', BLUE, G12),
];

export const PHASE1_LABS: LabLesson[] = [
  {
    id: 'lab-timer-offdelay-fan',
    title: 'Ventilation Fan with Off-Delay Run-On',
    subtitle: 'Timer Relay (KT1) in off-delay mode: the fan keeps running after the switch is turned off',
    category: 'industrial',
    badge: '⏱ Off-Delay Timer',
    difficulty: 'Intermediate',
    description:
      'A bathroom extractor fan is switched through a timer relay. The wall switch feeds only the timer coil (A1-A2); the fan runs from the timer contacts 15-18, which are fed from the permanent live. In off-delay mode the contacts close the moment the coil is energized and release delaySec seconds after the coil drops, giving a run-on period that clears the room of moist air.',
    objectives: [
      'Press ▶ Simulate and close the wall switch: 15-18 closes at once and the fan runs.',
      'Open the switch and watch KT1 count down: the fan keeps running until the delay expires, then 15-16 returns.',
      'Switch the fan on and off quickly: re-energizing the coil during the run-on restarts the full delay.',
      'Open KT1 in the Device Inspector, change the delay, and try the other timer functions to compare their behavior.',
    ],
    project: labProject(
      'proj_timer_offdelay_fan',
      'Fan Run-On with Off-Delay Timer Relay',
      'Switch -> timer coil; permanent live -> timer contacts -> fan.',
      fanDevices,
      fanWires
    ),
  },
  {
    id: 'lab-timer-flasher-alarm',
    title: 'Flasher Alarm Lamp',
    subtitle: 'Timer Relay (KT1) in flasher mode: contacts toggle every delay period',
    category: 'industrial',
    badge: '⏱ Flasher Timer',
    difficulty: 'Beginner',
    description:
      'An alarm lamp blinks through a timer relay set to flasher mode. While the enable switch keeps the coil energized, the 15-18 contacts toggle every delaySec seconds, so the lamp is dark for one period and lit for the next. Turning the switch off resets the timer.',
    objectives: [
      'Press ▶ Simulate and close the Alarm Enable Switch: the lamp starts blinking.',
      'Change the delay in the Device Inspector (1 s to 60 s) and watch the blink rate change.',
      'Open the switch mid-cycle and close it again: the timer restarts from the dark period.',
      'Compare with one-shot mode: the contacts pulse once for one delay period and then stay released.',
    ],
    project: labProject(
      'proj_timer_flasher_alarm',
      'Alarm Lamp Flasher',
      'Enable switch -> timer coil; timer contacts toggle the lamp.',
      flashDevices,
      flashWires
    ),
  },
  {
    id: 'lab-fuse-gg-overload-short',
    title: 'Branch Circuit Protected by a gG Fuse: Overload then Short Circuit',
    subtitle: 'Fuse holder (IEC 60269-1): thermal melt on overload, instant melt on a short circuit',
    category: 'residential',
    badge: '🔥 gG Fuse',
    difficulty: 'Intermediate',
    description:
      'A 3.5 kW water heater (about 15 A) is wired to a 6 A gG fuse. The fuse carries 2.5 times its rating, heats up along the gG time-current curve and blows after a few simulated minutes. Replace it with a 16 A link and the heater runs. A test switch bolts the fuse output to earth to show the instant short-circuit melt.',
    objectives: [
      'Press ▶ Simulate: the 6 A fuse heat bar fills (the model runs 20 times faster than real time) and the fuse blows. The heater goes dead and the indicator turns red.',
      'Stop the simulation, select F1 and use Replace fuse, then set the rating to 16 A in the Device Inspector.',
      'Run again: the heater draws about 15 A (0.95 times the rating) and the fuse never blows.',
      'Close the Short-Circuit Test Switch: the fuse blows instantly, with no heating delay.',
    ],
    project: labProject('proj_fuse_gg', 'gG Fuse: Overload then Short Circuit', 'Water heater on an undersized gG fuse.', gGDevices, gGWires),
  },
  {
    id: 'lab-fuse-single-phasing',
    title: 'Fuse Blown on One Phase of a DOL Starter (Single-Phasing)',
    subtitle: 'Fuse switch disconnector (IEC 60947-3): one link blown leaves the motor on two phases',
    category: 'industrial',
    badge: '⚡ Single-Phasing',
    difficulty: 'Advanced',
    description:
      'The marine DOL starter with its main breaker replaced by a 3-pole fuse switch disconnector. The L3 link has already blown. The control transformer is fed from L1 and L2, so the starter still pulls in, but the motor now runs on two phases only: it cannot start a rotating field, draws excess current and the overload relay is its only protection.',
    objectives: [
      'Press ▶ Simulate and START the motor: the contactor closes, but the motor shows a single-phasing fault instead of running.',
      'Select Q1 and look at the L3 link: it is blown (red window).',
      'Stop the simulation, use Replace fuse links on Q1 and start again: the motor now runs normally.',
      'Why is a single blown fuse more dangerous to a motor than a tripped 3-pole breaker, which opens all three phases together?',
    ],
    project: {
      ...labProject('proj_fuse_single_phasing', 'DOL Starter with One Blown Fuse Link', 'Fuse switch disconnector with a blown L3 link.', singlePhaseDevices, dolWires, 440),
      targetLadder: dolTarget,
    },
  },
  {
    id: 'lab-rcbo-separate-circuits',
    title: 'Two Sockets on Separate RCBOs: a Fault on One Does Not Drop the Other',
    subtitle: 'RCBO 1P+N (IEC 61009-1): breaker and 30 mA RCD in one device per circuit',
    category: 'sockets',
    badge: '🛡 RCBO',
    difficulty: 'Intermediate',
    description:
      'The kitchen and living-room sockets are each fed by their own RCBO. Each RCBO protects its circuit against overload, short circuit and earth leakage and switches both line and neutral. Inject an earth-leakage fault on the kitchen socket: only the kitchen RCBO trips and the living room keeps its power, unlike a single RCD upstream of everything.',
    objectives: [
      'Press ▶ Simulate: both sockets are live. Check that each RCBO shows 30 mA IΔn on its face.',
      'Select the Kitchen Socket and press Simulate earth leakage fault: Q1 trips (flag turns red) and the kitchen goes dead.',
      'Confirm the Living Room Socket is still energized: Q2 never saw the fault.',
      'Press the T button on Q2 to test its leakage trip, then reset the lever. Which wiring change would make a single RCD drop both rooms?',
    ],
    project: labProject('proj_rcbo_circuits', 'Two Socket Circuits on Separate RCBOs', 'One RCBO per socket circuit.', rcboDevices, rcboWires),
  },
  {
    id: 'lab-standby-generator-ats',
    title: 'Standby Generator and ATS: Simulate a Utility Outage',
    subtitle: 'Generating set (ISO 8528-1) started by a loss-of-mains relay, ATS transfer after a delay',
    category: 'residential',
    badge: '🔌 Standby Power',
    difficulty: 'Advanced',
    description:
      'Essential lamps are fed through an automatic transfer switch from the utility (normal) and a standby generator. A loss-of-mains relay watches the utility: when the Utility Main is opened its NC contact closes the generator remote-start input. The set takes 3 s to reach voltage, the ATS waits its 3 s transfer delay, and then moves the load to the generator. When the utility returns the load goes straight back and the generator stops.',
    objectives: [
      'Press ▶ Simulate: the lamps are lit from the grid (ATS on GRID) and the generator is in standby.',
      'Click the Utility Main to open it (outage). The lamps go dark, the relay drops out and the generator starts (watch START count to 3 s).',
      'About 3 s after the generator reaches voltage the ATS transfers (II · GEN lamp) and the lamps come back on generator power.',
      'Close the Utility Main: the load returns to the grid immediately and the generator stops. Raise the ATS transfer delay in the Device Inspector and repeat.',
    ],
    project: labProject('proj_standby_generator_ats', 'Standby Generator with ATS and Loss-of-Mains Relay', 'Utility outage simulation.', standbyDevices, standbyWires),
  },
];
