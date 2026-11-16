import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style ROYU Duplex Universal Wall Receptacle / Schuko Outlet.
 * Horizontal dual-gang geometry sized inside width x height with embedded [FRONT/REAR] toggle
 * and zero overlapping terminal/receptacle labels.
 */
export const SocketDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isSchuko = device.type === 'socket_schuko';
  const isPowered = !!device.state.powered;
  const isRearView = device.state.viewMode === 'rear';
  const cx = x + width / 2;
  const cy = y + height / 2;

  const handleFlipView = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isRearView ? 'front' : 'rear';
    if (onPatchState) onPatchState(device.id, { viewMode: next });
    else {
      device.state.viewMode = next;
      onToggleState?.({ ...device, state: { ...device.state, viewMode: next } });
    }
  };

  return (
    <g className="select-none">
      {/* Architectural CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />

      {/* Outer Contoured Molded Wallplate */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={isRearView ? 'var(--mat-housing-dark-face)' : 'var(--mat-housing)'}
        stroke={isPowered ? 'var(--cond-green)' : 'var(--mat-line)'}
        strokeWidth={1.3}
      />

      {/* Embedded Top Neutral Pocket Bar + Center [FRONT / REAR] Switch Pill */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={14} rx={2} fill="var(--mat-housing-dark)" />
      <text x={x + width * 0.14} y={y + 10.6} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        N1
      </text>
      <text x={x + width * 0.86} y={y + 10.6} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        N2
      </text>
      <g onMouseDown={stopCanvas} onClick={handleFlipView} className="cursor-pointer">
        <title>Flip between Front Receptacle Plate and Rear Strap Wiring</title>
        <rect x={cx - 15} y={y + 3.8} width={30} height={10} rx={2} fill={isRearView ? 'var(--act-blue)' : 'var(--mat-housing-dark-face)'} stroke="var(--lamp-blue-on)" strokeWidth={0.5} />
        <text x={cx} y={y + 10.4} textAnchor="middle" fontSize="4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          {isRearView ? 'FRONT' : 'REAR'}
        </text>
      </g>

      {isSchuko ? (
        !isRearView ? (
          <g>
            <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.25} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.1} />
            <circle cx={cx - 10} cy={cy} r={3} fill="var(--mat-line)" />
            <circle cx={cx + 10} cy={cy} r={3} fill="var(--mat-line)" />
            <circle cx={x + width - 11} cy={y + 24} r={2.4} fill={isPowered ? 'var(--lamp-green-on)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.5} />
          </g>
        ) : (
          <g>
            <rect x={x + 8} y={y + 18} width={width - 16} height={height - 36} rx={3} fill="var(--nameplate)" stroke="var(--silk-muted)" strokeWidth={0.9} />
            <text x={cx} y={cy + 2} textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
              SCHUKO REAR L · PE · N
            </text>
          </g>
        )
      ) : !isRearView ? (
        /* Horizontal 2-Gang ROYU Universal Receptacle Face */
        <g>
          <rect x={x + 5} y={y + 18} width={width - 10} height={height - 36} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth={0.8} />

          {/* Left & Right Universal 3-Prong Receptacle Wells (flanking center PE screw at x=cx) */}
          {[x + width * 0.26, x + width * 0.74].map((gx, idx) => (
            <g key={`sockg-${idx}`} transform={`translate(${gx}, ${cy})`}>
              <rect x={-16} y={-12} width={32} height={24} rx={3} fill="var(--mat-housing)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.9} />
              {/* Phase & Neutral Universal Shutter Slots */}
              <rect x={-11} y={-5} width={6.5} height={3} rx={0.8} fill="var(--mat-line)" />
              <rect x={4.5} y={-5} width={6.5} height={3} rx={0.8} fill="var(--mat-line)" />
              {/* D-Shaped Ground Slot */}
              <path d="M -2.5 2.5 L 2.5 2.5 L 2.5 6.5 A 2.5 2.5 0 0 1 -2.5 6.5 Z" fill="var(--cond-green)" stroke="var(--mat-line)" strokeWidth={0.5} />
              <circle cx={12} cy={-8} r={1.8} fill={isPowered ? 'var(--lamp-green-on)' : 'var(--mat-housing-shade)'} />
            </g>
          ))}

          {/* Galvanized Center PE Strap under PE screw */}
          <rect x={cx - 8} y={cy - 10} width={16} height={20} rx={2} fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth={0.7} />
          <text x={cx} y={cy + 14.5} textAnchor="middle" fontSize="3.9" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--cond-green)">
            PE
          </text>
        </g>
      ) : (
        /* Rear Busbar & Strap Assembly */
        <g>
          <rect x={x + 5} y={y + 18} width={width - 10} height={height - 36} rx={3} fill="var(--nameplate)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <line x1={x + 16} y1={y + 24} x2={x + width - 16} y2={y + 24} stroke="var(--lamp-blue-on)" strokeWidth={2} />
          <line x1={x + 16} y1={y + height - 24} x2={x + width - 16} y2={y + height - 24} stroke="var(--act-red)" strokeWidth={2} />
          <rect x={cx - 8} y={cy - 8} width={16} height={16} rx={2} fill="var(--cond-green)" stroke="var(--lamp-green-off)" strokeWidth={0.8} />
          <text x={x + 14} y={cy + 1.5} fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
            GALV BUS
          </text>
        </g>
      )}

      {/* Embedded Bottom Line Pocket Bar */}
      <rect x={x + 3} y={y + height - 16} width={width - 6} height={14} rx={2} fill="var(--mat-housing-dark)" />
      <text x={x + width * 0.14} y={y + height - 7.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-red-on)">
        L1
      </text>
      <text x={cx} y={y + height - 7.5} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-display)" fill="var(--act-red)">
        ROYU 16A 250V~
      </text>
      <text x={x + width * 0.86} y={y + height - 7.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-red-on)">
        L2
      </text>

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
