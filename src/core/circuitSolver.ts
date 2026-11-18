import { ElectricalDevice, ElectricalWire, CodeStandard } from '../types/electrical';
import { SparkEvent } from '../types/simulation';
import { getWireStandards } from '../data/standardsData';
import { behaviorFor } from './behaviors/registry';
import { PSU_RECOVERY_SEC } from './behaviors/dcDevices';
import { CENTRIFUGAL_PCT } from './behaviors/singlePhaseMotor';
import { floodDc, dcLoadAmps, isDcCoilDevice, type DcPotential, type DcResult } from './dcDomain';

export type PhaseId = 'L1' | 'L2' | 'L3';

export interface CircuitFault {
  kind: 'phase_phase' | 'phase_neutral' | 'phase_earth';
  node: string;
  otherNode: string;
  phases?: string[];
  breakerId?: string;
}

export interface SolvedCircuit {
  nodeVoltages: Record<string, number>;
  nodePotentials: Record<string, 'live' | 'neutral' | 'earth' | 'switched' | 'none'>;
  /** Individual 3-phase line identity of energized nodes (only for 3-phase sources) */
  nodePhases: Record<string, PhaseId>;
  /** 24 V DC control-domain potentials (kept apart from the AC nodePotentials) */
  dcPotentials: Record<string, DcPotential>;
  deviceEnergized: Record<string, boolean>;
  wireCurrents: Record<string, number>;
  wireFlowDirections: Record<string, 'forward' | 'reverse'>;
  wireVoltageDrops: Record<string, number>;
  wireVoltageDropPercents: Record<string, number>;
  totalWatts: number;
  totalAmps: number;
  sparks: SparkEvent[];
  faults: CircuitFault[];
  trippedDevices: string[];
  tripReasons: Record<string, string>;
  /** State to persist on devices that cleared a fault without opening as a whole (a blown fuse link) */
  devicePatches: Record<string, Record<string, unknown>>;
  /** Peak motor starting current (A) seen by each upstream overcurrent device that is not a breaker (fuses) */
  inrushByDevice: Record<string, number>;
  /** Terminal connectivity graph; only filled by a `graphOnly` solve (used by the continuity tester) */
  adjacency?: Record<string, string[]>;
}

/**
 * De-energized baseline used in Edit Mode: 0 V everywhere, 0 A in every conductor,
 * no trips and no arc sparks. Static wiring/polarity/gauge audits are done separately.
 */
export function createDeEnergizedSolution(wires: ElectricalWire[]): SolvedCircuit {
  const wireCurrents: Record<string, number> = {};
  const wireFlowDirections: Record<string, 'forward' | 'reverse'> = {};
  const wireVoltageDrops: Record<string, number> = {};
  const wireVoltageDropPercents: Record<string, number> = {};
  for (const w of wires) {
    wireCurrents[w.id] = 0;
    wireFlowDirections[w.id] = 'forward';
    wireVoltageDrops[w.id] = 0;
    wireVoltageDropPercents[w.id] = 0;
  }
  return {
    nodeVoltages: {},
    nodePotentials: {},
    nodePhases: {},
    dcPotentials: {},
    deviceEnergized: {},
    wireCurrents,
    wireFlowDirections,
    wireVoltageDrops,
    wireVoltageDropPercents,
    totalWatts: 0,
    totalAmps: 0,
    sparks: [],
    faults: [],
    trippedDevices: [],
    tripReasons: {},
    devicePatches: {},
    inrushByDevice: {},
  };
}

/** Overcurrent devices that can clear a fault */
const BREAKER_TYPES = new Set([
  'mcb_1p',
  'mcb_2p',
  'mcb_3p',
  'service_disconnect_2p',
  'safety_breaker_2p',
  'rcbo_1pn',
  'afdd_1pn',
  'mccb_3p',
  'mpcb_3p',
]);

/** Breakers with adjustable time-current settings: trip timing is done in their behaviour tick, not by the 1.3 x rule */
const ADJUSTABLE_BREAKERS = new Set(['mccb_3p', 'mpcb_3p']);

/** Positive (CW) 3-phase rotation sequences */
const CW_SEQUENCES = ['L1,L2,L3', 'L2,L3,L1', 'L3,L1,L2'];

/** Approximate 3-phase motor full-load line current (η·pf ≈ 0.6 → close to PEC/NEC FLA tables) */
function motorLineAmps(watts: number, lineVolts: number): number {
  return watts / (Math.sqrt(3) * lineVolts * 0.6);
}

export function solveCircuit(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  standard: CodeStandard = 'PEC',
  gridVoltage: number = 230,
  options: { graphOnly?: boolean } = {}
): SolvedCircuit {
  const nodeVoltages: Record<string, number> = {};
  const nodePotentials: Record<string, 'live' | 'neutral' | 'earth' | 'switched' | 'none'> = {};
  const nodePhases: Record<string, PhaseId> = {};
  const deviceEnergized: Record<string, boolean> = {};
  const wireCurrents: Record<string, number> = {};
  const wireFlowDirections: Record<string, 'forward' | 'reverse'> = {};
  const wireVoltageDrops: Record<string, number> = {};
  const wireVoltageDropPercents: Record<string, number> = {};
  const sparks: SparkEvent[] = [];
  const trippedDevices: string[] = [];
  const tripReasons: Record<string, string> = {};
  const devicePatches: Record<string, Record<string, unknown>> = {};
  let faults: CircuitFault[] = [];
  let dc: DcResult = { potentials: {}, sourceOf: {}, mixNodes: [], mixedPsus: [], shorted: [] };

  const deviceById = new Map(devices.map(d => [d.id, d]));

  // Build terminal node lookup
  const terminalKey = (devId: string, termId: string) => `${devId}:${termId}`;
  const devOfNode = (node: string) => node.slice(0, node.lastIndexOf(':'));

  // 3-phase supply line voltage (if any) — used for motor current & L-N potentials
  const threePhaseSource = devices.find(d => d.type === 'source_3phase_440v');
  const generator3p = devices.find(d => d.type === 'generator_set_3p');
  const lineVolts: number = threePhaseSource?.state.lineVoltage || generator3p?.state.voltage || 440;
  const phaseToNeutralVolts = Math.round(lineVolts / Math.sqrt(3));

  // 1. Trace connectivity graph of terminals
  let adj: Record<string, Set<string>> = {};
  const addEdge = (a: string, b: string) => {
    if (!adj[a]) adj[a] = new Set();
    if (!adj[b]) adj[b] = new Set();
    adj[a].add(b);
    adj[b].add(a);
  };

  const wireByNodes: Record<string, { wire: ElectricalWire; fromIsStart: boolean }> = {};
  let liveParent: Record<string, { prevNode: string; wire?: ElectricalWire; fromIsStart?: boolean }> = {};
  let neutralParent: Record<string, { prevNode: string; wire?: ElectricalWire; fromIsStart?: boolean }> = {};

  const executePass = () => {
    adj = {};
    for (const k in nodePotentials) delete nodePotentials[k];
    for (const k in nodeVoltages) delete nodeVoltages[k];
    for (const k in nodePhases) delete nodePhases[k];
    liveParent = {};
    neutralParent = {};
    faults = [];

    for (const wire of wires) {
      const k1 = terminalKey(wire.fromDeviceId, wire.fromTerminalId);
      const k2 = terminalKey(wire.toDeviceId, wire.toTerminalId);
      addEdge(k1, k2);
      wireByNodes[`${k1}->${k2}`] = { wire, fromIsStart: true };
      wireByNodes[`${k2}->${k1}`] = { wire, fromIsStart: false };
    }

  // Add internal device continuity based on switch / breaker states
  for (const dev of devices) {
    // Devices registered in ./behaviors describe their own internal connections
    for (const [a, b] of behaviorFor(dev.type)?.edges?.(dev) ?? []) {
      addEdge(terminalKey(dev.id, a), terminalKey(dev.id, b));
    }
    if (dev.category === 'busbar') {
      // All terminals on a busbar are shorted together
      for (let i = 0; i < dev.terminals.length; i++) {
        for (let j = i + 1; j < dev.terminals.length; j++) {
          addEdge(terminalKey(dev.id, dev.terminals[i].id), terminalKey(dev.id, dev.terminals[j].id));
        }
      }
    } else if (dev.type === 'service_disconnect_2p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in_l'), terminalKey(dev.id, 'out_l'));
        addEdge(terminalKey(dev.id, 'in_n'), terminalKey(dev.id, 'out_n'));
      }
    } else if (dev.type === 'rcd_2p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in_l'), terminalKey(dev.id, 'out_l'));
        addEdge(terminalKey(dev.id, 'in_n'), terminalKey(dev.id, 'out_n'));
      }
    } else if (dev.type === 'mcb_1p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in'), terminalKey(dev.id, 'out'));
      }
    } else if (dev.type === 'mcb_2p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in_1'), terminalKey(dev.id, 'out_1'));
        addEdge(terminalKey(dev.id, 'in_2'), terminalKey(dev.id, 'out_2'));
      }
    } else if (dev.type === 'mcb_3p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in_l1'), terminalKey(dev.id, 'out_l1'));
        addEdge(terminalKey(dev.id, 'in_l2'), terminalKey(dev.id, 'out_l2'));
        addEdge(terminalKey(dev.id, 'in_l3'), terminalKey(dev.id, 'out_l3'));
      }
    } else if (dev.type === 'safety_breaker_2p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in_l'), terminalKey(dev.id, 'out_l'));
        addEdge(terminalKey(dev.id, 'in_n'), terminalKey(dev.id, 'out_n'));
      }
    } else if (dev.type === 'utility_box_surface_pvc') {
      // Internal pass-through continuity for wire routes inside 2x4 utility box
      addEdge(terminalKey(dev.id, 'l_in'), terminalKey(dev.id, 'l_out'));
      addEdge(terminalKey(dev.id, 'n_in'), terminalKey(dev.id, 'n_out'));
      addEdge(terminalKey(dev.id, 'pe_in'), terminalKey(dev.id, 'pe_out'));
    } else if (dev.type === 'modular_combo_plate') {
      // Slot 1: Switch 1
      if (dev.state.switchClosed !== false && dev.state.closed !== false) {
        addEdge(terminalKey(dev.id, 'sw_in'), terminalKey(dev.id, 'sw_out'));
      }
      // Slot 2: Switch 2 (if configured as switch)
      if (dev.state.comboSlot2 === 'switch2' && dev.state.switch2Closed) {
        addEdge(terminalKey(dev.id, 'sw2_in'), terminalKey(dev.id, 'sw2_out'));
      }
    } else if (dev.type === 'switch_1gang') {
      if (dev.state.closed) {
        addEdge(terminalKey(dev.id, 'l_in'), terminalKey(dev.id, 'sw_out'));
      }
    } else if (dev.type === 'switch_3way') {
      // 3-way toggle
      const pos = dev.state.position || 'A';
      if (pos === 'A') {
        addEdge(terminalKey(dev.id, 'com'), terminalKey(dev.id, 't1'));
      } else {
        addEdge(terminalKey(dev.id, 'com'), terminalKey(dev.id, 't2'));
      }
    } else if (dev.type === 'switch_4way') {
      // 4-way intermediate switch
      const crossed = !!dev.state.crossState;
      if (!crossed) {
        addEdge(terminalKey(dev.id, 'in_1'), terminalKey(dev.id, 'out_1'));
        addEdge(terminalKey(dev.id, 'in_2'), terminalKey(dev.id, 'out_2'));
      } else {
        addEdge(terminalKey(dev.id, 'in_1'), terminalKey(dev.id, 'out_2'));
        addEdge(terminalKey(dev.id, 'in_2'), terminalKey(dev.id, 'out_1'));
      }
    } else if (dev.type === 'junction_box_4way' || dev.type === 'junction_box_octagonal_orange') {
      // Terminals belonging to the same spliceGroup are bonded together
      for (let i = 0; i < dev.terminals.length; i++) {
        for (let j = i + 1; j < dev.terminals.length; j++) {
          const g1 = dev.terminals[i].spliceGroup;
          const g2 = dev.terminals[j].spliceGroup;
          if (g1 && g1 === g2) {
            addEdge(terminalKey(dev.id, dev.terminals[i].id), terminalKey(dev.id, dev.terminals[j].id));
          }
        }
      }
    } else if (dev.type === 'socket_duplex' || dev.type === 'socket_schuko') {
      // Duplex convenience outlet feed-through loop continuity (brass & silver bridges)
      const l1 = dev.terminals.find(t => t.id === 'l_in' || t.id === 'line_in' || t.id === 'l1' || t.id === 'line');
      const l2 = dev.terminals.find(t => t.id === 'l_out' || t.id === 'line_out' || t.id === 'l2');
      if (l1 && l2 && !dev.state.tabBroken) {
        addEdge(terminalKey(dev.id, l1.id), terminalKey(dev.id, l2.id));
      }
      const n1 = dev.terminals.find(t => t.id === 'n_in' || t.id === 'neutral_in' || t.id === 'n1' || t.id === 'neutral');
      const n2 = dev.terminals.find(t => t.id === 'n_out' || t.id === 'neutral_out' || t.id === 'n2');
      if (n1 && n2 && !dev.state.tabBroken) {
        addEdge(terminalKey(dev.id, n1.id), terminalKey(dev.id, n2.id));
      }
      const pe1 = dev.terminals.find(t => t.id === 'pe_in' || t.id === 'earth_in' || t.id === 'ground');
      const pe2 = dev.terminals.find(t => t.id === 'pe_out' || t.id === 'earth_out');
      if (pe1 && pe2) {
        addEdge(terminalKey(dev.id, pe1.id), terminalKey(dev.id, pe2.id));
      }
    } else if (dev.type === 'splice_wire_nut' || dev.type === 'lever_connector_3p') {
      // All terminals on a standalone wire nut or lever-clamp splice are bonded together
      for (let i = 0; i < dev.terminals.length; i++) {
        for (let j = i + 1; j < dev.terminals.length; j++) {
          addEdge(terminalKey(dev.id, dev.terminals[i].id), terminalKey(dev.id, dev.terminals[j].id));
        }
      }
    } else if (dev.type === 'push_button_station') {
      // Start is NO (closes when startPressed)
      if (dev.state.startPressed) {
        addEdge(terminalKey(dev.id, 'start_3'), terminalKey(dev.id, 'start_4'));
      }
      // Stop is NC (closed by default, opens when stopPressed)
      if (!dev.state.stopPressed) {
        addEdge(terminalKey(dev.id, 'stop_1'), terminalKey(dev.id, 'stop_2'));
      }
    } else if (dev.type === 'push_button_fwd_rev') {
      if (!dev.state.stopPressed) addEdge(terminalKey(dev.id, 'stop_1'), terminalKey(dev.id, 'stop_2'));
      if (dev.state.fwdPressed) addEdge(terminalKey(dev.id, 'fwd_3'), terminalKey(dev.id, 'fwd_4'));
      if (dev.state.revPressed) addEdge(terminalKey(dev.id, 'rev_5'), terminalKey(dev.id, 'rev_6'));
    } else if (dev.type === 'push_button_estop') {
      // E-Stop is NC safety contact (closed when NOT latched)
      const isTripped = !!dev.state.estopActive || !!dev.state.latched;
      if (!isTripped) {
        addEdge(terminalKey(dev.id, 'nc_11'), terminalKey(dev.id, 'nc_12'));
      }
    } else if (dev.type === 'industrial_relay_dpdt') {
      if (dev.state.coilEnergized || dev.state.manualTest) {
        // NO contacts close
        addEdge(terminalKey(dev.id, 'com_1'), terminalKey(dev.id, 'no_1'));
        addEdge(terminalKey(dev.id, 'com_2'), terminalKey(dev.id, 'no_2'));
      } else {
        // NC contacts stay closed
        addEdge(terminalKey(dev.id, 'com_1'), terminalKey(dev.id, 'nc_1'));
        addEdge(terminalKey(dev.id, 'com_2'), terminalKey(dev.id, 'nc_2'));
      }
    } else if (dev.type === 'contactor_3p') {
      if (dev.state.coilEnergized || dev.state.manualOverride) {
        // Armature pulled in: main poles + NO 13-14 close, NC 21-22 opens
        addEdge(terminalKey(dev.id, 'l1'), terminalKey(dev.id, 't1'));
        addEdge(terminalKey(dev.id, 'l2'), terminalKey(dev.id, 't2'));
        addEdge(terminalKey(dev.id, 'l3'), terminalKey(dev.id, 't3'));
        addEdge(terminalKey(dev.id, 'no_13'), terminalKey(dev.id, 'no_14'));
      } else {
        // Armature released by return spring: NC 21-22 has continuity
        addEdge(terminalKey(dev.id, 'nc_21'), terminalKey(dev.id, 'nc_22'));
      }
    } else if (dev.type === 'thermal_overload_relay') {
      // Bimetal heaters: main poles are always continuous
      addEdge(terminalKey(dev.id, 'l1'), terminalKey(dev.id, 't1'));
      addEdge(terminalKey(dev.id, 'l2'), terminalKey(dev.id, 't2'));
      addEdge(terminalKey(dev.id, 'l3'), terminalKey(dev.id, 't3'));
      if (dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'no_97'), terminalKey(dev.id, 'no_98'));
      } else {
        addEdge(terminalKey(dev.id, 'nc_95'), terminalKey(dev.id, 'nc_96'));
      }
    } else if (dev.type === 'plc_micro_controller') {
      const outs = dev.state.plcOutputs || {};
      if (outs.q1) addEdge(terminalKey(dev.id, 'q1_1'), terminalKey(dev.id, 'q1_2'));
      if (outs.q2) addEdge(terminalKey(dev.id, 'q2_1'), terminalKey(dev.id, 'q2_2'));
      if (outs.q3) addEdge(terminalKey(dev.id, 'q3_1'), terminalKey(dev.id, 'q3_2'));
      if (outs.q4) addEdge(terminalKey(dev.id, 'q4_1'), terminalKey(dev.id, 'q4_2'));
    } else if (dev.type === 'switch_2gang') {
      if (dev.state.isOn) addEdge(terminalKey(dev.id, 'com1'), terminalKey(dev.id, 'l1_out'));
      if (dev.state.isOn2) addEdge(terminalKey(dev.id, 'com2'), terminalKey(dev.id, 'l2_out'));
    } else if (dev.type === 'switch_3gang') {
      if (dev.state.isOn) addEdge(terminalKey(dev.id, 'com1'), terminalKey(dev.id, 'l1_out'));
      if (dev.state.isOn2) addEdge(terminalKey(dev.id, 'com2'), terminalKey(dev.id, 'l2_out'));
      if (dev.state.isOn3) addEdge(terminalKey(dev.id, 'com3'), terminalKey(dev.id, 'l3_out'));
    } else if (dev.type === 'dimmer_switch') {
      if (dev.state.isOn !== false && (dev.state.level ?? 80) > 0) {
        addEdge(terminalKey(dev.id, 'in_l'), terminalKey(dev.id, 'out_l'));
      }
    } else if (dev.type === 'ats_changeover') {
      if (dev.state.source === 'generator') {
        addEdge(terminalKey(dev.id, 'gen_l'), terminalKey(dev.id, 'load_l'));
        addEdge(terminalKey(dev.id, 'gen_n'), terminalKey(dev.id, 'load_n'));
      } else {
        addEdge(terminalKey(dev.id, 'norm_l'), terminalKey(dev.id, 'load_l'));
        addEdge(terminalKey(dev.id, 'norm_n'), terminalKey(dev.id, 'load_n'));
      }
    } else if (dev.type === 'panel_meter') {
      addEdge(terminalKey(dev.id, 'ct_in'), terminalKey(dev.id, 'ct_out'));
    } else if (dev.type === 'timer_relay') {
      if (dev.state.timedOut) {
        addEdge(terminalKey(dev.id, 'com_15'), terminalKey(dev.id, 'no_18'));
      } else {
        addEdge(terminalKey(dev.id, 'com_15'), terminalKey(dev.id, 'nc_16'));
      }
    } else if (dev.type === 'selector_hoa') {
      if (dev.state.mode === 'hand') {
        addEdge(terminalKey(dev.id, 'com'), terminalKey(dev.id, 'hand'));
      } else if (dev.state.mode === 'auto') {
        addEdge(terminalKey(dev.id, 'com'), terminalKey(dev.id, 'auto'));
      }
    } else if (dev.type === 'limit_switch') {
      if (dev.state.actuated) {
        addEdge(terminalKey(dev.id, 'no_13'), terminalKey(dev.id, 'no_14'));
      } else {
        addEdge(terminalKey(dev.id, 'nc_11'), terminalKey(dev.id, 'nc_12'));
      }
    } else if (dev.type === 'vfd_drive') {
      if (dev.state.isOn !== false) {
        addEdge(terminalKey(dev.id, 'l1'), terminalKey(dev.id, 'u'));
        addEdge(terminalKey(dev.id, 'l2'), terminalKey(dev.id, 'v'));
        addEdge(terminalKey(dev.id, 'l3'), terminalKey(dev.id, 'w'));
      }
    }
    // control_transformer: galvanic isolation — no primary↔secondary continuity (handled as a source below)
  }

  // 2. Identify Sources & Seed Potentials
  // Find Meter or main entrance sources
  const liveSeedNodes: string[] = [];
  const neutralSeedNodes: string[] = [];
  const earthSeedNodes: string[] = [];
  const phaseSeeds: { node: string; phase: PhaseId }[] = [];

  for (const dev of devices) {
    const seeds = behaviorFor(dev.type)?.seeds?.(dev);
    if (seeds) {
      for (const t of seeds.live || []) liveSeedNodes.push(terminalKey(dev.id, t));
      for (const t of seeds.neutral || []) neutralSeedNodes.push(terminalKey(dev.id, t));
      for (const t of seeds.earth || []) earthSeedNodes.push(terminalKey(dev.id, t));
      for (const p of seeds.phases || []) phaseSeeds.push({ node: terminalKey(dev.id, p.terminal), phase: p.phase });
    }
    if (dev.type === 'kwh_meter_1p') {
      // Meter generates source voltages on its output terminals
      liveSeedNodes.push(terminalKey(dev.id, 'l_out'));
      neutralSeedNodes.push(terminalKey(dev.id, 'n_out'));
    } else if (dev.type === 'source_3phase_440v') {
      if (dev.state.closed !== false) {
        phaseSeeds.push({ node: terminalKey(dev.id, 'l1'), phase: 'L1' });
        phaseSeeds.push({ node: terminalKey(dev.id, 'l2'), phase: 'L2' });
        phaseSeeds.push({ node: terminalKey(dev.id, 'l3'), phase: 'L3' });
      }
      earthSeedNodes.push(terminalKey(dev.id, 'pe'));
    } else if (dev.type === 'ground_pit') {
      earthSeedNodes.push(terminalKey(dev.id, 'clamp'));
    } else if (dev.type === 'earth_busbar' && dev.state.isEarth) {
      earthSeedNodes.push(terminalKey(dev.id, 'pe_main'));
    }
  }

  // If no meter / 3-phase feeder is present, provide fallback source on service disconnect / MCB
  if (liveSeedNodes.length === 0 && !threePhaseSource) {
    const mainBreaker = devices.find(d => d.type === 'service_disconnect_2p' || d.type === 'mcb_1p' || d.type === 'mcb_2p');
    if (mainBreaker) {
      if (mainBreaker.type === 'mcb_2p') {
        liveSeedNodes.push(terminalKey(mainBreaker.id, 'in_1'));
        neutralSeedNodes.push(terminalKey(mainBreaker.id, 'in_2'));
      } else {
        liveSeedNodes.push(terminalKey(mainBreaker.id, mainBreaker.terminals[0]?.id || 'in'));
      }
    }
  }

  // Ensure neutral return source is seeded if a neutral busbar is present
  if (neutralSeedNodes.length === 0) {
    const nBus = devices.find(d => d.type === 'neutral_busbar');
    if (nBus) {
      neutralSeedNodes.push(terminalKey(nBus.id, 'n_main'));
    }
  }

    /**
     * Breadth-first potential flood. Potentials written by an earlier flood are respected:
     *  - live reaching a neutral / earth node   → bolted phase-to-neutral / phase-to-earth fault
     *  - live phase A reaching a phase-B node   → phase-to-phase short (arc flash)
     */
    const traverse = (
      seeds: string[],
      potential: 'live' | 'neutral' | 'earth',
      voltage: number,
      parentRecord?: Record<string, { prevNode: string; wire?: ElectricalWire; fromIsStart?: boolean }>,
      phase?: PhaseId
    ) => {
      const visited = new Set<string>();
      const queue: string[] = [];
      for (const s of seeds) {
        const prior = nodePotentials[s];
        if (potential === 'live' && prior === 'live') {
          // Source terminal already fed by another phase → bolted phase-to-phase at the supply
          const otherPhase = nodePhases[s];
          if (phase && otherPhase && otherPhase !== phase) {
            faults.push({ kind: 'phase_phase', node: s, otherNode: s, phases: [otherPhase, phase] });
          }
          continue;
        }
        visited.add(s);
        queue.push(s);
      }

      while (queue.length > 0) {
        const curr = queue.shift()!;
        nodePotentials[curr] = potential;
        nodeVoltages[curr] = voltage;
        if (phase) nodePhases[curr] = phase;

        const neighbors = adj[curr];
        if (!neighbors) continue;
        for (const n of neighbors) {
          if (visited.has(n)) continue;
          const prior = nodePotentials[n];

          if (potential === 'live' && prior === 'live') {
            const otherPhase = nodePhases[n];
            if (phase && otherPhase && otherPhase !== phase) {
              faults.push({ kind: 'phase_phase', node: n, otherNode: curr, phases: [otherPhase, phase] });
            }
            continue; // never overwrite another live source
          }
          if (potential === 'neutral' && prior === 'live') continue;
          if (potential === 'live' && (prior === 'neutral' || prior === 'earth')) {
            faults.push({ kind: prior === 'neutral' ? 'phase_neutral' : 'phase_earth', node: n, otherNode: curr, phases: phase ? [phase] : undefined });
          }

          visited.add(n);
          if (parentRecord) {
            const edgeInfo = wireByNodes[`${curr}->${n}`];
            parentRecord[n] = {
              prevNode: curr,
              wire: edgeInfo?.wire,
              fromIsStart: edgeInfo?.fromIsStart,
            };
          }
          queue.push(n);
        }
      }
    };

    traverse(earthSeedNodes, 'earth', 0);
    traverse(neutralSeedNodes, 'neutral', 0, neutralParent);
    traverse(liveSeedNodes, 'live', gridVoltage, liveParent);
    for (const ps of phaseSeeds) {
      traverse([ps.node], 'live', phaseToNeutralVolts, liveParent, ps.phase);
    }

    // Control transformers: an energized primary (line-to-line or line-to-neutral) makes the
    // isolated secondary a new source — X1 = control hot, X2 = control return (L2/N).
    for (const dev of devices) {
      if (dev.type !== 'control_transformer') continue;
      const h1 = terminalKey(dev.id, 'h1');
      const h2 = terminalKey(dev.id, 'h2');
      const p1 = nodePotentials[h1];
      const p2 = nodePotentials[h2];
      const ph1 = nodePhases[h1];
      const ph2 = nodePhases[h2];
      const lineToLine = p1 === 'live' && p2 === 'live' && !!ph1 && !!ph2 && ph1 !== ph2;
      const lineToNeutral = (p1 === 'live' && p2 === 'neutral') || (p2 === 'live' && p1 === 'neutral');
      const energized = lineToLine || lineToNeutral;
      dev.state.secondaryLive = energized;
      if (energized) {
        traverse([terminalKey(dev.id, 'x2')], 'neutral', 0, neutralParent);
        traverse([terminalKey(dev.id, 'x1')], 'live', dev.state.secondaryVolts || 220, liveParent);
      }
    }

    // 24 V DC control domain: isolated from the AC floods above, flagged if the two ever touch
    dc = floodDc(devices, adj, nodePotentials);
  };

  /** Coil / load sees + on one terminal and 0 V on the other (24 V DC) */
  const isDcPowered = (devId: string, tPos: string, tNeg: string) =>
    dc.potentials[terminalKey(devId, tPos)] === 'dc_pos' && dc.potentials[terminalKey(devId, tNeg)] === 'dc_neg';

  /** Annunciator supply: 24 V DC (+ on the segment / A1, 0 V on COM / A2) or 230 V AC (line / neutral either way round) */
  const annunciatorPowered = (dev: ElectricalDevice, hot: string, ret: string) => {
    if (dev.state.supply === 'dc24') return isDcPowered(dev.id, hot, ret);
    const a = nodePotentials[terminalKey(dev.id, hot)];
    const b = nodePotentials[terminalKey(dev.id, ret)];
    return (a === 'live' && b === 'neutral') || (b === 'live' && a === 'neutral');
  };

  /** Total nominal load (A) on each 24 V supply, from the DC devices that are powered */
  const dcLoadsBySupply = () => {
    const loads: Record<string, number> = {};
    const add = (posNode: string, amps: number) => {
      const src = dc.sourceOf[posNode];
      if (src) loads[src] = (loads[src] || 0) + amps;
    };
    for (const d of devices) {
      if (d.type === 'sensor_inductive' || d.type === 'sensor_capacitive' || d.type === 'sensor_photoelectric') {
        if (isDcPowered(d.id, 'brown', 'blue')) add(terminalKey(d.id, 'brown'), dcLoadAmps(d));
      } else if (d.type === 'plc_24vdc_16io') {
        if (isDcPowered(d.id, 'l_pos', 'm_neg')) add(terminalKey(d.id, 'l_pos'), dcLoadAmps(d));
      } else if (d.type === 'tower_light' && d.state.supply === 'dc24') {
        for (const seg of ['r', 'a', 'g']) if (isDcPowered(d.id, seg, 'com')) add(terminalKey(d.id, seg), dcLoadAmps(d));
      } else if (isDcCoilDevice(d) && isDcPowered(d.id, 'a1', 'a2')) {
        add(terminalKey(d.id, 'a1'), dcLoadAmps(d));
      }
    }
    return loads;
  };

  /** Coil sees a complete circuit: live↔neutral, or two different phases (line-to-line coil) */
  const isCoilPowered = (devId: string, tA: string, tB: string) => {
    const a = nodePotentials[terminalKey(devId, tA)];
    const b = nodePotentials[terminalKey(devId, tB)];
    if ((a === 'live' && b === 'neutral') || (b === 'live' && a === 'neutral')) return true;
    if (a === 'live' && b === 'live') {
      const pa = nodePhases[terminalKey(devId, tA)];
      const pb = nodePhases[terminalKey(devId, tB)];
      return !!pa && !!pb && pa !== pb;
    }
    return false;
  };

  // Test instruments only need the wiring graph with every contact at rest: build it once and stop
  if (options.graphOnly) {
    executePass();
    const adjacency: Record<string, string[]> = {};
    for (const k in adj) adjacency[k] = [...adj[k]];
    return { ...createDeEnergizedSolution(wires), adjacency };
  }

  // Dynamic Cascade Evaluation. Electromagnetic devices settle ONE AT A TIME (first in the list wins),
  // which reproduces real-world races such as two interlocked contactors fighting for the same supply.
  for (let pass = 0; pass < 16; pass++) {
    executePass();

    let contactsChanged = false;
    for (const dev of devices) {
      if (dev.type === 'mccb_3p') {
        const uv = isCoilPowered(dev.id, 'uv_a1', 'uv_a2');
        if (!!dev.state.uvPowered !== uv) {
          dev.state.uvPowered = uv;
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'voltage_relay' || dev.type === 'earth_leakage_relay' || dev.type === 'ptc_relay') {
        const supplied = isCoilPowered(dev.id, 'a1', 'a2');
        dev.state.supplied = supplied;
        if (dev.type === 'voltage_relay') {
          // line-to-line when the two sense terminals sit on different phases, else line-to-neutral
          const kA = terminalKey(dev.id, 'a1');
          const kB = terminalKey(dev.id, 'a2');
          const llK = nodePotentials[kA] === 'live' && nodePotentials[kB] === 'live';
          const base = Math.max(nodeVoltages[kA] || 0, nodeVoltages[kB] || 0);
          const sense = supplied ? Math.round(llK ? base * Math.sqrt(3) : base) : 0;
          const nominal = Number(dev.state.nominalV) || 220;
          dev.state.senseV = sense;
          dev.state.windowOk = supplied && sense >= nominal * (1 - (Number(dev.state.underPct) || 15) / 100) && sense <= nominal * (1 + (Number(dev.state.overPct) || 10) / 100);
        } else if (dev.type === 'ptc_relay') {
          const motor = deviceById.get(String(dev.state.motorId || ''));
          const temp = Number(motor?.state.windingC);
          const wc = Number.isFinite(temp) ? temp : 40;
          const limit = Number(dev.state.tripTempC) || 120;
          dev.state.windingC = wc;
          if (wc >= limit) dev.state.ptcTripped = true;
          else if (wc < limit - 20) dev.state.ptcTripped = false;
          const on = supplied && !dev.state.ptcTripped;
          if (!!dev.state.relayOn !== on) {
            dev.state.relayOn = on;
            contactsChanged = true;
            break;
          }
        }
      } else if (dev.type === 'psu_24vdc') {
        const hasAc = isCoilPowered(dev.id, 'in_l', 'in_n');
        const load = dcLoadsBySupply()[dev.id] || 0;
        const rated = Number(dev.state.ratedAmps) || 5;
        let fault = '';
        if (dc.mixedPsus.includes(dev.id)) fault = 'AC/DC CROSS-CONNECTION';
        else if (dc.shorted.includes(dev.id)) fault = 'OUTPUT SHORT';
        else if (load > rated) fault = 'OVERLOAD';
        dev.state.dcLoadAmps = Math.round(load * 1000) / 1000;
        if (fault && dev.state.dcOutputOn && !dev.state.psuTripped) {
          dev.state.psuTripped = true;
          dev.state.psuRecoverSec = PSU_RECOVERY_SEC;
          dev.state.psuFault = fault;
        }
        const on = hasAc && !dev.state.psuTripped;
        if (!!dev.state.dcOutputOn !== on) {
          dev.state.dcOutputOn = on;
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'sensor_inductive' || dev.type === 'sensor_capacitive' || dev.type === 'sensor_photoelectric') {
        const powered = isDcPowered(dev.id, 'brown', 'blue');
        const reversed = dc.potentials[terminalKey(dev.id, 'brown')] === 'dc_neg' && dc.potentials[terminalKey(dev.id, 'blue')] === 'dc_pos';
        const active = powered && (dev.state.contact === 'NC' ? !dev.state.detected : !!dev.state.detected);
        dev.state.sensorPowered = powered;
        dev.state.supplyNote = reversed ? 'REVERSED SUPPLY (brown on 0 V, blue on +24 V)' : '';
        if (!!dev.state.outActive !== active) {
          dev.state.outActive = active;
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'plc_24vdc_16io') {
        const powered = isDcPowered(dev.id, 'l_pos', 'm_neg');
        const running = powered && dev.state.plcRunning !== false;
        const wantPot: DcPotential = dev.state.inputMode === 'sourcing' ? 'dc_neg' : 'dc_pos';
        const inp: Record<string, boolean> = {};
        for (let n = 0; n < 8; n++) inp[`i${n}`] = powered && dc.potentials[terminalKey(dev.id, `i${n}`)] === wantPot;
        const prevOut = (dev.state.plcOutputs || {}) as Record<string, boolean>;
        const out: Record<string, boolean> = {};
        for (let n = 0; n < 8; n++) out[`q${n}`] = false;
        if (running) {
          if (dev.state.program === 'start_stop_latch') {
            // I0.0 = START (NO), I0.1 = STOP wired NC (true while healthy); Q0.0 seals in through itself
            out.q0 = (inp.i0 || !!prevOut.q0) && inp.i1;
          } else {
            for (let n = 0; n < 8; n++) out[`q${n}`] = inp[`i${n}`];
          }
        }
        dev.state.plcPowered = powered;
        dev.state.plcInputs = inp;
        let changed = false;
        for (let n = 0; n < 8; n++) if (!!prevOut[`q${n}`] !== out[`q${n}`]) changed = true;
        dev.state.plcOutputs = out;
        if (changed) {
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'industrial_relay_dpdt') {
        const on = (dev.state.coilType === 'dc24' ? isDcPowered(dev.id, 'a1', 'a2') : isCoilPowered(dev.id, 'a1', 'a2')) || !!dev.state.manualTest;
        if (!!dev.state.coilEnergized !== on) {
          dev.state.coilEnergized = on;
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'phase_monitor_relay') {
        const senseKeys = ['l1', 'l2', 'l3'].map(t => terminalKey(dev.id, t));
        const present = senseKeys.map(k => nodePotentials[k] === 'live' && !!nodePhases[k]);
        const phases = senseKeys.map(k => nodePhases[k]);
        const nominal = Number(dev.state.nominalV) || 440;
        const band = (Number(dev.state.underOverPct) || 10) / 100;
        // sense voltages are phase-to-neutral; the relay compares the line-to-line value with its nominal
        const lineV = Math.max(...senseKeys.map(k => (nodeVoltages[k] || 0) * Math.sqrt(3)));
        let fault = '';
        if (!isCoilPowered(dev.id, 'a1', 'a2')) fault = 'NO SUPPLY';
        else if (present.some(p => !p)) fault = 'LOST PHASE';
        else if (!CW_SEQUENCES.includes(phases.join(','))) fault = 'WRONG SEQUENCE';
        else if (lineV < nominal * (1 - band)) fault = 'UNDERVOLTAGE';
        else if (lineV > nominal * (1 + band)) fault = 'OVERVOLTAGE';
        const on = fault === '';
        const presentNow: Record<string, boolean> = { l1: present[0], l2: present[1], l3: present[2] };
        dev.state.phasePresent = presentNow;
        dev.state.phaseFault = fault;
        if (!!dev.state.phaseOk !== on) {
          dev.state.phaseOk = on;
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'contactor_3p') {
        const on = isCoilPowered(dev.id, 'a1', 'a2') || !!dev.state.manualOverride;
        if (!!dev.state.coilEnergized !== on) {
          dev.state.coilEnergized = on;
          dev.state.closed = on;
          contactsChanged = true;
          break;
        }
      } else if (dev.type === 'plc_micro_controller') {
        const pl = nodePotentials[terminalKey(dev.id, 'p_l')];
        const pn = nodePotentials[terminalKey(dev.id, 'p_n')];
        const isPowered = (pl === 'live' && pn === 'neutral') || (pn === 'live' && pl === 'neutral');
        if (isPowered) {
          const inp: Record<string, boolean> = {
            i1: nodePotentials[terminalKey(dev.id, 'i1')] === 'live',
            i2: nodePotentials[terminalKey(dev.id, 'i2')] === 'live',
            i3: nodePotentials[terminalKey(dev.id, 'i3')] === 'live',
            i4: nodePotentials[terminalKey(dev.id, 'i4')] === 'live',
          };
          dev.state.plcInputs = inp;
          // Standard PLC Ladder Logic: I1 drives Q1, I2 drives Q2, etc.
          const outp: Record<string, boolean> = {
            q1: inp.i1,
            q2: inp.i2,
            q3: inp.i3,
            q4: inp.i4,
          };
          const oldOut = dev.state.plcOutputs || {};
          if (oldOut.q1 !== outp.q1 || oldOut.q2 !== outp.q2 || oldOut.q3 !== outp.q3 || oldOut.q4 !== outp.q4) {
            contactsChanged = true;
          }
          dev.state.plcOutputs = outp;
          if (contactsChanged) break;
        }
      } else if (dev.type === 'ats_changeover' && dev.state.autoMode !== false && !(Number(dev.state.transferDelaySec) > 0)) {
        const normLive = nodePotentials[terminalKey(dev.id, 'norm_l')] === 'live';
        const genLive = nodePotentials[terminalKey(dev.id, 'gen_l')] === 'live';
        const desired = normLive ? 'normal' : genLive ? 'generator' : dev.state.source || 'normal';
        if (dev.state.source !== desired) {
          dev.state.source = desired;
          contactsChanged = true;
          break;
        }
      }
    }

    if (!contactsChanged) break;
  }

  // Final potential pass to ensure all terminal voltages reflect steady state
  executePass();

  // 3. Short circuits: bolted phase-to-neutral / phase-to-earth and phase-to-phase faults
  const terminalPoint = (node: string) => {
    const dev = deviceById.get(devOfNode(node));
    if (!dev) return { x: 400, y: 300 };
    const term = dev.terminals.find(t => t.id === node.slice(node.lastIndexOf(':') + 1));
    if (!term) return { x: dev.x + dev.width / 2, y: dev.y + dev.height / 2 };
    return { x: dev.x + dev.width * term.relX, y: dev.y + dev.height * term.relY };
  };

  /** Walk the live feed tree upstream from a node and return the first overcurrent device met */
  const viaTerminalOf: Record<string, string> = {};
  const findUpstreamBreaker = (node: string): ElectricalDevice | undefined => {
    let curr: string | undefined = node;
    const seen = new Set<string>();
    while (curr && !seen.has(curr)) {
      seen.add(curr);
      const dev = deviceById.get(devOfNode(curr));
      if (dev && BREAKER_TYPES.has(dev.type) && dev.state.closed && !dev.state.tripped) return dev;
      // Fuses and other registered devices that can clear the fault where it passes through them
      if (dev && behaviorFor(dev.type)?.clearsFault?.(dev, curr.slice(curr.lastIndexOf(':') + 1))) {
        viaTerminalOf[dev.id] = curr.slice(curr.lastIndexOf(':') + 1);
        return dev;
      }
      curr = liveParent[curr]?.prevNode;
    }
    return undefined;
  };

  const faultedPairs = new Set<string>();
  for (const fault of faults) {
    const pairKey = [fault.node, fault.otherNode].sort().join('|');
    if (faultedPairs.has(pairKey)) continue;
    faultedPairs.add(pairKey);

    const breaker =
      findUpstreamBreaker(fault.node) ||
      findUpstreamBreaker(fault.otherNode) ||
      devices.find(d => BREAKER_TYPES.has(d.type) && d.state.closed && !d.state.tripped);
    fault.breakerId = breaker?.id;

    const isPhasePhase = fault.kind === 'phase_phase';
    // Arc location: the first switching device met walking back along the fault loop
    // (e.g. the reversing contactor that bridged two phases), else the fault node itself.
    let arcNode = fault.node;
    {
      let curr: string | undefined = fault.node;
      const seen = new Set<string>();
      while (curr && !seen.has(curr)) {
        seen.add(curr);
        const d = deviceById.get(devOfNode(curr));
        if (d && (d.type === 'contactor_3p' || d.type === 'thermal_overload_relay' || d.type === 'motor_ac_industrial' || d.type === 'pump_booster_3p' || d.type === 'motor_6lead_star_delta')) {
          arcNode = curr;
          break;
        }
        curr = liveParent[curr]?.prevNode;
      }
    }
    const pt = terminalPoint(arcNode);
    const faultDev = deviceById.get(devOfNode(arcNode));
    sparks.push({
      id: `spark_${fault.kind}_${pairKey}`,
      x: pt.x,
      y: pt.y,
      severity: isPhasePhase ? 'arc_flash' : 'short_circuit',
      timestamp: Date.now(),
      message: isPhasePhase
        ? `PHASE-TO-PHASE SHORT: ${fault.phases?.[0]} bolted to ${fault.phases?.[1]} at ${faultDev?.name || 'terminal'} — both FOR & REV contactors closed without an electrical interlock!`
        : `DEAD SHORT CIRCUIT: Phase directly bonded to ${fault.kind === 'phase_neutral' ? 'Neutral' : 'Earth'}!`,
    });

    const clearing = breaker ? behaviorFor(breaker.type)?.clearsFault?.(breaker, viaTerminalOf[breaker.id] || '') : null;
    if (breaker && clearing) {
      devicePatches[breaker.id] = { ...(devicePatches[breaker.id] || {}), ...clearing.patch };
      if (clearing.opensDevice && !trippedDevices.includes(breaker.id)) trippedDevices.push(breaker.id);
      tripReasons[breaker.id] = clearing.reason;
    } else if (breaker && !trippedDevices.includes(breaker.id)) {
      trippedDevices.push(breaker.id);
      tripReasons[breaker.id] = isPhasePhase
        ? `Magnetic Instantaneous Trip: ${fault.phases?.join('-')} phase-to-phase fault (> 10 kA prospective)`
        : 'Magnetic Instantaneous Trip (Short Circuit Fault Current > 1,500A)';
    }
  }

  /**
   * Earth-leakage trip for a faulty load: the nearest RCBO upstream of its live terminal trips.
   * Returns false when there is none, so older circuits keep their RCD behaviour.
   */
  const tripUpstreamRcbo = (load: ElectricalDevice, liveNode: string | undefined): boolean => {
    let curr: string | undefined = liveNode;
    const seen = new Set<string>();
    while (curr && !seen.has(curr)) {
      seen.add(curr);
      const up = deviceById.get(devOfNode(curr));
      if (up && up.type === 'rcbo_1pn' && up.state.closed && !up.state.tripped) {
        if (!trippedDevices.includes(up.id)) {
          trippedDevices.push(up.id);
          tripReasons[up.id] = `Earth Leakage Trip: Fault current > ${up.state.leakageMa || 30}mA detected to chassis of ${load.name || load.id}`;
        }
        return true;
      }
      curr = liveParent[curr]?.prevNode;
    }
    return false;
  };

  /** True when two terminals are joined through wires and closed contacts (a dry-contact continuity check) */
  const isConnected = (a: string, b: string): boolean => {
    if (!adj[a] || !adj[b]) return false;
    const seenNodes = new Set<string>([a]);
    const queue = [a];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === b) return true;
      for (const n of adj[curr] || []) {
        if (!seenNodes.has(n)) {
          seenNodes.add(n);
          queue.push(n);
        }
      }
    }
    return false;
  };

  // 4. Evaluate Energized Loads and Branch Currents
  let totalWatts = 0;
  const standards = getWireStandards(standard);

  for (const dev of devices) {
    if (dev.type === 'light_bulb') {
      const hotPot = nodePotentials[terminalKey(dev.id, 'hot')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')];
      const isLit = hotPot === 'live' && nPot === 'neutral';
      dev.state.openNeutral = hotPot === 'live' && (!nPot || nPot === 'none');

      deviceEnergized[dev.id] = isLit;
      if (isLit) {
        const p = dev.state.wattage || 60;
        totalWatts += p;
        dev.state.lit = true;
        dev.state.brightness = 1.0;
      } else {
        dev.state.lit = false;
        dev.state.brightness = 0;
      }
    } else if (dev.type === 'socket_duplex' || dev.type === 'socket_schuko') {
      const lPot = nodePotentials[terminalKey(dev.id, 'line')] || 
                   nodePotentials[terminalKey(dev.id, 'line_in')] || 
                   nodePotentials[terminalKey(dev.id, 'l_in')] || 
                   nodePotentials[terminalKey(dev.id, 'l1')] || 
                   nodePotentials[terminalKey(dev.id, 'l2')] ||
                   nodePotentials[terminalKey(dev.id, 'l_out')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')] || 
                   nodePotentials[terminalKey(dev.id, 'neutral_in')] || 
                   nodePotentials[terminalKey(dev.id, 'n_in')] || 
                   nodePotentials[terminalKey(dev.id, 'n1')] || 
                   nodePotentials[terminalKey(dev.id, 'n2')] ||
                   nodePotentials[terminalKey(dev.id, 'n_out')];
      const hasPower = lPot === 'live' && nPot === 'neutral';
      deviceEnergized[dev.id] = hasPower;
      dev.state.powered = hasPower;

      if (hasPower && dev.state.hasEarthFault) {
        const liveKey = ['line', 'line_in', 'l_in', 'l1'].map(t => terminalKey(dev.id, t)).find(k => nodePotentials[k] === 'live');
        tripUpstreamRcbo(dev, liveKey);
      }

      if (hasPower && dev.state.hasPluggedLoad) {
        // Find if TV or appliance is connected
        const p = dev.state.pluggedAppliance === 'appliance_tv' ? 120 : 300;
        totalWatts += p;
      }
    } else if (dev.type === 'appliance_tv') {
      // Find connected socket
      const rec = devices.find(d => (d.type === 'socket_duplex' || d.type === 'socket_schuko') && deviceEnergized[d.id]);
      const isPowered = !!rec;
      deviceEnergized[dev.id] = isPowered;
      dev.state.powered = isPowered;
    } else if (dev.type === 'appliance_water_heater') {
      const lPot = nodePotentials[terminalKey(dev.id, 'line')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')];
      const isPowered = lPot === 'live' && nPot === 'neutral';
      deviceEnergized[dev.id] = isPowered;
      dev.state.powered = isPowered;

      if (isPowered) {
        const p = dev.state.wattage || 3500;
        totalWatts += p;

        // Check earth leakage fault simulation
        if (dev.state.hasEarthFault && !tripUpstreamRcbo(dev, terminalKey(dev.id, 'line'))) {
          const rcd = devices.find(d => d.type === 'rcd_2p' && d.state.closed);
          if (rcd) {
            trippedDevices.push(rcd.id);
            tripReasons[rcd.id] = 'Earth Leakage Trip: Fault current > 30mA detected to chassis';
          }
        }
      }
    } else if (dev.type === 'appliance_fan') {
      const lPot = nodePotentials[terminalKey(dev.id, 'line')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')];
      const isPowered = lPot === 'live' && nPot === 'neutral';
      deviceEnergized[dev.id] = isPowered;
      dev.state.powered = isPowered;
      if (isPowered) {
        totalWatts += dev.state.wattage || 65;
      }
    } else if (dev.type === 'phase_monitor_relay') {
      deviceEnergized[dev.id] = !!dev.state.phaseOk;
      if (isCoilPowered(dev.id, 'a1', 'a2')) totalWatts += 3;
    } else if (dev.type === 'pump_booster_1p') {
      const lPot = nodePotentials[terminalKey(dev.id, 'line')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')];
      const isPowered = lPot === 'live' && nPot === 'neutral';
      deviceEnergized[dev.id] = isPowered;
      dev.state.powered = isPowered;
      dev.state.pumping = isPowered;
      if (isPowered) totalWatts += (Number(dev.state.kw) || 0.75) * 1000;
    } else if (dev.type === 'appliance_ac') {
      const lPot = nodePotentials[terminalKey(dev.id, 'line')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')];
      const isPowered = lPot === 'live' && nPot === 'neutral';
      deviceEnergized[dev.id] = isPowered;
      dev.state.powered = isPowered;
      if (isPowered) {
        totalWatts += dev.state.wattage || 1200;
      }
    } else if (dev.type === 'motor_ac_industrial' || dev.type === 'pump_booster_3p') {
      const tk = ['u1', 'v1', 'w1'].map(t => terminalKey(dev.id, t));
      const pots = tk.map(k => nodePotentials[k]);
      const phases = tk.map(k => nodePhases[k]);
      const distinctPhases = new Set(phases.filter(Boolean));
      let isRunning = false;
      let direction: 'CW' | 'CCW' | null = null;
      let fault: string | null = null;

      if (phases.every(Boolean) && distinctPhases.size === 3) {
        // True 3-phase rotating field: phase sequence on U1-V1-W1 sets direction of rotation
        isRunning = true;
        direction = CW_SEQUENCES.includes(phases.join(',')) ? 'CW' : 'CCW';
      } else if (distinctPhases.size >= 1 && pots.filter(p => p === 'live').length >= 2) {
        // Only 1-2 lines present: locked-rotor hum, no rotating field
        fault = distinctPhases.size === 2 ? 'SINGLE PHASING (one line open)' : 'SAME PHASE ON ALL LEADS';
      } else if (distinctPhases.size === 0) {
        // Legacy single-phase fed trainer motor (L-N across U1/V1)
        isRunning = pots[0] === 'live' && (pots[1] === 'neutral' || pots[1] === 'live' || pots[2] === 'neutral' || pots[2] === 'live');
        if (isRunning) direction = 'CW';
      }

      deviceEnergized[dev.id] = isRunning;
      dev.state.running = isRunning;
      dev.state.motorRunning = isRunning;
      if (dev.type === 'pump_booster_3p') dev.state.pumping = isRunning;
      dev.state.motorDirection = direction;
      dev.state.motorFault = fault;
      const loadK = (Number(dev.state.loadPct) || 100) / 100; // shaft load: above 100 % the motor draws more than nameplate
      dev.state.measuredAmps = isRunning
        ? (distinctPhases.size === 3
          ? motorLineAmps(dev.state.wattage || 2200, lineVolts)
          : (dev.state.wattage || 2200) / gridVoltage) * loadK
        : 0;
      if (isRunning) {
        totalWatts += dev.state.wattage || 2200;
      }
    } else if (dev.type === 'motor_6lead_star_delta') {
      const tk1 = ['u1', 'v1', 'w1'].map(t => terminalKey(dev.id, t));
      const tk2 = ['w2', 'u2', 'v2'].map(t => terminalKey(dev.id, t));
      const pots1 = tk1.map(k => nodePotentials[k]);
      const phases1 = tk1.map(k => nodePhases[k]);
      const phases2 = tk2.map(k => nodePhases[k]);
      const distinct1 = new Set(phases1.filter(Boolean));
      const distinct2 = new Set(phases2.filter(Boolean));

      const areAdjConnected = (start: string, targets: string[]) => {
        const seen = new Set<string>([start]);
        const q = [start];
        while (q.length) {
          const curr = q.shift()!;
          for (const nxt of adj[curr] || []) {
            if (!seen.has(nxt)) {
              seen.add(nxt);
              q.push(nxt);
            }
          }
        }
        return targets.every(t => seen.has(t));
      };

      let isRunning = false;
      let direction: 'CW' | 'CCW' | null = null;
      let starterMode: 'wye' | 'delta' | null = null;
      let fault: string | null = null;

      if (phases1.every(Boolean) && distinct1.size === 3) {
        direction = CW_SEQUENCES.includes(phases1.join(',')) ? 'CW' : 'CCW';
        if (phases2.every(Boolean) && distinct2.size === 3) {
          // Delta mode requires phase displacement across each stator winding: U1!=U2, V1!=V2, W1!=W2
          const uDiff = phases1[0] !== nodePhases[terminalKey(dev.id, 'u2')];
          const vDiff = phases1[1] !== nodePhases[terminalKey(dev.id, 'v2')];
          const wDiff = phases1[2] !== nodePhases[terminalKey(dev.id, 'w2')];
          if (uDiff && vDiff && wDiff) {
            isRunning = true;
            starterMode = 'delta';
          } else {
            direction = null;
            fault = 'NO WINDING VOLTAGE (Delta U1=U2)';
          }
        } else if (phases2.every(p => !p) && areAdjConnected(tk2[0], [tk2[1], tk2[2]])) {
          isRunning = true;
          starterMode = 'wye';
        } else if (phases2.some(Boolean)) {
          direction = null;
          fault = 'SINGLE PHASING (Delta leg open)';
        } else {
          direction = null;
          fault = 'OPEN STAR POINT (Close KMY ★ or KMD Δ)';
        }
      } else if (phases2.every(Boolean) && distinct2.size === 3 && phases1.every(p => !p)) {
        fault = 'OPEN LINE CONTACTOR (Close KM1)';
      } else if (distinct1.size >= 1 && pots1.filter(p => p === 'live').length >= 2) {
        fault = distinct1.size === 2 ? 'SINGLE PHASING (one line open)' : 'SAME PHASE ON ALL LEADS';
      }

      const ratedWatts = dev.state.wattage || 5500;
      const fullAmps = motorLineAmps(ratedWatts, lineVolts);
      const runAmps = !isRunning ? 0 : starterMode === 'wye' ? fullAmps / 3 : fullAmps;
      const activeWatts = !isRunning ? 0 : starterMode === 'wye' ? Math.round(ratedWatts / 3) : ratedWatts;

      deviceEnergized[dev.id] = isRunning;
      dev.state.running = isRunning;
      dev.state.motorRunning = isRunning;
      dev.state.starterMode = isRunning ? starterMode : null;
      dev.state.motorDirection = isRunning ? direction : null;
      dev.state.motorFault = fault;
      dev.state.measuredAmps = runAmps;
      if (isRunning) {
        totalWatts += activeWatts;
      }
    } else if (dev.type === 'motor_1p') {
      const kind = (dev.state.motorKind as string) || 'capacitor_start';
      const hot = (a: string, b: string) => {
        const pa = nodePotentials[terminalKey(dev.id, a)];
        const pb = nodePotentials[terminalKey(dev.id, b)];
        return { on: (pa === 'live' && pb === 'neutral') || (pb === 'live' && pa === 'neutral'), aLive: pa === 'live' };
      };
      const main = hot('u1', 'u2');
      const aux = hot('z1', 'z2');
      const speed = Number(dev.state.speedPct) || 0;
      const switchClosed = kind === 'psc' || speed < CENTRIFUGAL_PCT;
      const auxActive = aux.on && switchClosed;
      const startOk = main.on && (auxActive || speed >= CENTRIFUGAL_PCT);
      // The capacitor in series with the auxiliary winding: its value is checked against what the motor type needs
      let capUf: number | null = null;
      for (const w of wires) {
        const ends: [string, string][] = [[w.fromDeviceId, w.fromTerminalId], [w.toDeviceId, w.toTerminalId]];
        const mine = ends.find(([d, t]) => d === dev.id && (t === 'z1' || t === 'z2'));
        const other = ends.find(([d]) => d !== dev.id);
        const c = mine && other && deviceById.get(other[0]);
        if (c && c.type === 'capacitor_run') capUf = Number(c.state.uF) || 0;
      }
      const needUf = kind === 'capacitor_start' ? 100 : kind === 'psc' ? 12 : null;
      let fault: string | null = null;
      let note = '';
      if (main.on && !startOk) fault = kind === 'split_phase' ? 'no start winding' : 'no start capacitor';
      if (needUf && capUf !== null && capUf > 0 && Math.abs(capUf - needUf) / needUf > 0.4) {
        note = `wrong capacitor value: ${capUf} uF, this motor needs about ${needUf} uF`;
      }
      let direction: 'CW' | 'CCW' | null = (dev.state.motorDirection as 'CW' | 'CCW' | null) || null;
      if (aux.on) direction = main.aLive === aux.aLive ? 'CW' : 'CCW';
      else if (!direction) direction = 'CW';
      const fla = (Number(dev.state.wattage) || 370) / (gridVoltage * 0.7);
      const amps = !main.on ? 0 : fault ? fla * 5 : speed < CENTRIFUGAL_PCT ? fla * 3 : fla * (note ? 1.6 : 1);
      dev.state.mainPowered = main.on;
      dev.state.startOk = startOk;
      dev.state.motorRunning = startOk && !fault;
      dev.state.motorDirection = main.on ? direction : null;
      dev.state.motorFault = fault;
      dev.state.motorNote = note;
      dev.state.measuredAmps = Math.round(amps * 100) / 100;
      dev.state.auxActive = auxActive;
      deviceEnergized[dev.id] = main.on;
      if (main.on) totalWatts += Math.round(amps * gridVoltage * 0.7);
    } else if (dev.type === 'buzzer_horn' || dev.type === 'beacon') {
      const on = annunciatorPowered(dev, 'a1', 'a2');
      dev.state.active = on;
      deviceEnergized[dev.id] = on;
      if (on && dev.state.supply !== 'dc24') totalWatts += Number(dev.state.wattage) || 5;
    } else if (dev.type === 'tower_light') {
      const seg = { r: annunciatorPowered(dev, 'r', 'com'), a: annunciatorPowered(dev, 'a', 'com'), g: annunciatorPowered(dev, 'g', 'com') };
      dev.state.segments = seg;
      dev.state.active = seg.r || seg.a || seg.g;
      deviceEnergized[dev.id] = !!dev.state.active;
      if (dev.state.supply !== 'dc24') totalWatts += ((seg.r ? 1 : 0) + (seg.a ? 1 : 0) + (seg.g ? 1 : 0)) * (Number(dev.state.wattage) || 8) / 3;
    } else if (dev.type === 'pilot_light_indicator') {
      const p1 = nodePotentials[terminalKey(dev.id, 'x1')];
      const p2 = nodePotentials[terminalKey(dev.id, 'x2')];
      const isLit = (p1 === 'live' && p2 === 'neutral') || (p2 === 'live' && p1 === 'neutral');
      deviceEnergized[dev.id] = isLit;
      dev.state.lit = isLit;
      dev.state.pilotLit = isLit; // renderer reads pilotLit
      if (isLit) {
        totalWatts += 5;
      }
    } else if (dev.type === 'contactor_3p') {
      dev.state.measuredAmps = 0;
      if (dev.state.coilEnergized) {
        deviceEnergized[dev.id] = true;
        totalWatts += 15; // 15W holding power
      }
    } else if (dev.type === 'thermal_overload_relay') {
      dev.state.measuredAmps = 0;
      deviceEnergized[dev.id] = ['l1', 'l2', 'l3'].some(t => nodePotentials[terminalKey(dev.id, t)] === 'live');
    } else if (dev.type === 'control_transformer') {
      deviceEnergized[dev.id] = !!dev.state.secondaryLive;
      if (dev.state.secondaryLive) totalWatts += 8; // no-load core losses
    } else if (dev.type === 'source_3phase_440v') {
      deviceEnergized[dev.id] = dev.state.closed !== false;
    } else if (dev.type === 'industrial_relay_dpdt') {
      if (dev.state.coilEnergized) {
        deviceEnergized[dev.id] = true;
        totalWatts += 5; // 5W holding power
      }
    } else if (dev.type === 'plc_micro_controller') {
      const pl = nodePotentials[terminalKey(dev.id, 'p_l')];
      const pn = nodePotentials[terminalKey(dev.id, 'p_n')];
      const isPowered = (pl === 'live' && pn === 'neutral') || (pn === 'live' && pl === 'neutral');
      if (isPowered) {
        deviceEnergized[dev.id] = true;
        dev.state.plcPowered = true;
        totalWatts += 15; // 15W internal CPU power
      }
    } else if (dev.type === 'modular_combo_plate') {
      const plPot = nodePotentials[terminalKey(dev.id, 'pilot_l')];
      const pnPot = nodePotentials[terminalKey(dev.id, 'pilot_n')];
      const isPilotLit = (plPot === 'live' && pnPot === 'neutral') || (pnPot === 'live' && plPot === 'neutral');
      dev.state.pilotLit = isPilotLit;
      if (isPilotLit && dev.state.comboSlot2 !== 'switch2') {
        totalWatts += 0.5;
      }

      const rlPot = nodePotentials[terminalKey(dev.id, 'rec_l')];
      const rnPot = nodePotentials[terminalKey(dev.id, 'rec_n')];
      const isRecPowered = rlPot === 'live' && rnPot === 'neutral';
      dev.state.receptaclePowered = isRecPowered;
      if (isRecPowered) {
        totalWatts += 150; // Nominal branch plug load
      }
      deviceEnergized[dev.id] = isPilotLit || isRecPowered;
    } else if (dev.type === 'timer_relay') {
      const coilHot = isCoilPowered(dev.id, 'a1', 'a2');
      deviceEnergized[dev.id] = coilHot;
      if (coilHot) {
        totalWatts += 4;
      }
    } else if (dev.type === 'vfd_drive') {
      const l1Pot = nodePotentials[terminalKey(dev.id, 'l1')];
      const l2Pot = nodePotentials[terminalKey(dev.id, 'l2')];
      const isPowered = l1Pot === 'live' && (l2Pot === 'live' || l2Pot === 'neutral');
      const isRun = isPowered && dev.state.isOn !== false;
      dev.state.running = isRun;
      deviceEnergized[dev.id] = isRun;
      if (isRun) totalWatts += 20;
    } else if (dev.type === 'ats_changeover') {
      const lOut = nodePotentials[terminalKey(dev.id, 'load_l')] === 'live';
      deviceEnergized[dev.id] = lOut;
    } else if (dev.type === 'generator_set_1p' || dev.type === 'generator_set_3p') {
      // A closed external contact between start_a and start_b (reached through the wiring) means "run"
      dev.state.remoteStart = isConnected(terminalKey(dev.id, 'start_a'), terminalKey(dev.id, 'start_b'));
      deviceEnergized[dev.id] = !!dev.state.running && !dev.state.overloaded;
    }
  }

  // 5. Compute Branch Wire Currents & Realistic Energy Flow Directions
  const totalAmps = totalWatts > 0 ? totalWatts / gridVoltage : 0;

  // Initialize all wires with default current = 0
  for (const wire of wires) {
    wireCurrents[wire.id] = 0;
    wireFlowDirections[wire.id] = wire.conductorRole === 'return_neutral' ? 'reverse' : 'forward';
  }

  // Helper to trace and accumulate current through conductive branches
  const traceLoadCurrent = (liveNode: string | undefined, neutralNode: string | undefined, branchAmps: number) => {
    if (branchAmps <= 0) return;

    // A. Trace from Load Hot/Live terminal upstream to Live Source (Forward power delivery)
    if (liveNode) {
      let curr = liveNode;
      const visited = new Set<string>();
      while (curr && liveParent[curr] && !visited.has(curr)) {
        visited.add(curr);
        const info = liveParent[curr];
        if (info.wire) {
          wireCurrents[info.wire.id] = (wireCurrents[info.wire.id] || 0) + branchAmps;
          wireFlowDirections[info.wire.id] = info.fromIsStart ? 'forward' : 'reverse';
        }
        curr = info.prevNode;
      }
    }

    // B. Trace from Load Neutral terminal upstream to Neutral Source (Reverse return flow)
    if (neutralNode) {
      let curr = neutralNode;
      const visited = new Set<string>();
      while (curr && neutralParent[curr] && !visited.has(curr)) {
        visited.add(curr);
        const info = neutralParent[curr];
        if (info.wire) {
          wireCurrents[info.wire.id] = (wireCurrents[info.wire.id] || 0) + branchAmps;
          wireFlowDirections[info.wire.id] = info.fromIsStart ? 'reverse' : 'forward';
        }
        curr = info.prevNode;
      }
    }
  };

  // Trace currents for all energized loads
  for (const dev of devices) {
    if (!deviceEnergized[dev.id]) continue;

    if (dev.type === 'light_bulb') {
      const w = dev.state.wattage || 60;
      traceLoadCurrent(terminalKey(dev.id, 'hot'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'socket_duplex' || dev.type === 'socket_schuko') {
      if (dev.state.hasPluggedLoad) {
        const w = dev.state.pluggedAppliance === 'appliance_tv' ? 120 : 300;
        const liveT = dev.terminals.find(t => nodePotentials[terminalKey(dev.id, t.id)] === 'live');
        const neutT = dev.terminals.find(t => nodePotentials[terminalKey(dev.id, t.id)] === 'neutral');
        traceLoadCurrent(
          liveT ? terminalKey(dev.id, liveT.id) : undefined,
          neutT ? terminalKey(dev.id, neutT.id) : undefined,
          w / gridVoltage
        );
      }
    } else if (dev.type === 'appliance_fan') {
      const w = dev.state.wattage || 65;
      traceLoadCurrent(terminalKey(dev.id, 'line'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'pump_booster_1p') {
      const w = (Number(dev.state.kw) || 0.75) * 1000;
      traceLoadCurrent(terminalKey(dev.id, 'line'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'appliance_ac') {
      const w = dev.state.wattage || 1200;
      traceLoadCurrent(terminalKey(dev.id, 'line'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'appliance_water_heater') {
      const w = dev.state.wattage || 3500;
      traceLoadCurrent(terminalKey(dev.id, 'line'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'motor_ac_industrial' || dev.type === 'pump_booster_3p') {
      const w = dev.state.wattage || 2200;
      const isThreePhase = !!nodePhases[terminalKey(dev.id, 'u1')];
      if (isThreePhase) {
        // Balanced line current in each of U1 / V1 / W1, traced back to its own phase
        const amps = motorLineAmps(w, lineVolts);
        for (const t of ['u1', 'v1', 'w1']) traceLoadCurrent(terminalKey(dev.id, t), undefined, amps);

        // Series devices on the U1 feed path (contactor, overload relay) carry the line current
        let curr: string | undefined = terminalKey(dev.id, 'u1');
        const seen = new Set<string>();
        while (curr && !seen.has(curr)) {
          seen.add(curr);
          const up = deviceById.get(devOfNode(curr));
          if (up && (up.type === 'thermal_overload_relay' || up.type === 'contactor_3p')) {
            up.state.measuredAmps = amps;
          }
          curr = liveParent[curr]?.prevNode;
        }
      } else {
        traceLoadCurrent(terminalKey(dev.id, 'u1'), terminalKey(dev.id, 'v1'), w / gridVoltage);
      }
    } else if (dev.type === 'motor_6lead_star_delta') {
      const amps = dev.state.measuredAmps || 0;
      const mode = dev.state.starterMode;
      const updateUpstream = (startTerm: string, branchAmps: number) => {
        let curr: string | undefined = terminalKey(dev.id, startTerm);
        const seen = new Set<string>();
        while (curr && !seen.has(curr)) {
          seen.add(curr);
          const up = deviceById.get(devOfNode(curr));
          if (up && (up.type === 'thermal_overload_relay' || up.type === 'contactor_3p')) {
            up.state.measuredAmps = Math.max(up.state.measuredAmps || 0, branchAmps);
          }
          curr = liveParent[curr]?.prevNode;
        }
      };

      if (mode === 'delta') {
        const branchAmps = amps / 2;
        for (const t of ['u1', 'v1', 'w1']) traceLoadCurrent(terminalKey(dev.id, t), undefined, branchAmps);
        for (const t of ['w2', 'u2', 'v2']) traceLoadCurrent(terminalKey(dev.id, t), undefined, branchAmps);
        updateUpstream('u1', branchAmps);
        updateUpstream('w2', branchAmps);
      } else if (mode === 'wye') {
        for (const t of ['u1', 'v1', 'w1']) traceLoadCurrent(terminalKey(dev.id, t), undefined, amps);
        updateUpstream('u1', amps);
        const starContactors = new Set<string>();
        const w2Terms = new Set(['w2', 'u2', 'v2']);
        for (const wire of wires) {
          const toMotor = wire.toDeviceId === dev.id && w2Terms.has(wire.toTerminalId);
          const fromMotor = wire.fromDeviceId === dev.id && w2Terms.has(wire.fromTerminalId);
          if (toMotor || fromMotor) {
            wireCurrents[wire.id] = (wireCurrents[wire.id] || 0) + amps;
            const otherId = toMotor ? wire.fromDeviceId : wire.toDeviceId;
            const otherDev = deviceById.get(otherId);
            if (otherDev?.type === 'contactor_3p') {
              otherDev.state.measuredAmps = amps;
              starContactors.add(otherId);
            }
          }
        }
        for (const wire of wires) {
          if (
            starContactors.has(wire.fromDeviceId) &&
            starContactors.has(wire.toDeviceId) &&
            ['l1', 'l2', 'l3'].includes(wire.fromTerminalId)
          ) {
            wireCurrents[wire.id] = (wireCurrents[wire.id] || 0) + amps;
          }
        }
      }
    } else if (dev.type === 'motor_1p' && dev.state.mainPowered) {
      const amps = Number(dev.state.measuredAmps) || 0;
      const mainLive = nodePotentials[terminalKey(dev.id, 'u1')] === 'live' ? 'u1' : 'u2';
      traceLoadCurrent(terminalKey(dev.id, mainLive), terminalKey(dev.id, mainLive === 'u1' ? 'u2' : 'u1'), amps * 0.7);
      if (dev.state.auxActive) {
        const auxLive = nodePotentials[terminalKey(dev.id, 'z1')] === 'live' ? 'z1' : 'z2';
        traceLoadCurrent(terminalKey(dev.id, auxLive), terminalKey(dev.id, auxLive === 'z1' ? 'z2' : 'z1'), amps * 0.5);
      }
    } else if ((dev.type === 'buzzer_horn' || dev.type === 'beacon') && dev.state.active && dev.state.supply !== 'dc24') {
      const liveT = nodePotentials[terminalKey(dev.id, 'a1')] === 'live' ? 'a1' : 'a2';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, liveT === 'a1' ? 'a2' : 'a1'), (Number(dev.state.wattage) || 5) / gridVoltage);
    } else if (dev.type === 'tower_light' && dev.state.supply !== 'dc24') {
      const segs = (dev.state.segments || {}) as Record<string, boolean>;
      for (const seg of ['r', 'a', 'g']) {
        if (segs[seg]) traceLoadCurrent(terminalKey(dev.id, seg), terminalKey(dev.id, 'com'), (Number(dev.state.wattage) || 8) / 3 / gridVoltage);
      }
    } else if (dev.type === 'pilot_light_indicator') {
      const p1 = nodePotentials[terminalKey(dev.id, 'x1')];
      const liveT = p1 === 'live' ? 'x1' : 'x2';
      const neutT = p1 === 'live' ? 'x2' : 'x1';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 5 / gridVoltage);
    } else if (dev.type === 'industrial_relay_dpdt' && dev.state.coilEnergized) {
      const a1Pot = nodePotentials[terminalKey(dev.id, 'a1')];
      const liveT = a1Pot === 'live' ? 'a1' : 'a2';
      const neutT = a1Pot === 'live' ? 'a2' : 'a1';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 5 / gridVoltage);
    } else if (dev.type === 'contactor_3p' && dev.state.coilEnergized && !dev.state.manualOverride) {
      const a1Pot = nodePotentials[terminalKey(dev.id, 'a1')];
      const liveT = a1Pot === 'live' ? 'a1' : 'a2';
      const neutT = a1Pot === 'live' ? 'a2' : 'a1';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 15 / gridVoltage);
    } else if (dev.type === 'plc_micro_controller' && dev.state.plcPowered) {
      const plPot = nodePotentials[terminalKey(dev.id, 'p_l')];
      const liveT = plPot === 'live' ? 'p_l' : 'p_n';
      const neutT = plPot === 'live' ? 'p_n' : 'p_l';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 15 / gridVoltage);
    } else if (dev.type === 'modular_combo_plate') {
      if (dev.state.pilotLit && dev.state.comboSlot2 !== 'switch2') {
        const plPot = nodePotentials[terminalKey(dev.id, 'pilot_l')];
        const liveT = plPot === 'live' ? 'pilot_l' : 'pilot_n';
        const neutT = plPot === 'live' ? 'pilot_n' : 'pilot_l';
        traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 0.5 / gridVoltage);
      }
      if (dev.state.receptaclePowered) {
        traceLoadCurrent(terminalKey(dev.id, 'rec_l'), terminalKey(dev.id, 'rec_n'), 150 / gridVoltage);
      }
    } else if (dev.type === 'timer_relay') {
      const a1Pot = nodePotentials[terminalKey(dev.id, 'a1')];
      const liveT = a1Pot === 'live' ? 'a1' : 'a2';
      const neutT = a1Pot === 'live' ? 'a2' : 'a1';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 4 / gridVoltage);
    }
  }

  // Update digital panel meters with live bus RMS voltage, branch current, and frequency
  for (const dev of devices) {
    if (dev.type !== 'panel_meter') continue;
    const vlKey = terminalKey(dev.id, 'v_l');
    const vnKey = terminalKey(dev.id, 'v_n');
    const vlPot = nodePotentials[vlKey];
    const vnPot = nodePotentials[vnKey];
    const hasVolts =
      (vlPot === 'live' && (vnPot === 'neutral' || vnPot === 'earth')) ||
      (vlPot === 'live' && vnPot === 'live' && nodePhases[vlKey] && nodePhases[vnKey] && nodePhases[vlKey] !== nodePhases[vnKey]);
    let ctAmps = 0;
    for (const w of wires) {
      if (
        (w.fromDeviceId === dev.id && (w.fromTerminalId === 'ct_in' || w.fromTerminalId === 'ct_out')) ||
        (w.toDeviceId === dev.id && (w.toTerminalId === 'ct_in' || w.toTerminalId === 'ct_out'))
      ) {
        ctAmps = Math.max(ctAmps, wireCurrents[w.id] || 0);
      }
    }
    dev.state.volts = hasVolts ? Math.max(nodeVoltages[vlKey] || gridVoltage, gridVoltage) : 0;
    dev.state.amps = ctAmps;
    dev.state.hz = standard === 'PEC' ? 60 : 50;
  }

  // Calculate voltage drop on all wires
  for (const wire of wires) {
    const current = wireCurrents[wire.id] || 0;
    const gaugeStd = standards.find(s => s.name === wire.wireGauge) || standards[0];
    const rPerKm = gaugeStd?.resistanceOhmPerKm || 10.0;
    const lengthM = wire.lengthMeters || 5.0;
    const wireR = (lengthM * rPerKm) / 1000;

    const vd = 2 * current * wireR;
    const vdPercent = gridVoltage > 0 ? (vd / gridVoltage) * 100 : 0;

    wireVoltageDrops[wire.id] = vd;
    wireVoltageDropPercents[wire.id] = vdPercent;
  }

  // 6. Thermal & Magnetic Trip Curve Evaluation (B/C/D) on Breakers
  const hasVfdUpstream = (node: string): boolean => {
    let curr: string | undefined = node;
    const seen = new Set<string>();
    while (curr && !seen.has(curr)) {
      seen.add(curr);
      if (deviceById.get(devOfNode(curr))?.type === 'vfd_drive') return true;
      curr = liveParent[curr]?.prevNode;
    }
    return false;
  };

  const motorInrushByBreaker: Record<string, number> = {};
  for (const dev of devices) {
    if ((dev.type === 'motor_ac_industrial' || dev.type === 'pump_booster_3p' || dev.type === 'motor_6lead_star_delta') && deviceEnergized[dev.id]) {
      const startKey = terminalKey(dev.id, 'u1');
      const runAmps = dev.state.measuredAmps || (dev.state.wattage || 2200) / gridVoltage;
      const inrushMult = hasVfdUpstream(startKey)
        ? 1.8
        : dev.type === 'motor_6lead_star_delta'
        ? (dev.state.starterMode === 'delta' ? 2.2 : 6.0)
        : 6.0;
      const inrushAmps = runAmps * inrushMult;
      let curr: string | undefined = startKey;
      const seen = new Set<string>();
      while (curr && !seen.has(curr)) {
        seen.add(curr);
        const up = deviceById.get(devOfNode(curr));
        if (up && (BREAKER_TYPES.has(up.type) || behaviorFor(up.type)?.clearsFault)) {
          motorInrushByBreaker[up.id] = Math.max(motorInrushByBreaker[up.id] || 0, inrushAmps);
        }
        curr = liveParent[curr]?.prevNode;
      }
    }
  }

  for (const dev of devices) {
    if (!BREAKER_TYPES.has(dev.type) || ADJUSTABLE_BREAKERS.has(dev.type) || !dev.state.closed || dev.state.tripped) continue;
    if (trippedDevices.includes(dev.id)) continue;
    const rated = dev.state.ratedAmps || 16;
    const curve = dev.state.tripCurve || 'C';
    const curveMagFactor = curve === 'B' ? 3.5 : curve === 'D' ? 12 : 6.5;
    let breakerAmps = 0;
    for (const w of wires) {
      if (w.fromDeviceId === dev.id || w.toDeviceId === dev.id) {
        breakerAmps = Math.max(breakerAmps, wireCurrents[w.id] || 0);
      }
    }
    const peakInrush = motorInrushByBreaker[dev.id] || 0;
    if (peakInrush > rated * curveMagFactor) {
      trippedDevices.push(dev.id);
      tripReasons[dev.id] = `Magnetic Inrush Trip (Curve ${curve}): Motor starting LRA (${peakInrush.toFixed(1)}A) exceeds ${curve} threshold (${(rated * curveMagFactor).toFixed(0)}A) — select Type C/D or VFD soft-start`;
      continue;
    }
    // If the conducted load exceeds 1.3x rated, trip thermally
    if (breakerAmps > rated * 1.3) {
      trippedDevices.push(dev.id);
      tripReasons[dev.id] = `Thermal Overload Trip: Load current (${breakerAmps.toFixed(1)}A) exceeds breaker rating (${rated}A)`;
    }
  }

  // ── Protection and metering devices (batch 3.1) ─────────────────────────────────────────────
  const wireAmpsAt = (dev: ElectricalDevice, terminalId: string) => {
    let amps = 0;
    for (const w of wires) {
      const here = (w.fromDeviceId === dev.id && w.fromTerminalId === terminalId) || (w.toDeviceId === dev.id && w.toTerminalId === terminalId);
      if (here && w.fromDeviceId !== w.toDeviceId) amps = Math.max(amps, wireCurrents[w.id] || 0);
    }
    return amps;
  };
  const upstreamChain = (dev: ElectricalDevice): ElectricalDevice[] => {
    const chain: ElectricalDevice[] = [];
    const seenDev = new Set<string>();
    for (const t of dev.terminals) {
      let curr: string | undefined = terminalKey(dev.id, t.id);
      if (nodePotentials[curr] !== 'live') continue;
      const seen = new Set<string>();
      while (curr && !seen.has(curr)) {
        seen.add(curr);
        const up = deviceById.get(devOfNode(curr));
        if (up && up.id !== dev.id && !seenDev.has(up.id)) {
          seenDev.add(up.id);
          chain.push(up);
        }
        curr = liveParent[curr]?.prevNode;
      }
    }
    return chain;
  };

  for (const ct of devices) if (ct.type === 'core_balance_ct') ct.state.leakageMa = 0;
  for (const dev of devices) {
    const hasLeak = !!dev.state.hasEarthFault && deviceEnergized[dev.id];
    const loose = !!dev.state.looseTerminal && deviceEnergized[dev.id];
    dev.state.arcing = false;
    if (!hasLeak && !loose) continue;
    const chain = upstreamChain(dev);
    if (hasLeak) {
      const faultMa = Number(dev.state.faultMa) || 500;
      for (const up of chain) {
        if (up.type === 'core_balance_ct') up.state.leakageMa = Math.max(Number(up.state.leakageMa) || 0, faultMa);
        else if ((up.type === 'rcd_4p' || up.type === 'gfci_receptacle') && up.state.closed && !up.state.tripped && faultMa >= (Number(up.state.sensitivityMa) || 30)) {
          if (!trippedDevices.includes(up.id)) {
            trippedDevices.push(up.id);
            tripReasons[up.id] = `Earth Leakage Trip: ${faultMa} mA leakage to earth at ${dev.name || dev.id} (IΔn ${up.state.sensitivityMa || 30} mA)`;
          }
          break;
        }
      }
    }
    if (loose) {
      // A loose terminal carrying current makes a series arc. Only an AFDD can see it; an MCB sees a normal load.
      dev.state.arcing = true;
      const afdd = chain.find((up) => up.type === 'afdd_1pn' && up.state.closed && !up.state.tripped);
      sparks.push({
        id: `arc_${dev.id}`,
        x: dev.x + dev.width / 2,
        y: dev.y + dev.height / 2,
        severity: 'minor',
        timestamp: Date.now(),
        message: `SERIES ARC at a loose terminal of ${dev.name || dev.id}${afdd ? ' (AFDD will trip)' : ': no arc-fault protection upstream, fire hazard'}`,
      });
      if (afdd && !trippedDevices.includes(afdd.id)) {
        trippedDevices.push(afdd.id);
        tripReasons[afdd.id] = `AFDD Arc-Fault Trip: series arcing detected downstream at ${dev.name || dev.id}`;
      }
    }
  }
  for (const dev of devices) {
    if (dev.type === 'mccb_3p' && dev.state.shuntTrip && dev.state.closed && !dev.state.tripped && isCoilPowered(dev.id, 'sht_a1', 'sht_a2') && !trippedDevices.includes(dev.id)) {
      trippedDevices.push(dev.id);
      tripReasons[dev.id] = 'Shunt trip: the C1-C2 coil was energized by a control signal';
    }
    if (dev.type === 'mccb_3p' && dev.state.uvRelease && dev.state.closed && !dev.state.tripped && dev.state.uvPowered === false && !trippedDevices.includes(dev.id)) {
      // Cannot happen for a breaker that has just closed on a live release; covers loss of its supply
    }
    if (dev.type === 'earth_leakage_relay') {
      let leak = 0;
      for (const w of wires) {
        for (const [a, b] of [[w.fromDeviceId, w.toDeviceId], [w.toDeviceId, w.fromDeviceId]] as const) {
          const ct = a === dev.id ? deviceById.get(b) : undefined;
          if (ct && ct.type === 'core_balance_ct') leak = Math.max(leak, Number(ct.state.leakageMa) || 0);
        }
      }
      dev.state.leakageMa = leak;
    }
    if (dev.type === 'current_transformer') {
      const primary = Math.max(wireAmpsAt(dev, 'p1'), wireAmpsAt(dev, 'p2'));
      const ratio = Math.max(1, (Number(dev.state.primaryA) || 100) / 5);
      const k1 = terminalKey(dev.id, 's1');
      const k2 = terminalKey(dev.id, 's2');
      // The secondary is closed when a path leads from S1 back to S2 (shorting link or ammeter)
      const seen = new Set([k1]);
      const queue = [k1];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const n of adj[cur] ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
      }
      const closed = seen.has(k2);
      dev.state.primaryAmps = Math.round(primary * 100) / 100;
      dev.state.openSecondary = primary > 0.05 && !closed;
      dev.state.secondaryA = closed ? Math.round((primary / ratio) * 1000) / 1000 : 0;
      if (dev.state.openSecondary) {
        sparks.push({
          id: `ct_open_${dev.id}`, x: dev.x + dev.width / 2, y: dev.y + dev.height, severity: 'minor', timestamp: Date.now(),
          message: `OPEN CT SECONDARY on ${dev.name || dev.id}: dangerous voltage across S1-S2 while the primary carries ${primary.toFixed(1)} A. Short S1-S2 or connect an ammeter`,
        });
      }
      deviceEnergized[dev.id] = primary > 0.05;
    }
    if (dev.type === 'panel_ammeter') {
      let reading = 0;
      const start = terminalKey(dev.id, 'i1');
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const cur = queue.shift()!;
        const ct = deviceById.get(devOfNode(cur));
        if (ct && ct.type === 'current_transformer' && !ct.state.openSecondary) reading = Math.max(reading, Number(ct.state.primaryAmps) || 0);
        for (const n of adj[cur] ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
      }
      dev.state.readingA = Math.round(reading * 10) / 10;
      deviceEnergized[dev.id] = reading > 0;
    }
    if (dev.type === 'voltmeter_selector') {
      const sel = String(dev.state.selector || 'OFF');
      const [x, y] = sel === 'OFF' ? [] : sel.split('-').map((p) => p.toLowerCase());
      let volts = 0;
      if (x && y) {
        const a = terminalKey(dev.id, x);
        const b = terminalKey(dev.id, y);
        if (nodePotentials[a] === 'live' && nodePotentials[b] === 'live' && nodePhases[a] && nodePhases[b] && nodePhases[a] !== nodePhases[b]) {
          volts = Math.round(Math.max(nodeVoltages[a] || 0, nodeVoltages[b] || 0) * Math.sqrt(3));
        } else if ((nodePotentials[a] === 'live' && nodePotentials[b] === 'neutral') || (nodePotentials[b] === 'live' && nodePotentials[a] === 'neutral')) {
          volts = Math.round(nodePotentials[a] === 'live' ? nodeVoltages[a] || 0 : nodeVoltages[b] || 0);
        }
      }
      dev.state.readingV = volts;
      deviceEnergized[dev.id] = volts > 0;
    }
    if (dev.type === 'voltage_relay' || dev.type === 'earth_leakage_relay' || dev.type === 'ptc_relay') {
      deviceEnergized[dev.id] = !!dev.state.supplied;
      if (dev.state.supplied) totalWatts += 3;
    }
  }

  // 24 V DC devices: energized flags and wiring notes (NPN / PNP mismatch is a visible fault, never silent)
  for (const dev of devices) {
    if (dev.type === 'psu_24vdc') {
      deviceEnergized[dev.id] = !!dev.state.dcOutputOn;
      if (isCoilPowered(dev.id, 'in_l', 'in_n')) totalWatts += Number(dev.state.wattage) || 12;
    } else if (dev.type === 'sensor_inductive' || dev.type === 'sensor_capacitive' || dev.type === 'sensor_photoelectric') {
      deviceEnergized[dev.id] = !!dev.state.sensorPowered;
      let note = (dev.state.supplyNote as string) || '';
      for (const w of wires) {
        const end = w.fromDeviceId === dev.id && w.fromTerminalId === 'black' ? [w.toDeviceId, w.toTerminalId]
          : w.toDeviceId === dev.id && w.toTerminalId === 'black' ? [w.fromDeviceId, w.fromTerminalId] : null;
        const other = end && deviceById.get(end[0]);
        if (other && other.type === 'plc_24vdc_16io' && /^i\d$/.test(end![1])) {
          const sinking = other.state.inputMode !== 'sourcing';
          const mismatch = (dev.state.output === 'NPN') === sinking;
          other.state.dcNote = mismatch ? `${dev.state.output} sensor on a ${sinking ? 'SINKING (PNP)' : 'SOURCING (NPN)'} input: it can never switch ${end![1].toUpperCase()}` : '';
          if (mismatch) note = `${dev.state.output} OUTPUT INTO ${sinking ? 'PNP (SINKING)' : 'NPN (SOURCING)'} INPUT`;
        }
      }
      dev.state.wiringNote = note;
    } else if (dev.type === 'plc_24vdc_16io') {
      deviceEnergized[dev.id] = !!dev.state.plcPowered;
    }
  }

  // 7. Motor Overload Relays: bimetal trips when motor current exceeds the dial setting
  for (const dev of devices) {
    if (dev.type !== 'thermal_overload_relay' || dev.state.tripped) continue;
    const setting = dev.state.tripAmps || 6;
    const amps = dev.state.measuredAmps || 0;
    if (amps > setting * 1.05) {
      trippedDevices.push(dev.id);
      tripReasons[dev.id] = `Motor Overload Trip (TOR ${dev.state.tag || ''}): ${amps.toFixed(1)}A exceeds dial setting ${setting}A — 95-96 opened, 97-98 closed`;
    }
  }

  return {
    nodeVoltages,
    nodePotentials,
    nodePhases,
    dcPotentials: dc.potentials,
    deviceEnergized,
    wireCurrents,
    wireFlowDirections,
    wireVoltageDrops,
    wireVoltageDropPercents,
    totalWatts,
    totalAmps,
    sparks,
    faults,
    trippedDevices,
    tripReasons,
    devicePatches,
    inrushByDevice: motorInrushByBreaker,
  };
}
