import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface MotorStarterDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const MotorStarterDevice: React.FC<MotorStarterDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isRunning = !!device.state.running;
  const cx = width / 2;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.running = true;
    onToggleState?.(device);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.running = false;
    onToggleState?.(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`dolHousing-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="55%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id={`dolStartBtn-${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id={`dolStopBtn-${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>

      {/* Enclosed IP65 Cast DOL Magnetic Starter Box */}
      <rect x={2} y={4} width={width} height={height} rx={9} fill="rgba(15, 23, 42, 0.25)" />
      <rect x={0} y={0} width={width} height={height} rx={9} fill={`url(#dolHousing-${uid})`} stroke="#334155" strokeWidth={1.6} />

      {/* Top/Bottom Gland Conduits */}
      <rect x={cx - 12} y={-4} width={24} height={6} rx={1.5} fill="#334155" />
      <rect x={cx - 12} y={height - 2} width={24} height={6} rx={1.5} fill="#334155" />

      {/* Front Escutcheon Plate */}
      <rect x={7} y={12} width={width - 14} height={height - 24} rx={6} fill="#1e293b" stroke="#0f172a" strokeWidth={1.2} />
      <rect x={10} y={15} width={width - 20} height={15} rx={3} fill="#0f172a" />
      <text x={cx} y={24.5} textAnchor="middle" fontSize={6.5} fontWeight="900" fontFamily="monospace" fill="#f8fafc" letterSpacing="0.5">
        DOL STARTER
      </text>

      {/* Status LED */}
      <circle cx={18} cy={38} r={3.5} fill={isRunning ? '#22c55e' : '#ef4444'} stroke="#0f172a" strokeWidth={0.8} />
      <text x={25} y={40.5} fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill={isRunning ? '#4ade80' : '#fca5a5'}>
        {isRunning ? 'MOTOR RUN' : 'STOPPED'}
      </text>

      {/* Recessed Shrouded START / STOP Mechanical Buttons */}
      <g onClick={handleStart} className="cursor-pointer">
        <circle cx={cx - 18} cy={62} r={13} fill="#0f172a" stroke="#64748b" strokeWidth={1} />
        <circle cx={cx - 18} cy={62} r={10} fill={`url(#dolStartBtn-${uid})`} stroke="#14532d" strokeWidth={0.8} />
        <text x={cx - 18} y={64.5} textAnchor="middle" fontSize={6} fontWeight="900" fill="#ffffff">
          I
        </text>
      </g>

      <g onClick={handleStop} className="cursor-pointer">
        <circle cx={cx + 18} cy={62} r={13} fill="#0f172a" stroke="#64748b" strokeWidth={1} />
        <circle cx={cx + 18} cy={62} r={10} fill={`url(#dolStopBtn-${uid})`} stroke="#7f1d1d" strokeWidth={0.8} />
        <text x={cx + 18} y={64.5} textAnchor="middle" fontSize={6} fontWeight="900" fill="#ffffff">
          O
        </text>
      </g>

      <text x={cx} y={height - 17} textAnchor="middle" fontSize={5.4} fontWeight="bold" fontFamily="monospace" fill="#94a3b8">
        THERMAL O/L INTEGRATED
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
