import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior, TickContext } from './types';
import { coilPowered, isLive, withState } from './util';

/**
 * Batch 3.4 (sensors and field devices). Like the control modules these decide their contacts in the tick
 * from the process model (tank level, line pressure and flow), a small thermal model, the position of a
 * target or the state of another device, so contacts follow one simulation step later.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// ── Electrode level relay ────────────────────────────────────────────────────────────────────
/**
 * Supply on A1-A2. The probes sit at the min and max levels of the shared tank: in 'fill' mode the output
 * (com-no) closes when the level drops below the min probe and opens when it reaches the max probe;
 * 'drain' mode is the other way round.
 */
export const electrodeLevelBehavior: DeviceBehavior = {
  types: ['electrode_level_relay'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 2 }],
  edges: (dev) => (dev.state.out ? [['com', 'no']] : [['com', 'nc']]),
  tick(dev, ctx) {
    const powered = coilPowered(ctx.solved, dev, 'a1', 'a2');
    const level = ctx.process ? ctx.process.tankLevel : num(dev.state.level, 0);
    const lo = num(dev.state.minPct, 30);
    const hi = num(dev.state.maxPct, 70);
    const fill = dev.state.mode !== 'drain';
    let out = !!dev.state.out;
    if (!powered) out = false;
    else if (fill) {
      if (level < lo) out = true;
      else if (level >= hi) out = false;
    } else if (level >= hi) out = true;
    else if (level < lo) out = false;
    return withState(dev, { level: round1(level), out, minWet: level >= lo, maxWet: level >= hi, powered });
  },
};

// ── Thermal model shared by the thermostat and the thermocouple ──────────────────────────────
/** One step of a first-order temperature: it moves towards the ambient and is heated while `heaterId` is energized. */
export function thermalStep(state: Record<string, any>, ctx: TickContext, dt: number): number {
  const t = num(state.tempC, 20);
  const ambient = num(state.ambientC, 15);
  const heater = state.heaterId ? ctx.devices.find((d) => d.id === state.heaterId) : undefined;
  const heating = !!heater && !!ctx.solved.deviceEnergized[heater.id];
  const rate = num(state.heatRate, 0.5); // degrees C per second at full heat
  const k = num(state.coolK, 0.02); // fraction of the gap to ambient lost per second
  const next = t + ((ambient - t) * k + (heating ? rate : 0)) * dt;
  return round1(Math.min(1200, Math.max(-50, next)));
}

/** Thermostat (changeover): `tempC` follows the thermal model; heating mode closes the NO contact when cold. */
export const thermostatBehavior: DeviceBehavior = {
  types: ['thermostat'],
  edges: (dev) => (dev.state.out ? [['com', 'no']] : [['com', 'nc']]),
  tick(dev, ctx, dt) {
    const temp = thermalStep(dev.state, ctx, dt);
    const sp = num(dev.state.setpointC, 22);
    const h = num(dev.state.hystC, 2) / 2;
    const heat = dev.state.mode !== 'cool';
    let out = !!dev.state.out;
    if (heat) {
      if (temp <= sp - h) out = true;
      else if (temp >= sp + h) out = false;
    } else if (temp >= sp + h) out = true;
    else if (temp <= sp - h) out = false;
    return withState(dev, { tempC: temp, out });
  },
};

/** Thermocouple (type K sensor head): a temperature source for the controller, heated by `heaterId`. */
export const thermocoupleBehavior: DeviceBehavior = {
  types: ['thermocouple_k'],
  tick(dev, ctx, dt) {
    return withState(dev, { tempC: thermalStep(dev.state, ctx, dt) });
  },
};

/** The thermocouple wired to the controller's tc_pos and tc_neg inputs (both must be connected to the same probe). */
export function findThermocouple(ctx: TickContext, dev: ElectricalDevice): ElectricalDevice | null {
  const probeOn = (terminal: string): string | null => {
    for (const w of ctx.wires) {
      if (w.fromDeviceId === dev.id && w.fromTerminalId === terminal) return `${w.toDeviceId}:${w.toTerminalId}`;
      if (w.toDeviceId === dev.id && w.toTerminalId === terminal) return `${w.fromDeviceId}:${w.fromTerminalId}`;
    }
    return null;
  };
  const p = probeOn('tc_pos');
  const n = probeOn('tc_neg');
  if (!p || !n) return null;
  const [pd, pt] = p.split(':');
  const [nd, nt] = n.split(':');
  const probe = ctx.devices.find((d) => d.id === pd);
  if (!probe || probe.type !== 'thermocouple_k' || pd !== nd || pt !== 'tc_pos' || nt !== 'tc_neg') return null;
  return probe;
}

/** Temperature controller: process value from the wired thermocouple, setpoint and hysteresis, relay output. */
export const tempControllerBehavior: DeviceBehavior = {
  types: ['temp_controller'],
  coils: () => [{ a: 'l', b: 'n', watts: 4 }],
  edges: (dev) => (dev.state.out ? [['com', 'no']] : []),
  tick(dev, ctx) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    const probe = findThermocouple(ctx, dev);
    if (!powered) return withState(dev, { out: false, pv: 0, fault: '' });
    if (!probe) return withState(dev, { out: false, pv: 0, fault: 'SENSOR BREAK' });
    const pv = num(probe.state.tempC, 20);
    const sp = num(dev.state.setpointC, 80);
    const h = num(dev.state.hystC, 4) / 2;
    const heat = dev.state.mode !== 'cool';
    let out = !!dev.state.out;
    if (heat) {
      if (pv <= sp - h) out = true;
      else if (pv >= sp + h) out = false;
    } else if (pv >= sp + h) out = true;
    else if (pv <= sp - h) out = false;
    return withState(dev, { pv: round1(pv), out, fault: '' });
  },
};

// ── Reed switch ──────────────────────────────────────────────────────────────────────────────
/** Closed while the magnet is within the operating window around the switch (position 0-100). */
export const reedClosed = (state: Record<string, any>) => {
  const pos = num(state.position, 0);
  return pos >= num(state.windowLo, 40) && pos <= num(state.windowHi, 60);
};
export const reedSwitchBehavior: DeviceBehavior = {
  types: ['reed_switch'],
  edges: (dev) => (reedClosed(dev.state) ? [['no_13', 'no_14']] : []),
};

// ── Photocell (dusk switch) ──────────────────────────────────────────────────────────────────
export const photocellBehavior: DeviceBehavior = {
  types: ['photocell_switch'],
  coils: () => [{ a: 'l', b: 'n', watts: 1 }],
  edges: (dev) => (dev.state.on ? [['l', 'out']] : []),
  tick(dev, ctx) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    const lux = num(dev.state.lux, 500);
    const th = num(dev.state.thresholdLux, 50);
    let on = !!dev.state.on;
    if (lux < th) on = true;
    else if (lux > th * 1.5) on = false; // hysteresis so a cloud does not flicker the lamp
    return withState(dev, { on: powered && on, dark: lux < th });
  },
};

// ── PIR occupancy sensor ─────────────────────────────────────────────────────────────────────
/** A detection (the `motion` toggle) holds the output for holdSec; a daylight lock can block it. */
export const pirBehavior: DeviceBehavior = {
  types: ['pir_sensor'],
  coils: () => [{ a: 'l', b: 'n', watts: 1 }],
  edges: (dev) => (dev.state.on ? [['l', 'out']] : []),
  tick(dev, ctx, dt) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    if (!powered) return withState(dev, { remainingSec: 0, on: false });
    const dark = !dev.state.daylightLock || num(dev.state.lux, 0) < num(dev.state.thresholdLux, 50);
    let remaining = num(dev.state.remainingSec, 0);
    if (dev.state.motion && dark) remaining = num(dev.state.holdSec, 30);
    else remaining = Math.max(0, Math.round((remaining - dt) * 1000) / 1000);
    return withState(dev, { remainingSec: remaining, on: remaining > 0 });
  },
};

// ── Flow switch ──────────────────────────────────────────────────────────────────────────────
/** Flow is the draw-off of the shared process while the line holds pressure; the contact is a changeover. */
export const flowSwitchBehavior: DeviceBehavior = {
  types: ['flow_switch'],
  edges: (dev) => (dev.state.flowing ? [['com', 'no']] : [['com', 'nc']]),
  tick(dev, ctx) {
    const lpm = ctx.process && ctx.process.lineBar > 0.3 ? ctx.process.drawOffLpm : 0;
    const flowing = lpm >= num(dev.state.thresholdLpm, 5);
    return withState(dev, { lpm: round1(lpm), flowing });
  },
};

// ── Zero-speed switch ────────────────────────────────────────────────────────────────────────
/** Estimates the speed of the motor named in `motorId`: full while it runs, coasting down after it stops. */
export const zeroSpeedBehavior: DeviceBehavior = {
  types: ['zero_speed_switch'],
  edges: (dev) => (dev.state.zero ? [['com', 'no']] : [['com', 'nc']]),
  tick(dev, ctx, dt) {
    const motor = ctx.devices.find((d) => d.id === dev.state.motorId);
    const measured = motor && typeof motor.state.speedPct === 'number' ? (motor.state.speedPct as number) : undefined;
    const running = !!motor && (measured !== undefined ? measured > 0 : !!motor.state.running);
    const decay = Math.max(num(dev.state.coastSec, 6), 0.5);
    const speed = running ? (measured ?? 100) : Math.max(0, num(dev.state.speedPct, 0) - (100 / decay) * dt);
    return withState(dev, { speedPct: round1(speed), zero: !!motor && speed < num(dev.state.setPct, 5) });
  },
};

// ── Solenoid valve ───────────────────────────────────────────────────────────────────────────
export const solenoidValveBehavior: DeviceBehavior = {
  types: ['solenoid_valve'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 8 }],
  tick(dev, ctx) {
    return withState(dev, { open: coilPowered(ctx.solved, dev, 'a1', 'a2') || !!dev.state.manual });
  },
};

// ── Fire alarm loop ──────────────────────────────────────────────────────────────────────────
export const smokeDetectorBehavior: DeviceBehavior = {
  types: ['smoke_detector'],
  edges: (dev) => (dev.state.smoke ? [['a', 'b']] : []),
};

export const callPointBehavior: DeviceBehavior = {
  types: ['manual_call_point'],
  edges: (dev) => (dev.state.pulled ? [['a', 'b']] : []),
};

/**
 * Conventional fire alarm panel: while powered, loop_out carries the supply; a detector or call point that
 * closes puts it on loop_in and the panel latches ALARM. The bell output is live during an alarm until it is
 * silenced; the relay (com, no, nc) shows the alarm; RESET clears the latch once the loop is clear.
 */
export const fireAlarmPanelBehavior: DeviceBehavior = {
  types: ['fire_alarm_panel'],
  coils: () => [{ a: 'l', b: 'n', watts: 5 }],
  edges(dev) {
    const out: [string, string][] = [];
    if (dev.state.powered) out.push(['l', 'loop_out']);
    if (dev.state.alarm && !dev.state.silenced) out.push(['l', 'bell']);
    out.push(dev.state.alarm ? ['com', 'no'] : ['com', 'nc']);
    return out;
  },
  tick(dev, ctx) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    const tripped = powered && isLive(ctx.solved, dev, 'loop_in');
    let alarm = !!dev.state.alarm;
    let silenced = !!dev.state.silenced;
    if (!powered) {
      alarm = false;
      silenced = false;
    } else if (tripped && !alarm) {
      alarm = true;
      silenced = false;
    }
    if (dev.state.resetRequested) {
      if (!tripped) {
        alarm = false;
        silenced = false;
      }
      return withState(dev, { powered, alarm, silenced, loopTripped: tripped, resetRequested: false });
    }
    return withState(dev, { powered, alarm, silenced, loopTripped: tripped });
  },
};
