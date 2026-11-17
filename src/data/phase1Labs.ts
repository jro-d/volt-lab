import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { createDeviceFromCatalog } from './defaultComponents';
import type { LabLesson } from './labTemplates';

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
];
