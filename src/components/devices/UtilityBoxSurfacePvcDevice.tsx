import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface UtilityBoxProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const UtilityBoxSurfacePvcDevice: React.FC<UtilityBoxProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isSteel = device.state.boxMaterial === 'galvanized_steel';

  const handleToggleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.boxMaterial = isSteel ? 'orange_pvc' : 'galvanized_steel';
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Philippine Safety Orange PVC Gradient */}
        <linearGradient id={`pvcBox_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>

        {/* Galvanized Sheet Metal Gradient */}
        <linearGradient id={`steelBox_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Interior Cavity Deep Recess Shadow */}
        <linearGradient id={`boxCavity_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#431407" />
          <stop offset="15%" stopColor="#7c2d12" />
          <stop offset="85%" stopColor="#7c2d12" />
          <stop offset="100%" stopColor="#431407" />
        </linearGradient>

        <linearGradient id={`steelCavity_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* 1. Box Drop Shadow */}
      <rect
        x={3}
        y={4}
        width={width}
        height={height}
        rx={6}
        fill="#000000"
        opacity={0.16}
      />

      {/* 2. Outer Box Flange Perimeter */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={6}
        fill={isSteel ? `url(#steelBox_${device.id})` : `url(#pvcBox_${device.id})`}
        stroke={isSteel ? '#64748b' : '#9a3412'}
        strokeWidth={1.5}
      />

      {/* Conduit Knockout Discs (Top, Bottom, Left, Right) */}
      {/* Top 1/2" & 3/4" knockouts */}
      <circle cx={width / 2} cy={4} r={9} fill="none" stroke={isSteel ? '#475569' : '#7c2d12'} strokeDasharray="3 2" strokeWidth={1} />
      {/* Bottom 1/2" & 3/4" knockouts */}
      <circle cx={width / 2} cy={height - 4} r={9} fill="none" stroke={isSteel ? '#475569' : '#7c2d12'} strokeDasharray="3 2" strokeWidth={1} />
      {/* Side knockouts */}
      <circle cx={4} cy={height / 2} r={9} fill="none" stroke={isSteel ? '#475569' : '#7c2d12'} strokeDasharray="3 2" strokeWidth={1} />
      <circle cx={width - 4} cy={height / 2} r={9} fill="none" stroke={isSteel ? '#475569' : '#7c2d12'} strokeDasharray="3 2" strokeWidth={1} />

      {/* 3. Deep Internal Box Chamber */}
      <rect
        x={7}
        y={8}
        width={width - 14}
        height={height - 16}
        rx={4}
        fill={isSteel ? `url(#steelCavity_${device.id})` : `url(#boxCavity_${device.id})`}
        stroke={isSteel ? '#1e293b' : '#451a03'}
        strokeWidth={1}
      />

      {/* Internal Reinforcing Corner Webbing */}
      <line x1={7} y1={18} x2={17} y2={8} stroke="#ea580c" strokeWidth={1} opacity={0.5} />
      <line x1={width - 17} y1={8} x2={width - 7} y2={18} stroke="#ea580c" strokeWidth={1} opacity={0.5} />
      <line x1={7} y1={height - 18} x2={17} y2={height - 8} stroke="#ea580c" strokeWidth={1} opacity={0.5} />
      <line x1={width - 17} y1={height - 8} x2={width - 7} y2={height - 18} stroke="#ea580c" strokeWidth={1} opacity={0.5} />

      {/* Center 1-Gang Device Mounting Screw Bosses (Top & Bottom) */}
      <g transform={`translate(${width / 2}, 15)`}>
        <circle cx={0} cy={0} r={5} fill={isSteel ? '#cbd5e1' : '#f97316'} stroke={isSteel ? '#475569' : '#7c2d12'} strokeWidth={1} />
        <circle cx={0} cy={0} r={2} fill="#ca8a04" stroke="#78350f" strokeWidth={0.5} />
      </g>
      <g transform={`translate(${width / 2}, ${height - 15})`}>
        <circle cx={0} cy={0} r={5} fill={isSteel ? '#cbd5e1' : '#f97316'} stroke={isSteel ? '#475569' : '#7c2d12'} strokeWidth={1} />
        <circle cx={0} cy={0} r={2} fill="#ca8a04" stroke="#78350f" strokeWidth={0.5} />
      </g>

      {/* Embossed Product Inscription */}
      <text
        x={width / 2}
        y={height / 2 - 8}
        textAnchor="middle"
        fontSize={6.5}
        fontWeight="900"
        fontFamily="sans-serif"
        fill="#fdba74"
        letterSpacing="0.8px"
      >
        ROYU
      </text>
      <text
        x={width / 2}
        y={height / 2 + 1}
        textAnchor="middle"
        fontSize={5.5}
        fontWeight="bold"
        fontFamily="monospace"
        fill="#fed7aa"
      >
        2"×4" UTILITY BOX
      </text>
      <text
        x={width / 2}
        y={height / 2 + 9}
        textAnchor="middle"
        fontSize={4.5}
        fontWeight="normal"
        fontFamily="sans-serif"
        fill="#ffedd5"
      >
        DEEP 44mm • PEC 3.14
      </text>

      {/* Material Badge Toggle */}
      <g
        transform={`translate(${width - 4}, -4)`}
        className="cursor-pointer group"
        onClick={handleToggleMaterial}
      >
        <rect
          x={-42}
          y={-10}
          width={46}
          height={14}
          rx={7}
          fill={isSteel ? '#64748b' : '#ea580c'}
          stroke="#ffffff"
          strokeWidth={1}
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
          className="transition-all hover:scale-105"
        />
        <text
          x={-19}
          y={0}
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#ffffff"
        >
          {isSteel ? 'Metal GI' : 'PVC Orange'}
        </text>
      </g>

      {/* Terminals (Pass-through splice bus connectors inside box) */}
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
