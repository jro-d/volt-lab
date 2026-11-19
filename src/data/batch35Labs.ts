import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, ORANGE, GREEN } from './phase1Labs';

/** Batch 3.5 labs: starters, a wound-rotor motor and a compressor on the 440 V / 220 V control trainer. */

const L1 = '#dc2626';
const L2 = '#eab308';
const L3 = '#2563eb';
const G12 = '12 AWG (3.5 mm²)';
const power = (from: string, to: string, map: [string, string][]): ElectricalWire[] =>
  map.map(([a, b], i) => ({ ...wr(from, a, to, b, [L1, L2, L3][i % 3], G12), conductorRole: 'feed_live' as const, lengthMeters: 1.2 }));
const p3 = (a: string[], b: string[]) => a.map((x, i) => [x, b[i]] as [string, string]);
const ctl = (from: string, fromT: string, to: string, toT: string) => wr(from, fromT, to, toT, ORANGE);

/** Source, main breaker and the 440 / 220 V control transformer shared by the labs. */
const base = (id: string): { devices: ElectricalDevice[]; wires: ElectricalWire[] } => ({
  devices: [
    dev('source_3phase_440v', 40, 30, 'src', { name: '440V 3Φ 60Hz Feeder' }),
    dev('mcb_3p', 40, 200, 'q1', { name: 'Q1 Main 3P MCB 10A', state: { ratedAmps: 10, tripCurve: 'C' } }),
    dev('control_transformer', 330, 200, 'tc', { name: 'TC1 Control Transformer 440/220V', state: { tag: 'TC1' } }),
    dev('earth_busbar', 560, 40, 'pe', { name: 'PE Earth Bar', state: { isEarth: true } }),
  ],
  wires: [
    ...power('src', 'q1', p3(['l1', 'l2', 'l3'], ['in_l1', 'in_l2', 'in_l3'])),
    wr('src', 'l1', 'tc', 'h1', L1, G12), wr('src', 'l2', 'tc', 'h2', L2, G12),
    wr('src', 'pe', 'pe', 'pe_main', GREEN, G12),
  ].map((w) => ({ ...w, id: `${id}_${w.id}` })),
});

// ── A · Soft starter ─────────────────────────────────────────────────────────────────────────
const soft = base('sf');
soft.devices.push(
  dev('soft_starter', 40, 380, 'ss', { name: 'KSS1 Soft Starter', state: { rampSec: 8, startMult: 3 } }),
  dev('motor_ac_industrial', 60, 640, 'm1', { name: 'M1 3Φ Motor 3HP 440V', state: { wattage: 2200 } }),
  dev('operator_pilot', 520, 200, 'start', { name: 'S1 Start (selector)', state: { operatorKind: 'selector_2pos', tag: 'S1' } }),
);
soft.wires.push(
  ...power('q1', 'ss', p3(['out_l1', 'out_l2', 'out_l3'], ['l1', 'l2', 'l3'])),
  ...power('ss', 'm1', p3(['t1', 't2', 't3'], ['u1', 'v1', 'w1'])),
  ctl('tc', 'x1', 'start', 'no_13'), ctl('start', 'no_14', 'ss', 'a1'), wr('ss', 'a2', 'tc', 'x2', BLUE),
);

// ── B · Wound-rotor motor with a rotor resistor bank ─────────────────────────────────────────
const rotor = base('wr');
rotor.devices.push(
  dev('motor_wound_rotor', 40, 380, 'm1', { name: 'M3 Wound-Rotor Motor', state: { wattage: 3700 } }),
  dev('rotor_resistor_bank', 300, 560, 'rb', { name: 'R1 Rotor Resistor Bank' }),
  dev('operator_pilot', 520, 200, 'st1', { name: 'S1 Stage 1', state: { operatorKind: 'selector_2pos', tag: 'S1' } }),
  dev('operator_pilot', 520, 340, 'st2', { name: 'S2 Stage 2', state: { operatorKind: 'selector_2pos', tag: 'S2' } }),
  dev('operator_pilot', 520, 480, 'st3', { name: 'S3 Stage 3', state: { operatorKind: 'selector_2pos', tag: 'S3' } }),
);
rotor.wires.push(
  ...power('q1', 'm1', p3(['out_l1', 'out_l2', 'out_l3'], ['u1', 'v1', 'w1'])),
  ...['k', 'l', 'm'].map((t, i) => wr('m1', t, 'rb', t, [L1, L2, L3][i], G12)),
  ...(['st1', 'st2', 'st3'] as const).flatMap((s, i) => [ctl('tc', 'x1', s, 'no_13'), ctl(s, 'no_14', 'rb', `c${i + 1}`)]),
  wr('rb', 'cn', 'tc', 'x2', BLUE),
);

// ── C · Compressor with a pressure switch ────────────────────────────────────────────────────
const comp = base('cp');
comp.devices.push(
  dev('contactor_3p', 40, 380, 'km1', { name: 'KM1 Compressor Contactor', state: { tag: 'KM1' } }),
  dev('air_compressor_3p', 60, 600, 'c1', { name: 'C1 Air Compressor 3 kW', state: { wattage: 3000 } }),
  dev('pressure_switch', 520, 330, 'ps', { name: 'SP1 Pressure Switch', state: { cutIn: 2, cutOut: 3.5 } }),
);
comp.wires.push(
  ...power('q1', 'km1', p3(['out_l1', 'out_l2', 'out_l3'], ['l1', 'l2', 'l3'])),
  ...power('km1', 'c1', p3(['t1', 't2', 't3'], ['u1', 'v1', 'w1'])),
  ctl('tc', 'x1', 'ps', 'com'), ctl('ps', 'no', 'km1', 'a1'), wr('km1', 'a2', 'tc', 'x2', BLUE),
);

export const BATCH35_LABS: LabLesson[] = [
  {
    id: 'lab-drv-soft-starter',
    title: 'Soft Starter: Ramped Start and Reduced Inrush',
    subtitle: '440 V feeder → 10 A MCB → soft starter → motor, with an end-of-ramp contact',
    category: 'industrial',
    badge: '📈 Soft Start',
    difficulty: 'Intermediate',
    description:
      'A soft starter sits between the breaker and the motor. The start selector energizes its command input; the output voltage ramps from 30 % to 100 % over 8 s and the starting current is limited to 3 times full load instead of the direct-on-line 6 times that the breaker inrush check applies.',
    objectives: [
      'Press ▶ Simulate and turn S1 on: the ramp starts, the motor starts when the ramp begins and the face shows the voltage rising.',
      'The end-of-ramp contact (13-14) closes at the end. What would you wire to it?',
      'Set the starting current limit to 4.5 x FLA and shorten the breaker to a Type B curve: does the breaker still ride through the start?',
      'Compare this with a direct-on-line start of the same motor.',
    ],
    project: labProject('proj_drv_soft_starter', 'Soft Starter', 'Soft starter feeding a 3-phase motor.', soft.devices, soft.wires, 440),
  },
  {
    id: 'lab-drv-wound-rotor',
    title: 'Wound-Rotor Motor with a Stepped Rotor Resistor Bank',
    subtitle: 'Shorting resistor stages one by one to accelerate a slip-ring motor',
    category: 'industrial',
    badge: '🔁 Slip Ring',
    difficulty: 'Advanced',
    description:
      'The stator is fed directly from the breaker; the slip rings K-L-M go to a rotor resistor bank with three shorting stages. All the resistance in gives a gentle, low-current start at about a third of the speed; each stage selector shorts one more step and the speed climbs.',
    objectives: [
      'Press ▶ Simulate: the motor runs slowly with all the rotor resistance in.',
      'Turn on S1, S2, S3 in turn and read the speed after each step.',
      'Try S3 without S1 and S2: a stage only counts when the stages before it are in.',
      'Disconnect one slip-ring wire: what does the motor do and why?',
    ],
    project: labProject('proj_drv_wound_rotor', 'Wound-Rotor Motor Starting', 'Wound-rotor motor with a rotor resistor bank.', rotor.devices, rotor.wires, 440),
  },
  {
    id: 'lab-drv-compressor-pressure',
    title: 'Air Compressor with a Pressure Switch',
    subtitle: 'Cut-in starts the compressor through a contactor, cut-out stops it',
    category: 'automation',
    badge: '🌬 Compressor',
    difficulty: 'Intermediate',
    description:
      'The pressure switch contact feeds the compressor contactor coil. The line pressure falls with the air draw-off; at cut-in the compressor starts and raises it until the cut-out pressure opens the contact.',
    objectives: [
      'Press ▶ Simulate: the pressure is low, so the switch calls the compressor and the pressure climbs.',
      'Watch it stop at the cut-out pressure and start again when the draw-off has pulled the pressure down to cut-in.',
      'Raise the draw-off in the pump inspector: how does the run time ratio change?',
    ],
    project: labProject('proj_drv_compressor_pressure', 'Compressor with Pressure Switch', 'Compressor controlled by a pressure switch.', comp.devices, comp.wires, 440),
  },
];
