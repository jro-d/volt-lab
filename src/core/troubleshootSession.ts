import type { ElectricalDevice, ElectricalWire, FaultKind, InjectedFault } from '../types/electrical';
import { FAULT_LABEL } from './faults';

/** The student's progress through one troubleshooting scenario (kept in memory, not saved with the project). */
export interface DiagState {
  startedAt: number | null;
  wrong: number;
  hints: number;
  found: string[];
  suspects: string[];
  revealedAll: boolean;
}

export const newDiagState = (): DiagState => ({ startedAt: null, wrong: 0, hints: 0, found: [], suspects: [], revealedAll: false });

/** Hints a full "Reveal" costs. */
export const REVEAL_HINT_COST = 3;

/** True when naming (deviceId, kind) identifies the fault. A wire fault matches a device at either end of the wire. */
export function matchesFault(f: InjectedFault, deviceId: string, kind: FaultKind, wires: ElectricalWire[]): boolean {
  if (f.kind !== kind) return false;
  if (f.deviceId === deviceId) return true;
  const ends = (id?: string) => {
    const w = wires.find((x) => x.id === id);
    return w ? [w.fromDeviceId, w.toDeviceId] : [];
  };
  return [f.params.wireId, f.params.wireA, f.params.wireB].some((id) => ends(id).includes(deviceId));
}

export interface SubmitResult {
  state: DiagState;
  correct: boolean;
  fault?: InjectedFault;
  /** Every fault has been found */
  complete: boolean;
}

export function submitDiagnosis(state: DiagState, faults: InjectedFault[], wires: ElectricalWire[], deviceId: string, kind: FaultKind): SubmitResult {
  const hit = faults.find((f) => !state.found.includes(f.id) && matchesFault(f, deviceId, kind, wires));
  if (!hit) return { state: { ...state, wrong: state.wrong + 1 }, correct: false, complete: false };
  const found = [...state.found, hit.id];
  return { state: { ...state, found }, correct: true, fault: hit, complete: faults.every((f) => found.includes(f.id)) };
}

/** 100 points, minus 10 per wrong attempt, 15 per hint and 2 per full minute taken. Never below zero. */
export function diagnosisScore(state: DiagState, seconds: number): number {
  return Math.max(0, 100 - 10 * state.wrong - 15 * state.hints - 2 * Math.floor(seconds / 60));
}

/** Progressive hints for the first unfound fault: area, then device, then kind. */
export function hintText(level: number, fault: InjectedFault | undefined, devices: ElectricalDevice[]): string {
  if (!fault) return 'Every fault has been found.';
  const dev = devices.find((d) => d.id === fault.deviceId);
  if (level <= 1) {
    const control = dev && ['push_button_station', 'push_button_fwd_rev', 'contactor_3p', 'industrial_relay_dpdt', 'timer_relay', 'thermal_overload_relay', 'control_transformer'].includes(dev.type);
    const power = dev && ['motor_ac_industrial', 'motor_6lead_star_delta', 'pump_booster_3p', 'mcb_3p', 'fuse_switch_disconnector_3p', 'fuse_holder_1p'].includes(dev.type);
    return `Hint 1: the fault is in the ${control ? 'control circuit' : power ? 'power circuit' : 'circuit near a load or a wire'}.`;
  }
  if (level === 2) return `Hint 2: look closely at ${dev?.name || fault.deviceId}.`;
  return `Hint 3: it is a "${FAULT_LABEL[fault.kind]}" at ${dev?.name || fault.deviceId}.`;
}
