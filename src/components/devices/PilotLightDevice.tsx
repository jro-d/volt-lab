import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style 22mm Panel Pilot Lamp Indicator (Green / Red / Amber / Blue).
 */
export const PilotLightDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isLit = !!device.state.pilotLit;
  const color = device.state.pilotColor || 'green';
  const cx = x + width / 2;
  const lensCy = y + 27;

  const palette: Record<string, { on: string; off: string; dark: string }> = {
    green: { on: '#4ade80', off: '#16a34a', dark: '#14532d' },
    red: { on: '#fca5a5', off: '#dc2626', dark: '#7f1d1d' },
    amber: { on: '#fde047', off: '#d97706', dark: '#78350f' },
    blue: { on: '#93c5fd', off: '#2563eb', dark: '#1e3a8a' },
  };
  const pal = palette[color] || palette.green;

  const handleToggleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const colors = ['green', 'red', 'amber', 'blue'];
    const next = colors[(colors.indexOf(color) + 1) % colors.length];
    if (onPatchState) onPatchState(device.id, { pilotColor: next });
    else onToggleState?.({ ...device, state: { ...device.state, pilotColor: next } });
  };

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15, 23, 42, 0.16)" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.3} />
      <rect x={x + 3} y={y + 3} width={width - 6} height={height - 27} rx={3} fill="#e5e7eb" stroke="#64748b" strokeWidth={0.9} />

      {/* Halo Glow when Energized */}
      {isLit && <circle cx={cx} cy={lensCy} r={21} fill={pal.on} opacity={0.32} className="pointer-events-none" />}

      {/* 22mm Dome Lens Bezel */}
      <g onMouseDown={stopCanvas} onClick={handleToggleColor} className="cursor-pointer">
        <title>Click bezel to cycle pilot color (Green / Red / Amber / Blue)</title>
        <circle cx={cx} cy={lensCy} r={16.5} fill="#94a3b8" stroke="#0f172a" strokeWidth={1.1} />
        <circle cx={cx} cy={lensCy} r={13.5} fill="#1f2937" />
        <circle cx={cx} cy={lensCy} r={11.5} fill={isLit ? pal.on : pal.off} stroke={pal.dark} strokeWidth={0.9} />
        <path d={`M ${cx - 6} ${lensCy - 4} A 8 8 0 0 1 ${cx} ${lensCy - 8}`} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.8} strokeLinecap="round" />
      </g>

      <text x={cx} y={y + 52} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
        {isLit ? `● ${color.toUpperCase()} ON` : `22mm ${color.toUpperCase()}`}
      </text>

      {/* Embedded Bottom Silkscreen + Terminal Bay */}
      <rect x={x + 3} y={y + height - 24} width={width - 6} height={7} fill="#0f172a" />
      <text x={x + width * 0.30} y={y + height - 18.8} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f87171">
        X1
      </text>
      <text x={x + width * 0.70} y={y + height - 18.8} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#60a5fa">
        X2
      </text>
      <rect x={x + 3} y={y + height - 17} width={width - 6} height={15} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
