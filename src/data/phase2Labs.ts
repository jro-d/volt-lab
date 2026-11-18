import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { LadderElement, LadderElementKind, LadderRung } from '../types/ladder';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, GREEN, ORANGE, G12, G14 } from './phase1Labs';

/**
 * Roadmap phase 2 labs: pumps with level and pressure switches, phase monitor relay, 24 V DC sensors,
 * annunciation, single-phase motors and dead-testing. Built from standard (brand-neutral) devices.
 */

const L1 = '#dc2626';
const L2 = '#eab308';
const L3 = '#2563eb';

let elSeq = 0;
export const ladderEl = (kind: LadderElementKind, tag: string, sub: string, deviceId: string, contactKey: string): LadderElement => ({
  id: `p2_${deviceId}_${contactKey}_${++elSeq}`,
  kind,
  tag,
  sub,
  deviceId,
  contactKey,
});
export const ladderSeries = (...els: LadderElement[]) => els.map((e, i) => ({ id: `blk_${e.id}_${i}`, branches: [[e]] }));
/** Parallel branches, each branch a series of elements */
export const ladderParallel = (...branches: LadderElement[][]) => ({ id: `blk_par_${branches[0][0].id}`, branches });

// ── 1 · Automatic pump control with HOA: float switch, overload, run lamp ─────────────────────
const pumpDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'src', { name: '440V 3Φ 60Hz Feeder' }),
  dev('mcb_3p', 68, 176, 'q1', { name: 'Q1 Main 3P MCB 16A', state: { ratedAmps: 16, tripCurve: 'D' } }),
  dev('contactor_3p', 60, 330, 'km1', { name: 'KM1 Pump Contactor', state: { tag: 'KM1' } }),
  dev('thermal_overload_relay', 60, 520, 'f2', { name: 'F2 Thermal Overload', state: { tag: 'F2', tripAmps: 4 } }),
  dev('pump_booster_3p', 56, 700, 'pump', { name: 'M1 Booster Pump 1.5 kW', state: { tag: 'M1', kw: 1.5, wattage: 1500 } }),
  dev('earth_busbar', 260, 680, 'pe', { name: 'PE Earth Bar' }),
  dev('mcb_2p', 330, 176, 'q2', { name: 'Q2 Control 2P MCB 6A', state: { ratedAmps: 6, tripCurve: 'C' } }),
  dev('control_transformer', 306, 330, 'tc1', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
  dev('selector_hoa', 500, 320, 'sa1', { name: 'SA1 HAND-OFF-AUTO', state: { tag: 'SA1', mode: 'auto' } }),
  dev('float_switch', 640, 320, 'fl1', { name: 'LS1 Tank Float Switch', state: { tag: 'LS1', contactForm: 'NC_on_rise', highTrip: 70, lowTrip: 30 } }),
  dev('pilot_light_indicator', 480, 520, 'pl_run', { name: 'PL_RUN Pump Running', state: { pilotColor: 'green', tag: 'PL_RUN' } }),
  dev('pilot_light_indicator', 570, 520, 'pl_flt', { name: 'PL_FAULT Overload Trip', state: { pilotColor: 'red', tag: 'PL_FAULT' } }),
];
const pumpWires: ElectricalWire[] = [
  // power circuit
  wr('src', 'l1', 'q1', 'in_l1', L1, G12), wr('src', 'l2', 'q1', 'in_l2', L2, G12), wr('src', 'l3', 'q1', 'in_l3', L3, G12),
  wr('q1', 'out_l1', 'km1', 'l1', L1, G12), wr('q1', 'out_l2', 'km1', 'l2', L2, G12), wr('q1', 'out_l3', 'km1', 'l3', L3, G12),
  wr('km1', 't1', 'f2', 'l1', L1, G12), wr('km1', 't2', 'f2', 'l2', L2, G12), wr('km1', 't3', 'f2', 'l3', L3, G12),
  wr('f2', 't1', 'pump', 'u1', L1, G12), wr('f2', 't2', 'pump', 'v1', L2, G12), wr('f2', 't3', 'pump', 'w1', L3, G12),
  wr('src', 'pe', 'pe', 'pe_main', GREEN, G12),
  wr('pe', 'pe_1', 'pump', 'pe', GREEN, G12),
  // control power
  wr('q1', 'out_l1', 'q2', 'in_1', L1, G12), wr('q1', 'out_l2', 'q2', 'in_2', L2, G12),
  wr('q2', 'out_1', 'tc1', 'h1', L1, G14), wr('q2', 'out_2', 'tc1', 'h2', L2, G14),
  // control rung: X1 -> OLR 95-96 -> HOA com; HAND -> A1; AUTO -> float switch -> A1
  wr('tc1', 'x1', 'f2', 'nc_95', ORANGE),
  wr('f2', 'nc_96', 'sa1', 'com', ORANGE),
  wr('sa1', 'hand', 'km1', 'a1', ORANGE),
  wr('sa1', 'auto', 'fl1', 'com', ORANGE),
  wr('fl1', 'no', 'km1', 'a1', ORANGE),
  wr('km1', 'a2', 'tc1', 'x2', BLUE),
  // lamps
  wr('km1', 'a1', 'pl_run', 'x1', ORANGE), wr('pl_run', 'x2', 'tc1', 'x2', BLUE),
  wr('tc1', 'x1', 'f2', 'no_97', ORANGE), wr('f2', 'no_98', 'pl_flt', 'x1', ORANGE), wr('pl_flt', 'x2', 'tc1', 'x2', BLUE),
];
const pumpRung = () => [
  ...ladderSeries(ladderEl('NC', 'OLR', '95-96', 'f2', 'trip_nc')),
  ladderParallel(
    [ladderEl('NO', 'SA1', 'HAND', 'sa1', 'hand')],
    [ladderEl('NO', 'SA1', 'AUTO', 'sa1', 'auto'), ladderEl('NO', 'LS1', 'NO', 'fl1', 'level_no')]
  ),
];
const pumpTarget: LadderRung[] = [
  { id: 'tgt_pump_1', blocks: pumpRung(), output: ladderEl('COIL', 'KM1', 'A1-A2', 'km1', 'coil') },
  { id: 'tgt_pump_2', blocks: pumpRung(), output: ladderEl('LAMP', 'PL_RUN', 'GREEN', 'pl_run', 'lamp') },
  { id: 'tgt_pump_3', blocks: ladderSeries(ladderEl('NO', 'OLR', '97-98', 'f2', 'alarm_no')), output: ladderEl('LAMP', 'PL_FAULT', 'RED', 'pl_flt', 'lamp') },
];

export const PHASE2_LABS: LabLesson[] = [
  {
    id: 'lab-pump-hoa-float',
    title: 'Automatic Pump Control with HOA: Float Switch, Overload, Run Lamp',
    subtitle: 'Float switch (NC on rise) + HAND-OFF-AUTO selector + contactor + overload relay',
    category: 'industrial',
    badge: '💧 Pump Control',
    difficulty: 'Advanced',
    description:
      'A booster pump fills a tank. In AUTO the float switch starts the pump when the level falls to its low trip (30 %) and stops it at the high trip (70 %); in between it holds its last state (hysteresis). HAND runs the pump regardless of level, OFF stops it. The thermal overload relay NC contact is in series with the whole control rung, and a red lamp shows an overload trip. The pump raises the tank level and the draw-off slider (in the float switch inspector) drains it, so the loop runs by itself.',
    objectives: [
      'Press ▶ Simulate: the tank starts at 20 %, below the low trip, so the float switch closes and the pump starts. Watch the tank level rise on the float switch.',
      'At 70 % the float switch opens and the pump stops. The level then falls with the draw-off until 30 % and the pump restarts: that gap is the hysteresis.',
      'Turn the HOA selector to HAND: the pump runs regardless of the float. Turn it to OFF to stop it. Return to AUTO.',
      'Select the pump and raise its power to 3.7 kW: the overload relay trips, the pump stops and PL_FAULT lights. Compare your wiring with the Lab Target ladder.',
    ],
    project: {
      ...labProject('proj_pump_hoa_float', 'Automatic Pump Control (HOA + Float Switch)', 'Float switch in AUTO, HAND override, overload relay and lamps.', pumpDevices, pumpWires, 440),
      process: { tankLevel: 20, lineBar: 0, drawOffLpm: 15 },
      targetLadder: pumpTarget,
    },
  },
];
