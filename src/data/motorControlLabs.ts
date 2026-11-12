import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { LadderElement, LadderElementKind, LadderRung } from '../types/ladder';
import { createDeviceFromCatalog } from './defaultComponents';
import type { LabLesson } from './labTemplates';

/**
 * Phase 3 — Marine & Industrial Motor Control labs (440V 3-phase power / 220V control).
 */

const L1 = '#dc2626'; // red
const L2 = '#eab308'; // yellow
const L3 = '#2563eb'; // blue
const PE = '#16a34a';
const CTRL = '#7c3aed'; // control wiring (violet)
const RET = '#0f172a'; // control return (X2)
const PWR_GAUGE = '12 AWG (3.5 mm²)';
const CTRL_GAUGE = '14 AWG (2.0 mm²)';

let wireSeq = 0;
const w = (
  id: string,
  fromDeviceId: string,
  fromTerminalId: string,
  toDeviceId: string,
  toTerminalId: string,
  color: string,
  opts: Partial<ElectricalWire> = {}
): ElectricalWire => ({
  id: `${id}_${++wireSeq}`,
  fromDeviceId,
  fromTerminalId,
  toDeviceId,
  toTerminalId,
  color,
  wireGauge: opts.wireGauge || (color === CTRL || color === RET ? CTRL_GAUGE : PWR_GAUGE),
  lengthMeters: opts.lengthMeters ?? 1.2,
  conductorRole:
    opts.conductorRole ||
    (color === PE ? 'earth_ground' : color === RET ? 'return_neutral' : color === CTRL ? 'switched_live' : 'feed_live'),
});

let elSeq = 0;
const el = (kind: LadderElementKind, tag: string, sub: string, deviceId: string, contactKey: string): LadderElement => ({
  id: `tgt_${deviceId}_${contactKey}_${++elSeq}`,
  kind,
  tag,
  sub,
  deviceId,
  contactKey,
});
const series = (...els: LadderElement[]) => els.map((e, i) => ({ id: `blk_${e.id}_${i}`, branches: [[e]] }));
const parallel = (...branches: LadderElement[]) => ({ id: `blk_par_${branches[0].id}`, branches: branches.map(b => [b]) });

const dev = (type: Parameters<typeof createDeviceFromCatalog>[0], x: number, y: number, id: string, over: Partial<ElectricalDevice> & { state?: Record<string, any> } = {}) => {
  const base = createDeviceFromCatalog(type, x, y, id);
  return { ...base, ...over, state: { ...base.state, ...(over.state || {}) } } as ElectricalDevice;
};

// ────────────────────────────────────────────────────────────────────────────────────────────
// LAB A — DOL starter with 440/220V control transformer and thermal overload relay
// ────────────────────────────────────────────────────────────────────────────────────────────
const dolDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'mdol_src', { name: '440V 3Φ 60Hz Ship Feeder' }),
  dev('mcb_3p', 68, 176, 'mdol_q1', { name: 'Q1 Main 3P MCB 16A', state: { ratedAmps: 16, tripCurve: 'D' } }),
  dev('contactor_3p', 60, 330, 'mdol_km1', { name: 'KM1 Line Contactor (3RT)', state: { tag: 'KM1' } }),
  dev('thermal_overload_relay', 60, 520, 'mdol_f2', { name: 'F2 Thermal Overload (3RU)', state: { tag: 'F2', tripAmps: 6 } }),
  dev('motor_ac_industrial', 56, 700, 'mdol_m1', { name: 'M1 3Φ Motor 3HP 440V', state: { tag: 'M1', wattage: 2200, motorHp: 3 } }),
  dev('earth_busbar', 250, 680, 'mdol_pe', { name: 'PE Earth Bar' }),
  dev('mcb_2p', 330, 176, 'mdol_q2', { name: 'Q2 Control 2P MCB 6A', state: { ratedAmps: 6, tripCurve: 'C' } }),
  dev('control_transformer', 306, 330, 'mdol_tc1', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
  dev('push_button_station', 500, 320, 'mdol_s1', { name: 'S1 Start / Stop Station', state: { tag: 'S1' } }),
  dev('pilot_light_indicator', 480, 520, 'mdol_pl_run', { name: 'PL_RUN Motor Running', state: { pilotColor: 'green', tag: 'PL_RUN' } }),
  dev('pilot_light_indicator', 570, 520, 'mdol_pl_flt', { name: 'PL_FAULT Overload Trip', state: { pilotColor: 'red', tag: 'PL_FAULT' } }),
];

const dolWires: ElectricalWire[] = [
  // ── Power circuit: Feeder → Q1 → KM1 → F2 → M1
  w('dp', 'mdol_src', 'l1', 'mdol_q1', 'in_l1', L1),
  w('dp', 'mdol_src', 'l2', 'mdol_q1', 'in_l2', L2),
  w('dp', 'mdol_src', 'l3', 'mdol_q1', 'in_l3', L3),
  w('dp', 'mdol_q1', 'out_l1', 'mdol_km1', 'l1', L1),
  w('dp', 'mdol_q1', 'out_l2', 'mdol_km1', 'l2', L2),
  w('dp', 'mdol_q1', 'out_l3', 'mdol_km1', 'l3', L3),
  w('dp', 'mdol_km1', 't1', 'mdol_f2', 'l1', L1, { lengthMeters: 0.2 }),
  w('dp', 'mdol_km1', 't2', 'mdol_f2', 'l2', L2, { lengthMeters: 0.2 }),
  w('dp', 'mdol_km1', 't3', 'mdol_f2', 'l3', L3, { lengthMeters: 0.2 }),
  w('dp', 'mdol_f2', 't1', 'mdol_m1', 'u1', L1, { lengthMeters: 8 }),
  w('dp', 'mdol_f2', 't2', 'mdol_m1', 'v1', L2, { lengthMeters: 8 }),
  w('dp', 'mdol_f2', 't3', 'mdol_m1', 'w1', L3, { lengthMeters: 8 }),
  w('dpe', 'mdol_src', 'pe', 'mdol_pe', 'pe_main', PE),
  w('dpe', 'mdol_pe', 'pe_1', 'mdol_m1', 'pe', PE, { lengthMeters: 8 }),
  // ── Control power: Q1 load side L1-L2 → Q2 → TC1 primary H1-H2 (440V)
  w('dc', 'mdol_q1', 'out_l1', 'mdol_q2', 'in_1', L1),
  w('dc', 'mdol_q1', 'out_l2', 'mdol_q2', 'in_2', L2),
  w('dc', 'mdol_q2', 'out_1', 'mdol_tc1', 'h1', L1, { wireGauge: CTRL_GAUGE }),
  w('dc', 'mdol_q2', 'out_2', 'mdol_tc1', 'h2', L2, { wireGauge: CTRL_GAUGE }),
  // ── 220V control rung: X1 → 95-96 → STOP 1-2 → START 3-4 ∥ KM1 13-14 → A1, A2 → X2
  w('dk', 'mdol_tc1', 'x1', 'mdol_f2', 'nc_95', CTRL),
  w('dk', 'mdol_f2', 'nc_96', 'mdol_s1', 'stop_1', CTRL),
  w('dk', 'mdol_s1', 'stop_2', 'mdol_s1', 'start_3', CTRL, { lengthMeters: 0.2 }),
  w('dk', 'mdol_s1', 'stop_2', 'mdol_km1', 'no_13', CTRL),
  w('dk', 'mdol_s1', 'start_4', 'mdol_km1', 'a1', CTRL),
  w('dk', 'mdol_km1', 'no_14', 'mdol_km1', 'a1', CTRL, { lengthMeters: 0.2 }),
  w('dk', 'mdol_km1', 'a2', 'mdol_tc1', 'x2', RET),
  // ── Pilot lamps: RUN in parallel with the coil, FAULT via TOR 97-98
  w('dl', 'mdol_km1', 'a1', 'mdol_pl_run', 'x1', CTRL),
  w('dl', 'mdol_pl_run', 'x2', 'mdol_tc1', 'x2', RET),
  w('dl', 'mdol_tc1', 'x1', 'mdol_f2', 'no_97', CTRL),
  w('dl', 'mdol_f2', 'no_98', 'mdol_pl_flt', 'x1', CTRL),
  w('dl', 'mdol_pl_flt', 'x2', 'mdol_tc1', 'x2', RET),
];

const dolStartRung = () => [
  ...series(el('NC', 'OLR', '95-96', 'mdol_f2', 'trip_nc'), el('NC', 'STOP', '1-2', 'mdol_s1', 'stop')),
  parallel(el('NO', 'START', '3-4', 'mdol_s1', 'start'), el('NO', 'KM1', '13-14', 'mdol_km1', 'aux_no')),
];
const dolTarget: LadderRung[] = [
  { id: 'tgt_dol_1', blocks: dolStartRung(), output: el('COIL', 'KM1', 'A1-A2', 'mdol_km1', 'coil') },
  { id: 'tgt_dol_2', blocks: dolStartRung(), output: el('LAMP', 'PL_RUN', 'GREEN', 'mdol_pl_run', 'lamp') },
  {
    id: 'tgt_dol_3',
    blocks: series(el('NO', 'OLR', '97-98', 'mdol_f2', 'alarm_no')),
    output: el('LAMP', 'PL_FAULT', 'RED', 'mdol_pl_flt', 'lamp'),
  },
];

// ────────────────────────────────────────────────────────────────────────────────────────────
// LAB B — Forward / Reverse starter with 21-22 electrical interlocking
// ────────────────────────────────────────────────────────────────────────────────────────────
const frDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'mfr_src', { name: '440V 3Φ 60Hz Feeder' }),
  dev('mcb_3p', 120, 176, 'mfr_q1', { name: 'Q1 Main 3P MCB 16A', state: { ratedAmps: 16, tripCurve: 'D' } }),
  dev('contactor_3p', 30, 330, 'mfr_km1', { name: 'KM1 Forward Contactor', state: { tag: 'KM1', role: 'FOR' } }),
  dev('contactor_3p', 196, 330, 'mfr_km2', { name: 'KM2 Reverse Contactor', state: { tag: 'KM2', role: 'REV' } }),
  dev('thermal_overload_relay', 112, 548, 'mfr_f2', { name: 'F2 Thermal Overload (LRD)', state: { tag: 'F2', tripAmps: 6 } }),
  dev('motor_ac_industrial', 108, 730, 'mfr_m1', { name: 'M1 3Φ Motor 3HP 440V', state: { tag: 'M1', wattage: 2200, motorHp: 3 } }),
  dev('earth_busbar', 300, 700, 'mfr_pe', { name: 'PE Earth Bar' }),
  dev('mcb_2p', 400, 176, 'mfr_q2', { name: 'Q2 Control 2P MCB 6A', state: { ratedAmps: 6, tripCurve: 'C' } }),
  dev('control_transformer', 380, 330, 'mfr_tc1', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
  dev('push_button_fwd_rev', 560, 330, 'mfr_s1', { name: 'S1 Forward / Reverse / Stop', state: { tag: 'S1' } }),
  dev('pilot_light_indicator', 540, 540, 'mfr_pl_fwd', { name: 'PL_FWD Forward Running', state: { pilotColor: 'green', tag: 'PL_FWD' } }),
  dev('pilot_light_indicator', 620, 540, 'mfr_pl_rev', { name: 'PL_REV Reverse Running', state: { pilotColor: 'amber', tag: 'PL_REV' } }),
  dev('pilot_light_indicator', 700, 540, 'mfr_pl_flt', { name: 'PL_FAULT Overload Trip', state: { pilotColor: 'red', tag: 'PL_FAULT' } }),
];

const frWires: ElectricalWire[] = [
  // ── Feeder → Q1
  w('fp', 'mfr_src', 'l1', 'mfr_q1', 'in_l1', L1),
  w('fp', 'mfr_src', 'l2', 'mfr_q1', 'in_l2', L2),
  w('fp', 'mfr_src', 'l3', 'mfr_q1', 'in_l3', L3),
  // ── Q1 feeds both contactor line sides
  w('fp', 'mfr_q1', 'out_l1', 'mfr_km1', 'l1', L1),
  w('fp', 'mfr_q1', 'out_l2', 'mfr_km1', 'l2', L2),
  w('fp', 'mfr_q1', 'out_l3', 'mfr_km1', 'l3', L3),
  w('fp', 'mfr_q1', 'out_l1', 'mfr_km2', 'l1', L1),
  w('fp', 'mfr_q1', 'out_l2', 'mfr_km2', 'l2', L2),
  w('fp', 'mfr_q1', 'out_l3', 'mfr_km2', 'l3', L3),
  // ── KM1 (FOR) straight through: T1→1/L1, T2→3/L2, T3→5/L3 of the overload relay
  w('fp', 'mfr_km1', 't1', 'mfr_f2', 'l1', L1, { lengthMeters: 0.4 }),
  w('fp', 'mfr_km1', 't2', 'mfr_f2', 'l2', L2, { lengthMeters: 0.4 }),
  w('fp', 'mfr_km1', 't3', 'mfr_f2', 'l3', L3, { lengthMeters: 0.4 }),
  // ── KM2 (REV) phase reversal: T1 and T3 swapped
  w('fp', 'mfr_km2', 't1', 'mfr_f2', 'l3', L1, { lengthMeters: 0.4 }),
  w('fp', 'mfr_km2', 't2', 'mfr_f2', 'l2', L2, { lengthMeters: 0.4 }),
  w('fp', 'mfr_km2', 't3', 'mfr_f2', 'l1', L3, { lengthMeters: 0.4 }),
  // ── F2 → Motor
  w('fp', 'mfr_f2', 't1', 'mfr_m1', 'u1', L1, { lengthMeters: 8 }),
  w('fp', 'mfr_f2', 't2', 'mfr_m1', 'v1', L2, { lengthMeters: 8 }),
  w('fp', 'mfr_f2', 't3', 'mfr_m1', 'w1', L3, { lengthMeters: 8 }),
  w('fpe', 'mfr_src', 'pe', 'mfr_pe', 'pe_main', PE),
  w('fpe', 'mfr_pe', 'pe_1', 'mfr_m1', 'pe', PE, { lengthMeters: 8 }),
  // ── Control power
  w('fc', 'mfr_q1', 'out_l1', 'mfr_q2', 'in_1', L1),
  w('fc', 'mfr_q1', 'out_l2', 'mfr_q2', 'in_2', L2),
  w('fc', 'mfr_q2', 'out_1', 'mfr_tc1', 'h1', L1, { wireGauge: CTRL_GAUGE }),
  w('fc', 'mfr_q2', 'out_2', 'mfr_tc1', 'h2', L2, { wireGauge: CTRL_GAUGE }),
  // ── Common: X1 → OLR 95-96 → STOP 1-2 → (FWD, REV, both seal-ins)
  w('fk', 'mfr_tc1', 'x1', 'mfr_f2', 'nc_95', CTRL),
  w('fk', 'mfr_f2', 'nc_96', 'mfr_s1', 'stop_1', CTRL),
  w('fk', 'mfr_s1', 'stop_2', 'mfr_s1', 'fwd_3', CTRL, { lengthMeters: 0.2 }),
  w('fk', 'mfr_s1', 'stop_2', 'mfr_s1', 'rev_5', CTRL, { lengthMeters: 0.2 }),
  w('fk', 'mfr_s1', 'stop_2', 'mfr_km1', 'no_13', CTRL),
  w('fk', 'mfr_s1', 'stop_2', 'mfr_km2', 'no_13', CTRL),
  // ── Forward rung: FWD 3-4 ∥ KM1 13-14 → KM2 21-22 (interlock) → KM1 A1
  w('fk', 'mfr_s1', 'fwd_4', 'mfr_km2', 'nc_21', CTRL),
  w('fk', 'mfr_km1', 'no_14', 'mfr_km2', 'nc_21', CTRL),
  w('fk', 'mfr_km2', 'nc_22', 'mfr_km1', 'a1', CTRL),
  w('fk', 'mfr_km1', 'a2', 'mfr_tc1', 'x2', RET),
  // ── Reverse rung: REV 5-6 ∥ KM2 13-14 → KM1 21-22 (interlock) → KM2 A1
  w('fk', 'mfr_s1', 'rev_6', 'mfr_km1', 'nc_21', CTRL),
  w('fk', 'mfr_km2', 'no_14', 'mfr_km1', 'nc_21', CTRL),
  w('fk', 'mfr_km1', 'nc_22', 'mfr_km2', 'a1', CTRL),
  w('fk', 'mfr_km2', 'a2', 'mfr_tc1', 'x2', RET),
  // ── Pilot lamps
  w('fl', 'mfr_km1', 'a1', 'mfr_pl_fwd', 'x1', CTRL),
  w('fl', 'mfr_pl_fwd', 'x2', 'mfr_tc1', 'x2', RET),
  w('fl', 'mfr_km2', 'a1', 'mfr_pl_rev', 'x1', CTRL),
  w('fl', 'mfr_pl_rev', 'x2', 'mfr_tc1', 'x2', RET),
  w('fl', 'mfr_tc1', 'x1', 'mfr_f2', 'no_97', CTRL),
  w('fl', 'mfr_f2', 'no_98', 'mfr_pl_flt', 'x1', CTRL),
  w('fl', 'mfr_pl_flt', 'x2', 'mfr_tc1', 'x2', RET),
];

const frFwd = () => [
  ...series(el('NC', 'OLR', '95-96', 'mfr_f2', 'trip_nc'), el('NC', 'STOP', '1-2', 'mfr_s1', 'stop')),
  parallel(el('NO', 'FWD', '3-4', 'mfr_s1', 'fwd'), el('NO', 'FOR', '13-14', 'mfr_km1', 'aux_no')),
  ...series(el('NC', 'REV', '21-22', 'mfr_km2', 'aux_nc')),
];
const frRev = () => [
  ...series(el('NC', 'OLR', '95-96', 'mfr_f2', 'trip_nc'), el('NC', 'STOP', '1-2', 'mfr_s1', 'stop')),
  parallel(el('NO', 'REV', '5-6', 'mfr_s1', 'rev'), el('NO', 'REV', '13-14', 'mfr_km2', 'aux_no')),
  ...series(el('NC', 'FOR', '21-22', 'mfr_km1', 'aux_nc')),
];
const frTarget: LadderRung[] = [
  { id: 'tgt_fr_1', blocks: frFwd(), output: el('COIL', 'KM1/FOR', 'A1-A2', 'mfr_km1', 'coil') },
  { id: 'tgt_fr_2', blocks: frRev(), output: el('COIL', 'KM2/REV', 'A1-A2', 'mfr_km2', 'coil') },
  { id: 'tgt_fr_3', blocks: frFwd(), output: el('LAMP', 'PL_FWD', 'GREEN', 'mfr_pl_fwd', 'lamp') },
  { id: 'tgt_fr_4', blocks: frRev(), output: el('LAMP', 'PL_REV', 'AMBER', 'mfr_pl_rev', 'lamp') },
  {
    id: 'tgt_fr_5',
    blocks: series(el('NO', 'OLR', '97-98', 'mfr_f2', 'alarm_no')),
    output: el('LAMP', 'PL_FAULT', 'RED', 'mfr_pl_flt', 'lamp'),
  },
];

export const MOTOR_CONTROL_LABS: LabLesson[] = [
  {
    id: 'lab-marine-dol-440v',
    title: '⚓ Marine / Industrial DOL Motor Starter (440V/220V Control Transformer + Thermal Overload Relay)',
    subtitle: 'Practice sheet — DOL motor starter: 440V 3P Feeder → 3P MCB → Contactor 3RT → Thermal Overload 3RU → 3Φ Motor',
    category: 'industrial',
    badge: '⚓ Marine 440V',
    difficulty: 'Intermediate',
    description:
      'A shipboard-style Direct-On-Line starter. The 440V 60Hz 3-phase feeder supplies the motor through the main 3P MCB, the line contactor KM1 and the thermal overload relay F2. A 2P control MCB feeds the primary H1-H2 of a 440/220V control transformer; its secondary X1 powers the 220V control rung: OLR 95-96 → STOP 1-2 → START 3-4 with the KM1 13-14 seal-in in parallel → coil A1-A2 → X2.',
    objectives: [
      'Press ▶ Simulate: the transformer secondary goes live (TC1 shows SEC 220V ●) and the phase lamps on the feeder light up.',
      'Hold START on S1 (or on the ladder): KM1 pulls in, 13-14 seals the circuit and the motor spins CW (FORWARD). Release START — the motor keeps running.',
      'Open the KM1 🔍 X-RAY cutaway to watch the armature pull the copper bridges onto the fixed contacts.',
      'Press TEST on F2 (or set its dial below the motor current): 95-96 opens, KM1 drops out and PL_FAULT lights via 97-98. Press R to reset.',
      'Switch to Ladder Logic → Rung Builder, draw the circuit yourself and click Verify Against Physical Wiring.',
    ],
    project: {
      id: 'proj_marine_dol_440v',
      title: 'Marine DOL Starter 440V / 220V Control',
      description: '440V 3-phase DOL starter with control transformer, contactor and thermal overload relay.',
      codeStandard: 'PEC',
      gridVoltage: 440,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: dolDevices,
      wires: dolWires,
      targetLadder: dolTarget,
    },
  },
  {
    id: 'lab-forward-reverse-interlock',
    title: '🔄 Forward-Reverse 3-Phase Motor Starter with Electrical Interlocking',
    subtitle: 'Worksheet — FOR & REV contactors, T1/T3 phase reversal, 21-22 NC cross-interlocks, TOR & FWD/REV/STOP station',
    category: 'industrial',
    badge: '🔄 FWD / REV',
    difficulty: 'Advanced',
    description:
      'Reversing a 3-phase induction motor means swapping any two supply lines. KM1 (FOR) connects L1-L2-L3 straight to U1-V1-W1; KM2 (REV) swaps T1 and T3, so the motor sees L3-L2-L1 and turns counter-clockwise. Because closing both at once would bolt L1 to L3, each coil is fed through the other contactor\'s 21-22 NC auxiliary contact (electrical interlock).',
    objectives: [
      'Simulate, then hold FWD: KM1 latches through 13-14 and the motor badge shows ⟳ CW FWD.',
      'While running forward, press REV — nothing happens: KM1 21-22 is open and blocks the reverse coil. Press STOP, then REV to see ⟲ CCW REV.',
      'Watch the Ladder Logic view in Dual View highlight each closed contact and the blocked interlock in red.',
      'Force both contactor test plungers in (Inspector → Test Plunger) to bypass the interlock: the solver detects L1 shorted to L3, sparks an arc flash and trips Q1.',
      'In Rung Builder, remove the KM2 21-22 contact from rung 1 and Verify — then rewire the physical circuit without the interlock and compare.',
    ],
    project: {
      id: 'proj_forward_reverse_interlock',
      title: 'Forward-Reverse Starter with Interlocks',
      description: '440V reversing starter: FOR/REV contactors, T1-T3 reversal, 21-22 interlocks, overload relay.',
      codeStandard: 'PEC',
      gridVoltage: 440,
      gridFrequency: 60,
      systemEarthing: 'TN-S',
      devices: frDevices,
      wires: frWires,
      targetLadder: frTarget,
    },
  },
];
