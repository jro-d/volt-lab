import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface SpliceNutDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const SpliceNutDevice: React.FC<SpliceNutDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isWago = device.type === 'wago_connector_3p';
  const cx = width / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`nutBody-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="38%" stopColor="#ef4444" />
          <stop offset="72%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={`wagoClear-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(226, 232, 240, 0.9)" />
          <stop offset="50%" stopColor="rgba(248, 250, 252, 0.72)" />
          <stop offset="100%" stopColor="rgba(148, 163, 184, 0.85)" />
        </linearGradient>
      </defs>

      {isWago ? (
        <g>
          {/* WAGO 221-413 Translucent 3-Port Lever Connector */}
          <rect x={2} y={4} width={width - 2} height={height - 4} rx={5} fill="rgba(15, 23, 42, 0.18)" />
          <rect
            x={1}
            y={3}
            width={width - 2}
            height={height - 6}
            rx={5}
            fill={`url(#wagoClear-${uid})`}
            stroke="#64748b"
            strokeWidth={1.3}
          />
          {/* Internal Tinned Copper Busbar Bridge */}
          <rect x={7} y={9} width={width - 14} height={9} rx={2} fill="#d97706" stroke="#78350f" strokeWidth={0.8} />

          {/* 3 Vivid Orange Pivoting Operating Levers */}
          {[0.22, 0.5, 0.78].map((rx, idx) => (
            <g key={`lev-${idx}`} transform={`translate(${width * rx}, 23)`}>
              <rect x={-7} y={-8} width={14} height={15} rx={2.5} fill="#f97316" stroke="#9a3412" strokeWidth={0.9} />
              <line x1={-4} y1={-4} x2={4} y2={-4} stroke="#fed7aa" strokeWidth={1.1} />
              <line x1={-4} y1={-1} x2={4} y2={-1} stroke="#c2410c" strokeWidth={1} />
            </g>
          ))}

          <text x={cx} y={height - 13} textAnchor="middle" fontSize={5.8} fontWeight="900" fontFamily="monospace" fill="#0f172a">
            WAGO 221 · 32A
          </text>
        </g>
      ) : (
        <g>
          {/* Flared Skirted Twist-On Wire Nut (3M / IDEAL Style) */}
          <polygon
            points={`${cx - 14},3 ${cx + 14},3 ${cx + 25},${height - 14} ${cx - 25},${height - 14}`}
            fill="rgba(15, 23, 42, 0.18)"
            transform="translate(2, 2)"
          />
          {/* Swept Wing Tabs */}
          <path
            d={`M ${cx - 14} 10 Q ${cx - 24} 18 ${cx - 22} 32 L ${cx - 17} 32 Z`}
            fill="#991b1b"
            stroke="#7f1d1d"
            strokeWidth={0.8}
          />
          <path
            d={`M ${cx + 14} 10 Q ${cx + 24} 18 ${cx + 22} 32 L ${cx + 17} 32 Z`}
            fill="#991b1b"
            stroke="#7f1d1d"
            strokeWidth={0.8}
          />
          {/* Main Conical Skirted Thermoplastic Cap */}
          <path
            d={`M ${cx - 12} 4 Q ${cx} 1 ${cx + 12} 4 L ${cx + 23} ${height - 14} Q ${cx} ${height - 9} ${cx - 23} ${height - 14} Z`}
            fill={`url(#nutBody-${uid})`}
            stroke="#7f1d1d"
            strokeWidth={1.3}
          />
          {/* Vertical Fluted Grip Ribs */}
          {[-7, 0, 7].map((dx, i) => (
            <line
              key={`flute-${i}`}
              x1={cx + dx * 0.7}
              y1={6}
              x2={cx + dx * 1.4}
              y2={height - 17}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1.3}
              strokeLinecap="round"
            />
          ))}
          <text x={cx} y={24} textAnchor="middle" fontSize={6.4} fontWeight="900" fontFamily="monospace" fill="#ffffff">
            SPLICE
          </text>
        </g>
      )}

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
