import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface IndustrialMotorDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const IndustrialMotorDevice: React.FC<IndustrialMotorDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isRunning = !!device.state.motorRunning;
  const rpm = device.state.motorRpm || 1750;
  const hp = device.state.motorHp || 3.0;

  return (
    <g id={`device-${device.id}`}>
      <defs>
        {/* Cast Iron Stator Finish */}
        <linearGradient id="castIronBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="35%" stopColor="#0369a1" />
          <stop offset="70%" stopColor="#075985" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>

        {/* Steel Shaft Metal */}
        <linearGradient id="motorShaftSteel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Cast Iron Stator Mounting Feet Base */}
      <rect x={x + 12} y={y + height - 14} width={24} height={14} rx={2} fill="#0c4a6e" stroke="#082f49" strokeWidth={1} />
      <rect x={x + width - 36} y={y + height - 14} width={24} height={14} rx={2} fill="#0c4a6e" stroke="#082f49" strokeWidth={1} />
      {/* Foundation Bolt Holes */}
      <circle cx={x + 24} cy={y + height - 6} r={3} fill="#082f49" stroke="#38bdf8" strokeWidth={0.8} />
      <circle cx={x + width - 24} cy={y + height - 6} r={3} fill="#082f49" stroke="#38bdf8" strokeWidth={0.8} />

      {/* Main Motor Cylindrical Stator Casing */}
      <rect
        x={x + 14}
        y={y + 36}
        width={width - 28}
        height={height - 48}
        rx={10}
        fill="url(#castIronBody)"
        stroke="#0c4a6e"
        strokeWidth={1.8}
        filter="drop-shadow(0 8px 18px rgba(0,0,0,0.22))"
      />

      {/* Horizontal Stator Cooling Fins */}
      {[46, 54, 62, 70, 78, 86].map((fy, i) => (
        <line
          key={i}
          x1={x + 18}
          y1={y + fy}
          x2={x + width - 42}
          y2={y + fy}
          stroke="#38bdf8"
          strokeWidth={1.2}
          opacity={0.35}
          strokeLinecap="round"
        />
      ))}

      {/* Rear Fan Cowl Shroud */}
      <path
        d={`M ${x + width - 26} ${y + 40} Q ${x + width - 14} ${y + height / 2 + 10} ${x + width - 26} ${y + height - 20} Z`}
        fill="#075985"
        stroke="#082f49"
        strokeWidth={1.2}
      />

      {/* Front Output Drive Shaft & Bearing Hub */}
      <rect
        x={x - 4}
        y={y + height / 2 + 6}
        width={18}
        height={14}
        rx={2}
        fill="url(#motorShaftSteel)"
        stroke="#334155"
        strokeWidth={1}
      />
      {/* Keyway Slot on Drive Shaft */}
      <rect x={x - 2} y={y + height / 2 + 11} width={8} height={3} fill="#0f172a" />

      {/* Rotating Shaft Pulley / Fan Animation */}
      <g transform={`translate(${x + 14}, ${y + height / 2 + 13})`}>
        <circle r={10} fill="#0284c7" stroke="#38bdf8" strokeWidth={1.2} />
        {/* Spinning Spokes */}
        <g className={isRunning ? "animate-spin" : undefined} style={{ transformOrigin: "0px 0px", animationDuration: "0.25s" }}>
          <line x1={-8} y1={0} x2={8} y2={0} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
          <line x1={0} y1={-8} x2={0} y2={8} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        </g>
        <circle r={3} fill="#0f172a" />
      </g>

      {/* Top Conduit Terminal Connection Box */}
      <rect
        x={x + 36}
        y={y + 12}
        width={width - 56}
        height={26}
        rx={4}
        fill="#0f172a"
        stroke="#0284c7"
        strokeWidth={1.4}
        filter="drop-shadow(0 2px 6px rgba(0,0,0,0.3))"
      />
      {/* Conduit Entry Knockout */}
      <circle cx={x + width - 20} cy={y + 25} r={4} fill="#334155" stroke="#64748b" strokeWidth={0.8} />

      {/* Motor Stator Nameplate Stamp */}
      <text x={x + width / 2} y={y + 60} textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" fill="#ffffff">
        3-PHASE INDUCTION MOTOR
      </text>
      <text x={x + width / 2} y={y + 68} textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="monospace" fill="#38bdf8">
        {hp} HP • 230/400V • 60Hz
      </text>
      <text x={x + width / 2} y={y + 76} textAnchor="middle" fontSize="6" fontWeight="bold" fontFamily="monospace" fill={isRunning ? "#4ade80" : "#94a3b8"}>
        {isRunning ? `⚡ ${rpm} RPM (RUNNING)` : "OFF (0 RPM)"}
      </text>

      {/* Lifting Eyebolt */}
      <circle cx={x + width / 2} cy={y + 8} r={5} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <line x1={x + width / 2} y1={y + 12} x2={x + width / 2} y2={y + 14} stroke="#64748b" strokeWidth={2} />

      {/* Terminal Screw Points inside Terminal Box */}
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
              y={ty + 12}
              textAnchor="middle"
              fontSize="5.5"
              fontWeight="bold"
              fontFamily="monospace"
              fill={terminal.id === 'pe' ? '#4ade80' : '#f8fafc'}
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
