import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface RcdProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RcdDevice: React.FC<RcdProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 40;
  const sensitivityMa = device.state.sensitivityMa || 30;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTripped) {
      sound.playBreakerSnap();
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      sound.playBreakerSnap();
      device.state.closed = !device.state.closed;
    }
    if (onToggleState) onToggleState(device);
  };

  const handleTestPress = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTripPop();
    device.state.tripped = true;
    device.state.closed = false;
    device.state.tripReason = 'Test Button: 30mA Simulated Earth Leakage Trip';
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`rcdDinRail_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="25%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <linearGradient id={`rcdGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* DIN Rail Silhouette Behind Device */}
      <rect
        x={-8}
        y={height / 2 - 18}
        width={width + 16}
        height={36}
        fill={`url(#rcdDinRail_${device.id})`}
        stroke="#475569"
        strokeWidth={1}
      />
      <line x1={-8} y1={height / 2 - 10} x2={width + 8} y2={height / 2 - 10} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={-8} y1={height / 2 + 10} x2={width + 8} y2={height / 2 + 10} stroke="#64748b" strokeWidth={1} />

      {/* Main RCD Enclosure Drop Shadow */}
      <rect
        x={2}
        y={3}
        width={width}
        height={height}
        rx={5}
        fill="#000000"
        opacity={0.14}
      />

      {/* Main Enclosure */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={5}
        fill={`url(#rcdGrad_${device.id})`}
        stroke="#94a3b8"
        strokeWidth={1.4}
      />

      {/* Front Escutcheon Plate */}
      <rect
        x={width * 0.08}
        y={height * 0.20}
        width={width * 0.84}
        height={height * 0.60}
        rx={3}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth={1}
      />

      {/* Yellow/Amber DPS / RCD Header Badge */}
      <rect
        x={width / 2 - 24}
        y={height * 0.24}
        width={48}
        height={13}
        rx={2}
        fill="#f59e0b"
        stroke="#d97706"
        strokeWidth={0.8}
      />
      <text
        x={width / 2}
        y={height * 0.24 + 9}
        textAnchor="middle"
        fontSize={8}
        fontWeight="900"
        fill="#78350f"
        letterSpacing="0.8"
      >
        RCD 30mA
      </text>

      {/* Push-to-Test Button "T" with 3D Bevel */}
      <g
        onClick={handleTestPress}
        className="cursor-pointer group"
        transform={`translate(${width * 0.20}, ${height * 0.42})`}
      >
        {/* Outer Bezel */}
        <circle cx={10} cy={10} r={11} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1} />
        {/* Blue Tactile Button */}
        <circle
          cx={10}
          cy={10}
          r={9}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={1}
          className="transition-transform group-hover:scale-105 active:scale-95"
        />
        <text
          x={10}
          y={14}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill="#ffffff"
          fontFamily="sans-serif"
        >
          T
        </text>
        <text x={10} y={26} textAnchor="middle" fontSize={5.5} fill="#64748b" fontWeight="bold">TEST</text>
      </g>

      {/* Flag Indicator Window */}
      <rect
        x={width * 0.58}
        y={height * 0.40}
        width={18}
        height={8}
        rx={1.5}
        fill={isClosed ? '#ef4444' : '#22c55e'}
        stroke="#475569"
        strokeWidth={0.8}
      />

      {/* Toggle Lever Well */}
      <rect
        x={width * 0.56}
        y={height * 0.50}
        width={22}
        height={24}
        rx={2}
        fill="#0f172a"
        stroke="#334155"
        strokeWidth={0.8}
      />

      {/* Interactive Toggle Handle Lever */}
      <g
        onClick={handleToggle}
        className="cursor-pointer group"
      >
        <rect
          x={width * 0.58}
          y={isClosed ? height * 0.51 : height * 0.59}
          width={18}
          height={14}
          rx={2}
          fill={isTripped ? '#dc2626' : '#1e293b'}
          stroke="#475569"
          strokeWidth={1}
          className="transition-all duration-100 group-hover:brightness-125"
        />
      </g>

      {/* Technical Spec Markings */}
      <text
        x={width / 2}
        y={height * 0.88}
        textAnchor="middle"
        fontSize={7}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#334155"
      >
        In {ratedAmps}A | IΔn {sensitivityMa}mA | 230V~
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
