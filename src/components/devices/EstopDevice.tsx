import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface EstopDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const EstopDevice: React.FC<EstopDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isLatched = !!device.state.estopActive;
  const cx = width / 2;
  const mushCy = height * 0.44;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleState?.({
      ...device,
      state: {
        ...device.state,
        estopActive: !isLatched,
      },
    });
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`estopYellow-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="60%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <radialGradient id={`estopMushroom-${uid}`} cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="45%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>

      {/* NEMA 4X High-Visibility Yellow Safety Enclosure */}
      <rect x={2} y={4} width={width} height={height} rx={9} fill="rgba(15, 23, 42, 0.25)" />
      <rect x={0} y={0} width={width} height={height} rx={9} fill={`url(#estopYellow-${uid})`} stroke="#713f12" strokeWidth={1.7} />

      {/* Dark Charcoal Recessed Lower Base Skirt */}
      <rect x={4} y={height - 17} width={width - 8} height={13} rx={3} fill="#0f172a" />

      {/* 4 Stainless Torx Cover Screws */}
      {[
        [10, 10],
        [width - 10, 10],
        [10, height - 22],
        [width - 10, height - 22],
      ].map(([sx, sy], i) => (
        <circle key={`esc-${i}`} cx={sx} cy={sy} r={2.4} fill="#cbd5e1" stroke="#475569" strokeWidth={0.8} />
      ))}

      {/* Anti-Tamper Safety Shroud Ring & Legend Collar */}
      <circle cx={cx} cy={mushCy} r={24} fill="#fef08a" stroke="#713f12" strokeWidth={1.2} />
      <text x={cx} y={mushCy - 16} textAnchor="middle" fontSize={4.8} fontWeight="900" fill="#7f1d1d" letterSpacing="0.5">
        EMERGENCY STOP
      </text>

      {/* 40mm Contoured Red Mushroom Plunger */}
      <g onClick={handleToggle} className="cursor-pointer group">
        {/* Plunger Shadow */}
        <circle cx={cx} cy={mushCy + (isLatched ? 2 : 4)} r={isLatched ? 16 : 18} fill="rgba(15, 23, 42, 0.35)" />
        {/* Stem collar when armed */}
        {!isLatched && <circle cx={cx} cy={mushCy} r={19} fill="#991b1b" />}
        <circle
          cx={cx}
          cy={mushCy}
          r={isLatched ? 15.5 : 17.5}
          fill={`url(#estopMushroom-${uid})`}
          stroke="#450a0a"
          strokeWidth={1.2}
          className="transition-all duration-150"
        />
        {/* Specular Arc Highlight */}
        <path
          d={`M ${cx - 10} ${mushCy - 8} A 13 13 0 0 1 ${cx + 2} ${mushCy - 12}`}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        {/* Rotary Twist-to-Release Arrows */}
        <path
          d={`M ${cx - 7} ${mushCy + 2} A 7 7 0 0 1 ${cx + 7} ${mushCy + 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <polygon points={`${cx + 7},${mushCy + 2} ${cx + 4},${mushCy - 1} ${cx + 9},${mushCy - 1}`} fill="#ffffff" opacity={0.85} />
      </g>

      <text
        x={cx}
        y={height - 8}
        textAnchor="middle"
        fontSize={6.2}
        fontWeight="900"
        fontFamily="monospace"
        fill={isLatched ? '#f87171' : '#4ade80'}
      >
        {isLatched ? 'LATCHED (NC OPEN)' : 'ARMED (NC CLOSED)'}
      </text>

      {terminals.map((t) => {
        const tx = width * t.relX;
        const ty = height * t.relY;
        const termId = `${device.id}:${t.id}`;
        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={tx}
            y={ty}
            isSelected={selectedTerminalId === termId}
            isHovered={hoveredTerminalId === termId}
            onMouseDown={(e) => {
              e.stopPropagation();
              onTerminalMouseDown?.(device, t, e);
            }}
            onMouseEnter={() => setHoveredTerminalId?.(termId)}
            onMouseLeave={() => setHoveredTerminalId?.(null)}
          />
        );
      })}
    </g>
  );
};
