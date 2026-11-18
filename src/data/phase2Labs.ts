import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { LadderElement, LadderElementKind, LadderRung } from '../types/ladder';
import type { LabLesson } from './labTemplates';
import { dolDevices, dolWires } from './motorControlLabs';
import { labDevice as dev, labWire as wr, labProject, BLUE, GREEN, ORANGE, RED, G12, G14 } from './phase1Labs';

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

// ── 2 · DOL starter protected by a phase monitor ──────────────────────────────────────────────
// The marine DOL starter with a phase monitor relay KP1: its 15-18 contact is in series with the control
// rung, its sense inputs are on the Q1 incoming terminals and it is supplied from the control transformer.
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)); // labs must not share device objects
const pmDevices: ElectricalDevice[] = [
  ...clone(dolDevices),
  dev('phase_monitor_relay', 190, 520, 'mdol_kp1', { name: 'KP1 Phase Monitor Relay', state: { tag: 'KP1', nominalV: 440, underOverPct: 10 } }),
];
const pmWires: ElectricalWire[] = [
  ...clone(dolWires).filter((w: ElectricalWire) => !(w.fromDeviceId === 'mdol_tc1' && w.fromTerminalId === 'x1' && w.toTerminalId === 'nc_95')),
  // sense inputs on the incoming side of Q1
  wr('mdol_q1', 'in_l1', 'mdol_kp1', 'l1', L1, G12),
  wr('mdol_q1', 'in_l2', 'mdol_kp1', 'l2', L2, G12),
  wr('mdol_q1', 'in_l3', 'mdol_kp1', 'l3', L3, G12),
  // supply from the control transformer
  wr('mdol_tc1', 'x1', 'mdol_kp1', 'a1', ORANGE),
  wr('mdol_kp1', 'a2', 'mdol_tc1', 'x2', BLUE),
  // 15-18 in series with the control rung: X1 -> KP1 15-18 -> OLR 95-96 ...
  wr('mdol_tc1', 'x1', 'mdol_kp1', 'com_15', ORANGE),
  wr('mdol_kp1', 'no_18', 'mdol_f2', 'nc_95', ORANGE),
];
const pmRung = () => [
  ...ladderSeries(ladderEl('NO', 'KP1', '15-18', 'mdol_kp1', 'pm_no'), ladderEl('NC', 'OLR', '95-96', 'mdol_f2', 'trip_nc'), ladderEl('NC', 'STOP', '1-2', 'mdol_s1', 'stop')),
  ladderParallel([ladderEl('NO', 'START', '3-4', 'mdol_s1', 'start')], [ladderEl('NO', 'KM1', '13-14', 'mdol_km1', 'aux_no')]),
];
const pmTarget: LadderRung[] = [
  { id: 'tgt_pm_1', blocks: pmRung(), output: ladderEl('COIL', 'KM1', 'A1-A2', 'mdol_km1', 'coil') },
  { id: 'tgt_pm_2', blocks: pmRung(), output: ladderEl('LAMP', 'PL_RUN', 'GREEN', 'mdol_pl_run', 'lamp') },
];

// ── 3 · Conveyor stop: inductive sensor into a 24 V DC PLC input, relay output to a contactor ──────
const cvDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'src', { name: '440V 3Φ 60Hz Feeder' }),
  dev('mcb_3p', 68, 176, 'q1', { name: 'Q1 Main 3P MCB 16A', state: { ratedAmps: 16, tripCurve: 'D' } }),
  dev('contactor_3p', 60, 330, 'km1', { name: 'KM1 Conveyor Contactor', state: { tag: 'KM1' } }),
  dev('thermal_overload_relay', 60, 520, 'f2', { name: 'F2 Thermal Overload', state: { tag: 'F2', tripAmps: 6 } }),
  dev('motor_ac_industrial', 56, 700, 'm1', { name: 'M1 Conveyor Motor 3HP 440V', state: { tag: 'M1', wattage: 2200, motorHp: 3 } }),
  dev('earth_busbar', 260, 680, 'pe', { name: 'PE Earth Bar' }),
  dev('mcb_2p', 330, 176, 'q2', { name: 'Q2 Control 2P MCB 6A', state: { ratedAmps: 6, tripCurve: 'C' } }),
  dev('control_transformer', 306, 330, 'tc1', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
  dev('psu_24vdc', 520, 300, 'ps1', { name: 'PS1 24 V DC Supply 5 A', state: { tag: 'PS1', ratedAmps: 5 } }),
  dev('plc_24vdc_16io', 640, 300, 'plc', { name: 'A1 PLC 24 V DC', state: { tag: 'A1', program: 'passthrough', inputMode: 'sinking' } }),
  dev('sensor_inductive', 540, 470, 'b1', { name: 'B1 Inductive Sensor (end of belt)', state: { tag: 'B1', output: 'PNP', contact: 'NC', rangeMm: 8 } }),
  dev('industrial_relay_dpdt', 700, 470, 'k1', { name: 'K1 Interface Relay 24 V DC', state: { tag: 'K1', coilType: 'dc24' } }),
];
const cvWires: ElectricalWire[] = [
  // power circuit
  wr('src', 'l1', 'q1', 'in_l1', L1, G12), wr('src', 'l2', 'q1', 'in_l2', L2, G12), wr('src', 'l3', 'q1', 'in_l3', L3, G12),
  wr('q1', 'out_l1', 'km1', 'l1', L1, G12), wr('q1', 'out_l2', 'km1', 'l2', L2, G12), wr('q1', 'out_l3', 'km1', 'l3', L3, G12),
  wr('km1', 't1', 'f2', 'l1', L1, G12), wr('km1', 't2', 'f2', 'l2', L2, G12), wr('km1', 't3', 'f2', 'l3', L3, G12),
  wr('f2', 't1', 'm1', 'u1', L1, G12), wr('f2', 't2', 'm1', 'v1', L2, G12), wr('f2', 't3', 'm1', 'w1', L3, G12),
  wr('src', 'pe', 'pe', 'pe_main', GREEN, G12),
  wr('pe', 'pe_1', 'm1', 'pe', GREEN, G12),
  // 220 V control power
  wr('q1', 'out_l1', 'q2', 'in_1', L1, G12), wr('q1', 'out_l2', 'q2', 'in_2', L2, G12),
  wr('q2', 'out_1', 'tc1', 'h1', L1, G14), wr('q2', 'out_2', 'tc1', 'h2', L2, G14),
  // 24 V DC supply from the control transformer secondary
  wr('tc1', 'x1', 'ps1', 'in_l', ORANGE), wr('tc1', 'x2', 'ps1', 'in_n', BLUE),
  // 24 V DC side: + rail
  wr('ps1', 'v_pos', 'plc', 'l_pos', RED), wr('ps1', 'v_pos', 'b1', 'brown', RED),
  // 0 V rail
  wr('ps1', 'v_neg', 'plc', 'm_neg', BLUE), wr('ps1', 'v_neg', 'b1', 'blue', BLUE), wr('ps1', 'v_neg', 'k1', 'a2', BLUE),
  // sensor signal -> PLC input I0.0, PLC output Q0.0 -> relay coil
  wr('b1', 'black', 'plc', 'i0', RED),
  wr('plc', 'q0', 'k1', 'a1', RED),
  // relay contact 11-14 in the 220 V coil circuit of the contactor: X1 -> K1 -> OLR -> KM1 -> X2
  wr('tc1', 'x1', 'k1', 'com_1', ORANGE),
  wr('k1', 'no_1', 'f2', 'nc_95', ORANGE),
  wr('f2', 'nc_96', 'km1', 'a1', ORANGE),
  wr('km1', 'a2', 'tc1', 'x2', BLUE),
];
const cvRung = () => ladderSeries(ladderEl('NO', 'K1', '11-14', 'k1', 'no_1'), ladderEl('NC', 'OLR', '95-96', 'f2', 'trip_nc'));
const cvTarget: LadderRung[] = [{ id: 'tgt_cv_1', blocks: cvRung(), output: ladderEl('COIL', 'KM1', 'A1-A2', 'km1', 'coil') }];

// ── 4 · Overload alarm: thermal overload contact drives a beacon and a horn ───────────────────
const alDevices: ElectricalDevice[] = [
  ...clone(dolDevices),
  dev('beacon', 330, 560, 'mdol_hl1', { name: 'HL1 Overload Beacon', state: { tag: 'HL1', supply: 'ac230', mode: 'flashing', color: 'red' } }),
  dev('buzzer_horn', 420, 560, 'mdol_ha1', { name: 'HA1 Overload Horn', state: { tag: 'HA1', supply: 'ac230' } }),
];
const alWires: ElectricalWire[] = [
  ...clone(dolWires),
  // the TOR 97-98 NO contact closes on overload: X1 -> 97-98 -> beacon and horn -> X2
  wr('mdol_tc1', 'x1', 'mdol_f2', 'no_97', ORANGE),
  wr('mdol_f2', 'no_98', 'mdol_hl1', 'a1', ORANGE),
  wr('mdol_f2', 'no_98', 'mdol_ha1', 'a1', ORANGE),
  wr('mdol_hl1', 'a2', 'mdol_tc1', 'x2', BLUE),
  wr('mdol_ha1', 'a2', 'mdol_tc1', 'x2', BLUE),
];
const alRung = () => ladderSeries(ladderEl('NO', 'OLR', '97-98', 'mdol_f2', 'alarm_no'));
const alTarget: LadderRung[] = [
  { id: 'tgt_al_1', blocks: alRung(), output: ladderEl('LAMP', 'HL1', 'BEACON', 'mdol_hl1', 'lamp') },
  { id: 'tgt_al_2', blocks: alRung(), output: ladderEl('LAMP', 'HA1', 'HORN', 'mdol_ha1', 'lamp') },
];

// ── 5 · Capacitor-start motor: wiring the starting capacitor and reversing rotation ───────────────
const csDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'src', { name: 'Service Meter (source)' }),
  dev('service_disconnect_2p', 250, 40, 'q1', { name: 'Q1 Motor Disconnect 10A', state: { closed: true, tripped: false, ratedAmps: 10 } }),
  dev('earth_busbar', 420, 40, 'pe', { name: 'PE Earth Bar' }),
  dev('capacitor_run', 250, 260, 'c1', { name: 'C1 Start Capacitor 100 µF', state: { uF: 100, tag: 'C1' } }),
  dev('motor_1p', 120, 400, 'm1', { name: 'M1 Capacitor-Start Motor 0.37 kW', state: { motorKind: 'capacitor_start', tag: 'M1' } }),
];
const csWires: ElectricalWire[] = [
  wr('src', 'l_out', 'q1', 'in_l', RED, G12), wr('src', 'n_out', 'q1', 'in_n', BLUE, G12),
  // main winding straight across the supply
  wr('q1', 'out_l', 'm1', 'u1', RED, G12), wr('q1', 'out_n', 'm1', 'u2', BLUE, G12),
  // start winding in series with the capacitor
  wr('q1', 'out_l', 'c1', 'c1', RED, G14), wr('c1', 'c2', 'm1', 'z1', RED, G14), wr('q1', 'out_n', 'm1', 'z2', BLUE, G14),
  wr('src', 'pe', 'pe', 'pe_main', GREEN, G12), wr('pe', 'pe_1', 'm1', 'pe', GREEN, G12),
];

// ── 6 · Dead-testing a 3-phase motor circuit before energizing ────────────────────────────────────
const dtDevices: ElectricalDevice[] = [
  ...clone(dolDevices).map((d: ElectricalDevice) => (d.id === 'mdol_m1' ? { ...d, state: { ...d.state, insulationMOhm: 0.3 } } : d)),
  dev('ground_pit', 330, 700, 'mdol_pit', { name: 'GP1 Ground Pit', state: { earthResistanceOhms: 5 } }),
];
const dtWires: ElectricalWire[] = [
  ...clone(dolWires),
  wr('mdol_pit', 'clamp', 'mdol_pe', 'pe_main', GREEN, G12),
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
  {
    id: 'lab-phase-monitor-dol',
    title: 'DOL Starter Protected by a Phase Monitor: Swap Two Phases and Watch It Refuse to Run',
    subtitle: 'Phase failure / phase sequence relay (IEC 60255) in the control circuit',
    category: 'industrial',
    badge: '🛡 Phase Monitor',
    difficulty: 'Advanced',
    description:
      'A DOL starter whose control rung runs through the 15-18 contact of a phase monitor relay. The relay watches the incoming supply on its L1 / L2 / L3 sense inputs and only closes 15-18 when all three phases are present, in the correct sequence, within +/-10 % of 440 V. With a bad supply the starter cannot pull in, so a lost phase or reversed rotation never reaches the motor.',
    objectives: [
      'Press ▶ Simulate and press START: KP1 shows PHASES OK, KM1 pulls in and the motor runs.',
      'Stop the simulation. At the Q1 incoming terminals swap the L2 and L3 feeder wires, then simulate again: KP1 shows WRONG SEQUENCE and the starter refuses to run.',
      'Restore the wiring and delete one sense wire: KP1 shows LOST PHASE. Change the feeder voltage in the 440 V feeder inspector to 380 V to see UNDERVOLTAGE.',
      'Open the Lab Target ladder: where does the KP1 15-18 contact sit, and why does it protect the motor from reversal without touching the power circuit?',
    ],
    project: {
      ...labProject('proj_phase_monitor_dol', 'DOL Starter with Phase Monitor Relay', 'Phase monitor 15-18 in series with the DOL control rung.', pmDevices, pmWires, 440),
      targetLadder: pmTarget,
    },
  },
  {
    id: 'lab-conveyor-stop-dc',
    title: 'Conveyor Stop: Inductive Sensor into a PLC Input, Relay Output to a Contactor',
    subtitle: '24 V DC control domain: supply, three-wire sensor, PLC, interface relay',
    category: 'industrial',
    badge: '🔌 24 V DC',
    difficulty: 'Advanced',
    description:
      'A conveyor motor is started by contactor KM1. KM1 is switched by a 24 V DC interface relay K1, which is driven by PLC output Q0.0. An inductive sensor (PNP, normally closed form) at the end of the belt feeds PLC input I0.0, and the PLC program simply copies I0.0 to Q0.0. With the belt clear the sensor output is high, so the conveyor runs; a box reaching the sensor turns the output off and stops the belt (a broken sensor wire stops it too, which is why NC is used). The 24 V DC side is a separate domain: it must never be wired to the 220 V control circuit except through the relay contact.',
    objectives: [
      'Press ▶ Simulate: PS1 shows 24 V, the sensor and PLC power LEDs light, I0.0 is on, Q0.0 is on, K1 and KM1 pull in and the motor runs.',
      'Click the sensing face of B1 to put a box in front of it: I0.0 and Q0.0 drop out and the conveyor stops. Click again to release it.',
      'Select B1 and change the output from PNP to NPN: the PLC input is a sinking (PNP) input, so a clear NPN OUTPUT INTO PNP (SINKING) INPUT note appears and the belt never starts. Change it back.',
      'Swap the brown and blue sensor wires: B1 shows REVERSED SUPPLY. Then wire a +24 V rail terminal to a 220 V terminal and watch PS1 shut down with AC/DC CROSS-CONNECTION.',
    ],
    project: {
      ...labProject('proj_conveyor_stop_dc', 'Conveyor Stop (Sensor, PLC, Relay, Contactor)', 'Inductive sensor to PLC input, relay output to a contactor.', cvDevices, cvWires, 440),
      targetLadder: cvTarget,
    },
  },
  {
    id: 'lab-overload-alarm',
    title: 'Overload Alarm: Thermal Overload Contact Drives a Beacon and Horn',
    subtitle: 'Annunciation: flashing beacon and buzzer on the overload relay 97-98 contact',
    category: 'industrial',
    badge: '🚨 Alarm',
    difficulty: 'Intermediate',
    description:
      'A DOL starter whose thermal overload relay has an NC contact (95-96) in the control rung and an NO contact (97-98) wired to an alarm: a flashing red beacon and a horn on the 220 V control supply. While the motor is healthy the alarm is silent; when the overload relay trips, 95-96 opens (the motor stops) and 97-98 closes (the alarm starts).',
    objectives: [
      'Press ▶ Simulate, then START: the motor runs and the beacon and horn are silent.',
      'Press TEST on the overload relay: it trips, the motor stops, the beacon flashes and the horn sounds.',
      'Click the horn to mute it (the beacon keeps flashing), then RESET the overload relay to clear the alarm.',
      'Select the beacon and change its colour and mode. Compare your wiring with the Lab Target ladder.',
    ],
    project: {
      ...labProject('proj_overload_alarm', 'Overload Alarm (Beacon + Horn)', 'Thermal overload 97-98 contact drives a beacon and a horn.', alDevices, alWires, 440),
      targetLadder: alTarget,
    },
  },
  {
    id: 'lab-capacitor-start-motor',
    title: 'Capacitor-Start Motor: Wiring the Starting Capacitor and Reversing Rotation',
    subtitle: 'Single-phase motor with a main winding, a start winding, a capacitor and a centrifugal switch',
    category: 'industrial',
    badge: '🌀 1Φ Motor',
    difficulty: 'Intermediate',
    description:
      'A single-phase capacitor-start motor. The main winding (U1-U2) is across the supply; the start winding (Z1-Z2) is in series with a 100 µF starting capacitor, which shifts the current so the motor has a starting torque. At 75 % speed the centrifugal switch opens and drops the start winding out. The direction of rotation depends on which way round the start winding is connected.',
    objectives: [
      'Press ▶ Simulate: the motor runs up, the centrifugal switch on the end shield opens at 75 % speed and the line current falls from the starting value.',
      'Stop the simulation and delete the wire from C1 to Z1: with the capacitor out of circuit the motor only hums and the fault reads no start capacitor, drawing about five times its running current.',
      'Restore it, select C1 and change it to 12 µF: the motor still starts, but a wrong capacitor value note appears and the current is high. Mark C1 as failed open and see the humming fault again.',
      'Swap the Z1 and Z2 leads of the start winding to reverse the rotation, then change the motor type to PSC to see a motor with no centrifugal switch.',
    ],
    project: labProject('proj_capacitor_start_motor', 'Capacitor-Start Motor', 'Start capacitor, centrifugal switch and reversal of a single-phase motor.', csDevices, csWires, 230),
  },
  {
    id: 'lab-dead-testing-motor',
    title: 'Dead-Testing a 3-Phase Motor Circuit Before Energizing',
    subtitle: 'Insulation tester, continuity buzzer, earth tester and phase rotation meter',
    category: 'industrial',
    badge: '🧪 Dead Test',
    difficulty: 'Advanced',
    description:
      'A finished DOL starter, ready to energize. Before the first start an electrician proves the circuit dead and tests it: continuity of the protective earth, insulation resistance of the motor winding, resistance of the earth electrode, and (once live) the phase rotation. This motor has damaged winding insulation, which only the insulation tester will find.',
    objectives: [
      'In the toolbar open DMM and choose Continuity. Click the L1 terminal of Q1 and then the U1 terminal of the motor: the buzzer beeps on a closed path. Do the same between two phases and note the result.',
      'Choose Megger at 500 V and click a motor winding terminal and the motor PE terminal: the reading is far below 1 MΩ, so the motor is not safe to energize. Select the motor and set the winding insulation to Good, then test again.',
      'Choose Earth and click the rod clamp of the ground pit to read the electrode resistance. Try the Megger while the simulation is running: it refuses.',
      'Press ▶ Simulate, choose Rotation and click the L1, L2 and L3 terminals of the feeder in turn to read CW or CCW before pressing START.',
    ],
    project: labProject('proj_dead_testing_motor', 'Dead-Testing a 3-Phase Motor Circuit', 'Insulation, continuity, earth and rotation tests on a DOL starter.', dtDevices, dtWires, 440),
  },
];
