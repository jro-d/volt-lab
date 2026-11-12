import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface DinRailTrackProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const DinRailTrackDevice: React.FC<DinRailTrackProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
}) => {
  const width = device.state.trackWidth || device.width || 260;
  const height = device.height || 36;

  // Generate mounting slot positions every 25px
  const slotCount = Math.floor((width - 30) / 25);
  const slots: number[] = [];
  for (let i = 0; i <= slotCount; i++) {
    slots.push(20 + i * 25);
  }

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Metallic Zinc-Plated Chromate Gradient */}
        <linearGradient id={`railGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="15%" stopColor="#94a3b8" />
          <stop offset="35%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="85%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        <linearGradient id={`slotShadow_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* 1. Drop Shadow under DIN Rail */}
      <rect
        x={2}
        y={3}
        width={width}
        height={height}
        rx={2}
        fill="#000000"
        opacity={0.16}
      />

      {/* 2. Top-Hat Rail Flange Profile (35mm Standard DIN EN 50022) */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={1.5}
        fill={`url(#railGrad_${device.id})`}
        stroke="#475569"
        strokeWidth={1}
      />

      {/* Flange Bend Lines (Top & Bottom Raised Lips) */}
      <line x1={0} y1={6} x2={width} y2={6} stroke="#ffffff" strokeWidth={1} opacity={0.8} />
      <line x1={0} y1={10} x2={width} y2={10} stroke="#475569" strokeWidth={0.8} opacity={0.5} />
      <line x1={0} y1={height - 10} x2={width} y2={height - 10} stroke="#475569" strokeWidth={0.8} opacity={0.5} />
      <line x1={0} y1={height - 6} x2={width} y2={height - 6} stroke="#334155" strokeWidth={1} opacity={0.8} />

      {/* 3. Punched Slots (Oval mounting holes along the spine) */}
      {slots.map((sx) => (
        <g key={sx}>
          {/* Recessed slot hole */}
          <rect
            x={sx - 7}
            y={height / 2 - 5}
            width={14}
            height={10}
            rx={4}
            fill={`url(#slotShadow_${device.id})`}
            stroke="#334155"
            strokeWidth={0.5}
          />
          {/* Backplate screw highlight */}
          <circle cx={sx} cy={height / 2} r={2} fill="#94a3b8" opacity={0.4} />
        </g>
      ))}

      {/* Engineering DIN Rail Label */}
      <text
        x={width / 2}
        y={height / 2 + 3}
        textAnchor="middle"
        fontSize={6.5}
        fontWeight="900"
        fontFamily="monospace"
        fill="#ffffff"
        opacity={0.5}
        letterSpacing="1px"
      >
        TS35 • DIN EN 50022 (35×7.5mm)
      </text>

      {/* Terminals (Grounding Bonding Lug) */}
      {device.terminals?.map((t) => {
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
