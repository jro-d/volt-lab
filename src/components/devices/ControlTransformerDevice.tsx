import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style 440V / 220V Laminated Iron-Core Control Transformer.
 * Embedded H1/H2 primary and X1/X2 secondary silkscreen bands.
 */
export const ControlTransformerDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height } = device;
  const live = !!device.state.secondaryLive;
  const pri = device.state.primaryVolts || 440;
  const sec = device.state.secondaryVolts || 220;
  const va = device.state.vaRating || 250;

  const coreX = x + 12;
  const coreW = width - 24;
  const coreY = y + 30;
  const coreH = height - 60;

  return (
    <g id={`device-${device.id}`} className="select-none">
      {/* Mounting End Brackets */}
      <rect x={x + 4} y={y + height / 2 - 26} width={8} height={52} rx={2} fill="#94a3b8" stroke="#0f172a" strokeWidth={0.9} />
      <rect x={x + width - 12} y={y + height / 2 - 26} width={8} height={52} rx={2} fill="#94a3b8" stroke="#0f172a" strokeWidth={0.9} />

      {/* Laminated E-I Iron Core */}
      <rect x={coreX} y={coreY} width={coreW} height={coreH} rx={2} fill="#475569" stroke="#0f172a" strokeWidth={1.3} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`lam-${i}`} x1={coreX + 2} y1={coreY + 8 + i * 14} x2={coreX + coreW - 2} y2={coreY + 8 + i * 14} stroke="#334155" strokeWidth={0.9} />
      ))}

      {/* Copper Winding Bobbin & Insulation Wrap */}
      <rect x={coreX + 12} y={coreY + 6} width={coreW - 24} height={coreH - 12} rx={3} fill="#b45309" stroke="#451a03" strokeWidth={1} />
      <rect x={coreX + 16} y={coreY + coreH / 2 - 15} width={coreW - 32} height={30} rx={2} fill="#fef3c7" stroke="#b45309" strokeWidth={0.8} />
      <text x={x + width / 2} y={coreY + coreH / 2 - 6} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#78350f">
        {device.state.tag || 'TC1'} · {va}VA
      </text>
      <text x={x + width / 2} y={coreY + coreH / 2 + 2.5} textAnchor="middle" fontSize="5.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
        {pri}V → {sec}V
      </text>
      <text x={x + width / 2} y={coreY + coreH / 2 + 10.5} textAnchor="middle" fontSize="4.2" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#92400e">
        60Hz · CONTROL
      </text>

      {live && (
        <circle cx={coreX + coreW - 10} cy={coreY + coreH - 8} r={2.8} fill="#22c55e" stroke="#0f172a" strokeWidth={0.6} />
      )}

      {/* Primary Top Terminal Board + Embedded Labels */}
      <rect x={x + 8} y={y + 2} width={width - 16} height={18} rx={2} fill="#1f2937" stroke="#0f172a" strokeWidth={0.8} />
      <rect x={x + 8} y={y + 20} width={width - 16} height={8} fill="#0f172a" />
      <text x={x + width * 0.24} y={y + 25.6} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fca5a5">
        H1
      </text>
      <text x={x + width / 2} y={y + 25.6} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#e2e8f0">
        PRI {pri}V
      </text>
      <text x={x + width * 0.76} y={y + 25.6} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fca5a5">
        H2
      </text>

      {/* Secondary Bottom Terminal Board + Embedded Labels */}
      <rect x={x + 8} y={y + height - 28} width={width - 16} height={8} fill="#0f172a" />
      <text x={x + width * 0.24} y={y + height - 22.4} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fde68a">
        X1
      </text>
      <text x={x + width / 2} y={y + height - 22.4} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill={live ? '#4ade80' : '#93c5fd'}>
        SEC {sec}V
      </text>
      <text x={x + width * 0.76} y={y + height - 22.4} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#93c5fd">
        X2
      </text>
      <rect x={x + 8} y={y + height - 20} width={width - 16} height={18} rx={2} fill="#1f2937" stroke="#0f172a" strokeWidth={0.8} />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
