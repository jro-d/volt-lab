import type { LadderBlock, LadderElement, LadderElementKind, LadderRung } from '../types/ladder';
import type { PlcProgram } from '../core/plcEngine';

/**
 * Ready-made PLC programs. Inputs are I0.x (24 V DC PLC: terminals i0-i7; micro PLC: i1-i4 = I0.0-I0.3),
 * outputs Q0.x. A STOP push button is wired normally closed, so its input is TRUE while healthy.
 */

let seq = 0;
const el = (kind: LadderElementKind, address: string, extra: Partial<LadderElement> = {}): LadderElement => ({
  id: `pe${++seq}`,
  kind,
  tag: address,
  sub: '',
  address,
  ...extra,
});
const no = (a: string) => el('NO', a);
const nc = (a: string) => el('NC', a);
/** Contacts in series */
const series = (...els: LadderElement[]): LadderBlock[] => els.map((e) => ({ id: `pb${++seq}`, branches: [[e]] }));
/** Parallel branches (each a series of contacts) as one block */
const par = (...branches: LadderElement[][]): LadderBlock => ({ id: `pb${++seq}`, branches });
const rung = (blocks: LadderBlock[], output: LadderElement, label?: string): LadderRung => ({ id: `pr${++seq}`, label, blocks, output });

export interface PlcPreset {
  id: string;
  name: string;
  description: string;
  /** Which inputs / outputs to wire, for the editor's help text */
  wiring: string;
  build: () => PlcProgram;
}

export const PLC_PRESETS: PlcPreset[] = [
  {
    id: 'start_stop_latch',
    name: 'Start / Stop latch',
    description: 'START seals itself in through Q0.0. STOP (wired normally closed) drops it.',
    wiring: 'I0.0 START (NO), I0.1 STOP (NC wiring), Q0.0 motor contactor',
    build: () => ({
      v: 1,
      scanMs: 100,
      presetId: 'start_stop_latch',
      symbols: { 'I0.0': 'START', 'I0.1': 'STOP', 'Q0.0': 'MOTOR' },
      rungs: [rung([par([no('I0.0')], [no('Q0.0')]), ...series(no('I0.1'))], el('COIL', 'Q0.0'), 'Latch')],
    }),
  },
  {
    id: 'ton_delayed_start',
    name: 'TON delayed start',
    description: 'Closing the enable switch starts a 5 s on-delay timer; the motor starts when it finishes. A waiting lamp shows while it counts.',
    wiring: 'I0.0 ENABLE, Q0.0 motor, Q0.1 waiting lamp',
    build: () => ({
      v: 1,
      scanMs: 100,
      presetId: 'ton_delayed_start',
      symbols: { 'I0.0': 'ENABLE', 'T0': 'START_DELAY', 'Q0.0': 'MOTOR', 'Q0.1': 'WAITING' },
      rungs: [
        rung(series(no('I0.0')), el('TON', 'T0', { preset: 5000 }), 'Delay timer'),
        rung(series(no('T0')), el('COIL', 'Q0.0'), 'Motor'),
        rung(series(no('I0.0'), nc('T0')), el('COIL', 'Q0.1'), 'Waiting lamp'),
      ],
    }),
  },
  {
    id: 'traffic_light',
    name: 'Traffic light',
    description: 'Red 4 s, green 4 s, amber 2 s, repeating while enabled. Three on-delay timers share one cycle and restart together.',
    wiring: 'I0.0 ENABLE, Q0.0 red, Q0.1 amber, Q0.2 green',
    build: () => ({
      v: 1,
      scanMs: 100,
      presetId: 'traffic_light',
      symbols: { 'I0.0': 'ENABLE', 'T0': 'RED_END', 'T1': 'GREEN_END', 'T2': 'CYCLE_END', 'Q0.0': 'RED', 'Q0.1': 'AMBER', 'Q0.2': 'GREEN' },
      rungs: [
        rung(series(no('I0.0'), nc('T2')), el('TON', 'T0', { preset: 4000 }), 'Red time'),
        rung(series(no('I0.0'), nc('T2')), el('TON', 'T1', { preset: 8000 }), 'Red + green'),
        rung(series(no('I0.0'), nc('T2')), el('TON', 'T2', { preset: 10000 }), 'Full cycle'),
        rung(series(no('I0.0'), nc('T0')), el('COIL', 'Q0.0'), 'Red'),
        rung(series(no('T0'), nc('T1')), el('COIL', 'Q0.2'), 'Green'),
        rung(series(no('T1'), nc('T2')), el('COIL', 'Q0.1'), 'Amber'),
      ],
    }),
  },
  {
    id: 'conveyor_counter',
    name: 'Conveyor counter',
    description: 'A sensor counts parts on the belt (up counter). After 5 parts the belt stops and the BATCH FULL lamp lights; the reset button starts a new batch.',
    wiring: 'I0.0 part sensor, I0.1 RESET, I0.2 RUN switch, Q0.0 conveyor motor, Q0.1 batch-full lamp',
    build: () => ({
      v: 1,
      scanMs: 100,
      presetId: 'conveyor_counter',
      symbols: { 'I0.0': 'PART_SENSOR', 'I0.1': 'RESET', 'I0.2': 'RUN', 'C0': 'PARTS', 'Q0.0': 'CONVEYOR', 'Q0.1': 'BATCH_FULL' },
      rungs: [
        rung(series(no('I0.0')), el('CTU', 'C0', { preset: 5, resetAddress: 'I0.1' }), 'Count parts'),
        rung(series(no('I0.2'), nc('C0')), el('COIL', 'Q0.0'), 'Conveyor'),
        rung(series(no('C0')), el('COIL', 'Q0.1'), 'Batch full'),
      ],
    }),
  },
  {
    id: 'two_motor_sequence',
    name: 'Two-motor sequence',
    description: 'START latches motor 1; motor 2 follows 3 s later. STOP (wired normally closed) drops both at once.',
    wiring: 'I0.0 START, I0.1 STOP (NC wiring), Q0.0 motor 1, Q0.1 motor 2',
    build: () => ({
      v: 1,
      scanMs: 100,
      presetId: 'two_motor_sequence',
      symbols: { 'I0.0': 'START', 'I0.1': 'STOP', 'M0.0': 'RUN', 'T0': 'M2_DELAY', 'Q0.0': 'MOTOR_1', 'Q0.1': 'MOTOR_2' },
      rungs: [
        rung([par([no('I0.0')], [no('M0.0')]), ...series(no('I0.1'))], el('COIL', 'M0.0'), 'Run latch'),
        rung(series(no('M0.0')), el('COIL', 'Q0.0'), 'Motor 1'),
        rung(series(no('M0.0')), el('TON', 'T0', { preset: 3000 }), 'Motor 2 delay'),
        rung(series(no('T0')), el('COIL', 'Q0.1'), 'Motor 2'),
      ],
    }),
  },
  {
    id: 'tank_level',
    name: 'Tank level control',
    description: 'The low-level float starts the pump (set), the high-level float stops it (reset). If the pump runs for more than 8 s the alarm lamp lights.',
    wiring: 'I0.0 LOW level, I0.1 HIGH level, Q0.0 pump, Q0.1 alarm lamp',
    build: () => ({
      v: 1,
      scanMs: 100,
      presetId: 'tank_level',
      symbols: { 'I0.0': 'LEVEL_LOW', 'I0.1': 'LEVEL_HIGH', 'Q0.0': 'PUMP', 'T0': 'RUN_TOO_LONG', 'Q0.1': 'ALARM' },
      rungs: [
        rung(series(no('I0.0')), el('SET', 'Q0.0'), 'Start on low'),
        rung(series(no('I0.1')), el('RESET', 'Q0.0'), 'Stop on high'),
        rung(series(no('Q0.0')), el('TON', 'T0', { preset: 8000 }), 'Run-time watchdog'),
        rung(series(no('T0')), el('COIL', 'Q0.1'), 'Alarm'),
      ],
    }),
  },
];

export const blankProgram = (): PlcProgram => ({ v: 1, scanMs: 100, symbols: {}, rungs: [] });
