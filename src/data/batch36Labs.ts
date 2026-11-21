import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { LabLesson } from './labTemplates';
import { labDevice as dev, labWire as wr, labProject, BLUE, ORANGE, GREEN } from './phase1Labs';

/** Batch 3.6 labs: household loads on a 230 V single-phase supply. */

const RED = '#dc2626';
const main = (): { d: ElectricalDevice[]; w: ElectricalWire[] } => ({
  d: [
    dev('kwh_meter_1p', 40, 30, 'grid', { name: 'Utility Service Meter' }),
    dev('mcb_2p', 250, 40, 'q1', { name: 'Q1 Main 2P MCB 32A', state: { ratedAmps: 32, tripCurve: 'C' } }),
    dev('earth_busbar', 700, 40, 'pe', { name: 'PE Earth Bar', state: { isEarth: true } }),
  ],
  w: [
    wr('grid', 'l_out', 'q1', 'in_1', RED, '8 AWG (8.0 mm²)'),
    wr('grid', 'n_out', 'q1', 'in_2', BLUE, '8 AWG (8.0 mm²)'),
  ],
});
const feed = (to: string, lt: string, nt: string, gt?: string): ElectricalWire[] => [
  wr('q1', 'out_1', to, lt, RED, '10 AWG (5.5 mm²)'), wr('q1', 'out_2', to, nt, BLUE, '10 AWG (5.5 mm²)'),
  ...(gt ? [wr('pe', 'pe_1', to, gt, GREEN, '10 AWG (5.5 mm²)')] : []),
];

// ── A · Kitchen circuit: cycling appliances and lamp types ───────────────────────────────────
const kitchen = main();
kitchen.d.push(
  dev('appliance_generic', 40, 260, 'fridge', { name: 'Refrigerator', state: { applianceKind: 'refrigerator', wattage: 150, pf: 0.8 } }),
  dev('appliance_generic', 180, 260, 'rice', { name: 'Rice Cooker', state: { applianceKind: 'rice_cooker', wattage: 700, pf: 1, cookSec: 60 } }),
  dev('appliance_generic', 320, 260, 'micro', { name: 'Microwave Oven', state: { applianceKind: 'microwave', wattage: 1200, pf: 0.9 } }),
  dev('appliance_generic', 460, 260, 'range', { name: 'Electric Range', state: { applianceKind: 'range', wattage: 8000, pf: 1 } }),
  dev('light_bulb', 600, 270, 'led', { name: 'LED Lamp', state: { lampType: 'led', wattage: 9, pf: 0.9 } }),
  dev('light_bulb', 690, 270, 'tube', { name: 'Fluorescent Tube', state: { lampType: 'fluorescent', wattage: 36, pf: 0.5 } }),
);
kitchen.w.push(
  ...feed('fridge', 'line', 'neutral', 'ground'), ...feed('rice', 'line', 'neutral', 'ground'),
  ...feed('micro', 'line', 'neutral', 'ground'), ...feed('range', 'line', 'neutral', 'ground'),
  ...feed('led', 'hot', 'neutral'), ...feed('tube', 'hot', 'neutral'),
);

// ── B · The octopus overload ─────────────────────────────────────────────────────────────────
const octo = main();
octo.d.push(
  dev('power_strip', 200, 260, 'strip', { name: 'PS1 Power Strip (10 A cord)', state: { slots: ['kettle', 'heater', 'iron', 'tv'], cordAmps: 10 } }),
);
octo.w.push(...feed('strip', 'line', 'neutral', 'ground'));

// ── C · Emergency light, exit sign, doorbell and ceiling fan ─────────────────────────────────
const extras = main();
extras.d.push(
  dev('switch_1gang', 60, 240, 'sw', { name: 'Wall Switch (lighting)', state: { closed: true } }),
  dev('light_bulb', 60, 440, 'room', { name: 'Room Light' }),
  dev('emergency_light', 250, 280, 'em', { name: 'EL1 Emergency Light (unswitched)', state: { kind: 'emergency' } }),
  dev('emergency_light', 400, 280, 'exit', { name: 'EL2 Exit Sign', state: { kind: 'exit_sign' } }),
  dev('doorbell_set', 560, 260, 'bell', { name: 'DB1 Doorbell Set' }),
  dev('switch_1gang', 580, 440, 'push', { name: 'Door Push Button', state: { closed: false } }),
  dev('fan_regulator', 60, 600, 'reg', { name: 'RG1 Fan Regulator', state: { step: 3, fanId: 'fan' } }),
  dev('appliance_fan', 200, 590, 'fan', { name: 'Ceiling Fan' }),
);
extras.w.push(
  wr('q1', 'out_1', 'sw', 'l_in', RED), wr('sw', 'sw_out', 'room', 'hot', ORANGE), wr('q1', 'out_2', 'room', 'neutral', BLUE),
  ...feed('em', 'l', 'n'), ...feed('exit', 'l', 'n'), ...feed('bell', 'l', 'n'),
  wr('bell', 'b1', 'push', 'l_in', ORANGE), wr('push', 'sw_out', 'bell', 'b2', ORANGE),
  wr('q1', 'out_1', 'reg', 'in', RED), wr('reg', 'out', 'fan', 'line', ORANGE), wr('q1', 'out_2', 'fan', 'neutral', BLUE),
);

export const BATCH36_LABS: LabLesson[] = [
  {
    id: 'lab-home-kitchen-loads',
    title: 'Kitchen Circuit: Cycling Appliances and Lamp Types',
    subtitle: 'Refrigerator, rice cooker, microwave, range and two lamp types on one feeder',
    category: 'appliances',
    badge: '🍳 Kitchen',
    difficulty: 'Intermediate',
    description:
      'Five appliances with their own behaviour hang on a 32 A feeder. The refrigerator and range cycle, the rice cooker drops to keep-warm, the microwave draws full power only while its timer runs. The LED lamp and the fluorescent tube have the same job but very different power factors.',
    objectives: [
      'Press ▶ Simulate and watch the total current on the feeder rise and fall as the refrigerator and range cycle.',
      'Click START on the microwave: the current steps up for 30 s. What is the total with the range element on as well?',
      'Compare the current of the 36 W fluorescent tube with the 9 W LED lamp: the tube draws far more than its watts suggest. Why?',
      'Let the rice cooker finish its cook time: the load drops to keep-warm.',
    ],
    project: labProject('proj_home_kitchen_loads', 'Kitchen Circuit', 'Cycling appliances and lamp types.', kitchen.d, kitchen.w),
  },
  {
    id: 'lab-home-octopus-overload',
    title: 'The Octopus Overload: A Power Strip with a 10 A Cord',
    subtitle: 'Kettle, heater, iron and TV on one strip: what trips first, the breaker or the cord?',
    category: 'appliances',
    badge: '🐙 Overload',
    difficulty: 'Beginner',
    description:
      'A power strip has a cord rated 10 A. Plugged in: a kettle, a heater, an iron and a TV, about 20 A in total. The 32 A breaker upstream is happy, so only the cord is protecting itself, by getting hot.',
    objectives: [
      'Press ▶ Simulate: the strip reports an overload and the cord heat bar starts to climb.',
      'Unplug the kettle and heater (click their sockets): the load drops under 10 A and the cord cools.',
      'Put them back and wait for the cord to burn out: the strip goes dead and the breaker never tripped. Which device was supposed to protect the cord?',
    ],
    project: labProject('proj_home_octopus_overload', 'Power Strip Overload', 'Power strip with a limited cord.', octo.d, octo.w),
  },
  {
    id: 'lab-home-emergency-extras',
    title: 'Emergency Lighting, Exit Sign, Doorbell and a Fan Regulator',
    subtitle: 'Unswitched supply for emergency lights, a 12 V doorbell loop and fan speed steps',
    category: 'residential',
    badge: '🚪 Home Extras',
    difficulty: 'Intermediate',
    description:
      'The emergency light and exit sign are fed straight from the breaker so their batteries always charge. The room light is on a wall switch. A bell transformer rings a chime when the push button closes its 12 V loop, and a regulator sets the speed of a ceiling fan.',
    objectives: [
      'Press ▶ Simulate and open the main breaker: the emergency light and exit sign run on their batteries while the room light goes dark.',
      'Close the main breaker again and read the charging state on the devices.',
      'Click the door push button: the doorbell rings and the secondary shows 12 V.',
      'Change the regulator step and watch the fan power change. Then rewire the emergency light through the wall switch and read the Code Inspector warning.',
    ],
    project: labProject('proj_home_emergency_extras', 'Emergency Lighting and Home Extras', 'Emergency light, exit sign, doorbell and fan regulator.', extras.d, extras.w),
  },
];
