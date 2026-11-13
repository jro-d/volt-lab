import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ElectricalProject, ElectricalDevice, ElectricalWire, CodeStandard, DeviceType, WiringMode } from './types/electrical';
import { CodeViolation } from './types/codes';
import { SparkEvent } from './types/simulation';
import { LAB_LESSONS, LabLesson, createBlankProject } from './data/labTemplates';
import { createDeviceFromCatalog } from './data/defaultComponents';
import { COLOR_STANDARDS, getDefaultWireGauge } from './data/standardsData';
import { solveCircuit, createDeEnergizedSolution, SolvedCircuit } from './core/circuitSolver';
import { analyzeCodeCompliance } from './core/codeCompliance';
import { TopNavBar } from './components/layout/TopNavBar';
import { ComponentDrawer } from './components/layout/ComponentDrawer';
import { ConductorToolDock } from './components/layout/ConductorToolDock';
import { StatusBar, SnapSize } from './components/layout/StatusBar';
import { CodeInspectorHUD } from './components/layout/CodeInspectorHUD';
import { DevicePropertiesPanel } from './components/layout/DevicePropertiesPanel';
import { LabSelectorModal } from './components/layout/LabSelectorModal';
import { WiringCanvas } from './components/canvas/WiringCanvas';
import { SchematicCanvas } from './components/canvas/SchematicCanvas';
import { LadderCanvas } from './components/canvas/LadderCanvas';
import { LadderRung } from './types/ladder';
import { sound } from './utils/soundFx';
import { resetTransientState, resetTripState, toEditModeDevices } from './utils/deviceState';
import { Trash2, Lock } from 'lucide-react';

const LOCKED_MESSAGE = 'Stop simulation (■) to modify wiring';

export type ViewMode = 'realistic' | 'split' | 'ladder' | 'schematic';

export const App: React.FC = () => {
  // Start with clean blank canvas as requested by user
  const [project, setProject] = useState<ElectricalProject>(() => {
    return createBlankProject('PEC');
  });

  const [standard, setStandard] = useState<CodeStandard>(project.codeStandard);
  const [viewMode, setViewMode] = useState<ViewMode>('realistic');
  // Right-hand pane of Dual View: control ladder or single-line diagram
  const [dualPane, setDualPane] = useState<'ladder' | 'sld'>('ladder');
  // Physical device glow-linked from a hovered / clicked ladder symbol
  const [hoverDeviceId, setHoverDeviceId] = useState<string | null>(null);
  const [flashDeviceId, setFlashDeviceId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashDevice = useCallback((id: string | null) => {
    setFlashDeviceId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (id) flashTimer.current = setTimeout(() => setFlashDeviceId(null), 1800);
  }, []);

  // Edit Mode (de-energized, safe wiring) vs Simulation Mode (grid energized)
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [dmmMode, setDmmMode] = useState<boolean>(false);
  const [dmmProbeA, setDmmProbeA] = useState<{ deviceId: string; terminalId: string } | null>(null);
  const [dmmReadout, setDmmReadout] = useState<{
    mode: 'voltage' | 'clamp' | 'idle';
    primary: string;
    secondary?: string;
    label?: string;
  } | null>(null);

  // Floating panels & CAD settings
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(true);
  const [isHudOpen, setIsHudOpen] = useState<boolean>(true);
  const [snapSize, setSnapSize] = useState<SnapSize>(10);

  // Transient status notice (toast)
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  // Active wire drawing tool state
  const [wiringMode, setWiringMode] = useState<WiringMode>('single');
  const [activeWireColor, setActiveWireColor] = useState<string>(COLOR_STANDARDS.PEC.phase1);
  const [activeWireGauge, setActiveWireGauge] = useState<string>(getDefaultWireGauge('PEC', 'lighting'));
  const [activeWireLength, setActiveWireLength] = useState<number>(5);

  // Selection state (selectedGroupIds = Shift+click multi-selection, first entry is the alignment anchor)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Select a device (plain click) or toggle it in the multi-selection (Shift+click)
  const handleSelectDevice = (id: string | null, additive: boolean = false) => {
    if (id === null) {
      setSelectedDeviceId(null);
      setSelectedGroupIds([]);
      return;
    }
    if (!additive) {
      setSelectedDeviceId(id);
      setSelectedGroupIds([id]);
      return;
    }
    const base = selectedGroupIds.length > 0 ? selectedGroupIds : selectedDeviceId ? [selectedDeviceId] : [];
    if (base.includes(id)) {
      const remaining = base.filter(x => x !== id);
      setSelectedGroupIds(remaining);
      setSelectedDeviceId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    } else {
      setSelectedGroupIds([...base, id]);
      setSelectedDeviceId(id);
    }
  };

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState<ElectricalProject[]>([]);
  const [redoStack, setRedoStack] = useState<ElectricalProject[]>([]);

  // Clipboard for Copy & Paste
  const [clipboardDevice, setClipboardDevice] = useState<ElectricalDevice | null>(null);

  // Returns true (and toasts) when the action must be blocked because the grid is energized
  const isEditBlocked = (): boolean => {
    if (!isSimulating) return false;
    showNotice(LOCKED_MESSAGE);
    return true;
  };

  // Helper to record an undo snapshot before state modifications
  const pushUndoSnapshot = (currentProj: ElectricalProject = project) => {
    setUndoStack(prev => [...prev.slice(-25), JSON.parse(JSON.stringify(currentProj))]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isEditBlocked()) return;
    sound.playClick();
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(project))]);
    setProject({ ...previous, devices: toEditModeDevices(previous.devices) });
    setSelectedDeviceId(null);
    setSelectedGroupIds([]);
    setSelectedWireId(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isEditBlocked()) return;
    sound.playClick();
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(project))]);
    setProject({ ...next, devices: toEditModeDevices(next.devices) });
    setSelectedDeviceId(null);
    setSelectedGroupIds([]);
    setSelectedWireId(null);
  };

  // Lab modal state
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);

  // File input ref for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // When standard switches, update colors & wire gauges
  const handleStandardChange = (newStd: CodeStandard) => {
    setStandard(newStd);
    setProject(prev => {
      // A 3-phase feeder sets its own line voltage / frequency — keep them when switching code book
      const feeder = prev.devices.find(d => d.type === 'source_3phase_440v');
      return {
        ...prev,
        codeStandard: newStd,
        gridVoltage: feeder ? feeder.state.lineVoltage || 440 : 230,
        gridFrequency: feeder ? feeder.state.frequency || 60 : newStd === 'PEC' ? 60 : 50,
      };
    });
    setActiveWireColor(COLOR_STANDARDS[newStd].phase1);
    setActiveWireGauge(getDefaultWireGauge(newStd, 'lighting'));
  };

  // ── Circuit solving ──────────────────────────────────────────────────────────────────────
  // Simulation Mode: solve the real devices (the solver writes derived state such as lit / running
  // back onto them so the renderers animate).
  // Edit Mode: the grid is de-energized. We still need potentials & loads for the *static* audit
  // (switched neutral, polarity, ampacity, ...), so we solve a throw-away clone and never let it
  // reach the canvases.
  const analysis = useMemo(() => {
    const devicesForAnalysis: ElectricalDevice[] = isSimulating
      ? project.devices
      : (JSON.parse(JSON.stringify(project.devices)) as ElectricalDevice[]);
    const result = solveCircuit(devicesForAnalysis, project.wires, standard, project.gridVoltage);
    return { devicesForAnalysis, result };
  }, [isSimulating, project.devices, project.wires, standard, project.gridVoltage]);

  // Arc-flash sparks are short lived once the breaker has actually opened, so keep them on screen briefly
  const [sparkFlash, setSparkFlash] = useState<SparkEvent[]>([]);
  const sparkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solved: SolvedCircuit = useMemo(() => {
    if (!isSimulating) return createDeEnergizedSolution(project.wires);

    const live = analysis.result;
    const persistedTrips = project.devices.filter(d => d.state.tripped);
    const tripReasons = { ...live.tripReasons };
    persistedTrips.forEach(d => {
      if (!tripReasons[d.id]) tripReasons[d.id] = d.state.tripReason || 'Breaker Tripped';
    });
    return {
      ...live,
      trippedDevices: Array.from(new Set([...live.trippedDevices, ...persistedTrips.map(d => d.id)])),
      tripReasons,
      sparks: live.sparks.length > 0 ? live.sparks : sparkFlash,
    };
  }, [isSimulating, analysis, project.wires, project.devices, sparkFlash]);

  // Run Live Code Compliance Analysis (static checks run in both modes)
  const report = useMemo(() => {
    return analyzeCodeCompliance(analysis.devicesForAnalysis, project.wires, analysis.result, standard, project.gridVoltage);
  }, [analysis, project.wires, standard, project.gridVoltage]);

  // Digital Multimeter / Clamp Meter handlers
  const handleDmmClampWire = (wireId: string) => {
    const amps = solved.wireCurrents[wireId] || 0;
    const vd = solved.wireVoltageDropPercents[wireId] || 0;
    const wire = project.wires.find((w) => w.id === wireId);
    const freq = standard === 'PEC' ? '60.0 Hz' : '50.0 Hz';
    const watts = amps * project.gridVoltage;
    setDmmProbeA(null);
    setDmmReadout({
      mode: 'clamp',
      label: wire?.label ? `CLAMP: ${wire.label}` : `CLAMP: ${wire?.wireGauge || 'Conductor'}`,
      primary: `${amps.toFixed(2)} A AC`,
      secondary: `${watts.toFixed(0)} W  •  ${freq}  •  ΔV ${vd.toFixed(2)}%`,
    });
  };

  const handleDmmProbeTerminal = (deviceId: string, terminalId: string) => {
    const keyB = `${deviceId}:${terminalId}`;
    const devB = project.devices.find((d) => d.id === deviceId);
    const termB = devB?.terminals.find((t) => t.id === terminalId);
    const tagB = termB?.label || terminalId;

    if (!dmmProbeA) {
      setDmmProbeA({ deviceId, terminalId });
      setDmmReadout({
        mode: 'voltage',
        label: `PROBE (+) on ${tagB}`,
        primary: 'SELECT (−)',
        secondary: 'Click second terminal to read RMS Voltage',
      });
      return;
    }

    const keyA = `${dmmProbeA.deviceId}:${dmmProbeA.terminalId}`;
    const devA = project.devices.find((d) => d.id === dmmProbeA.deviceId);
    const termA = devA?.terminals.find((t) => t.id === dmmProbeA.terminalId);
    const tagA = termA?.label || dmmProbeA.terminalId;

    const vA = solved.nodeVoltages[keyA] || 0;
    const vB = solved.nodeVoltages[keyB] || 0;
    const pA = solved.nodePotentials[keyA] || 'none';
    const pB = solved.nodePotentials[keyB] || 'none';
    const phA = solved.nodePhases[keyA];
    const phB = solved.nodePhases[keyB];

    let rmsVolts = 0;
    if (keyA !== keyB) {
      if (pA === 'live' && pB === 'live') {
        if (phA && phB && phA !== phB) {
          const base = Math.max(vA, vB, project.gridVoltage);
          rmsVolts = Math.round(base * Math.sqrt(3));
        } else {
          rmsVolts = 0;
        }
      } else if ((pA === 'live' && (pB === 'neutral' || pB === 'earth')) || (pB === 'live' && (pA === 'neutral' || pA === 'earth'))) {
        rmsVolts = Math.max(vA, vB);
      }
    }

    const freq = standard === 'PEC' ? '60.0 Hz' : '50.0 Hz';
    setDmmProbeA(null);
    setDmmReadout({
      mode: 'voltage',
      label: `PROBE: ${tagA} ↔ ${tagB}`,
      primary: `${rmsVolts.toFixed(1)} V AC`,
      secondary: `${pA.toUpperCase()} (${phA || '-'}) ↔ ${pB.toUpperCase()} (${phB || '-'}) • ${freq}`,
    });
  };

  // On-Delay Timer Relay (KT1) & live Panel Meter telemetry tick while simulating
  React.useEffect(() => {
    if (!isSimulating) return;
    const hasTimers = project.devices.some((d) => d.type === 'timer_relay');
    if (!hasTimers) return;
    const id = window.setInterval(() => {
      setProject((prev) => {
        let changed = false;
        const devices = prev.devices.map((d) => {
          if (d.type !== 'timer_relay') return d;
          const isCoilHot = !!solved.deviceEnergized[d.id];
          const delaySec = typeof d.state.delaySec === 'number' ? d.state.delaySec : 5;
          const prevElapsed = typeof d.state.elapsedSec === 'number' ? d.state.elapsedSec : 0;
          const prevTimedOut = !!d.state.timedOut;
          const prevEnergized = !!d.state.energized;

          if (!isCoilHot) {
            if (!prevEnergized && prevElapsed === 0 && !prevTimedOut) return d;
            changed = true;
            return { ...d, state: { ...d.state, energized: false, elapsedSec: 0, timedOut: false } };
          }
          const nextElapsed = Math.min(delaySec, Number((prevElapsed + 0.5).toFixed(1)));
          const nextTimedOut = nextElapsed >= delaySec;
          if (prevEnergized && prevElapsed === nextElapsed && prevTimedOut === nextTimedOut) return d;
          changed = true;
          return { ...d, state: { ...d.state, energized: true, elapsedSec: nextElapsed, timedOut: nextTimedOut } };
        });
        return changed ? { ...prev, devices } : prev;
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [isSimulating, project.devices, solved.deviceEnergized]);

  const trippedCount = project.devices.filter(d => d.state.tripped).length;

  // Persist protective-device operation: a tripped breaker / RCD really opens (and stays open until re-armed)
  useEffect(() => {
    if (!isSimulating || analysis.result.trippedDevices.length === 0) return;
    const tripIds = analysis.result.trippedDevices;
    const reasons = analysis.result.tripReasons;
    sound.playTripPop();
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d =>
        tripIds.includes(d.id)
          ? { ...d, state: { ...d.state, tripped: true, closed: false, tripReason: reasons[d.id] } }
          : d
      ),
    }));
  }, [isSimulating, analysis]);

  // Arc flash: audio + short-lived visual
  useEffect(() => {
    if (!isSimulating) {
      setSparkFlash([]);
      return;
    }
    if (analysis.result.sparks.length > 0) {
      sound.playSparkZap();
      setSparkFlash(analysis.result.sparks);
      if (sparkTimer.current) clearTimeout(sparkTimer.current);
      sparkTimer.current = setTimeout(() => setSparkFlash([]), 3000);
    }
  }, [isSimulating, analysis]);
  useEffect(() => () => {
    if (sparkTimer.current) clearTimeout(sparkTimer.current);
  }, []);

  // Start / stop simulation
  const handleToggleSimulation = () => {
    if (!isSimulating) {
      sound.playBreakerSnap();
      setSelectedWireId(null);
      setIsSimulating(true);
      showNotice(`Grid energized — ${project.gridVoltage}V ${project.gridFrequency}Hz`);
    } else {
      sound.playClick();
      setIsSimulating(false);
      setSparkFlash([]);
      // Back to safe Edit Mode: de-energize visuals and re-arm any tripped protection
      setProject(prev => ({ ...prev, devices: toEditModeDevices(prev.devices) }));
      showNotice('Edit Mode — grid de-energized');
    }
  };

  // Connect terminals with support for paired 2-wire (Live + Neutral Return) & 3-wire runs
  const handleConnectWire = (
    fromDevId: string, 
    fromTermId: string, 
    toDevId: string, 
    toTermId: string,
    mode: WiringMode = wiringMode
  ) => {
    if (isEditBlocked()) return;
    const fromDev = project.devices.find(d => d.id === fromDevId);
    const toDev = project.devices.find(d => d.id === toDevId);
    if (!fromDev || !toDev) return;

    pushUndoSnapshot();
    sound.playSwitchClick();

    const newWires: ElectricalWire[] = [];
    const bundleId = `bundle_${Date.now()}`;

    // Primary wire (the clicked terminals)
    const primaryWire: ElectricalWire = {
      id: `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fromDeviceId: fromDevId,
      fromTerminalId: fromTermId,
      toDeviceId: toDevId,
      toTerminalId: toTermId,
      wireGauge: activeWireGauge,
      color: activeWireColor,
      lengthMeters: activeWireLength,
      cableBundleId: bundleId,
      conductorRole: 'feed_live'
    };
    newWires.push(primaryWire);

    // If Paired 2-Wire Cable Mode (Live + Neutral Return)
    if (mode === 'dual_ln' || mode === 'triple_lnpe') {
      // Find matching Neutral terminals on both devices
      const fromNeutralTerm = fromDev.terminals.find(t => t.type === 'neutral' || t.id.includes('n'));
      const toNeutralTerm = toDev.terminals.find(t => t.type === 'neutral' || t.id.includes('n'));

      if (fromNeutralTerm && toNeutralTerm && (fromNeutralTerm.id !== fromTermId || toNeutralTerm.id !== toTermId)) {
        newWires.push({
          id: `w_${Date.now()}_n_${Math.floor(Math.random() * 1000)}`,
          fromDeviceId: fromDevId,
          fromTerminalId: fromNeutralTerm.id,
          toDeviceId: toDevId,
          toTerminalId: toNeutralTerm.id,
          wireGauge: activeWireGauge,
          color: COLOR_STANDARDS[standard].neutral,
          lengthMeters: activeWireLength,
          cableBundleId: bundleId,
          conductorRole: 'return_neutral'
        });
      }
    }

    // If 3-Wire Cable Mode (+ Earth Ground)
    if (mode === 'triple_lnpe') {
      const fromEarthTerm = fromDev.terminals.find(t => t.type === 'earth' || t.id.includes('pe') || t.id === 'ground');
      const toEarthTerm = toDev.terminals.find(t => t.type === 'earth' || t.id.includes('pe') || t.id === 'ground');

      if (fromEarthTerm && toEarthTerm && (fromEarthTerm.id !== fromTermId || toEarthTerm.id !== toTermId)) {
        newWires.push({
          id: `w_${Date.now()}_pe_${Math.floor(Math.random() * 1000)}`,
          fromDeviceId: fromDevId,
          fromTerminalId: fromEarthTerm.id,
          toDeviceId: toDevId,
          toTerminalId: toEarthTerm.id,
          wireGauge: activeWireGauge,
          color: COLOR_STANDARDS[standard].earth,
          lengthMeters: activeWireLength,
          cableBundleId: bundleId,
          conductorRole: 'earth_ground'
        });
      }
    }

    // Filter out wires that already exist
    const nonDuplicates = newWires.filter(nw => 
      !project.wires.some(w => 
        (w.fromDeviceId === nw.fromDeviceId && w.fromTerminalId === nw.fromTerminalId && w.toDeviceId === nw.toDeviceId && w.toTerminalId === nw.toTerminalId) ||
        (w.fromDeviceId === nw.toDeviceId && w.fromTerminalId === nw.toTerminalId && w.toDeviceId === nw.fromDeviceId && w.toTerminalId === nw.fromTerminalId)
      )
    );

    if (nonDuplicates.length > 0) {
      setProject(prev => ({
        ...prev,
        wires: [...prev.wires, ...nonDuplicates]
      }));
    }
  };

  // Add new device from catalog (click)
  const handleAddComponent = (type: DeviceType) => {
    if (isEditBlocked()) return;
    pushUndoSnapshot();
    const newDev = createDeviceFromCatalog(type, 380 + Math.random() * 60, 240 + Math.random() * 60);
    sound.playSwitchClick();
    setProject(prev => ({
      ...prev,
      devices: [...prev.devices, newDev]
    }));
    handleSelectDevice(newDev.id);
  };

  // Add new device dropped onto canvas (drag-and-drop)
  const handleDropDevice = (type: DeviceType, x: number, y: number) => {
    if (isEditBlocked()) return;
    pushUndoSnapshot();
    const newDev = createDeviceFromCatalog(type, Math.max(10, x), Math.max(10, y));
    sound.playSwitchClick();
    setProject(prev => ({
      ...prev,
      devices: [...prev.devices, newDev]
    }));
    handleSelectDevice(newDev.id);
  };

  // Rotate device by 90 degrees clockwise
  const handleRotateDevice = (device: ElectricalDevice) => {
    if (isEditBlocked()) return;
    pushUndoSnapshot();
    sound.playSwitchClick();
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => {
        if (d.id !== device.id) return d;
        const currentRot = d.rotation || 0;
        const nextRot = (currentRot + 90) % 360;
        return { ...d, rotation: nextRot };
      })
    }));
  };

  // Duplicate a device
  const handleDuplicateDevice = (device: ElectricalDevice) => {
    if (isEditBlocked()) return;
    pushUndoSnapshot();
    sound.playSwitchClick();
    const newId = `${device.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const cloned: ElectricalDevice = {
      ...JSON.parse(JSON.stringify(device)),
      id: newId,
      name: `${device.name} (Copy)`,
      x: device.x + 40,
      y: device.y + 40,
    };
    // A pasted copy starts unlocked and in its pristine (non-energized) state
    cloned.state = { ...cloned.state, locked: false };
    setProject(prev => ({
      ...prev,
      devices: [...prev.devices, cloned]
    }));
    handleSelectDevice(newId);
  };

  // Move devices & synchronize attached wire waypoints (pure helper so it can be applied to several devices at once)
  const applyDeviceMoves = (
    prev: ElectricalProject,
    moves: { id: string; x: number; y: number }[]
  ): ElectricalProject => {
    let devices = prev.devices;
    let wires = prev.wires;

    for (const move of moves) {
      const dev = devices.find(d => d.id === move.id);
      if (!dev) continue;
      const dx = move.x - dev.x;
      const dy = move.y - dev.y;
      if (dx === 0 && dy === 0) continue;

      devices = devices.map(d => (d.id === move.id ? { ...d, x: move.x, y: move.y } : d));
      wires = wires.map(w => {
        if (!w.waypoints || w.waypoints.length === 0) return w;
        const fromMoved = w.fromDeviceId === move.id;
        const toMoved = w.toDeviceId === move.id;
        if (!fromMoved && !toMoved) return w;

        if (fromMoved && toMoved) {
          return {
            ...w,
            waypoints: w.waypoints.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }

        const pts = w.waypoints.map(p => ({ ...p }));
        if (fromMoved) {
          pts[0] = { x: pts[0].x + dx, y: pts[0].y + dy };
          if (pts.length > 2) {
            pts[1] = { x: pts[1].x + dx, y: pts[1].y + dy };
          }
        }
        if (toMoved) {
          const last = pts.length - 1;
          pts[last] = { x: pts[last].x + dx, y: pts[last].y + dy };
          if (pts.length > 2) {
            pts[last - 1] = { x: pts[last - 1].x + dx, y: pts[last - 1].y + dy };
          }
        }
        return { ...w, waypoints: pts };
      });
    }

    return { ...prev, devices, wires };
  };

  // Move device (drag) — locked while energized or when the device position is locked
  const handleUpdateDevicePosition = (id: string, x: number, y: number) => {
    if (isSimulating) return;
    const dev = project.devices.find(d => d.id === id);
    if (!dev || dev.state.locked) return;
    if (x === dev.x && y === dev.y) return;
    setProject(prev => applyDeviceMoves(prev, [{ id, x, y }]));
  };

  // Move multiple selected devices together (wires follow automatically)
  const handleUpdateMultipleDevicePositions = (updates: { id: string; x: number; y: number }[]) => {
    if (isSimulating || updates.length === 0) return;
    const filtered = updates.filter((u) => {
      const dev = project.devices.find((d) => d.id === u.id);
      return dev && !dev.state.locked && (dev.x !== u.x || dev.y !== u.y);
    });
    if (filtered.length === 0) return;
    setProject(prev => applyDeviceMoves(prev, filtered));
  };

  // Lock / unlock the selected device position (CAD tool)
  const handleToggleLockSelected = () => {
    if (isEditBlocked() || !selectedDeviceId) return;
    const targets = selectedGroupIds.length > 1 ? selectedGroupIds : [selectedDeviceId];
    const anyUnlocked = project.devices.some(d => targets.includes(d.id) && !d.state.locked);
    pushUndoSnapshot();
    sound.playClick();
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d =>
        targets.includes(d.id) ? { ...d, state: { ...d.state, locked: anyUnlocked } } : d
      ),
    }));
    showNotice(anyUnlocked ? 'Device position locked' : 'Device position unlocked');
  };

  // Align the multi-selection to its first-selected (anchor) device by centre line
  const handleAlign = (axis: 'horizontal' | 'vertical') => {
    if (isEditBlocked()) return;
    if (selectedGroupIds.length < 2) {
      showNotice('Shift+click two or more devices to align them');
      return;
    }
    const anchor = project.devices.find(d => d.id === selectedGroupIds[0]);
    if (!anchor) return;

    const moves = selectedGroupIds
      .slice(1)
      .map(id => project.devices.find(d => d.id === id))
      .filter((d): d is ElectricalDevice => !!d && !d.state.locked)
      .map(d =>
        axis === 'horizontal'
          // same row: match vertical centre
          ? { id: d.id, x: d.x, y: Math.round(anchor.y + anchor.height / 2 - d.height / 2) }
          // same column: match horizontal centre
          : { id: d.id, x: Math.round(anchor.x + anchor.width / 2 - d.width / 2), y: d.y }
      );

    if (moves.length === 0) {
      showNotice('Nothing to align — the other selected devices are locked');
      return;
    }
    pushUndoSnapshot();
    sound.playSwitchClick();
    setProject(prev => applyDeviceMoves(prev, moves));
  };

  // Update specific property on a device (e.g. ratedAmps, tripCurve, wattage)
  const handleUpdateDeviceProperty = (deviceId: string, key: string, value: any) => {
    pushUndoSnapshot();
    sound.playSwitchClick();
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => {
        if (d.id !== deviceId) return d;
        const updatedState = { ...d.state, [key]: value };
        let updatedName = d.name;
        if (key === 'ratedAmps' && d.type.includes('mcb')) {
          const poles = d.type === 'mcb_3p' ? '3P' : d.type === 'mcb_2p' ? '2P' : '1P';
          updatedName = `MCB ${poles} ${value}A`;
        }
        return {
          ...d,
          name: updatedName,
          state: updatedState
        };
      })
    }));
  };

  // Update specific property on a wire (e.g. gauge, color, length) — wiring edits are locked while energized
  const handleUpdateWireProperty = (wireId: string, updates: Partial<ElectricalWire>) => {
    if (isEditBlocked()) return;
    pushUndoSnapshot();
    setProject(prev => ({
      ...prev,
      wires: prev.wires.map(w => w.id === wireId ? { ...w, ...updates } : w)
    }));
  };

  // Update wire path waypoints from interactive segment dragging
  const handleUpdateWireWaypoints = (wireId: string, waypoints: { x: number; y: number }[]) => {
    if (isSimulating) return;
    setProject(prev => ({
      ...prev,
      wires: prev.wires.map(w => w.id === wireId ? { ...w, waypoints } : w)
    }));
  };

  // Merge a partial state patch into a live device (momentary push buttons, TOR dial/test/reset,
  // isolators, cutaway view). Works in both Edit and Simulation mode — it is operation, not wiring.
  const handlePatchDeviceState = useCallback((deviceId: string, patch: Record<string, any>) => {
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => (d.id === deviceId ? { ...d, state: { ...d.state, ...patch } } : d)),
    }));
  }, []);

  // Student rung-builder ladder lives on the project (exported / imported with it)
  const handleUpdateLadder = useCallback((rungs: LadderRung[]) => {
    setProject(prev => ({ ...prev, ladder: rungs }));
  }, []);

  // Toggle breaker or switch state
  const handleToggleDeviceState = (device: ElectricalDevice) => {
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => d.id === device.id ? { ...device, state: { ...device.state } } : d)
    }));
  };

  // Delete selected wire or device(s)
  const handleDeleteSelected = () => {
    if (!selectedWireId && !selectedDeviceId) return;
    if (isEditBlocked()) return;
    if (selectedWireId) {
      pushUndoSnapshot();
      setProject(prev => ({
        ...prev,
        wires: prev.wires.filter(w => w.id !== selectedWireId)
      }));
      setSelectedWireId(null);
    } else if (selectedDeviceId) {
      const doomed = selectedGroupIds.length > 1 ? selectedGroupIds : [selectedDeviceId];
      pushUndoSnapshot();
      setProject(prev => ({
        ...prev,
        devices: prev.devices.filter(d => !doomed.includes(d.id)),
        wires: prev.wires.filter(w => !doomed.includes(w.fromDeviceId) && !doomed.includes(w.toDeviceId))
      }));
      setSelectedDeviceId(null);
      setSelectedGroupIds([]);
    }
  };

  // Global Keyboard Shortcuts (Undo, Redo, Copy, Paste, Rotate, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (selectedDeviceId) {
          const dev = project.devices.find(d => d.id === selectedDeviceId);
          if (dev) {
            setClipboardDevice(JSON.parse(JSON.stringify(dev)));
          }
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboardDevice) {
          e.preventDefault();
          handleDuplicateDevice(clipboardDevice);
        }
      } else if (e.key.toLowerCase() === 'r') {
        if (selectedDeviceId) {
          const dev = project.devices.find(d => d.id === selectedDeviceId);
          if (dev) {
            e.preventDefault();
            handleRotateDevice(dev);
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDeviceId, selectedWireId, clipboardDevice, project, undoStack, redoStack]);

  // Reset simulation: re-arm tripped breakers / RCDs and clear injected earth faults
  const handleResetSimulation = () => {
    sound.playBreakerSnap();
    setSparkFlash([]);
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => {
        const rearmed = resetTripState(d);
        return d.state.hasEarthFault ? { ...rearmed, state: { ...rearmed.state, hasEarthFault: false } } : rearmed;
      })
    }));
  };

  // Clear canvas
  const handleClearCanvas = () => {
    if (isEditBlocked()) return;
    if (window.confirm('Clear all devices and wires from the canvas?')) {
      pushUndoSnapshot();
      setProject(createBlankProject(standard));
      setSelectedDeviceId(null);
      setSelectedGroupIds([]);
      setSelectedWireId(null);
    }
  };

  // Export Project JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.title.toLowerCase().replace(/\s+/g, '_')}_${standard}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Trigger Import JSON
  const handleImportJson = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const isAllRearView = project.devices.some(
    d => (d.type === 'socket_duplex' || d.type === 'socket_schuko') && d.state.viewMode === 'rear'
  );

  const handleFlipAllOutlets = () => {
    // Flipping re-anchors outlet terminals, so it counts as a wiring edit
    if (isEditBlocked()) return;
    pushUndoSnapshot();
    sound.playClick();
    const nextMode = isAllRearView ? 'front' : 'rear';
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => 
        (d.type === 'socket_duplex' || d.type === 'socket_schuko')
          ? { ...d, state: { ...d.state, viewMode: nextMode } }
          : d
      )
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.devices && imported.wires) {
          pushUndoSnapshot();
          // Imported projects always open de-energized in Edit Mode
          setIsSimulating(false);
          setSparkFlash([]);
          setProject({ ...imported, devices: toEditModeDevices(imported.devices) });
          setSelectedDeviceId(null);
          setSelectedGroupIds([]);
          setSelectedWireId(null);
          if (imported.codeStandard) {
            setStandard(imported.codeStandard);
          }
        }
      } catch (err) {
        alert('Invalid electrical project JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Load a Lab Lesson (always opens de-energized in Edit Mode; press ▶ Simulate to energize)
  const handleSelectLab = (lab: LabLesson) => {
    pushUndoSnapshot();
    const loaded: ElectricalProject = JSON.parse(JSON.stringify(lab.project));
    loaded.devices = toEditModeDevices(loaded.devices);
    setIsSimulating(false);
    setSparkFlash([]);
    setProject(loaded);
    setStandard(lab.project.codeStandard);
    setIsLabModalOpen(false);
    setIsLibraryOpen(false);
    setSelectedDeviceId(null);
    setSelectedGroupIds([]);
    setSelectedWireId(null);
    showNotice('Example loaded — press ▶ Simulate to energize the circuit');
  };

  // Focus and select device or wire when clicking violation in HUD
  const handleHighlightViolation = (viol: CodeViolation) => {
    sound.playClick();
    if (viol.affectedDeviceId) {
      handleSelectDevice(viol.affectedDeviceId);
      setSelectedWireId(null);
    } else if (viol.affectedWireId) {
      setSelectedWireId(viol.affectedWireId);
      setSelectedDeviceId(null);
      setSelectedGroupIds([]);
    }
  };

  const selectedDevice = project.devices.find(d => d.id === selectedDeviceId) || null;

  // Dual View right-pane switch (Ladder ⇄ SLD)
  const dualSwitch = (
    <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shadow-sm">
      {([
        { id: 'ladder', label: 'Ladder' },
        { id: 'sld', label: 'SLD' },
      ] as const).map(t => (
        <button
          key={t.id}
          onClick={() => setDualPane(t.id)}
          className={`px-2.5 h-6 rounded-md text-[11px] font-bold transition ${
            dualPane === t.id ? 'bg-stone-800 text-white' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
  const isLocked = isSimulating;

  // Blocked-edit notifications coming from the canvas
  const handleBlockedEdit = (reason: 'simulating' | 'locked-device') => {
    showNotice(reason === 'simulating' ? LOCKED_MESSAGE : 'Device position is locked — unlock it to move');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#faf8f5] text-stone-900 overflow-hidden font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Application Bar (EduVolt CAD Ribbon) */}
      <TopNavBar
        standard={standard}
        onStandardChange={handleStandardChange}
        gridVoltage={project.gridVoltage}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isCompliant={report.isCompliant}
        trippedCount={trippedCount}
        activeLabTitle={project.title}
        onOpenLabs={() => setIsLabModalOpen(true)}
        onResetSimulation={handleResetSimulation}
        onClearCanvas={handleClearCanvas}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onFlipAllOutlets={handleFlipAllOutlets}
        isAllRearView={isAllRearView}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen(v => !v)}
        dmmMode={dmmMode}
        onToggleDmmMode={() => {
          setDmmMode(v => !v);
          setDmmProbeA(null);
          setDmmReadout(null);
        }}
        isHudOpen={isHudOpen}
        onToggleHud={() => setIsHudOpen(v => !v)}
        hasSelectedDevice={!!selectedDeviceId}
        isSelectedLocked={!!selectedDevice?.state.locked}
        onToggleLockSelected={handleToggleLockSelected}
        canAlign={selectedGroupIds.length >= 2}
        onAlignHorizontal={() => handleAlign('horizontal')}
        onAlignVertical={() => handleAlign('vertical')}
      />

      {/* Conductor & Cable Tool Ribbon Dock */}
      <ConductorToolDock
        standard={standard}
        wiringMode={wiringMode}
        activeWireColor={activeWireColor}
        activeWireGauge={activeWireGauge}
        activeWireLength={activeWireLength}
        onSelectWiringMode={setWiringMode}
        onSelectWireColor={setActiveWireColor}
        onSelectWireGauge={setActiveWireGauge}
        onSelectWireLength={setActiveWireLength}
        isLocked={isLocked}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Hierarchical Component Library */}
        <ComponentDrawer
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onAddComponent={handleAddComponent}
          isLocked={isLocked}
        />

        {/* Center Canvas Area (Supports Realistic, Schematic, or Split Dual-View) */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Interactive Device & Conductor Inspector Panel */}
          <DevicePropertiesPanel
            device={selectedDevice}
            wire={project.wires.find(w => w.id === selectedWireId) || null}
            standard={standard}
            onUpdateDeviceProperty={handleUpdateDeviceProperty}
            onUpdateWireProperty={handleUpdateWireProperty}
            onDeleteSelected={handleDeleteSelected}
            onRotateDevice={handleRotateDevice}
            onDuplicateDevice={handleDuplicateDevice}
            onPatchDeviceState={handlePatchDeviceState}
            onClose={() => {
              setSelectedDeviceId(null);
              setSelectedGroupIds([]);
              setSelectedWireId(null);
            }}
            isLibraryOpen={isLibraryOpen}
          />

          {viewMode === 'realistic' && (
            <WiringCanvas
              devices={project.devices}
              wires={project.wires}
              solved={solved}
              standard={standard}
              wiringMode={wiringMode}
              activeWireColor={activeWireColor}
              activeWireGauge={activeWireGauge}
              selectedDeviceId={selectedDeviceId}
              selectedDeviceIds={selectedGroupIds}
              selectedWireId={selectedWireId}
              isSimulating={isSimulating}
              snapSize={snapSize}
              onBlockedEdit={handleBlockedEdit}
              onSelectDevice={handleSelectDevice}
              onSelectWire={(w) => {
                setSelectedWireId(w ? w.id : null);
                if (w) {
                  setSelectedDeviceId(null);
                  setSelectedGroupIds([]);
                }
              }}
              onUpdateDevicePosition={handleUpdateDevicePosition}
              onUpdateMultipleDevicePositions={handleUpdateMultipleDevicePositions}
              dmmMode={dmmMode}
              dmmReadout={dmmReadout}
              onDmmClampWire={handleDmmClampWire}
              onDmmProbeTerminal={handleDmmProbeTerminal}
              onConnectWire={handleConnectWire}
              onToggleDeviceState={handleToggleDeviceState}
              onPatchDeviceState={handlePatchDeviceState}
              highlightDeviceIds={[hoverDeviceId, flashDeviceId].filter((x): x is string => !!x)}
              onUpdateWireWaypoints={handleUpdateWireWaypoints}
              onDropDevice={handleDropDevice}
              onRotateDevice={handleRotateDevice}
              onDuplicateDevice={handleDuplicateDevice}
              onDeleteDevice={handleDeleteSelected}
              fitKey={`${project.id}-realistic`}
              insetLeft={isLibraryOpen ? 336 : 0}
            />
          )}

          {viewMode === 'schematic' && (
            <SchematicCanvas
              devices={project.devices}
              wires={project.wires}
              solved={solved}
            />
          )}

          {viewMode === 'ladder' && (
            <LadderCanvas
              key={`ladder-full-${project.id}`}
              devices={project.devices}
              wires={project.wires}
              solved={solved}
              isSimulating={isSimulating}
              ladder={project.ladder}
              targetLadder={project.targetLadder}
              onUpdateLadder={handleUpdateLadder}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={() => {}}
              onPatchDeviceState={handlePatchDeviceState}
            />
          )}

          {viewMode === 'split' && (
            <div className="w-full h-full grid grid-cols-2 divide-x divide-stone-200">
              <div className="w-full h-full relative">
                <WiringCanvas
                  devices={project.devices}
                  wires={project.wires}
                  solved={solved}
                  standard={standard}
                  wiringMode={wiringMode}
                  activeWireColor={activeWireColor}
                  activeWireGauge={activeWireGauge}
                  selectedDeviceId={selectedDeviceId}
                  selectedDeviceIds={selectedGroupIds}
                  selectedWireId={selectedWireId}
                  isSimulating={isSimulating}
                  snapSize={snapSize}
                  onBlockedEdit={handleBlockedEdit}
                  onSelectDevice={handleSelectDevice}
                  onSelectWire={(w) => {
                    setSelectedWireId(w ? w.id : null);
                    if (w) {
                      setSelectedDeviceId(null);
                      setSelectedGroupIds([]);
                    }
                  }}
                  onUpdateDevicePosition={handleUpdateDevicePosition}
              onUpdateMultipleDevicePositions={handleUpdateMultipleDevicePositions}
              dmmMode={dmmMode}
              dmmReadout={dmmReadout}
              onDmmClampWire={handleDmmClampWire}
              onDmmProbeTerminal={handleDmmProbeTerminal}
                  onConnectWire={handleConnectWire}
                  onToggleDeviceState={handleToggleDeviceState}
                  onPatchDeviceState={handlePatchDeviceState}
                  highlightDeviceIds={[hoverDeviceId, flashDeviceId].filter((x): x is string => !!x)}
                  onUpdateWireWaypoints={handleUpdateWireWaypoints}
                  onDropDevice={handleDropDevice}
                  onRotateDevice={handleRotateDevice}
                  onDuplicateDevice={handleDuplicateDevice}
                  onDeleteDevice={handleDeleteSelected}
                  fitKey={`${project.id}-split`}
                  insetLeft={isLibraryOpen ? 336 : 0}
                />
              </div>
              <div className="w-full h-full relative flex flex-col">
                {dualPane === 'sld' && <div className="absolute bottom-3 right-3 z-20">{dualSwitch}</div>}
                {dualPane === 'ladder' ? (
                  <LadderCanvas
                    key={`ladder-dual-${project.id}`}
                    compact
                    devices={project.devices}
                    wires={project.wires}
                    solved={solved}
                    isSimulating={isSimulating}
                    ladder={project.ladder}
                    targetLadder={project.targetLadder}
                    onUpdateLadder={handleUpdateLadder}
                    selectedDeviceId={selectedDeviceId}
                    onSelectDevice={(id) => flashDevice(id)}
                    onPatchDeviceState={handlePatchDeviceState}
                    onHoverDevice={setHoverDeviceId}
                    headerRight={dualSwitch}
                  />
                ) : (
                  <SchematicCanvas
                    devices={project.devices}
                    wires={project.wires}
                    solved={solved}
                  />
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Code Inspector & Engineering HUD */}
        {isHudOpen && (
          <CodeInspectorHUD
            report={report}
            solved={solved}
            isSimulating={isSimulating}
            onResetSimulation={handleResetSimulation}
            onHighlightViolation={handleHighlightViolation}
          />
        )}

        {/* CAD Notice Toast */}
        {notice && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-stone-700/60 backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            {notice}
          </div>
        )}
      </div>

      {/* Bottom CAD Status Bar */}
      <StatusBar
        standard={standard}
        gridVoltage={project.gridVoltage}
        gridFrequency={project.gridFrequency}
        isSimulating={isSimulating}
        snapSize={snapSize}
        onSnapChange={setSnapSize}
        totalWatts={report.totalConnectedWatts}
        totalAmps={report.totalCurrentAmps}
      />

      {/* Guided Labs & Scenarios Modal */}
      <LabSelectorModal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
        onSelectLab={handleSelectLab}
        onSelectBlank={() => {
          setProject(createBlankProject(standard));
          setIsLabModalOpen(false);
        }}
      />
    </div>
  );
};
