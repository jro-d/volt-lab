import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface SocketProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const SocketDevice: React.FC<SocketProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width = 110, height = 70 } = device;
  const isPowered = !!device.state.powered;
  const isRearView = device.state.viewMode === 'rear';

  const handleToggleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.viewMode = isRearView ? 'front' : 'rear';
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Faceplate Smooth Plastic Gradient */}
        <linearGradient id={`plateGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Modular Socket Cavity Gradient */}
        <radialGradient id={`socketCavity_${device.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="85%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>

        {/* Galvanized Mounting Strap Metal Gradient */}
        <linearGradient id={`metalStrap_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Snap-in Module Green Housing Gradient (Philippine Wide Series Standard) */}
        <linearGradient id={`greenModule_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="40%" stopColor="#166534" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>

        {/* Brass Screw Terminal Gradient */}
        <radialGradient id={`brassScrew_${device.id}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#eab308" />
          <stop offset="85%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </radialGradient>

        {/* Silver Neutral Screw Terminal Gradient */}
        <radialGradient id={`silverScrew_${device.id}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="85%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </radialGradient>
      </defs>

      {/* Drop Shadow */}
      <rect
        x={2}
        y={3}
        width={width}
        height={height}
        rx={6}
        fill="#000000"
        opacity={0.14}
      />

      {!isRearView ? (
        /* ========================================================
           FRONT VIEW: Clean Philippine Wide-Series Duplex Faceplate
           ======================================================== */
        <g id="front-faceplate">
          {/* Main Wall Plate Base */}
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={6}
            fill={`url(#plateGrad_${device.id})`}
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />

          {/* Chamfered Bevel Inner Rim */}
          <rect
            x={3}
            y={3}
            width={width - 6}
            height={height - 6}
            rx={4}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.2}
          />

          {/* Faceplate Screws (Left & Right Countersunk Screws) */}
          <circle cx={8} cy={height / 2} r={2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
          <circle cx={width - 8} cy={height / 2} r={2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />

          {/* Left Receptacle Well (Module 1) */}
          <g transform={`translate(${width * 0.16}, ${height * 0.18})`}>
            <rect
              x={0}
              y={0}
              width={width * 0.30}
              height={height * 0.64}
              rx={4}
              fill={`url(#socketCavity_${device.id})`}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            {/* Top Parallel Slot (Neutral - slightly wider) */}
            <rect x={width * 0.06} y={8} width={width * 0.18} height={4} rx={1} fill="#0f172a" stroke="#94a3b8" strokeWidth={0.5} />
            {/* Bottom Parallel Slot (Live - slightly narrower) */}
            <rect x={width * 0.07} y={22} width={width * 0.16} height={3.5} rx={1} fill="#0f172a" stroke="#ca8a04" strokeWidth={0.5} />
            {/* Ground Pin Hole (D-shape) */}
            <path
              d={`M ${width * 0.15 - 4} 34 A 3 3 0 0 1 ${width * 0.15 + 4} 34 L ${width * 0.15 + 4} 37 L ${width * 0.15 - 4} 37 Z`}
              fill="#0f172a"
              stroke="#16a34a"
              strokeWidth={0.6}
            />
          </g>

          {/* Right Receptacle Well (Module 2) */}
          <g transform={`translate(${width * 0.54}, ${height * 0.18})`}>
            <rect
              x={0}
              y={0}
              width={width * 0.30}
              height={height * 0.64}
              rx={4}
              fill={`url(#socketCavity_${device.id})`}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            {/* Top Parallel Slot (Neutral) */}
            <rect x={width * 0.06} y={8} width={width * 0.18} height={4} rx={1} fill="#0f172a" stroke="#94a3b8" strokeWidth={0.5} />
            {/* Bottom Parallel Slot (Live) */}
            <rect x={width * 0.07} y={22} width={width * 0.16} height={3.5} rx={1} fill="#0f172a" stroke="#ca8a04" strokeWidth={0.5} />
            {/* Ground Pin Hole */}
            <path
              d={`M ${width * 0.15 - 4} 34 A 3 3 0 0 1 ${width * 0.15 + 4} 34 L ${width * 0.15 + 4} 34 L ${width * 0.15 + 4} 37 L ${width * 0.15 - 4} 37 Z`}
              fill="#0f172a"
              stroke="#16a34a"
              strokeWidth={0.6}
            />
          </g>

          {/* Center Status Glow LED (lit green when energized) */}
          <circle
            cx={width / 2}
            cy={height * 0.35}
            r={isPowered ? 3.5 : 2.5}
            fill={isPowered ? '#22c55e' : '#94a3b8'}
            className={isPowered ? 'animate-pulse' : ''}
          />
          {isPowered && (
            <circle cx={width / 2} cy={height * 0.35} r={7} fill="#22c55e" opacity={0.25} />
          )}

          {/* Spec Text Label */}
          <text
            x={width / 2}
            y={height * 0.88}
            textAnchor="middle"
            fontSize={6.5}
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#64748b"
          >
            250V~ 16A DUPLEX (PEC)
          </text>
        </g>
      ) : (
        /* ========================================================
           REAR VIEW: Detailed Snap-in Modular Units & Screw Clamps
           (Directly matching the user's reference photograph)
           ======================================================== */
        <g id="rear-mechanism">
          {/* Galvanized Steel Mounting Strap Frame */}
          <rect
            x={-3}
            y={-2}
            width={width + 6}
            height={height + 4}
            rx={4}
            fill={`url(#metalStrap_${device.id})`}
            stroke="#475569"
            strokeWidth={1}
          />

          {/* Top & Bottom Mounting Yoke Holes */}
          <ellipse cx={8} cy={height / 2} rx={2} ry={4} fill="#1e293b" />
          <ellipse cx={width - 8} cy={height / 2} rx={2} ry={4} fill="#1e293b" />

          {/* Central Housing Recess */}
          <rect
            x={14}
            y={4}
            width={width - 28}
            height={height - 8}
            rx={3}
            fill="#0f172a"
          />

          {/* Module 1 Body (Left Snap-in Gang - Classic Philippine Green Module) */}
          <g transform={`translate(${18}, ${7})`}>
            <rect
              x={0}
              y={0}
              width={(width - 44) / 2}
              height={height - 14}
              rx={3}
              fill={`url(#greenModule_${device.id})`}
              stroke="#064e3b"
              strokeWidth={1}
            />
            {/* Snap Clip Ribs */}
            <line x1={4} y1={height / 2 - 7} x2={(width - 44) / 2 - 4} y2={height / 2 - 7} stroke="#047857" strokeWidth={1.5} />
            {/* Gang 1 ID */}
            <text x={(width - 44) / 4} y={height / 2 - 4} textAnchor="middle" fontSize={6} fill="#a7f3d0" fontWeight="bold">
              GANG 1
            </text>
          </g>

          {/* Module 2 Body (Right Snap-in Gang) */}
          <g transform={`translate(${18 + (width - 44) / 2 + 8}, ${7})`}>
            <rect
              x={0}
              y={0}
              width={(width - 44) / 2}
              height={height - 14}
              rx={3}
              fill={`url(#greenModule_${device.id})`}
              stroke="#064e3b"
              strokeWidth={1}
            />
            {/* Snap Clip Ribs */}
            <line x1={4} y1={height / 2 - 7} x2={(width - 44) / 2 - 4} y2={height / 2 - 7} stroke="#047857" strokeWidth={1.5} />
            {/* Gang 2 ID */}
            <text x={(width - 44) / 4} y={height / 2 - 4} textAnchor="middle" fontSize={6} fill="#a7f3d0" fontWeight="bold">
              GANG 2
            </text>
          </g>

          {/* INTER-MODULE JUMPER WIRES (Crucial hands-on educational feature from photo) */}
          {/* 1. Bottom Line Jumper (Red Insulated Wire between Gang 1 Brass and Gang 2 Brass) */}
          <path
            d={`M ${width * 0.28} ${height * 0.88} C ${width * 0.40} ${height * 0.72}, ${width * 0.60} ${height * 0.72}, ${width * 0.72} ${height * 0.88}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          {/* Highlight sheen on red jumper */}
          <path
            d={`M ${width * 0.30} ${height * 0.87} C ${width * 0.41} ${height * 0.74}, ${width * 0.59} ${height * 0.74}, ${width * 0.70} ${height * 0.87}`}
            fill="none"
            stroke="#f87171"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* 2. Top Neutral Jumper (Black/Blue Insulated Wire between Gang 1 Silver and Gang 2 Silver) */}
          <path
            d={`M ${width * 0.28} ${height * 0.12} C ${width * 0.40} ${height * 0.28}, ${width * 0.60} ${height * 0.28}, ${width * 0.72} ${height * 0.12}`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          {/* Highlight sheen on neutral jumper */}
          <path
            d={`M ${width * 0.30} ${height * 0.13} C ${width * 0.41} ${height * 0.26}, ${width * 0.59} ${height * 0.26}, ${width * 0.70} ${height * 0.13}`}
            fill="none"
            stroke="#475569"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* PHYSICAL SCREW TERMINALS */}
          {/* Neutral Terminals (Silver Screws - Top) */}
          {/* N1 Screw (Module 1) */}
          <g transform={`translate(${width * 0.28}, ${height * 0.12})`}>
            <circle cx={0} cy={0} r={5} fill={`url(#silverScrew_${device.id})`} stroke="#334155" strokeWidth={0.8} />
            <line x1={-3.5} y1={-1.5} x2={3.5} y2={1.5} stroke="#1e293b" strokeWidth={1} />
          </g>
          {/* N2 Screw (Module 2) */}
          <g transform={`translate(${width * 0.72}, ${height * 0.12})`}>
            <circle cx={0} cy={0} r={5} fill={`url(#silverScrew_${device.id})`} stroke="#334155" strokeWidth={0.8} />
            <line x1={-3.5} y1={-1.5} x2={3.5} y2={1.5} stroke="#1e293b" strokeWidth={1} />
          </g>

          {/* Line Terminals (Brass Screws - Bottom) */}
          {/* L1 Screw (Module 1) */}
          <g transform={`translate(${width * 0.28}, ${height * 0.88})`}>
            <circle cx={0} cy={0} r={5} fill={`url(#brassScrew_${device.id})`} stroke="#713f12" strokeWidth={0.8} />
            <line x1={-3.5} y1={1.5} x2={3.5} y2={-1.5} stroke="#451a03" strokeWidth={1} />
          </g>
          {/* L2 Screw (Module 2) */}
          <g transform={`translate(${width * 0.72}, ${height * 0.88})`}>
            <circle cx={0} cy={0} r={5} fill={`url(#brassScrew_${device.id})`} stroke="#713f12" strokeWidth={0.8} />
            <line x1={-3.5} y1={1.5} x2={3.5} y2={-1.5} stroke="#451a03" strokeWidth={1} />
          </g>

          {/* Green Grounding Hex Screw (Center Strap) */}
          <g transform={`translate(${width * 0.50}, ${height * 0.50})`}>
            <polygon points="0,-4.5 4,-2 4,2 0,4.5 -4,2 -4,-2" fill="#16a34a" stroke="#14532d" strokeWidth={0.8} />
            <text x={0} y={1.5} textAnchor="middle" fontSize={5} fill="#ffffff" fontWeight="bold">⏚</text>
          </g>

          {/* Terminal Descriptive Markings */}
          <text x={width * 0.28} y={height * 0.28} textAnchor="middle" fontSize={5.5} fill="#cbd5e1" fontWeight="bold">
            NEUT 1
          </text>
          <text x={width * 0.72} y={height * 0.28} textAnchor="middle" fontSize={5.5} fill="#cbd5e1" fontWeight="bold">
            NEUT 2
          </text>
          <text x={width * 0.28} y={height * 0.76} textAnchor="middle" fontSize={5.5} fill="#fde047" fontWeight="bold">
            LINE 1
          </text>
          <text x={width * 0.72} y={height * 0.76} textAnchor="middle" fontSize={5.5} fill="#fde047" fontWeight="bold">
            LINE 2
          </text>
        </g>
      )}

      {/* 1-Click Front / Rear Perspective Flip Pill Badge */}
      <g
        transform={`translate(${width - 4}, -4)`}
        className="cursor-pointer group"
        onClick={handleToggleView}
      >
        <rect
          x={-44}
          y={-10}
          width={48}
          height={14}
          rx={7}
          fill={isRearView ? '#0284c7' : '#059669'}
          stroke="#ffffff"
          strokeWidth={1}
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
          className="transition-all hover:scale-105"
        />
        <text
          x={-20}
          y={0}
          textAnchor="middle"
          fontSize={6.5}
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#ffffff"
        >
          {isRearView ? '🔄 Front' : '🔄 Rear'}
        </text>
      </g>

      {/* Terminal Connection Points */}
      {device.terminals.map((t) => {
        const tx = width * t.relX;
        const ty = height * t.relY;
        const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
        const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={tx}
            y={ty}
            isHovered={isHovered}
            isSelected={isSelected}
            onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
            onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
            onMouseLeave={() => setHoveredTerminalId(null)}
          />
        );
      })}
    </g>
  );
};
