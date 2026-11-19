import type { DeviceType, ElectricalDevice, ElectricalWire, FloorPlan, PlanSymbol } from '../types/electrical';

/**
 * Floor-plan MVP: rooms are rectangles in metres, symbols stand for devices of the project, and home runs between two
 * symbols give the length of the wires between the two linked devices, so voltage drop uses the plan length.
 * Out of scope here: auto-routing, several floors, DXF / PDF import, generating the workbench wiring from the plan.
 */

export const DEFAULT_PLAN: FloorPlan = { v: 1, rooms: [], symbols: [], runs: [] };

export type SymbolKind = PlanSymbol['kind'];

export interface SymbolSpec {
  kind: SymbolKind;
  label: string;
  /** Device types a symbol of this kind may be linked to; the first one is created by "Create device" */
  types: DeviceType[];
  glyph: string;
}

export const SYMBOL_SPECS: SymbolSpec[] = [
  { kind: 'light', label: 'Light', types: ['light_bulb', 'emergency_light'], glyph: '✱' },
  { kind: 'switch', label: 'Switch', types: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_3way', 'switch_4way', 'dimmer_switch'], glyph: 'S' },
  { kind: 'socket', label: 'Socket', types: ['socket_duplex', 'socket_schuko', 'modular_combo_plate'], glyph: '◎' },
  { kind: 'fan', label: 'Fan', types: ['appliance_fan'], glyph: '✢' },
  { kind: 'appliance', label: 'Appliance', types: ['appliance_water_heater', 'appliance_ac', 'appliance_generic', 'appliance_tv'], glyph: 'A' },
  { kind: 'panel', label: 'Panel', types: ['mcb_2p', 'mcb_1p', 'service_disconnect_2p', 'neutral_busbar', 'rcd_2p'], glyph: '▣' },
];

export const specFor = (kind: SymbolKind) => SYMBOL_SPECS.find((s) => s.kind === kind)!;

/** Length of a home run between two points (metres). Orthogonal runs follow the walls: |dx| + |dy|. */
export function runLength(a: { x: number; y: number }, b: { x: number; y: number }, mode: 'straight' | 'orthogonal', dropM = 0): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const len = mode === 'orthogonal' ? dx + dy : Math.hypot(dx, dy);
  return Math.round((len + Math.max(0, dropM)) * 10) / 10;
}

/** Wires that join the two devices directly (either direction). */
export function wiresBetween(wires: ElectricalWire[], deviceA: string, deviceB: string): ElectricalWire[] {
  return wires.filter((w) => (w.fromDeviceId === deviceA && w.toDeviceId === deviceB) || (w.fromDeviceId === deviceB && w.toDeviceId === deviceA));
}

export interface RunReport {
  runId: string;
  lengthM: number;
  linked: boolean;
  /** Wires whose length was set from this run */
  wireIds: string[];
}

/** Length of every run and the wires it covers. Runs with an unlinked end have no length to apply. */
export function planRuns(plan: FloorPlan, wires: ElectricalWire[]): RunReport[] {
  const byId = new Map(plan.symbols.map((s) => [s.id, s]));
  return plan.runs.map((r) => {
    const a = byId.get(r.fromSymbolId);
    const b = byId.get(r.toSymbolId);
    const lengthM = a && b ? runLength(a, b, r.mode, r.dropM ?? 0) : 0;
    const linked = !!(a?.deviceId && b?.deviceId);
    return { runId: r.id, lengthM, linked, wireIds: linked ? wiresBetween(wires, a!.deviceId!, b!.deviceId!).map((w) => w.id) : [] };
  });
}

/** Sets `lengthMeters` of the covered wires from the home runs. Returns the new wires and how many changed. */
export function applyRunLengths(plan: FloorPlan, wires: ElectricalWire[]): { wires: ElectricalWire[]; changed: number } {
  const lengths = new Map<string, number>();
  for (const r of planRuns(plan, wires)) for (const id of r.wireIds) lengths.set(id, r.lengthM);
  let changed = 0;
  const next = wires.map((w) => {
    const l = lengths.get(w.id);
    if (l === undefined || l <= 0 || w.lengthMeters === l) return w;
    changed++;
    return { ...w, lengthMeters: l };
  });
  return { wires: next, changed };
}

/** A new device for a symbol, placed on the workbench in a tidy grid (the caller supplies the catalog creator). */
export function benchPosition(index: number): { x: number; y: number } {
  return { x: 60 + (index % 6) * 170, y: 60 + Math.floor(index / 6) * 200 };
}

export function planBounds(plan: FloorPlan): { w: number; h: number } {
  let w = 10;
  let h = 8;
  for (const r of plan.rooms) {
    w = Math.max(w, r.x + r.w + 1);
    h = Math.max(h, r.y + r.h + 1);
  }
  for (const s of plan.symbols) {
    w = Math.max(w, s.x + 1);
    h = Math.max(h, s.y + 1);
  }
  return { w, h };
}

/** Devices that could be linked to a symbol kind and are not linked to another symbol already. */
export function linkableDevices(plan: FloorPlan, devices: ElectricalDevice[], symbol: PlanSymbol): ElectricalDevice[] {
  const spec = specFor(symbol.kind);
  const taken = new Set(plan.symbols.filter((s) => s.id !== symbol.id && s.deviceId).map((s) => s.deviceId));
  return devices.filter((d) => spec.types.includes(d.type) && !taken.has(d.id));
}
