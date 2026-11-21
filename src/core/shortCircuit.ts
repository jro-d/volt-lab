import type { ElectricalDevice, ElectricalWire, CodeStandard, ShortCircuitSettings } from '../types/electrical';
import { getWireStandards } from '../data/standardsData';

/**
 * Short-circuit check by the simple ohmic method.
 *
 * The supply is a source impedance (from its short-circuit level, optionally with a transformer in series) and every
 * wire adds the resistance of its conductor. The prospective fault current at a terminal is then
 *   3-phase supply:     Ik = U / (sqrt(3) x (Zs + R))
 *   single-phase supply: Ik = U / (Zs + 2R)          (line and neutral return of equal length)
 * where R is the conductor resistance of the shortest path from the supply to that terminal.
 *
 * Simplifications (also shown in the UI and the README):
 *  - resistive only: no reactance, so the result is a little HIGH (safe side for an interrupting-rating check);
 *  - conductor resistance is the 75 C table value brought back to 20 C (cold conductor = highest fault current);
 *  - the shortest path wins; parallel paths are not combined;
 *  - the supply short-circuit level is taken at the supply terminals; there is no motor contribution;
 *  - the trace stops at transformers (voltage level changes): circuits behind a control transformer get no value.
 */

export const DEFAULT_SHORT_CIRCUIT: ShortCircuitSettings = { v: 1, enabled: true, sourceKa: 10 };

/** Copper resistance at 20 C relative to 75 C: 1 / (1 + 0.00393 x 55) */
export const R75_TO_R20 = 1 / (1 + 0.00393 * 55);

/** A device whose interrupting rating is checked against the fault level at its input */
export const INTERRUPTING_TYPES = new Set([
  'mcb_1p', 'mcb_2p', 'mcb_3p', 'service_disconnect_2p', 'safety_breaker_2p', 'fuse_holder_1p',
  'fuse_switch_disconnector_3p', 'rcbo_1pn', 'afdd_1pn', 'mccb_3p', 'mpcb_3p',
]);

/** Series devices whose line and load terminals are one conductor for a fault (state ignored: prospective current) */
const SERIES_TYPES = new Set([
  ...INTERRUPTING_TYPES, 'rcd_2p', 'rcd_4p', 'kwh_meter_1p', 'kwh_meter_3p', 'net_meter', 'contactor_3p',
  'thermal_overload_relay', 'rotary_isolator_3p', 'terminal_block', 'distribution_block',
]);

const SOURCE_TYPES = new Set(['source_3phase_440v']);
const METER_TYPES = new Set(['kwh_meter_1p', 'kwh_meter_3p']);

const key = (d: string, t: string) => `${d}:${t}`;

/** Pairs of terminals of a series device that carry the same conductor through it. */
export function seriesLinks(dev: ElectricalDevice): [string, string][] {
  const ids = new Set(dev.terminals.map((t) => t.id));
  if (dev.category === 'busbar' || dev.type === 'terminal_block' || dev.type === 'distribution_block') {
    const out: [string, string][] = [];
    for (let i = 0; i < dev.terminals.length; i++) for (let j = i + 1; j < dev.terminals.length; j++) out.push([dev.terminals[i].id, dev.terminals[j].id]);
    return out;
  }
  if (!SERIES_TYPES.has(dev.type)) return [];
  const out: [string, string][] = [];
  const add = (a: string, b: string) => ids.has(a) && ids.has(b) && out.push([a, b]);
  for (const id of ids) {
    if (id === 'in') add('in', 'out');
    else if (id.startsWith('in_')) add(id, 'out_' + id.slice(3));
    else if (id.endsWith('_in')) add(id, id.slice(0, -3) + '_out');
  }
  for (const n of ['1', '2', '3']) add('l' + n, 't' + n); // contactors and overload relays
  return out;
}

export interface DeviceFaultLevel {
  /** Prospective fault current at the device input, A */
  ik: number;
  /** Conductor resistance of the path from the supply, ohm (at 20 C) */
  pathOhms: number;
}

export interface FaultLevels {
  settings: ShortCircuitSettings;
  /** Supply voltage used (line-to-line for 3-phase) */
  volts: number;
  supplies: { deviceId: string; phases: 1 | 3 }[];
  /** Source impedance seen at the supply terminals, ohm */
  sourceOhms: number;
  byDevice: Record<string, DeviceFaultLevel>;
}

/** Source impedance (per phase for 3-phase, whole loop for single-phase) from a short-circuit level and a transformer. */
export function sourceImpedance(settings: ShortCircuitSettings, volts: number, phases: 1 | 3): number {
  const ik = Math.max(settings.sourceKa, 0.001) * 1000;
  const zGrid = phases === 3 ? volts / (Math.sqrt(3) * ik) : volts / ik;
  const t = settings.transformer;
  const zTx = t && t.kva > 0 && t.zPct > 0 ? ((t.zPct / 100) * volts * volts) / (t.kva * 1000) : 0;
  return zGrid + zTx;
}

export function ikAtResistance(phases: 1 | 3, volts: number, zSource: number, pathOhms: number): number {
  return phases === 3 ? volts / (Math.sqrt(3) * (zSource + pathOhms)) : volts / (zSource + 2 * pathOhms);
}

export function computeFaultLevels(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  standard: CodeStandard,
  gridVoltage: number,
  settings: ShortCircuitSettings
): FaultLevels {
  const volts = gridVoltage > 0 ? gridVoltage : 230;
  const wireStd = getWireStandards(standard);

  // adjacency: terminal -> [terminal, ohms]
  const adj = new Map<string, [string, number][]>();
  const link = (a: string, b: string, r: number) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push([b, r]);
    adj.get(b)!.push([a, r]);
  };
  const wired = new Set<string>();
  for (const w of wires) {
    const std = wireStd.find((s) => s.name === w.wireGauge) || wireStd[0];
    const r = (((w.lengthMeters || 5) * (std?.resistanceOhmPerKm || 10)) / 1000) * R75_TO_R20;
    link(key(w.fromDeviceId, w.fromTerminalId), key(w.toDeviceId, w.toTerminalId), r);
    wired.add(key(w.fromDeviceId, w.fromTerminalId));
    wired.add(key(w.toDeviceId, w.toTerminalId));
  }
  for (const dev of devices) for (const [a, b] of seriesLinks(dev)) link(key(dev.id, a), key(dev.id, b), 0);

  // supply points
  const starts: { node: string; phases: 1 | 3; deviceId: string }[] = [];
  for (const dev of devices) {
    if (SOURCE_TYPES.has(dev.type)) {
      for (const t of ['l1', 'l2', 'l3']) if (dev.terminals.some((x) => x.id === t)) starts.push({ node: key(dev.id, t), phases: 3, deviceId: dev.id });
    } else if (METER_TYPES.has(dev.type)) {
      // a meter whose input side is not wired is the service entrance
      const inputs = dev.terminals.filter((t) => /^l\d?_in$/.test(t.id));
      if (inputs.length > 0 && inputs.every((t) => !wired.has(key(dev.id, t.id)))) {
        for (const t of inputs) starts.push({ node: key(dev.id, t.id), phases: dev.type === 'kwh_meter_3p' ? 3 : 1, deviceId: dev.id });
      }
    }
  }

  const byDevice: Record<string, DeviceFaultLevel> = {};
  const supplies: FaultLevels['supplies'] = [];
  let sourceOhms = 0;
  for (const phases of [3, 1] as const) {
    const roots = starts.filter((s) => s.phases === phases);
    if (roots.length === 0) continue;
    for (const d of new Set(roots.map((r) => r.deviceId))) supplies.push({ deviceId: d, phases });
    const zs = sourceImpedance(settings, volts, phases);
    sourceOhms = sourceOhms || zs;

    // Dijkstra over resistance
    const dist = new Map<string, number>();
    const open = new Map<string, number>();
    for (const r of roots) {
      dist.set(r.node, 0);
      open.set(r.node, 0);
    }
    while (open.size) {
      let best = '';
      let bestD = Infinity;
      for (const [n, d] of open) if (d < bestD) { best = n; bestD = d; }
      open.delete(best);
      for (const [next, r] of adj.get(best) ?? []) {
        const nd = bestD + r;
        if (nd < (dist.get(next) ?? Infinity)) {
          dist.set(next, nd);
          open.set(next, nd);
        }
      }
    }
    for (const [node, r] of dist) {
      const devId = node.slice(0, node.indexOf(':'));
      const ik = ikAtResistance(phases, volts, zs, r);
      const prev = byDevice[devId];
      if (!prev || ik > prev.ik) byDevice[devId] = { ik, pathOhms: r };
    }
  }

  return { settings, volts, supplies, sourceOhms, byDevice };
}

export interface RatingCheck {
  deviceId: string;
  ikKa: number;
  ratingKa: number;
  /** error: rating below the fault level; warning: within 20 % of the rating; ok otherwise */
  status: 'error' | 'warning' | 'ok';
}

/** Compare each protective device's interrupting rating (kaRating) with the fault level at its input. */
export function checkInterruptingRatings(devices: ElectricalDevice[], levels: FaultLevels): RatingCheck[] {
  const out: RatingCheck[] = [];
  for (const dev of devices) {
    if (!INTERRUPTING_TYPES.has(dev.type) || !(dev.kaRating && dev.kaRating > 0)) continue;
    const lvl = levels.byDevice[dev.id];
    if (!lvl) continue;
    const ikKa = lvl.ik / 1000;
    const status = dev.kaRating < ikKa ? 'error' : ikKa > dev.kaRating * 0.8 ? 'warning' : 'ok';
    out.push({ deviceId: dev.id, ikKa, ratingKa: dev.kaRating, status });
  }
  return out;
}

export const formatKa = (ampere: number) => `${(ampere / 1000).toFixed(ampere >= 10000 ? 1 : 2)} kA`;
