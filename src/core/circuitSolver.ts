import { ElectricalDevice, ElectricalWire, CodeStandard } from '../types/electrical';
import { SimulationState, SparkEvent } from '../types/simulation';
import { getWireStandards } from '../data/standardsData';

export interface SolvedCircuit {
  nodeVoltages: Record<string, number>;
  nodePotentials: Record<string, 'live' | 'neutral' | 'earth' | 'switched' | 'none'>;
  deviceEnergized: Record<string, boolean>;
  wireCurrents: Record<string, number>;
  wireFlowDirections: Record<string, 'forward' | 'reverse'>;
  wireVoltageDrops: Record<string, number>;
  wireVoltageDropPercents: Record<string, number>;
  totalWatts: number;
  totalAmps: number;
  sparks: SparkEvent[];
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
    deviceEnergized: {},
    wireCurrents,
    wireFlowDirections,
    wireVoltageDrops,
    wireVoltageDropPercents,
    totalWatts: 0,
    totalAmps: 0,
    sparks: [],
    trippedDevices: [],
    tripReasons: {},
  };
}

export function solveCircuit(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  standard: CodeStandard = 'PEC',
  gridVoltage: number = 230
): SolvedCircuit {
  const nodeVoltages: Record<string, number> = {};
  const nodePotentials: Record<string, 'live' | 'neutral' | 'earth' | 'switched' | 'none'> = {};
  const deviceEnergized: Record<string, boolean> = {};
  const wireCurrents: Record<string, number> = {};
  const wireFlowDirections: Record<string, 'forward' | 'reverse'> = {};
  const wireVoltageDrops: Record<string, number> = {};
  const wireVoltageDropPercents: Record<string, number> = {};
  const sparks: SparkEvent[] = [];
  const trippedDevices: string[] = [];
  const tripReasons: Record<string, string> = {};

  // Build terminal node lookup
  const terminalKey = (devId: string, termId: string) => `${devId}:${termId}`;

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
    liveParent = {};
    neutralParent = {};

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
        addEdge(terminalKey(dev.id, 'l1'), terminalKey(dev.id, 't1'));
        addEdge(terminalKey(dev.id, 'l2'), terminalKey(dev.id, 't2'));
        addEdge(terminalKey(dev.id, 'l3'), terminalKey(dev.id, 't3'));
        addEdge(terminalKey(dev.id, 'no_13'), terminalKey(dev.id, 'no_14'));
      }
    } else if (dev.type === 'plc_micro_controller') {
      const outs = dev.state.plcOutputs || {};
      if (outs.q1) addEdge(terminalKey(dev.id, 'q1_1'), terminalKey(dev.id, 'q1_2'));
      if (outs.q2) addEdge(terminalKey(dev.id, 'q2_1'), terminalKey(dev.id, 'q2_2'));
      if (outs.q3) addEdge(terminalKey(dev.id, 'q3_1'), terminalKey(dev.id, 'q3_2'));
      if (outs.q4) addEdge(terminalKey(dev.id, 'q4_1'), terminalKey(dev.id, 'q4_2'));
    }
  }

  // 2. Identify Sources & Seed Potentials
  // Find Meter or main entrance sources
  const liveSeedNodes: string[] = [];
  const neutralSeedNodes: string[] = [];
  const earthSeedNodes: string[] = [];

  for (const dev of devices) {
    if (dev.type === 'kwh_meter_1p') {
      // Meter generates source voltages on its output terminals
      liveSeedNodes.push(terminalKey(dev.id, 'l_out'));
      neutralSeedNodes.push(terminalKey(dev.id, 'n_out'));
    } else if (dev.type === 'ground_pit') {
      earthSeedNodes.push(terminalKey(dev.id, 'clamp'));
    } else if (dev.type === 'earth_busbar' && dev.state.isEarth) {
      earthSeedNodes.push(terminalKey(dev.id, 'pe_main'));
    }
  }

  // If no meter is present, provide fallback source on service disconnect / MCB
  if (liveSeedNodes.length === 0) {
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

    const traverse = (
      seeds: string[], 
      potential: 'live' | 'neutral' | 'earth', 
      voltage: number,
      parentRecord?: Record<string, { prevNode: string; wire?: ElectricalWire; fromIsStart?: boolean }>
    ) => {
      const visited = new Set<string>();
      const queue = [...seeds];
      for (const s of seeds) {
        visited.add(s);
      }

      while (queue.length > 0) {
        const curr = queue.shift()!;
        nodePotentials[curr] = potential;
        nodeVoltages[curr] = voltage;

        const neighbors = adj[curr];
        if (neighbors) {
          for (const n of neighbors) {
            if (!visited.has(n)) {
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
        }
      }
    };

    traverse(earthSeedNodes, 'earth', 0);
    traverse(neutralSeedNodes, 'neutral', 0, neutralParent);
    traverse(liveSeedNodes, 'live', gridVoltage, liveParent);
  };

  // Dynamic Cascade Evaluation (Max 3 passes for cascaded industrial logic: Sensor -> PLC -> Contactor -> Motor)
  for (let pass = 0; pass < 3; pass++) {
    executePass();

    let contactsChanged = false;
    for (const dev of devices) {
      if (dev.type === 'industrial_relay_dpdt') {
        const a1 = nodePotentials[terminalKey(dev.id, 'a1')];
        const a2 = nodePotentials[terminalKey(dev.id, 'a2')];
        const on = (a1 === 'live' && a2 === 'neutral') || (a2 === 'live' && a1 === 'neutral') || !!dev.state.manualTest;
        if (dev.state.coilEnergized !== on) {
          dev.state.coilEnergized = on;
          contactsChanged = true;
        }
      } else if (dev.type === 'contactor_3p') {
        const a1 = nodePotentials[terminalKey(dev.id, 'a1')];
        const a2 = nodePotentials[terminalKey(dev.id, 'a2')];
        const on = (a1 === 'live' && a2 === 'neutral') || (a2 === 'live' && a1 === 'neutral') || !!dev.state.manualOverride;
        if (dev.state.coilEnergized !== on) {
          dev.state.coilEnergized = on;
          dev.state.closed = on;
          contactsChanged = true;
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
          if (oldOut.q1 !== outp.q1 || oldOut.q2 !== outp.q2) {
            contactsChanged = true;
          }
          dev.state.plcOutputs = outp;
        }
      }
    }

    if (!contactsChanged) break;
  }

  // Final potential pass to ensure all terminal voltages reflect steady state
  executePass();

  // 3. Detect Short Circuits & Direct Phase-to-Neutral / Phase-to-Earth Contact
  // A short occurs if any Live node is also directly adjacent to a Neutral or Earth node via a wire
  for (const wire of wires) {
    const k1 = terminalKey(wire.fromDeviceId, wire.fromTerminalId);
    const k2 = terminalKey(wire.toDeviceId, wire.toTerminalId);

    const pot1 = nodePotentials[k1];
    const pot2 = nodePotentials[k2];

    const isDeadShort = 
      (pot1 === 'live' && (pot2 === 'neutral' || pot2 === 'earth')) ||
      (pot2 === 'live' && (pot1 === 'neutral' || pot1 === 'earth'));

    if (isDeadShort) {
      // Find mid point for spark
      const dev1 = devices.find(d => d.id === wire.fromDeviceId);
      const dev2 = devices.find(d => d.id === wire.toDeviceId);
      const sparkX = dev1 && dev2 ? (dev1.x + dev2.x) / 2 : 400;
      const sparkY = dev1 && dev2 ? (dev1.y + dev2.y) / 2 : 300;

      sparks.push({
        id: `spark_${Date.now()}_${Math.random()}`,
        x: sparkX,
        y: sparkY,
        severity: 'short_circuit',
        timestamp: Date.now(),
        message: `DEAD SHORT CIRCUIT: Phase directly bonded to ${pot2 === 'neutral' || pot1 === 'neutral' ? 'Neutral' : 'Earth'}!`
      });

      // Trip the closest upstream MCB
      const upstreamMcb = devices.find(d => (d.type === 'mcb_1p' || d.type === 'mcb_2p' || d.type === 'service_disconnect_2p') && d.state.closed);
      if (upstreamMcb) {
        trippedDevices.push(upstreamMcb.id);
        tripReasons[upstreamMcb.id] = 'Magnetic Instantaneous Trip (Short Circuit Fault Current > 1,500A)';
      }
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
      const u1Pot = nodePotentials[terminalKey(dev.id, 'u1')];
      const v1Pot = nodePotentials[terminalKey(dev.id, 'v1')];
      const w1Pot = nodePotentials[terminalKey(dev.id, 'w1')];
      // Powered if U1 is Live and either V1 or W1 has return/neutral or opposing phase
      const isRunning = u1Pot === 'live' && (v1Pot === 'neutral' || v1Pot === 'live' || w1Pot === 'neutral' || w1Pot === 'live');
      deviceEnergized[dev.id] = isRunning;
      dev.state.running = isRunning;
      if (isRunning) {
        totalWatts += dev.state.wattage || 2200;
      }
    } else if (dev.type === 'pilot_light_indicator') {
      const p1 = nodePotentials[terminalKey(dev.id, 'x1')];
      const p2 = nodePotentials[terminalKey(dev.id, 'x2')];
      const isLit = (p1 === 'live' && p2 === 'neutral') || (p2 === 'live' && p1 === 'neutral');
      deviceEnergized[dev.id] = isLit;
      dev.state.lit = isLit;
      if (isLit) {
        totalWatts += 5;
      }
    } else if (dev.type === 'contactor_3p') {
      if (dev.state.coilEnergized) {
        deviceEnergized[dev.id] = true;
        totalWatts += 15; // 15W holding power
      }
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
      traceLoadCurrent(terminalKey(dev.id, 'u1'), terminalKey(dev.id, 'v1'), w / gridVoltage);
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
    } else if (dev.type === 'contactor_3p' && dev.state.coilEnergized) {
      const a1Pot = nodePotentials[terminalKey(dev.id, 'a1')];
      const liveT = a1Pot === 'live' ? 'a1' : 'a2';
      const neutT = a1Pot === 'live' ? 'a2' : 'a1';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 15 / gridVoltage);
    } else if (dev.type === 'plc_micro_controller' && dev.state.plcPowered) {
      const plPot = nodePotentials[terminalKey(dev.id, 'p_l')];
      const liveT = plPot === 'live' ? 'p_l' : 'p_n';
      const neutT = plPot === 'live' ? 'p_n' : 'p_l';
      traceLoadCurrent(terminalKey(dev.id, liveT), terminalKey(dev.id, neutT), 15 / gridVoltage);
    }
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

  // 6. Thermal Overload Trip on Breakers
  for (const dev of devices) {
    if (dev.type === 'mcb_1p' || dev.type === 'mcb_2p' || dev.type === 'service_disconnect_2p') {
      const rated = dev.state.ratedAmps || 16;
      // If connected load exceeds 1.3x rated, trip thermally
      if (totalAmps > rated * 1.3 && dev.state.closed) {
        trippedDevices.push(dev.id);
        tripReasons[dev.id] = `Thermal Overload Trip: Load current (${totalAmps.toFixed(1)}A) exceeds breaker rating (${rated}A)`;
      }
    }
  }

  return {
    nodeVoltages,
    nodePotentials,
    deviceEnergized,
    wireCurrents,
    wireFlowDirections,
    wireVoltageDrops,
    wireVoltageDropPercents,
    totalWatts,
    totalAmps,
    sparks,
    trippedDevices,
    tripReasons
  };
}
