import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface KwhMeterDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
}

export const KwhMeterDevice: React.FC<KwhMeterDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const is3P = device.type === 'kwh_meter_3p';
  const cx = width / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`kwhPlate-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={`kwhCase-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`kwhGlass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="50%" stopColor="#ffffff" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.22} />
        </linearGradient>
        <linearGradient id={`kwhLcd-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ba870" />
          <stop offset="100%" stopColor="#6d8952" />
        </linearGradient>
      </defs>

      {/* Outer Cast Backplate & Mounting Lugs */}
      <rect x={2} y={4} width={width} height={height} rx={12} fill="rgba(15, 23, 42, 0.24)" />
      <rect x={cx - 12} y={-7} width={24} height={9} rx={3} fill={`url(#kwhPlate-${uid})`} stroke="#334155" strokeWidth={1} />
      <circle cx={cx} cy={-3} r={2.2} fill="#1e293b" />

      {/* Main Meter Body */}
      <rect x={0} y={0} width={width} height={height} rx={10} fill={`url(#kwhCase-${uid})`} stroke="#64748b" strokeWidth={1.8} />

      {/* Inner Polycarbonate Meter Well */}
      <rect x={6} y={7} width={width - 12} height={height - 54} rx={7} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />

      {/* Header Plate */}
      <rect x={6} y={7} width={width - 12} height={18} rx={6} fill="#0f172a" />
      <text x={12} y={18.5} fontSize={7.2} fontWeight="900" fontFamily="monospace" fill="#f8fafc" letterSpacing="0.5">
        {is3P ? 'DIGITAL 3Φ kWh' : 'DIGITAL kWh METER'}
      </text>
      <circle cx={width - 16} cy={16} r={3} fill="#22c55e" stroke="#14532d" strokeWidth={0.8} />

      {/* Recessed LCD Screen Bezel */}
      <rect x={12} y={30} width={width - 24} height={36} rx={4} fill="#1e293b" stroke="#0f172a" strokeWidth={1.2} />
      <rect x={15} y={33} width={width - 30} height={30} rx={2.5} fill={`url(#kwhLcd-${uid})`} stroke="#365314" strokeWidth={0.8} />

      {/* Backlit Matrix LCD Telemetry */}
      <text x={20} y={42} fontSize={6.2} fontWeight="bold" fontFamily="monospace" fill="#1a2e05">
        T1 TOTAL {is3P ? '400V' : '230V'}
      </text>
      <text
        x={width - 20}
        y={56}
        textAnchor="end"
        fontSize={13}
        fontWeight="900"
        fontFamily="monospace"
        fill="#0f1f02"
        letterSpacing="1"
      >
        {is3P ? '01482.5' : '00428.6'}
      </text>
      <text x={20} y={59} fontSize={5.5} fontWeight="bold" fontFamily="monospace" fill="#1a2e05">
        kWh
      </text>

      {/* Optical IEC 62056 Probe Ring + Pulse LED */}
      <g transform={`translate(${width - 28}, 81)`}>
        <circle cx={0} cy={0} r={9.5} fill="#cbd5e1" stroke="#475569" strokeWidth={1} />
        <circle cx={0} cy={0} r={6} fill="#1e293b" stroke="#64748b" strokeWidth={0.8} />
        <circle cx={0} cy={0} r={2.2} fill="#38bdf8" opacity={0.8} />
      </g>
      <g transform="translate(22, 77)">
        <circle cx={0} cy={0} r={3.2} fill="#ef4444" stroke="#7f1d1d" strokeWidth={0.8} />
        <text x={7} y={2} fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill="#334155">
          1600 imp/kWh
        </text>
        <text x={-5} y={11} fontSize={5.5} fontFamily="monospace" fill="#475569">
          {is3P ? '3x230/400V · 60Hz' : '230V~ 10(60)A 60Hz'}
        </text>
      </g>

      {/* Polycarbonate Dome Glass Specular Diagonal Reflection */}
      <polygon
        points={`8,9 ${width - 28},9 8,${height - 62}`}
        fill={`url(#kwhGlass-${uid})`}
        className="pointer-events-none"
      />

      {/* Lower Translucent Ribbed Sealable Terminal Cover */}
      <rect
        x={5}
        y={height - 43}
        width={width - 10}
        height={39}
        rx={4}
        fill="rgba(148, 163, 184, 0.28)"
        stroke="#64748b"
        strokeWidth={1.2}
      />
      {/* Fluted Cover Ribs */}
      {[12, 22, 32, width - 32, width - 22, width - 12].map((rx, i) => (
        <line
          key={`rib-${i}`}
          x1={rx}
          y1={height - 41}
          x2={rx}
          y2={height - 7}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1}
        />
      ))}

      {/* Internal Brass Terminal Block Divider & Utility Seal Screws */}
      <rect x={10} y={height - 34} width={width - 20} height={24} rx={3} fill="#0f172a" stroke="#334155" strokeWidth={0.9} />
      <circle cx={11} cy={height - 38} r={2.3} fill="#d97706" stroke="#78350f" strokeWidth={0.7} />
      <circle cx={width - 11} cy={height - 38} r={2.3} fill="#d97706" stroke="#78350f" strokeWidth={0.7} />
      <text x={cx} y={height - 36.5} textAnchor="middle" fontSize={5.4} fontWeight="bold" fontFamily="monospace" fill="#334155">
        {is3P ? 'L1 • L2 • L3 • N SEALED' : '1:L-IN  2:L-OUT  3:N-IN  4:N-OUT'}
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
