import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style Copper-Bonded Grounding Electrode Rod & Concrete Inspection Earth Pit.
 */
export const EarthPitDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height } = device;
  const cx = x + width / 2;

  return (
    <g className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15, 23, 42, 0.16)" />
      {/* Soil Cutaway */}
      <rect x={x + 2} y={y + 12} width={width - 4} height={height - 14} rx={4} fill="#57534e" stroke="#0f172a" strokeWidth={1.2} />

      {/* Inspection Pit Collar */}
      <rect x={x} y={y + 6} width={width} height={14} rx={2.5} fill="#334155" stroke="#0f172a" strokeWidth={1.2} />
      <rect x={x + 5} y={y + 8} width={width - 10} height={10} rx={1.5} fill="#0f172a" />
      <text x={cx} y={y + 15} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#4ade80" letterSpacing="0.5">
        EARTH PIT
      </text>

      {/* Copper Grounding Electrode Rod */}
      <rect x={cx - 4.5} y={y + 20} width={9} height={height - 27} rx={1.5} fill="#d97706" stroke="#451a03" strokeWidth={1} />
      <polygon points={`${cx - 4.5},${y + height - 7} ${cx + 4.5},${y + height - 7} ${cx},${y + height}`} fill="#9a3412" />

      {/* Brass Clamp Lug */}
      <rect x={cx - 11} y={y + 23} width={22} height={12} rx={2} fill="#f59e0b" stroke="#0f172a" strokeWidth={0.9} />

      {/* Grounding Reference Plate */}
      <rect x={cx - 28} y={y + height - 22} width={56} height={11} rx={2} fill="#0f172a" />
      <text x={cx} y={y + height - 14.5} textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#4ade80">
        R ≤ 25 Ω · PEC
      </text>

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
