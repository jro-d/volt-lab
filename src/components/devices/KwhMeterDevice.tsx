import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface KwhMeterProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const KwhMeterDevice: React.FC<KwhMeterProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
}) => {
  const { width, height } = device;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Polycarbonate Textured Casing Gradient */}
        <linearGradient id={`meterBodyGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* LCD Backlight with Matrix Pattern */}
        <linearGradient id={`lcdScreen_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>

        {/* Glass Glare Reflection */}
        <linearGradient id={`glassGlare_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* Textured Terminal Cover */}
        <linearGradient id={`coverGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      {/* Drop Shadow */}
      <rect
        x={3}
        y={4}
        width={width}
        height={height}
        rx={10}
        fill="#000000"
        opacity={0.14}
      />

      {/* Main Meter Casing */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={10}
        fill={`url(#meterBodyGrad_${device.id})`}
        stroke="#94a3b8"
        strokeWidth={1.5}
      />

      {/* Beveled Inset Rim */}
      <rect
        x={4}
        y={4}
        width={width - 8}
        height={height - 8}
        rx={8}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.2}
      />

      {/* Top Mounting Bracket Tab */}
      <rect x={width / 2 - 14} y={-9} width={28} height={12} rx={3} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
      <circle cx={width / 2} cy={-3} r={3.5} fill="#334155" stroke="#94a3b8" strokeWidth={0.8} />

      {/* Utility Header Nameplate */}
      <text
        x={width / 2}
        y={20}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight="bold"
        fill="#1e293b"
        letterSpacing="1.2"
        fontFamily="sans-serif"
      >
        MERALCO / UTILITY KWH
      </text>

      {/* LCD Display Outer Bezel */}
      <rect
        x={16}
        y={28}
        width={width - 32}
        height={44}
        rx={5}
        fill="#0f172a"
        stroke="#475569"
        strokeWidth={1.2}
      />

      {/* LCD Backlight Screen */}
      <rect
        x={20}
        y={32}
        width={width - 40}
        height={36}
        rx={3}
        fill={`url(#lcdScreen_${device.id})`}
      />

      {/* LCD Glass Glare Arc */}
      <polygon
        points={`20,32 ${width - 20},32 ${width - 50},68 20,68`}
        fill={`url(#glassGlare_${device.id})`}
      />

      {/* Digital 7-Segment Readout */}
      <text
        x={width / 2 - 4}
        y={56}
        textAnchor="middle"
        fontSize={17}
        fontWeight="900"
        fontFamily="monospace"
        fill="#14532d"
        letterSpacing="2.5"
      >
        012345.6
      </text>

      <text
        x={width - 26}
        y={63}
        textAnchor="end"
        fontSize={8.5}
        fontWeight="bold"
        fontFamily="monospace"
        fill="#14532d"
      >
        kWh
      </text>

      {/* Live Flashing Pulse LED */}
      <circle cx={28} cy={60} r={2.5} fill="#ef4444" className="animate-ping" />
      <circle cx={28} cy={60} r={2.5} fill="#dc2626" />
      <text x={34} y={62} fontSize={6.5} fill="#14532d" fontWeight="bold">1000 imp/kWh</text>

      {/* Optical Infrared Communication Port */}
      <circle cx={width / 2} cy={86} r={7} fill="#1e293b" stroke="#64748b" strokeWidth={1} />
      <circle cx={width / 2} cy={86} r={3.5} fill="#090d16" />
      <circle cx={width / 2 + 2} cy={84} r={1} fill="#ffffff" opacity={0.6} />

      {/* Technical Ratings Details */}
      <g transform="translate(18, 102)">
        <text x={0} y={0} fontSize={7} fill="#64748b" fontWeight="bold" fontFamily="sans-serif">230V 60Hz 10(60)A</text>
        <text x={width - 36} y={0} fontSize={7} fill="#64748b" fontWeight="bold" fontFamily="sans-serif" textAnchor="end">Class 1.0</text>
        <text x={0} y={10} fontSize={6.5} fill="#94a3b8" fontFamily="monospace">PEC 2017 / IEC 62053</text>
      </g>

      {/* Barcode & Utility Asset Tag */}
      <g transform={`translate(${width / 2 - 38}, 118)`}>
        <rect x={0} y={0} width={76} height={12} fill="#ffffff" stroke="#cbd5e1" strokeWidth={0.8} rx={1} />
        {[4, 8, 11, 16, 21, 25, 30, 36, 41, 46, 52, 57, 63, 68, 72].map((bx, i) => (
          <line key={i} x1={bx} y1={2} x2={bx} y2={10} stroke="#0f172a" strokeWidth={i % 3 === 0 ? 1.8 : 1} />
        ))}
      </g>

      {/* Bottom Terminal Cover (Clear Ribbed Polycarbonate) */}
      <path
        d={`M 8 134 L ${width - 8} 134 L ${width - 8} ${height - 6} Q ${width - 8} ${height} ${width - 14} ${height} L 14 ${height} Q 8 ${height} 8 ${height - 6} Z`}
        fill={`url(#coverGrad_${device.id})`}
        stroke="#94a3b8"
        strokeWidth={1.2}
      />

      {/* Inspection Seal Screws with Red Tamper Wire */}
      <circle cx={18} cy={142} r={3.5} fill="#64748b" stroke="#1e293b" strokeWidth={0.8} />
      <circle cx={width - 18} cy={142} r={3.5} fill="#64748b" stroke="#1e293b" strokeWidth={0.8} />
      {/* Red Lead Wire Seal */}
      <path d={`M 18 142 Q ${width / 2} 148 ${width - 18} 142`} fill="none" stroke="#dc2626" strokeWidth={0.8} strokeDasharray="2 1" />
      <circle cx={width / 2} cy={146} r={3} fill="#b91c1c" stroke="#7f1d1d" strokeWidth={0.5} />

      {/* Terminal Block Plate Inset */}
      <rect
        x={14}
        y={150}
        width={width - 28}
        height={height - 156}
        rx={4}
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth={1}
      />

      {/* Render Terminals with TerminalPoint */}
      {device.terminals.map((t) => {
        const tx = width * t.relX;
        const ty = height * t.relY;
        const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
        const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={tx}
            y={ty}
            isHovered={isHovered}
            isSelected={isSelected}
            onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
            onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
            onMouseLeave={() => setHoveredTerminalId(null)}
          />
        );
      })}
    </g>
  );
};
