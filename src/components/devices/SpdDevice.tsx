import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface SpdProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const SpdDevice: React.FC<SpdProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
}) => {
  const { width, height } = device;
  const isHealthy = device.state.healthy !== false;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`spdGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="60%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* DIN Rail Silhouette Behind Device */}
      <rect
        x={-6}
        y={height / 2 - 16}
        width={width + 12}
        height={32}
        fill="#475569"
        opacity={0.35}
        stroke="#334155"
        strokeWidth={1}
      />

      {/* Main Enclosure */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={4}
        fill={`url(#spdGrad_${device.id})`}
        stroke="#94a3b8"
        strokeWidth={1.2}
      />

      {/* Cartridge Face */}
      <rect
        x={width * 0.1}
        y={height * 0.24}
        width={width * 0.8}
        height={height * 0.52}
        rx={2}
        fill="#f1f5f9"
        stroke="#cbd5e1"
        strokeWidth={1}
      />

      {/* SPD Lightning Bolt Symbol */}
      <path
        d={`M ${width / 2 + 2} ${height * 0.32} L ${width / 2 - 5} ${height * 0.43} L ${width / 2} ${height * 0.43} L ${width / 2 - 3} ${height * 0.52} L ${width / 2 + 6} ${height * 0.40} L ${width / 2} ${height * 0.40} Z`}
        fill="#eab308"
        stroke="#ca8a04"
        strokeWidth={0.8}
      />

      {/* Status Inspection Window */}
      <rect
        x={width / 2 - 10}
        y={height * 0.56}
        width={20}
        height={10}
        rx={1.5}
        fill={isHealthy ? '#22c55e' : '#ef4444'}
        stroke="#334155"
        strokeWidth={0.8}
      />

      <text
        x={width / 2}
        y={height * 0.72}
        textAnchor="middle"
        fontSize={7}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#334155"
      >
        SPD T2 275V
      </text>

      {/* Terminals */}
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
