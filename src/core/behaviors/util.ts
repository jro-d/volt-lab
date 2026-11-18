import type { ElectricalDevice, ElectricalWire } from '../../types/electrical';

/** Current (A) through a terminal: the sum over the wires attached to it (each branch carries its own share). Wires back to the same device are ignored. */
export function terminalCurrent(
  dev: ElectricalDevice,
  terminalId: string,
  wires: ElectricalWire[],
  wireCurrents: Record<string, number>
): number {
  let amps = 0;
  for (const w of wires) {
    const here =
      (w.fromDeviceId === dev.id && w.fromTerminalId === terminalId) ||
      (w.toDeviceId === dev.id && w.toTerminalId === terminalId);
    if (here && w.fromDeviceId !== w.toDeviceId) amps += wireCurrents[w.id] || 0;
  }
  return amps;
}

/** Returns `dev` when no state key changes, otherwise a copy with the patch applied. */
export function withState(dev: ElectricalDevice, patch: Record<string, unknown>): ElectricalDevice {
  for (const key of Object.keys(patch)) {
    if (!Object.is(dev.state[key], patch[key])) return { ...dev, state: { ...dev.state, ...patch } };
  }
  return dev;
}

import type { SolvedCircuit } from '../circuitSolver';

/** AC coil / control input powered: live on one terminal and neutral (or another phase) on the other. */
export function coilPowered(solved: SolvedCircuit, dev: ElectricalDevice, a: string, b: string): boolean {
  const ka = `${dev.id}:${a}`;
  const kb = `${dev.id}:${b}`;
  const pa = solved.nodePotentials[ka];
  const pb = solved.nodePotentials[kb];
  if ((pa === 'live' && pb === 'neutral') || (pb === 'live' && pa === 'neutral')) return true;
  if (pa === 'live' && pb === 'live') {
    const fa = solved.nodePhases[ka];
    const fb = solved.nodePhases[kb];
    return !!fa && !!fb && fa !== fb;
  }
  return false;
}

/** 24 V DC input: + on the first terminal, 0 V on the second. */
export function dcCoilPowered(solved: SolvedCircuit, dev: ElectricalDevice, pos: string, neg: string): boolean {
  return solved.dcPotentials[`${dev.id}:${pos}`] === 'dc_pos' && solved.dcPotentials[`${dev.id}:${neg}`] === 'dc_neg';
}

/** The terminal sits on a live conductor. */
export function isLive(solved: SolvedCircuit, dev: ElectricalDevice, terminal: string): boolean {
  return solved.nodePotentials[`${dev.id}:${terminal}`] === 'live';
}
