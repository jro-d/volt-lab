import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface RoyuSafetyBreakerDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RoyuSafetyBreakerDevice: React.FC<RoyuSafetyBreakerDeviceProps> = ({
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
  const ratedAmps = device.state.ratedAmps || 30;
  const isCoverOpen = !!device.state.enclosureCoverOpen;
  const cx = width / 2;
  const cy = height / 2;

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

  const handleToggleCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.enclosureCoverOpen = !device.state.enclosureCoverOpen;
    onToggleState?.(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`rsbShell-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`rsbPan-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id={`rsbPhenolic-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2c3545" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Enclosure Drop Shadow */}
      <rect x={3} y={4} width={width} height={height} rx={10} fill="rgba(15, 23, 42, 0.25)" />

      {/* Top & Bottom Surface Conduit Knockouts / Glands */}
      <rect x={cx - 14} y={-5} width={28} height={8} rx={2} fill="#64748b" stroke="#334155" strokeWidth={0.9} />
      <rect x={cx - 14} y={height - 3} width={28} height={8} rx={2} fill="#64748b" stroke="#334155" strokeWidth={0.9} />

      {/* NEMA 1 Thermoplastic Surface Box */}
      <rect x={0} y={0} width={width} height={height} rx={10} fill={`url(#rsbShell-${uid})`} stroke="#64748b" strokeWidth={1.8} />
      <rect x={3} y={3} width={width - 6} height={height - 6} rx={8} fill="none" stroke="#ffffff" strokeWidth={1} />

      {/* 4 Corner Stainless Lid Screws */}
      {[
        [10, 10],
        [width - 10, 10],
        [10, height - 10],
        [width - 10, height - 10],
      ].map(([sx, sy], i) => (
        <g key={`scr-${i}`}>
          <circle cx={sx} cy={sy} r={3.2} fill="#94a3b8" stroke="#475569" strokeWidth={0.8} />
          <line x1={sx - 1.8} y1={sy - 1.2} x2={sx + 1.8} y2={sy + 1.2} stroke="#1e293b" strokeWidth={0.9} />
        </g>
      ))}

      {!isCoverOpen ? (
        <g>
          {/* Contoured Hinged Front Door */}
          <rect x={8} y={14} width={width - 16} height={height - 28} rx={7} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.2} />

          {/* ROYU Brand Escutcheon */}
          <rect x={14} y={20} width={width - 28} height={16} rx={3} fill="#0f4c81" />
          <text x={20} y={31} fontSize={8.5} fontWeight="900" fill="#ffffff" letterSpacing="0.8">
            ROYU
          </text>
          <text x={width - 20} y={30.5} textAnchor="end" fontSize={6} fontWeight="bold" fontFamily="monospace" fill="#bae6fd">
            SAFETY BREAKER
          </text>

          {/* Smoked Window Around Handle Cutout */}
          <rect x={18} y={42} width={width - 36} height={height - 74} rx={5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />

          {/* Phenolic Breaker Escutcheon Insert */}
          <rect x={cx - 26} y={cy - 26} width={52} height={52} rx={4} fill={`url(#rsbPhenolic-${uid})`} stroke="#090d16" strokeWidth={1.2} />

          {/* Handle Status Strip */}
          <rect
            x={cx - 14}
            y={cy - 22}
            width={28}
            height={8}
            rx={2}
            fill={isTripped ? '#f59e0b' : isClosed ? '#dc2626' : '#16a34a'}
            stroke="#020617"
            strokeWidth={0.8}
          />
          <text x={cx} y={cy - 16} textAnchor="middle" fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill={isTripped ? '#0f172a' : '#ffffff'}>
            {isTripped ? 'TRIP' : isClosed ? 'I ON' : 'O OFF'}
          </text>

          {/* Interactive Breaker Handle */}
          <g onClick={handleToggle} className="cursor-pointer">
            <rect x={cx - 17} y={cy - 11} width={34} height={24} rx={3} fill="#05080f" stroke="#475569" strokeWidth={0.9} />
            <rect
              x={cx - 13}
              y={isTripped ? cy - 2 : isClosed ? cy - 9 : cy + 3}
              width={26}
              height={10}
              rx={2}
              fill={ratedAmps >= 30 ? '#16a34a' : '#dc2626'}
              stroke="#020617"
              strokeWidth={0.8}
            />
            <text
              x={cx}
              y={(isTripped ? cy - 2 : isClosed ? cy - 9 : cy + 3) + 7.2}
              textAnchor="middle"
              fontSize={5.8}
              fontWeight="900"
              fontFamily="monospace"
              fill="#ffffff"
            >
              {ratedAmps}A
            </text>
          </g>

          <text x={cx} y={height - 22} textAnchor="middle" fontSize={6.2} fontWeight="bold" fontFamily="monospace" fill="#334155">
            2P · {ratedAmps}A · 240V~ 10kA
          </text>
        </g>
      ) : (
        <g>
          {/* Open Enclosure Galvanized Steel Interior Pan */}
          <rect x={8} y={14} width={width - 16} height={height - 28} rx={5} fill={`url(#rsbPan-${uid})`} stroke="#475569" strokeWidth={1.2} />

          {/* Internal Copper Line/Load Stab Busbars */}
          <rect x={24} y={18} width={10} height={height - 36} rx={1.5} fill="#d97706" stroke="#78350f" strokeWidth={0.8} />
          <rect x={width - 34} y={18} width={10} height={height - 36} rx={1.5} fill="#d97706" stroke="#78350f" strokeWidth={0.8} />

          {/* Exposed Internal ROYU Bolt-On 2P Breaker */}
          <rect x={cx - 28} y={cy - 34} width={56} height={68} rx={4} fill={`url(#rsbPhenolic-${uid})`} stroke="#090d16" strokeWidth={1.4} />
          <text x={cx} y={cy - 22} textAnchor="middle" fontSize={6.2} fontWeight="900" fill="#f8fafc">
            ROYU 2P {ratedAmps}A
          </text>
          <g onClick={handleToggle} className="cursor-pointer">
            <rect x={cx - 15} y={cy - 12} width={30} height={24} rx={3} fill="#05080f" stroke="#475569" />
            <rect
              x={cx - 11}
              y={isTripped ? cy - 3 : isClosed ? cy - 9 : cy + 3}
              width={22}
              height={9}
              rx={2}
              fill={isTripped ? '#f59e0b' : isClosed ? '#dc2626' : '#16a34a'}
            />
          </g>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize={5.5} fontFamily="monospace" fill="#94a3b8">
            BOLT-ON LUGS
          </text>

          {/* Grounding Bar Strip inside Right Edge */}
          <rect x={width - 17} y={cy - 14} width={7} height={28} rx={1.5} fill="#16a34a" stroke="#14532d" strokeWidth={0.8} />
        </g>
      )}

      {/* Top Quick Cover Inspection Toggle Pill */}
      <g onClick={handleToggleCover} transform={`translate(${cx}, -9)`} className="cursor-pointer">
        <rect x={-34} y={-6} width={68} height={11} rx={5.5} fill="#0f172a" stroke="#38bdf8" strokeWidth={0.7} />
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5.8} fontWeight="bold" fill="#e2e8f0">
          {isCoverOpen ? 'Close Cover' : 'Inspect Lugs'}
        </text>
      </g>

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
