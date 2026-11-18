import type { ElectricalDevice, ElectricalWire } from '../../types/electrical';

/** Largest current (A) on any wire attached to a terminal. Wires back to the same device are ignored. */
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
    if (here && w.fromDeviceId !== w.toDeviceId) amps = Math.max(amps, wireCurrents[w.id] || 0);
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
