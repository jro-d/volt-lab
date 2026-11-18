import type { DeviceBehavior } from './types';
import { withState } from './util';
import { emptyRuntime, ioMap, scanProgram, type PlcForces, type PlcProgram, type PlcRuntime } from '../plcEngine';

/** Upper bound of scans per simulation step (10 ms scan time over a 0.5 s step would be 50). */
const MAX_SCANS_PER_STEP = 50;

/**
 * User-programmed PLC. When a device's `program` is 'user' (and it has a `plcProgram`), every simulation step runs
 * the scan engine instead of the fixed demo behaviours ('passthrough' / 'start_stop_latch', which stay in
 * circuitSolver.ts for older labs). The inputs are the ones the solver read from the wired terminals at the last
 * solve; the outputs are written back to `plcOutputs`, which the solver turns into relay / transistor contacts on
 * its next solve.
 *
 * Several scans run per step (step length / scan time), all with the same input snapshot, so timers and counters
 * advance by the scan time each scan and add up to real simulated time.
 */
export const plcProgramBehavior: DeviceBehavior = {
  types: ['plc_micro_controller', 'plc_24vdc_16io'],

  tick(dev, ctx, dtSec) {
    const program = dev.state.plcProgram as PlcProgram | undefined;
    if (dev.state.program !== 'user' || !program) return dev;

    const map = ioMap(dev.type);
    const running = !!ctx.solved.deviceEnergized[dev.id] && dev.state.plcRunning !== false;
    const outKeys = Object.values(map.outputs);

    if (!running) {
      const off: Record<string, boolean> = {};
      for (const k of outKeys) off[k] = false;
      return withState(dev, { plcOutputs: off, plcRuntime: undefined, plcScans: 0 });
    }

    const rawInputs = (dev.state.plcInputs || {}) as Record<string, boolean>;
    const inputs: Record<string, boolean> = {};
    for (const [addr, key] of Object.entries(map.inputs)) inputs[addr] = !!rawInputs[key];

    const forces = (dev.state.plcForces || { inputs: {}, outputs: {} }) as PlcForces;
    let rt: PlcRuntime = (dev.state.plcRuntime as PlcRuntime | undefined) || emptyRuntime();
    const scanMs = Math.max(10, Math.min(500, program.scanMs || 100));
    const scans = Math.max(1, Math.min(MAX_SCANS_PER_STEP, Math.round((dtSec * 1000) / scanMs)));
    let outputs: Record<string, boolean> = {};
    for (let i = 0; i < scans; i++) {
      const r = scanProgram(program, rt, inputs, forces);
      rt = r.runtime;
      outputs = r.outputs;
    }
    const plcOutputs: Record<string, boolean> = {};
    for (const [addr, key] of Object.entries(map.outputs)) plcOutputs[key] = !!outputs[addr];
    // plain updates: the runtime is a new object every step, which is what the monitor view reads
    return { ...dev, state: { ...dev.state, plcOutputs, plcRuntime: rt, plcScans: rt.scans } };
  },
};
