import React from 'react';
import { DeviceTerminals, DeviceComponentProps } from './DeviceTerminals';

/**
 * EduVolt-style Vertical DIN-Mounted Earth (PE) or Neutral (N) Busbar Block.
 * Spaced embedded labels tucked vertically inside the 19px gaps between screw terminals.
 */
export const BusbarDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { width, height, terminals, type } = device;
  const isEarth = type === 'earth_busbar';
  const insulatorColor = isEarth ? '#16a34a' : '#2563eb';
  const insulatorDark = isEarth ? '#14532d' : '#1e3a8a';
  const barFill = isEarth ? '#d97706' : '#cbd5e1';
  const barStroke = isEarth ? '#78350f' : '#334155';

  return (
    <g className="select-none">
      <g transform={`translate(${device.x}, ${device.y})`}>
      {/* Subtle CAD shadow */}
      <rect x={2} y={2} width={width} height={height} rx={4} fill="rgba(15, 23, 42, 0.14)" />

      {/* Insulated Top & Bottom DIN Standoff Feet */}
      <rect x={2} y={0} width={width - 4} height={11} rx={2} fill={insulatorColor} stroke={insulatorDark} strokeWidth={1} />
      <rect x={2} y={height - 8} width={width - 4} height={8} rx={2} fill={insulatorColor} stroke={insulatorDark} strokeWidth={1} />

      {/* Top Insulated Identification Badge */}
      <text x={width / 2} y={7.6} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
        {isEarth ? 'PE' : 'N'}
      </text>

      {/* Machined Solid Busbar Body */}
      <rect x={4} y={9} width={width - 8} height={height - 15} rx={2} fill={barFill} stroke={barStroke} strokeWidth={1.1} />
      <line x1={8} y1={11} x2={8} y2={height - 8} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />

      {/* Engraved Inter-Terminal Grooves & Non-Overlapping Index Labels */}
      {terminals.map((term, i) => {
        const cy = term.relY * height;
        const badgeY = term.relY > 0.82 ? cy - 15.5 : cy + 8.5;
        return (
          <g key={`bb-slot-${term.id}`}>
            {i > 0 && (
              <line x1={6} y1={cy - 15} x2={width - 6} y2={cy - 15} stroke={barStroke} strokeWidth={0.5} opacity={0.45} />
            )}
            <rect
              x={6}
              y={badgeY}
              width={width - 12}
              height={7}
              rx={1}
              fill="#0f172a"
              opacity={0.85}
            />
            <text
              x={width / 2}
              y={badgeY + 5.1}
              textAnchor="middle"
              fontSize="4.4"
              fontWeight="900"
              fontFamily="ui-monospace, monospace"
              fill={isEarth ? '#fde047' : '#e0f2fe'}
            >
              {term.label}
            </text>
          </g>
        );
      })}

      </g>
      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
