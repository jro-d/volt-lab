import React from 'react';
import { ElectricalWire, ElectricalDevice, CodeStandard } from '../../types/electrical';
import { computeWireRoute, generateSvgPath, Point } from '../../core/wireRouter';

interface WireRendererProps {
  wire: ElectricalWire;
  devices: ElectricalDevice[];
  isSelected?: boolean;
  /** Show the segment drag grips (hidden while several wires are selected) */
  showGrips?: boolean;
  standard?: CodeStandard;
  currentAmps?: number;
  flowDirection?: 'forward' | 'reverse';
  voltageDropPercent?: number;
  onSelectWire?: (wire: ElectricalWire, e: React.MouseEvent) => void;
  onOpenInspector?: () => void;
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
  showGrips = true,
  currentAmps = 0,
  flowDirection = 'forward',
  voltageDropPercent = 0,
  onSelectWire,
  onOpenInspector,
  onStartSegmentDrag,
}) => {
  const route = computeWireRoute(wire, devices);
  if (!route) return null;
  const { waypoints, start, end } = route;

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
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpenInspector?.();
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
      {isSelected && showGrips && onStartSegmentDrag && waypoints.slice(0, waypoints.length - 1).map((pA, idx) => {
        const pB = waypoints[idx + 1];
        const isHoriz = Math.abs(pA.y - pB.y) < 1.5;
        const len = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        // Segments touching a terminal stay anchored (dragging them would slant the wire)
        if (len < 16 || idx === 0 || idx === waypoints.length - 2) return null;

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
