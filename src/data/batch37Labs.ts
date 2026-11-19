import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, ORANGE } from './phase1Labs';

/** Batch 3.7 lab: a double-acting cylinder on a 5/2 valve with reed switch end feedback. */

const RED = '#dc2626';
const live = (to: string, toT: string) => wr('grid', 'l_out', to, toT, RED);
const neut = (to: string, toT: string) => wr('grid', 'n_out', to, toT, BLUE);

const devices: ElectricalDevice[] = [
  dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Control Supply 230 V' }),
  dev('operator_pilot', 40, 220, 'adv', { name: 'S1 Advance (selector)', state: { operatorKind: 'selector_2pos', tag: 'S1' } }),
  dev('operator_pilot', 200, 220, 'ret', { name: 'S2 Retract (selector)', state: { operatorKind: 'selector_2pos', tag: 'S2' } }),
  dev('valve_52', 120, 420, 'yv', { name: 'YV2 5/2 Valve (double solenoid)' }),
  dev('cylinder_da', 90, 600, 'cyl', { name: 'CYL1 Cylinder', state: { valveId: 'yv', strokeSec: 3 } }),
  dev('reed_switch', 420, 600, 'reed_ret', { name: 'SR1 Reed: retracted', state: { cylinderId: 'cyl', endPos: 'retracted' } }),
  dev('reed_switch', 520, 600, 'reed_ext', { name: 'SR2 Reed: extended', state: { cylinderId: 'cyl', endPos: 'extended' } }),
  dev('pilot_light_indicator', 420, 760, 'l_ret', { name: 'PL1 Retracted', state: { pilotColor: 'green', tag: 'PL1' } }),
  dev('pilot_light_indicator', 520, 760, 'l_ext', { name: 'PL2 Extended', state: { pilotColor: 'amber', tag: 'PL2' } }),
];
const wires: ElectricalWire[] = [
  live('adv', 'no_13'), wr('adv', 'no_14', 'yv', 'y1_a1', ORANGE), neut('yv', 'y1_a2'),
  live('ret', 'no_13'), wr('ret', 'no_14', 'yv', 'y2_a1', ORANGE), neut('yv', 'y2_a2'),
  live('reed_ret', 'no_13'), wr('reed_ret', 'no_14', 'l_ret', 'x1', ORANGE), neut('l_ret', 'x2'),
  live('reed_ext', 'no_13'), wr('reed_ext', 'no_14', 'l_ext', 'x1', ORANGE), neut('l_ext', 'x2'),
];

export const BATCH37_LABS: LabLesson[] = [
  {
    id: 'lab-aut-cylinder-reeds',
    title: 'Double-Acting Cylinder: 5/2 Valve and Reed Switch End Feedback',
    subtitle: 'Advance and retract selectors drive a double-solenoid valve; reed switches report the end positions',
    category: 'automation',
    badge: '🔧 Pneumatics',
    difficulty: 'Intermediate',
    description:
      'A double-acting cylinder is driven by a 5/2 valve with two solenoids. A reed switch on each end of the stroke closes when the piston reaches it and lights a lamp, which is how a PLC would know the cylinder has finished moving. A double solenoid valve keeps its last position when both coils are off.',
    objectives: [
      'Press ▶ Simulate: the retracted lamp is on (the piston is at the retracted end).',
      'Turn S1 on: the cylinder extends over 3 s and the extended lamp lights when it arrives.',
      'Turn S1 off: the cylinder stays where it is (memory). Turn S2 on to retract it.',
      'Turn both S1 and S2 on: the valve is blocked. What would a single-solenoid spring-return valve do when the coil is switched off?',
    ],
    project: labProject('proj_aut_cylinder_reeds', 'Cylinder with 5/2 Valve and Reed Switches', 'Double-acting cylinder with reed end feedback.', devices, wires),
  },
];
