import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface SpdDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const SpdDevice: React.FC<SpdDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isHealthy = device.state.healthy !== false;
  const cx = width / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`spdBase-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id={`spdCartridge-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Drop Shadow & DIN Base */}
      <rect x={2} y={3} width={width} height={height} rx={7} fill="rgba(15, 23, 42, 0.22)" />
      <rect x={-4} y={height / 2 - 12} width={width + 8} height={24} rx={2.5} fill="#94a3b8" stroke="#475569" strokeWidth={0.9} />

      <rect x={0} y={0} width={width} height={height} rx={7} fill={`url(#spdBase-${uid})`} stroke="#0f172a" strokeWidth={1.5} />

      {/* Top/Bottom Cage Terminal Bays */}
      <rect x={8} y={4} width={width - 16} height={21} rx={3} fill="#0f172a" stroke="#334155" strokeWidth={0.8} />
      <rect x={8} y={height - 25} width={width - 16} height={21} rx={3} fill="#0f172a" stroke="#334155" strokeWidth={0.8} />

      {/* Two Pluggable MOV / GDT Cartridges */}
      {[0, 1].map((idx) => {
        const x0 = 6 + idx * ((width - 14) / 2 + 2);
        const cw = (width - 14) / 2;
        const isFirst = idx === 0;
        return (
          <g key={`cart-${idx}`}>
            <rect
              x={x0}
              y={27}
              width={cw}
              height={height - 54}
              rx={4}
              fill={`url(#spdCartridge-${uid})`}
              stroke="#64748b"
              strokeWidth={1}
            />
            {/* Top pull-tab groove */}
            <rect x={x0 + 4} y={29} width={cw - 8} height={3} rx={1.5} fill="#cbd5e1" />
            {/* Color band */}
            <rect x={x0} y={34} width={cw} height={11} fill={isFirst ? '#dc2626' : '#16a34a'} />
            <text x={x0 + cw / 2} y={41.5} textAnchor="middle" fontSize={6.5} fontWeight="900" fill="#ffffff">
              {isFirst ? 'L / N' : 'N-PE'}
            </text>

            {/* Translucent Mechanical Status Lens */}
            <rect
              x={x0 + cw / 2 - 8}
              y={49}
              width={16}
              height={9}
              rx={2}
              fill={isHealthy ? '#16a34a' : '#dc2626'}
              stroke="#0f172a"
              strokeWidth={0.9}
            />
            <line
              x1={x0 + cw / 2 - 6}
              y1={51}
              x2={x0 + cw / 2 + 6}
              y2={51}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={1}
            />

            {/* Surge Lightning Graphic */}
            <path
              d={`M ${x0 + cw / 2 + 1} 63 L ${x0 + cw / 2 - 4} 70 L ${x0 + cw / 2} 70 L ${x0 + cw / 2 - 2} 77 L ${x0 + cw / 2 + 4} 69 L ${x0 + cw / 2} 69 Z`}
              fill={isFirst ? '#ea580c' : '#15803d'}
            />
            <text x={x0 + cw / 2} y={87} textAnchor="middle" fontSize={5.4} fontWeight="bold" fontFamily="monospace" fill="#1e293b">
              40kA
            </text>
          </g>
        );
      })}

      {/* Bottom Cartridge Footplate */}
      <text x={cx} y={height - 17} textAnchor="middle" fontSize={5.6} fontWeight="bold" fontFamily="monospace" fill="#4ade80">
        PE / GROUND
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
