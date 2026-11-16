import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style 8-Pin / DIN Socket DPDT Industrial Ice-Cube Control Relay.
 * Top (A1, 14, 12, 11) and bottom (A2, 24, 22, 21) silkscreen labels embedded in dark socket bands.
 */
export const IndustrialRelayDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isEnergized = !!device.state.coilEnergized;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isEnergized;
    if (onPatchState) onPatchState(device.id, { manualTest: !device.state.manualTest, coilEnergized: next });
    else onToggleState?.({ ...device, state: { ...device.state, manualTest: !device.state.manualTest, coilEnergized: next } });
  };

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="transparent" />
      {/* DIN Relay Socket Body */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Top Cage Terminal Bay + Embedded Labels */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={17} rx={2} fill="var(--mat-housing-dark)" />
      <rect x={x + 2} y={y + 19} width={width - 4} height={7.5} fill="var(--mat-line)" />
      {[
        { rel: 0.20, lbl: 'A1', col: 'var(--port-control)' },
        { rel: 0.40, lbl: '14', col: 'var(--lamp-green-on)' },
        { rel: 0.60, lbl: '12', col: 'var(--lamp-amber-on)' },
        { rel: 0.80, lbl: '11', col: 'var(--lamp-blue-on)' },
      ].map((t) => (
        <text key={t.lbl} x={x + width * t.rel} y={y + 24.4} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      {/* Clear Ice-Cube Polycarbonate Window */}
      <rect x={x + 5} y={y + 28} width={width - 10} height={height - 56} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.1} />

      {/* Left Copper Bobbin + Coil Status LED */}
      <rect x={x + 10} y={y + 34} width={18} height={height - 76} rx={2} fill={isEnergized ? 'var(--mat-pvc-orange)' : 'var(--mat-copper)'} stroke="var(--mat-copper-dark)" strokeWidth={0.8} />
      <circle cx={x + 19} cy={cy - 4} r={3} fill={isEnergized ? 'var(--lamp-green-on)' : 'var(--silk-muted)'} stroke="var(--mat-line)" strokeWidth={0.6} />

      {/* Dual DPDT Contact Blades */}
      {[x + 41, x + 56].map((bx, i) => (
        <g key={`arm-${i}`}>
          <circle cx={bx - 4} cy={y + 42} r={1.8} fill="var(--mat-copper)" />
          <circle cx={bx + 4} cy={y + 42} r={1.8} fill="var(--mat-copper)" />
          <line
            x1={bx}
            y1={y + height - 42}
            x2={isEnergized ? bx + 4 : bx - 4}
            y2={y + 43}
            stroke={isEnergized ? 'var(--cond-green)' : 'var(--silk-muted)'}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Manual Test Button tucked cleanly right of coil */}
      <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
        <title>Manual test push-tab (energize DPDT coil)</title>
        <rect x={x + width - 27} y={y + 30} width={19} height={8.5} rx={1.5} fill={isEnergized ? 'var(--cond-red)' : 'var(--act-blue)'} stroke="var(--mat-line)" strokeWidth={0.6} />
        <text x={x + width - 17.5} y={y + 36} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          TEST
        </text>
      </g>

      <text x={cx} y={y + height - 30.5} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
        DPDT 230VAC · 10A
      </text>

      {/* Bottom Embedded Labels + Cage Terminal Bay */}
      <rect x={x + 2} y={y + height - 26.5} width={width - 4} height={7.5} fill="var(--mat-line)" />
      {[
        { rel: 0.20, lbl: 'A2', col: 'var(--port-control)' },
        { rel: 0.40, lbl: '24', col: 'var(--lamp-green-on)' },
        { rel: 0.60, lbl: '22', col: 'var(--lamp-amber-on)' },
        { rel: 0.80, lbl: '21', col: 'var(--lamp-blue-on)' },
      ].map((t) => (
        <text key={t.lbl} x={x + width * t.rel} y={y + height - 21} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill={t.col}>
          {t.lbl}
        </text>
      ))}
      <rect x={x + 2} y={y + height - 19} width={width - 4} height={17} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
