import { ElectricalDevice, ElectricalWire, CodeStandard } from '../types/electrical';
import { CodeViolation, ElectricalAnalysisReport } from '../types/codes';
import { getWireStandards, CONDUIT_FILL_STANDARDS } from '../data/standardsData';
import { SolvedCircuit } from './circuitSolver';
import { parsePhysicalLadder } from './ladderEngine';

/** Devices that live inside a motor control panel (panel wiring is not run in branch conduit) */
const PANEL_DEVICE_TYPES = new Set([
  'source_3phase_440v',
  'mcb_3p',
  'contactor_3p',
  'thermal_overload_relay',
  'control_transformer',
  'push_button_station',
  'push_button_fwd_rev',
  'push_button_estop',
  'pilot_light_indicator',
  'industrial_relay_dpdt',
  'plc_micro_controller',
]);

export function analyzeCodeCompliance(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  solved: SolvedCircuit,
  standard: CodeStandard = 'PEC',
  gridVoltage: number = 230
): ElectricalAnalysisReport {
  const violations: CodeViolation[] = [];
  const wireStandards = getWireStandards(standard);

  // 1. Check Wire Sizing & Overcurrent Protection (PEC 240.4(D) / IEC 60364-5-52)
  for (const wire of wires) {
    const fromDev = devices.find(d => d.id === wire.fromDeviceId);
    const toDev = devices.find(d => d.id === wire.toDeviceId);

    // Find protecting upstream breaker
    const breaker = [fromDev, toDev].find(d => d && (d.type === 'mcb_1p' || d.type === 'mcb_2p' || d.type === 'mcb_3p' || d.type === 'service_disconnect_2p' || d.type === 'royu_safety_breaker_2p'));
    const wireStd = wireStandards.find(s => s.name === wire.wireGauge) || wireStandards[0];

    if (breaker && wireStd) {
      const breakerAmps = breaker.state.ratedAmps || 16;
      if (breakerAmps > wireStd.maxBreakerAmps) {
        violations.push({
          id: `viol_ampacity_${wire.id}`,
          codeStandard: standard,
          severity: 'error',
          category: 'ampacity',
          articleRef: standard === 'PEC' ? 'PEC 2.40.1.4(D) / Table 3.10.2.6' : 'IEC 60364-5-52 Table 52',
          title: 'Conductor Protected by Oversized Circuit Breaker',
          message: `Wire gauge ${wire.wireGauge} has maximum permissible protection of ${wireStd.maxBreakerAmps}A, but is connected to a ${breakerAmps}A breaker (${breaker.name || breaker.id}).`,
          affectedDeviceId: breaker.id,
          affectedWireId: wire.id,
          recommendation: `Upgrade the wire to at least ${wireStandards.find(s => s.maxBreakerAmps >= breakerAmps)?.name || 'a larger gauge'} or downsize the circuit breaker to ${wireStd.maxBreakerAmps}A.`
        });
      }
    }
  }

  // 2. Check Voltage Drop (PEC 2.10.1.19 / IEC 60364-5-52)
  let maxBranchVd = 0;
  for (const wire of wires) {
    const vdPercent = solved.wireVoltageDropPercents[wire.id] || 0;
    if (vdPercent > maxBranchVd) {
      maxBranchVd = vdPercent;
    }

    if (vdPercent > 3.0) {
      violations.push({
        id: `viol_vd_${wire.id}`,
        codeStandard: standard,
        severity: vdPercent > 5.0 ? 'error' : 'warning',
        category: 'voltage_drop',
        articleRef: standard === 'PEC' ? 'PEC 2.10.1.19(FPN 4) & 2.15.1.2(A)(3)' : 'IEC 60364-5-52 Cl. 525',
        title: 'Excessive Branch Circuit Voltage Drop',
        message: `Voltage drop along wire is ${vdPercent.toFixed(2)}% (limit is 3.0% for branch circuits, 5.0% total feeder + branch).`,
        affectedWireId: wire.id,
        recommendation: `Increase wire cross-sectional area or shorten the run distance to minimize $I^2R$ power loss.`
      });
    }
  }

  // 3. Grounding & Bonding Verification (PEC 2.50 / IEC 60364-4-41)
  // Check sockets
  for (const dev of devices) {
    if (dev.type === 'socket_duplex' || dev.type === 'socket_schuko' || dev.type === 'royu_modular_combo_plate') {
      const gndWire = wires.find(w => 
        (w.fromDeviceId === dev.id && (w.fromTerminalId === 'ground' || w.fromTerminalId === 'earth' || w.fromTerminalId === 'rec_pe')) || 
        (w.toDeviceId === dev.id && (w.toTerminalId === 'ground' || w.toTerminalId === 'earth' || w.toTerminalId === 'rec_pe'))
      );
      if (!gndWire) {
        violations.push({
          id: `viol_gnd_${dev.id}`,
          codeStandard: standard,
          severity: 'warning',
          category: 'grounding',
          articleRef: standard === 'PEC' ? 'PEC 2.50.6.13 & 4.6.1.4(B)' : 'IEC 60364-4-41 Cl. 411.3',
          title: 'Unconnected Equipment Grounding Conductor (EGC)',
          message: `Receptacle (${dev.name || dev.id}) is operating ungrounded without an Equipment Grounding Conductor connected to its ground screw.`,
          affectedDeviceId: dev.id,
          recommendation: 'Connect a green/green-yellow grounding conductor from this receptacle ground terminal to the distribution panel PE busbar.'
        });
      }

      // Check for Daisy-Chain feed-through on neutrals (PEC 3.0.1.13(B) Educational Guidance)
      const hasNeutralFeedThrough = wires.some(w => 
        (w.fromDeviceId === dev.id && w.fromTerminalId === 'neutral_out') ||
        (w.toDeviceId === dev.id && w.toTerminalId === 'neutral_out')
      );
      if (hasNeutralFeedThrough && standard === 'PEC') {
        violations.push({
          id: `viol_daisy_${dev.id}`,
          codeStandard: 'PEC',
          severity: 'info',
          category: 'polarity',
          articleRef: 'PEC 2017 Art. 3.0.1.13(B)',
          title: 'Receptacle Neutral Feed-Through (Daisy-Chain Topology B)',
          message: `Receptacle (${dev.name || dev.id}) bridges neutral downstream via its terminal screws. If this device is pulled for servicing or a screw loosens, downstream loads will lose return continuity.`,
          affectedDeviceId: dev.id,
          recommendation: 'Consider System A (Pigtail Splice with wire nuts in an orange octagonal box) so downstream continuity does not depend on this receptacle body.'
        });
      }
    } else if (dev.type === 'appliance_water_heater' || dev.type === 'appliance_ac' || dev.type === 'motor_3phase_dol' || dev.type === 'motor_ac_industrial' || dev.type === 'royu_safety_breaker_2p') {
      const gndWire = wires.find(w => 
        (w.fromDeviceId === dev.id && (w.fromTerminalId === 'ground' || w.fromTerminalId === 'pe')) || 
        (w.toDeviceId === dev.id && (w.toTerminalId === 'ground' || w.toTerminalId === 'pe'))
      );
      if (!gndWire) {
        violations.push({
          id: `viol_chassis_gnd_${dev.id}`,
          codeStandard: standard,
          severity: 'error',
          category: 'shock_hazard',
          hazardLevel: 'fatal_electrocution',
          articleRef: standard === 'PEC' ? 'PEC 2.50.6.1 & 4.40.6.1' : 'IEC 60364-4-41 Cl. 411.3',
          title: `⚡ DEADLY TOUCH HAZARD: ${dev.name} Chassis Ungrounded`,
          message: `${dev.name} metal casing has no Equipment Grounding Conductor (EGC). In the event of internal insulation degradation or wet splash, touch voltage will reach lethal ${gridVoltage}V, causing fatal electrocution upon human touch!`,
          affectedDeviceId: dev.id,
          recommendation: 'Run an insulated green/green-yellow grounding conductor directly from the appliance ground terminal to the panel PE earth busbar.'
        });
      }
    }
  }

  // 4. Polarity & Switched Neutral Electrocution Hazards (PEC 4.4.1.2 & 2.0.1.10)
  // Check for Switched Neutral on single-pole switches
  for (const sw of devices) {
    if (sw.type === 'switch_1gang' || sw.type === 'royu_modular_combo_plate') {
      const termL = sw.type === 'royu_modular_combo_plate' ? 'sw_in' : 'l_in';
      const termSw = sw.type === 'royu_modular_combo_plate' ? 'sw_out' : 'sw_out';
      const inPot = solved.nodePotentials[`${sw.id}:${termL}`];
      const outPot = solved.nodePotentials[`${sw.id}:${termSw}`];

      // If switch is connected to Neutral
      const isSwitchingNeutral = inPot === 'neutral' || outPot === 'neutral' || wires.some(w => 
        ((w.fromDeviceId === sw.id && w.fromTerminalId === termL) || (w.toDeviceId === sw.id && w.toTerminalId === termL)) &&
        (w.conductorRole === 'return_neutral' || w.color === '#0f172a' || w.color === '#2563eb')
      );

      if (isSwitchingNeutral) {
        violations.push({
          id: `viol_switched_neutral_${sw.id}`,
          codeStandard: standard,
          severity: 'error',
          category: 'shock_hazard',
          hazardLevel: 'fatal_electrocution',
          articleRef: standard === 'PEC' ? 'PEC 2017 Art. 4.4.1.2 & 4.10.10.2' : 'IEC 60364-4-46 Cl. 464.1',
          title: '⚡ FATAL ELECTROCUTION HAZARD: Switched Neutral',
          message: `Single-pole switch (${sw.name || sw.id}) is interrupting the Neutral conductor instead of Phase! When switched OFF, the lamp socket threaded screw shell remains continuously energized at ${gridVoltage}V live, creating a fatal shock hazard during bulb replacement.`,
          affectedDeviceId: sw.id,
          recommendation: 'Interrupt the ungrounded Phase (Live) conductor with the switch. Wire the Neutral conductor continuously directly to the load.'
        });
      }
    } else if (sw.type === 'socket_duplex' || sw.type === 'socket_schuko') {
      // Check for Reversed Polarity
      const lPot = solved.nodePotentials[`${sw.id}:line`] || solved.nodePotentials[`${sw.id}:l_in`];
      const nPot = solved.nodePotentials[`${sw.id}:neutral`] || solved.nodePotentials[`${sw.id}:n_in`];

      if (lPot === 'neutral' && nPot === 'live') {
        violations.push({
          id: `viol_reversed_polarity_${sw.id}`,
          codeStandard: standard,
          severity: 'error',
          category: 'shock_hazard',
          hazardLevel: 'fatal_electrocution',
          articleRef: standard === 'PEC' ? 'PEC 2017 Art. 2.0.1.10 & 4.6.1.2' : 'IEC 60364-5-53 Cl. 536.2',
          title: '⚡ REVERSED POLARITY: Hot & Neutral Inverted on Receptacle',
          message: `Receptacle (${sw.name || sw.id}) has Phase connected to the Neutral terminal and Neutral connected to the Hot terminal. Internal appliance single-pole power switches will be on the neutral side, leaving appliance internals hot at ${gridVoltage}V even when turned off!`,
          affectedDeviceId: sw.id,
          recommendation: 'Swap the Line and Neutral conductors to ensure the wide slot / silver terminal is connected to Neutral.'
        });
      }
    }
  }

  // Check for Dead Short Circuit from solver
  if (solved.sparks.length > 0) {
    for (const spark of solved.sparks) {
      const isArc = spark.severity === 'arc_flash';
      violations.push({
        id: `viol_dead_short_${spark.id}`,
        codeStandard: standard,
        severity: 'error',
        category: 'shock_hazard',
        hazardLevel: 'fire_risk',
        articleRef: standard === 'PEC' ? 'PEC 2017 Art. 2.40.1.1 & 1.10.1.9' : 'IEC 60364-4-43',
        title: isArc ? '💥 CRITICAL: Phase-to-Phase Arc Flash Fault' : '💥 CRITICAL: Direct Dead Short Circuit Fault Active',
        message: spark.message,
        recommendation: isArc
          ? 'Wire each reversing contactor coil through the other contactor\'s 21-22 NC auxiliary contact (electrical interlock) and release any forced test plungers before re-arming the 3P breaker.'
          : 'Disconnect the direct Phase-to-Neutral or Phase-to-Earth jumper before resetting the upstream circuit breaker.'
      });
    }
  }

  // 4b. Motor control: overload protection & reversing interlocks (PEC 4.30 / IEC 60204-1)
  const motors = devices.filter(d => d.type === 'motor_ac_industrial');
  const contactors = devices.filter(d => d.type === 'contactor_3p');
  const hasTor = devices.some(d => d.type === 'thermal_overload_relay');
  if (motors.length > 0 && contactors.length > 0 && !hasTor) {
    violations.push({
      id: 'viol_motor_overload_missing',
      codeStandard: standard,
      severity: 'warning',
      category: 'ampacity',
      articleRef: standard === 'PEC' ? 'PEC 2017 Art. 4.30.3.32 (Motor Overload Protection)' : 'IEC 60204-1 Cl. 7.3',
      title: 'Motor Running Overload Protection Missing',
      message: 'A contactor-controlled motor has no thermal overload relay. A locked rotor or single-phasing condition will overheat the windings before the MCB responds.',
      affectedDeviceId: motors[0].id,
      recommendation: 'Install a thermal overload relay (TOR) after the contactor, set its dial to the motor FLA and wire its 95-96 NC contact in series with the coil circuit.'
    });
  }
  for (const tor of devices.filter(d => d.type === 'thermal_overload_relay')) {
    const ncWired = wires.some(w =>
      (w.fromDeviceId === tor.id && (w.fromTerminalId === 'nc_95' || w.fromTerminalId === 'nc_96')) ||
      (w.toDeviceId === tor.id && (w.toTerminalId === 'nc_95' || w.toTerminalId === 'nc_96'))
    );
    const mainWired = wires.some(w => w.fromDeviceId === tor.id || w.toDeviceId === tor.id);
    if (mainWired && !ncWired) {
      violations.push({
        id: `viol_tor_nc_${tor.id}`,
        codeStandard: standard,
        severity: 'error',
        category: 'ampacity',
        articleRef: standard === 'PEC' ? 'PEC 2017 Art. 4.30.3.32' : 'IEC 60947-4-1',
        title: 'Overload Relay 95-96 Not in the Control Circuit',
        message: `${tor.name} carries motor current but its 95-96 trip contact is not wired — a thermal trip will never drop out the contactor.`,
        affectedDeviceId: tor.id,
        recommendation: 'Wire the control supply X1 → 95, then 96 → STOP button so an overload opens the coil circuit.'
      });
    }
  }

  // Reversing pairs: two contactors whose load terminals land on the same downstream device
  const loadSide = (c: ElectricalDevice) => {
    const ids = new Set<string>();
    for (const w of wires) {
      if (w.fromDeviceId === c.id && ['t1', 't2', 't3'].includes(w.fromTerminalId)) ids.add(w.toDeviceId);
      if (w.toDeviceId === c.id && ['t1', 't2', 't3'].includes(w.toTerminalId)) ids.add(w.fromDeviceId);
    }
    return ids;
  };
  if (contactors.length >= 2) {
    const phys = parsePhysicalLadder(devices, wires);
    for (let i = 0; i < contactors.length; i++) {
      for (let j = i + 1; j < contactors.length; j++) {
        const a = contactors[i];
        const b = contactors[j];
        const la = loadSide(a);
        const shared = [...loadSide(b)].some(id => la.has(id));
        if (!shared) continue;
        const interlocked = (coil: ElectricalDevice, other: ElectricalDevice) => {
          const rung = phys.rungs.find(r => r.load.deviceId === coil.id && r.load.kind === 'COIL');
          if (!rung) return true; // coil not wired yet — nothing to check
          return rung.prePaths
            .map((pre, k) => [...pre, ...(rung.postPaths[k] || [])])
            .every(path => path.some(e => e.deviceId === other.id && e.contactKey === 'aux_nc'));
        };
        if (!interlocked(a, b) || !interlocked(b, a)) {
          violations.push({
            id: `viol_interlock_${a.id}_${b.id}`,
            codeStandard: standard,
            severity: 'error',
            category: 'shock_hazard',
            hazardLevel: 'fire_risk',
            articleRef: standard === 'PEC' ? 'PEC 2017 Art. 4.30.7 / IEC 60204-1 Cl. 9.3.4' : 'IEC 60204-1 Cl. 9.3.4',
            title: '⚠ Reversing Starter Without Electrical Interlock',
            message: `${a.state.tag || a.name} and ${b.state.tag || b.name} feed the same motor circuit, but their coils are not cross-interlocked through each other's 21-22 NC contacts. Pressing FWD and REV together bolts two phases together.`,
            affectedDeviceId: !interlocked(a, b) ? a.id : b.id,
            recommendation: `Wire ${b.state.tag || 'KM2'} 21-22 in series before ${a.state.tag || 'KM1'} A1, and ${a.state.tag || 'KM1'} 21-22 in series before ${b.state.tag || 'KM2'} A1.`
          });
        }
      }
    }
  }

  // 5. RCD Protection on Wet Areas & Sockets (PEC 2.10.1.8 / IEC 60364-4-41)
  const hasRcd = devices.some(d => d.type === 'rcd_2p');
  const hasSocketsOrWetLoads = devices.some(d => d.type === 'socket_duplex' || d.type === 'socket_schuko' || d.type === 'appliance_water_heater' || d.type === 'appliance_ac');
  if (hasSocketsOrWetLoads && !hasRcd) {
    violations.push({
      id: 'viol_missing_rcd',
      codeStandard: standard,
      severity: 'warning',
      category: 'shock_hazard',
      hazardLevel: 'touch_shock',
      articleRef: standard === 'PEC' ? 'PEC 2.10.1.8 (GFCI Protection)' : 'IEC 60364-4-41 Cl. 411.3.3',
      title: 'Missing RCD / GFCI Protection for Sockets and Wet Areas',
      message: 'Installation contains socket receptacles or high-power appliances without a 30mA Residual Current Device (RCD/GFCI). Human ventricular fibrillation can occur at just 50mA.',
      recommendation: 'Install a 30mA RCD / RCBO upstream of branch circuits feeding receptacles and damp locations to protect against fatal electric shock.'
    });
  }

  // 5. Conduit Fill Calculation (field wiring only — conductors between panel devices run in wireways)
  const panelIds = new Set(devices.filter(d => PANEL_DEVICE_TYPES.has(d.type)).map(d => d.id));
  const totalConductors = wires.filter(w => !(panelIds.has(w.fromDeviceId) && panelIds.has(w.toDeviceId))).length;
  const sampleConduit = CONDUIT_FILL_STANDARDS[1]; // 3/4" (25mm)
  const approxWireArea = wireStandards[0].crossSectionMm2 * 3.5; // with insulation
  const totalWireArea = totalConductors * approxWireArea;
  const conduitFillPercent = totalWireArea > 0 ? (totalWireArea / sampleConduit.internalAreaMm2) * 100 : 0;

  if (conduitFillPercent > 40.0 && totalConductors >= 3) {
    violations.push({
      id: 'viol_conduit_fill',
      codeStandard: standard,
      severity: 'warning',
      category: 'conduit_fill',
      articleRef: standard === 'PEC' ? 'PEC Chapter 9, Table 1 (Conduit Fill)' : 'IEC 60364-5-52 Annex A',
      title: 'Conduit Fill Limit Exceeded (>40%)',
      message: `Calculated conduit fill is ${conduitFillPercent.toFixed(1)}% in standard 3/4" EMT/PVC (maximum allowable fill for 3+ conductors is 40%).`,
      recommendation: 'Upsize to 1" (32mm) conduit or divide runs into separate conduit sleeves to prevent cable overheating.'
    });
  }

  return {
    totalConnectedWatts: solved.totalWatts,
    totalCurrentAmps: solved.totalAmps,
    maxBranchVoltageDropPercent: maxBranchVd,
    violations,
    conduitFillPercent,
    isCompliant: violations.filter(v => v.severity === 'error').length === 0,
    activeStandards: standard
  };
}
