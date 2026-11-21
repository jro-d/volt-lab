import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire, labProject } from './phase1Labs';
import { dolDevices, dolWires } from './motorControlLabs';

/**
 * Time-current curves lab: the marine DOL starter with a fuse switch ahead of the main breaker, so the
 * feeder protection has to be coordinated (selective) with the motor circuit protection.
 */

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const L1 = '#dc2626';
const L2 = '#eab308';
const L3 = '#2563eb';
const G = '12 AWG (3.5 mm²)';
/** Power conductors: always feed_live, whatever their colour */
const wr = (...a: Parameters<typeof labWire>): ElectricalWire => ({ ...labWire(...a), conductorRole: 'feed_live', lengthMeters: 1.2 });

const devices: ElectricalDevice[] = [
  ...clone(dolDevices).map((d: ElectricalDevice) => (d.id === 'mdol_m1' ? { ...d, name: 'M1 3Φ Motor 3HP 440V' } : d)),
  dev('fuse_switch_disconnector_3p', 250, 40, 'mdol_fs', { name: 'FS1 Feeder Fuse Switch (gG 25A)', state: { tag: 'FS1', fuseKind: 'gG', ratedAmps: 25 } }),
];

const wires: ElectricalWire[] = [
  ...clone(dolWires).filter((w: ElectricalWire) => !(w.fromDeviceId === 'mdol_src' && w.toDeviceId === 'mdol_q1')),
  wr('mdol_src', 'l1', 'mdol_fs', 'in_l1', L1, G),
  wr('mdol_src', 'l2', 'mdol_fs', 'in_l2', L2, G),
  wr('mdol_src', 'l3', 'mdol_fs', 'in_l3', L3, G),
  wr('mdol_fs', 'out_l1', 'mdol_q1', 'in_l1', L1, G),
  wr('mdol_fs', 'out_l2', 'mdol_q1', 'in_l2', L2, G),
  wr('mdol_fs', 'out_l3', 'mdol_q1', 'in_l3', L3, G),
];

const motorFeed = wires.find((w) => w.fromDeviceId === 'mdol_f2' && w.toDeviceId === 'mdol_m1' && w.fromTerminalId === 't1');

export const CURVES_LAB: LabLesson = {
  id: 'lab-curves-motor-feeder',
  title: 'Fuse and MCB Coordination for a Motor Feeder (Time-Current Curves)',
  subtitle: 'Feeder fuse -> D-curve MCB -> thermal overload relay -> motor, read on the Curves panel',
  category: 'industrial',
  badge: '〰 Coordination',
  difficulty: 'Advanced',
  description:
    'A DOL motor starter fed through a 25 A gG fuse switch. The Curves panel (status bar) plots the fuse, the 16 A D-curve MCB and the 6 A overload relay as tolerance bands, the motor starting envelope (6 x FLA for 5 s) and the damage limit of the motor cable. Shaded red regions are currents where both an upstream and a downstream device may operate: the pair is not selective there.',
  objectives: [
    'Open the Curves panel and read the three bands. Which device is fastest at 10 x its rating? At 100 A?',
    'Check the motor start (orange) against the overload relay band: the start must sit to the left of, or below, the relay curve so a normal start does not trip it.',
    'Find the current above which the fuse and the MCB overlap (red). Below it a fault is cleared by the MCB alone; above it the fuse may open too and the whole feeder is lost.',
    'The dashed red line is the cable damage limit for the motor feeder. A protective device band must lie below it at every fault current the cable can see.',
    'Press ▶ Simulate and start the motor: the dot on each curve is the live current from the solver. Change the MCB curve to B or C and the fuse rating, and watch the overlap move.',
  ],
  project: {
    ...labProject('proj_curves_motor_feeder', 'Motor Feeder Coordination', 'Fuse switch, MCB and thermal overload relay on a DOL starter.', devices, wires, 440),
    curves: { v: 1, chain: ['mdol_fs', 'mdol_q1', 'mdol_f2'], wireId: motorFeed?.id, motorId: 'mdol_m1' },
  },
};
