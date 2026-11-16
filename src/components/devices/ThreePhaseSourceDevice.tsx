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
    { relX: 0.18, label: 'L1', sub: '254V', bodyFill: 'var(--mat-steel)', capFill: 'var(--cond-red)', textFill: 'var(--mat-line)' },
    { relX: 0.39, label: 'L2', sub: '254V', bodyFill: 'var(--mat-steel)', capFill: 'var(--mat-copper)', textFill: 'var(--mat-line)' },
    { relX: 0.60, label: 'L3', sub: '254V', bodyFill: 'var(--mat-steel)', capFill: 'var(--cond-blue)', textFill: 'var(--mat-line)' },
    { relX: 0.82, label: 'PE', sub: 'GND', bodyFill: 'var(--lamp-green-on)', capFill: 'var(--act-yellow)', textFill: 'var(--lamp-green-off)' },
  ];

  const sliceW = 31;

  return (
    <g className="select-none">
      {/* Subtle architectural CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="transparent" />

      {/* Outer DIN Terminal Frame Backing */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Top Voltage Feeder Banner */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={15} rx={2} fill="var(--mat-line)" />
      <circle cx={x + 11} cy={y + 9.5} r={2.6} fill={isEnergized ? 'var(--lamp-green-on)' : 'var(--mat-line-soft)'} />
      <text x={x + 18} y={y + 11.4} fontSize="5.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        3Φ 440V · 60Hz SUPPLY
      </text>
      <text x={x + width - 6} y={y + 11.4} textAnchor="end" fontSize="4.6" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--nameplate-tag)">
        {device.state.tag || 'PWR'}
      </text>

      {/* Modular Sliced DIN Terminal Columns */}
      {slices.map((s) => {
        const cx = x + width * s.relX;
        const sx = cx - sliceW / 2;
        return (
          <g key={`slice-${s.label}`}>
            <rect x={sx} y={y + 19} width={sliceW} height={height - 21} rx={2} fill={s.bodyFill} stroke="var(--mat-line)" strokeWidth={1} />
            {/* Top Phase Identification Color Cap */}
            <rect x={sx + 1} y={y + 20} width={sliceW - 2} height={8} rx={1} fill={s.capFill} />
            <text x={cx} y={y + 25.8} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
              {s.label}
            </text>

            {/* Test Jumper Socket Detail */}
            <circle cx={cx} cy={y + 39} r={4.2} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.7} />
            <circle cx={cx} cy={y + 39} r={1.8} fill="var(--mat-housing-shade)" />

            {/* Embedded Silkscreen Plate */}
            <rect x={sx + 3} y={y + 47} width={sliceW - 6} height={14} rx={1.5} fill="var(--mat-housing)" stroke="var(--mat-line-soft)" strokeWidth={0.6} />
            <text x={cx} y={y + 53.5} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="var(--font-mono)" fill={s.textFill}>
              {s.label}
            </text>
            <text x={cx} y={y + 59.3} textAnchor="middle" fontSize="3.8" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
              {s.sub}
            </text>

            {/* Bottom Recessed Terminal Bay */}
            <rect x={sx + 2} y={y + height - 24} width={sliceW - 4} height={20} rx={2} fill="var(--mat-housing-dark)" />
          </g>
        );
      })}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
