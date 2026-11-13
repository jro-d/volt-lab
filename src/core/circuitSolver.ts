import { ElectricalDevice, ElectricalWire, CodeStandard } from '../types/electrical';
import { SparkEvent } from '../types/simulation';
import { getWireStandards } from '../data/standardsData';

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
  };
}

/** Overcurrent devices that can clear a fault */
const BREAKER_TYPES = new Set([
  'mcb_1p',
  'mcb_2p',
  'mcb_3p',
  'service_disconnect_2p',
  'royu_safety_breaker_2p',
]);

/** Positive (CW) 3-phase rotation sequences */
const CW_SEQUENCES = ['L1,L2,L3', 'L2,L3,L1', 'L3,L1,L2'];

/** Approximate 3-phase motor full-load line current (η·pf ≈ 0.6 → close to PEC/NEC FLA tables) */
export function motorLineAmps(watts: number, lineVolts: number): number {
  return watts / (Math.sqrt(3) * lineVolts * 0.6);
}

export function solveCircuit(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  standard: CodeStandard = 'PEC',
  gridVoltage: number = 230
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
  let faults: CircuitFault[] = [];

  const deviceById = new Map(devices.map(d => [d.id, d]));

  // Build terminal node lookup
  const terminalKey = (devId: string, termId: string) => `${devId}:${termId}`;
  const devOfNode = (node: string) => node.slice(0, node.lastIndexOf(':'));

  // 3-phase supply line voltage (if any) — used for motor current & L-N potentials
  const threePhaseSource = devices.find(d => d.type === 'source_3phase_440v');
  const lineVolts: number = threePhaseSource?.state.lineVoltage || 440;
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
    } else if (dev.type === 'royu_safety_breaker_2p') {
      if (dev.state.closed && !dev.state.tripped) {
        addEdge(terminalKey(dev.id, 'in_l'), terminalKey(dev.id, 'out_l'));
        addEdge(terminalKey(dev.id, 'in_n'), terminalKey(dev.id, 'out_n'));
      }
    } else if (dev.type === 'utility_box_surface_pvc') {
      // Internal pass-through continuity for wire routes inside 2x4 utility box
      addEdge(terminalKey(dev.id, 'l_in'), terminalKey(dev.id, 'l_out'));
      addEdge(terminalKey(dev.id, 'n_in'), terminalKey(dev.id, 'n_out'));
      addEdge(terminalKey(dev.id, 'pe_in'), terminalKey(dev.id, 'pe_out'));
    } else if (dev.type === 'royu_modular_combo_plate') {
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
    } else if (dev.type === 'junction_box' || dev.type === 'junction_box_4way' || dev.type === 'junction_box_octagonal_orange') {
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
    } else if (dev.type === 'splice_wire_nut' || dev.type === 'wago_connector_3p') {
      // All terminals on a standalone wire nut or WAGO lever splice are bonded together
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

  // Dynamic Cascade Evaluation. Electromagnetic devices settle ONE AT A TIME (first in the list wins),
  // which reproduces real-world races such as two interlocked contactors fighting for the same supply.
  for (let pass = 0; pass < 16; pass++) {
    executePass();

    let contactsChanged = false;
    for (const dev of devices) {
      if (dev.type === 'industrial_relay_dpdt') {
        const on = isCoilPowered(dev.id, 'a1', 'a2') || !!dev.state.manualTest;
        if (!!dev.state.coilEnergized !== on) {
          dev.state.coilEnergized = on;
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
      } else if (dev.type === 'ats_changeover' && dev.state.autoMode !== false) {
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
  const findUpstreamBreaker = (node: string): ElectricalDevice | undefined => {
    let curr: string | undefined = node;
    const seen = new Set<string>();
    while (curr && !seen.has(curr)) {
      seen.add(curr);
      const dev = deviceById.get(devOfNode(curr));
      if (dev && BREAKER_TYPES.has(dev.type) && dev.state.closed && !dev.state.tripped) return dev;
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
        if (d && (d.type === 'contactor_3p' || d.type === 'thermal_overload_relay' || d.type === 'motor_ac_industrial' || d.type === 'motor_6lead_star_delta')) {
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

    if (breaker && !trippedDevices.includes(breaker.id)) {
      trippedDevices.push(breaker.id);
      tripReasons[breaker.id] = isPhasePhase
        ? `Magnetic Instantaneous Trip: ${fault.phases?.join('-')} phase-to-phase fault (> 10 kA prospective)`
        : 'Magnetic Instantaneous Trip (Short Circuit Fault Current > 1,500A)';
    }
  }

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
    } else if (dev.type === 'socket_duplex') {
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

      if (hasPower && dev.state.hasPluggedLoad) {
        // Find if TV or appliance is connected
        const p = dev.state.pluggedAppliance === 'appliance_tv' ? 120 : 300;
        totalWatts += p;
      }
    } else if (dev.type === 'appliance_tv') {
      // Find connected socket
      const rec = devices.find(d => d.type === 'socket_duplex' && deviceEnergized[d.id]);
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
        if (dev.state.hasEarthFault) {
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
    } else if (dev.type === 'appliance_ac') {
      const lPot = nodePotentials[terminalKey(dev.id, 'line')];
      const nPot = nodePotentials[terminalKey(dev.id, 'neutral')];
      const isPowered = lPot === 'live' && nPot === 'neutral';
      deviceEnergized[dev.id] = isPowered;
      dev.state.powered = isPowered;
      if (isPowered) {
        totalWatts += dev.state.wattage || 1200;
      }
    } else if (dev.type === 'motor_3phase_dol') {
      const l1Pot = nodePotentials[terminalKey(dev.id, 'l1')];
      const l2Pot = nodePotentials[terminalKey(dev.id, 'l2')];
      const l3Pot = nodePotentials[terminalKey(dev.id, 'l3')];
      const isRunning = l1Pot === 'live' && (l2Pot === 'live' || l2Pot === 'neutral') && (l3Pot === 'live' || l3Pot === 'neutral');
      deviceEnergized[dev.id] = isRunning;
      dev.state.running = isRunning;
      if (isRunning) {
        totalWatts += dev.state.wattage || 2200;
      }
    } else if (dev.type === 'motor_ac_industrial') {
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
      dev.state.motorDirection = direction;
      dev.state.motorFault = fault;
      dev.state.measuredAmps = isRunning
        ? distinctPhases.size === 3
          ? motorLineAmps(dev.state.wattage || 2200, lineVolts)
          : (dev.state.wattage || 2200) / gridVoltage
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
    } else if (dev.type === 'royu_modular_combo_plate') {
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
    } else if (dev.type === 'socket_duplex') {
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
    } else if (dev.type === 'appliance_ac') {
      const w = dev.state.wattage || 1200;
      traceLoadCurrent(terminalKey(dev.id, 'line'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'appliance_water_heater') {
      const w = dev.state.wattage || 3500;
      traceLoadCurrent(terminalKey(dev.id, 'line'), terminalKey(dev.id, 'neutral'), w / gridVoltage);
    } else if (dev.type === 'motor_3phase_dol') {
      const w = dev.state.wattage || 2200;
      traceLoadCurrent(terminalKey(dev.id, 'l1'), terminalKey(dev.id, 'l2'), w / gridVoltage);
    } else if (dev.type === 'motor_ac_industrial') {
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
    } else if (dev.type === 'royu_modular_combo_plate') {
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
    if ((dev.type === 'motor_ac_industrial' || dev.type === 'motor_6lead_star_delta' || dev.type === 'motor_3phase_dol') && deviceEnergized[dev.id]) {
      const startKey = terminalKey(dev.id, dev.type === 'motor_3phase_dol' ? 'l1' : 'u1');
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
        if (up && BREAKER_TYPES.has(up.type)) {
          motorInrushByBreaker[up.id] = Math.max(motorInrushByBreaker[up.id] || 0, inrushAmps);
        }
        curr = liveParent[curr]?.prevNode;
      }
    }
  }

  for (const dev of devices) {
    if (!BREAKER_TYPES.has(dev.type) || !dev.state.closed || dev.state.tripped) continue;
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
    tripReasons
  };
}
