import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style ROYU 2P Enclosed Safety Breaker (ACU Disconnect, NEMA 1).
 * Embedded toggle for Inspect Lugs / Front Cover inside header — no floating external pills.
 */
export const RoyuSafetyBreakerDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isTripped = !!device.state.tripped;
  const isClosed = !!device.state.closed && !isTripped;
  const ratedAmps = device.state.ratedAmps || 30;
  const isCoverOpen = !!device.state.enclosureCoverOpen;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const patch = (p: Record<string, any>) => {
    if (onPatchState) onPatchState(device.id, p);
    else {
      Object.assign(device.state, p);
      onToggleState?.({ ...device, state: { ...device.state, ...p } });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTripped) patch({ tripped: false, closed: true });
    else patch({ closed: !device.state.closed });
  };

  const handleToggleCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    patch({ enclosureCoverOpen: !isCoverOpen });
  };

  return (
    <g className="select-none">
      {/* Subtle CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />

      {/* Outer NEMA 1 Surface Enclosure */}
      <rect x={x} y={y} width={width} height={height} rx={5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.4} />

      {/* Top Conduit Entry & Line Terminal Bay (L1, L2) */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={20} rx={3} fill="var(--mat-housing-dark)" />
      <rect x={x + 2} y={y + 22} width={width - 4} height={8} fill="var(--nameplate)" />
      <text x={x + width * 0.28} y={y + 27.6} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-red-on)">
        L1 IN
      </text>
      <text x={x + width * 0.72} y={y + 27.6} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        L2 IN
      </text>

      {/* Embedded ROYU Header + Cover Inspection Toggle (No floating external pill) */}
      <rect x={x + 3} y={y + 31} width={width - 6} height={14} rx={2} fill="var(--mat-line)" />
      <text x={x + 7} y={y + 40} fontSize="5.6" fontWeight="900" fontFamily="var(--font-display)" fill="var(--act-red)">
        ROYU
      </text>
      <g onMouseDown={stopCanvas} onClick={handleToggleCover} className="cursor-pointer">
        <title>{isCoverOpen ? 'Close front cover' : 'Open cover to inspect internal bolt-on breaker & lugs'}</title>
        <rect x={x + width - 38} y={y + 33} width={33} height={10} rx={2} fill={isCoverOpen ? 'var(--act-blue)' : 'var(--mat-housing-dark-face)'} stroke="var(--lamp-blue-on)" strokeWidth={0.6} />
        <text x={x + width - 21.5} y={y + 39.8} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          {isCoverOpen ? 'COVER' : 'LUGS'}
        </text>
      </g>

      {!isCoverOpen ? (
        <g>
          {/* Molded Front Cover Panel */}
          <rect x={x + 4} y={y + 47} width={width - 8} height={height - 77} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth={1} />
          <text x={cx} y={y + 57} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
            SAFETY BREAKER {ratedAmps}A
          </text>

          {/* Breaker Window Housing */}
          <rect x={cx - 19} y={cy - 10} width={38} height={32} rx={3} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={1} />
          {/* Flag Window */}
          <rect x={cx - 14} y={cy - 7} width={28} height={6} rx={1} fill={isTripped ? 'var(--lamp-amber-on)' : isClosed ? 'var(--cond-red)' : 'var(--cond-green)'} />
          <text x={cx} y={cy - 2.3} textAnchor="middle" fontSize="4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
            {isTripped ? 'TRIP' : isClosed ? 'I-ON' : 'O-OFF'}
          </text>

          {/* Tactile Switch Rocker */}
          <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
            <title>Click to toggle ROYU 2P Safety Breaker (or reset trip)</title>
            <rect
              x={cx - 12}
              y={isTripped ? cy + 5 : isClosed ? cy + 1 : cy + 10}
              width={24}
              height={10}
              rx={2}
              fill="var(--nameplate)"
              stroke="var(--mat-steel)"
              strokeWidth={0.8}
            />
            <line x1={cx - 7} y1={isTripped ? cy + 10 : isClosed ? cy + 6 : cy + 15} x2={cx + 7} y2={isTripped ? cy + 10 : isClosed ? cy + 6 : cy + 15} stroke="var(--mat-housing)" strokeWidth={1.1} />
          </g>

          <text x={cx} y={cy + 31} textAnchor="middle" fontSize="4.2" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            2P 240V~ · 10kAIC
          </text>
        </g>
      ) : (
        <g>
          {/* Open Enclosure Bay revealing Internal Busbars & Bolt-On Breaker */}
          <rect x={x + 4} y={y + 47} width={width - 8} height={height - 77} rx={3} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={1} />
          {/* Copper Feed Bus Straps */}
          <rect x={x + 12} y={y + 49} width={5} height={height - 81} rx={1} fill="var(--mat-copper)" />
          <rect x={x + width - 17} y={y + 49} width={5} height={height - 81} rx={1} fill="var(--mat-copper)" />

          {/* Exposed Internal 2P Phenolic Breaker */}
          <rect x={cx - 21} y={cy - 14} width={42} height={42} rx={3} fill="var(--nameplate)" stroke="var(--mat-line-soft)" strokeWidth={1} />
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
            ROYU {ratedAmps}A
          </text>
          <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
            <rect x={cx - 12} y={cy + 1} width={24} height={15} rx={2} fill="var(--mat-line)" stroke="var(--silk-muted)" strokeWidth={0.8} />
            <rect
              x={cx - 9}
              y={isTripped ? cy + 5 : isClosed ? cy + 2.5 : cy + 8.5}
              width={18}
              height={6}
              rx={1.5}
              fill={isTripped ? 'var(--lamp-amber-on)' : isClosed ? 'var(--cond-red)' : 'var(--cond-green)'}
            />
          </g>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize="3.9" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
            BOLT-ON LUGS
          </text>
        </g>
      )}

      {/* Embedded Bottom Silkscreen Band (T1 / PE / T2) */}
      <rect x={x + 2} y={y + height - 29} width={width - 4} height={8} fill="var(--nameplate)" />
      <text x={x + width * 0.28} y={y + height - 23.4} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        T1
      </text>
      <text x={cx} y={y + height - 23.4} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-green-on)">
        PE
      </text>
      <text x={x + width * 0.72} y={y + height - 23.4} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        T2
      </text>

      {/* Bottom Terminal Bay */}
      <rect x={x + 2} y={y + height - 21} width={width - 4} height={19} rx={3} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
