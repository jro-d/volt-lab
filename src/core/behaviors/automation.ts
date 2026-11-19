import type { DeviceBehavior } from './types';
import { coilPowered, dcCoilPowered, withState } from './util';
import { reedClosed } from './fieldDevices';
import type { PlcRuntime } from '../plcEngine';

/**
 * Batch 3.7 (automation): 5/2 solenoid valve, double-acting cylinder, an analog I/O module and an HMI panel
 * bound to a PLC. The reed switch of batch 3.4 gains a link to the cylinder end positions here.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// ── 5/2 double-solenoid valve ────────────────────────────────────────────────────────────────
/** Y1 advances, Y2 retracts; with neither energized the spool stays where it was (memory); both energized: blocked. */
export const valve52Behavior: DeviceBehavior = {
  types: ['valve_52'],
  coils: () => [{ a: 'y1_a1', b: 'y1_a2', watts: 6 }, { a: 'y2_a1', b: 'y2_a2', watts: 6 }],
  tick(dev, ctx) {
    const y1 = coilPowered(ctx.solved, dev, 'y1_a1', 'y1_a2');
    const y2 = coilPowered(ctx.solved, dev, 'y2_a1', 'y2_a2');
    const spool = y1 && y2 ? 'blocked' : y1 ? 'adv' : y2 ? 'ret' : (dev.state.spool === 'blocked' ? 'none' : (dev.state.spool as string) || 'none');
    return withState(dev, { y1, y2, spool });
  },
};

// ── Double-acting cylinder ───────────────────────────────────────────────────────────────────
/** Moves towards its end positions at 100 % per stroke time; no electrical terminals. */
export const cylinderBehavior: DeviceBehavior = {
  types: ['cylinder_da'],
  tick(dev, ctx, dt) {
    const valve = ctx.devices.find((d) => d.id === dev.state.valveId && d.type === 'valve_52');
    const spool = valve ? (valve.state.spool as string) : 'none';
    const rate = 100 / Math.max(num(dev.state.strokeSec, 2), 0.2);
    let pos = num(dev.state.position, 0);
    if (spool === 'adv') pos = Math.min(100, pos + rate * dt);
    else if (spool === 'ret') pos = Math.max(0, pos - rate * dt);
    pos = round1(pos);
    return withState(dev, { position: pos, atExtended: pos >= 99, atRetracted: pos <= 1, moving: pos !== num(dev.state.position, 0) });
  },
};

/** The reed switch, optionally mounted on a cylinder end: it closes when the piston is at that end. */
export const reedSwitchLinkedBehavior: DeviceBehavior = {
  types: ['reed_switch'],
  edges: (dev) => (reedClosed(dev.state) ? [['no_13', 'no_14']] : []),
  tick(dev, ctx) {
    const cyl = ctx.devices.find((d) => d.id === dev.state.cylinderId && d.type === 'cylinder_da');
    if (!cyl) return dev;
    const atEnd = dev.state.endPos === 'retracted' ? !!cyl.state.atRetracted : !!cyl.state.atExtended;
    // the magnet is at the middle of the operating window when the piston is at the switch, far away otherwise
    return withState(dev, { position: atEnd ? 50 : 0, windowLo: 40, windowHi: 60 });
  },
};

// ── Analog I/O module ────────────────────────────────────────────────────────────────────────
export type AnalogType = '4-20mA' | '0-10V';

/** Raw signal and engineering value of a channel at `pv` % of its span. */
export function analogChannel(type: AnalogType, pv: number, lo: number, hi: number, wireBreak = false) {
  const frac = Math.min(1, Math.max(0, pv / 100));
  const raw = wireBreak ? 0 : type === '4-20mA' ? 4 + 16 * frac : 10 * frac;
  const eng = lo + (hi - lo) * frac;
  const fault = wireBreak ? (type === '4-20mA' ? 'WIRE BREAK (below 3.8 mA)' : 'NO SIGNAL') : '';
  return { raw: Math.round(raw * 100) / 100, eng: Math.round(eng * 100) / 100, fault };
}

/** Two analog inputs and one output on 24 V: the process value sliders are the field signals. */
export const analogModuleBehavior: DeviceBehavior = {
  types: ['analog_io_module'],
  tick(dev, ctx) {
    const powered = dcCoilPowered(ctx.solved, dev, 'l_pos', 'm_neg');
    if (!powered) return withState(dev, { powered: false, raw1: 0, eng1: 0, raw2: 0, eng2: 0, fault1: '', fault2: '' });
    const c1 = analogChannel((dev.state.type1 as AnalogType) || '4-20mA', num(dev.state.pv1, 50), num(dev.state.lo1, 0), num(dev.state.hi1, 100), !!dev.state.break1);
    const c2 = analogChannel((dev.state.type2 as AnalogType) || '0-10V', num(dev.state.pv2, 50), num(dev.state.lo2, 0), num(dev.state.hi2, 100), !!dev.state.break2);
    const out = analogChannel('4-20mA', num(dev.state.aoPct, 50), 0, 100);
    return withState(dev, { powered: true, raw1: c1.raw, eng1: c1.eng, fault1: c1.fault, raw2: c2.raw, eng2: c2.eng, fault2: c2.fault, aoMa: out.raw });
  },
};

// ── HMI panel ────────────────────────────────────────────────────────────────────────────────
/** HMI soft buttons are virtual inputs of the PLC named in `plcId` (default addresses I0.4-I0.7); lamps show PLC bits. */
export const hmiBehavior: DeviceBehavior = {
  types: ['hmi_panel'],
  tick(dev, ctx) {
    const powered = dcCoilPowered(ctx.solved, dev, 'l_pos', 'm_neg') || coilPowered(ctx.solved, dev, 'l_pos', 'm_neg');
    const plc = ctx.devices.find((d) => d.id === dev.state.plcId);
    const rt = plc?.state.plcRuntime as PlcRuntime | undefined;
    const patch: Record<string, unknown> = { powered, linked: !!plc };
    for (let i = 1; i <= 4; i++) {
      const addr = String(dev.state[`lamp${i}Addr`] || `Q0.${i - 1}`);
      patch[`lamp${i}`] = powered && !!rt && !!rt.bits[addr];
    }
    return withState(dev, patch);
  },
};

/** Virtual PLC inputs raised by the HMI soft buttons that are bound to `plc` (addresses and states). */
export function hmiInputs(devices: { id: string; type: string; state: Record<string, any> }[], plcId: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const d of devices) {
    if (d.type !== 'hmi_panel' || d.state.plcId !== plcId || !d.state.powered) continue;
    for (let i = 1; i <= 4; i++) {
      const addr = String(d.state[`btn${i}Addr`] || `I0.${3 + i}`);
      if (d.state[`btn${i}`]) out[addr] = true;
    }
  }
  return out;
}
