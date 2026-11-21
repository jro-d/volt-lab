import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, GREEN, ORANGE, RED, G12, G14 } from './phase1Labs';

/** Heavy feeder conductor for the 63 A MCCB (a 6 AWG conductor may only be protected up to 60 A) */
const G6 = '4 AWG (22 mm²)';

/**
 * Roadmap phase 3 labs. Batch 3.1: protection and metering. Built from standard (brand-neutral) devices.
 */

const L1 = '#dc2626';
const L2 = '#eab308';
const L3 = '#2563eb';

// ── 1 · Motor feeder: adjustable MCCB, earth-leakage relay with shunt trip, CT ammeter, voltmeter ─────
const feederDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'src', { name: '440V 3Φ 60Hz Feeder' }),
  dev('mccb_3p', 40, 170, 'q1', { name: 'Q1 MCCB 3P 63 A (Ir / Im adjustable, shunt trip)', state: { ratedAmps: 63, irFactor: 0.4, imFactor: 5, shuntTrip: true } }),
  dev('current_transformer', 260, 190, 'ct1', { name: 'CT1 Current Transformer 50/5 A', state: { primaryA: 50 } }),
  dev('panel_ammeter', 380, 190, 'pa1', { name: 'PA1 Panel Ammeter 0-50 A', state: { fullScaleA: 50 } }),
  dev('core_balance_ct', 60, 360, 'zct', { name: 'ZCT1 Core-Balance CT' }),
  dev('motor_ac_industrial', 60, 540, 'm1', { name: 'M1 3Φ Motor 3HP 440V', state: { tag: 'M1', wattage: 2200, motorHp: 3 } }),
  dev('earth_busbar', 260, 560, 'pe', { name: 'PE Earth Bar' }),
  dev('mcb_2p', 300, 250, 'q2', { name: 'Q2 Control 2P MCB 6A', state: { ratedAmps: 6, tripCurve: 'C' } }),
  dev('control_transformer', 300, 360, 'tc1', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
  dev('earth_leakage_relay', 470, 360, 'elr', { name: 'KE1 Earth-Leakage Relay', state: { sensitivityMa: 300, delaySec: 0.3, tag: 'KE1' } }),
  dev('voltmeter_selector', 470, 170, 'pv1', { name: 'PV1 Voltmeter + Selector', state: { selector: 'L1-L2' } }),
];
const feederWires: ElectricalWire[] = [
  wr('src', 'l1', 'q1', 'in_l1', L1, G6), wr('src', 'l2', 'q1', 'in_l2', L2, G6), wr('src', 'l3', 'q1', 'in_l3', L3, G6),
  // L1 passes through the CT primary
  wr('q1', 'out_l1', 'ct1', 'p1', L1, G6), wr('ct1', 'p2', 'zct', 'in_l1', L1, G6),
  wr('q1', 'out_l2', 'zct', 'in_l2', L2, G6), wr('q1', 'out_l3', 'zct', 'in_l3', L3, G6),
  wr('zct', 'out_l1', 'm1', 'u1', L1, G6), wr('zct', 'out_l2', 'm1', 'v1', L2, G6), wr('zct', 'out_l3', 'm1', 'w1', L3, G6),
  wr('src', 'pe', 'pe', 'pe_main', GREEN, G12), wr('pe', 'pe_1', 'm1', 'pe', GREEN, G12),
  // ammeter across the CT secondary
  wr('ct1', 's1', 'pa1', 'i1', ORANGE, G14), wr('pa1', 'i2', 'ct1', 's2', ORANGE, G14),
  // voltmeter on the line side
  wr('zct', 'out_l1', 'pv1', 'l1', L1, G14), wr('zct', 'out_l2', 'pv1', 'l2', L2, G14), wr('zct', 'out_l3', 'pv1', 'l3', L3, G14),
  // control power for the relay and the shunt coil
  // (taken from the incoming feeder through Q2, so the relay and the shunt coil stay powered after the MCCB has tripped)
  wr('src', 'l1', 'q2', 'in_1', L1, G14), wr('src', 'l2', 'q2', 'in_2', L2, G14),
  wr('q2', 'out_1', 'tc1', 'h1', L1, G14), wr('q2', 'out_2', 'tc1', 'h2', L2, G14),
  wr('tc1', 'x1', 'elr', 'a1', ORANGE, G14), wr('tc1', 'x2', 'elr', 'a2', BLUE, G14),
  // earth-leakage CT to the relay
  wr('zct', 's1', 'elr', 'k1', ORANGE, G14), wr('zct', 's2', 'elr', 'k2', ORANGE, G14),
  // relay 15-18 energizes the shunt trip coil C1-C2
  wr('tc1', 'x1', 'elr', 'com_15', ORANGE, G14), wr('elr', 'no_18', 'q1', 'sht_a1', ORANGE, G14), wr('q1', 'sht_a2', 'tc1', 'x2', BLUE, G14),
];

// ── 2 · Residential: AFDD and GFCI ───────────────────────────────────────────────────────────────────
const arcDevices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 40, 'src', { name: 'Service Meter (source)' }),
  dev('afdd_1pn', 240, 40, 'afdd', { name: 'AFDD 16 A (arc-fault protection)', state: { ratedAmps: 16, tripCurve: 'C' } }),
  dev('gfci_receptacle', 420, 40, 'gfci', { name: 'GFCI Receptacle' }),
  dev('appliance_fan', 240, 280, 'fan_a', { name: 'Fan A (on the GFCI face)', state: { wattage: 65 } }),
  dev('appliance_fan', 440, 280, 'fan_b', { name: 'Fan B (on the GFCI LOAD side)', state: { wattage: 65 } }),
  dev('earth_busbar', 640, 280, 'pe', { name: 'PE Earth Bar' }),
];
const arcWires: ElectricalWire[] = [
  wr('src', 'l_out', 'afdd', 'in_l', RED, G12), wr('src', 'n_out', 'afdd', 'in_n', BLUE, G12),
  wr('afdd', 'out_l', 'gfci', 'line_l', RED, G12), wr('afdd', 'out_n', 'gfci', 'line_n', BLUE, G12),
  wr('gfci', 'hot', 'fan_a', 'line', RED, G12), wr('gfci', 'neutral', 'fan_a', 'neutral', BLUE, G12),
  wr('gfci', 'load_l', 'fan_b', 'line', RED, G12), wr('gfci', 'load_n', 'fan_b', 'neutral', BLUE, G12),
  wr('gfci', 'ground', 'pe', 'pe_1', GREEN, G12), wr('pe', 'pe_2', 'fan_a', 'ground', GREEN, G12), wr('pe', 'pe_3', 'fan_b', 'ground', GREEN, G12),
];

// ── 3 · DOL starter with a lockable isolator, an MPCB and a PTC thermistor relay ─────────────────────
const mpcbDevices: ElectricalDevice[] = [
  dev('source_3phase_440v', 40, 30, 'src', { name: '440V 3Φ 60Hz Feeder' }),
  dev('rotary_isolator_3p', 40, 170, 'q0', { name: 'Q0 Rotary Isolator 32 A (lockable)' }),
  dev('mpcb_3p', 200, 170, 'q1', { name: 'Q1 MPCB 3P (Ir 6.3 A)', state: { irAmps: 6.3 } }),
  dev('contactor_3p', 60, 340, 'km1', { name: 'KM1 Line Contactor', state: { tag: 'KM1' } }),
  dev('motor_ac_industrial', 56, 520, 'm1', { name: 'M1 3Φ Motor 3HP 440V (PTC fitted)', state: { tag: 'M1', wattage: 2200, motorHp: 3 } }),
  dev('terminal_block', 250, 560, 'xt1', { name: 'XT1 PE Terminal Block', state: { kind: 'pe' } }),
  dev('earth_busbar', 420, 560, 'pe', { name: 'PE Earth Bar' }),
  dev('mcb_2p', 320, 250, 'q2', { name: 'Q2 Control 2P MCB 6A', state: { ratedAmps: 6, tripCurve: 'C' } }),
  dev('control_transformer', 320, 340, 'tc1', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
  dev('ptc_relay', 480, 340, 'kt1', { name: 'KT1 PTC Thermistor Relay', state: { motorId: 'm1', tripTempC: 120 } }),
  dev('push_button_station', 620, 340, 's1', { name: 'S1 Start / Stop Station', state: { tag: 'S1' } }),
];
const mpcbWires: ElectricalWire[] = [
  wr('src', 'l1', 'q0', 'in_l1', L1, G12), wr('src', 'l2', 'q0', 'in_l2', L2, G12), wr('src', 'l3', 'q0', 'in_l3', L3, G12),
  wr('q0', 'out_l1', 'q1', 'in_l1', L1, G12), wr('q0', 'out_l2', 'q1', 'in_l2', L2, G12), wr('q0', 'out_l3', 'q1', 'in_l3', L3, G12),
  wr('q1', 'out_l1', 'km1', 'l1', L1, G12), wr('q1', 'out_l2', 'km1', 'l2', L2, G12), wr('q1', 'out_l3', 'km1', 'l3', L3, G12),
  wr('km1', 't1', 'm1', 'u1', L1, G12), wr('km1', 't2', 'm1', 'v1', L2, G12), wr('km1', 't3', 'm1', 'w1', L3, G12),
  wr('src', 'pe', 'pe', 'pe_main', GREEN, G12), wr('m1', 'pe', 'xt1', 'a1', GREEN, G12), wr('xt1', 'b1', 'pe', 'pe_1', GREEN, G12),
  // control power from the isolator output, through the MPCB-protected side
  wr('q1', 'out_l1', 'q2', 'in_1', L1, G12), wr('q1', 'out_l2', 'q2', 'in_2', L2, G12),
  wr('q2', 'out_1', 'tc1', 'h1', L1, G14), wr('q2', 'out_2', 'tc1', 'h2', L2, G14),
  wr('tc1', 'x1', 'kt1', 'a1', ORANGE, G14), wr('kt1', 'a2', 'tc1', 'x2', BLUE, G14),
  // control rung: X1 -> PTC relay 15-18 -> STOP -> START || KM1 13-14 -> A1
  wr('tc1', 'x1', 'kt1', 'com_15', ORANGE, G14), wr('kt1', 'no_18', 's1', 'stop_1', ORANGE, G14),
  wr('s1', 'stop_2', 's1', 'start_3', ORANGE, G14), wr('s1', 'stop_2', 'km1', 'no_13', ORANGE, G14),
  wr('s1', 'start_4', 'km1', 'a1', ORANGE, G14), wr('km1', 'no_14', 'km1', 'a1', ORANGE, G14),
  wr('km1', 'a2', 'tc1', 'x2', BLUE, G14),
];

export const PHASE3_LABS: LabLesson[] = [
  {
    id: 'lab-feeder-protection-metering',
    title: 'Motor Feeder: Adjustable MCCB, Earth-Leakage Relay with Shunt Trip, CT Ammeter and Voltmeter',
    subtitle: 'MCCB Ir / Im dials, core-balance CT, earth-leakage relay, shunt trip coil, measuring CT and a phase-selector voltmeter',
    category: 'industrial',
    badge: '🛡 Feeder Protection',
    difficulty: 'Advanced',
    description:
      'A 440 V motor feeder protected by an adjustable MCCB. The three conductors pass through a core-balance CT whose secondary feeds an earth-leakage relay; the relay\'s 15-18 contact drives the MCCB shunt trip coil. A measuring CT on L1 drives a panel ammeter, and a voltmeter with a phase selector reads the line voltages.',
    objectives: [
      'Press ▶ Simulate: the motor runs. Step the voltmeter knob through L1-L2, L2-L3 and L3-L1 (440 V each) and read the motor current on the ammeter (the CT divides it by 10 for its 5 A secondary).',
      'Select the motor and set Earth-leakage fault to Leaking at 500 mA: the core-balance CT sees the residual current, KE1 operates after its 0.3 s delay, and its contact energizes the shunt trip coil so Q1 trips. Raise the relay sensitivity to 1 A and the same fault no longer trips.',
      'Select Q1: the MCCB is set to 0.4 × In. Raise the motor shaft load to 150 % and watch the thermal bar fill until it trips; set Ir back to 1.0 and the same load is carried.',
      'Stop the simulation, delete the wire from CT1 S2 to the ammeter, and run again: the CT has an open secondary and the code panel raises an error.',
    ],
    project: {
      ...labProject('proj_feeder_protection_metering', 'Motor Feeder Protection and Metering', 'MCCB, earth-leakage relay, shunt trip, CT ammeter and voltmeter.', feederDevices, feederWires, 440),
    },
  },
  {
    id: 'lab-afdd-gfci',
    title: 'AFDD and GFCI: Loose Terminal Arcing and Ground-Fault Protection Downstream',
    subtitle: 'Arc-fault detection device in series with a GFCI receptacle whose LOAD terminals protect a second outlet',
    category: 'residential',
    badge: '🔥 Arc & Ground Fault',
    difficulty: 'Intermediate',
    description:
      'The meter feeds an AFDD and then a GFCI receptacle. Fan A is plugged into the GFCI face; Fan B is wired to the GFCI LOAD terminals and is protected by it. A loose terminal makes a series arc, which a normal breaker would not notice but an AFDD trips on; a ground fault anywhere on the GFCI face or load side trips the GFCI.',
    objectives: [
      'Press ▶ Simulate: both fans run. Select Fan B and set an earth-leakage fault: the GFCI trips (press RESET after clearing the fault). The fault on Fan B is protected through the LOAD terminals.',
      'Set the earth-leakage fault on Fan A instead: the GFCI face trips too.',
      'Mark a terminal of Fan A as loose: the series arc is shown and the AFDD trips, because it can detect arcing. Replace the AFDD with an ordinary MCB in your own circuit and the arc is only reported as a fire hazard.',
    ],
    project: labProject('proj_afdd_gfci', 'AFDD and GFCI Protection', 'Loose-terminal arcing and ground-fault protection.', arcDevices, arcWires, 230),
  },
  {
    id: 'lab-mpcb-ptc-isolator',
    title: 'DOL Starter with a Lockable Isolator, an MPCB and a PTC Thermistor Relay',
    subtitle: 'The MPCB replaces the MCB and overload relay; a PTC relay watches the winding temperature',
    category: 'industrial',
    badge: '🌡 Motor Protection',
    difficulty: 'Advanced',
    description:
      'A direct-on-line starter built without an overload relay: the motor protection circuit breaker (MPCB) gives class 10 thermal and magnetic protection, a lockable rotary isolator makes the starter safe to work on, and a PTC thermistor relay in the control rung stops the motor when its winding gets too hot (the motor model heats with load). The motor earth runs through a PE terminal block.',
    objectives: [
      'Set the START button, press ▶ Simulate: the motor runs; its winding temperature (inspector) settles near 100 °C at full load.',
      'Select the motor and raise its shaft load to 150 %: the winding temperature climbs past 120 °C, KT1 releases and the contactor drops out; lower the load and KT1 resets once the winding has cooled 20 °C.',
      'Select Q1 and lower Ir to 2.5 A: the class 10 overload element trips the MPCB within seconds, with no overload relay in the circuit.',
      'Select the isolator Q0 and fit the padlock: it opens and cannot be closed again until the padlock is removed.',
    ],
    project: labProject('proj_mpcb_ptc_isolator', 'DOL Starter: Isolator, MPCB and PTC Relay', 'MPCB, rotary isolator and PTC thermistor relay.', mpcbDevices, mpcbWires, 440),
  },
];
