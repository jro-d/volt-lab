import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * 440V / 220V laminated iron-core control transformer (open-frame, foot mounted).
 * H1-H2 primary terminal board on top, X1-X2 secondary board at the bottom.
 */
export const ControlTransformerDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height } = device;
  const live = !!device.state.secondaryLive;
  const pri = device.state.primaryVolts || 440;
  const sec = device.state.secondaryVolts || 220;
  const va = device.state.vaRating || 250;

  const coreX = x + 14;
  const coreW = width - 28;
  const coreY = y + 30;
  const coreH = height - 60;

  return (
    <g id={`device-${device.id}`}>
      <defs>
        <pattern id="tc-lam" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#4b5563" />
          <line x1="0" y1="0.5" x2="4" y2="0.5" stroke="#374151" strokeWidth="1" />
        </pattern>
        <linearGradient id="tc-coil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c2d12" />
          <stop offset="30%" stopColor="#c2410c" />
          <stop offset="55%" stopColor="#fb923c" />
          <stop offset="80%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="tc-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>

      {/* Mounting feet / end brackets */}
      <rect x={x + 4} y={y + height / 2 - 30} width={8} height={60} rx={2} fill="#9ca3af" stroke="#4b5563" strokeWidth={0.8} />
      <rect x={x + width - 12} y={y + height / 2 - 30} width={8} height={60} rx={2} fill="#9ca3af" stroke="#4b5563" strokeWidth={0.8} />
      {[y + height / 2 - 24, y + height / 2 + 24].map((cy, i) => (
        <React.Fragment key={i}>
          <circle cx={x + 8} cy={cy} r={2} fill="#1f2937" />
          <circle cx={x + width - 8} cy={cy} r={2} fill="#1f2937" />
        </React.Fragment>
      ))}

      {/* Laminated E-I core */}
      <rect
        x={coreX}
        y={coreY}
        width={coreW}
        height={coreH}
        rx={2}
        fill="url(#tc-lam)"
        stroke="#1f2937"
        strokeWidth={1.2}
        filter="drop-shadow(0 6px 12px rgba(15,23,42,0.25))"
      />
      {/* Core clamp bolts */}
      {[coreX + 5, coreX + coreW - 5].map((bx, i) => (
        <React.Fragment key={i}>
          <circle cx={bx} cy={coreY + 5} r={2.2} fill="#d1d5db" stroke="#374151" strokeWidth={0.5} />
          <circle cx={bx} cy={coreY + coreH - 5} r={2.2} fill="#d1d5db" stroke="#374151" strokeWidth={0.5} />
        </React.Fragment>
      ))}

      {/* Copper winding bobbin (primary outer, secondary inner) */}
      <rect x={coreX + 14} y={coreY + 8} width={coreW - 28} height={coreH - 16} rx={5} fill="url(#tc-coil)" stroke="#431407" strokeWidth={1} />
      {Array.from({ length: 13 }).map((_, k) => (
        <line
          key={k}
          x1={coreX + 15}
          y1={coreY + 11 + k * ((coreH - 22) / 12)}
          x2={coreX + coreW - 15}
          y2={coreY + 11 + k * ((coreH - 22) / 12)}
          stroke="#fdba74"
          strokeWidth={0.45}
          opacity={0.55}
        />
      ))}
      {/* Paper insulation wrap + nameplate */}
      <rect x={coreX + 18} y={coreY + coreH / 2 - 15} width={coreW - 36} height={30} rx={2} fill="#fef3c7" stroke="#b45309" strokeWidth={0.6} />
      <text x={x + width / 2} y={coreY + coreH / 2 - 6} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#78350f">
        {device.state.tag || 'TC1'} · {va}VA
      </text>
      <text x={x + width / 2} y={coreY + coreH / 2 + 2} textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1f2937">
        {pri}V → {sec}V
      </text>
      <text x={x + width / 2} y={coreY + coreH / 2 + 10} textAnchor="middle" fontSize="4.4" fontWeight="700" fontFamily="ui-monospace, monospace" fill="#92400e">
        60Hz · CONTROL
      </text>

      {/* Hum / flux indication when energized */}
      {live && (
        <g className="pointer-events-none">
          <rect x={coreX - 1} y={coreY - 1} width={coreW + 2} height={coreH + 2} rx={3} fill="none" stroke="#38bdf8" strokeWidth={1} strokeDasharray="3 3" className="animate-[dash_0.6s_linear_infinite]" />
          <circle cx={x + width - 20} cy={coreY + coreH - 10} r={3} fill="#22c55e" />
          <circle cx={x + width - 20} cy={coreY + coreH - 10} r={6} fill="#22c55e" opacity={0.35} className="animate-ping" />
        </g>
      )}

      {/* Primary terminal board (H1-H2) */}
      <rect x={x + 10} y={y} width={width - 20} height={24} rx={3} fill="url(#tc-board)" stroke="#000" strokeWidth={0.6} />
      <text x={x + width / 2} y={y + 15} textAnchor="middle" fontSize="5" fontWeight="900" fill="#fca5a5" fontFamily="ui-monospace, monospace">
        PRI {pri}V
      </text>
      {/* Secondary terminal board (X1-X2) */}
      <rect x={x + 10} y={y + height - 24} width={width - 20} height={24} rx={3} fill="url(#tc-board)" stroke="#000" strokeWidth={0.6} />
      <text x={x + width / 2} y={y + height - 10} textAnchor="middle" fontSize="5" fontWeight="900" fill={live ? '#86efac' : '#93c5fd'} fontFamily="ui-monospace, monospace">
        {live ? `SEC ${sec}V ●` : `SEC ${sec}V`}
      </text>

      <DeviceTerminals
        {...props}
        labelColor={(t) => (t.id.startsWith('h') ? '#fca5a5' : t.id === 'x1' ? '#fde68a' : '#93c5fd')}
      />
    </g>
  );
};
