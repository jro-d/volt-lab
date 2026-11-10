import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface EstopDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const EstopDevice: React.FC<EstopDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isLatched = !!device.state.estopActive;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      onToggleState({
        ...device,
        state: {
          ...device.state,
          estopActive: !isLatched,
        }
      });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      {/* High-Visibility Safety Yellow Enclosure */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="#fde047"
        stroke="#ca8a04"
        strokeWidth={1.8}
        filter="drop-shadow(0 6px 14px rgba(0,0,0,0.16))"
      />

      {/* Safety Legend Circle Collar */}
      <circle
        cx={x + width / 2}
        cy={y + 38}
        r={28}
        fill="#fef08a"
        stroke="#eab308"
        strokeWidth={1.5}
      />

      {/* Curved Safety Label */}
      <text
        x={x + width / 2}
        y={y + 16}
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="900"
        fontFamily="sans-serif"
        fill="#854d0e"
        letterSpacing="0.8"
      >
        EMERGENCY STOP
      </text>

      {/* 40mm Red Mushroom Head Actuator */}
      <g
        transform={`translate(${x + width / 2}, ${y + 38})`}
        onClick={handleToggle}
        className="cursor-pointer group"
      >
        <title>Emergency Stop (Click to press & latch open / Click again to twist-to-release)</title>
        {/* Shadow / Depth */}
        <circle
          r={isLatched ? 20 : 23}
          fill="#7f1d1d"
          className="transition-all duration-150"
        />
        {/* Red Mushroom Cap */}
        <circle
          r={isLatched ? 18 : 22}
          fill={isLatched ? "#dc2626" : "#ef4444"}
          stroke="#991b1b"
          strokeWidth={1.4}
          filter={isLatched ? undefined : "drop-shadow(0 4px 6px rgba(0,0,0,0.35))"}
          className="transition-all duration-150"
        />

        {/* Twist Arrows */}
        <path
          d="M -8 -8 A 12 12 0 0 1 8 -8 M 6 -11 L 8 -8 L 5 -6"
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <path
          d="M 8 8 A 12 12 0 0 1 -8 8 M -6 11 L -8 8 L -5 6"
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.2}
          strokeLinecap="round"
        />

        {/* Center Status Dot */}
        <circle r={4} fill={isLatched ? "#fef08a" : "#ffffff"} />
      </g>

      {/* State Text Banner */}
      <rect
        x={x + 10}
        y={y + height - 26}
        width={width - 20}
        height={12}
        rx={3}
        fill={isLatched ? "#dc2626" : "#15803d"}
      />
      <text
        x={x + width / 2}
        y={y + height - 18}
        textAnchor="middle"
        fontSize="6"
        fontWeight="bold"
        fill="#ffffff"
      >
        {isLatched ? "TRIPPED (OPEN)" : "ARMED (NC CLOSED)"}
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
              fill="#854d0e"
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
