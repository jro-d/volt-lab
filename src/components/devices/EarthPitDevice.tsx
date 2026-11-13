import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface EarthPitDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const EarthPitDevice: React.FC<EarthPitDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const cx = width / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`earthRod-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id={`soil-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="45%" stopColor="#57534e" />
          <stop offset="100%" stopColor="#292524" />
        </linearGradient>
      </defs>

      {/* Pit Concrete Collar & Soil Cutaway */}
      <rect x={2} y={4} width={width - 4} height={height - 6} rx={8} fill="rgba(15, 23, 42, 0.2)" />
      <rect x={2} y={14} width={width - 4} height={height - 16} rx={7} fill={`url(#soil-${uid})`} stroke="#44403c" strokeWidth={1.4} />

      {/* Cast-Iron / Polymer Inspection Pit Collar */}
      <rect x={0} y={8} width={width} height={15} rx={3} fill="#334155" stroke="#0f172a" strokeWidth={1.2} />
      <rect x={6} y={10} width={width - 12} height={11} rx={2} fill="#1e293b" />
      <text x={cx} y={17.5} textAnchor="middle" fontSize={6.2} fontWeight="900" fontFamily="monospace" fill="#4ade80" letterSpacing="0.8">
        EARTH PIT
      </text>

      {/* Gravel / Bentonite Drainage Pebbles */}
      {[14, 22, 30, 52, 60, 68].map((px, i) => (
        <circle key={`peb-${i}`} cx={px} cy={30 + (i % 2) * 5} r={2.3} fill="#a8a29e" opacity={0.55} />
      ))}

      {/* Vertical Copper-Bonded Grounding Electrode Rod */}
      <rect x={cx - 4.5} y={22} width={9} height={height - 28} rx={2} fill={`url(#earthRod-${uid})`} stroke="#451a03" strokeWidth={1} />
      {/* Pointed Drive Tip */}
      <polygon points={`${cx - 4.5},${height - 8} ${cx + 4.5},${height - 8} ${cx},${height - 1}`} fill="#9a3412" />

      {/* Cast Brass U-Bolt Ground Rod Clamp */}
      <rect x={cx - 10} y={23} width={20} height={11} rx={2} fill="#d97706" stroke="#78350f" strokeWidth={1} />
      <circle cx={cx - 6} cy={28.5} r={1.8} fill="#78350f" />
      <circle cx={cx + 6} cy={28.5} r={1.8} fill="#78350f" />

      {/* Grounding Standard Label */}
      <rect x={cx - 28} y={height - 22} width={56} height={12} rx={2.5} fill="#0f172a" opacity={0.85} />
      <text x={cx} y={height - 14} textAnchor="middle" fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill="#4ade80">
        R ≤ 25 Ω · PEC
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
