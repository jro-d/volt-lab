import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface WallSwitchProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const WallSwitchDevice: React.FC<WallSwitchProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const is1Gang = device.type === 'switch_1gang';
  const is3Way = device.type === 'switch_3way';
  const is4Way = device.type === 'switch_4way';

  const isClosed = !!device.state.closed;
  const position3Way = device.state.position || 'A';
  const cross4Way = !!device.state.crossState;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playSwitchClick();

    if (is1Gang) {
      device.state.closed = !device.state.closed;
    } else if (is3Way) {
      device.state.position = position3Way === 'A' ? 'B' : 'A';
    } else if (is4Way) {
      device.state.crossState = !cross4Way;
    }

    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Decorator Faceplate Gradient */}
        <linearGradient id={`switchPlateGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f8fafc" />
          <stop offset="80%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Rocker Tilt Gradient */}
        <linearGradient id={`rockerGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Wall Plate Drop Shadow */}
      <rect
        x={2}
        y={3}
        width={width}
        height={height}
        rx={8}
        fill="#000000"
        opacity={0.12}
      />

      {/* Modern Flush Wall Plate Face */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={8}
        fill={`url(#switchPlateGrad_${device.id})`}
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />

      {/* Inner Chamfer Bevel Ring */}
      <rect
        x={3}
        y={3}
        width={width - 6}
        height={height - 6}
        rx={6}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.2}
      />

      {/* Plate Mounting Screws (Slotted Oval Head) */}
      <circle cx={width / 2} cy={12} r={2.5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
      <line x1={width / 2 - 1.5} y1={12} x2={width / 2 + 1.5} y2={12} stroke="#64748b" strokeWidth={0.8} />

      <circle cx={width / 2} cy={height - 24} r={2.5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
      <line x1={width / 2 - 1.5} y1={height - 24} x2={width / 2 + 1.5} y2={height - 24} stroke="#64748b" strokeWidth={0.8} />

      {/* Rocker Switch Bezel Housing */}
      <rect
        x={width * 0.18}
        y={height * 0.22}
        width={width * 0.64}
        height={height * 0.46}
        rx={4}
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth={1}
      />

      {/* Interactive Rocker Toggle Button */}
      <g
        onClick={handleClick}
        className="cursor-pointer group"
      >
        <rect
          x={width * 0.22}
          y={height * 0.24}
          width={width * 0.56}
          height={height * 0.42}
          rx={3}
          fill={`url(#rockerGrad_${device.id})`}
          stroke="#94a3b8"
          strokeWidth={0.8}
          className="transition-transform group-hover:brightness-95"
        />

        {/* Rocker Tilt Shade Line (Visual feedback of ON/OFF state) */}
        <line
          x1={width * 0.26}
          y1={isClosed || position3Way === 'B' ? height * 0.42 : height * 0.48}
          x2={width * 0.74}
          y2={isClosed || position3Way === 'B' ? height * 0.42 : height * 0.48}
          stroke={isClosed || position3Way === 'B' ? '#ca8a04' : '#cbd5e1'}
          strokeWidth={2.5}
        />

        {/* Small Power Pip Indicator */}
        <circle
          cx={width / 2}
          cy={height * 0.31}
          r={2.5}
          fill={isClosed ? '#eab308' : '#e2e8f0'}
          stroke={isClosed ? '#ca8a04' : '#cbd5e1'}
          strokeWidth={0.5}
        />
      </g>

      {/* Switch State Label */}
      <text
        x={width / 2}
        y={height * 0.77}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#475569"
      >
        {is1Gang ? (isClosed ? 'ON' : 'OFF') : is3Way ? `POS ${position3Way}` : (cross4Way ? 'CROSS' : 'DIRECT')}
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
};
