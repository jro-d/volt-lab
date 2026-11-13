import React, { useMemo, useRef, useState } from 'react';
import { ElectricalDevice, ElectricalWire, DeviceTerminal, CodeStandard, WiringMode, DeviceType } from '../../types/electrical';
import { DeviceRenderer } from '../devices/DeviceRenderer';
import { TerminalHighlightContext, HighlightedEndpointInfo } from '../devices/TerminalContext';
import { WireRenderer } from './WireRenderer';
import { calculateOrthogonalPath, generateSvgPath, Point, getDeviceTerminalPosition } from '../../core/wireRouter';
import { SolvedCircuit } from '../../core/circuitSolver';
import { cadStatus } from '../../utils/cadStatusStore';

interface WiringCanvasProps {
  devices: ElectricalDevice[];
  wires: ElectricalWire[];
  solved: SolvedCircuit;
  standard: CodeStandard;
  wiringMode: WiringMode;
  activeWireColor: string;
  activeWireGauge: string;
  selectedDeviceId: string | null;
  /** Additional Shift+click multi-selection (ordered, first = alignment anchor) */
  selectedDeviceIds?: string[];
  selectedWireId: string | null;
  /** Grid energized: dragging, wiring and structural edits are locked */
  isSimulating?: boolean;
  /** Grid snap in px (0 = OFF) */
  snapSize?: number;
  /** Called when the user attempts an edit that is currently locked */
  onBlockedEdit?: (reason: 'simulating' | 'locked-device') => void;
  onSelectDevice: (id: string | null, additive?: boolean) => void;
  onSelectWire: (wire: ElectricalWire | null) => void;
  onUpdateDevicePosition: (id: string, x: number, y: number) => void;
  onUpdateMultipleDevicePositions?: (updates: { id: string; x: number; y: number }[]) => void;
  onConnectWire: (fromDevId: string, fromTermId: string, toDevId: string, toTermId: string, mode?: WiringMode) => void;
  rewiringTarget?: { wireId: string; moveEnd: 'from' | 'to' } | null;
  onSetRewiringTarget?: (target: { wireId: string; moveEnd: 'from' | 'to' } | null) => void;
  onRewireWire?: (wireId: string, moveEnd: 'from' | 'to', newDeviceId: string, newTerminalId: string) => void;
  onDeleteWire?: (wireId: string) => void;
  onToggleDeviceState: (device: ElectricalDevice) => void;
  /** Merge a partial state patch into a device (momentary push buttons, dials, view toggles) */
  onPatchDeviceState?: (deviceId: string, patch: Record<string, any>) => void;
  /** Device ids to glow-highlight (e.g. hovered ladder symbol) */
  highlightDeviceIds?: string[];
  onUpdateWireWaypoints?: (wireId: string, waypoints: Point[]) => void;
  onDropDevice?: (type: DeviceType, x: number, y: number) => void;
  onRotateDevice?: (device: ElectricalDevice) => void;
  onDuplicateDevice?: (device: ElectricalDevice) => void;
  onDeleteDevice?: (device: ElectricalDevice) => void;
  /** Changing this value re-fits the camera to the drawing (e.g. when a lab is loaded) */
  fitKey?: string;
  /** Pixels on the left covered by floating panels (kept clear when fitting) */
  insetLeft?: number;
  /** Digital Multimeter / Clamp Meter mode */
  dmmMode?: boolean;
  onDmmProbeTerminal?: (deviceId: string, terminalId: string) => void;
  onDmmClampWire?: (wireId: string) => void;
  dmmReadout?: {
    mode: 'voltage' | 'clamp' | 'idle';
    primary: string;
    secondary?: string;
    label?: string;
    probeA?: { deviceId: string; terminalId: string };
    probeB?: { deviceId: string; terminalId: string };
  } | null;
}

export const WiringCanvas: React.FC<WiringCanvasProps> = ({
  devices,
  wires,
  solved,
  standard,
  wiringMode,
  activeWireColor,
  activeWireGauge,
  selectedDeviceId,
  selectedDeviceIds = [],
  selectedWireId,
  isSimulating = false,
  snapSize = 10,
  onBlockedEdit,
  onSelectDevice,
  onSelectWire,
  onUpdateDevicePosition,
  onUpdateMultipleDevicePositions,
  onConnectWire,
  rewiringTarget = null,
  onSetRewiringTarget,
  onRewireWire,
  onDeleteWire,
  onToggleDeviceState,
  onPatchDeviceState,
  highlightDeviceIds = [],
  onUpdateWireWaypoints,
  onDropDevice,
  onRotateDevice,
  onDuplicateDevice,
  onDeleteDevice,
  fitKey,
  insetLeft = 0,
  dmmMode = false,
  onDmmProbeTerminal,
  onDmmClampWire,
  dmmReadout = null,
}) => {
  const containerRef = useRef<SVGSVGElement | null>(null);

  // Snap helpers (snapSize 0 = OFF → whole-pixel precision)
  const snapValue = (v: number) => (snapSize > 0 ? Math.round(v / snapSize) * snapSize : Math.round(v));
  const waypointSnap = snapSize > 0 ? 5 : 1;

  // HTML5 Drag and Drop from Component Library
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/voltlab-device') as DeviceType;
    if (type && onDropDevice && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const svgX = (rawX - pan.x) / zoom;
      const svgY = (rawY - pan.y) / zoom;
      onDropDevice(type, snapValue(svgX), snapValue(svgY));
    }
  };

  // Dragging device state
  const [draggingDevId, setDraggingDevId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const groupDragRef = useRef<{ anchorId: string; anchorStart: Point; members: { id: string; x: number; y: number }[] } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number; dinLabel?: boolean } | null>(null);
  // A drag gesture that is not allowed (energized grid / locked device): we only toast once it actually moves
  const blockedDragRef = useRef<{ x: number; y: number; reason: 'simulating' | 'locked-device'; notified: boolean } | null>(null);

  // Dragging wire segment state
  const [draggingSegment, setDraggingSegment] = useState<{
    wireId: string;
    segmentIndex: number;
    isHorizontal: boolean;
    startMouse: Point;
    initialWaypoints: Point[];
  } | null>(null);

  // Terminal wiring connection state
  const [wiringStart, setWiringStart] = useState<{ dev: ElectricalDevice; term: DeviceTerminal } | null>(null);
  const [portMenu, setPortMenu] = useState<{
    deviceId: string;
    terminalId: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredTerminalId, setHoveredTerminalId] = useState<string | null>(null);

  // Pan and Zoom
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Keyboard shortcut listener (ESC to cancel wiring / rewire / deselect, Space for panning)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (wiringStart) {
          setWiringStart(null);
        }
        if (rewiringTarget) {
          onSetRewiringTarget?.(null);
        }
        if (portMenu) {
          setPortMenu(null);
        }
        onSelectDevice(null);
        onSelectWire(null);
      } else if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [wiringStart, rewiringTarget, portMenu, onSetRewiringTarget, onSelectDevice, onSelectWire]);

  // Zoom-to-fit: frame every device (and routed wire waypoint) in the visible canvas area
  const fitToView = React.useCallback(() => {
    const el = containerRef.current;
    if (!el || devices.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const d of devices) {
      minX = Math.min(minX, d.x);
      minY = Math.min(minY, d.y);
      maxX = Math.max(maxX, d.x + d.width);
      maxY = Math.max(maxY, d.y + d.height);
    }
    for (const w of wires) {
      for (const p of w.waypoints || []) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const rect = el.getBoundingClientRect();
    const pad = 48;
    const availW = Math.max(200, rect.width - insetLeft - pad * 2);
    const availH = Math.max(200, rect.height - pad * 2);
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const z = Math.min(1.4, Math.max(0.4, Math.min(availW / bw, availH / bh)));
    setZoom(z);
    setPan({
      x: insetLeft + pad + (availW - bw * z) / 2 - minX * z,
      y: pad + (availH - bh * z) / 2 - minY * z,
    });
  }, [devices, wires, insetLeft]);

  // Re-fit when a different project / lab is loaded
  React.useEffect(() => {
    if (fitKey === undefined) return;
    const t = setTimeout(fitToView, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // "F" frames the drawing
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f') fitToView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitToView]);

  // Publish zoom / wiring state to the CAD status bar
  React.useEffect(() => {
    cadStatus.set({ zoom });
  }, [zoom]);

  React.useEffect(() => {
    cadStatus.set({ wiring: !!wiringStart });
  }, [wiringStart]);

  React.useEffect(() => {
    return () => cadStatus.set({ wiring: false });
  }, []);

  // Energizing the grid cancels any half-drawn conductor
  React.useEffect(() => {
    if (isSimulating) setWiringStart(null);
  }, [isSimulating]);

  // Convert client mouse event to SVG workspace coordinates
  const getSvgCoordinates = (e: React.MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    return {
      x: (rawX - pan.x) / zoom,
      y: (rawY - pan.y) / zoom,
    };
  };

  const handleDeviceMouseDown = (device: ElectricalDevice, e: React.MouseEvent) => {
    e.stopPropagation();

    // Shift+click builds a multi-selection (used by Align H / Align V / Group Drag)
    if (e.shiftKey) {
      onSelectDevice(device.id, true);
      onSelectWire(null);
      return;
    }

    const isInMultiGroup = selectedDeviceIds.length > 1 && selectedDeviceIds.includes(device.id);
    if (!isInMultiGroup) {
      onSelectDevice(device.id);
    }
    onSelectWire(null);

    const coords = getSvgCoordinates(e);

    // Dragging is locked while energized or when the device position is locked.
    // We still allow the click through so switches / breakers / pushbuttons keep working.
    if (isSimulating || device.state.locked) {
      blockedDragRef.current = {
        x: coords.x,
        y: coords.y,
        reason: isSimulating ? 'simulating' : 'locked-device',
        notified: false,
      };
      return;
    }

    if (isInMultiGroup) {
      const members = devices
        .filter((d) => selectedDeviceIds.includes(d.id) && !d.state.locked)
        .map((d) => ({ id: d.id, x: d.x, y: d.y }));
      groupDragRef.current = {
        anchorId: device.id,
        anchorStart: { x: device.x, y: device.y },
        members,
      };
    } else {
      groupDragRef.current = null;
    }

    setDraggingDevId(device.id);
    setDragOffset({
      x: coords.x - device.x,
      y: coords.y - device.y,
    });
  };

  const handleTerminalMouseDown = (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button === 2) return; // Right-click is reserved for the Connected-Port Rewire/Disconnect menu
    setPortMenu(null);
    if (dmmMode) {
      onDmmProbeTerminal?.(device.id, terminal.id);
      return;
    }
    if (isSimulating) {
      // Wire creation/rewiring is locked while the grid is energized
      onBlockedEdit?.('simulating');
      return;
    }
    if (rewiringTarget) {
      onRewireWire?.(rewiringTarget.wireId, rewiringTarget.moveEnd, device.id, terminal.id);
      onSetRewiringTarget?.(null);
      return;
    }
    if (!wiringStart) {
      // Start wire
      setWiringStart({ dev: device, term: terminal });
    } else {
      // Complete connection if clicking a different terminal
      if (wiringStart.dev.id !== device.id || wiringStart.term.id !== terminal.id) {
        onConnectWire(wiringStart.dev.id, wiringStart.term.id, device.id, terminal.id, wiringMode);
      }
      setWiringStart(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getSvgCoordinates(e);
    setMousePos(coords);
    cadStatus.set({ cursorX: Math.round(coords.x), cursorY: Math.round(coords.y) });

    // Locked drag attempt: notify once after the pointer has clearly started dragging
    const blocked = blockedDragRef.current;
    if (blocked && !blocked.notified) {
      if (Math.hypot(coords.x - blocked.x, coords.y - blocked.y) > 6) {
        blocked.notified = true;
        onBlockedEdit?.(blocked.reason);
      }
    }

    if (draggingSegment) {
      const deltaX = coords.x - draggingSegment.startMouse.x;
      const deltaY = coords.y - draggingSegment.startMouse.y;
      const newWaypoints = draggingSegment.initialWaypoints.map((pt, i) => {
        // Wire endpoints MUST remain firmly anchored to device terminals
        if (i === 0 || i === draggingSegment.initialWaypoints.length - 1) {
          return pt;
        }
        if (i === draggingSegment.segmentIndex || i === draggingSegment.segmentIndex + 1) {
          if (draggingSegment.isHorizontal) {
            return { ...pt, y: Math.round((draggingSegment.initialWaypoints[i].y + deltaY) / waypointSnap) * waypointSnap };
          } else {
            return { ...pt, x: Math.round((draggingSegment.initialWaypoints[i].x + deltaX) / waypointSnap) * waypointSnap };
          }
        }
        return pt;
      });
      if (onUpdateWireWaypoints) {
        onUpdateWireWaypoints(draggingSegment.wireId, newWaypoints);
      }
      return;
    }

    if (draggingDevId) {
      let newX = Math.max(10, snapValue(coords.x - dragOffset.x));
      let newY = Math.max(10, snapValue(coords.y - dragOffset.y));

      const grp = groupDragRef.current;
      if (grp && grp.members.length > 1 && onUpdateMultipleDevicePositions) {
        const dx = newX - grp.anchorStart.x;
        const dy = newY - grp.anchorStart.y;
        setSnapGuides(null);
        onUpdateMultipleDevicePositions(
          grp.members.map((m) => ({
            id: m.id,
            x: Math.max(10, m.x + dx),
            y: Math.max(10, m.y + dy),
          }))
        );
        return;
      }

      // Snap-to-DIN-Rail & Auto-Alignment Guides for single-device drag
      const dragged = devices.find((d) => d.id === draggingDevId);
      if (dragged) {
        let guideX: number | undefined;
        let guideY: number | undefined;
        let dinLabel = false;

        const dinTypes = new Set([
          'mcb_1p', 'mcb_2p', 'mcb_3p', 'rcd_2p', 'spd_surge',
          'contactor_3p', 'plc_micro_controller', 'industrial_relay_dpdt',
          'timer_relay', 'vfd_drive', 'panel_meter',
        ]);

        if (dinTypes.has(dragged.type)) {
          const dragCy = newY + dragged.height / 2;
          for (const rail of devices) {
            if (rail.type !== 'din_rail_track') continue;
            const railW = rail.state.trackWidth || rail.width || 260;
            const withinX = newX + dragged.width > rail.x - 16 && newX < rail.x + railW + 16;
            const railCy = rail.y + rail.height / 2;
            if (withinX && Math.abs(dragCy - railCy) <= 18) {
              newY = Math.max(10, Math.round(railCy - dragged.height / 2));
              guideY = railCy;
              dinLabel = true;
              break;
            }
          }
        }

        const dragCx = newX + dragged.width / 2;
        for (const other of devices) {
          if (other.id === draggingDevId) continue;
          const otherCx = other.x + other.width / 2;
          if (Math.abs(dragCx - otherCx) <= 7) {
            newX = Math.max(10, Math.round(otherCx - dragged.width / 2));
            guideX = otherCx;
            break;
          }
        }

        setSnapGuides(guideX !== undefined || guideY !== undefined ? { x: guideX, y: guideY, dinLabel } : null);
      }

      onUpdateDevicePosition(draggingDevId, newX, newY);
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingDevId(null);
    groupDragRef.current = null;
    setSnapGuides(null);
    setIsPanning(false);
    setDraggingSegment(null);
    blockedDragRef.current = null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setPortMenu(null);
    // Middle-click (1), Right-click (2), Alt-click, or Spacebar-drag for smooth canvas panning
    if (e.button === 1 || e.button === 2 || e.altKey || isSpacePressed) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    } else {
      // Do not wipe wire selection if click landed directly on a wire
      const target = e.target as Element | null;
      if (target?.closest?.('[data-wire-id]')) {
        return;
      }
      // Left click on empty space deselects
      onSelectDevice(null);
      onSelectWire(null);
      if (wiringStart) {
        setWiringStart(null);
      }
      if (rewiringTarget) {
        onSetRewiringTarget?.(null);
      }
    }
  };

  // Block page scroll while wheel-zooming (React's onWheel is passive, so use a native listener)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const block = (ev: WheelEvent) => ev.preventDefault();
    el.addEventListener('wheel', block, { passive: false });
    return () => el.removeEventListener('wheel', block);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(2.5, Math.max(0.4, zoom * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom anchored to the exact cursor position
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Preview path while drawing or rewiring a wire
  let previewPathD = '';
  let previewColor = activeWireColor;
  if (wiringStart) {
    const fromPos = getDeviceTerminalPosition(wiringStart.dev, wiringStart.term);
    const startPt: Point = { x: fromPos.x, y: fromPos.y };
    const startDir = fromPos.dir;
    const endDir = mousePos.y > startPt.y ? (startDir === 'down' ? 'up' : 'down') : 'up';
    const previewWaypoints = calculateOrthogonalPath(startPt, mousePos, startDir, endDir, 34, 26);
    previewPathD = generateSvgPath(previewWaypoints, 8);
  } else if (rewiringTarget) {
    const w = wires.find((item) => item.id === rewiringTarget.wireId);
    if (w) {
      const anchorDevId = rewiringTarget.moveEnd === 'from' ? w.toDeviceId : w.fromDeviceId;
      const anchorTermId = rewiringTarget.moveEnd === 'from' ? w.toTerminalId : w.fromTerminalId;
      const anchorDev = devices.find((d) => d.id === anchorDevId);
      const anchorTerm = anchorDev?.terminals.find((t) => t.id === anchorTermId);
      if (anchorDev && anchorTerm) {
        const anchorPos = getDeviceTerminalPosition(anchorDev, anchorTerm);
        const startPt: Point = { x: anchorPos.x, y: anchorPos.y };
        const endDir = mousePos.y > startPt.y ? (anchorPos.dir === 'down' ? 'up' : 'down') : 'up';
        const previewWaypoints = calculateOrthogonalPath(startPt, mousePos, anchorPos.dir, endDir, 34, 26);
        previewPathD = generateSvgPath(previewWaypoints, 8);
        previewColor = w.color;
      }
    }
  }

  const handleOpenPortMenu = React.useCallback((deviceId: string, terminalId: string, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPortMenu({
      deviceId,
      terminalId,
      x: Math.min(rect.width - 250, Math.max(12, clientX - rect.left + 8)),
      y: Math.min(rect.height - 160, Math.max(12, clientY - rect.top + 8)),
    });
  }, []);

  const terminalHighlightValue = useMemo(() => {
    const connectedTerminalKeys = new Set<string>();
    const highlightedWireEndpoints = new Map<string, HighlightedEndpointInfo>();

    for (const w of wires) {
      connectedTerminalKeys.add(`${w.fromDeviceId}:${w.fromTerminalId}`);
      connectedTerminalKeys.add(`${w.toDeviceId}:${w.toTerminalId}`);
    }

    const activeWire = selectedWireId ? wires.find((w) => w.id === selectedWireId) : undefined;
    if (activeWire) {
      const fromDev = devices.find((d) => d.id === activeWire.fromDeviceId);
      const toDev = devices.find((d) => d.id === activeWire.toDeviceId);
      const fromTerm = fromDev?.terminals.find((t) => t.id === activeWire.fromTerminalId);
      const toTerm = toDev?.terminals.find((t) => t.id === activeWire.toTerminalId);

      highlightedWireEndpoints.set(`${activeWire.fromDeviceId}:${activeWire.fromTerminalId}`, {
        role: 'FROM',
        label: fromTerm?.label || fromTerm?.name || activeWire.fromTerminalId,
        wireColor: activeWire.color,
        gauge: activeWire.wireGauge,
      });
      highlightedWireEndpoints.set(`${activeWire.toDeviceId}:${activeWire.toTerminalId}`, {
        role: 'TO',
        label: toTerm?.label || toTerm?.name || activeWire.toTerminalId,
        wireColor: activeWire.color,
        gauge: activeWire.wireGauge,
      });
    }

    return {
      connectedTerminalKeys,
      highlightedWireEndpoints,
      selectedWireColor: activeWire?.color ?? null,
      onPortContextMenu: handleOpenPortMenu,
    };
  }, [wires, devices, selectedWireId, handleOpenPortMenu]);

  return (
    <div
      className="relative w-full h-full bg-[#fbfaf8] overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Zoom / Pan Controls HUD (Light Theme) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/95 border border-stone-200/90 rounded-xl p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-sm transition"
          title="Zoom In"
        >
          +
        </button>
        <span className="text-xs font-mono text-stone-600 w-12 text-center font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-sm transition"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={fitToView}
          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-900 text-xs text-white rounded-lg font-bold transition"
          title="Zoom to fit the whole drawing (F)"
        >
          Fit
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-xs text-stone-600 rounded-lg font-medium transition"
          title="Reset to 100% at the origin"
        >
          1:1
        </button>
      </div>

      {/* Empty workbench onboarding */}
      {devices.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]" style={{ paddingLeft: insetLeft }}>
          <div className="max-w-md text-center bg-white/90 border border-stone-200 rounded-2xl px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-rose-600 mb-1">Empty workbench</div>
            <div className="text-base font-serif font-bold text-stone-900 mb-1.5">Drag a device from the library to begin</div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Click a terminal, then another terminal to run a conductor. Press <b>▶ Simulate</b> to energize.
              New here? Open <b>Examples</b> and try the <b>⚓ Marine DOL</b> or <b>🔄 Forward-Reverse</b> motor starter labs.
            </p>
          </div>
        </div>
      )}

      {/* Wire Tool Notice */}
      {wiringStart && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-rose-600 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-lg animate-pulse">
          Click destination terminal to complete connection (ESC or click board to cancel)
        </div>
      )}

      {/* Interactive SVG Surface */}
      <svg
        ref={containerRef}
        className={`w-full h-full ${
          isSpacePressed
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : isPanning
            ? 'cursor-grabbing'
            : 'cursor-default'
        }`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* Engineering CAD Grid Background Pattern (Warm Light Mode) */}
          <pattern id="smallGridLight" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0ece4" strokeWidth="0.8" />
          </pattern>
          <pattern id="majorGridLight" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGridLight)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e6dfd5" strokeWidth="1.2" />
          </pattern>
        </defs>

        {/* Canvas World Transform Group */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Grid Background */}
          <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#majorGridLight)" />

          {/* Layer 1: Wires */}
          <g id="wires-layer">
            {wires.map((wire) => (
              <WireRenderer
                key={wire.id}
                wire={wire}
                devices={devices}
                isSelected={selectedWireId === wire.id}
                standard={standard}
                currentAmps={solved.wireCurrents[wire.id] || 0}
                flowDirection={solved.wireFlowDirections?.[wire.id] || 'forward'}
                voltageDropPercent={solved.wireVoltageDropPercents[wire.id] || 0}
                onSelectWire={() => {
                  if (dmmMode) {
                    onDmmClampWire?.(wire.id);
                  } else {
                    onSelectWire(wire);
                  }
                }}
                onStartSegmentDrag={(wireId, segIdx, isHoriz, pt, waypoints, e) => {
                  if (isSimulating) {
                    onBlockedEdit?.('simulating');
                    return;
                  }
                  const coords = getSvgCoordinates(e);
                  setDraggingSegment({
                    wireId,
                    segmentIndex: segIdx,
                    isHorizontal: isHoriz,
                    startMouse: coords,
                    initialWaypoints: waypoints,
                  });
                }}
              />
            ))}
          </g>

          {/* Layer 2: Rubber-Band Preview Wire while Drawing or Rewiring */}
          {(wiringStart || rewiringTarget) && previewPathD && (
            <g id="wire-preview-layer" className="pointer-events-none">
              <path
                d={previewPathD}
                fill="none"
                stroke={previewColor}
                strokeWidth={3.6}
                strokeDasharray="6 4"
                strokeLinecap="round"
                className="animate-[dash_0.5s_linear_infinite]"
              />
            </g>
          )}

          {/* Layer 3: Electrical Devices (mounting tracks & utility boxes render beneath mounted breakers/switches) */}
          <TerminalHighlightContext.Provider value={terminalHighlightValue}>
            <g id="devices-layer">
              {[...devices]
                .sort((a, b) => {
                  const getOrder = (t: string) => (t === 'din_rail_track' ? 0 : t.includes('box') ? 1 : 2);
                  return getOrder(a.type) - getOrder(b.type);
                })
                .map((device) => (
                <DeviceRenderer
                  key={device.id}
                  device={device}
                  isSelected={selectedDeviceId === device.id}
                  isGroupMember={selectedDeviceIds.length > 1 && selectedDeviceIds.includes(device.id) && selectedDeviceId !== device.id}
                  dragLocked={isSimulating || !!device.state.locked}
                  selectedTerminalId={wiringStart ? `${wiringStart.dev.id}:${wiringStart.term.id}` : null}
                  hoveredTerminalId={hoveredTerminalId}
                  onDeviceMouseDown={handleDeviceMouseDown}
                  onTerminalMouseDown={handleTerminalMouseDown}
                  setHoveredTerminalId={setHoveredTerminalId}
                  onToggleState={onToggleDeviceState}
                  onPatchState={onPatchDeviceState}
                  isHighlighted={highlightDeviceIds.includes(device.id)}
                  onRotate={onRotateDevice}
                  onDuplicate={onDuplicateDevice}
                  onDelete={onDeleteDevice}
                />
              ))}
            </g>
          </TerminalHighlightContext.Provider>

          {/* Layer 3.5: CAD Snap & Alignment Guides */}
          {snapGuides && (snapGuides.x !== undefined || snapGuides.y !== undefined) && (
            <g id="snap-guides-layer" className="pointer-events-none">
              {snapGuides.x !== undefined && (
                <line
                  x1={snapGuides.x}
                  y1={-5000}
                  x2={snapGuides.x}
                  y2={5000}
                  stroke="#38bdf8"
                  strokeWidth={1.2}
                  strokeDasharray="6 4"
                  opacity={0.85}
                />
              )}
              {snapGuides.y !== undefined && (
                <line
                  x1={-5000}
                  y1={snapGuides.y}
                  x2={5000}
                  y2={snapGuides.y}
                  stroke="#38bdf8"
                  strokeWidth={1.2}
                  strokeDasharray="6 4"
                  opacity={0.85}
                />
              )}
            </g>
          )}

          {/* Layer 4: Sparks & Arc Flash Effects */}
          <g id="sparks-layer" className="pointer-events-none">
            {solved.sparks.map((spark) => {
              const isArc = spark.severity === 'arc_flash';
              const R = isArc ? 1.6 : 1;
              return (
                <g key={spark.id} transform={`translate(${spark.x}, ${spark.y})`}>
                  {isArc && <circle r={60} fill="#fde68a" opacity={0.35} className="animate-ping" />}
                  <circle r={26 * R} fill="#fef08a" opacity={0.85} className="animate-ping" />
                  <circle r={14 * R} fill={isArc ? '#f97316' : '#e11d48'} opacity={0.92} />
                  <circle r={6 * R} fill="#ffffff" />
                  {/* Spark Rays */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                    <line
                      key={deg}
                      x1={0}
                      y1={0}
                      x2={(i % 2 ? 22 : 32) * R * Math.cos((deg * Math.PI) / 180)}
                      y2={(i % 2 ? 22 : 32) * R * Math.sin((deg * Math.PI) / 180)}
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  ))}
                  {/* Fault Banner */}
                  <rect x={-96} y={-48 * R - 8} width={192} height={24} rx={6} fill={isArc ? '#7c2d12' : '#e11d48'} stroke="#fde68a" strokeWidth={1.2} />
                  <text x={0} y={-48 * R + 8} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#ffffff">
                    {isArc ? '💥 PHASE-TO-PHASE ARC FLASH' : '⚡ ARC FAULT DETECTED'}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Active Rewire Banner */}
      {rewiringTarget && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-sky-400 bg-slate-900/95 px-4 py-1.5 text-xs font-bold text-sky-100 shadow-lg backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
          <span>Click destination port to move this wire end (Esc to cancel)</span>
          <button
            onClick={() => onSetRewiringTarget?.(null)}
            className="ml-1 rounded-full bg-slate-700 hover:bg-slate-600 px-2 py-0.5 text-[10px] text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Quick Rewire / Disconnect Handles for Selected Wire (rendered only when a wire is selected in Edit Mode) */}
      {selectedWireId && !isSimulating && !rewiringTarget && (() => {
        const w = wires.find((item) => item.id === selectedWireId);
        if (!w) return null;
        const fromDev = devices.find((d) => d.id === w.fromDeviceId);
        const toDev = devices.find((d) => d.id === w.toDeviceId);
        const fromTerm = fromDev?.terminals.find((t) => t.id === w.fromTerminalId);
        const toTerm = toDev?.terminals.find((t) => t.id === w.toTerminalId);
        if (!fromDev || !toDev || !fromTerm || !toTerm) return null;
        const pFrom = getDeviceTerminalPosition(fromDev, fromTerm);
        const pTo = getDeviceTerminalPosition(toDev, toTerm);
        const sxFrom = pFrom.x * zoom + pan.x;
        const syFrom = pFrom.y * zoom + pan.y;
        const sxTo = pTo.x * zoom + pan.x;
        const syTo = pTo.y * zoom + pan.y;
        return (
          <div className="pointer-events-none absolute inset-0 z-20">
            {[
              { key: 'from' as const, x: sxFrom, y: syFrom, label: fromTerm.label || fromTerm.id },
              { key: 'to' as const, x: sxTo, y: syTo, label: toTerm.label || toTerm.id },
            ].map((ep) => (
              <div
                key={ep.key}
                style={{ left: ep.x + 14, top: ep.y - 12 }}
                className="pointer-events-auto absolute flex items-center gap-1 rounded-lg border border-sky-400/90 bg-slate-900/95 px-1.5 py-0.5 shadow-xl text-[10px] font-bold text-white"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetRewiringTarget?.({ wireId: w.id, moveEnd: ep.key });
                  }}
                  className="hover:text-sky-300 transition flex items-center gap-0.5"
                  title={`Rewire ${ep.label} to another port`}
                >
                  <span>⇄ Rewire</span>
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWire?.(w.id);
                  }}
                  className="hover:text-rose-400 transition"
                  title="Disconnect wire"
                >
                  ✂
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Connected-Port Context Popover (ONLY appears when right-clicking a port that has >= 1 attached wire) */}
      {portMenu && (() => {
        const portDev = devices.find((d) => d.id === portMenu.deviceId);
        const portTerm = portDev?.terminals.find((t) => t.id === portMenu.terminalId);
        const attached = wires
          .map((w) => {
            if (w.fromDeviceId === portMenu.deviceId && w.fromTerminalId === portMenu.terminalId) {
              return { wire: w, moveEnd: 'from' as const, peerDevId: w.toDeviceId, peerTermId: w.toTerminalId };
            }
            if (w.toDeviceId === portMenu.deviceId && w.toTerminalId === portMenu.terminalId) {
              return { wire: w, moveEnd: 'to' as const, peerDevId: w.fromDeviceId, peerTermId: w.fromTerminalId };
            }
            return null;
          })
          .filter((x): x is NonNullable<typeof x> => !!x);
        if (attached.length === 0) return null;

        return (
          <div
            style={{ left: portMenu.x, top: portMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute z-40 w-64 rounded-xl border border-slate-600 bg-slate-900/95 p-2.5 shadow-2xl backdrop-blur-md text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Port {portTerm?.label || portMenu.terminalId} Connections ({attached.length})
              </div>
              <button
                onClick={() => setPortMenu(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {attached.map(({ wire, moveEnd, peerDevId, peerTermId }) => {
                const peerDev = devices.find((d) => d.id === peerDevId);
                const peerTerm = peerDev?.terminals.find((t) => t.id === peerTermId);
                return (
                  <div
                    key={wire.id}
                    className="rounded-lg bg-slate-800/90 border border-slate-700 px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/60"
                        style={{ backgroundColor: wire.color }}
                      />
                      <span className="font-mono font-bold truncate text-slate-200">
                        {wire.label ? `${wire.label} · ` : ''}↔ {peerDev?.name?.split(' ')[0] || 'Dev'}:{peerTerm?.label || peerTermId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setPortMenu(null);
                          if (isSimulating) {
                            onBlockedEdit?.('simulating');
                            return;
                          }
                          onSetRewiringTarget?.({ wireId: wire.id, moveEnd });
                        }}
                        className="flex-1 rounded-md bg-sky-600 hover:bg-sky-500 px-2 py-1 text-[10px] font-bold text-white transition"
                      >
                        ⇄ Rewire to New Port
                      </button>
                      <button
                        onClick={() => {
                          setPortMenu(null);
                          onDeleteWire?.(wire.id);
                        }}
                        className="rounded-md bg-rose-900/80 hover:bg-rose-700 border border-rose-700 px-2 py-1 text-[10px] font-bold text-rose-100 transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Handheld Digital Multimeter / Clamp Meter HUD */}
      {dmmMode && (
        <div className="pointer-events-none absolute bottom-10 right-4 z-30 w-64 rounded-xl border-2 border-amber-500/80 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                True RMS DMM / Clamp
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400">CAT IV 600V</span>
          </div>
          <div className="rounded-lg bg-emerald-950/80 border border-emerald-700/50 px-3 py-2 font-mono">
            <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider">
              {dmmReadout?.label || 'Click 2 terminals (V) or 1 wire (A)'}
            </div>
            <div className="text-2xl font-black text-emerald-300 tracking-tight mt-0.5">
              {dmmReadout?.primary || '---'}
            </div>
            {dmmReadout?.secondary && (
              <div className="text-[11px] text-emerald-400/90 mt-0.5">{dmmReadout.secondary}</div>
            )}
          </div>
        </div>
      )}

      {/* Translucent Project & Institution Watermark */}
      <div
        className={`pointer-events-none select-none absolute ${
          dmmMode ? 'bottom-3 left-4' : 'bottom-3 right-4'
        } z-20 rounded-lg border border-stone-300/60 border-l-[3px] border-l-teal-700/75 bg-[#fcfaf5]/65 backdrop-blur-[1px] px-3 py-2 opacity-45`}
      >
        <div className="font-mono text-[9.5px] font-semibold tracking-wider text-teal-800 border-b border-stone-300/70 pb-1 mb-1">
          MARINE HV DIGITAL TWIN · STCW A-III/6
        </div>
        <div className="font-mono text-[9.5px] leading-[1.45] grid grid-cols-[78px_auto] gap-x-2 text-stone-700">
          <span className="text-stone-500">DEVELOPED BY</span>
          <span className="font-medium text-stone-800">: John Ray O. Dalida</span>
          <span className="text-stone-500">STUDENT ID</span>
          <span className="font-medium text-stone-800">: EE - 2022102981</span>
          <span className="text-stone-500">INSTRUCTOR</span>
          <span className="font-medium text-stone-800">: Engr. Nathaniel Sedilla</span>
          <span className="text-stone-500">INSTITUTION</span>
          <span className="font-medium text-stone-800">: Mapúa University</span>
        </div>
      </div>
    </div>
  );
};
