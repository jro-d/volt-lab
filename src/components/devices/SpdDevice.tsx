import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style Type 2 Surge Protective Device (SPD 1P+N 40kA).
 * Crisp flat CAD housing with pluggable L-N / N-PE cartridges and non-overlapping labels.
 */
export const SpdDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height } = device;
  const isHealthy = device.state.healthy !== false;
  const cx = x + width / 2;

  return (
    <g className="select-none">
      {/* Subtle CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="transparent" />

      {/* Outer Dark DIN Base Housing */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Top Terminal Bay (L / N) */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={17} rx={2} fill="var(--mat-housing-dark)" />
      <line x1={cx} y1={y + 2} x2={cx} y2={y + 19} stroke="var(--silk-muted)" strokeWidth={0.8} />

      {/* Embedded Top Silkscreen Strip */}
      <rect x={x + 2} y={y + 19} width={width - 4} height={8} fill="var(--mat-line)" />
      <text x={x + width * 0.35} y={y + 25} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-red-on)">
        L
      </text>
      <text x={x + width * 0.65} y={y + 25} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        N
      </text>

      {/* Two Pluggable MOV / GDT Cartridges */}
      {[0, 1].map((idx) => {
        const cw = (width - 10) / 2;
        const x0 = x + 4 + idx * (cw + 2);
        const isLine = idx === 0;
        const cartCx = x0 + cw / 2;
        return (
          <g key={`cart-${idx}`}>
            <rect
              x={x0}
              y={y + 29}
              width={cw}
              height={height - 58}
              rx={2.5}
              fill="var(--mat-housing)"
              stroke="var(--mat-line)"
              strokeWidth={1}
            />
            {/* Color Header Band */}
            <rect x={x0 + 0.5} y={y + 29.5} width={cw - 1} height={11} rx={1.5} fill={isLine ? 'var(--cond-red)' : 'var(--cond-green)'} />
            <text x={cartCx} y={y + 37} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
              {isLine ? 'L-N' : 'N-PE'}
            </text>

            {/* Health Window Flag */}
            <rect
              x={cartCx - 6.5}
              y={y + 45}
              width={13}
              height={7.5}
              rx={1}
              fill={isHealthy ? 'var(--cond-green)' : 'var(--cond-red)'}
              stroke="var(--mat-line)"
              strokeWidth={0.8}
            />
            <text x={cartCx} y={y + 58} textAnchor="middle" fontSize="3.6" fontWeight="900" fontFamily="var(--font-mono)" fill={isHealthy ? 'var(--cond-green)' : 'var(--cond-red)'}>
              {isHealthy ? 'OK' : 'FAULT'}
            </text>

            {/* Compact Surge Symbol & Rating */}
            <path
              d={`M ${cartCx + 1} ${y + 62} L ${cartCx - 3} ${y + 68} L ${cartCx} ${y + 68} L ${cartCx - 1.5} ${y + 74} L ${cartCx + 3.5} ${y + 67} L ${cartCx + 0.5} ${y + 67} Z`}
              fill={isLine ? 'var(--mat-pvc-orange)' : 'var(--cond-green)'}
            />
            <text x={cartCx} y={y + 84} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
              40kA
            </text>
          </g>
        );
      })}

      {/* Embedded Bottom Silkscreen Strip (PE) */}
      <rect x={x + 2} y={y + height - 28} width={width - 4} height={8.5} fill="var(--mat-line)" />
      <text x={cx} y={y + height - 22} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-green-on)">
        PE / EARTH
      </text>

      {/* Bottom Ground Terminal Bay */}
      <rect x={x + 2} y={y + height - 19.5} width={width - 4} height={17.5} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
