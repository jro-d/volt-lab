import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface SpliceNutProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const SpliceNutDevice: React.FC<SpliceNutProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
}) => {
  const { width, height } = device;
  const isWago = device.type === 'wago_connector_3p';

  if (isWago) {
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        {/* Transparent Polycarbonate Housing */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={3}
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth={1.2}
          opacity={0.9}
        />

        {/* 3 Orange Lever Clamps */}
        {[0.22, 0.50, 0.78].map((rx, i) => (
          <g key={i} transform={`translate(${width * rx - 4}, 4)`}>
            <rect x={0} y={0} width={8} height={16} rx={1.5} fill="#f97316" stroke="#c2410c" strokeWidth={0.8} />
            <circle cx={4} cy={3} r={1.5} fill="#ffffff" />
          </g>
        ))}

        {/* Copper Internal Bus Strip */}
        <rect x={6} y={22} width={width - 12} height={4} fill="#d97706" />

        {/* Name Badge */}
        <text
          x={width / 2}
          y={height - 2}
          textAnchor="middle"
          fontSize={6.5}
          fontWeight="bold"
          fontFamily="monospace"
          fill="#475569"
        >
          WAGO 221
        </text>

        {/* Terminals */}
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
  }

  // Classic Twist-on Wire Nut
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`wireNutGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>

      {/* Fluted Wire Nut Conical Cap */}
      <polygon
        points={`
          ${width * 0.20},${height * 0.05} 
          ${width * 0.80},${height * 0.05} 
          ${width * 0.95},${height * 0.70} 
          ${width * 0.05},${height * 0.70}
        `}
        fill={`url(#wireNutGrad_${device.id})`}
        stroke="#991b1b"
        strokeWidth={1}
      />

      {/* Grip Flute Ribs */}
      <line x1={width * 0.35} y1={height * 0.10} x2={width * 0.25} y2={height * 0.65} stroke="#fee2e2" strokeWidth={1} opacity={0.6} />
      <line x1={width * 0.50} y1={height * 0.08} x2={width * 0.50} y2={height * 0.67} stroke="#fee2e2" strokeWidth={1} opacity={0.8} />
      <line x1={width * 0.65} y1={height * 0.10} x2={width * 0.75} y2={height * 0.65} stroke="#fee2e2" strokeWidth={1} opacity={0.6} />

      {/* Skirt Collar at bottom */}
      <rect
        x={width * 0.08}
        y={height * 0.70}
        width={width * 0.84}
        height={height * 0.12}
        rx={2}
        fill="#991b1b"
      />

      {/* Internal Copper Spring Visible at Base */}
      <ellipse cx={width / 2} cy={height * 0.82} rx={width * 0.35} ry={3} fill="#ca8a04" stroke="#78350f" strokeWidth={0.8} />

      {/* Micro Label */}
      <text
        x={width / 2}
        y={height * 0.42}
        textAnchor="middle"
        fontSize={6.5}
        fontWeight="bold"
        fill="#ffffff"
        fontFamily="sans-serif"
      >
        SPLICE
      </text>

      {/* Terminals (Bottom entry ports) */}
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
