import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface PushButtonStationDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const PushButtonStationDevice: React.FC<PushButtonStationDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isStartPressed = !!device.state.startPressed;
  const isStopPressed = !!device.state.stopPressed;

  const handleToggleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      onToggleState({
        ...device,
        state: {
          ...device.state,
          startPressed: !isStartPressed,
        }
      });
    }
  };

  const handleToggleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      onToggleState({
        ...device,
        state: {
          ...device.state,
          stopPressed: !isStopPressed,
        }
      });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      {/* Heavy-Duty Industrial Enclosure Body (Yellow Base with Gray Bezel) */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="#f8fafc"
        stroke="#64748b"
        strokeWidth={1.8}
        filter="drop-shadow(0 6px 14px rgba(0,0,0,0.14))"
      />

      {/* 4 Corner Enclosure Screws */}
      {[
        { cx: x + 6, cy: y + 6 },
        { cx: x + width - 6, cy: y + 6 },
        { cx: x + 6, cy: y + height - 6 },
        { cx: x + width - 6, cy: y + height - 6 },
      ].map((pos, idx) => (
        <g key={idx}>
          <circle cx={pos.cx} cy={pos.cy} r={2.5} fill="#cbd5e1" stroke="#475569" strokeWidth={0.6} />
          <line x1={pos.cx - 1.2} y1={pos.cy} x2={pos.cx + 1.2} y2={pos.cy} stroke="#475569" strokeWidth={0.6} />
        </g>
      ))}

      {/* Upper START Button Bezel & Actuator (Green, Normally Open) */}
      <g
        transform={`translate(${x + width / 2}, ${y + 44})`}
        onClick={handleToggleStart}
        className="cursor-pointer group"
      >
        <title>START Button (Normally Open momentary contact - Click to press/release)</title>
        {/* Chrome Outer Collar */}
        <circle r={21} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.2} />
        <circle r={18} fill="#0f172a" />
        {/* Green Push Button Cap */}
        <circle
          r={isStartPressed ? 14 : 16}
          fill={isStartPressed ? "#16a34a" : "#22c55e"}
          stroke={isStartPressed ? "#14532d" : "#15803d"}
          strokeWidth={1.2}
          filter={isStartPressed ? undefined : "drop-shadow(0 3px 5px rgba(0,0,0,0.3))"}
          className="transition-all duration-100"
        />
        {/* "I" Start Icon */}
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize="12"
          fontWeight="900"
          fontFamily="sans-serif"
          fill="#ffffff"
        >
          I
        </text>
        <text x={0} y={-24} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#15803d">
          START (NO)
        </text>
      </g>

      {/* Center Divider Groove */}
      <line x1={x + 10} y1={y + 72} x2={x + width - 10} y2={y + 72} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 2" />

      {/* Lower STOP Button Bezel & Actuator (Red, Normally Closed) */}
      <g
        transform={`translate(${x + width / 2}, ${y + 100})`}
        onClick={handleToggleStop}
        className="cursor-pointer group"
      >
        <title>STOP Button (Normally Closed contact - Click to open/press)</title>
        {/* Chrome Outer Collar */}
        <circle r={21} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.2} />
        <circle r={18} fill="#0f172a" />
        {/* Red Push Button Cap */}
        <circle
          r={isStopPressed ? 14 : 16}
          fill={isStopPressed ? "#b91c1c" : "#ef4444"}
          stroke={isStopPressed ? "#7f1d1d" : "#991b1b"}
          strokeWidth={1.2}
          filter={isStopPressed ? undefined : "drop-shadow(0 3px 5px rgba(0,0,0,0.3))"}
          className="transition-all duration-100"
        />
        {/* "O" Stop Icon */}
        <circle cx={0} cy={0} r={5} fill="none" stroke="#ffffff" strokeWidth={2.2} />
        <text x={0} y={26} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#b91c1c">
          STOP (NC)
        </text>
      </g>

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
              y={terminal.relY < 0.3 ? ty + 12 : ty - 8}
              textAnchor="middle"
              fontSize="6"
              fontWeight="bold"
              fontFamily="monospace"
              fill={terminal.id.includes('start') ? '#10b981' : '#f59e0b'}
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
