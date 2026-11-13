import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style 3-Phase 440V DIN-Rail Modular Distribution Terminal Block Assembly.
 * Individual modular slices for L1 (Red), L2 (Amber/Black), L3 (Blue), and PE (Green/Yellow).
 */
export const ThreePhaseSourceDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height } = device;
  const isEnergized = device.state.energized !== false;

  const slices: Array<{
    relX: number;
    label: string;
    sub: string;
    bodyFill: string;
    capFill: string;
    textFill: string;
  }> = [
    { relX: 0.18, label: 'L1', sub: '254V', bodyFill: '#94a3b8', capFill: '#dc2626', textFill: '#0f172a' },
    { relX: 0.39, label: 'L2', sub: '254V', bodyFill: '#94a3b8', capFill: '#d97706', textFill: '#0f172a' },
    { relX: 0.60, label: 'L3', sub: '254V', bodyFill: '#94a3b8', capFill: '#2563eb', textFill: '#0f172a' },
    { relX: 0.82, label: 'PE', sub: 'GND', bodyFill: '#4ade80', capFill: '#eab308', textFill: '#052e16' },
  ];

  const sliceW = 31;

  return (
    <g className="select-none">
      {/* Subtle architectural CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15, 23, 42, 0.14)" />

      {/* Outer DIN Terminal Frame Backing */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#334155" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Voltage Feeder Banner */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={15} rx={2} fill="#0f172a" />
      <circle cx={x + 11} cy={y + 9.5} r={2.6} fill={isEnergized ? '#22c55e' : '#64748b'} />
      <text x={x + 18} y={y + 11.4} fontSize="5.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f8fafc">
        3Φ 440V · 60Hz SUPPLY
      </text>
      <text x={x + width - 6} y={y + 11.4} textAnchor="end" fontSize="4.6" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#38bdf8">
        {device.state.tag || 'PWR'}
      </text>

      {/* Modular Sliced DIN Terminal Columns */}
      {slices.map((s) => {
        const cx = x + width * s.relX;
        const sx = cx - sliceW / 2;
        return (
          <g key={`slice-${s.label}`}>
            <rect x={sx} y={y + 19} width={sliceW} height={height - 21} rx={2} fill={s.bodyFill} stroke="#0f172a" strokeWidth={1} />
            {/* Top Phase Identification Color Cap */}
            <rect x={sx + 1} y={y + 20} width={sliceW - 2} height={8} rx={1} fill={s.capFill} />
            <text x={cx} y={y + 25.8} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
              {s.label}
            </text>

            {/* Test Jumper Socket Detail */}
            <circle cx={cx} cy={y + 39} r={4.2} fill="#1f2937" stroke="#0f172a" strokeWidth={0.7} />
            <circle cx={cx} cy={y + 39} r={1.8} fill="#cbd5e1" />

            {/* Embedded Silkscreen Plate */}
            <rect x={sx + 3} y={y + 47} width={sliceW - 6} height={14} rx={1.5} fill="#f8fafc" stroke="#64748b" strokeWidth={0.6} />
            <text x={cx} y={y + 53.5} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill={s.textFill}>
              {s.label}
            </text>
            <text x={cx} y={y + 59.3} textAnchor="middle" fontSize="3.8" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#475569">
              {s.sub}
            </text>

            {/* Bottom Recessed Terminal Bay */}
            <rect x={sx + 2} y={y + height - 24} width={sliceW - 4} height={20} rx={2} fill="#1f2937" />
          </g>
        );
      })}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
