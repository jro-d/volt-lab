import type { ElectricalDevice, ElectricalWire } from '../types/electrical';
import type { CodeStandard } from '../types/electrical';
import { MOTOR_START_SEC, timeToTrip, type TripCurveKind } from './tripCurves';
import { CABLE_DAMAGE_K, getWireStandards } from '../data/standardsData';

/**
 * Time-current coordination curves. Everything comes from tripCurves.ts (the single source of truth for the
 * nominal characteristic); this module adds what a coordination plot needs on top of it:
 *
 *  - a tolerance BAND around the nominal curve (fastest and slowest time at a given current),
 *  - the device -> curve mapping,
 *  - the motor starting envelope and the cable damage (I2t) limit,
 *  - overlap detection between two devices in a chain.
 *
 * The bands are teaching approximations: the nominal time at the current shifted by +/- the tolerance below, not
 * the manufacturer's certified min / max curves.
 */

/** Current tolerance applied either side of the nominal curve (fraction of the current). */
export const BAND_TOLERANCE: Record<TripCurveKind, number> = {
  mcb_B: 0.25,
  mcb_C: 0.25,
  mcb_D: 0.25,
  fuse_gG: 0.1,
  fuse_aM: 0.1,
  overload_class10: 0.1,
  mccb_thermal: 0.15,
};

/** Plot limits: times beyond these are drawn as "no trip" / instantaneous */
export const T_MAX = 10000;
export const T_MIN = 0.001;

export interface DeviceCurveSpec {
  deviceId: string;
  label: string;
  kind: TripCurveKind;
  /** Rated current in the curve's own terms (In for breakers and fuses, Ir for relays and MCCBs) */
  rated: number;
  /** Instantaneous trip level in amps (breakers with a magnetic element), if known */
  instantaneousAmps?: number;
}

const tagOf = (d: ElectricalDevice) => (typeof d.state.tag === 'string' && d.state.tag) || d.name.split(' ')[0] || d.id;

/** The time-current curve of a device, or null when it has none (a contactor, a switch, a load ...). */
export function curveForDevice(dev: ElectricalDevice): DeviceCurveSpec | null {
  const s = dev.state;
  const label = `${tagOf(dev)}`;
  switch (dev.type) {
    case 'mcb_1p':
    case 'mcb_2p':
    case 'mcb_3p':
    case 'service_disconnect_2p':
    case 'safety_breaker_2p':
    case 'rcbo_1pn': {
      const c = s.tripCurve === 'B' ? 'mcb_B' : s.tripCurve === 'D' ? 'mcb_D' : 'mcb_C';
      const rated = Number(s.ratedAmps) || 16;
      return { deviceId: dev.id, label: `${label} ${c.slice(4)}${rated}`, kind: c, rated };
    }
    case 'fuse_holder_1p':
    case 'fuse_switch_disconnector_3p': {
      const kind: TripCurveKind = s.fuseKind === 'aM' ? 'fuse_aM' : 'fuse_gG';
      const rated = Number(s.ratedAmps) || 16;
      return { deviceId: dev.id, label: `${label} ${kind === 'fuse_aM' ? 'aM' : 'gG'}${rated}`, kind, rated };
    }
    case 'thermal_overload_relay': {
      const rated = Number(s.tripAmps) || 6;
      return { deviceId: dev.id, label: `${label} OLR ${rated}A`, kind: 'overload_class10', rated };
    }
    case 'mccb_3p': {
      const ir = (Number(s.ratedAmps) || 100) * (Number(s.irFactor) || 1);
      const im = ir * (Number(s.imFactor) || 5);
      return { deviceId: dev.id, label: `${label} MCCB ${Math.round(ir)}A`, kind: 'mccb_thermal', rated: ir, instantaneousAmps: im };
    }
    default:
      return null;
  }
}

const clampT = (t: number) => Math.min(T_MAX, Math.max(T_MIN, t));

/** Fastest and slowest operating time at `amps`. null when the device cannot operate at that current. */
export function bandAt(spec: DeviceCurveSpec, amps: number): { tMin: number; tMax: number } | null {
  if (amps <= 0 || spec.rated <= 0) return null;
  const tol = BAND_TOLERANCE[spec.kind];
  const m = amps / spec.rated;
  let tMin = timeToTrip(spec.kind, spec.rated, m * (1 + tol));
  let tMax = timeToTrip(spec.kind, spec.rated, m * (1 - tol));
  if (!Number.isFinite(tMin)) return null; // even the fast side does not operate
  if (!Number.isFinite(tMax)) tMax = T_MAX;
  // MCCB instantaneous element: above Im the trip is instantaneous
  if (spec.instantaneousAmps && amps >= spec.instantaneousAmps) {
    tMin = 0.005;
    tMax = Math.min(tMax, 0.05);
  }
  return { tMin: clampT(Math.min(tMin, tMax)), tMax: clampT(Math.max(tMin, tMax)) };
}

/** Nominal trip time at `amps` (Infinity = never) */
export function nominalTime(spec: DeviceCurveSpec, amps: number): number {
  const t = timeToTrip(spec.kind, spec.rated, amps / spec.rated);
  return spec.instantaneousAmps && amps >= spec.instantaneousAmps ? 0.01 : t;
}

// ── motor starting ───────────────────────────────────────────────────────────────────────────

/** Starting-current multiple the solver uses for a direct-on-line start */
export const MOTOR_START_MULTIPLE = 6;

export interface MotorStartSpec {
  deviceId: string;
  label: string;
  /** Full-load current, A */
  fla: number;
  /** Starting current, A, and how long it lasts (s) */
  startAmps: number;
  startSec: number;
}

/** Full-load line current of a 3-phase motor with the solver's efficiency x power factor of 0.6 */
export function motorFla(dev: ElectricalDevice, lineVolts = 440): number {
  const measured = Number(dev.state.measuredAmps);
  if (measured > 0) return measured;
  const watts = Number(dev.state.wattage) || (Number(dev.state.kw) || 0) * 1000 || 2200;
  return watts / (Math.sqrt(3) * lineVolts * 0.6);
}

export function motorStartSpec(dev: ElectricalDevice, lineVolts = 440): MotorStartSpec {
  const fla = motorFla(dev, lineVolts);
  return { deviceId: dev.id, label: tagOf(dev), fla, startAmps: fla * MOTOR_START_MULTIPLE, startSec: MOTOR_START_SEC };
}

// ── cable damage ─────────────────────────────────────────────────────────────────────────────

export interface CableLimitSpec {
  wireId: string;
  label: string;
  /** Cross-section, mm2 */
  area: number;
  k: number;
  kNeedsVerification: boolean;
}

/** Conductor area from the wire's gauge name; null if the gauge is unknown. */
export function cableLimitSpec(wire: ElectricalWire, standard: CodeStandard): CableLimitSpec | null {
  const std = getWireStandards(standard).find((s) => s.name === wire.wireGauge);
  if (!std) return null;
  const { k, needsVerification } = CABLE_DAMAGE_K.copper_pvc;
  return { wireId: wire.id, label: `Cable ${wire.wireGauge}`, area: std.crossSectionMm2, k, kNeedsVerification: needsVerification };
}

/**
 * Adiabatic withstand: the time a conductor survives a fault current, t = (k x S / I)^2 with S in mm2 and I in A.
 * Valid for fault durations up to about 5 s.
 */
export function cableDamageTime(spec: Pick<CableLimitSpec, 'area' | 'k'>, amps: number): number {
  if (amps <= 0) return Infinity;
  return Math.pow((spec.k * spec.area) / amps, 2);
}

// ── coordination ─────────────────────────────────────────────────────────────────────────────

export interface Overlap {
  upstreamId: string;
  downstreamId: string;
  /** Current ranges (A) where both devices could operate in the same time window */
  ranges: [number, number][];
  /** Lowest overlapping current, A (selective below it); null when the pair is selective everywhere */
  selectiveUpTo: number | null;
}

const logGrid = (lo: number, hi: number, n: number) => Array.from({ length: n }, (_, i) => lo * Math.pow(hi / lo, i / (n - 1)));

/**
 * Where two devices in a chain are NOT selective: for each current, the downstream device's slowest time is not
 * faster than the upstream device's fastest time, so the upstream one may operate as well.
 */
export function findOverlap(upstream: DeviceCurveSpec, downstream: DeviceCurveSpec, loAmps: number, hiAmps: number): Overlap {
  const grid = logGrid(Math.max(loAmps, 0.1), hiAmps, 400);
  const ranges: [number, number][] = [];
  let open: number | null = null;
  let last = grid[0];
  for (const i of grid) {
    const up = bandAt(upstream, i);
    const down = bandAt(downstream, i);
    const overlapping = !!up && !!down && down.tMax >= up.tMin;
    if (overlapping && open === null) open = i;
    if (!overlapping && open !== null) {
      ranges.push([open, last]);
      open = null;
    }
    last = i;
  }
  if (open !== null) ranges.push([open, last]);
  return { upstreamId: upstream.deviceId, downstreamId: downstream.deviceId, ranges, selectiveUpTo: ranges.length ? ranges[0][0] : null };
}

/** Current (A) through a device, from the solver's wire currents: the largest on any wire attached to it. */
export function operatingAmps(dev: ElectricalDevice, wires: ElectricalWire[], wireCurrents: Record<string, number>): number {
  let amps = 0;
  for (const w of wires) if (w.fromDeviceId === dev.id || w.toDeviceId === dev.id) amps = Math.max(amps, wireCurrents[w.id] || 0);
  return amps;
}

/** Plot range for a set of curves: a decade below the smallest rating to a few decades above the largest. */
export function plotRange(specs: DeviceCurveSpec[], extraAmps: number[] = []): [number, number] {
  const rated = [...specs.map((s) => s.rated), ...extraAmps.filter((a) => a > 0)];
  const lo = rated.length ? Math.min(...rated) : 1;
  const hi = rated.length ? Math.max(...rated) : 100;
  const lo10 = Math.pow(10, Math.floor(Math.log10(lo * 0.5)));
  const hi10 = Math.pow(10, Math.ceil(Math.log10(hi * 40)));
  return [Math.max(0.1, lo10), Math.min(1e6, hi10)];
}
