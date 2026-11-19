import type { DeviceType, ElectricalDevice, ElectricalWire, ProcessState } from '../../types/electrical';
import type { PhaseId, SolvedCircuit } from '../circuitSolver';

/** Two terminal ids of the same device that are conductively joined. */
export type TerminalPair = [string, string];

/** Terminals (local ids) that a device drives as a source. */
export interface SeedSet {
  live?: string[];
  neutral?: string[];
  earth?: string[];
  phases?: { terminal: string; phase: PhaseId }[];
}

export interface TickContext {
  /** The latest solved circuit (potentials, wire currents ...) */
  solved: SolvedCircuit;
  wires: ElectricalWire[];
  /** Every device in the project (read-only: for behaviours that look at other devices) */
  devices: ElectricalDevice[];
  /** Project grid frequency, Hz */
  gridFrequency: number;
  /** Shared tank / line-pressure state (pumps, float and pressure switches) */
  process?: ProcessState;
}

/**
 * Optional hooks for a family of devices. The solver and the simulation tick call them at a few fixed
 * points; devices that predate this registry keep their `if (dev.type === ...)` branches in
 * circuitSolver.ts.
 */
export interface DeviceBehavior {
  types: readonly DeviceType[];

  /** Internal conductive connections for the device's current state (switch closed, fuse intact ...). */
  edges?(dev: ElectricalDevice): TerminalPair[];

  /** Terminals this device drives as a supply (a running generator). */
  seeds?(dev: ElectricalDevice): SeedSet;

  /**
   * The device clears a short circuit that reaches it. Returns the state patch to persist (for example
   * `{ blown: true }`) when a fault passes through `viaTerminal`, or null when the device cannot clear it.
   */
  clearsFault?(dev: ElectricalDevice, viaTerminal: string): { patch: Record<string, unknown>; reason: string; opensDevice: boolean } | null;

  /**
   * Time-dependent behaviour, called every simulation step while the grid is energized. Pure: returns the
   * same reference when nothing changed, otherwise an updated copy.
   */
  tick?(dev: ElectricalDevice, ctx: TickContext, dtSec: number): ElectricalDevice;

  /**
   * AC coils / control inputs the device presents to the supply. The solver adds their power to the load, draws
   * the current through the wiring and marks the device energized when any of them is powered. The behaviour's
   * own `tick` decides what the contacts do (see `coilPowered` in util.ts).
   */
  coils?(dev: ElectricalDevice): { a: string; b: string; watts: number }[];

  /**
   * A three-phase load (motor, pump, compressor ...). The solver decides from the potentials and phases of the
   * returned terminals whether it is supplied with a complete line set, records `powered3`, `direction`
   * ('CW' / 'CCW'), `fault3` and `measuredAmps` in the device state, draws the line current through the wiring
   * and counts the motor start in the breaker inrush check. Return null while the load is not connected.
   */
  loads3p?(dev: ElectricalDevice, probe: LoadProbe): { terminals: [string, string, string]; watts: number; startMult?: number; fault?: string } | null;

  /**
   * A series device that limits the motor starting current of everything downstream of it (soft starter,
   * reduced-voltage starter): the multiple of full-load current the start draws, or null when not limiting.
   */
  limitsInrush?(dev: ElectricalDevice): number | null;
}

/** What the solver lets a three-phase load look at: potentials and phases of its terminals and connectivity. */
export interface LoadProbe {
  potential(terminal: string): string | undefined;
  phase(terminal: string): string | undefined;
  connected(a: string, b: string): boolean;
}
