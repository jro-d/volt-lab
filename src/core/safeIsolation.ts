import type { ElectricalDevice, SafeIsolationState } from '../types/electrical';

/**
 * Safe isolation (dead test and lock-out / tag-out) workflow. A small state machine: the steps must be done in order,
 * some are checked against the project where that is possible (an isolating device really open, a padlock really
 * on), and the Simulate button can be gated by it. The step descriptions are generic; no regulation clause is cited.
 */

export type IsolationStepId =
  | 'identify'
  | 'isolate'
  | 'lock_tag'
  | 'prove_before'
  | 'test_dead'
  | 'prove_after'
  | 'tests'
  | 'remove_lock';

export interface IsolationStep {
  id: IsolationStepId;
  label: string;
  help: string;
}

export const ISOLATION_STEPS: IsolationStep[] = [
  { id: 'identify', label: 'Identify the source', help: 'Find every supply to the circuit you will work on, including a generator, UPS or second feeder.' },
  { id: 'isolate', label: 'Isolate', help: 'Open the isolating device (breaker, isolator, fuse switch) that feeds the work circuit.' },
  { id: 'lock_tag', label: 'Lock and tag', help: 'Fit your own padlock and tag on the isolating device (use the rotary isolator or a knife switch with its lock).' },
  { id: 'prove_before', label: 'Prove the tester on a known live source', help: 'Check the tester works on a source you know is live before relying on it.' },
  { id: 'test_dead', label: 'Test dead on the work circuit', help: 'Test between every pair of conductors and to earth at the point of work.' },
  { id: 'prove_after', label: 'Prove the tester again', help: 'Check the tester still works on the known live source, so a dead reading can be trusted.' },
  { id: 'tests', label: 'Proceed with the dead tests', help: 'Do the insulation, continuity and polarity tests while the circuit is isolated.' },
  { id: 'remove_lock', label: 'Remove the lock and tag', help: 'When the work and the tests are finished, take your lock and tag off.' },
];

export const DEFAULT_ISOLATION: SafeIsolationState = { v: 1, mode: 'off', done: [], warned: false, log: [] };

/** The step that has to be done next, or null when the sequence is complete. */
export function nextStep(state: SafeIsolationState): IsolationStep | null {
  return ISOLATION_STEPS.find((s) => !state.done.includes(s.id)) ?? null;
}

const ISOLATING_TYPES = new Set(['mcb_1p', 'mcb_2p', 'mcb_3p', 'service_disconnect_2p', 'safety_breaker_2p', 'mccb_3p', 'mpcb_3p', 'rotary_isolator_3p', 'fuse_switch_disconnector_3p', 'rcd_2p', 'rcd_4p', 'dc_isolator', 'transfer_switch_manual']);

/** Is something that can isolate actually open? (A breaker or isolator with closed === false, or a transfer switch at 0.) */
export function isolatorOpen(devices: ElectricalDevice[]): boolean {
  return devices.some((d) => {
    if (!ISOLATING_TYPES.has(d.type)) return false;
    if (d.type === 'transfer_switch_manual') return d.state.position === 'off';
    return d.state.closed === false;
  });
}

/** Is a padlock fitted to an isolating device that is open? */
export function lockFitted(devices: ElectricalDevice[]): boolean {
  return devices.some((d) => d.type === 'rotary_isolator_3p' && !!d.state.locked && d.state.closed === false);
}

export interface StepResult {
  ok: boolean;
  /** Why the step was refused */
  reason?: string;
  state: SafeIsolationState;
}

/**
 * Mark a step as done. Only the next step can be marked; "isolate", "lock and tag" and "remove the lock" are also
 * checked against the project so the workflow cannot be ticked without doing the job.
 */
export function completeStep(state: SafeIsolationState, id: IsolationStepId, devices: ElectricalDevice[], now = Date.now()): StepResult {
  const next = nextStep(state);
  if (!next) return { ok: false, reason: 'All steps are already done', state };
  if (next.id !== id) return { ok: false, reason: `Do "${next.label}" first`, state };
  if (id === 'isolate' && !isolatorOpen(devices)) return { ok: false, reason: 'No isolating device is open: open the breaker or isolator that feeds the work circuit', state };
  if (id === 'lock_tag' && !lockFitted(devices)) return { ok: false, reason: 'No padlock is fitted to an open isolator: lock a rotary isolator in the open position', state };
  if (id === 'remove_lock' && devices.some((d) => d.type === 'rotary_isolator_3p' && d.state.locked)) return { ok: false, reason: 'A padlock is still fitted: remove it from the isolator first', state };
  return { ok: true, state: { ...state, done: [...state.done, id], log: [...state.log, { step: id, at: now }] } };
}

export interface SimulateGate {
  allowed: boolean;
  /** Message for the user (a block in Required mode, a one-time warning in Prompt mode) */
  message: string;
  /** In Prompt mode the warning has now been shown */
  markWarned: boolean;
}

/** May the grid be energized now? Required mode blocks until every step is done; Prompt warns once. */
export function simulateGate(state: SafeIsolationState | undefined): SimulateGate {
  const s = state ?? DEFAULT_ISOLATION;
  const next = nextStep(s);
  if (s.mode === 'off' || !next) return { allowed: true, message: '', markWarned: false };
  const text = `Safe isolation not finished: "${next.label}" is the next step (Reports, Safe isolation).`;
  if (s.mode === 'required') return { allowed: false, message: text, markWarned: false };
  // prompt: warn once, then let it through
  return s.warned ? { allowed: true, message: '', markWarned: false } : { allowed: false, message: `${text} Press Simulate again to continue anyway.`, markWarned: true };
}
