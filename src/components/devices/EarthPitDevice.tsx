import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface EarthPitProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
}

export const EarthPitDevice: React.FC<EarthPitProps> = ({
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
        {/* Layered Soil Horizon Gradient */}
        <linearGradient id={`soilHorizon_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#15803d" /> {/* Grass/Ground top line */}
          <stop offset="6%" stopColor="#3f2e18" /> {/* Organic topsoil */}
          <stop offset="35%" stopColor="#29180b" />
          <stop offset="70%" stopColor="#451a03" /> {/* Clay/mineral subsoil */}
          <stop offset="100%" stopColor="#1a0a01" />
        </linearGradient>

        {/* Polished Copper Ground Rod */}
        <linearGradient id={`copperGroundRod_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fed7aa" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Heavy Bronze Clamp */}
        <linearGradient id={`bronzeClampGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eab308" />
          <stop offset="50%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Concrete Pit Chamber */}
        <linearGradient id={`concreteWell_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Earth Soil Layer Background */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={5}
        fill={`url(#soilHorizon_${device.id})`}
        stroke="#451a03"
        strokeWidth={1}
      />

      {/* Soil Texture Grains / Pebbles */}
      {[
        { cx: 10, cy: 18, r: 1.5 }, { cx: 24, cy: 38, r: 2 }, { cx: 76, cy: 22, r: 1.2 },
        { cx: 80, cy: 82, r: 2.2 }, { cx: 14, cy: 88, r: 1.8 }, { cx: 32, cy: 98, r: 1.5 }
      ].map((pt, i) => (
        <circle key={i} cx={pt.cx} cy={pt.cy} r={pt.r} fill="#78350f" opacity={0.7} />
      ))}

      {/* Grass Ground Surface Tufts */}
      {[8, 22, 68, 80].map((gx) => (
        <line key={gx} x1={gx} y1={0} x2={gx + 2} y2={-3} stroke="#22c55e" strokeWidth={1.5} strokeLinecap="round" />
      ))}

      {/* Concrete / Composite Inspection Pit Well (Cutaway) */}
      <rect
        x={14}
        y={8}
        width={width - 28}
        height={48}
        rx={3}
        fill={`url(#concreteWell_${device.id})`}
        stroke="#64748b"
        strokeWidth={1.5}
      />

      {/* Pit Well Interior Cavity */}
      <rect
        x={18}
        y={12}
        width={width - 36}
        height={40}
        fill="#0f172a"
      />

      {/* Well Cover Removable Lid Frame */}
      <rect x={10} y={6} width={width - 20} height={5} rx={1.5} fill="#64748b" stroke="#334155" strokeWidth={0.8} />

      {/* Solid Copper Grounding Electrode Rod (extends vertically down into earth) */}
      <rect
        x={width / 2 - 4}
        y={18}
        width={8}
        height={height - 22}
        rx={2}
        fill={`url(#copperGroundRod_${device.id})`}
        stroke="#78350f"
        strokeWidth={0.8}
      />

      {/* Heavy-Duty Bronze Ground Rod Clamp */}
      <rect
        x={width / 2 - 11}
        y={24}
        width={22}
        height={13}
        rx={2}
        fill={`url(#bronzeClampGrad_${device.id})`}
        stroke="#451a03"
        strokeWidth={1}
      />
      {/* Hex Bolt Head on Clamp */}
      <polygon
        points={`
          ${width / 2 + 5},28 
          ${width / 2 + 9},28 
          ${width / 2 + 11},31 
          ${width / 2 + 9},34 
          ${width / 2 + 5},34 
          ${width / 2 + 3},31
        `}
        fill="#ca8a04"
        stroke="#78350f"
        strokeWidth={0.8}
      />

      {/* Lateral Conduit Entry Sleeve */}
      <path
        d={`M ${width - 14} 28 L ${width - 2} 28`}
        stroke="#94a3b8"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx={width - 14} cy={28} r={3.5} fill="#475569" />

      {/* Earth Resistance Certification Badge */}
      <rect x={width / 2 - 34} y={height - 18} width={68} height={14} rx={3} fill="#090d16" opacity={0.9} />
      <text
        x={width / 2}
        y={height - 8}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fontFamily="monospace"
        fill="#4ade80"
      >
        EARTH R ≤ 5.0Ω
      </text>

      {/* Terminal Point (Clamp Connection) */}
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
