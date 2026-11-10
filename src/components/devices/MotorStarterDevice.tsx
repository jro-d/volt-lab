import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface MotorStarterProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const MotorStarterDevice: React.FC<MotorStarterProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isRunning = !!device.state.running;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playSwitchClick();
    device.state.running = true;
    if (onToggleState) onToggleState(device);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playSwitchClick();
    device.state.running = false;
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Cast Iron Stator Casing Gradient */}
        <linearGradient id={`motorBody_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="30%" stopColor="#334155" />
          <stop offset="70%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient id={`rotorWheel_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* Drop Shadow */}
      <rect
        x={3}
        y={4}
        width={width - 20}
        height={height - 20}
        rx={12}
        fill="#000000"
        opacity={0.15}
      />

      {/* Lifting Eye Bolt on Top */}
      <circle cx={width / 2} cy={22} r={6} fill="none" stroke="#64748b" strokeWidth={2.5} />
      <rect x={width / 2 - 3} y={26} width={6} height={6} fill="#475569" />

      {/* Main Motor Cylindrical Frame */}
      <rect
        x={20}
        y={30}
        width={width - 40}
        height={height - 50}
        rx={12}
        fill={`url(#motorBody_${device.id})`}
        stroke="#475569"
        strokeWidth={1.5}
      />

      {/* Heavy Cast-Iron Cooling Fins */}
      {[44, 54, 64, 74, 84, 94].map((fy, i) => (
        <line
          key={i}
          x1={14}
          y1={fy}
          x2={width - 14}
          y2={fy}
          stroke="#64748b"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}

      {/* Drive Shaft Pulley Extension */}
      <rect x={width - 22} y={height / 2 - 12} width={18} height={24} rx={3} fill="#94a3b8" stroke="#475569" strokeWidth={1} />
      <line x1={width - 12} y1={height / 2 - 12} x2={width - 12} y2={height / 2 + 12} stroke="#64748b" strokeWidth={1} />

      {/* Rotating Fan Impeller / Shaft Wheel */}
      <g
        transform={`translate(${width / 2}, ${height / 2 + 5})`}
        className={isRunning ? 'animate-spin origin-center' : ''}
      >
        <circle cx={0} cy={0} r={18} fill="#090d16" stroke="#0284c7" strokeWidth={1.2} />
        {/* Fan Blades */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1={0}
            y1={0}
            x2={14 * Math.cos((deg * Math.PI) / 180)}
            y2={14 * Math.sin((deg * Math.PI) / 180)}
            stroke="#38bdf8"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
        <circle cx={0} cy={0} r={4.5} fill="#f8fafc" stroke="#334155" strokeWidth={0.8} />
      </g>

      {/* Top Terminal Junction Box (Conduit Entry on top) */}
      <rect
        x={15}
        y={4}
        width={width - 30}
        height={24}
        rx={4}
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth={1.2}
      />

      {/* Industrial Nameplate */}
      <rect x={24} y={height - 18} width={width - 48} height={14} rx={2} fill="#090d16" stroke="#334155" strokeWidth={0.8} />
      <text
        x={width / 2}
        y={height - 9}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight="bold"
        fontFamily="monospace"
        fill="#38bdf8"
      >
        3~ 400V 2.2kW 1450RPM
      </text>

      {/* Start / Stop Push Buttons on Motor Starter */}
      <g transform={`translate(${22}, ${height / 2 - 16})`}>
        {/* Start Button (Green) */}
        <circle
          cx={6}
          cy={6}
          r={5.5}
          fill="#16a34a"
          stroke="#14532d"
          strokeWidth={1}
          onClick={handleStart}
          className="cursor-pointer hover:scale-110 transition-transform"
        />
        {/* Stop Button (Red) */}
        <circle
          cx={6}
          cy={22}
          r={5.5}
          fill="#dc2626"
          stroke="#7f1d1d"
          strokeWidth={1}
          onClick={handleStop}
          className="cursor-pointer hover:scale-110 transition-transform"
        />
      </g>

      {/* Terminals (Top Terminal Box) */}
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
