import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, ORANGE } from './phase1Labs';

/**
 * Batch 3.3 labs: control and timing modules on a 230 V single-phase supply. Control wiring only: the
 * loads are pilot lamps and a contactor coil so every state can be watched.
 */

const RED = '#dc2626';
const lampDev = (id: string, name: string, color: string, x: number, y: number) =>
  dev('pilot_light_indicator', x, y, id, { name, state: { pilotColor: color, tag: id.toUpperCase() } });
const live = (to: string, toT: string) => wr('grid', 'l_out', to, toT, RED);
const neut = (to: string, toT: string) => wr('grid', 'n_out', to, toT, BLUE);

// ── A · Star-delta transition timer ───────────────────────────────────────────────────────────
const sdDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Control Supply 230 V' }),
  dev('operator_pilot', 40, 230, 'start', { name: 'S1 Start (2-position selector)', state: { operatorKind: 'selector_2pos', tag: 'S1' } }),
  dev('star_delta_timer', 240, 220, 'kt', { name: 'KT2 Star-Delta Timer', state: { starSec: 5, pauseMs: 100 } }),
  lampDev('pl_star', 'PL_STAR  star contactor KMY', 'amber', 200, 450),
  lampDev('pl_delta', 'PL_DELTA  delta contactor KMD', 'green', 340, 450),
];
const sdWires: ElectricalWire[] = [
  live('start', 'no_13'), wr('start', 'no_14', 'kt', 'a1', ORANGE), neut('kt', 'a2'),
  live('kt', 'y_13'), wr('kt', 'y_14', 'pl_star', 'x1', ORANGE), neut('pl_star', 'x2'),
  live('kt', 'd_23'), wr('kt', 'd_24', 'pl_delta', 'x1', ORANGE), neut('pl_delta', 'x2'),
];

// ── B · Staircase timer and multi-point lighting ─────────────────────────────────────────────
const stairDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Supply 230 V' }),
  dev('operator_pilot', 40, 220, 'pb1', { name: 'Landing 1 push button', state: { operatorKind: 'illuminated_pb', tag: 'S1' } }),
  dev('operator_pilot', 200, 220, 'pb2', { name: 'Landing 2 push button', state: { operatorKind: 'illuminated_pb', tag: 'S2' } }),
  dev('staircase_timer', 120, 400, 'ks', { name: 'KS1 Staircase Timer', state: { timeSec: 20 } }),
  dev('light_bulb', 140, 600, 'stair_light', { name: 'Staircase Light' }),
  dev('operator_pilot', 420, 220, 'pb3', { name: 'Hall push button A', state: { operatorKind: 'illuminated_pb', tag: 'S3' } }),
  dev('operator_pilot', 580, 220, 'pb4', { name: 'Hall push button B', state: { operatorKind: 'illuminated_pb', tag: 'S4' } }),
  dev('impulse_relay', 500, 400, 'ki', { name: 'KI1 Impulse Relay' }),
  dev('light_bulb', 520, 600, 'hall_light', { name: 'Hall Light' }),
];
const stairWires: ElectricalWire[] = [
  live('ks', 'l'), neut('ks', 'n'),
  live('pb1', 'no_13'), wr('pb1', 'no_14', 'ks', 'pb', ORANGE),
  live('pb2', 'no_13'), wr('pb2', 'no_14', 'ks', 'pb', ORANGE),
  wr('ks', 'out', 'stair_light', 'hot', ORANGE), neut('stair_light', 'neutral'),
  live('pb3', 'no_13'), wr('pb3', 'no_14', 'ki', 'a1', ORANGE),
  live('pb4', 'no_13'), wr('pb4', 'no_14', 'ki', 'a1', ORANGE), neut('ki', 'a2'),
  live('ki', 'no_13'), wr('ki', 'no_14', 'hall_light', 'hot', ORANGE), neut('hall_light', 'neutral'),
];

// ── C · Dual-channel safety circuit ──────────────────────────────────────────────────────────
const safetyDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Supply 230 V' }),
  dev('safety_relay', 200, 200, 'sr', { name: 'KS3 Safety Relay', state: { startMode: 'manual' } }),
  dev('push_button_estop', 40, 230, 'estop', { name: 'S0 Emergency Stop' }),
  dev('door_interlock_switch', 40, 430, 'door', { name: 'SQ2 Guard Door Interlock' }),
  dev('operator_pilot', 420, 230, 'start', { name: 'S1 Start (illuminated)', state: { operatorKind: 'illuminated_pb', tag: 'S1' } }),
  dev('contactor_3p', 260, 480, 'km1', { name: 'KM1 Machine Contactor', state: { tag: 'KM1' } }),
  lampDev('pl_safe', 'PL_SAFE  safety outputs closed', 'green', 470, 480),
  lampDev('pl_stop', 'PL_STOP  safety outputs open', 'red', 560, 480),
];
const safetyWires: ElectricalWire[] = [
  live('sr', 'a1'), neut('sr', 'a2'),
  // channel 1: E-stop and door contact 1; channel 2: door contact 2
  wr('sr', 's11', 'estop', 'nc_11', ORANGE), wr('estop', 'nc_12', 'door', 'nc_11', ORANGE), wr('door', 'nc_12', 'sr', 's12', ORANGE),
  wr('sr', 's21', 'door', 'nc_21', ORANGE), wr('door', 'nc_22', 'sr', 's22', ORANGE),
  // monitored start
  wr('sr', 'x1', 'start', 'no_13', ORANGE), wr('start', 'no_14', 'sr', 'x2', ORANGE),
  // safety outputs drive KM1; 31-32 feeds the "stopped" lamp
  live('sr', 'no_13'), wr('sr', 'no_14', 'km1', 'a1', ORANGE), neut('km1', 'a2'),
  wr('km1', 'a1', 'pl_safe', 'x1', ORANGE), neut('pl_safe', 'x2'),
  live('sr', 'nc_31'), wr('sr', 'nc_32', 'pl_stop', 'x1', ORANGE), neut('pl_stop', 'x2'),
];

// ── D · Counter, alternating pumps and time switch ───────────────────────────────────────────
const cntDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Supply 230 V' }),
  dev('operator_pilot', 40, 220, 'cnt_pb', { name: 'S1 Part sensor (push button)', state: { operatorKind: 'illuminated_pb', tag: 'S1' } }),
  dev('operator_pilot', 200, 220, 'rst_pb', { name: 'S2 Batch reset', state: { operatorKind: 'illuminated_pb', tag: 'S2' } }),
  dev('counter_relay', 120, 400, 'kc', { name: 'KC1 Counter Relay', state: { preset: 5 } }),
  lampDev('pl_batch', 'PL_BATCH  batch complete', 'green', 150, 600),
  dev('operator_pilot', 420, 220, 'level', { name: 'S3 Level switch (2-position)', state: { operatorKind: 'selector_2pos', tag: 'S3' } }),
  dev('alternating_relay', 420, 400, 'ka', { name: 'KA2 Alternating Relay' }),
  lampDev('pl_p1', 'PL_P1  pump 1 running', 'green', 400, 600),
  lampDev('pl_p2', 'PL_P2  pump 2 running', 'amber', 500, 600),
  dev('time_switch_24h', 700, 220, 'ts', { name: 'KT3 Time Switch', state: { clockMin: 1030, onMin: 1080, offMin: 1320, speed: 600 } }),
  dev('light_bulb', 720, 420, 'yard', { name: 'Yard Light' }),
];
const cntWires: ElectricalWire[] = [
  live('cnt_pb', 'no_13'), wr('cnt_pb', 'no_14', 'kc', 'c1', ORANGE), neut('kc', 'c2'),
  live('rst_pb', 'no_13'), wr('rst_pb', 'no_14', 'kc', 'r1', ORANGE), neut('kc', 'r2'),
  live('kc', 'com_11'), wr('kc', 'no_14', 'pl_batch', 'x1', ORANGE), neut('pl_batch', 'x2'),
  live('level', 'no_13'), wr('level', 'no_14', 'ka', 'a1', ORANGE), neut('ka', 'a2'),
  live('ka', 'no_13'), wr('ka', 'no_14', 'pl_p1', 'x1', ORANGE), neut('pl_p1', 'x2'),
  live('ka', 'no_23'), wr('ka', 'no_24', 'pl_p2', 'x1', ORANGE), neut('pl_p2', 'x2'),
  live('ts', 'l'), neut('ts', 'n'), live('ts', 'com'), wr('ts', 'no', 'yard', 'hot', ORANGE), neut('yard', 'neutral'),
];

export const BATCH33_LABS: LabLesson[] = [
  {
    id: 'lab-ctl-star-delta-timer',
    title: 'Star-Delta Transition Timer: Star, Pause, Delta',
    subtitle: 'A dedicated star-delta timer drives the star and delta contactors with a break between them',
    category: 'industrial',
    badge: '⏱ Y-Δ Timer',
    difficulty: 'Intermediate',
    description:
      'The star-delta timer replaces a general timer and an interlock: when its coil is energized the star contact closes for the star time, both contacts open for a short pause, then the delta contact closes. The lamps stand in for the star and delta contactor coils.',
    objectives: [
      'Press ▶ Simulate and turn the START selector on S1: the star lamp lights.',
      'Watch the timer face: after the star time (5 s) both lamps go dark for one step (the transition pause), then the delta lamp lights and stays on.',
      'Turn the selector off and on again: the sequence restarts from star.',
      'Raise the star time in the inspector. Why must the star and delta contacts never be closed together?',
    ],
    project: labProject('proj_ctl_star_delta_timer', 'Star-Delta Transition Timer', 'Timer module sequencing the star and delta contactors.', sdDevices, sdWires),
  },
  {
    id: 'lab-ctl-staircase-impulse',
    title: 'Staircase Timer and Impulse Relay Lighting',
    subtitle: 'Re-triggerable staircase timer and multi-point control of a hall light',
    category: 'residential',
    badge: '💡 Stair + Impulse',
    difficulty: 'Beginner',
    description:
      'Two push buttons feed the PB input of a staircase timer: each push starts (or restarts) the 20 s run time of the staircase light. In the hall, any number of push buttons pulse an impulse relay whose contact latches the hall light on and off.',
    objectives: [
      'Press ▶ Simulate, then hold PB 1 for a moment: the staircase light comes on and counts down.',
      'Press PB 2 while it is running: the time restarts. Let it expire and the light goes out.',
      'Press Hall push button A, release: the hall light stays on. Press Hall push button B: it goes off.',
      'How many push buttons could you add in parallel to either circuit?',
    ],
    project: labProject('proj_ctl_staircase_impulse', 'Staircase Timer and Impulse Relay', 'Staircase timer and impulse relay lighting.', stairDevices, stairWires),
  },
  {
    id: 'lab-ctl-safety-chain',
    title: 'Dual-Channel Safety Circuit: E-Stop, Guard Door and Safety Relay',
    subtitle: 'Monitored start, two channels, discrepancy fault and a machine contactor',
    category: 'industrial',
    badge: '🛡 Safety',
    difficulty: 'Advanced',
    description:
      'A safety relay watches two channels: channel 1 runs through the emergency stop and one door contact, channel 2 through the second door contact. The machine contactor is only released when both channels are made and the monitored START has been pressed after them.',
    objectives: [
      'Press ▶ Simulate: both channel LEDs on the safety relay light, but the contactor stays off (PL_STOP lit) until you press START (S1).',
      'Press START: KM1 pulls in and PL_SAFE lights. Release it: the machine keeps running.',
      'Open the guard door: both channels open together, the outputs drop and PL_STOP lights. Close the door: it does not restart by itself.',
      'Disconnect one door wire to simulate a broken channel: the relay shows a FAULT because only one channel opens and closes. Why is a single channel not enough?',
    ],
    project: labProject('proj_ctl_safety_chain', 'Dual-Channel Safety Circuit', 'E-stop, door interlock, safety relay and machine contactor.', safetyDevices, safetyWires),
  },
  {
    id: 'lab-ctl-counter-alternating',
    title: 'Part Counter, Duplex Pump Alternation and a 24-Hour Time Switch',
    subtitle: 'Counter relay with batch reset, alternating relay for two pumps, schedule-driven yard light',
    category: 'automation',
    badge: '🔢 Counters',
    difficulty: 'Intermediate',
    description:
      'Three small control jobs on one board. The counter relay counts the parts pulses and signals a complete batch at the preset; the alternating relay swaps the lead pump every time the level switch calls; the time switch runs the yard light from 18:00 to 22:00 on a fast simulated clock.',
    objectives: [
      'Press the part sensor S1 five times: the batch lamp lights at the fifth pulse and stays on until you press S2.',
      'Turn the level switch on and off a few times: the running pump alternates between P1 and P2.',
      'Watch the time switch clock run (x600): the yard light comes on at 18:00 and goes off at 22:00.',
      'Why does a pulse that is shorter than one simulation step (0.5 s) risk being missed by the counter?',
    ],
    project: labProject('proj_ctl_counter_alternating', 'Counter, Alternating Relay and Time Switch', 'Counter relay, alternating relay and time switch.', cntDevices, cntWires),
  },
];
