import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface DinRailTrackDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const DinRailTrackDevice: React.FC<DinRailTrackDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const width = device.state.trackWidth || device.width || 260;
  const height = device.height || 52;
  const { terminals } = device;
  const slotCount = Math.max(4, Math.floor((width - 40) / 28));

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`dinSteel-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="22%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="78%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Top-Hat 35mm Flange Drop Shadow */}
      <rect x={2} y={5} width={width} height={height - 4} rx={3} fill="rgba(15, 23, 42, 0.16)" />

      {/* Outer Steel Flanges (Top & Bottom Lips) */}
      <rect x={0} y={2} width={width} height={height - 4} rx={2.5} fill={`url(#dinSteel-${uid})`} stroke="#475569" strokeWidth={1.1} />

      {/* Recessed Center U-Channel */}
      <rect x={4} y={10} width={width - 8} height={height - 20} rx={1.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.9} />
      <line x1={5} y1={11} x2={width - 5} y2={11} stroke="#475569" strokeWidth={0.8} opacity={0.65} />

      {/* Stamped Elongated Mounting Slots */}
      {Array.from({ length: slotCount }).map((_, idx) => {
        const sx = 24 + idx * ((width - 48) / Math.max(1, slotCount - 1)) - 7;
        return (
          <rect
            key={`slot-${idx}`}
            x={sx}
            y={height / 2 - 3}
            width={14}
            height={6}
            rx={3}
            fill="#475569"
            stroke="#334155"
            strokeWidth={0.7}
          />
        );
      })}

      {/* Polyamide EW-35 End Clamps */}
      {[3, width - 15].map((ex, i) => (
        <g key={`clamp-${i}`}>
          <rect x={ex} y={0} width={12} height={height} rx={2} fill="#334155" stroke="#0f172a" strokeWidth={0.9} />
          <circle cx={ex + 6} cy={height / 2} r={2.3} fill="#94a3b8" stroke="#0f172a" strokeWidth={0.6} />
        </g>
      ))}

      <text x={width / 2} y={8} textAnchor="middle" fontSize={5.5} fontWeight="bold" fontFamily="monospace" fill="#334155">
        DIN 35 × 7.5 mm · IEC 60715
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
