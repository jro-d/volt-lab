import React, { useRef, useState } from 'react';
import { ElectricalDevice, ElectricalWire, DeviceTerminal, CodeStandard, WiringMode, DeviceType } from '../../types/electrical';
import { DeviceRenderer } from '../devices/DeviceRenderer';
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
  onConnectWire: (fromDevId: string, fromTermId: string, toDevId: string, toTermId: string, mode?: WiringMode) => void;
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
  onConnectWire,
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
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredTerminalId, setHoveredTerminalId] = useState<string | null>(null);

  // Pan and Zoom
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Keyboard shortcut listener (ESC to cancel wiring / deselect, Space for panning)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (wiringStart) {
          setWiringStart(null);
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
  }, [wiringStart, onSelectDevice, onSelectWire]);

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

    // Shift+click builds a multi-selection (used by Align H / Align V)
    if (e.shiftKey) {
      onSelectDevice(device.id, true);
      onSelectWire(null);
      return;
    }

    onSelectDevice(device.id);
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

    setDraggingDevId(device.id);
    setDragOffset({
      x: coords.x - device.x,
      y: coords.y - device.y,
    });
  };

  const handleTerminalMouseDown = (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSimulating) {
      // Wire creation is locked while the grid is energized
      onBlockedEdit?.('simulating');
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
      const newX = snapValue(coords.x - dragOffset.x);
      const newY = snapValue(coords.y - dragOffset.y);
      onUpdateDevicePosition(draggingDevId, Math.max(10, newX), Math.max(10, newY));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingDevId(null);
    setIsPanning(false);
    setDraggingSegment(null);
    blockedDragRef.current = null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle-click (1), Right-click (2), Alt-click, or Spacebar-drag for smooth canvas panning
    if (e.button === 1 || e.button === 2 || e.altKey || isSpacePressed) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    } else {
      // Left click on empty space deselects
      onSelectDevice(null);
      onSelectWire(null);
      if (wiringStart) {
        setWiringStart(null);
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

  // Preview path while drawing a wire
  let previewPathD = '';
  if (wiringStart) {
    const fromPos = getDeviceTerminalPosition(wiringStart.dev, wiringStart.term);
    const startPt: Point = { x: fromPos.x, y: fromPos.y };
    const startDir = fromPos.dir;
    const endDir = mousePos.y > startPt.y ? (startDir === 'down' ? 'up' : 'down') : 'up';
    const previewWaypoints = calculateOrthogonalPath(startPt, mousePos, startDir, endDir, 34, 26);
    previewPathD = generateSvgPath(previewWaypoints, 8);
  }

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
                onSelectWire={() => onSelectWire(wire)}
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

          {/* Layer 2: Rubber-Band Preview Wire while Drawing */}
          {wiringStart && previewPathD && (
            <g id="wire-preview-layer" className="pointer-events-none">
              <path
                d={previewPathD}
                fill="none"
                stroke={activeWireColor}
                strokeWidth={3.6}
                strokeDasharray="6 4"
                strokeLinecap="round"
                className="animate-[dash_0.5s_linear_infinite]"
              />
            </g>
          )}

          {/* Layer 3: Electrical Devices (mounting tracks & utility boxes render beneath mounted breakers/switches) */}
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
    </div>
  );
};
