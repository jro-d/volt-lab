import type { LadderBlock, LadderElement, LadderElementKind, LadderRung } from '../types/ladder';
import { BOX_KINDS, COIL_KINDS, type PlcProgram } from './plcEngine';

/** Pure editing operations on a PLC program (the editor keeps the history; every function returns a new program). */

let counter = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(++counter).toString(36)}`;

export const isOutputKind = (k: LadderElementKind) => (COIL_KINDS as readonly string[]).includes(k) || (BOX_KINDS as readonly string[]).includes(k) || k === 'LAMP';

/** Sensible defaults for a freshly dropped element */
export function makeElement(kind: LadderElementKind): LadderElement {
  const base: LadderElement = { id: newId('pe'), kind, tag: '', sub: '' };
  switch (kind) {
    case 'NO':
    case 'NC':
    case 'PEDGE':
    case 'NEDGE':
      return { ...base, address: 'I0.0' };
    case 'COIL':
    case 'NCOIL':
    case 'SET':
    case 'RESET':
      return { ...base, address: 'Q0.0' };
    case 'TON':
    case 'TOF':
    case 'TP':
      return { ...base, address: 'T0', preset: 1000 };
    case 'CTU':
    case 'CTD':
      return { ...base, address: 'C0', preset: 5 };
    case 'EQ':
    case 'GT':
    case 'LT':
      return { ...base, address: 'MW0', operandA: 'MW0', operandB: 0 };
    case 'MOV':
      return { ...base, address: 'MW0', operandA: 0 };
    case 'ADD':
      return { ...base, address: 'MW0', operandA: 'MW0', operandB: 1 };
    default:
      return base;
  }
}

const mapRungs = (p: PlcProgram, fn: (r: LadderRung, i: number) => LadderRung): PlcProgram => ({ ...p, rungs: p.rungs.map(fn) });

export function addRung(p: PlcProgram, afterRungId?: string): PlcProgram {
  const rung: LadderRung = { id: newId('pr'), blocks: [], output: null };
  const i = afterRungId ? p.rungs.findIndex((r) => r.id === afterRungId) : p.rungs.length - 1;
  const rungs = [...p.rungs];
  rungs.splice(i + 1, 0, rung);
  return { ...p, rungs };
}

export function removeRung(p: PlcProgram, rungId: string): PlcProgram {
  return { ...p, rungs: p.rungs.filter((r) => r.id !== rungId) };
}

export function moveRung(p: PlcProgram, rungId: string, delta: -1 | 1): PlcProgram {
  const i = p.rungs.findIndex((r) => r.id === rungId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.rungs.length) return p;
  const rungs = [...p.rungs];
  [rungs[i], rungs[j]] = [rungs[j], rungs[i]];
  return { ...p, rungs };
}

/** A copy of a rung with fresh ids (for copy / paste) */
export function cloneRung(r: LadderRung): LadderRung {
  const el = (e: LadderElement): LadderElement => ({ ...e, id: newId('pe') });
  return {
    id: newId('pr'),
    label: r.label,
    blocks: r.blocks.map((b): LadderBlock => ({ id: newId('pb'), branches: b.branches.map((br) => br.map(el)) })),
    output: r.output ? el(r.output) : null,
  };
}

export function pasteRung(p: PlcProgram, rung: LadderRung, afterRungId?: string): PlcProgram {
  const i = afterRungId ? p.rungs.findIndex((r) => r.id === afterRungId) : p.rungs.length - 1;
  const rungs = [...p.rungs];
  rungs.splice(i + 1, 0, cloneRung(rung));
  return { ...p, rungs };
}

/** Append a contact in series at the end of the input side of a rung */
export function appendContact(p: PlcProgram, rungId: string, el: LadderElement): PlcProgram {
  return mapRungs(p, (r) => (r.id === rungId ? { ...r, blocks: [...r.blocks, { id: newId('pb'), branches: [[el]] }] } : r));
}

/** Put a new contact in parallel with an existing element */
export function addParallel(p: PlcProgram, targetElementId: string, el: LadderElement): PlcProgram {
  return mapRungs(p, (r) => ({
    ...r,
    blocks: r.blocks.map((b) => (b.branches.some((br) => br.some((e) => e.id === targetElementId)) ? { ...b, branches: [...b.branches, [el]] } : b)),
  }));
}

export function setOutput(p: PlcProgram, rungId: string, el: LadderElement): PlcProgram {
  return mapRungs(p, (r) => (r.id === rungId ? { ...r, output: el } : r));
}

export function removeElement(p: PlcProgram, elementId: string): PlcProgram {
  return mapRungs(p, (r) => ({
    ...r,
    output: r.output?.id === elementId ? null : r.output,
    blocks: r.blocks
      .map((b) => ({ ...b, branches: b.branches.map((br) => br.filter((e) => e.id !== elementId)).filter((br) => br.length > 0) }))
      .filter((b) => b.branches.length > 0),
  }));
}

export function updateElement(p: PlcProgram, elementId: string, patch: Partial<LadderElement>): PlcProgram {
  const up = (e: LadderElement) => (e.id === elementId ? { ...e, ...patch } : e);
  return mapRungs(p, (r) => ({ ...r, output: r.output ? up(r.output) : null, blocks: r.blocks.map((b) => ({ ...b, branches: b.branches.map((br) => br.map(up)) })) }));
}

export function updateRung(p: PlcProgram, rungId: string, patch: Partial<LadderRung>): PlcProgram {
  return mapRungs(p, (r) => (r.id === rungId ? { ...r, ...patch } : r));
}

export function findElement(p: PlcProgram, elementId: string): { element: LadderElement; rungId: string } | null {
  for (const r of p.rungs) {
    if (r.output?.id === elementId) return { element: r.output, rungId: r.id };
    for (const b of r.blocks) for (const br of b.branches) for (const e of br) if (e.id === elementId) return { element: e, rungId: r.id };
  }
  return null;
}
