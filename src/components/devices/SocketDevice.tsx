import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface SocketDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const SocketDevice: React.FC<SocketDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isSchuko = device.type === 'socket_schuko';
  const isPowered = !!device.state.powered;
  const isRearView = device.state.viewMode === 'rear';
  const cx = width / 2;
  const cy = height / 2;

  const handleFlipView = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.viewMode = isRearView ? 'front' : 'rear';
    onToggleState?.(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`sockPlate-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`sockSteel-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <radialGradient id={`schukoWell-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="75%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>

      {/* Wallplate Shadow */}
      <rect x={2} y={4} width={width} height={height} rx={9} fill="rgba(15, 23, 42, 0.2)" />

      {/* Outer Contoured Frame */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={9}
        fill={isRearView ? `url(#sockSteel-${uid})` : `url(#sockPlate-${uid})`}
        stroke={isPowered ? '#059669' : '#94a3b8'}
        strokeWidth={isPowered ? 2 : 1.6}
      />
      {!isRearView && (
        <rect x={2.5} y={2.5} width={width - 5} height={height - 5} rx={7} fill="none" stroke="#ffffff" strokeWidth={1.1} />
      )}

      {/* Top Quick Flip Pill (Front / Rear View) */}
      <g onClick={handleFlipView} transform={`translate(${cx}, -9)`} className="cursor-pointer">
        <rect x={-32} y={-6} width={64} height={11} rx={5.5} fill="#0f172a" stroke="#38bdf8" strokeWidth={0.7} />
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5.8} fontWeight="bold" fill="#e2e8f0">
          {isRearView ? 'Front View' : 'Rear Modules'}
        </text>
      </g>

      {isSchuko ? (
        !isRearView ? (
          <g>
            {/* European CEE 7/3 Schuko Flush Plate */}
            <rect x={8} y={8} width={width - 16} height={height - 16} rx={6} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
            {/* Recessed Circular 43mm Safety Well */}
            <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.3} fill={`url(#schukoWell-${uid})`} stroke="#64748b" strokeWidth={1.4} />
            <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.26} fill="none" stroke="#94a3b8" strokeWidth={0.8} />

            {/* Top & Bottom Spring-Brass Side Earth Clips (Schuko) */}
            <rect x={cx - 4.5} y={cy - Math.min(width, height) * 0.3 - 1} width={9} height={6} rx={1.2} fill="#eab308" stroke="#713f12" strokeWidth={0.8} />
            <rect x={cx - 4.5} y={cy + Math.min(width, height) * 0.3 - 5} width={9} height={6} rx={1.2} fill="#eab308" stroke="#713f12" strokeWidth={0.8} />

            {/* Center Fixing Screw & Dual 4.8mm Child-Shuttered Pin Wells */}
            <circle cx={cx - 12} cy={cy} r={3.6} fill="#0f172a" stroke="#475569" strokeWidth={0.8} />
            <circle cx={cx + 12} cy={cy} r={3.6} fill="#0f172a" stroke="#475569" strokeWidth={0.8} />
            <circle cx={cx} cy={cy} r={2.2} fill="#94a3b8" stroke="#475569" strokeWidth={0.7} />

            {/* Energized Status Indicator */}
            <circle cx={width - 14} cy={14} r={2.8} fill={isPowered ? '#22c55e' : '#cbd5e1'} stroke="#334155" strokeWidth={0.6} />
            <text x={cx} y={height - 12} textAnchor="middle" fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill="#334155">
              SCHUKO 16A 250V~
            </text>
          </g>
        ) : (
          <g>
            {/* Schuko Rear Polyamide Block & Brass Screw Clamps */}
            <rect x={10} y={10} width={width - 20} height={height - 20} rx={6} fill="#1e293b" stroke="#0f172a" strokeWidth={1.2} />
            <circle cx={cx} cy={cy} r={22} fill="#334155" stroke="#64748b" strokeWidth={1} />
            <rect x={15} y={cy - 12} width={12} height={24} rx={2} fill="#d97706" stroke="#78350f" />
            <rect x={width - 27} y={cy - 12} width={12} height={24} rx={2} fill="#cbd5e1" stroke="#475569" />
            <rect x={cx - 7} y={14} width={14} height={9} rx={2} fill="#16a34a" stroke="#14532d" />
            <text x={cx} y={height - 14} textAnchor="middle" fontSize={6} fontWeight="bold" fontFamily="monospace" fill="#cbd5e1">
              L • PE • N REAR
            </text>
          </g>
        )
      ) : !isRearView ? (
        <g>
          {/* ROYU Wide-Series Duplex Universal Convenience Outlet (Front View) */}
          <rect x={7} y={7} width={width - 14} height={height - 14} rx={6} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />

          {/* Metallic Trim Strip at Bottom */}
          <rect x={10} y={height - 16} width={width - 20} height={7} rx={2} fill="#e2e8f0" />
          <text x={cx} y={height - 10.8} textAnchor="middle" fontSize={5.4} fontWeight="900" fill="#0f4c81" letterSpacing="0.6">
            ROYU 16A 250V~
          </text>

          {/* Two Grounded Universal Receptacle Modules */}
          {[cy - 22, cy + 18].map((ry, idx) => (
            <g key={`gang-${idx}`} transform={`translate(${cx}, ${ry})`}>
              {/* Molded Recessed Outlet Face */}
              <rect x={-26} y={-15} width={52} height={30} rx={5} fill="#ffffff" stroke="#94a3b8" strokeWidth={1.1} />
              <rect x={-23} y={-12} width={46} height={24} rx={3.5} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.7} />

              {/* Universal Flat/Round Phase & Neutral Shutter Slots */}
              <rect x={-16} y={-5} width={9} height={3.5} rx={1} fill="#0f172a" />
              <circle cx={-12} cy={-3.2} r={2.2} fill="#0f172a" />

              <rect x={7} y={-5} width={9} height={3.5} rx={1} fill="#0f172a" />
              <circle cx={12} cy={-3.2} r={2.2} fill="#0f172a" />

              {/* Lower D-Shaped Grounding Earth Pin Hole */}
              <path d="M -3 4 L 3 4 L 3 8 A 3 3 0 0 1 -3 8 Z" fill="#16a34a" stroke="#0f172a" strokeWidth={0.7} />

              {/* Live Power Jewel LED */}
              <circle cx={20} cy={-8} r={2.1} fill={isPowered ? '#22c55e' : '#cbd5e1'} />
            </g>
          ))}
        </g>
      ) : (
        <g>
          {/* Rear Modular Assembly View: Brass Hot Clamps, Silver Neutral Clamps & Copper Jumpers */}
          <rect x={8} y={8} width={width - 16} height={height - 16} rx={5} fill="#1e293b" stroke="#0f172a" strokeWidth={1.2} />
          {/* Galvanized Mounting Strap Spine */}
          <rect x={cx - 8} y={10} width={16} height={height - 20} rx={2} fill="#94a3b8" stroke="#475569" strokeWidth={0.9} />
          <circle cx={cx} cy={cy} r={4} fill="#16a34a" stroke="#052e16" strokeWidth={0.9} />

          {/* Internal Brass & Neutral Bus Jumpers */}
          <rect x={14} y={24} width={7} height={height - 48} rx={1.5} fill="#dc2626" opacity={0.85} />
          <rect x={width - 21} y={24} width={7} height={height - 48} rx={1.5} fill="#2563eb" opacity={0.85} />

          <text x={cx} y={20} textAnchor="middle" fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill="#f8fafc">
            REAR TERMINAL BLOCK
          </text>
          <text x={cx} y={height - 13} textAnchor="middle" fontSize={5.5} fontWeight="bold" fontFamily="monospace" fill="#93c5fd">
            L (BRASS) · PE · N (SILVER)
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
