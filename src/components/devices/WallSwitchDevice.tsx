import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface WallSwitchDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const WallSwitchDevice: React.FC<WallSwitchDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const is1Gang = device.type === 'switch_1gang';
  const is3Way = device.type === 'switch_3way';
  const is4Way = device.type === 'switch_4way';

  const isClosed = !!device.state.closed;
  const position3Way = device.state.position || 'A';
  const cross4Way = !!device.state.crossState;
  const isUpState = is1Gang ? isClosed : is3Way ? position3Way === 'A' : !cross4Way;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (is1Gang) {
      device.state.closed = !device.state.closed;
    } else if (is3Way) {
      device.state.position = position3Way === 'A' ? 'B' : 'A';
    } else if (is4Way) {
      device.state.crossState = !cross4Way;
    }
    onToggleState?.(device);
  };

  const cx = width / 2;
  const cy = height / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`swPlate-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#dde4ed" />
        </linearGradient>
        <linearGradient id={`swPaddle-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUpState ? '#ffffff' : '#dbe3ee'} />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor={isUpState ? '#cbd5e1' : '#ffffff'} />
        </linearGradient>
      </defs>

      {/* Wallbox Cast Shadow */}
      <rect x={2} y={4} width={width} height={height} rx={9} fill="rgba(15, 23, 42, 0.2)" />

      {/* Outer Contoured Wide-Series Polycarbonate Plate */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={9}
        fill={`url(#swPlate-${uid})`}
        stroke="#94a3b8"
        strokeWidth={1.6}
      />
      <rect x={2.5} y={2.5} width={width - 5} height={height - 5} rx={7} fill="none" stroke="#ffffff" strokeWidth={1.1} />

      {/* Recessed Sub-frame Well & Concealed Brass Mounting Screws */}
      <rect x={7} y={7} width={width - 14} height={height - 14} rx={5.5} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.9} />
      <circle cx={cx} cy={12} r={2} fill="#94a3b8" />
      <circle cx={cx} cy={height - 12} r={2} fill="#94a3b8" />

      {/* Rocker Actuator Bezel */}
      <rect
        x={12}
        y={17}
        width={width - 24}
        height={height - 46}
        rx={4.5}
        fill="#0f172a"
        stroke="#64748b"
        strokeWidth={1}
      />

      {/* Interactive 3D Wide-Series Rocker Paddle */}
      <g onClick={handleToggle} className="cursor-pointer group">
        <rect
          x={14}
          y={19}
          width={width - 28}
          height={height - 50}
          rx={3.5}
          fill={`url(#swPaddle-${uid})`}
          stroke="#94a3b8"
          strokeWidth={0.9}
        />

        {/* Tilt Depth Shadow (top edge when depressed down, bottom edge when pressed up) */}
        {isUpState ? (
          <rect x={15} y={height - 39} width={width - 30} height={6} rx={1.5} fill="rgba(15, 23, 42, 0.22)" />
        ) : (
          <rect x={15} y={20} width={width - 30} height={6} rx={1.5} fill="rgba(15, 23, 42, 0.22)" />
        )}

        {/* Center Pivot Seam */}
        <line x1={16} y1={cy - 6} x2={width - 16} y2={cy - 6} stroke="#cbd5e1" strokeWidth={0.9} />

        {/* Phosphor Night-Glow Indicator Bar */}
        <rect
          x={cx - 10}
          y={cy - 9}
          width={20}
          height={3.2}
          rx={1.5}
          fill={isClosed || !is1Gang ? '#f59e0b' : '#94a3b8'}
          stroke={isClosed ? '#b45309' : 'none'}
          strokeWidth={0.5}
        />

        {/* Tactile ON / OFF Symbol */}
        <text
          x={cx}
          y={isUpState ? 28 : 29}
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fontFamily="monospace"
          fill="#64748b"
        >
          I
        </text>
        <text
          x={cx}
          y={height - 36}
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fontFamily="monospace"
          fill="#64748b"
        >
          O
        </text>
      </g>

      {/* Engraved Plate Specs & Mode Indicator */}
      <text
        x={cx}
        y={height - 19}
        textAnchor="middle"
        fontSize={6.8}
        fontWeight="900"
        fontFamily="monospace"
        fill="#1e293b"
      >
        {is1Gang
          ? isClosed
            ? 'ON · 1-WAY'
            : 'OFF · 1-WAY'
          : is3Way
            ? `3-WAY POS ${position3Way}`
            : cross4Way
              ? '4-WAY CROSS'
              : '4-WAY PAR'}
      </text>
      <text
        x={cx}
        y={height - 11.5}
        textAnchor="middle"
        fontSize={5}
        fontWeight="bold"
        fill="#64748b"
      >
        ROYU 16A 250V~
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
