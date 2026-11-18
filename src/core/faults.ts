import type { ElectricalDevice, ElectricalWire, FaultKind, InjectedFault } from '../types/electrical';

/**
 * Troubleshooting faults. Each fault is a small transform the solver applies *before* solving; the project itself
 * is never changed, so switching Troubleshoot mode off gives the working circuit back.
 *
 * Simplifications (kept in one place so they can be quoted in the project write-up):
 *  - high_resistance_joint adds I x ohms to the wire's voltage drop and reports heating; the potential-based solver does
 *    not lower the voltage seen by downstream loads.
 *  - loose_neutral behaves as an open at that terminal (no partial conduction).
 *  - swapped_phases exchanges the far ends of two wires.
 */

export const FAULT_LABEL: Record<FaultKind, string> = {
  open_coil: 'Open coil',
  welded_contact: 'Welded contact (stuck closed)',
  contact_open: 'Contact stuck open',
  loose_neutral: 'Loose neutral terminal',
  open_wire: 'Open wire (broken conductor)',
  high_resistance_joint: 'High-resistance joint',
  earth_fault_to_frame: 'Earth fault to frame',
  overload_setting_wrong: 'Overload dial set wrong',
  blown_fuse: 'Blown fuse',
  swapped_phases: 'Swapped phases',
};

/** What a student would be told once the fault is found. */
export function faultExplanation(f: InjectedFault, devices: ElectricalDevice[]): string {
  const name = devices.find((d) => d.id === f.deviceId)?.name || f.deviceId;
  switch (f.kind) {
    case 'open_coil': return `${name} has an open coil: the winding is broken, so it never pulls in even though the full control voltage is across A1-A2. Measure the coil: 220 V present but no click means an open coil.`;
    case 'welded_contact': return `A contact of ${name} is welded closed (${(f.params.pair || []).join(' - ')}). It conducts whether or not the coil is energized, so the circuit it controls cannot be switched off or starts by itself.`;
    case 'contact_open': return `A contact of ${name} is stuck open (${(f.params.pair || []).join(' - ')}). Voltage is present on one side and missing on the other when the coil is pulled in; on a power pole the motor loses a phase and single-phases.`;
    case 'loose_neutral': return `The neutral terminal ${f.params.terminalId} of ${name} is loose or open. The load has its live feed but no return path, so it cannot work. Measure live to neutral at the load: nothing; live to earth: full voltage.`;
    case 'open_wire': return `A conductor starting at ${name} is broken inside its insulation: it looks connected but carries nothing. Find the point where voltage is present on one end and absent at the other.`;
    case 'high_resistance_joint': return `A joint on a conductor at ${name} has about ${f.params.ohms ?? 2} Ω of contact resistance. It drops voltage and heats up under load; a clamp meter and a voltage-drop reading across the joint show it.`;
    case 'earth_fault_to_frame': return `${name} leaks current to its metal frame. An earth-leakage device trips even though overcurrent protection sees nothing wrong; an insulation test of the winding finds it.`;
    case 'overload_setting_wrong': return `The overload relay ${name} is set to ${f.params.dialAmps ?? 1} A, well below the motor current, so it trips as soon as the motor starts.`;
    case 'blown_fuse': return `The fuse in ${name} has blown: one side of the fuse has voltage and the other none. Find out why before fitting a new link.`;
    case 'swapped_phases': return `Two phase conductors starting at ${name} have been interchanged, so the motor turns the wrong way round.`;
  }
}

/** Contact pairs a fault can stick closed or open, per device type. */
export function faultContactPairs(dev: ElectricalDevice): { label: string; pair: [string, string] }[] {
  switch (dev.type) {
    case 'contactor_3p':
      return [
        { label: 'Power pole L1-T1', pair: ['l1', 't1'] },
        { label: 'Power pole L2-T2', pair: ['l2', 't2'] },
        { label: 'Power pole L3-T3', pair: ['l3', 't3'] },
        { label: 'Auxiliary 13-14 (NO)', pair: ['no_13', 'no_14'] },
        { label: 'Auxiliary 21-22 (NC)', pair: ['nc_21', 'nc_22'] },
      ];
    case 'industrial_relay_dpdt':
      return [
        { label: 'Pole 1 COM-NO', pair: ['com_1', 'no_1'] },
        { label: 'Pole 1 COM-NC', pair: ['com_1', 'nc_1'] },
        { label: 'Pole 2 COM-NO', pair: ['com_2', 'no_2'] },
        { label: 'Pole 2 COM-NC', pair: ['com_2', 'nc_2'] },
      ];
    case 'timer_relay':
      return [{ label: 'Contact 15-18', pair: ['com_15', 'no_18'] }, { label: 'Contact 15-16', pair: ['com_15', 'nc_16'] }];
    default:
      return [];
  }
}

const COIL_TYPES = new Set(['contactor_3p', 'industrial_relay_dpdt', 'timer_relay']);
const FUSE_TYPES = new Set(['fuse_holder_1p', 'fuse_switch_disconnector_3p']);
const LEAK_TYPES = new Set(['motor_ac_industrial', 'pump_booster_3p', 'motor_6lead_star_delta', 'motor_1p', 'appliance_water_heater', 'appliance_fan', 'appliance_ac', 'appliance_tv', 'pump_booster_1p']);

/** Which kinds make sense on a device (for the author panel). Wire kinds are offered on any device that has wires. */
export function faultKindsFor(dev: ElectricalDevice): FaultKind[] {
  const kinds: FaultKind[] = [];
  if (COIL_TYPES.has(dev.type)) kinds.push('open_coil');
  if (faultContactPairs(dev).length) kinds.push('welded_contact', 'contact_open');
  if (dev.type === 'thermal_overload_relay') kinds.push('overload_setting_wrong');
  if (FUSE_TYPES.has(dev.type)) kinds.push('blown_fuse');
  if (LEAK_TYPES.has(dev.type)) kinds.push('earth_fault_to_frame');
  if (dev.terminals.some((t) => t.type === 'neutral')) kinds.push('loose_neutral');
  kinds.push('open_wire', 'high_resistance_joint', 'swapped_phases');
  return kinds;
}

/** Faults indexed for the solver. */
export interface FaultContext {
  openCoil: Set<string>;
  earth: Set<string>;
  dial: Map<string, number>;
  blown: Set<string>;
  openWires: Set<string>;
  looseTerminals: Set<string>;
  hiResWires: Map<string, number>;
  welded: Map<string, [string, string][]>;
  stuckOpen: Map<string, [string, string][]>;
  swaps: Map<string, { toDeviceId: string; toTerminalId: string }>;
  /** A copy of the device with state overrides that edge-building behaviours read (blown fuse links) */
  view(dev: ElectricalDevice): ElectricalDevice;
}

export function buildFaultContext(faults: InjectedFault[], wires: ElectricalWire[]): FaultContext {
  const ctx: FaultContext = {
    openCoil: new Set(), earth: new Set(), dial: new Map(), blown: new Set(), openWires: new Set(), looseTerminals: new Set(),
    hiResWires: new Map(), welded: new Map(), stuckOpen: new Map(), swaps: new Map(),
    view: (dev) => (ctx.blown.has(dev.id) ? { ...dev, state: { ...dev.state, blown: true, blown_l1: true, blown_l2: true, blown_l3: true } } : dev),
  };
  const push = (m: Map<string, [string, string][]>, id: string, pair: [string, string]) => m.set(id, [...(m.get(id) ?? []), pair]);
  const wireById = new Map(wires.map((w) => [w.id, w]));
  for (const f of faults) {
    switch (f.kind) {
      case 'open_coil': ctx.openCoil.add(f.deviceId); break;
      case 'earth_fault_to_frame': ctx.earth.add(f.deviceId); break;
      case 'overload_setting_wrong': ctx.dial.set(f.deviceId, Number(f.params.dialAmps) || 1); break;
      case 'blown_fuse': ctx.blown.add(f.deviceId); break;
      case 'open_wire': if (f.params.wireId) ctx.openWires.add(f.params.wireId); break;
      case 'loose_neutral': if (f.params.terminalId) ctx.looseTerminals.add(`${f.deviceId}:${f.params.terminalId}`); break;
      case 'high_resistance_joint': if (f.params.wireId) ctx.hiResWires.set(f.params.wireId, Number(f.params.ohms) || 2); break;
      case 'welded_contact': if (f.params.pair) push(ctx.welded, f.deviceId, f.params.pair); break;
      case 'contact_open': if (f.params.pair) push(ctx.stuckOpen, f.deviceId, f.params.pair); break;
      case 'swapped_phases': {
        const a = wireById.get(f.params.wireA);
        const b = wireById.get(f.params.wireB);
        if (a && b) {
          ctx.swaps.set(a.id, { toDeviceId: b.toDeviceId, toTerminalId: b.toTerminalId });
          ctx.swaps.set(b.id, { toDeviceId: a.toDeviceId, toTerminalId: a.toTerminalId });
        }
        break;
      }
    }
  }
  return ctx;
}

/** Seeded random (mulberry32) so a teacher can give the same fault set to a whole class. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FaultDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Generate a fault set for a circuit. Easy: one fault whose symptom is obvious (an open coil, a blown fuse, a broken
 * control wire). Medium: one fault whose symptom appears downstream (a stuck-open power pole, a loose neutral, a wrong
 * overload dial, a high-resistance joint, an earth fault). Hard: two faults on different devices; the first is
 * chosen upstream so it can hide the symptom of the second.
 */
export function generateFaults(devices: ElectricalDevice[], wires: ElectricalWire[], difficulty: FaultDifficulty, seed: number): InjectedFault[] {
  const rnd = seededRandom(seed);
  const pick = <T,>(xs: T[]): T | undefined => xs[Math.floor(rnd() * xs.length)];
  let n = 0;
  const mk = (deviceId: string, kind: FaultKind, params: Record<string, any>): InjectedFault => ({ id: `fault_${seed}_${++n}`, deviceId, kind, params, revealed: false });
  const wireTouching = (d: ElectricalDevice) => wires.filter((w) => w.fromDeviceId === d.id || w.toDeviceId === d.id);

  const easy = (): InjectedFault | undefined => {
    const options: InjectedFault[] = [];
    for (const d of devices) {
      if (COIL_TYPES.has(d.type)) options.push(mk(d.id, 'open_coil', {}));
      if (FUSE_TYPES.has(d.type)) options.push(mk(d.id, 'blown_fuse', {}));
    }
    for (const w of wires) if (w.conductorRole === 'switched_live' || w.conductorRole === 'return_neutral') options.push(mk(w.fromDeviceId, 'open_wire', { wireId: w.id }));
    return pick(options);
  };
  const medium = (exclude?: string): InjectedFault | undefined => {
    const options: InjectedFault[] = [];
    for (const d of devices) {
      if (d.id === exclude) continue;
      for (const c of faultContactPairs(d).filter((x) => /power pole|Pole 1 COM-NO/.test(x.label))) options.push(mk(d.id, 'contact_open', { pair: c.pair }));
      if (d.type === 'thermal_overload_relay') options.push(mk(d.id, 'overload_setting_wrong', { dialAmps: 1 }));
      if (LEAK_TYPES.has(d.type)) options.push(mk(d.id, 'earth_fault_to_frame', {}));
      const neutral = d.terminals.find((t) => t.type === 'neutral');
      if (neutral && wireTouching(d).some((w) => (w.fromDeviceId === d.id && w.fromTerminalId === neutral.id) || (w.toDeviceId === d.id && w.toTerminalId === neutral.id))) options.push(mk(d.id, 'loose_neutral', { terminalId: neutral.id }));
    }
    for (const w of wires) if (w.conductorRole === 'feed_live') options.push(mk(w.fromDeviceId, 'high_resistance_joint', { wireId: w.id, ohms: 3 }));
    return pick(options);
  };
  if (difficulty === 'easy') return [easy()].filter(Boolean) as InjectedFault[];
  if (difficulty === 'medium') return [medium()].filter(Boolean) as InjectedFault[];
  const first = easy();
  const second = medium(first?.deviceId);
  return [first, second].filter(Boolean) as InjectedFault[];
}
