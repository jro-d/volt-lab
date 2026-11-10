import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface LightFixtureProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const LightFixtureDevice: React.FC<LightFixtureProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
}) => {
  const { width, height } = device;
  const isLit = !!device.state.lit;
  const wattage = device.state.wattage || 60;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Radial Light Glow Filter / Gradient */}
        <radialGradient id={`lampGlow_${device.id}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#fde047" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#eab308" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.0" />
        </radialGradient>

        <linearGradient id={`bulbGlass_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isLit ? 0.95 : 0.6} />
          <stop offset="50%" stopColor="#fef9c3" stopOpacity={isLit ? 0.8 : 0.25} />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity={isLit ? 0.5 : 0.4} />
        </linearGradient>

        {/* Rolled Brass Thread Base */}
        <linearGradient id={`brassThread_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="30%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>

        {/* Ceramic Socket Base */}
        <linearGradient id={`socketBase_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Radiant Light Bloom Circle when Lit */}
      {isLit && (
        <circle
          cx={width / 2}
          cy={height * 0.38}
          r={width * 1.2}
          fill={`url(#lampGlow_${device.id})`}
          className="pointer-events-none animate-pulse"
        />
      )}

      {/* Porcelain / Ceramic Socket Base */}
      <rect
        x={width * 0.22}
        y={height * 0.64}
        width={width * 0.56}
        height={height * 0.24}
        rx={3}
        fill={`url(#socketBase_${device.id})`}
        stroke="#94a3b8"
        strokeWidth={1.2}
      />

      {/* E27 Rolled Brass Screw Threads */}
      <rect
        x={width * 0.28}
        y={height * 0.54}
        width={width * 0.44}
        height={height * 0.12}
        fill={`url(#brassThread_${device.id})`}
        stroke="#854d0e"
        strokeWidth={0.8}
      />
      <line x1={width * 0.28} y1={height * 0.58} x2={width * 0.72} y2={height * 0.58} stroke="#78350f" strokeWidth={0.8} />
      <line x1={width * 0.28} y1={height * 0.62} x2={width * 0.72} y2={height * 0.62} stroke="#78350f" strokeWidth={0.8} />

      {/* Glass Bulb Envelope */}
      <path
        d={`M ${width * 0.30} ${height * 0.54}
            C ${width * 0.12} ${height * 0.42}, ${width * 0.08} ${height * 0.22}, ${width * 0.28} ${height * 0.08}
            C ${width * 0.40} ${height * 0.01}, ${width * 0.60} ${height * 0.01}, ${width * 0.72} ${height * 0.08}
            C ${width * 0.92} ${height * 0.22}, ${width * 0.88} ${height * 0.42}, ${width * 0.70} ${height * 0.54}
            Z`}
        fill={`url(#bulbGlass_${device.id})`}
        stroke={isLit ? '#eab308' : '#94a3b8'}
        strokeWidth={1.4}
      />

      {/* Glass Specular Reflection Arc */}
      <path
        d={`M ${width * 0.26} ${height * 0.14} C ${width * 0.20} ${height * 0.22}, ${width * 0.22} ${height * 0.32}, ${width * 0.28} ${height * 0.38}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.8}
      />

      {/* Filament Supports & Tungsten Loop */}
      <line x1={width * 0.43} y1={height * 0.52} x2={width * 0.43} y2={height * 0.30} stroke="#64748b" strokeWidth={0.8} />
      <line x1={width * 0.57} y1={height * 0.52} x2={width * 0.57} y2={height * 0.30} stroke="#64748b" strokeWidth={0.8} />
      
      {/* Tungsten Coil Loop */}
      <path
        d={`M ${width * 0.43} ${height * 0.30} Q ${width / 2} ${height * 0.20} ${width * 0.57} ${height * 0.30}`}
        fill="none"
        stroke={isLit ? '#ffffff' : '#475569'}
        strokeWidth={isLit ? 2.2 : 1.2}
      />

      {/* Power Wattage Badge */}
      <text
        x={width / 2}
        y={height * 0.44}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight="bold"
        fontFamily="monospace"
        fill={isLit ? '#713f12' : '#94a3b8'}
      >
        {wattage}W
      </text>

      {/* Terminals (Bottom of socket base) */}
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
