import type { ElectricalDevice, ElectricalWire, CodeStandard } from '../types/electrical';
import { getWireStandards, DEMAND_FACTORS, STANDARD_BREAKER_SIZES } from '../data/standardsData';
import { INTERRUPTING_TYPES, seriesLinks } from './shortCircuit';

/**
 * Load schedule and panel schedule. Reads the load devices and the project wiring only (no solver run, so it
 * never changes a simulation result): each load is traced back through its wires to the nearest protective
 * device, which gives the circuit, the conductor and the length; the voltage drop is worked out from the
 * conductor resistance and the design current.
 */

export interface LoadSpec {
  description: string;
  loadType: string;
  watts: number;
  pf: number;
  /** 1 for a single-phase load, 3 for a three-phase one */
  phases: 1 | 3;
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : d);

/** The load a device presents, or null when the device is not a load. Watts match what the solver counts. */
export function loadSpec(dev: ElectricalDevice): LoadSpec | null {
  const s = dev.state;
  const name = dev.name || dev.id;
  switch (dev.type) {
    case 'light_bulb': return { description: name, loadType: 'lighting', watts: num(s.wattage, 60), pf: num(s.pf, 1), phases: 1 };
    case 'appliance_fan': return { description: name, loadType: 'appliance', watts: num(s.wattage, 65), pf: 0.9, phases: 1 };
    case 'appliance_ac': return { description: name, loadType: 'air conditioner', watts: num(s.wattage, 1200), pf: 0.85, phases: 1 };
    case 'appliance_water_heater': return { description: name, loadType: 'water heater', watts: num(s.wattage, 3500), pf: 1, phases: 1 };
    case 'appliance_generic': return { description: name, loadType: String(s.applianceKind || 'appliance').replace(/_/g, ' '), watts: num(s.wattage, 1000), pf: num(s.pf, 1), phases: 1 };
    case 'pump_booster_1p': return { description: name, loadType: 'motor', watts: num(Number(s.kw) * 1000, 750), pf: 0.8, phases: 1 };
    case 'motor_ac_industrial':
    case 'pump_booster_3p':
    case 'pump_submersible_3p':
    case 'air_compressor_3p':
    case 'hoist_conveyor':
    case 'motor_brake':
    case 'motor_wound_rotor':
      return { description: name, loadType: 'motor', watts: num(s.wattage, 2200), pf: 0.8, phases: 3 };
    case 'socket_duplex':
    case 'socket_schuko':
      return s.hasPluggedLoad ? { description: `${name} (plugged load)`, loadType: 'receptacle', watts: s.pluggedAppliance === 'appliance_tv' ? 120 : 300, pf: 0.9, phases: 1 } : null;
    default:
      return null;
  }
}

/** Standard overcurrent device sizes (A) the main breaker suggestion is picked from. Same table as standardsData. */
export const BREAKER_SIZES = STANDARD_BREAKER_SIZES;

const key = (d: string, t: string) => `${d}:${t}`;

/** Wiring devices that pass the line conductor through: switches, receptacles, boxes, splices. */
const WIRING_TYPES = new Set([
  'switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_3way', 'switch_4way', 'dimmer_switch', 'modular_combo_plate',
  'socket_duplex', 'socket_schuko', 'junction_box_4way', 'junction_box_octagonal_orange', 'utility_box_surface_pvc',
  'splice_wire_nut', 'lever_connector_3p', 'fan_regulator',
]);

/** Pairs of terminals that carry the line conductor through a wiring device (neutral and earth legs are left out). */
function wiringLinks(dev: ElectricalDevice): [string, string][] {
  if (!WIRING_TYPES.has(dev.type)) return [];
  const out: [string, string][] = [];
  const grouped = dev.terminals.filter((t) => t.spliceGroup);
  if (grouped.length > 1) {
    for (let i = 0; i < grouped.length; i++) for (let j = i + 1; j < grouped.length; j++) if (grouped[i].spliceGroup === grouped[j].spliceGroup) out.push([grouped[i].id, grouped[j].id]);
  }
  const line = dev.terminals.filter((t) => !t.spliceGroup && t.type !== 'neutral' && t.type !== 'earth');
  for (let i = 0; i < line.length; i++) for (let j = i + 1; j < line.length; j++) out.push([line[i].id, line[j].id]);
  if (dev.type === 'splice_wire_nut' || dev.type === 'lever_connector_3p') {
    for (let i = 0; i < dev.terminals.length; i++) for (let j = i + 1; j < dev.terminals.length; j++) out.push([dev.terminals[i].id, dev.terminals[j].id]);
  }
  return out;
}

interface Graph {
  adj: Map<string, { to: string; wire?: ElectricalWire }[]>;
}

function buildGraph(devices: ElectricalDevice[], wires: ElectricalWire[]): Graph {
  const adj = new Map<string, { to: string; wire?: ElectricalWire }[]>();
  const link = (a: string, b: string, wire?: ElectricalWire) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, wire });
    adj.get(b)!.push({ to: a, wire });
  };
  for (const w of wires) link(key(w.fromDeviceId, w.fromTerminalId), key(w.toDeviceId, w.toTerminalId), w);
  for (const d of devices) for (const [a, b] of [...seriesLinks(d), ...wiringLinks(d)]) link(key(d.id, a), key(d.id, b));
  return { adj };
}

/** Terminals of a load that carry the line conductor (everything except neutral, earth and control legs). */
function supplyTerminals(dev: ElectricalDevice): string[] {
  const live = dev.terminals.filter((t) => t.type === 'phase' || t.type === 'phase2' || t.type === 'phase3' || t.type === 'switched');
  return (live.length ? live : dev.terminals.filter((t) => t.type !== 'neutral' && t.type !== 'earth')).map((t) => t.id);
}

export interface TracedCircuit {
  breaker: ElectricalDevice | null;
  wires: ElectricalWire[];
  /** Terminal on the supply side of the breaker (towards the source) */
  breakerInput: string | null;
}

/** Breadth-first walk from the load's line terminal to the nearest protective device. */
export function traceToBreaker(load: ElectricalDevice, devices: ElectricalDevice[], graph: Graph): TracedCircuit {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const start = supplyTerminals(load).map((t) => key(load.id, t));
  const prev = new Map<string, { from: string; wire?: ElectricalWire }>();
  const seen = new Set<string>(start);
  const queue = [...start];
  while (queue.length) {
    const node = queue.shift()!;
    const devId = node.slice(0, node.indexOf(':'));
    const dev = byId.get(devId);
    if (dev && dev.id !== load.id && INTERRUPTING_TYPES.has(dev.type)) {
      const wiresOnPath: ElectricalWire[] = [];
      let cur = node;
      while (prev.has(cur)) {
        const p = prev.get(cur)!;
        if (p.wire) wiresOnPath.push(p.wire);
        cur = p.from;
      }
      return { breaker: dev, wires: wiresOnPath.reverse(), breakerInput: node.slice(node.indexOf(':') + 1) };
    }
    for (const e of graph.adj.get(node) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { from: node, wire: e.wire });
      queue.push(e.to);
    }
  }
  return { breaker: null, wires: [], breakerInput: null };
}

/** Which line of a three-phase source feeds this breaker (L1 / L2 / L3), or '' when not found. */
function phaseOfBreaker(breaker: ElectricalDevice, devices: ElectricalDevice[], graph: Graph): string {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const inputs = breaker.terminals.filter((t) => /^in/.test(t.id) && t.type !== 'neutral').map((t) => key(breaker.id, t.id));
  const seen = new Set<string>(inputs);
  const queue = [...inputs];
  while (queue.length) {
    const node = queue.shift()!;
    const [devId, term] = [node.slice(0, node.indexOf(':')), node.slice(node.indexOf(':') + 1)];
    const dev = byId.get(devId);
    if (dev && dev.type === 'source_3phase_440v' && /^l[123]$/.test(term)) return term.toUpperCase();
    for (const e of graph.adj.get(node) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      queue.push(e.to);
    }
  }
  return '';
}

export interface ScheduleRow {
  circuit: number;
  deviceId: string;
  description: string;
  loadType: string;
  watts: number;
  pf: number;
  va: number;
  amps: number;
  demandFactor: number | null;
  demandVa: number | null;
  breakerId: string | null;
  breaker: string;
  conductor: string;
  lengthM: number;
  vdPercent: number;
  phase: string;
  notes: string;
}

export interface LoadSchedule {
  rows: ScheduleRow[];
  totalWatts: number;
  totalVa: number;
  /** null while any load type has no demand factor entered */
  totalDemandVa: number | null;
  totalAmps: number;
  /** Connected VA per line of a three-phase supply (empty for single-phase) */
  phaseVa: Record<string, number>;
  imbalancePercent: number | null;
  missingDemandTypes: string[];
  suggestedMainAmps: number | null;
  suggestedMainBasis: 'demand' | 'connected' | null;
  suggestedFeeder: string | null;
}

export function buildLoadSchedule(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  standard: CodeStandard,
  gridVoltage: number,
  demandOverrides: Record<string, number> = {}
): LoadSchedule {
  const graph = buildGraph(devices, wires);
  const gauges = getWireStandards(standard);
  const volts = gridVoltage > 0 ? gridVoltage : 230;
  const threePhaseSupply = devices.some((d) => d.type === 'source_3phase_440v');
  const factorFor = (loadType: string): number | null => {
    const o = demandOverrides[loadType];
    if (typeof o === 'number' && Number.isFinite(o) && o > 0) return o;
    const t = DEMAND_FACTORS[loadType];
    return t && typeof t.factor === 'number' ? t.factor : null;
  };

  const circuitIds = new Map<string, number>();
  const rows: ScheduleRow[] = [];
  const missing = new Set<string>();
  for (const dev of devices) {
    const spec = loadSpec(dev);
    if (!spec) continue;
    const trace = traceToBreaker(dev, devices, graph);
    const va = spec.watts / spec.pf;
    const lineVolts = spec.phases === 3 ? volts : volts;
    const amps = spec.phases === 3 ? va / (Math.sqrt(3) * lineVolts) : va / volts;
    const lengthM = trace.wires.reduce((s, w) => s + (w.lengthMeters || 0), 0);
    // resistance of the path: each wire at its own gauge (table value at 75 C, as the solver uses)
    const ohms = trace.wires.reduce((s, w) => {
      const std = gauges.find((g) => g.name === w.wireGauge) || gauges[0];
      return s + ((w.lengthMeters || 0) * (std?.resistanceOhmPerKm || 0)) / 1000;
    }, 0);
    const vd = spec.phases === 3 ? Math.sqrt(3) * amps * ohms : 2 * amps * ohms;
    const firstWire = trace.wires[0];
    const circuitNo = trace.breaker ? (circuitIds.get(trace.breaker.id) ?? circuitIds.set(trace.breaker.id, circuitIds.size + 1).get(trace.breaker.id)!) : 0;
    const df = factorFor(spec.loadType);
    if (df === null) missing.add(spec.loadType);
    const notes: string[] = [];
    if (!trace.breaker) notes.push('no protective device found');
    if (trace.breaker && firstWire) {
      const std = gauges.find((g) => g.name === firstWire.wireGauge);
      const rated = num(trace.breaker.state.ratedAmps, 16);
      if (std && rated > std.maxBreakerAmps) notes.push(`breaker above the ${std.maxBreakerAmps} A limit of the conductor`);
    }
    rows.push({
      circuit: circuitNo,
      deviceId: dev.id,
      description: spec.description,
      loadType: spec.loadType,
      watts: spec.watts,
      pf: spec.pf,
      va: Math.round(va * 10) / 10,
      amps: Math.round(amps * 100) / 100,
      demandFactor: df,
      demandVa: df === null ? null : Math.round(va * df * 10) / 10,
      breakerId: trace.breaker ? trace.breaker.id : null,
      breaker: trace.breaker ? `${num(trace.breaker.state.ratedAmps, 16)} A ${String(trace.breaker.state.tripCurve || '')}`.trim() : '-',
      conductor: firstWire ? firstWire.wireGauge : '-',
      lengthM: Math.round(lengthM * 10) / 10,
      vdPercent: Math.round((vd / volts) * 10000) / 100,
      phase: spec.phases === 3 ? 'L1-L2-L3' : trace.breaker && threePhaseSupply ? phaseOfBreaker(trace.breaker, devices, graph) || '-' : '-',
      notes: notes.join('; '),
    });
  }
  rows.sort((a, b) => (a.circuit || 999) - (b.circuit || 999) || a.description.localeCompare(b.description));

  const totalWatts = rows.reduce((s, r) => s + r.watts, 0);
  const totalVa = rows.reduce((s, r) => s + r.va, 0);
  const allDemand = rows.length > 0 && rows.every((r) => r.demandVa !== null);
  const totalDemandVa = allDemand ? rows.reduce((s, r) => s + (r.demandVa as number), 0) : null;

  const phaseVa: Record<string, number> = {};
  if (threePhaseSupply) {
    for (const r of rows) {
      if (r.phase === 'L1-L2-L3') for (const p of ['L1', 'L2', 'L3']) phaseVa[p] = (phaseVa[p] || 0) + r.va / 3;
      else if (/^L[123]$/.test(r.phase)) phaseVa[r.phase] = (phaseVa[r.phase] || 0) + r.va;
    }
    for (const p of ['L1', 'L2', 'L3']) phaseVa[p] = Math.round((phaseVa[p] || 0) * 10) / 10;
  }
  const phaseValues = Object.values(phaseVa);
  const avgPhase = phaseValues.length ? phaseValues.reduce((s, v) => s + v, 0) / phaseValues.length : 0;
  const imbalancePercent = phaseValues.length && avgPhase > 0 ? Math.round(((Math.max(...phaseValues) - avgPhase) / avgPhase) * 1000) / 10 : null;

  const basisVa = totalDemandVa ?? totalVa;
  const mainAmps = threePhaseSupply ? basisVa / (Math.sqrt(3) * volts) : basisVa / volts;
  const suggestedMainAmps = rows.length ? BREAKER_SIZES.find((s) => s >= mainAmps) ?? null : null;
  const feeder = suggestedMainAmps ? gauges.find((g) => g.maxBreakerAmps >= suggestedMainAmps) : null;

  return {
    rows,
    totalWatts,
    totalVa: Math.round(totalVa * 10) / 10,
    totalDemandVa: totalDemandVa === null ? null : Math.round(totalDemandVa * 10) / 10,
    totalAmps: Math.round((threePhaseSupply ? totalVa / (Math.sqrt(3) * volts) : totalVa / volts) * 100) / 100,
    phaseVa,
    imbalancePercent,
    missingDemandTypes: [...missing].sort(),
    suggestedMainAmps,
    suggestedMainBasis: rows.length ? (totalDemandVa === null ? 'connected' : 'demand') : null,
    suggestedFeeder: feeder ? feeder.name : null,
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function scheduleToCsv(schedule: LoadSchedule): string {
  const head = ['Circuit', 'Description', 'Load type', 'Watts', 'PF', 'VA', 'Amps', 'Demand factor', 'Demand VA', 'Breaker', 'Conductor', 'Length (m)', 'Voltage drop %', 'Phase', 'Notes'];
  const lines = [head.join(',')];
  for (const r of schedule.rows) {
    lines.push([r.circuit || '', r.description, r.loadType, r.watts, r.pf, r.va, r.amps, r.demandFactor ?? '', r.demandVa ?? '', r.breaker, r.conductor, r.lengthM, r.vdPercent, r.phase, r.notes].map(csvCell).join(','));
  }
  lines.push(['', 'TOTAL', '', schedule.totalWatts, '', schedule.totalVa, schedule.totalAmps, '', schedule.totalDemandVa ?? '', '', '', '', '', '', ''].map(csvCell).join(','));
  if (schedule.suggestedMainAmps) lines.push(['', `Suggested main breaker ${schedule.suggestedMainAmps} A (${schedule.suggestedMainBasis} load), feeder ${schedule.suggestedFeeder ?? ''}`].map(csvCell).join(','));
  return lines.join('\r\n');
}

/** The circuit number (as in the load schedule) of every wire that lies between a load and its breaker. */
export function wireCircuits(devices: ElectricalDevice[], wires: ElectricalWire[]): Record<string, number> {
  const graph = buildGraph(devices, wires);
  const circuitIds = new Map<string, number>();
  const out: Record<string, number> = {};
  for (const dev of devices) {
    if (!loadSpec(dev)) continue;
    const trace = traceToBreaker(dev, devices, graph);
    if (!trace.breaker) continue;
    const no = circuitIds.get(trace.breaker.id) ?? circuitIds.set(trace.breaker.id, circuitIds.size + 1).get(trace.breaker.id)!;
    for (const w of trace.wires) if (out[w.id] === undefined) out[w.id] = no;
  }
  return out;
}
