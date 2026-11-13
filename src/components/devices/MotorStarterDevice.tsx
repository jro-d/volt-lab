import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style IP65 Direct-On-Line (DOL) Magnetic Motor Starter Enclosure.
 * Embedded L1/L2/L3/PE top pocket band so terminals never collide with header.
 */
export const MotorStarterDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isRunning = !!device.state.running;
  const cx = x + width / 2;

  const setRunning = (next: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, { running: next });
    else {
      device.state.running = next;
      onToggleState?.({ ...device, state: { ...device.state, running: next } });
    }
  };

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15, 23, 42, 0.16)" />
      {/* Outer Enclosure */}
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Gland Terminal Bay + Embedded Silkscreen */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={22} rx={2} fill="#1f2937" />
      <rect x={x + 3} y={y + 24} width={width - 6} height={8} fill="#0f172a" />
      {[
        { rel: 0.20, lbl: 'L1', col: '#f87171' },
        { rel: 0.40, lbl: 'L2', col: '#fde047' },
        { rel: 0.60, lbl: 'L3', col: '#60a5fa' },
        { rel: 0.80, lbl: 'PE', col: '#4ade80' },
      ].map((t) => (
        <text key={t.lbl} x={x + width * t.rel} y={y + 29.8} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      {/* Front Operator Escutcheon */}
      <rect x={x + 6} y={y + 34} width={width - 12} height={height - 40} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
      <rect x={x + 9} y={y + 37} width={width - 18} height={13} rx={1.5} fill="#0f172a" />
      <text x={cx} y={y + 45.8} textAnchor="middle" fontSize="5.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f8fafc" letterSpacing="0.4">
        DOL MOTOR STARTER
      </text>

      {/* Run / Stop Status Indicator */}
      <circle cx={x + 20} cy={y + 59} r={3.2} fill={isRunning ? '#22c55e' : '#ef4444'} stroke="#0f172a" strokeWidth={0.7} />
      <text x={x + 27} y={y + 61.2} fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill={isRunning ? '#4ade80' : '#fca5a5'}>
        {isRunning ? 'MOTOR RUN' : 'STOPPED'}
      </text>

      {/* Recessed Shrouded START / STOP Buttons */}
      <g onMouseDown={stopCanvas} onClick={(e) => setRunning(true, e)} className="cursor-pointer">
        <title>START Motor (I)</title>
        <circle cx={cx - 22} cy={y + 88} r={14} fill="#0f172a" stroke="#64748b" strokeWidth={1} />
        <circle cx={cx - 22} cy={y + 88} r={11} fill="#22c55e" stroke="#14532d" strokeWidth={0.9} />
        <text x={cx - 22} y={y + 91.5} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
          I
        </text>
      </g>

      <g onMouseDown={stopCanvas} onClick={(e) => setRunning(false, e)} className="cursor-pointer">
        <title>STOP Motor (O)</title>
        <circle cx={cx + 22} cy={y + 88} r={14} fill="#0f172a" stroke="#64748b" strokeWidth={1} />
        <circle cx={cx + 22} cy={y + 88} r={11} fill="#ef4444" stroke="#7f1d1d" strokeWidth={0.9} />
        <text x={cx + 22} y={y + 91.5} textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">
          O
        </text>
      </g>

      <text x={cx} y={y + height - 13} textAnchor="middle" fontSize="4.6" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#94a3b8">
        INTEGRATED THERMAL O/L
      </text>

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
