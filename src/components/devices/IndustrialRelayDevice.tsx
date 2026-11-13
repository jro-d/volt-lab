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
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15, 23, 42, 0.16)" />
      {/* DIN Relay Socket Body */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#334155" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Cage Terminal Bay + Embedded Labels */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={17} rx={2} fill="#1f2937" />
      <rect x={x + 2} y={y + 19} width={width - 4} height={7.5} fill="#0f172a" />
      {[
        { rel: 0.20, lbl: 'A1', col: '#d8b4fe' },
        { rel: 0.40, lbl: '14', col: '#6ee7b7' },
        { rel: 0.60, lbl: '12', col: '#fcd34d' },
        { rel: 0.80, lbl: '11', col: '#93c5fd' },
      ].map((t) => (
        <text key={t.lbl} x={x + width * t.rel} y={y + 24.4} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      {/* Clear Ice-Cube Polycarbonate Window */}
      <rect x={x + 5} y={y + 28} width={width - 10} height={height - 56} rx={3} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.1} />

      {/* Left Copper Bobbin + Coil Status LED */}
      <rect x={x + 10} y={y + 34} width={18} height={height - 76} rx={2} fill={isEnergized ? '#f97316' : '#b45309'} stroke="#78350f" strokeWidth={0.8} />
      <circle cx={x + 19} cy={cy - 4} r={3} fill={isEnergized ? '#22c55e' : '#475569'} stroke="#0f172a" strokeWidth={0.6} />

      {/* Dual DPDT Contact Blades */}
      {[x + 41, x + 56].map((bx, i) => (
        <g key={`arm-${i}`}>
          <circle cx={bx - 4} cy={y + 42} r={1.8} fill="#d97706" />
          <circle cx={bx + 4} cy={y + 42} r={1.8} fill="#d97706" />
          <line
            x1={bx}
            y1={y + height - 42}
            x2={isEnergized ? bx + 4 : bx - 4}
            y2={y + 43}
            stroke={isEnergized ? '#16a34a' : '#475569'}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Manual Test Button tucked cleanly right of coil */}
      <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
        <title>Manual test push-tab (energize DPDT coil)</title>
        <rect x={x + width - 27} y={y + 30} width={19} height={8.5} rx={1.5} fill={isEnergized ? '#dc2626' : '#0284c7'} stroke="#0f172a" strokeWidth={0.6} />
        <text x={x + width - 17.5} y={y + 36} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
          TEST
        </text>
      </g>

      <text x={cx} y={y + height - 30.5} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1e293b">
        DPDT 230VAC · 10A
      </text>

      {/* Bottom Embedded Labels + Cage Terminal Bay */}
      <rect x={x + 2} y={y + height - 26.5} width={width - 4} height={7.5} fill="#0f172a" />
      {[
        { rel: 0.20, lbl: 'A2', col: '#d8b4fe' },
        { rel: 0.40, lbl: '24', col: '#6ee7b7' },
        { rel: 0.60, lbl: '22', col: '#fcd34d' },
        { rel: 0.80, lbl: '21', col: '#93c5fd' },
      ].map((t) => (
        <text key={t.lbl} x={x + width * t.rel} y={y + height - 21} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
          {t.lbl}
        </text>
      ))}
      <rect x={x + 2} y={y + height - 19} width={width - 4} height={17} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
