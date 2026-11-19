import type { ElectricalDevice, ElectricalWire } from '../types/electrical';

/**
 * 24 V DC control-power domain.
 *
 * DC is deliberately NOT part of the AC potential model in circuitSolver.ts. A supply device (psu_24vdc)
 * seeds its own two nets here, and the nets are flooded over the same wire/contact graph the AC solver
 * uses. The two worlds must never touch: a DC flood that reaches a node the AC solver already marked
 * live / neutral / switched is reported as an AC/DC cross-connection, and the supply shuts down.
 */

export type DcPotential = 'dc_pos' | 'dc_neg';

export const DC_SENSOR_TYPES = ['sensor_inductive', 'sensor_capacitive', 'sensor_photoelectric'] as const;
export const isPvDcDevice = (type: string) => type === 'pv_string' || type === 'dc_isolator';
export const isDcSensor = (type: string) => (DC_SENSOR_TYPES as readonly string[]).includes(type);

/** True when the relay is the 24 V DC variant (its A1 is +, A2 is 0 V). */
export const isAnnunciator = (type: string) => type === 'buzzer_horn' || type === 'beacon' || type === 'tower_light';

export const isDcCoilDevice = (dev: ElectricalDevice) =>
  (dev.type === 'industrial_relay_dpdt' && dev.state.coilType === 'dc24') || (isAnnunciator(dev.type) && dev.state.supply === 'dc24');

/** Terminals that belong to the DC domain (used by the static cross-connection check). */
export function isDcTerminal(dev: ElectricalDevice, terminalId: string): boolean {
  if (dev.type === 'psu_24vdc') return terminalId === 'v_pos' || terminalId === 'v_neg';
  if (isPvDcDevice(dev.type)) return true;
  if (dev.type === 'inverter_gridtie') return terminalId === 'pv_pos' || terminalId === 'pv_neg';
  if (isDcSensor(dev.type)) return true;
  if (dev.type === 'plc_24vdc_16io') return terminalId !== 'pe';
  if (dev.type === 'motor_dc_shunt') return true;
  if (isDcCoilDevice(dev)) return dev.type !== 'industrial_relay_dpdt' || terminalId === 'a1' || terminalId === 'a2';
  return false;
}

/** AC-only terminals (line / phase / neutral typed) of any device that is not itself a DC device. */
export function isAcLiveTerminal(dev: ElectricalDevice, terminalId: string): boolean {
  if (isDcTerminal(dev, terminalId)) return false;
  if (dev.type === 'psu_24vdc') return terminalId === 'in_l' || terminalId === 'in_n';
  const t = dev.terminals.find((x) => x.id === terminalId);
  return !!t && (t.type === 'phase' || t.type === 'phase2' || t.type === 'phase3' || t.type === 'neutral');
}

/** Wires that join a DC-domain terminal to an AC line / neutral terminal through other wires. Static (edit mode) check. */
export function findAcDcCrossWires(devices: ElectricalDevice[], wires: ElectricalWire[]): { wire: ElectricalWire; dcDevice: ElectricalDevice; acDevice: ElectricalDevice }[] {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const key = (d: string, t: string) => `${d}:${t}`;
  for (const w of wires) parent.set(find(key(w.fromDeviceId, w.fromTerminalId)), find(key(w.toDeviceId, w.toTerminalId)));

  const dcNets = new Map<string, ElectricalDevice>();
  const acNets = new Map<string, ElectricalDevice>();
  for (const w of wires) {
    for (const [d, t] of [[w.fromDeviceId, w.fromTerminalId], [w.toDeviceId, w.toTerminalId]]) {
      const dev = byId.get(d);
      if (!dev) continue;
      const net = find(key(d, t));
      if (isDcTerminal(dev, t)) dcNets.set(net, dev);
      else if (isAcLiveTerminal(dev, t)) acNets.set(net, dev);
    }
  }
  const out: { wire: ElectricalWire; dcDevice: ElectricalDevice; acDevice: ElectricalDevice }[] = [];
  const seen = new Set<string>();
  for (const w of wires) {
    const net = find(key(w.fromDeviceId, w.fromTerminalId));
    if (dcNets.has(net) && acNets.has(net) && !seen.has(net)) {
      seen.add(net);
      out.push({ wire: w, dcDevice: dcNets.get(net)!, acDevice: acNets.get(net)! });
    }
  }
  return out;
}

export interface DcResult {
  potentials: Record<string, DcPotential>;
  /** Supply (psu id) that feeds each + node, to total the load per supply */
  sourceOf: Record<string, string>;
  /** Nodes where DC met an AC potential */
  mixNodes: string[];
  /** Supplies whose nets reach an AC node */
  mixedPsus: string[];
  /** Supply ids whose + and 0 V nets touch */
  shorted: string[];
}

/**
 * Flood the DC nets of every running supply. `adj` is the solver's terminal graph, `acPotentials` what the
 * AC floods wrote on it. A supply flagged `dcOutputOn` seeds v_pos / v_neg.
 */
export function floodDc(
  devices: ElectricalDevice[],
  adj: Record<string, Set<string>>,
  acPotentials: Record<string, string>
): DcResult {
  const potentials: Record<string, DcPotential> = {};
  const sourceOf: Record<string, string> = {};
  const mix = new Set<string>();
  const mixedPsus = new Set<string>();
  const shorted = new Set<string>();

  const flood = (seed: string, pot: DcPotential, psuId: string) => {
    const seen = new Set([seed]);
    const queue = [seed];
    while (queue.length) {
      const cur = queue.shift()!;
      const ac = acPotentials[cur];
      if (ac && ac !== 'none' && ac !== 'earth') {
        mix.add(cur);
        mixedPsus.add(psuId);
      }
      const prior = potentials[cur];
      if (prior && prior !== pot) {
        shorted.add(psuId);
        continue;
      }
      potentials[cur] = pot;
      if (pot === 'dc_pos') sourceOf[cur] = psuId;
      for (const n of adj[cur] ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  };

  // 24 V supplies and PV strings seed their own nets (a PV string is DC only: its pos / neg terminals)
  const dcSeeds = (dev: ElectricalDevice) =>
    dev.type === 'psu_24vdc' ? ([`${dev.id}:v_pos`, `${dev.id}:v_neg`] as const) : dev.type === 'pv_string' ? ([`${dev.id}:pos`, `${dev.id}:neg`] as const) : null;
  for (const dev of devices) {
    const seeds = dcSeeds(dev);
    if (seeds && dev.state.dcOutputOn) flood(seeds[0], 'dc_pos', dev.id);
  }
  for (const dev of devices) {
    const seeds = dcSeeds(dev);
    if (seeds && dev.state.dcOutputOn) flood(seeds[1], 'dc_neg', dev.id);
  }
  return { potentials, sourceOf, mixNodes: [...mix], mixedPsus: [...mixedPsus], shorted: [...shorted] };
}

/** Nominal 24 V load current (A) of a powered DC device. */
export function dcLoadAmps(dev: ElectricalDevice): number {
  switch (dev.type) {
    case 'sensor_inductive':
    case 'sensor_capacitive':
    case 'sensor_photoelectric':
      return 0.015;
    case 'plc_24vdc_16io':
      return 0.25;
    case 'industrial_relay_dpdt':
      return 0.04;
    case 'buzzer_horn':
      return 0.05;
    case 'beacon':
      return 0.08;
    case 'tower_light':
      return 0.04;
    default:
      return 0;
  }
}
