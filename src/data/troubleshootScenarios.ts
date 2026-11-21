import type { ElectricalProject, FaultKind, InjectedFault } from '../types/electrical';
import type { FaultDifficulty } from '../core/faults';

/**
 * Ready-made troubleshooting scenarios. A wire is named by its two ends ("device:terminal"), because wire ids are not
 * stable across the lab data; they are resolved to ids when the scenario is loaded into a project.
 */
export interface ScenarioFault {
  kind: FaultKind;
  deviceId: string;
  params?: Record<string, any>;
  /** Wires named by their ends; the resolved ids go into `params` under the given key */
  wires?: { key: string; from: string; to: string }[];
}

export interface TroubleshootScenario {
  id: string;
  projectId: string;
  title: string;
  difficulty: FaultDifficulty;
  /** What the student is told: symptoms only */
  symptom: string;
  faults: ScenarioFault[];
}

export const TROUBLESHOOT_SCENARIOS: TroubleshootScenario[] = [
  {
    id: 'ts-dol-open-coil',
    projectId: 'proj_marine_dol_440v',
    title: 'DOL starter: START does nothing',
    difficulty: 'easy',
    symptom: 'The supply is healthy and the overload relay is reset. You press START and nothing happens: no click from KM1, the motor stays off, PL_RUN stays dark.',
    faults: [{ kind: 'open_coil', deviceId: 'mdol_km1' }],
  },
  {
    id: 'ts-dol-overload-dial',
    projectId: 'proj_marine_dol_440v',
    title: 'DOL starter: trips as soon as it starts',
    difficulty: 'medium',
    symptom: 'The motor starts, then the starter drops out within a moment and the red fault lamp lights. The breaker has not tripped and the motor is cool.',
    faults: [{ kind: 'overload_setting_wrong', deviceId: 'mdol_f2', params: { dialAmps: 1 } }],
  },
  {
    id: 'ts-dol-pole-open',
    projectId: 'proj_marine_dol_440v',
    title: 'DOL starter: motor hums and will not turn',
    difficulty: 'medium',
    symptom: 'KM1 pulls in and PL_RUN lights, but the motor only hums. The control circuit and the incoming supply read normal.',
    faults: [{ kind: 'contact_open', deviceId: 'mdol_km1', params: { pair: ['l2', 't2'] } }],
  },
  {
    id: 'ts-fr-swapped-phases',
    projectId: 'proj_forward_reverse_interlock',
    title: 'Forward / reverse starter: both buttons turn the motor the same way',
    difficulty: 'medium',
    symptom: 'FWD and REV both pull in their contactors correctly and the interlock works, but pressing FWD or REV now turns the motor in the same direction.',
    faults: [{
      kind: 'swapped_phases',
      deviceId: 'mfr_q1',
      wires: [
        { key: 'wireA', from: 'mfr_q1:out_l2', to: 'mfr_km1:l2' },
        { key: 'wireB', from: 'mfr_q1:out_l3', to: 'mfr_km1:l3' },
      ],
    }],
  },
  {
    id: 'ts-stair-two-faults',
    projectId: 'proj_2way_staircase',
    title: 'Staircase light: dead from both switches',
    difficulty: 'hard',
    symptom: 'The lamp never lights, from either switch. The breaker is on and there is voltage at the first switch. (There are two faults: fixing the first one will not be enough.)',
    faults: [
      { kind: 'loose_neutral', deviceId: 'lamp_stair', params: { terminalId: 'neutral' } },
      { kind: 'open_wire', deviceId: 'sw_3w_1', wires: [{ key: 'wireId', from: 'sw_3w_1:t1', to: 'sw_3w_2:t1' }] },
    ],
  },
];

/** Turn a scenario into concrete faults for a project. Returns [] when a named wire cannot be found. */
export function resolveScenarioFaults(scenario: TroubleshootScenario, project: Pick<ElectricalProject, 'wires'>): InjectedFault[] {
  const out: InjectedFault[] = [];
  let n = 0;
  for (const f of scenario.faults) {
    const params: Record<string, any> = { ...(f.params || {}) };
    for (const w of f.wires || []) {
      const [fd, ft] = w.from.split(':');
      const [td, tt] = w.to.split(':');
      const hit = project.wires.find((x) =>
        (x.fromDeviceId === fd && x.fromTerminalId === ft && x.toDeviceId === td && x.toTerminalId === tt) ||
        (x.fromDeviceId === td && x.fromTerminalId === tt && x.toDeviceId === fd && x.toTerminalId === ft));
      if (!hit) return [];
      params[w.key] = hit.id;
    }
    out.push({ id: `${scenario.id}_${++n}`, deviceId: f.deviceId, kind: f.kind, params, revealed: false });
  }
  return out;
}

export const scenariosFor = (projectId: string) => TROUBLESHOOT_SCENARIOS.filter((s) => s.projectId === projectId);
