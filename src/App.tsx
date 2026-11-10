import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ElectricalProject, ElectricalDevice, ElectricalWire, CodeStandard, DeviceType, WiringMode } from './types/electrical';
import { CodeViolation } from './types/codes';
import { LAB_LESSONS, LabLesson, createBlankProject } from './data/labTemplates';
import { createDeviceFromCatalog } from './data/defaultComponents';
import { COLOR_STANDARDS, getDefaultWireGauge } from './data/standardsData';
import { solveCircuit } from './core/circuitSolver';
import { analyzeCodeCompliance } from './core/codeCompliance';
import { TopNavBar } from './components/layout/TopNavBar';
import { ComponentDrawer } from './components/layout/ComponentDrawer';
import { CodeInspectorHUD } from './components/layout/CodeInspectorHUD';
import { DevicePropertiesPanel } from './components/layout/DevicePropertiesPanel';
import { LabSelectorModal } from './components/layout/LabSelectorModal';
import { WiringCanvas } from './components/canvas/WiringCanvas';
import { SchematicCanvas } from './components/canvas/SchematicCanvas';
import { sound } from './utils/soundFx';
import { Trash2 } from 'lucide-react';

export const App: React.FC = () => {
  // Start with clean blank canvas as requested by user
  const [project, setProject] = useState<ElectricalProject>(() => {
    return createBlankProject('PEC');
  });

  const [standard, setStandard] = useState<CodeStandard>(project.codeStandard);
  const [viewMode, setViewMode] = useState<'realistic' | 'schematic' | 'split'>('realistic');

  // Active wire drawing tool state
  const [wiringMode, setWiringMode] = useState<WiringMode>('single');
  const [activeWireColor, setActiveWireColor] = useState<string>(COLOR_STANDARDS.PEC.phase1);
  const [activeWireGauge, setActiveWireGauge] = useState<string>(getDefaultWireGauge('PEC', 'lighting'));
  const [activeWireLength, setActiveWireLength] = useState<number>(5);

  // Selection state
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState<ElectricalProject[]>([]);
  const [redoStack, setRedoStack] = useState<ElectricalProject[]>([]);

  // Clipboard for Copy & Paste
  const [clipboardDevice, setClipboardDevice] = useState<ElectricalDevice | null>(null);

  // Helper to record an undo snapshot before state modifications
  const pushUndoSnapshot = (currentProj: ElectricalProject = project) => {
    setUndoStack(prev => [...prev.slice(-25), JSON.parse(JSON.stringify(currentProj))]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    sound.playClick();
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(project))]);
    setProject(previous);
    setSelectedDeviceId(null);
    setSelectedWireId(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    sound.playClick();
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(project))]);
    setProject(next);
    setSelectedDeviceId(null);
    setSelectedWireId(null);
  };

  // Lab modal state
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);

  // File input ref for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // When standard switches, update colors & wire gauges
  const handleStandardChange = (newStd: CodeStandard) => {
    setStandard(newStd);
    setProject(prev => ({
      ...prev,
      codeStandard: newStd,
      gridVoltage: newStd === 'PEC' ? 230 : 230,
      gridFrequency: newStd === 'PEC' ? 60 : 50,
    }));
    setActiveWireColor(COLOR_STANDARDS[newStd].phase1);
    setActiveWireGauge(getDefaultWireGauge(newStd, 'lighting'));
  };

  // Run Real-time Circuit Solver
  const solved = useMemo(() => {
    return solveCircuit(project.devices, project.wires, standard, project.gridVoltage);
  }, [project.devices, project.wires, standard, project.gridVoltage]);

  // Run Live Code Compliance Analysis
  const report = useMemo(() => {
    return analyzeCodeCompliance(project.devices, project.wires, solved, standard, project.gridVoltage);
  }, [project.devices, project.wires, solved, standard, project.gridVoltage]);

  // Play sound on trip
  useEffect(() => {
    if (solved.trippedDevices.length > 0) {
      sound.playTripPop();
    }
  }, [solved.trippedDevices.length]);

  // Play sound on arc flash / spark
  useEffect(() => {
    if (solved.sparks.length > 0) {
      sound.playSparkZap();
    }
  }, [solved.sparks.length]);

  // Connect terminals with support for paired 2-wire (Live + Neutral Return) & 3-wire runs
  const handleConnectWire = (
    fromDevId: string, 
    fromTermId: string, 
    toDevId: string, 
    toTermId: string,
    mode: WiringMode = wiringMode
  ) => {
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
    pushUndoSnapshot();
    const newDev = createDeviceFromCatalog(type, 380 + Math.random() * 60, 240 + Math.random() * 60);
    sound.playSwitchClick();
    setProject(prev => ({
      ...prev,
      devices: [...prev.devices, newDev]
    }));
    setSelectedDeviceId(newDev.id);
  };

  // Add new device dropped onto canvas (drag-and-drop)
  const handleDropDevice = (type: DeviceType, x: number, y: number) => {
    pushUndoSnapshot();
    const newDev = createDeviceFromCatalog(type, Math.max(10, x), Math.max(10, y));
    sound.playSwitchClick();
    setProject(prev => ({
      ...prev,
      devices: [...prev.devices, newDev]
    }));
    setSelectedDeviceId(newDev.id);
  };

  // Rotate device by 90 degrees clockwise
  const handleRotateDevice = (device: ElectricalDevice) => {
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
    setProject(prev => ({
      ...prev,
      devices: [...prev.devices, cloned]
    }));
    setSelectedDeviceId(newId);
  };

  // Move device & synchronize attached wire waypoints
  const handleUpdateDevicePosition = (id: string, x: number, y: number) => {
    const dev = project.devices.find(d => d.id === id);
    if (!dev) return;
    const dx = x - dev.x;
    const dy = y - dev.y;
    if (dx === 0 && dy === 0) return;

    setProject(prev => {
      const updatedDevices = prev.devices.map(d => d.id === id ? { ...d, x, y } : d);
      const updatedWires = prev.wires.map(w => {
        if (!w.waypoints || w.waypoints.length === 0) return w;
        const fromMoved = w.fromDeviceId === id;
        const toMoved = w.toDeviceId === id;
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

      return {
        ...prev,
        devices: updatedDevices,
        wires: updatedWires,
      };
    });
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

  // Update specific property on a wire (e.g. gauge, color, length)
  const handleUpdateWireProperty = (wireId: string, updates: Partial<ElectricalWire>) => {
    pushUndoSnapshot();
    setProject(prev => ({
      ...prev,
      wires: prev.wires.map(w => w.id === wireId ? { ...w, ...updates } : w)
    }));
  };

  // Update wire path waypoints from interactive segment dragging
  const handleUpdateWireWaypoints = (wireId: string, waypoints: { x: number; y: number }[]) => {
    setProject(prev => ({
      ...prev,
      wires: prev.wires.map(w => w.id === wireId ? { ...w, waypoints } : w)
    }));
  };

  // Toggle breaker or switch state
  const handleToggleDeviceState = (device: ElectricalDevice) => {
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => d.id === device.id ? { ...device, state: { ...device.state } } : d)
    }));
  };

  // Delete selected wire or device
  const handleDeleteSelected = () => {
    if (selectedWireId) {
      pushUndoSnapshot();
      setProject(prev => ({
        ...prev,
        wires: prev.wires.filter(w => w.id !== selectedWireId)
      }));
      setSelectedWireId(null);
    } else if (selectedDeviceId) {
      pushUndoSnapshot();
      setProject(prev => ({
        ...prev,
        devices: prev.devices.filter(d => d.id !== selectedDeviceId),
        wires: prev.wires.filter(w => w.fromDeviceId !== selectedDeviceId && w.toDeviceId !== selectedDeviceId)
      }));
      setSelectedDeviceId(null);
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

  // Reset simulation (reset all breaker trips)
  const handleResetSimulation = () => {
    sound.playBreakerSnap();
    setProject(prev => ({
      ...prev,
      devices: prev.devices.map(d => ({
        ...d,
        state: {
          ...d.state,
          tripped: false,
          closed: true,
          tripReason: undefined,
          hasEarthFault: false
        }
      }))
    }));
  };

  // Clear canvas
  const handleClearCanvas = () => {
    if (window.confirm('Clear all devices and wires from the canvas?')) {
      pushUndoSnapshot();
      setProject(createBlankProject(standard));
      setSelectedDeviceId(null);
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
          setProject(imported);
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

  // Load a Lab Lesson
  const handleSelectLab = (lab: LabLesson) => {
    pushUndoSnapshot();
    setProject(JSON.parse(JSON.stringify(lab.project)));
    setStandard(lab.project.codeStandard);
    setIsLabModalOpen(false);
    setSelectedDeviceId(null);
    setSelectedWireId(null);
  };

  // Focus and select device or wire when clicking violation in HUD
  const handleHighlightViolation = (viol: CodeViolation) => {
    sound.playClick();
    if (viol.affectedDeviceId) {
      setSelectedDeviceId(viol.affectedDeviceId);
      setSelectedWireId(null);
    } else if (viol.affectedWireId) {
      setSelectedWireId(viol.affectedWireId);
      setSelectedDeviceId(null);
    }
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

      {/* Top Application Bar (Light Mode Reference Theme) */}
      <TopNavBar
        standard={standard}
        onStandardChange={handleStandardChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isCompliant={report.isCompliant}
        totalWatts={report.totalConnectedWatts}
        totalAmps={report.totalCurrentAmps}
        trippedCount={solved.trippedDevices.length}
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
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Component Drawer with Cable Mode & J-Boxes */}
        <ComponentDrawer
          standard={standard}
          wiringMode={wiringMode}
          activeWireColor={activeWireColor}
          activeWireGauge={activeWireGauge}
          activeWireLength={activeWireLength}
          onSelectWiringMode={setWiringMode}
          onSelectWireColor={setActiveWireColor}
          onSelectWireGauge={setActiveWireGauge}
          onSelectWireLength={setActiveWireLength}
          onAddComponent={handleAddComponent}
        />

        {/* Center Canvas Area (Supports Realistic, Schematic, or Split Dual-View) */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Interactive Device & Conductor Inspector Panel */}
          <DevicePropertiesPanel
            device={project.devices.find(d => d.id === selectedDeviceId) || null}
            wire={project.wires.find(w => w.id === selectedWireId) || null}
            standard={standard}
            onUpdateDeviceProperty={handleUpdateDeviceProperty}
            onUpdateWireProperty={handleUpdateWireProperty}
            onDeleteSelected={handleDeleteSelected}
            onRotateDevice={handleRotateDevice}
            onDuplicateDevice={handleDuplicateDevice}
            onClose={() => {
              setSelectedDeviceId(null);
              setSelectedWireId(null);
            }}
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
              selectedWireId={selectedWireId}
              onSelectDevice={setSelectedDeviceId}
              onSelectWire={(w) => setSelectedWireId(w ? w.id : null)}
              onUpdateDevicePosition={handleUpdateDevicePosition}
              onConnectWire={handleConnectWire}
              onToggleDeviceState={handleToggleDeviceState}
              onUpdateWireWaypoints={handleUpdateWireWaypoints}
              onDropDevice={handleDropDevice}
              onRotateDevice={handleRotateDevice}
              onDuplicateDevice={handleDuplicateDevice}
              onDeleteDevice={handleDeleteSelected}
            />
          )}

          {viewMode === 'schematic' && (
            <SchematicCanvas
              devices={project.devices}
              wires={project.wires}
              solved={solved}
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
                  selectedWireId={selectedWireId}
                  onSelectDevice={setSelectedDeviceId}
                  onSelectWire={(w) => setSelectedWireId(w ? w.id : null)}
                  onUpdateDevicePosition={handleUpdateDevicePosition}
                  onConnectWire={handleConnectWire}
                  onToggleDeviceState={handleToggleDeviceState}
                  onUpdateWireWaypoints={handleUpdateWireWaypoints}
                  onDropDevice={handleDropDevice}
                  onRotateDevice={handleRotateDevice}
                  onDuplicateDevice={handleDuplicateDevice}
                  onDeleteDevice={handleDeleteSelected}
                />
              </div>
              <div className="w-full h-full relative">
                <SchematicCanvas
                  devices={project.devices}
                  wires={project.wires}
                  solved={solved}
                />
              </div>
            </div>
          )}
        </main>

        {/* Right Code Inspector & Engineering HUD */}
        <CodeInspectorHUD
          report={report}
          solved={solved}
          onResetSimulation={handleResetSimulation}
          onHighlightViolation={handleHighlightViolation}
        />
      </div>

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
