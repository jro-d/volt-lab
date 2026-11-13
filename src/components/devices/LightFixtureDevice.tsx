import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface LightFixtureDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const LightFixtureDevice: React.FC<LightFixtureDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isLit = !!device.state.lit;
  const wattage = device.state.wattage || 60;
  const cx = width / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <radialGradient id={`bulbAmbient-${uid}`} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity={0.95} />
          <stop offset="45%" stopColor="#fde047" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`glassGlobe-${uid}`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor={isLit ? '#ffffff' : '#ffffff'} />
          <stop offset="45%" stopColor={isLit ? '#fef08a' : '#f1f5f9'} />
          <stop offset="85%" stopColor={isLit ? '#facc15' : '#cbd5e1'} />
          <stop offset="100%" stopColor={isLit ? '#eab308' : '#94a3b8'} />
        </radialGradient>
        <linearGradient id={`edisonBrass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id={`porcelain-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Warm Ambient Halo when Illuminated */}
      {isLit && (
        <circle cx={cx} cy={30} r={46} fill={`url(#bulbAmbient-${uid})`} className="pointer-events-none" />
      )}

      {/* A19 Glass Bulb Envelope */}
      <path
        d={`M ${cx - 12} 49 C ${cx - 15} 40, ${cx - 24} 33, ${cx - 24} 22 A 24 24 0 1 1 ${cx + 24} 22 C ${cx + 24} 33, ${cx + 15} 40, ${cx + 12} 49 Z`}
        fill={`url(#glassGlobe-${uid})`}
        stroke={isLit ? '#ca8a04' : '#94a3b8'}
        strokeWidth={1.3}
      />

      {/* Glass Stem Press & Internal Support Leads */}
      <path
        d={`M ${cx - 4} 49 L ${cx - 3} 32 M ${cx + 4} 49 L ${cx + 3} 32 M ${cx} 49 L ${cx} 29`}
        stroke={isLit ? '#b45309' : '#64748b'}
        strokeWidth={0.9}
        fill="none"
      />
      {/* Coiled Tungsten Filament */}
      <path
        d={`M ${cx - 7} 26 Q ${cx - 4} 20 ${cx - 1} 26 Q ${cx + 2} 20 ${cx + 5} 26 L ${cx + 7} 24`}
        fill="none"
        stroke={isLit ? '#ffffff' : '#475569'}
        strokeWidth={isLit ? 2 : 1.1}
        strokeLinecap="round"
      />
      {isLit && (
        <ellipse cx={cx} cy={24} rx={10} ry={6} fill="rgba(255, 255, 255, 0.55)" className="pointer-events-none" />
      )}

      {/* Glossy Curved Glass Specular Reflection */}
      <path
        d={`M ${cx - 15} 12 A 16 16 0 0 1 ${cx - 5} 4`}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      {/* Wattage Etching on Glass */}
      <text
        x={cx}
        y={42}
        textAnchor="middle"
        fontSize={6.8}
        fontWeight="900"
        fontFamily="monospace"
        fill={isLit ? '#713f12' : '#475569'}
      >
        {wattage}W
      </text>

      {/* Stamped E27 Edison Screw Brass Cap */}
      <rect x={cx - 11} y={49} width={22} height={13} rx={2} fill={`url(#edisonBrass-${uid})`} stroke="#78350f" strokeWidth={0.9} />
      {[52.5, 56, 59.5].map((ty, idx) => (
        <line key={`th-${idx}`} x1={cx - 10.5} y1={ty} x2={cx + 10.5} y2={ty + 1.2} stroke="#78350f" strokeWidth={0.9} />
      ))}

      {/* Glazed Porcelain Cleat Receptacle Base */}
      <rect
        x={cx - 28}
        y={62}
        width={56}
        height={24}
        rx={7}
        fill={`url(#porcelain-${uid})`}
        stroke="#64748b"
        strokeWidth={1.5}
      />
      {/* Porcelain Collar Ring */}
      <rect x={cx - 15} y={60} width={30} height={6} rx={2.5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.9} />
      {/* Base Mounting Holes */}
      <circle cx={cx - 21} cy={74} r={2.2} fill="#64748b" />
      <circle cx={cx + 21} cy={74} r={2.2} fill="#64748b" />
      <text x={cx} y={76} textAnchor="middle" fontSize={5.5} fontWeight="bold" fontFamily="monospace" fill="#475569">
        E27 · 230V
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
