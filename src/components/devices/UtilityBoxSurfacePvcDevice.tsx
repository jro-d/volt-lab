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
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />

      {/* Outer Lip */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={isSteel ? 'var(--mat-housing-shade)' : 'var(--mat-pvc-orange)'}
        stroke="var(--mat-line)"
        strokeWidth={1.3}
      />

      {/* Deep Recessed Cavity */}
      <rect
        x={x + 5}
        y={y + 6}
        width={width - 10}
        height={height - 12}
        rx={3}
        fill={isSteel ? 'var(--silk-muted)' : 'var(--mat-pvc-orange-dark)'}
        stroke="var(--mat-housing-dark)"
        strokeWidth={0.9}
      />

      {/* Top/Bottom Knockout Rings */}
      <circle cx={cx} cy={y + 3.5} r={2.6} fill="none" stroke={isSteel ? 'var(--mat-housing-shade)' : '#fed7aa'} strokeDasharray="1.5 1" strokeWidth={0.8} />
      <circle cx={cx} cy={y + height - 3.5} r={2.6} fill="none" stroke={isSteel ? 'var(--mat-housing-shade)' : '#fed7aa'} strokeDasharray="1.5 1" strokeWidth={0.8} />

      {/* Pass-Through Barrier Block */}
      <rect x={x + 8} y={y + 9} width={width - 16} height={height - 18} rx={2.5} fill="var(--mat-line)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.9} />

      {/* Top Embedded Silkscreen Strip */}
      <rect x={x + 9} y={y + 24} width={width - 18} height={8} fill="var(--mat-housing-dark)" />
      {[
        { rel: 0.25, lbl: 'L IN', col: 'var(--lamp-red-on)' },
        { rel: 0.50, lbl: 'N IN', col: 'var(--lamp-blue-on)' },
        { rel: 0.75, lbl: 'PE', col: 'var(--lamp-green-on)' },
      ].map((t) => (
        <text key={`ubt-${t.lbl}`} x={x + width * t.rel} y={y + 29.8} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      {/* Internal Continuity Traces */}
      <line x1={x + width * 0.25} y1={y + 34} x2={x + width * 0.25} y2={y + height - 34} stroke="var(--cond-red)" strokeWidth={1.1} strokeDasharray="2 2" opacity={0.5} />
      <line x1={cx} y1={y + 34} x2={cx} y2={y + height - 34} stroke="var(--cond-blue)" strokeWidth={1.1} strokeDasharray="2 2" opacity={0.5} />
      <line x1={x + width * 0.75} y1={y + 34} x2={x + width * 0.75} y2={y + height - 34} stroke="var(--cond-green)" strokeWidth={1.1} strokeDasharray="2 2" opacity={0.5} />

      {/* Center Label + Embedded Material Toggle Chip */}
      <rect x={x + 12} y={cy - 12} width={width - 24} height={24} rx={2.5} fill="var(--mat-housing-dark)" stroke="var(--silk-muted)" strokeWidth={0.8} />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        2"×4" UTILITY
      </text>
      <g onMouseDown={stopCanvas} onClick={handleToggleMaterial} className="cursor-pointer">
        <title>Switch box material between Orange PVC and Galvanized Steel</title>
        <rect x={cx - 18} y={cy + 1} width={36} height={9} rx={1.8} fill="var(--mat-line)" stroke="var(--lamp-amber-on)" strokeWidth={0.6} />
        <text x={cx} y={cy + 7.2} textAnchor="middle" fontSize="3.9" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-white-on)">
          {isSteel ? 'GI STEEL' : 'PVC BOX'}
        </text>
      </g>

      {/* Bottom Embedded Silkscreen Strip */}
      <rect x={x + 9} y={y + height - 32} width={width - 18} height={8} fill="var(--mat-housing-dark)" />
      {[
        { rel: 0.25, lbl: 'L OUT', col: 'var(--lamp-red-on)' },
        { rel: 0.50, lbl: 'N OUT', col: 'var(--lamp-blue-on)' },
        { rel: 0.75, lbl: 'PE', col: 'var(--lamp-green-on)' },
      ].map((t) => (
        <text key={`ubb-${t.lbl}`} x={x + width * t.rel} y={y + height - 26.2} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill={t.col}>
          {t.lbl}
        </text>
      ))}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
