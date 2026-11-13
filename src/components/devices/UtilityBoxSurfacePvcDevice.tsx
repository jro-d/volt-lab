import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style 2"x4" Rectangular Surface/Flush Utility Box (PVC or GI Steel).
 * Embedded material toggle & L/N/PE pass-through labels with zero external pills.
 */
export const UtilityBoxSurfacePvcDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isSteel = device.state.boxMaterial === 'galvanized_steel';
  const cx = x + width / 2;
  const cy = y + height / 2;

  const handleToggleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isSteel ? 'orange_pvc' : 'galvanized_steel';
    if (onPatchState) onPatchState(device.id, { boxMaterial: next });
    else {
      device.state.boxMaterial = next;
      onToggleState?.({ ...device, state: { ...device.state, boxMaterial: next } });
    }
  };

  return (
    <g className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15, 23, 42, 0.16)" />

      {/* Outer Lip */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={isSteel ? '#cbd5e1' : '#ea580c'}
        stroke="#0f172a"
        strokeWidth={1.3}
      />

      {/* Deep Recessed Cavity */}
      <rect
        x={x + 5}
        y={y + 6}
        width={width - 10}
        height={height - 12}
        rx={3}
        fill={isSteel ? '#475569' : '#9a3412'}
        stroke="#1e293b"
        strokeWidth={0.9}
      />

      {/* Top/Bottom Knockout Rings */}
      <circle cx={cx} cy={y + 3.5} r={2.6} fill="none" stroke={isSteel ? '#e2e8f0' : '#fed7aa'} strokeDasharray="1.5 1" strokeWidth={0.8} />
      <circle cx={cx} cy={y + height - 3.5} r={2.6} fill="none" stroke={isSteel ? '#e2e8f0' : '#fed7aa'} strokeDasharray="1.5 1" strokeWidth={0.8} />

      {/* Pass-Through Barrier Block */}
      <rect x={x + 8} y={y + 9} width={width - 16} height={height - 18} rx={2.5} fill="#0f172a" stroke="#334155" strokeWidth={0.9} />

      {/* Top Embedded Silkscreen Strip */}
      <rect x={x + 9} y={y + 24} width={width - 18} height={8} fill="#1e293b" />
      {[
        { rel: 0.25, lbl: 'L IN', col: '#f87171' },
        { rel: 0.50, lbl: 'N IN', col: '#60a5fa' },
        { rel: 0.75, lbl: 'PE', col: '#4ade80' },
      ].map((t) => (
        <text key={`ubt-${t.lbl}`} x={x + width * t.rel} y={y + 29.8} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      {/* Internal Continuity Traces */}
      <line x1={x + width * 0.25} y1={y + 34} x2={x + width * 0.25} y2={y + height - 34} stroke="#dc2626" strokeWidth={1.1} strokeDasharray="2 2" opacity={0.5} />
      <line x1={cx} y1={y + 34} x2={cx} y2={y + height - 34} stroke="#2563eb" strokeWidth={1.1} strokeDasharray="2 2" opacity={0.5} />
      <line x1={x + width * 0.75} y1={y + 34} x2={x + width * 0.75} y2={y + height - 34} stroke="#16a34a" strokeWidth={1.1} strokeDasharray="2 2" opacity={0.5} />

      {/* Center Label + Embedded Material Toggle Chip */}
      <rect x={x + 12} y={cy - 12} width={width - 24} height={24} rx={2.5} fill="#1e293b" stroke="#475569" strokeWidth={0.8} />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f8fafc">
        2"×4" UTILITY
      </text>
      <g onMouseDown={stopCanvas} onClick={handleToggleMaterial} className="cursor-pointer">
        <title>Switch box material between Orange PVC and Galvanized Steel</title>
        <rect x={cx - 18} y={cy + 1} width={36} height={9} rx={1.8} fill="#0f172a" stroke="#f59e0b" strokeWidth={0.6} />
        <text x={cx} y={cy + 7.2} textAnchor="middle" fontSize="3.9" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fef08a">
          {isSteel ? 'GI STEEL' : 'PVC BOX'}
        </text>
      </g>

      {/* Bottom Embedded Silkscreen Strip */}
      <rect x={x + 9} y={y + height - 32} width={width - 18} height={8} fill="#1e293b" />
      {[
        { rel: 0.25, lbl: 'L OUT', col: '#f87171' },
        { rel: 0.50, lbl: 'N OUT', col: '#60a5fa' },
        { rel: 0.75, lbl: 'PE', col: '#4ade80' },
      ].map((t) => (
        <text key={`ubb-${t.lbl}`} x={x + width * t.rel} y={y + height - 26.2} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
