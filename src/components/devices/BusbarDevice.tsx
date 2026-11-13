import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface BusbarDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const BusbarDevice: React.FC<BusbarDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isNeutral = device.type === 'neutral_busbar' || !!device.state.isNeutral;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`busMetal-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isNeutral ? '#f1f5f9' : '#fbbf24'} />
          <stop offset="45%" stopColor={isNeutral ? '#cbd5e1' : '#d97706'} />
          <stop offset="100%" stopColor={isNeutral ? '#94a3b8' : '#92400e'} />
        </linearGradient>
      </defs>

      {/* Polyamide Insulated DIN-Mount Base Feet */}
      <rect x={2} y={2} width={width - 4} height={height - 2} rx={6} fill="rgba(15, 23, 42, 0.16)" />
      <rect
        x={0}
        y={4}
        width={18}
        height={height - 8}
        rx={3}
        fill={isNeutral ? '#1d4ed8' : '#15803d'}
        stroke={isNeutral ? '#1e3a8a' : '#14532d'}
        strokeWidth={1.2}
      />
      <rect
        x={width - 18}
        y={4}
        width={18}
        height={height - 8}
        rx={3}
        fill={isNeutral ? '#1d4ed8' : '#15803d'}
        stroke={isNeutral ? '#1e3a8a' : '#14532d'}
        strokeWidth={1.2}
      />
      <circle cx={9} cy={height / 2} r={2.5} fill="#0f172a" />
      <circle cx={width - 9} cy={height / 2} r={2.5} fill="#0f172a" />

      {/* Solid Machined Electrolytic Copper / Tinned Brass Bus Bar */}
      <rect
        x={12}
        y={8}
        width={width - 24}
        height={height - 16}
        rx={2.5}
        fill={`url(#busMetal-${uid})`}
        stroke={isNeutral ? '#475569' : '#78350f'}
        strokeWidth={1.2}
      />
      {/* Specular brushed bar highlight */}
      <line x1={14} y1={10} x2={width - 14} y2={10} stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />

      {/* Identification Plate */}
      <text
        x={width / 2}
        y={height - 2}
        textAnchor="middle"
        fontSize={6.2}
        fontWeight="900"
        fontFamily="monospace"
        fill={isNeutral ? '#1d4ed8' : '#15803d'}
      >
        {isNeutral ? 'NEUTRAL BUS (N) 63A' : 'EARTH / PE BUS (E) Cu'}
      </text>

      {terminals.map((t) => {
        const tx = width * t.relX;
        const ty = height * t.relY;
        const termId = `${device.id}:${t.id}`;
        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={tx}
            y={ty}
            isSelected={selectedTerminalId === termId}
            isHovered={hoveredTerminalId === termId}
            onMouseDown={(e) => {
              e.stopPropagation();
              onTerminalMouseDown?.(device, t, e);
            }}
            onMouseEnter={() => setHoveredTerminalId?.(termId)}
            onMouseLeave={() => setHoveredTerminalId?.(null)}
          />
        );
      })}
    </g>
  );
};
