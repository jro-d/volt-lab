import type { ElectricalDevice, ElectricalProject, ElectricalWire, LabTarget } from '../types/electrical';
import { parsePhysicalLadder, verifyLadderAgainstPhysical } from './ladderEngine';

/**
 * Graded lab mode. A lab target says which devices and connections the finished work must have, whether the
 * control ladder must be right and whether the Code Inspector must show no errors. "Check my work" compares the
 * student's project with it and returns a checklist with partial credit. Unless the target has `showSolution`
 * the checklist only says how many items are right, never which connection is missing.
 */

/** Labs that come with a graded exercise (the motor-control labs and the staircase lighting lab). */
export const GRADED_LAB_IDS = [
  'lab-marine-dol-440v',
  'lab-forward-reverse-interlock',
  'lab-wye-delta-starter',
  'lab-pump-hoa-float',
  'lab-phase-monitor-dol',
  'lab-capacitor-start-motor',
  'lab-ctl-staircase-impulse',
];

const termKey = (d: string, t: string) => `${d}:${t}`;
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Build the target from a finished reference project: its device types and its wired connections. */
export function deriveTarget(reference: ElectricalProject, labId: string, title: string, showSolution = false): LabTarget {
  const counts = new Map<string, number>();
  for (const d of reference.devices) counts.set(d.type, (counts.get(d.type) || 0) + 1);
  const seen = new Set<string>();
  const connections: [string, string][] = [];
  for (const w of reference.wires) {
    const a = termKey(w.fromDeviceId, w.fromTerminalId);
    const b = termKey(w.toDeviceId, w.toTerminalId);
    const k = pairKey(a, b);
    if (seen.has(k) || a === b) continue;
    seen.add(k);
    connections.push([a, b]);
  }
  return {
    v: 1,
    labId,
    title,
    devices: [...counts].map(([type, count]) => ({ type, count })),
    connections,
    needsLadder: !!reference.targetLadder && reference.targetLadder.length > 0,
    noErrors: true,
    showSolution,
  };
}

/** The exercise: the reference devices on the bench with no wiring and no ladder, plus the target. */
export function exerciseProject(reference: ElectricalProject, labId: string, title: string, showSolution = false): ElectricalProject {
  const copy: ElectricalProject = JSON.parse(JSON.stringify(reference));
  return { ...copy, id: `${reference.id}_exercise`, title: `${title} (exercise)`, wires: [], ladder: [], target: deriveTarget(reference, labId, title, showSolution) };
}

/** Nets of the student's wiring (union of the terminals each wire joins). */
function nets(wires: ElectricalWire[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  for (const w of wires) {
    const a = find(termKey(w.fromDeviceId, w.fromTerminalId));
    const b = find(termKey(w.toDeviceId, w.toTerminalId));
    if (a !== b) parent.set(a, b);
  }
  const out = new Map<string, string>();
  for (const k of [...parent.keys()]) out.set(k, find(k));
  return out;
}

export interface ChecklistItem {
  id: 'devices' | 'connections' | 'ladder' | 'inspector';
  label: string;
  points: number;
  max: number;
  status: 'pass' | 'partial' | 'fail';
  detail: string;
}

export interface GradeResult {
  labId: string;
  title: string;
  items: ChecklistItem[];
  score: number;
  max: number;
  percent: number;
}

const WEIGHTS = { devices: 20, connections: 50, ladder: 15, inspector: 15 };

export function gradeWork(project: ElectricalProject, target: LabTarget, inspectorErrors: number): GradeResult {
  const items: ChecklistItem[] = [];
  const status = (got: number, need: number): ChecklistItem['status'] => (got >= need ? 'pass' : got > 0 ? 'partial' : 'fail');

  // devices: by type and count
  const have = new Map<string, number>();
  for (const d of project.devices) have.set(d.type, (have.get(d.type) || 0) + 1);
  let needTotal = 0;
  let gotTotal = 0;
  const missingTypes: string[] = [];
  for (const r of target.devices) {
    needTotal += r.count;
    const g = Math.min(have.get(r.type) || 0, r.count);
    gotTotal += g;
    if (g < r.count) missingTypes.push(`${r.count - g} x ${r.type}`);
  }
  items.push({
    id: 'devices',
    label: 'Required devices placed',
    points: needTotal ? Math.round((WEIGHTS.devices * gotTotal) / needTotal * 10) / 10 : WEIGHTS.devices,
    max: WEIGHTS.devices,
    status: status(gotTotal, needTotal),
    detail: `${gotTotal} of ${needTotal} devices${target.showSolution && missingTypes.length ? `. Missing: ${missingTypes.join(', ')}` : ''}`,
  });

  // connections: order independent, same net counts
  const net = nets(project.wires);
  const sameNet = (a: string, b: string) => a === b || (net.has(a) && net.has(b) && net.get(a) === net.get(b));
  let made = 0;
  const missing: string[] = [];
  for (const [a, b] of target.connections) {
    if (sameNet(a, b)) made++;
    else missing.push(`${a} - ${b}`);
  }
  items.push({
    id: 'connections',
    label: 'Required connections made',
    points: target.connections.length ? Math.round((WEIGHTS.connections * made) / target.connections.length * 10) / 10 : WEIGHTS.connections,
    max: WEIGHTS.connections,
    status: status(made, target.connections.length),
    detail: `${made} of ${target.connections.length} connections${target.showSolution && missing.length ? `. Missing: ${missing.slice(0, 12).join('; ')}${missing.length > 12 ? ' ...' : ''}` : ''}`,
  });

  // ladder
  if (target.needsLadder) {
    const rungs = (project.ladder ?? []).filter((r) => r.blocks.length > 0 || r.output);
    let ok = false;
    let detail = 'The ladder is empty';
    if (rungs.length > 0) {
      const msgs = verifyLadderAgainstPhysical(project.ladder ?? [], parsePhysicalLadder(project.devices as ElectricalDevice[], project.wires), project.devices, project.wires);
      const errors = msgs.filter((m) => m.level === 'error').length;
      ok = errors === 0;
      detail = ok ? 'The ladder matches the wiring' : `${errors} problem${errors === 1 ? '' : 's'} between the ladder and the wiring`;
    }
    items.push({ id: 'ladder', label: 'Control ladder matches the wiring', points: ok ? WEIGHTS.ladder : 0, max: WEIGHTS.ladder, status: ok ? 'pass' : 'fail', detail });
  }

  // code inspector
  if (target.noErrors) {
    const ok = inspectorErrors === 0;
    // Only meaningful once there is wiring to inspect: an empty project has no errors, which is not an achievement
    const credited = ok && project.wires.length > 0;
    items.push({
      id: 'inspector',
      label: 'Code Inspector shows no errors',
      points: credited ? WEIGHTS.inspector : 0,
      max: WEIGHTS.inspector,
      status: credited ? 'pass' : 'fail',
      detail: project.wires.length === 0 ? 'No wiring yet' : ok ? 'No errors' : `${inspectorErrors} error${inspectorErrors === 1 ? '' : 's'} reported`,
    });
  }

  const max = items.reduce((s, i) => s + i.max, 0);
  const score = Math.round(items.reduce((s, i) => s + i.points, 0) * 10) / 10;
  return { labId: target.labId, title: target.title, items, score, max, percent: max ? Math.round((score / max) * 100) : 0 };
}

export interface StudentInfo {
  name: string;
  course: string;
  section: string;
}

/** JSON a student hands in: header, result, timestamp. No hidden faults or solutions are included. */
export function resultJson(student: StudentInfo, result: GradeResult, when = new Date(), isolation?: { mode: string; done: string[] }): string {
  return JSON.stringify({ app: 'WireWise', v: 1, student, labId: result.labId, title: result.title, score: result.score, max: result.max, percent: result.percent, checklist: result.items.map((i) => ({ id: i.id, label: i.label, points: i.points, max: i.max, status: i.status, detail: i.detail })), timestamp: when.toISOString(), ...(isolation && isolation.done.length > 0 ? { safeIsolation: { mode: isolation.mode, stepsDone: isolation.done } } : {}) }, null, 2);
}
