import type { LadderElement, LadderRung } from '../types/ladder';

/**
 * PLC scan engine: cyclic scan over a ladder program (read inputs, solve the rungs top to bottom, write outputs).
 *
 * Address space (IEC style, one 8-bit byte each):
 *   I0.0-I0.7  inputs (from the wired terminals, solved by the circuit solver)
 *   Q0.0-Q0.7  outputs (written back to the PLC's relay / transistor outputs)
 *   M0.0-M0.7  memory bits          MW0-MW7  memory words (16-bit signed)
 *   T0-T7      timers (contact = Q bit)         C0-C7  counters (contact = Q bit)
 *
 * Rung model: blocks in series, each block a set of parallel branches, each branch a series of contacts, then one
 * output element (coil, set, reset, negated coil, timer, counter, MOV or ADD). The engine is pure: it returns a
 * new runtime and never touches the DOM or the circuit solver.
 */

export interface PlcProgram {
  v: 1;
  /** Scan time in milliseconds (10-500) */
  scanMs: number;
  rungs: LadderRung[];
  /** Symbolic names for addresses, e.g. { 'I0.0': 'START' } */
  symbols: Record<string, string>;
  presetId?: string;
}

export interface TimerState {
  acc: number;
  q: boolean;
  prevIn: boolean;
  active?: boolean;
}
export interface CounterState {
  acc: number;
  q: boolean;
  prevIn: boolean;
}

export interface PlcRuntime {
  bits: Record<string, boolean>;
  words: Record<string, number>;
  timers: Record<string, TimerState>;
  counters: Record<string, CounterState>;
  /** Previous value of the bit behind each edge contact, by element id */
  prev: Record<string, boolean>;
  /** Power-flow for the monitor: element id -> power passes through it */
  flow: Record<string, boolean>;
  rungPower: Record<string, boolean>;
  scans: number;
}

export interface PlcForces {
  inputs: Record<string, boolean>;
  outputs: Record<string, boolean>;
}

export const emptyRuntime = (): PlcRuntime => ({ bits: {}, words: {}, timers: {}, counters: {}, prev: {}, flow: {}, rungPower: {}, scans: 0 });

export type AddressKind = 'I' | 'Q' | 'M' | 'MW' | 'T' | 'C';
const PATTERNS: [AddressKind, RegExp][] = [
  ['I', /^I[01]\.[0-7]$/],
  ['Q', /^Q[01]\.[0-7]$/],
  ['M', /^M0\.[0-7]$/],
  ['MW', /^MW[0-7]$/],
  ['T', /^T[0-7]$/],
  ['C', /^C[0-7]$/],
];
export const addressKind = (a: string | undefined): AddressKind | null => {
  if (!a) return null;
  for (const [k, re] of PATTERNS) if (re.test(a)) return k;
  return null;
};
/** I0.0-I1.7 and Q0.0-Q1.7: the 16 in / 16 out PLC uses both bytes, the others only the first */
export const ALL_INPUTS = Array.from({ length: 16 }, (_, i) => `I${i >> 3}.${i & 7}`);
export const ALL_OUTPUTS = Array.from({ length: 16 }, (_, i) => `Q${i >> 3}.${i & 7}`);
export const ALL_MEMORY_BITS = Array.from({ length: 8 }, (_, i) => `M0.${i}`);
export const ALL_WORDS = Array.from({ length: 8 }, (_, i) => `MW${i}`);
export const ALL_TIMERS = Array.from({ length: 8 }, (_, i) => `T${i}`);
export const ALL_COUNTERS = Array.from({ length: 8 }, (_, i) => `C${i}`);

export const CONTACT_KINDS = ['NO', 'NC', 'PEDGE', 'NEDGE', 'EQ', 'GT', 'LT'] as const;
export const COIL_KINDS = ['COIL', 'NCOIL', 'SET', 'RESET'] as const;
export const BOX_KINDS = ['TON', 'TOF', 'TP', 'CTU', 'CTD', 'MOV', 'ADD'] as const;
const isContact = (k: string) => (CONTACT_KINDS as readonly string[]).includes(k);

export function readBit(rt: PlcRuntime, addr: string | undefined): boolean {
  const kind = addressKind(addr);
  if (!addr || !kind) return false;
  if (kind === 'T') return !!rt.timers[addr]?.q;
  if (kind === 'C') return !!rt.counters[addr]?.q;
  if (kind === 'MW') return false;
  return !!rt.bits[addr];
}

/** A numeric operand: a literal, a memory word, a timer's elapsed milliseconds or a counter's value. */
export function readNumber(rt: PlcRuntime, v: string | number | undefined): number {
  if (typeof v === 'number') return v;
  if (v === undefined || v === '') return 0;
  const kind = addressKind(v);
  if (kind === 'MW') return rt.words[v] ?? 0;
  if (kind === 'T') return rt.timers[v]?.acc ?? 0;
  if (kind === 'C') return rt.counters[v]?.acc ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const clamp16 = (n: number) => Math.max(-32768, Math.min(32767, Math.trunc(n)));

/** Truth value of a contact-like element (edge contacts update their memory here, once per scan). */
function contactValue(el: LadderElement, rt: PlcRuntime): boolean {
  switch (el.kind as string) {
    case 'NO':
      return readBit(rt, el.address);
    case 'NC':
      return !readBit(rt, el.address);
    case 'PEDGE':
    case 'NEDGE': {
      const cur = readBit(rt, el.address);
      const prev = !!rt.prev[el.id];
      rt.prev[el.id] = cur;
      return el.kind === ('PEDGE' as string) ? cur && !prev : !cur && prev;
    }
    case 'EQ':
      return readNumber(rt, el.operandA) === readNumber(rt, el.operandB);
    case 'GT':
      return readNumber(rt, el.operandA) > readNumber(rt, el.operandB);
    case 'LT':
      return readNumber(rt, el.operandA) < readNumber(rt, el.operandB);
    default:
      return false;
  }
}

function runOutput(el: LadderElement, power: boolean, rt: PlcRuntime, scanMs: number) {
  const addr = el.address;
  const kind = addressKind(addr);
  const setBit = (v: boolean) => {
    if (addr && (kind === 'Q' || kind === 'M')) rt.bits[addr] = v;
  };
  switch (el.kind as string) {
    case 'COIL':
    case 'LAMP':
      setBit(power);
      break;
    case 'NCOIL':
      setBit(!power);
      break;
    case 'SET':
      if (power) setBit(true);
      break;
    case 'RESET':
      if (power) setBit(false);
      break;
    case 'TON':
    case 'TOF':
    case 'TP': {
      if (!addr || kind !== 'T') break;
      const t = (rt.timers[addr] ??= { acc: 0, q: false, prevIn: false });
      const preset = Math.max(0, el.preset ?? 1000);
      if (el.kind === ('TON' as string)) {
        t.acc = power ? Math.min(preset, t.acc + scanMs) : 0;
        t.q = power && t.acc >= preset;
      } else if (el.kind === ('TOF' as string)) {
        if (power) {
          t.acc = 0;
          t.q = true;
        } else if (t.q) {
          t.acc = Math.min(preset, t.acc + scanMs);
          if (t.acc >= preset) t.q = false;
        } else {
          t.acc = 0;
        }
      } else {
        if (power && !t.prevIn && !t.active) {
          t.active = true;
          t.acc = 0;
        }
        if (t.active) {
          t.acc = Math.min(preset, t.acc + scanMs);
          t.q = t.acc < preset;
          if (t.acc >= preset) t.active = false;
        } else {
          t.q = false;
        }
      }
      t.prevIn = power;
      break;
    }
    case 'CTU':
    case 'CTD': {
      if (!addr || kind !== 'C') break;
      const preset = Math.max(0, Math.trunc(el.preset ?? 10));
      const c = (rt.counters[addr] ??= { acc: el.kind === ('CTD' as string) ? preset : 0, q: false, prevIn: false });
      const reset = el.resetAddress ? readBit(rt, el.resetAddress) : false;
      const edge = power && !c.prevIn;
      if (el.kind === ('CTU' as string)) {
        if (reset) c.acc = 0;
        else if (edge) c.acc = Math.min(32767, c.acc + 1);
        c.q = c.acc >= preset;
      } else {
        if (reset) c.acc = preset;
        else if (edge) c.acc = Math.max(0, c.acc - 1);
        c.q = c.acc <= 0;
      }
      c.prevIn = power;
      break;
    }
    case 'MOV':
      if (power && el.address && kind === 'MW') rt.words[el.address] = clamp16(readNumber(rt, el.operandA));
      break;
    case 'ADD':
      if (power && el.address && kind === 'MW') rt.words[el.address] = clamp16(readNumber(rt, el.operandA) + readNumber(rt, el.operandB));
      break;
    default:
      break;
  }
}

export interface ScanResult {
  runtime: PlcRuntime;
  /** Output bits Q0.0-Q0.7 after forcing */
  outputs: Record<string, boolean>;
}

/**
 * One scan. `inputs` are the input bits read from the terminals (keys I0.0-I0.7). Forced inputs override them,
 * forced outputs override the program's result. The runtime passed in is not modified.
 */
export function scanProgram(program: PlcProgram, runtime: PlcRuntime, inputs: Record<string, boolean>, forces: PlcForces = { inputs: {}, outputs: {} }): ScanResult {
  const rt: PlcRuntime = {
    bits: { ...runtime.bits },
    words: { ...runtime.words },
    timers: Object.fromEntries(Object.entries(runtime.timers).map(([k, v]) => [k, { ...v }])),
    counters: Object.fromEntries(Object.entries(runtime.counters).map(([k, v]) => [k, { ...v }])),
    prev: { ...runtime.prev },
    flow: {},
    rungPower: {},
    scans: runtime.scans + 1,
  };
  const scanMs = Math.max(10, Math.min(500, program.scanMs || 100));

  // 1. read inputs
  for (const a of ALL_INPUTS) rt.bits[a] = a in forces.inputs ? !!forces.inputs[a] : !!inputs[a];

  // 2. solve the rungs top to bottom (memory updates are visible to the rungs below)
  for (const rung of program.rungs) {
    let power: boolean = true;
    for (const block of rung.blocks) {
      let blockOut: boolean = false;
      for (const branch of block.branches) {
        let flow: boolean = power;
        for (const el of branch) {
          const v = isContact(el.kind) ? contactValue(el, rt) : true;
          flow = flow && v;
          rt.flow[el.id] = flow;
        }
        if (branch.length === 0) flow = false;
        blockOut = blockOut || flow;
      }
      if (block.branches.length === 0) blockOut = false;
      power = blockOut;
    }
    rt.rungPower[rung.id] = power;
    if (rung.output) {
      rt.flow[rung.output.id] = power;
      runOutput(rung.output, power, rt, scanMs);
    }
  }

  // 3. write outputs (forces win)
  const outputs: Record<string, boolean> = {};
  for (const a of ALL_OUTPUTS) {
    if (a in forces.outputs) rt.bits[a] = !!forces.outputs[a];
    outputs[a] = !!rt.bits[a];
  }
  return { runtime: rt, outputs };
}

export interface PlcIssue {
  severity: 'error' | 'warning';
  rungId?: string;
  message: string;
}

/** Static checks: duplicate output coils, unconnected rung ends, unused or never-written addresses. */
export function validateProgram(program: PlcProgram): PlcIssue[] {
  const issues: PlcIssue[] = [];
  const coilUse = new Map<string, number[]>();
  const read = new Set<string>();
  const written = new Set<string>();
  program.rungs.forEach((rung, idx) => {
    const n = idx + 1;
    if (!rung.output) issues.push({ severity: 'error', rungId: rung.id, message: `Rung ${n} has no output: its right end is not connected.` });
    if (rung.blocks.length === 0) issues.push({ severity: 'warning', rungId: rung.id, message: `Rung ${n} has no input contacts: its output is always powered.` });
    for (const block of rung.blocks) {
      if (block.branches.length === 0 || block.branches.some((b) => b.length === 0)) {
        issues.push({ severity: 'error', rungId: rung.id, message: `Rung ${n} has an empty branch: the rung is not connected through.` });
      }
      for (const el of block.branches.flat()) {
        if (!isContact(el.kind)) continue;
        if (el.kind === ('EQ' as string) || el.kind === ('GT' as string) || el.kind === ('LT' as string)) {
          [el.operandA, el.operandB].forEach((o) => typeof o === 'string' && addressKind(o) && read.add(o));
        } else if (!addressKind(el.address)) {
          issues.push({ severity: 'error', rungId: rung.id, message: `Rung ${n}: a contact has no valid address.` });
        } else read.add(el.address!);
      }
    }
    const out = rung.output;
    if (out) {
      if (!addressKind(out.address)) issues.push({ severity: 'error', rungId: rung.id, message: `Rung ${n}: the output has no valid address.` });
      if (out.address) written.add(out.address);
      if (out.kind === ('COIL' as string) || out.kind === ('NCOIL' as string) || out.kind === ('LAMP' as string)) {
        coilUse.set(out.address || '', [...(coilUse.get(out.address || '') || []), n]);
      }
      if (['TON', 'TOF', 'TP', 'CTU', 'CTD'].includes(out.kind) && (out.preset === undefined || out.preset <= 0)) {
        issues.push({ severity: 'error', rungId: rung.id, message: `Rung ${n}: ${out.address || 'timer / counter'} has no preset.` });
      }
      if (out.kind === ('MOV' as string) || out.kind === ('ADD' as string)) {
        [out.operandA, out.operandB].forEach((o) => typeof o === 'string' && addressKind(o) && read.add(o));
      }
      if (out.resetAddress) read.add(out.resetAddress);
    }
  });
  for (const [addr, rungs] of coilUse) {
    if (addr && rungs.length > 1) issues.push({ severity: 'error', message: `Duplicate output coil ${addr} on rungs ${rungs.join(', ')}: only the last one wins.` });
  }
  for (const addr of read) {
    const k = addressKind(addr);
    if ((k === 'Q' || k === 'M' || k === 'MW' || k === 'T' || k === 'C') && !written.has(addr)) {
      issues.push({ severity: 'warning', message: `${addr} is read but never written by any rung.` });
    }
  }
  for (const [addr, name] of Object.entries(program.symbols)) {
    if (!read.has(addr) && !written.has(addr)) issues.push({ severity: 'warning', message: `Symbol ${name} (${addr}) is not used by any rung.` });
  }
  return issues;
}

/** Input / output terminal keys of a PLC device for each address. */
export function ioMap(type: string): { inputs: Record<string, string>; outputs: Record<string, string> } {
  if (type === 'plc_micro_controller') {
    return {
      inputs: { 'I0.0': 'i1', 'I0.1': 'i2', 'I0.2': 'i3', 'I0.3': 'i4' },
      outputs: { 'Q0.0': 'q1', 'Q0.1': 'q2', 'Q0.2': 'q3', 'Q0.3': 'q4' },
    };
  }
  const inputs: Record<string, string> = {};
  const outputs: Record<string, string> = {};
  const count = type === 'plc_24vdc_32io' ? 16 : 8;
  for (let n = 0; n < count; n++) {
    inputs[`I${n >> 3}.${n & 7}`] = `i${n}`;
    outputs[`Q${n >> 3}.${n & 7}`] = `q${n}`;
  }
  return { inputs, outputs };
}
