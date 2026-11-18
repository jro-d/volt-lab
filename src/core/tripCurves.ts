/**
 * Time-current characteristics for protective devices, as piecewise log-log tables.
 *
 * Each table lists (multiple of rated current, time in seconds) points. Between two points the time is
 * interpolated linearly on log-log axes (the usual way curves are drawn). Below the first point the device
 * never operates (returns Infinity); above the last point the last time applies.
 *
 * These are teaching models shaped to the conventional values of each standard, not manufacturer curves:
 *  - mcb_B / mcb_C / mcb_D  IEC 60898-1: no trip at 1.13 In within 1 h, trip within 1 h at 1.45 In, trip in
 *    1-60 s at 2.55 In, instantaneous (magnetic) trip at 3-5 In (B), 5-10 In (C), 10-20 In (D).
 *  - fuse_gG   IEC 60269-1 / 60269-2: conventional non-fusing current 1.25 In and fusing current 1.6 In
 *    (conventional time 1 h for 16-63 A).
 *  - fuse_aM   IEC 60269-1 / 60269-2: motor back-up fuse; no overload protection below about 4 In and it
 *    must ride through a motor start (6.3 In for at least 5 s).
 *  - mccb_thermal  IEC 60947-2 long-time element (teaching shape, multiples of Ir).
 *  - overload_class10  IEC 60947-4-1: trip class 10 (7.2 Ir trips in more than 4 s and at most 10 s;
 *    1.5 Ir within 2 min; 1.2 Ir within 2 h; no trip at 1.05 Ir).
 */
export type TripCurveKind = 'mcb_B' | 'mcb_C' | 'mcb_D' | 'fuse_gG' | 'fuse_aM' | 'overload_class10' | 'mccb_thermal';

type CurvePoint = readonly [multiple: number, seconds: number];

const CURVES: Record<TripCurveKind, readonly CurvePoint[]> = {
  mcb_B: [[1.13, 7200], [1.45, 1800], [2.55, 20], [3, 8], [5, 0.02], [10, 0.01]],
  mcb_C: [[1.13, 7200], [1.45, 1800], [2.55, 20], [5, 6], [10, 0.02], [20, 0.01]],
  mcb_D: [[1.13, 7200], [1.45, 1800], [2.55, 20], [10, 6], [20, 0.02], [30, 0.01]],
  fuse_gG: [[1.25, 7200], [1.6, 3000], [2, 300], [3, 40], [5, 3], [10, 0.1], [20, 0.01]],
  fuse_aM: [[4, 400], [6.3, 10], [8, 2], [10, 0.5], [20, 0.02]],
  overload_class10: [[1.05, 7200], [1.2, 5400], [1.5, 100], [7.2, 7], [10, 3.5]],
  // MCCB long-time (thermal) element, multiples of the Ir setting: teaching shape of IEC 60947-2, not a manufacturer curve
  mccb_thermal: [[1.05, 7200], [1.3, 3600], [2, 300], [6, 15], [10, 3]],
};

/** How long a motor start draws inrush in the model (s). A correctly sized aM fuse rides through it. */
export const MOTOR_START_SEC = 5;

/**
 * Seconds until the device operates at the given load, for a device rated `ratedAmps`.
 * `currentMultiple` is load current divided by rated current. Returns Infinity when it never operates.
 */
export function timeToTrip(kind: TripCurveKind, _ratedAmps: number, currentMultiple: number): number {
  const pts = CURVES[kind];
  if (!(currentMultiple >= pts[0][0])) return Infinity;
  const last = pts[pts.length - 1];
  if (currentMultiple >= last[0]) return last[1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, t0] = pts[i];
    const [x1, t1] = pts[i + 1];
    if (currentMultiple >= x0 && currentMultiple <= x1) {
      const f = (Math.log(currentMultiple) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return Math.exp(Math.log(t0) + f * (Math.log(t1) - Math.log(t0)));
    }
  }
  return Infinity;
}

/** Convenience: trip time from absolute amps. */
export function timeToTripAmps(kind: TripCurveKind, ratedAmps: number, loadAmps: number): number {
  return ratedAmps > 0 ? timeToTrip(kind, ratedAmps, loadAmps / ratedAmps) : Infinity;
}
