import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style 35mm Slotted Steel Top-Hat DIN Rail Track (IEC 60715) with PE Grounding Bond Terminal.
 */
export const DinRailTrackDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y } = device;
  const width = device.state.trackWidth || device.width || 260;
  const height = device.height || 36;
  const slotCount = Math.max(4, Math.floor((width - 40) / 28));

  return (
    <g className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height - 2} rx={2} fill="rgba(15, 23, 42, 0.14)" />
      {/* Outer Steel Flanges */}
      <rect x={x} y={y + 2} width={width} height={height - 4} rx={2} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.1} />
      {/* Recessed Center Channel */}
      <rect x={x + 4} y={y + 8} width={width - 8} height={height - 16} rx={1} fill="#94a3b8" stroke="#475569" strokeWidth={0.8} />

      {/* Slotted Perforations */}
      {Array.from({ length: slotCount }).map((_, idx) => {
        const sx = x + 24 + idx * ((width - 48) / Math.max(1, slotCount - 1)) - 7;
        return <rect key={`slot-${idx}`} x={sx} y={y + height / 2 - 2.5} width={14} height={5} rx={2.5} fill="#334155" stroke="#0f172a" strokeWidth={0.6} />;
      })}

      {/* EW-35 Polyamide End Clamps */}
      {[x + 3, x + width - 15].map((ex, i) => (
        <g key={`clamp-${i}`}>
          <rect x={ex} y={y} width={12} height={height} rx={1.5} fill="#334155" stroke="#0f172a" strokeWidth={0.9} />
          <circle cx={ex + 6} cy={y + height / 2} r={2} fill="#cbd5e1" />
        </g>
      ))}

      <text x={x + width / 2} y={y + 7} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
        DIN 35 × 7.5 mm · IEC 60715
      </text>

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
