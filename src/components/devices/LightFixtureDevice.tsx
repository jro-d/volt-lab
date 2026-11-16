import React, { useId } from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style Porcelain Keyless Lamp Receptacle & Incandescent/LED A19 Bulb Fixture.
 */
export const LightFixtureDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const uid = useId().replace(/:/g, '');
  const { x, y, width, height } = device;
  const isLit = !!device.state.lit;
  const wattage = device.state.wattage || 60;
  const cx = x + width / 2;

  return (
    <g className="select-none">
      <defs>
        <radialGradient id={`bulbGlow-${uid}`} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="var(--lamp-white-on)" stopOpacity={0.95} />
          <stop offset="50%" stopColor="var(--act-yellow)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="var(--lamp-amber-on)" stopOpacity={0} />
        </radialGradient>
      </defs>

      {isLit && <circle cx={cx} cy={y + 24} r={38} fill={`url(#bulbGlow-${uid})`} className="pointer-events-none" />}

      {/* Glass Bulb Globe */}
      <path
        d={`M ${cx - 10} ${y + 42} C ${cx - 13} ${y + 34}, ${cx - 21} ${y + 27}, ${cx - 21} ${y + 18} A 21 21 0 1 1 ${cx + 21} ${y + 18} C ${cx + 21} ${y + 27}, ${cx + 13} ${y + 34}, ${cx + 10} ${y + 42} Z`}
        fill={isLit ? 'var(--act-yellow)' : 'var(--mat-housing)'}
        stroke="var(--mat-line)"
        strokeWidth={1.2}
      />

      {/* Tungsten Filament & Leads */}
      <path d={`M ${cx - 4} ${y + 42} L ${cx - 3} ${y + 27} M ${cx + 4} ${y + 42} L ${cx + 3} ${y + 27}`} stroke="var(--silk-muted)" strokeWidth={0.9} fill="none" />
      <path d={`M ${cx - 6} ${y + 24} Q ${cx - 3} ${y + 19} ${cx} ${y + 24} Q ${cx + 3} ${y + 19} ${cx + 6} ${y + 24}`} fill="none" stroke={isLit ? 'var(--mat-housing)' : 'var(--mat-line-soft)'} strokeWidth={isLit ? 1.8 : 1.1} />

      <text x={cx} y={y + 36} textAnchor="middle" fontSize="5.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
        {wattage}W
      </text>

      {/* Edison E27 Brass Screw Neck */}
      <rect x={cx - 10} y={y + 42} width={20} height={11} rx={1.5} fill="var(--mat-copper)" stroke="var(--mat-line)" strokeWidth={0.9} />
      {[45, 48, 51].map((dy) => (
        <line key={dy} x1={cx - 9} y1={y + dy} x2={cx + 9} y2={y + dy} stroke="var(--mat-copper-dark)" strokeWidth={0.8} />
      ))}

      {/* Glazed Porcelain Receptacle Base & Terminal Pocket */}
      <rect x={x + 4} y={y + 53} width={width - 8} height={35} rx={4} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1.2} />
      <rect x={x + 6} y={y + 55} width={width - 12} height={11} rx={2} fill="var(--mat-housing-shade)" />
      <text x={cx} y={y + 62.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
        E27 · 230V
      </text>

      {/* Embedded L / N Pocket Band */}
      <rect x={x + 6} y={y + 67} width={width - 12} height={7} fill="var(--mat-line)" />
      <text x={x + width * 0.30} y={y + 72.3} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--mat-pvc-orange)">
        L
      </text>
      <text x={x + width * 0.70} y={y + 72.3} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        N
      </text>
      <rect x={x + 6} y={y + 74} width={width - 12} height={13} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
