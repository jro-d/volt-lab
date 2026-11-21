import { createDeviceFromCatalog } from '../src/data/defaultComponents.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { applyProtectiveOutcome, tickSimulation } from '../src/core/simulationTick.ts';

/** A catalog device with optional state overrides. */
export function dev(type, id, state = {}) {
  const d = createDeviceFromCatalog(type, 0, 0, id);
  d.state = { ...d.state, ...state };
  return d;
}

/** A wire between two terminals. */
export const wire = (id, fromDeviceId, fromTerminalId, toDeviceId, toTerminalId, extra = {}) => ({
  id, fromDeviceId, fromTerminalId, toDeviceId, toTerminalId,
  wireGauge: '2.5 mm²', color: '#dc2626', lengthMeters: 2, conductorRole: 'feed_live', ...extra,
});

export const solve = (devices, wires, standard = 'PEC', volts = 230, options = {}) => solveCircuit(devices, wires, standard, volts, options);

/** Solve then tick `steps` times (like the app does while simulating); returns the final devices. */
export function run(devices, wires, steps, dtSec = 0.5, { standard = 'PEC', volts = 230, frequency = 60, faults } = {}) {
  let current = devices;
  for (let i = 0; i < steps; i++) {
    const solved = solveCircuit(current, wires, standard, volts, { faults });
    current = applyProtectiveOutcome(current, solved);
    current = tickSimulation(current, wires, solved, frequency, dtSec);
  }
  return current;
}

export const byId = (devices, id) => devices.find((d) => d.id === id);
export const approx = (a, b, tol) => Math.abs(a - b) <= tol;
