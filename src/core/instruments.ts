import type { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { solveCircuit, type SolvedCircuit } from './circuitSolver';

/**
 * Test instruments (insulation tester, earth tester, phase rotation meter, continuity buzzer). They are tools, not
 * workbench devices: the user picks one and clicks terminals. The readings come from the wiring graph and from
 * properties on the devices, never from invented numbers.
 */

export type InstrumentId = 'dmm' | 'megger' | 'earth' | 'rotation' | 'continuity';
export type Reading = { label: string; primary: string; secondary?: string; ok?: boolean; beep?: boolean };

const key = (d: string, t: string) => `${d}:${t}`;
const termName = (devices: ElectricalDevice[], id: string, t: string) => {
  const d = devices.find((x) => x.id === id);
  return `${d?.name?.split(' ')[0] || id}.${d?.terminals.find((x) => x.id === t)?.label || t}`;
};

/** Everything electrically joined to `start` (wires and closed contacts at rest) */
function reach(adjacency: Record<string, string[]>, start: string): Set<string> {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of adjacency[cur] ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return seen;
}

/** The wiring graph with all contacts at rest. */
export function wiringGraph(devices: ElectricalDevice[], wires: ElectricalWire[]): Record<string, string[]> {
  // Deep copy: the graph pass touches device state
  const copy = JSON.parse(JSON.stringify(devices)) as ElectricalDevice[];
  return solveCircuit(copy, wires, 'PEC', 230, { graphOnly: true }).adjacency ?? {};
}

export const INSULATION_GOOD_MOHM = 1;
const INSULATION_CAP_MOHM = 999;

/**
 * Insulation resistance between two terminals (or a terminal and PE). Refuses on an energized circuit. A closed
 * path between the two points reads 0 (a short). Otherwise the reading is the lowest `insulationMOhm` of any device
 * wired into either side (default: above range).
 */
export function measureInsulation(
  devices: ElectricalDevice[], wires: ElectricalWire[], a: [string, string], b: [string, string], testVolts: number, energized: boolean
): Reading {
  const label = `INSULATION ${testVolts} V: ${termName(devices, ...a)} ↔ ${termName(devices, ...b)}`;
  if (energized) {
    return { label, primary: 'ENERGIZED', secondary: 'Isolate the circuit first (stop the simulation). Never megger a live circuit.', ok: false };
  }
  const graph = wiringGraph(devices, wires);
  const ra = reach(graph, key(...a));
  if (ra.has(key(...b))) return { label, primary: '0.00 MΩ', secondary: 'The two points are connected: a short, or you are testing one conductor against itself.', ok: false };
  const side = new Set([...ra, ...reach(graph, key(...b))]);
  let worst = INSULATION_CAP_MOHM;
  for (const node of side) {
    const d = devices.find((x) => x.id === node.slice(0, node.lastIndexOf(':')));
    const v = d ? Number(d.state.insulationMOhm) : NaN;
    if (Number.isFinite(v) && v >= 0) worst = Math.min(worst, v);
  }
  const text = worst >= INSULATION_CAP_MOHM ? `>${INSULATION_CAP_MOHM} MΩ` : `${worst.toFixed(2)} MΩ`;
  const ok = worst >= INSULATION_GOOD_MOHM;
  return {
    label,
    primary: text,
    secondary: ok ? `Above ${INSULATION_GOOD_MOHM} MΩ (a common minimum for low-voltage circuits; confirm the value your code requires)` : `Below ${INSULATION_GOOD_MOHM} MΩ: insulation is damaged or wet, do not energize`,
    ok,
  };
}

/** Earth resistance of a ground pit electrode (needs the pit's rod clamp terminal). */
export function measureEarthResistance(devices: ElectricalDevice[], deviceId: string): Reading {
  const pit = devices.find((d) => d.id === deviceId);
  if (!pit || pit.type !== 'ground_pit') {
    return { label: 'EARTH TESTER', primary: 'NO ELECTRODE', secondary: 'Click the rod clamp of a ground pit.', ok: false };
  }
  const ohms = Number(pit.state.earthResistanceOhms ?? 5);
  return { label: `EARTH TEST: ${pit.name || pit.id}`, primary: `${ohms.toFixed(1)} Ω`, secondary: ohms > EARTH_NOTE_OHMS ? `High for an electrode (over ${EARTH_NOTE_OHMS} Ω rule of thumb): check the rod, soil and clamp` : 'Electrode resistance to earth', ok: ohms <= EARTH_NOTE_OHMS };
}
/** Rule-of-thumb level used for notes only; the project does not cite a code limit. */
export const EARTH_NOTE_OHMS = 25;

const CW = ['L1,L2,L3', 'L2,L3,L1', 'L3,L1,L2'];
/** Phase rotation from three energized terminals clicked in order L1, L2, L3. */
export function measureRotation(solved: SolvedCircuit, probes: [string, string][]): Reading {
  const nodes = probes.map((p) => key(...p));
  const phases = nodes.map((n) => solved.nodePhases[n]);
  const label = 'PHASE ROTATION';
  if (phases.some((p) => !p)) return { label, primary: 'NO PHASE', secondary: 'All three probes must be on energized phase terminals (start the simulation).', ok: false };
  if (new Set(phases).size < 3) return { label, primary: 'SAME PHASE', secondary: `Probes read ${phases.join(', ')}: use one terminal per phase.`, ok: false };
  const cw = CW.includes(phases.join(','));
  return { label, primary: cw ? 'CW  (1-2-3)' : 'CCW  (1-3-2)', secondary: `Probe order reads ${phases.join(' → ')}`, ok: cw };
}

/** Continuity: a closed path between the two terminals, circuit de-energized only. */
export function measureContinuity(
  devices: ElectricalDevice[], wires: ElectricalWire[], a: [string, string], b: [string, string], energized: boolean
): Reading {
  const label = `CONTINUITY: ${termName(devices, ...a)} ↔ ${termName(devices, ...b)}`;
  if (energized) return { label, primary: 'ENERGIZED', secondary: 'Isolate the circuit first (stop the simulation).', ok: false };
  const closed = reach(wiringGraph(devices, wires), key(...a)).has(key(...b));
  return { label, primary: closed ? 'CLOSED  < 1 Ω' : 'OPEN', secondary: closed ? 'Continuous path (contacts shown at rest)' : 'No path between the two points', ok: closed, beep: closed };
}
