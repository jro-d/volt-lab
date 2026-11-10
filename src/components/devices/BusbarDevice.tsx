import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface BusbarProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const BusbarDevice: React.FC<BusbarProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
}) => {
  const { width, height } = device;
  const isNeutral = device.type === 'neutral_busbar' || device.state.isNeutral;

  // Standoff insulator colors: Blue for Neutral, Green for Earth
  const bracketColor = isNeutral ? '#2563eb' : '#16a34a';
  const bracketBorder = isNeutral ? '#1d4ed8' : '#15803d';

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Polished Brushed Brass Busbar Gradient */}
        <linearGradient id={`busbarBrass_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="25%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="75%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>

        {/* Insulator Foot 3D Bevel */}
        <linearGradient id={`bracketGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Insulated Mounting Foot (Top) */}
      <rect
        x={width / 2 - 15}
        y={4}
        width={30}
        height={20}
        rx={3}
        fill={bracketColor}
        stroke={bracketBorder}
        strokeWidth={1.5}
      />
      <rect x={width / 2 - 15} y={4} width={30} height={20} rx={3} fill={`url(#bracketGrad_${device.id})`} />
      {/* Wall Mounting Screw Hole */}
      <circle cx={width / 2} cy={14} r={3} fill="#0f172a" stroke="#cbd5e1" strokeWidth={0.5} />

      {/* Insulated Mounting Foot (Bottom) */}
      <rect
        x={width / 2 - 15}
        y={height - 24}
        width={30}
        height={20}
        rx={3}
        fill={bracketColor}
        stroke={bracketBorder}
        strokeWidth={1.5}
      />
      <rect x={width / 2 - 15} y={height - 24} width={30} height={20} rx={3} fill={`url(#bracketGrad_${device.id})`} />
      <circle cx={width / 2} cy={height - 14} r={3} fill="#0f172a" stroke="#cbd5e1" strokeWidth={0.5} />

      {/* Solid Brass Bar with Longitudinal Shading */}
      <rect
        x={width / 2 - 8}
        y={14}
        width={16}
        height={height - 28}
        rx={2}
        fill={`url(#busbarBrass_${device.id})`}
        stroke="#78350f"
        strokeWidth={1}
      />
      {/* Brass Specular Reflection Stripe */}
      <line
        x1={width / 2 - 2}
        y1={16}
        x2={width / 2 - 2}
        y2={height - 16}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.6}
      />

      {/* Screws / Terminals */}
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

      {/* Identification Badge */}
      <text
        x={width / 2}
        y={height / 2}
        transform={`rotate(-90, ${width / 2}, ${height / 2})`}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#582900"
        fontFamily="monospace"
        letterSpacing="1"
      >
        {isNeutral ? 'NEUTRAL LINK (N)' : 'EARTH BAR (PE)'}
      </text>
    </g>
  );
};
