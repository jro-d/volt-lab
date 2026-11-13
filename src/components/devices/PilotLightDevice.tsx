import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface PilotLightDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
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
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isLit = !!device.state.pilotLit;
  const color = device.state.pilotColor || 'green';
  const cx = width / 2;
  const lensCy = height * 0.44;

  let core = '#4ade80';
  let mid = '#16a34a';
  let dark = '#14532d';
  let halo = 'rgba(34, 197, 94, 0.65)';
  if (color === 'red') {
    core = '#fca5a5';
    mid = '#dc2626';
    dark = '#7f1d1d';
    halo = 'rgba(239, 68, 68, 0.65)';
  } else if (color === 'amber') {
    core = '#fde047';
    mid = '#d97706';
    dark = '#78350f';
    halo = 'rgba(245, 158, 11, 0.65)';
  } else if (color === 'blue') {
    core = '#93c5fd';
    mid = '#2563eb';
    dark = '#1e3a8a';
    halo = 'rgba(59, 130, 246, 0.65)';
  }

  const handleToggleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      const colors = ['green', 'red', 'amber', 'blue'];
      const nextIdx = (colors.indexOf(color) + 1) % colors.length;
      onToggleState({
        ...device,
        state: {
          ...device.state,
          pilotColor: colors[nextIdx],
        },
      });
    }
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`plChrome-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <radialGradient id={`plDome-${uid}`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor={isLit ? '#ffffff' : core} />
          <stop offset="38%" stopColor={isLit ? core : mid} />
          <stop offset="100%" stopColor={isLit ? mid : dark} />
        </radialGradient>
      </defs>

      {/* Panel Mounting Housing Block */}
      <rect x={2} y={4} width={width} height={height} rx={8} fill="rgba(15, 23, 42, 0.24)" />
      <rect x={0} y={0} width={width} height={height} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
      <rect x={4} y={4} width={width - 8} height={height - 8} rx={6} fill="#0f172a" stroke="#334155" strokeWidth={0.9} />

      {/* Outer Radiant Glow when Illuminated */}
      {isLit && <circle cx={cx} cy={lensCy} r={26} fill={halo} className="pointer-events-none animate-pulse" />}

      {/* 22mm Brushed-Chrome Knurled Bezel Collar */}
      <g onClick={handleToggleColor} className="cursor-pointer">
        <circle cx={cx} cy={lensCy} r={19} fill={`url(#plChrome-${uid})`} stroke="#1e293b" strokeWidth={1.2} />
        <circle cx={cx} cy={lensCy} r={15.5} fill="#0f172a" />

        {/* Diamond-Cut Fresnel Dome Lens */}
        <circle cx={cx} cy={lensCy} r={14} fill={`url(#plDome-${uid})`} stroke={dark} strokeWidth={0.8} />
        {/* Facet Rings & Specular Arc */}
        <circle cx={cx} cy={lensCy} r={8.5} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={0.8} />
        <path
          d={`M ${cx - 8} ${lensCy - 6} A 10 10 0 0 1 ${cx - 1} ${lensCy - 10}`}
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>

      <text x={cx} y={height - 15} textAnchor="middle" fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill="#cbd5e1">
        {isLit ? `● 22mm ${color.toUpperCase()} ON` : `22mm LED · CLICK LENS`}
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
