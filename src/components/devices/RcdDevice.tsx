import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface RcdDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RcdDevice: React.FC<RcdDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 40;
  const sensitivityMa = device.state.sensitivityMa || 30;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    onToggleState?.(device);
  };

  const handleTestTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.tripped = true;
    device.state.closed = false;
    device.state.tripReason = `Test Button: ${sensitivityMa}mA Simulated Earth Leakage Trip`;
    onToggleState?.(device);
  };

  const cx = width / 2;
  const cy = height / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`rcdBody-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`rcdRail-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <radialGradient id={`testBtn-${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>

      {/* Drop shadow & DIN Rail Rear Clips */}
      <rect x={2} y={3} width={width} height={height} rx={8} fill="rgba(15, 23, 42, 0.22)" />
      <rect x={-6} y={cy - 14} width={8} height={28} rx={2} fill={`url(#rcdRail-${uid})`} stroke="#475569" strokeWidth={0.9} />
      <rect x={width - 2} y={cy - 14} width={8} height={28} rx={2} fill={`url(#rcdRail-${uid})`} stroke="#475569" strokeWidth={0.9} />

      {/* Outer Molded Polycarbonate Body */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={8}
        fill={`url(#rcdBody-${uid})`}
        stroke="#94a3b8"
        strokeWidth={1.6}
      />
      <rect x={2} y={2} width={width - 4} height={height - 4} rx={6.5} fill="none" stroke="#ffffff" strokeWidth={1} />

      {/* Finger-Safe Input / Output Cage Shrouds */}
      {[12, width - 38].map((bx, i) => (
        <g key={`cage-${i}`}>
          <rect x={bx} y={4} width={26} height={22} rx={3} fill="#dce3ec" stroke="#b8c4d4" strokeWidth={0.8} />
          <rect x={bx} y={height - 26} width={26} height={22} rx={3} fill="#dce3ec" stroke="#b8c4d4" strokeWidth={0.8} />
        </g>
      ))}
      <line x1={cx} y1={4} x2={cx} y2={height - 4} stroke="#cbd5e1" strokeWidth={1.2} />

      {/* Raised Front Fascia Panel */}
      <rect x={6} y={28} width={width - 12} height={height - 56} rx={4} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />

      {/* Accent Header Strip */}
      <rect x={6} y={28} width={width - 12} height={15} rx={3.5} fill="#0369a1" />
      <text x={11} y={37.8} fontSize={7.5} fontWeight="900" fill="#ffffff" letterSpacing="0.5">
        RCCB {sensitivityMa}mA
      </text>
      <rect x={width - 26} y={30.5} width={16} height={10} rx={2} fill="#e0f2fe" />
      <text x={width - 18} y={37.5} textAnchor="middle" fontSize={6.2} fontWeight="900" fontFamily="monospace" fill="#0369a1">
        {ratedAmps}A
      </text>

      {/* Toroidal Core Transformer Schematic Etching */}
      <g transform={`translate(18, ${cy - 10})`} opacity={0.85}>
        <ellipse cx={0} cy={0} rx={6} ry={3.5} fill="none" stroke="#475569" strokeWidth={1.1} />
        <line x1={-3} y1={-6} x2={-3} y2={6} stroke="#dc2626" strokeWidth={1} />
        <line x1={3} y1={-6} x2={3} y2={6} stroke="#2563eb" strokeWidth={1} />
      </g>

      {/* Mechanical Fault / Status Shutter */}
      <rect
        x={cx - 12}
        y={46}
        width={24}
        height={10}
        rx={2.5}
        fill={isTripped ? '#f59e0b' : isClosed ? '#dc2626' : '#16a34a'}
        stroke="#0f172a"
        strokeWidth={0.8}
      />
      <text
        x={cx}
        y={53}
        textAnchor="middle"
        fontSize={6.2}
        fontWeight="bold"
        fontFamily="monospace"
        fill={isTripped ? '#0f172a' : '#ffffff'}
      >
        {isTripped ? 'FAULT' : isClosed ? 'I-ON' : 'O-OFF'}
      </text>

      {/* 3D Push-To-Test "T" Button */}
      <g onClick={handleTestTrip} className="cursor-pointer group">
        <circle cx={width - 22} cy={cy - 8} r={10.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.9} />
        <circle cx={width - 22} cy={cy - 8} r={8.5} fill={`url(#testBtn-${uid})`} stroke="#1e3a8a" strokeWidth={0.9} />
        <text x={width - 22} y={cy - 5.5} textAnchor="middle" fontSize={8.5} fontWeight="900" fill="#ffffff">
          T
        </text>
        <text x={width - 22} y={cy + 6.5} textAnchor="middle" fontSize={4.8} fontWeight="bold" fill="#334155">
          TEST
        </text>
      </g>

      {/* Breaker Rocker Toggle */}
      <g onClick={handleToggle} className="cursor-pointer">
        <rect x={12} y={cy + 2} width={34} height={24} rx={3.5} fill="#0b1120" stroke="#475569" strokeWidth={1} />
        <rect
          x={15}
          y={isTripped ? cy + 10 : isClosed ? cy + 4 : cy + 15}
          width={28}
          height={9}
          rx={2}
          fill="#334155"
          stroke="#0f172a"
          strokeWidth={0.8}
        />
        <line
          x1={18}
          y1={(isTripped ? cy + 10 : isClosed ? cy + 4 : cy + 15) + 3}
          x2={40}
          y2={(isTripped ? cy + 10 : isClosed ? cy + 4 : cy + 15) + 3}
          stroke="#94a3b8"
          strokeWidth={1}
        />
      </g>

      {/* Bottom IEC Specs & N Neutral Markings */}
      <text x={25} y={height - 30} textAnchor="middle" fontSize={6.5} fontWeight="900" fontFamily="monospace" fill="#dc2626">
        L1
      </text>
      <text x={width - 25} y={height - 30} textAnchor="middle" fontSize={6.5} fontWeight="900" fontFamily="monospace" fill="#2563eb">
        N
      </text>
      <text x={cx + 15} y={cy + 22} textAnchor="middle" fontSize={5.5} fontWeight="bold" fill="#475569">
        IEC 61008 · 240V~
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
