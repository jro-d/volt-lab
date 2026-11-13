import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface IndustrialRelayDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const IndustrialRelayDevice: React.FC<IndustrialRelayDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isEnergized = !!device.state.coilEnergized;
  const cx = width / 2;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleState?.({
      ...device,
      state: {
        ...device.state,
        manualTest: !device.state.manualTest,
        coilEnergized: !device.state.coilEnergized,
      },
    });
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`relaySocket-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={`copperBobbin-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c2d12" />
          <stop offset="45%" stopColor="#ea580c" />
          <stop offset="75%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id={`iceCover-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.36)" />
          <stop offset="50%" stopColor="rgba(226, 232, 240, 0.14)" />
          <stop offset="100%" stopColor="rgba(148, 163, 184, 0.28)" />
        </linearGradient>
      </defs>

      {/* Dark DIN Screw Terminal Socket Base */}
      <rect x={2} y={4} width={width} height={height} rx={7} fill="rgba(15, 23, 42, 0.25)" />
      <rect x={0} y={0} width={width} height={height} rx={7} fill={`url(#relaySocket-${uid})`} stroke="#475569" strokeWidth={1.5} />

      {/* Top/Bottom Numbered Cage Terminal Bays */}
      <rect x={6} y={4} width={width - 12} height={24} rx={3.5} fill="#090d16" stroke="#334155" strokeWidth={0.9} />
      <rect x={6} y={height - 28} width={width - 12} height={24} rx={3.5} fill="#090d16" stroke="#334155" strokeWidth={0.9} />

      {/* Clear Ice-Cube Polycarbonate Relay Cube */}
      <rect
        x={9}
        y={31}
        width={width - 18}
        height={height - 62}
        rx={5}
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth={1.3}
      />

      {/* Internal Enameled Copper Coil Bobbin & Steel Core Yoke */}
      <rect x={16} y={37} width={22} height={height - 74} rx={3} fill={`url(#copperBobbin-${uid})`} stroke="#f59e0b" strokeWidth={0.7} />
      <rect x={22} y={35} width={10} height={5} rx={1} fill="#cbd5e1" />

      {/* Internal DPDT Brass/Silver Armature Blades */}
      {[cx + 6, cx + 18].map((bx, i) => (
        <g key={`arm-${i}`}>
          {/* NC & NO stationary contacts */}
          <circle cx={bx - 4} cy={44} r={2} fill="#eab308" />
          <circle cx={bx + 5} cy={44} r={2} fill="#eab308" />
          {/* Moving Armature Leaf */}
          <line
            x1={bx}
            y1={height - 40}
            x2={isEnergized ? bx + 5 : bx - 4}
            y2={45}
            stroke={isEnergized ? '#4ade80' : '#cbd5e1'}
            strokeWidth={2}
            strokeLinecap="round"
            className="transition-all duration-150"
          />
        </g>
      ))}

      {/* Internal Coil Status Neon/LED */}
      <circle cx={27} cy={height / 2} r={3.5} fill={isEnergized ? '#a855f7' : '#334155'} stroke="#0f172a" strokeWidth={0.8} />
      {isEnergized && <circle cx={27} cy={height / 2} r={7} fill="rgba(168, 85, 247, 0.35)" />}

      {/* Frosted Ice-Cube Specular Polycarbonate Cover & Test Latch Tab */}
      <rect
        x={9}
        y={31}
        width={width - 18}
        height={height - 62}
        rx={5}
        fill={`url(#iceCover-${uid})`}
        className="pointer-events-none"
      />

      {/* Interactive Mechanical Manual Override / Test Push Flag */}
      <g onClick={handleToggle} className="cursor-pointer">
        <rect x={width - 27} y={33} width={14} height={9} rx={2} fill={isEnergized ? '#ef4444' : '#38bdf8'} stroke="#0f172a" strokeWidth={0.8} />
        <text x={width - 20} y={39.5} textAnchor="middle" fontSize={5} fontWeight="bold" fill="#0f172a">
          TEST
        </text>
      </g>

      <text x={cx} y={height - 33} textAnchor="middle" fontSize={5.5} fontWeight="bold" fontFamily="monospace" fill="#cbd5e1">
        DPDT 230VAC · 10A
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
