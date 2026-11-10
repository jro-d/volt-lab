import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface PilotLightDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const PilotLightDevice: React.FC<PilotLightDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isLit = !!device.state.pilotLit;
  const color = device.state.pilotColor || 'green';

  let lensColor = '#22c55e';
  let glowColor = 'rgba(34, 197, 94, 0.6)';
  if (color === 'red') {
    lensColor = '#ef4444';
    glowColor = 'rgba(239, 68, 68, 0.6)';
  } else if (color === 'amber') {
    lensColor = '#f59e0b';
    glowColor = 'rgba(245, 158, 11, 0.6)';
  } else if (color === 'blue') {
    lensColor = '#3b82f6';
    glowColor = 'rgba(59, 130, 246, 0.6)';
  }

  const handleToggleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      const colors = ['green', 'red', 'amber'];
      const nextIdx = (colors.indexOf(color) + 1) % colors.length;
      onToggleState({
        ...device,
        state: {
          ...device.state,
          pilotColor: colors[nextIdx],
        }
      });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      {/* Panel Enclosure Flange Base */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth={1.2}
        filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))"
      />

      {/* 22mm Chrome Bezel Outer Ring */}
      <circle
        cx={x + width / 2}
        cy={y + 32}
        r={22}
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth={1.5}
      />
      <circle
        cx={x + width / 2}
        cy={y + 32}
        r={18}
        fill="#0f172a"
      />

      {/* Glow Halo when Energized */}
      {isLit && (
        <circle
          cx={x + width / 2}
          cy={y + 32}
          r={28}
          fill={glowColor}
          className="animate-pulse"
        />
      )}

      {/* Jeweled Fresnel Lens */}
      <g
        onClick={handleToggleColor}
        className="cursor-pointer"
      >
        <title>Pilot Indicator (Click lens to cycle Green/Red/Amber color)</title>
        <circle
          cx={x + width / 2}
          cy={y + 32}
          r={15}
          fill={isLit ? lensColor : '#334155'}
          stroke={isLit ? "#ffffff" : "#1e293b"}
          strokeWidth={1.2}
          filter={isLit ? "drop-shadow(0 0 8px rgba(255,255,255,0.8))" : undefined}
        />

        {/* Fresnel Lens Facet Rings */}
        <circle cx={x + width / 2} cy={y + 32} r={10} fill="none" stroke="#ffffff" strokeWidth={0.8} opacity={isLit ? 0.7 : 0.2} />
        <circle cx={x + width / 2} cy={y + 32} r={5} fill="none" stroke="#ffffff" strokeWidth={0.8} opacity={isLit ? 0.7 : 0.2} />
        <circle cx={x + width / 2 - 4} cy={y + 28} r={2} fill="#ffffff" opacity={0.8} />
      </g>

      {/* Pilot Label Tag */}
      <text
        x={x + width / 2}
        y={y + 58}
        textAnchor="middle"
        fontSize="6"
        fontWeight="bold"
        fontFamily="monospace"
        fill={isLit ? lensColor : "#64748b"}
      >
        {isLit ? "⚡ SIGNAL ON" : "PILOT LIGHT"}
      </text>

      {/* Terminals */}
      {device.terminals.map((terminal) => {
        const tx = x + width * terminal.relX;
        const ty = y + height * terminal.relY;
        const termKey = `${device.id}:${terminal.id}`;

        return (
          <g key={terminal.id}>
            <TerminalPoint
              terminal={terminal}
              x={tx}
              y={ty}
              isHovered={hoveredTerminalId === termKey}
              isSelected={selectedTerminalId === termKey}
              onMouseDown={(e) => onTerminalMouseDown(device, terminal, e)}
              onMouseEnter={() => setHoveredTerminalId(termKey)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
            {/* Terminal Pin Label */}
            <text
              x={tx}
              y={ty - 8}
              textAnchor="middle"
              fontSize="6"
              fontWeight="bold"
              fontFamily="monospace"
              fill="#64748b"
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
