import type { ElectricalDevice } from '../../types/electrical';
import type { DeviceBehavior } from './types';
import { coilPowered, dcCoilPowered, isLive, withState } from './util';

/**
 * Batch 3.3 (control and timing). Every device here is a small state machine: `tick` reads the coil / input
 * potentials of the latest solve and updates the device state, `edges` turns that state into contacts.
 * Contacts therefore follow the coil one simulation step (0.5 s) later, like the timer relay.
 */

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// ── Star-delta timer ─────────────────────────────────────────────────────────────────────────
export type StarDeltaPhase = 'idle' | 'star' | 'pause' | 'delta';

/**
 * Coil on: star contact closes for starSec, then both contacts stay open for the transition pause, then the
 * delta contact closes. The simulation step is 0.5 s, so a pause of 50-100 ms is modelled as one step.
 */
export const starDeltaTimerBehavior: DeviceBehavior = {
  types: ['star_delta_timer'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 4 }],
  edges: (dev) => (dev.state.phase === 'star' ? [['y_13', 'y_14']] : dev.state.phase === 'delta' ? [['d_23', 'd_24']] : []),
  tick(dev, ctx, dt) {
    const on = coilPowered(ctx.solved, dev, 'a1', 'a2');
    if (!on) return withState(dev, { phase: 'idle', elapsedSec: 0 });
    const starSec = num(dev.state.starSec, 5);
    const pauseSec = Math.max(num(dev.state.pauseMs, 100) / 1000, dt);
    let phase = (dev.state.phase as StarDeltaPhase) || 'idle';
    let elapsed = num(dev.state.elapsedSec, 0);
    if (phase === 'idle') {
      phase = 'star';
      elapsed = 0;
    }
    elapsed = round3(elapsed + dt);
    if (phase === 'star' && elapsed >= starSec) {
      phase = 'pause';
      elapsed = 0;
    } else if (phase === 'pause' && elapsed >= pauseSec) {
      phase = 'delta';
      elapsed = 0;
    }
    return withState(dev, { phase, elapsedSec: phase === 'delta' ? 0 : elapsed });
  },
};

// ── Counter relay ────────────────────────────────────────────────────────────────────────────
/** Counts rising edges of the count coil; the output latches at the preset; the reset coil clears it. */
export const counterRelayBehavior: DeviceBehavior = {
  types: ['counter_relay'],
  coils: () => [{ a: 'c1', b: 'c2', watts: 2 }, { a: 'r1', b: 'r2', watts: 2 }],
  edges: (dev) => (dev.state.out ? [['com_11', 'no_14']] : [['com_11', 'nc_12']]),
  tick(dev, ctx) {
    const count = coilPowered(ctx.solved, dev, 'c1', 'c2');
    const reset = coilPowered(ctx.solved, dev, 'r1', 'r2');
    let n = num(dev.state.count, 0);
    let out = !!dev.state.out;
    if (reset) {
      n = 0;
      out = false;
    } else if (count && !dev.state.countPrev) {
      n += 1;
      if (n >= num(dev.state.preset, 5)) out = true;
    }
    return withState(dev, { count: n, out, countPrev: count });
  },
};

// ── Impulse (latching) relay ─────────────────────────────────────────────────────────────────
export const impulseRelayBehavior: DeviceBehavior = {
  types: ['impulse_relay'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 3 }],
  edges: (dev) => (dev.state.latched ? [['no_13', 'no_14'], ['no_23', 'no_24']] : []),
  tick(dev, ctx) {
    const on = coilPowered(ctx.solved, dev, 'a1', 'a2');
    const latched = on && !dev.state.coilPrev ? !dev.state.latched : !!dev.state.latched;
    return withState(dev, { latched, coilPrev: on });
  },
};

// ── Staircase timer ──────────────────────────────────────────────────────────────────────────
/** Supply on l-n; any push on the pb input (live) restarts the run time; the output follows the run time. */
export const staircaseTimerBehavior: DeviceBehavior = {
  types: ['staircase_timer'],
  coils: () => [{ a: 'l', b: 'n', watts: 2 }],
  edges: (dev) => (dev.state.active ? [['l', 'out']] : []),
  tick(dev, ctx, dt) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    if (!powered) return withState(dev, { remainingSec: 0, active: false });
    const pb = isLive(ctx.solved, dev, 'pb');
    const remaining = pb ? num(dev.state.timeSec, 30) : Math.max(0, round3(num(dev.state.remainingSec, 0) - dt));
    return withState(dev, { remainingSec: remaining, active: remaining > 0 });
  },
};

// ── 24-hour time switch ──────────────────────────────────────────────────────────────────────
export const inWindow = (clockMin: number, onMin: number, offMin: number) =>
  onMin === offMin ? false : onMin < offMin ? clockMin >= onMin && clockMin < offMin : clockMin >= onMin || clockMin < offMin;

/** Clock advances `speed` simulated seconds per real second while the switch is powered. */
export const timeSwitchBehavior: DeviceBehavior = {
  types: ['time_switch_24h'],
  coils: () => [{ a: 'l', b: 'n', watts: 1 }],
  edges: (dev) => (dev.state.out ? [['com', 'no']] : [['com', 'nc']]),
  tick(dev, ctx, dt) {
    const powered = coilPowered(ctx.solved, dev, 'l', 'n');
    let clock = num(dev.state.clockMin, 480);
    if (powered) clock = round3((clock + (dt * num(dev.state.speed, 60)) / 60) % 1440);
    const mode = (dev.state.mode as string) || 'auto';
    const out = mode === 'on' ? true : mode === 'off' ? false : inWindow(clock, num(dev.state.onMin, 360), num(dev.state.offMin, 1080));
    return withState(dev, { clockMin: clock, out });
  },
};

// ── Alternating relay ────────────────────────────────────────────────────────────────────────
/** Each time the coil energizes the lead flips, so two pumps share the duty. */
export const alternatingRelayBehavior: DeviceBehavior = {
  types: ['alternating_relay'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 3 }],
  edges: (dev) => (!dev.state.coilOn ? [] : dev.state.lead === 2 ? [['no_23', 'no_24']] : [['no_13', 'no_14']]),
  tick(dev, ctx) {
    const on = coilPowered(ctx.solved, dev, 'a1', 'a2');
    const lead = on && !dev.state.coilOn ? (dev.state.lead === 1 ? 2 : 1) : num(dev.state.lead, 2);
    return withState(dev, { coilOn: on, lead });
  },
};

// ── Solid-state relay ────────────────────────────────────────────────────────────────────────
/** Input is a 3-32 V DC or AC control; the output switches without contact bounce (leakage when off is not modelled in the solver). */
export const ssrBehavior: DeviceBehavior = {
  types: ['ssr_1p'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 1 }],
  edges: (dev) => (dev.state.on ? [['t1', 't2']] : []),
  tick(dev, ctx) {
    const on = coilPowered(ctx.solved, dev, 'a1', 'a2') || dcCoilPowered(ctx.solved, dev, 'a1', 'a2');
    return withState(dev, { on });
  },
};

// ── Operators (pushbuttons, selectors, foot switch, pendant) ─────────────────────────────────
export type OperatorKind = 'illuminated_pb' | 'key_selector' | 'selector_2pos' | 'foot_switch' | 'pendant_station';

/** Contact A (13-14) and B (23-24) closed? The NC block 21-22 is open whenever either is closed. */
export function operatorContacts(state: Record<string, any>): { a: boolean; b: boolean; nc: boolean } {
  const kind = (state.operatorKind as OperatorKind) || 'illuminated_pb';
  if (kind === 'key_selector' || kind === 'selector_2pos') return { a: state.pos === 1, b: false, nc: state.pos !== 1 };
  if (kind === 'foot_switch') {
    const a = !!state.pressed && !!state.guardOpen;
    return { a, b: false, nc: !a };
  }
  // pendant: the two buttons are interlocked (both pressed closes neither NO) and either one opens the NC block
  if (kind === 'pendant_station') return { a: !!state.pressed && !state.pressedB, b: !!state.pressedB && !state.pressed, nc: !state.pressed && !state.pressedB };
  return { a: !!state.pressed, b: false, nc: !state.pressed };
}

export const operatorBehavior: DeviceBehavior = {
  types: ['operator_pilot'],
  coils: () => [{ a: 'x1', b: 'x2', watts: 2 }],
  edges(dev) {
    const { a, b, nc } = operatorContacts(dev.state);
    const out: [string, string][] = [];
    if (a) out.push(['no_13', 'no_14']);
    if (b) out.push(['no_23', 'no_24']);
    if (nc) out.push(['nc_21', 'nc_22']);
    return out;
  },
  tick(dev, ctx) {
    const lit = coilPowered(ctx.solved, dev, 'x1', 'x2');
    return withState(dev, { lit });
  },
};

// ── Auxiliary contact block and mechanical interlock ─────────────────────────────────────────
/** Add-on block: its contacts follow the contactor named in `parentId`. */
export const auxBlockBehavior: DeviceBehavior = {
  types: ['aux_contact_block'],
  edges: (dev) => (dev.state.engaged
    ? [['no_53', 'no_54'], ['no_63', 'no_64']]
    : [['nc_71', 'nc_72'], ['nc_81', 'nc_82']]),
  tick(dev, ctx) {
    const parent = ctx.devices.find((d) => d.id === dev.state.parentId);
    const engaged = !!parent && !!ctx.solved.deviceEnergized[parent.id];
    return withState(dev, { engaged });
  },
};

/** The interlock itself has no electrical terminals: the solver reads `a` and `b` (see circuitSolver.ts). */
export const interlockBehavior: DeviceBehavior = { types: ['mechanical_interlock'] };

/** True when `device` is held out by a mechanical interlock because its partner is already pulled in. */
export function interlockedOut(devices: ElectricalDevice[], device: ElectricalDevice): boolean {
  for (const il of devices) {
    if (il.type !== 'mechanical_interlock') continue;
    const partnerId = il.state.a === device.id ? il.state.b : il.state.b === device.id ? il.state.a : null;
    if (!partnerId) continue;
    const partner = devices.find((d) => d.id === partnerId);
    if (partner && partner.state.coilEnergized) return true;
  }
  return false;
}

// ── Safety relay ─────────────────────────────────────────────────────────────────────────────
/**
 * Dual-channel safety relay with monitored start. While the supply is on, s11 / s21 / x1 carry the supply
 * through the relay. Each channel is closed when its return (s12, s22) is live. The outputs close when both
 * channels are closed and (manual start) the start loop x1-x2 has been closed after the channels. A channel
 * that is closed while the other stays open is a discrepancy fault that locks the relay out until both open.
 */
export const safetyRelayBehavior: DeviceBehavior = {
  types: ['safety_relay'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 3 }],
  edges(dev) {
    const out: [string, string][] = [];
    if (dev.state.powered) out.push(['a1', 's11'], ['a1', 's21'], ['a1', 'x1']);
    if (dev.state.outOn) out.push(['no_13', 'no_14'], ['no_23', 'no_24']);
    else out.push(['nc_31', 'nc_32']);
    return out;
  },
  tick(dev, ctx) {
    const powered = coilPowered(ctx.solved, dev, 'a1', 'a2');
    const ch1 = powered && isLive(ctx.solved, dev, 's12');
    const ch2 = powered && isLive(ctx.solved, dev, 's22');
    const x2 = isLive(ctx.solved, dev, 'x2');
    const auto = dev.state.startMode === 'auto';
    let outOn = !!dev.state.outOn;
    let fault = !!dev.state.fault;
    let discrepancy = !!dev.state.discrepancy;
    if (!ch1 && !ch2) {
      fault = false;
      discrepancy = false;
    } else if (ch1 !== ch2) {
      // one channel closed, the other open: allowed for one step (switch travel), a fault if it persists
      if (discrepancy) fault = true;
      discrepancy = true;
    } else {
      discrepancy = false;
    }
    const channelsOk = ch1 && ch2 && !fault;
    if (!channelsOk) outOn = false;
    else if (!outOn && (auto || (x2 && !dev.state.x2Prev))) outOn = true;
    return withState(dev, { powered, ch1, ch2, outOn, fault, discrepancy, x2Prev: x2 });
  },
};

// ── Two-hand station ─────────────────────────────────────────────────────────────────────────
/** Both palm buttons must be pressed within 0.5 s of each other (timestamps recorded by the UI). */
export const twoHandBehavior: DeviceBehavior = {
  types: ['two_hand_station'],
  coils: () => [{ a: 'a1', b: 'a2', watts: 3 }],
  edges: (dev) => (dev.state.armed ? [['no_13', 'no_14']] : []),
  tick(dev, ctx) {
    const powered = coilPowered(ctx.solved, dev, 'a1', 'a2');
    const l = !!dev.state.leftPressed;
    const r = !!dev.state.rightPressed;
    const together = Math.abs(num(dev.state.leftAt, 0) - num(dev.state.rightAt, 1e9)) <= 500;
    let armed = !!dev.state.armed;
    let needRelease = !!dev.state.needRelease;
    if (!l && !r) needRelease = false;
    if (!(l && r)) armed = false;
    else if (!armed && !needRelease) {
      if (together && powered) armed = true;
      else needRelease = true; // pressed too far apart (or one button tied down): release both first
    }
    if (!powered) armed = false;
    return withState(dev, { armed, needRelease });
  },
};

// ── Door interlock and pull-cord switch ──────────────────────────────────────────────────────
export const doorInterlockBehavior: DeviceBehavior = {
  types: ['door_interlock_switch'],
  edges: (dev) => (dev.state.doorClosed !== false ? [['nc_11', 'nc_12'], ['nc_21', 'nc_22']] : [['no_33', 'no_34']]),
};

export const pullCordBehavior: DeviceBehavior = {
  types: ['pull_cord_switch'],
  edges: (dev) => (dev.state.pulled ? [['no_23', 'no_24']] : [['nc_11', 'nc_12']]),
};
