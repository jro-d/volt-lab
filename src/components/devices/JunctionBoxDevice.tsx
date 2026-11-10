import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface JunctionBoxProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const JunctionBoxDevice: React.FC<JunctionBoxProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width = 96, height = 96 } = device;
  const isOrangePvc = device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc';

  const handleToggleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.boxMaterial = isOrangePvc ? 'galvanized_steel' : 'orange_pvc';
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Metal Galvanised Enclosure Gradient */}
        <linearGradient id={`jboxMetal_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Orange PVC Thermoplastic Gradient (Philippine Standard Utility Box) */}
        <linearGradient id={`jboxOrangePvc_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="85%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>

        {/* Inner Cavity Gradients */}
        <radialGradient id={`jboxInnerMetal_${device.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>

        <radialGradient id={`jboxInnerOrange_${device.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="70%" stopColor="#7c2d12" />
          <stop offset="100%" stopColor="#431407" />
        </radialGradient>
      </defs>

      {/* Drop Shadow */}
      <polygon
        points={`
          16,4 ${width - 12},4 
          ${width + 4},18 ${width + 4},${height - 10} 
          ${width - 12},${height + 4} 16,${height + 4} 
          4,${height - 10} 4,18
        `}
        fill="#000000"
        opacity={0.16}
      />

      {/* 4 External Conduit Hub Sleeves / Knockout Connectors (North, South, East, West) */}
      {/* Top Hub */}
      <rect
        x={width / 2 - 10}
        y={-8}
        width={20}
        height={10}
        rx={2}
        fill={isOrangePvc ? '#ea580c' : '#94a3b8'}
        stroke={isOrangePvc ? '#9a3412' : '#64748b'}
        strokeWidth={1}
      />
      {/* Bottom Hub */}
      <rect
        x={width / 2 - 10}
        y={height - 2}
        width={20}
        height={10}
        rx={2}
        fill={isOrangePvc ? '#ea580c' : '#94a3b8'}
        stroke={isOrangePvc ? '#9a3412' : '#64748b'}
        strokeWidth={1}
      />
      {/* Left Hub */}
      <rect
        x={-8}
        y={height / 2 - 10}
        width={10}
        height={20}
        rx={2}
        fill={isOrangePvc ? '#ea580c' : '#94a3b8'}
        stroke={isOrangePvc ? '#9a3412' : '#64748b'}
        strokeWidth={1}
      />
      {/* Right Hub */}
      <rect
        x={width - 2}
        y={height / 2 - 10}
        width={10}
        height={20}
        rx={2}
        fill={isOrangePvc ? '#ea580c' : '#94a3b8'}
        stroke={isOrangePvc ? '#9a3412' : '#64748b'}
        strokeWidth={1}
      />

      {/* Main Octagonal Body */}
      <polygon
        points={`
          16,0 ${width - 16},0 
          ${width},16 ${width},${height - 16} 
          ${width - 16},${height} 16,${height} 
          0,${height - 16} 0,16
        `}
        fill={isOrangePvc ? `url(#jboxOrangePvc_${device.id})` : `url(#jboxMetal_${device.id})`}
        stroke={isOrangePvc ? '#c2410c' : '#64748b'}
        strokeWidth={1.8}
      />

      {/* Box Interior Cavity */}
      <polygon
        points={`
          18,6 ${width - 18},6 
          ${width - 6},18 ${width - 6},${height - 18} 
          ${width - 18},${height - 6} 18,${height - 6} 
          6,${height - 18} 6,18
        `}
        fill={isOrangePvc ? `url(#jboxInnerOrange_${device.id})` : `url(#jboxInnerMetal_${device.id})`}
        stroke={isOrangePvc ? '#9a3412' : '#1e293b'}
        strokeWidth={1}
      />

      {/* 8 Circular Knockout Indentations (Photorealistic detail from user reference) */}
      {/* 4 Orthogonal Knockouts */}
      <circle cx={width / 2} cy={16} r={7} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1.2} strokeDasharray="3,1" />
      <circle cx={width / 2} cy={height - 16} r={7} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1.2} strokeDasharray="3,1" />
      <circle cx={16} cy={height / 2} r={7} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1.2} strokeDasharray="3,1" />
      <circle cx={width - 16} cy={height / 2} r={7} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1.2} strokeDasharray="3,1" />
      {/* 4 Diagonal Knockouts */}
      <circle cx={22} cy={22} r={5.5} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1} strokeDasharray="2.5,1" />
      <circle cx={width - 22} cy={22} r={5.5} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1} strokeDasharray="2.5,1" />
      <circle cx={22} cy={height - 22} r={5.5} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1} strokeDasharray="2.5,1" />
      <circle cx={width - 22} cy={height - 22} r={5.5} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1} strokeDasharray="2.5,1" />
      {/* Center Knockout Ring */}
      <circle cx={width / 2} cy={height / 2} r={9} fill="none" stroke={isOrangePvc ? '#ea580c' : '#475569'} strokeWidth={1.2} strokeDasharray="4,1" />

      {/* Corner Mounting Ear Screws / Tabs */}
      <circle cx={11} cy={11} r={2.5} fill={isOrangePvc ? '#fed7aa' : '#94a3b8'} stroke={isOrangePvc ? '#9a3412' : '#334155'} strokeWidth={0.6} />
      <circle cx={width - 11} cy={11} r={2.5} fill={isOrangePvc ? '#fed7aa' : '#94a3b8'} stroke={isOrangePvc ? '#9a3412' : '#334155'} strokeWidth={0.6} />
      <circle cx={11} cy={height - 11} r={2.5} fill={isOrangePvc ? '#fed7aa' : '#94a3b8'} stroke={isOrangePvc ? '#9a3412' : '#334155'} strokeWidth={0.6} />
      <circle cx={width - 11} cy={height - 11} r={2.5} fill={isOrangePvc ? '#fed7aa' : '#94a3b8'} stroke={isOrangePvc ? '#9a3412' : '#334155'} strokeWidth={0.6} />

      {/* Splice Wire Nut Visuals inside box */}
      {/* 1. Live Splice Nut (Red cap) */}
      <g transform={`translate(${width * 0.28}, ${height * 0.28})`}>
        <polygon points="-5,9 5,9 3.5,-5 -3.5,-5" fill="#dc2626" stroke="#991b1b" strokeWidth={0.8} />
        <text x={0} y={3} textAnchor="middle" fontSize={5.5} fill="#ffffff" fontWeight="bold">L</text>
      </g>

      {/* 2. Neutral Return Splice Nut (Blue/Black cap) */}
      <g transform={`translate(${width * 0.72}, ${height * 0.28})`}>
        <polygon points="-5,9 5,9 3.5,-5 -3.5,-5" fill="#2563eb" stroke="#1d4ed8" strokeWidth={0.8} />
        <text x={0} y={3} textAnchor="middle" fontSize={5.5} fill="#ffffff" fontWeight="bold">N</text>
      </g>

      {/* 3. Earth Ground Splice / Screw (Green) */}
      <g transform={`translate(${width * 0.30}, ${height * 0.72})`}>
        <polygon points="-5,9 5,9 3.5,-5 -3.5,-5" fill="#16a34a" stroke="#15803d" strokeWidth={0.8} />
        <text x={0} y={3} textAnchor="middle" fontSize={5} fill="#ffffff" fontWeight="bold">PE</text>
      </g>

      {/* Material Toggle Badge on Box */}
      <g
        transform={`translate(${width - 4}, -4)`}
        className="cursor-pointer group"
        onClick={handleToggleMaterial}
      >
        <rect
          x={-52}
          y={-10}
          width={56}
          height={14}
          rx={7}
          fill={isOrangePvc ? '#ea580c' : '#475569'}
          stroke="#ffffff"
          strokeWidth={1}
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
          className="transition-all hover:scale-105"
        />
        <text
          x={-24}
          y={0}
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#ffffff"
        >
          {isOrangePvc ? '🟠 Orange PVC' : '⚙️ Metal'}
        </text>
      </g>

      {/* Header Label */}
      <text
        x={width / 2}
        y={height + 14}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight="bold"
        fontFamily="monospace"
        fill={isOrangePvc ? '#c2410c' : '#475569'}
      >
        {isOrangePvc ? 'OCTAGONAL PVC' : 'JUNCTION BOX'}
      </text>

      {/* Terminals (Feed and Branch Splice Ports) */}
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
