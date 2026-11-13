import React from 'react';
import { ElectricalWire, ElectricalDevice, CodeStandard } from '../../types/electrical';
import { calculateOrthogonalPath, generateSvgPath, Point, getDeviceTerminalPosition } from '../../core/wireRouter';

interface WireRendererProps {
  wire: ElectricalWire;
  devices: ElectricalDevice[];
  isSelected?: boolean;
  standard?: CodeStandard;
  currentAmps?: number;
  flowDirection?: 'forward' | 'reverse';
  voltageDropPercent?: number;
  onSelectWire?: (wire: ElectricalWire, e: React.MouseEvent) => void;
  onStartSegmentDrag?: (
    wireId: string,
    segmentIndex: number,
    isHorizontal: boolean,
    startPt: Point,
    initialWaypoints: Point[],
    e: React.MouseEvent
  ) => void;
}

export const WireRenderer: React.FC<WireRendererProps> = ({
  wire,
  devices,
  isSelected,
  currentAmps = 0,
  flowDirection = 'forward',
  voltageDropPercent = 0,
  onSelectWire,
  onStartSegmentDrag,
}) => {
  const fromDev = devices.find(d => d.id === wire.fromDeviceId);
  const toDev = devices.find(d => d.id === wire.toDeviceId);

  if (!fromDev || !toDev) return null;

  const fromTerm = fromDev.terminals.find(t => t.id === wire.fromTerminalId);
  const toTerm = toDev.terminals.find(t => t.id === wire.toTerminalId);

  if (!fromTerm || !toTerm) return null;

  // Compute absolute pixel coordinates and exit directions taking rotation into account
  const fromPos = getDeviceTerminalPosition(fromDev, fromTerm);
  const toPos = getDeviceTerminalPosition(toDev, toTerm);

  const start: Point = { x: fromPos.x, y: fromPos.y };
  const end: Point = { x: toPos.x, y: toPos.y };
  const startDir = fromPos.dir;
  const endDir = toPos.dir;

  // Stagger lead-out distance across multiple terminals to keep wires in clean parallel lanes
  const startLane = Math.round((fromTerm.relX - 0.5) * 28);
  const endLane = Math.round((toTerm.relX - 0.5) * 28);

  const startLeadOut = Math.max(26, 36 + (startDir === 'down' ? startLane : -startLane));
  const endLeadOut = Math.max(26, 36 + (endDir === 'down' ? endLane : -endLane));

  // Ensure wire endpoints are 100% attached to device terminals at all times
  let waypoints: Point[];
  if (wire.waypoints && wire.waypoints.length >= 2) {
    const pts = wire.waypoints.map(p => ({ ...p }));
    const oldStart = pts[0];
    const oldEnd = pts[pts.length - 1];
    const dStartX = start.x - oldStart.x;
    const dStartY = start.y - oldStart.y;
    const dEndX = end.x - oldEnd.x;
    const dEndY = end.y - oldEnd.y;

    // Anchor first and last points permanently to terminal coordinates
    pts[0] = { ...start };
    pts[pts.length - 1] = { ...end };

    // If start device moved, adapt the adjacent lead-out point (pts[1]) so the stem follows
    if (pts.length > 2 && (Math.abs(dStartX) > 0.5 || Math.abs(dStartY) > 0.5)) {
      if (Math.abs(oldStart.x - pts[1].x) < 3) {
        pts[1] = { x: start.x, y: pts[1].y + dStartY };
      } else if (Math.abs(oldStart.y - pts[1].y) < 3) {
        pts[1] = { x: pts[1].x + dStartX, y: start.y };
      } else {
        pts[1] = { x: pts[1].x + dStartX, y: pts[1].y + dStartY };
      }
    }

    // If end device moved, adapt pts[last - 1]
    const last = pts.length - 1;
    if (pts.length > 2 && (Math.abs(dEndX) > 0.5 || Math.abs(dEndY) > 0.5)) {
      if (Math.abs(oldEnd.x - pts[last - 1].x) < 3) {
        pts[last - 1] = { x: end.x, y: pts[last - 1].y + dEndY };
      } else if (Math.abs(oldEnd.y - pts[last - 1].y) < 3) {
        pts[last - 1] = { x: pts[last - 1].x + dEndX, y: end.y };
      } else {
        pts[last - 1] = { x: pts[last - 1].x + dEndX, y: pts[last - 1].y + dEndY };
      }
    }

    waypoints = pts;
  } else {
    waypoints = calculateOrthogonalPath(start, end, startDir, endDir, startLeadOut, endLeadOut);
  }

  const pathD = generateSvgPath(waypoints, 8);

  // Wire thickness scaled by gauge
  let strokeWidth = 3.6;
  if (wire.wireGauge.includes('14') || wire.wireGauge.includes('1.5')) strokeWidth = 3.0;
  else if (wire.wireGauge.includes('12') || wire.wireGauge.includes('2.5')) strokeWidth = 3.6;
  else if (wire.wireGauge.includes('10') || wire.wireGauge.includes('4.0')) strokeWidth = 4.4;
  else if (wire.wireGauge.includes('8') || wire.wireGauge.includes('6.0') || wire.wireGauge.includes('10.0')) strokeWidth = 5.4;

  const isEnergized = currentAmps > 0.05;

  return (
    <g
      data-wire-id={wire.id}
      onMouseDown={(e) => {
        if (e.button === 0 && !e.altKey && onSelectWire) {
          onSelectWire(wire, e);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectWire?.(wire, e);
      }}
      className="cursor-pointer group"
    >
      {/* Invisible wider hit target for easy clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wire Drop Shadow (Soft Light Mode) */}
      <path
        d={pathD}
        fill="none"
        stroke="#78716c"
        strokeWidth={strokeWidth}
        opacity={0.16}
        transform="translate(1, 2)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Selected Halo Outline */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#0284c7"
          strokeWidth={strokeWidth + 4}
          opacity={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Main Insulated Conductor Path */}
      <path
        d={pathD}
        fill="none"
        stroke={wire.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-150 group-hover:brightness-90"
      />

      {/* Current Flow Energy Animation (Moving Dash Pattern with Forward/Return Direction) */}
      {isEnergized && (
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth={strokeWidth * 0.45}
          strokeDasharray="4 8"
          opacity={0.85}
          strokeLinecap="round"
          className={flowDirection === 'reverse' ? "animate-[dash-reverse_1s_linear_infinite]" : "animate-[dash_1s_linear_infinite]"}
          style={{
            strokeDashoffset: 100,
            animationDuration: currentAmps > 10 ? '0.6s' : '1.2s'
          }}
        />
      )}

      {/* Terminal Wire End Lug Rings */}
      <circle cx={start.x} cy={start.y} r={strokeWidth * 0.75} fill="#d97706" stroke="#78350f" strokeWidth={0.8} />
      <circle cx={end.x} cy={end.y} r={strokeWidth * 0.75} fill="#d97706" stroke="#78350f" strokeWidth={0.8} />

      {/* Draggable Wire Segment Grip Handles (shown when selected) */}
      {isSelected && onStartSegmentDrag && waypoints.slice(0, waypoints.length - 1).map((pA, idx) => {
        const pB = waypoints[idx + 1];
        const isHoriz = Math.abs(pA.y - pB.y) < 1.5;
        const len = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        if (len < 16) return null;

        const midX = (pA.x + pB.x) / 2;
        const midY = (pA.y + pB.y) / 2;

        return (
          <g
            key={`grip_${idx}`}
            transform={`translate(${midX}, ${midY})`}
            className={isHoriz ? "cursor-ns-resize" : "cursor-ew-resize"}
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartSegmentDrag(wire.id, idx, isHoriz, { x: midX, y: midY }, waypoints, e);
            }}
          >
            <rect
              x={isHoriz ? -14 : -6}
              y={isHoriz ? -6 : -14}
              width={isHoriz ? 28 : 12}
              height={isHoriz ? 12 : 28}
              rx={5}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth={1.5}
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
              className="hover:scale-110 transition-transform"
            />
            {isHoriz ? (
              <>
                <line x1={-6} y1={-2} x2={6} y2={-2} stroke="#ffffff" strokeWidth={1} strokeLinecap="round" />
                <line x1={-6} y1={2} x2={6} y2={2} stroke="#ffffff" strokeWidth={1} strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1={-2} y1={-6} x2={-2} y2={6} stroke="#ffffff" strokeWidth={1} strokeLinecap="round" />
                <line x1={2} y1={-6} x2={2} y2={6} stroke="#ffffff" strokeWidth={1} strokeLinecap="round" />
              </>
            )}
          </g>
        );
      })}

      {/* Circuit / Wire Tag Pill */}
      {wire.label && wire.label.trim().length > 0 && (
        <g
          transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2 - (voltageDropPercent > 3.0 ? 18 : 0)})`}
          className="pointer-events-none"
        >
          <rect
            x={-Math.max(24, wire.label.trim().length * 3.8 + 8)}
            y={-9}
            width={Math.max(48, wire.label.trim().length * 7.6 + 16)}
            height={18}
            rx={4}
            fill={isSelected ? '#0284c7' : '#0f172a'}
            stroke={isSelected ? '#bae6fd' : '#475569'}
            strokeWidth={1}
          />
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight="700"
            fontFamily="monospace"
            fill="#f8fafc"
          >
            {wire.label.trim()}
          </text>
        </g>
      )}

      {/* High Voltage Drop Alert Tag */}
      {voltageDropPercent > 3.0 && (
        <g transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}>
          <rect x={-24} y={-10} width={48} height={14} rx={3} fill="#e11d48" />
          <text x={0} y={1} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#ffffff">
            ΔV {voltageDropPercent.toFixed(1)}%
          </text>
        </g>
      )}
    </g>
  );
};
