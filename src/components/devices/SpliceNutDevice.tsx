import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style 3-Port WAGO 221 Lever Connector or Twist-On Wing Wire Nut.
 */
export const SpliceNutDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height, terminals } = device;
  const isWago = device.type === 'wago_connector_3p';
  const cx = x + width / 2;

  return (
    <g className="select-none">
      {isWago ? (
        <g>
          <rect x={x + 1} y={y + 2} width={width - 2} height={height - 4} rx={3.5} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.2} />
          <rect x={x + 5} y={y + 6} width={width - 10} height={7} rx={1} fill="#d97706" stroke="#78350f" strokeWidth={0.7} />
          {[0.22, 0.5, 0.78].map((rx, idx) => (
            <rect key={`lev-${idx}`} x={x + width * rx - 5} y={y + 15} width={10} height={11} rx={1.5} fill="#f97316" stroke="#0f172a" strokeWidth={0.8} />
          ))}
          <text x={cx} y={y + 29.5} textAnchor="middle" fontSize="3.9" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
            WAGO 221
          </text>
        </g>
      ) : (
        <g>
          <path
            d={`M ${cx - 11} ${y + 3} Q ${cx} ${y + 1} ${cx + 11} ${y + 3} L ${cx + 21} ${y + height - 13} Q ${cx} ${y + height - 9} ${cx - 21} ${y + height - 13} Z`}
            fill="#dc2626"
            stroke="#0f172a"
            strokeWidth={1.2}
          />
          {[-6, 0, 6].map((dx, i) => (
            <line key={`flute-${i}`} x1={cx + dx * 0.7} y1={y + 6} x2={cx + dx * 1.4} y2={y + height - 16} stroke="rgba(255,255,255,0.35)" strokeWidth={1.1} />
          ))}
          <text x={cx} y={y + 22} textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
            SPLICE
          </text>
          <rect x={x + 4} y={y + height - 12} width={width - 8} height={10} rx={2} fill="#1f2937" />
        </g>
      )}

      {terminals.map((t) => (
        <text
          key={`spn-${t.id}`}
          x={x + t.relX * width}
          y={y + height - 14.5}
          textAnchor="middle"
          fontSize="3.6"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill="#0f172a"
        >
          {t.label}
        </text>
      ))}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
