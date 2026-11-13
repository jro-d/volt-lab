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
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15, 23, 42, 0.14)" />

      {/* Outer Dark DIN Base Housing */}
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#334155" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Terminal Bay (L / N) */}
      <rect x={x + 2} y={y + 2} width={width - 4} height={17} rx={2} fill="#1f2937" />
      <line x1={cx} y1={y + 2} x2={cx} y2={y + 19} stroke="#475569" strokeWidth={0.8} />

      {/* Embedded Top Silkscreen Strip */}
      <rect x={x + 2} y={y + 19} width={width - 4} height={8} fill="#0f172a" />
      <text x={x + width * 0.35} y={y + 25} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f87171">
        L
      </text>
      <text x={x + width * 0.65} y={y + 25} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#60a5fa">
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
              fill="#f1f5f9"
              stroke="#0f172a"
              strokeWidth={1}
            />
            {/* Color Header Band */}
            <rect x={x0 + 0.5} y={y + 29.5} width={cw - 1} height={11} rx={1.5} fill={isLine ? '#dc2626' : '#16a34a'} />
            <text x={cartCx} y={y + 37} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
              {isLine ? 'L-N' : 'N-PE'}
            </text>

            {/* Health Window Flag */}
            <rect
              x={cartCx - 6.5}
              y={y + 45}
              width={13}
              height={7.5}
              rx={1}
              fill={isHealthy ? '#16a34a' : '#dc2626'}
              stroke="#0f172a"
              strokeWidth={0.8}
            />
            <text x={cartCx} y={y + 58} textAnchor="middle" fontSize="3.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill={isHealthy ? '#15803d' : '#dc2626'}>
              {isHealthy ? 'OK' : 'FAULT'}
            </text>

            {/* Compact Surge Symbol & Rating */}
            <path
              d={`M ${cartCx + 1} ${y + 62} L ${cartCx - 3} ${y + 68} L ${cartCx} ${y + 68} L ${cartCx - 1.5} ${y + 74} L ${cartCx + 3.5} ${y + 67} L ${cartCx + 0.5} ${y + 67} Z`}
              fill={isLine ? '#ea580c' : '#15803d'}
            />
            <text x={cartCx} y={y + 84} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1e293b">
              40kA
            </text>
          </g>
        );
      })}

      {/* Embedded Bottom Silkscreen Strip (PE) */}
      <rect x={x + 2} y={y + height - 28} width={width - 4} height={8.5} fill="#0f172a" />
      <text x={cx} y={y + height - 22} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#4ade80">
        PE / EARTH
      </text>

      {/* Bottom Ground Terminal Bay */}
      <rect x={x + 2} y={y + height - 19.5} width={width - 4} height={17.5} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
