import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface UtilityBoxSurfacePvcDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const UtilityBoxSurfacePvcDevice: React.FC<UtilityBoxSurfacePvcDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isSteel = device.state.boxMaterial === 'galvanized_steel';
  const cx = width / 2;
  const cy = height / 2;

  const handleToggleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.boxMaterial = isSteel ? 'orange_pvc' : 'galvanized_steel';
    onToggleState?.(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`ubOrange-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="55%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id={`ubSteel-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="55%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      <rect x={2} y={4} width={width} height={height} rx={7} fill="rgba(15, 23, 42, 0.22)" />

      {/* 2"x4" Deep Utility Box Outer Lip */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={7}
        fill={isSteel ? `url(#ubSteel-${uid})` : `url(#ubOrange-${uid})`}
        stroke={isSteel ? '#334155' : '#7c2d12'}
        strokeWidth={1.7}
      />

      {/* Deep Recessed Cavity */}
      <rect
        x={7}
        y={8}
        width={width - 14}
        height={height - 16}
        rx={4}
        fill={isSteel ? '#475569' : '#9a3412'}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1}
      />

      {/* Knockouts on Top & Bottom */}
      <circle cx={cx} cy={4} r={3.5} fill="none" stroke={isSteel ? '#e2e8f0' : '#fed7aa'} strokeDasharray="1.8 1" />
      <circle cx={cx} cy={height - 4} r={3.5} fill="none" stroke={isSteel ? '#e2e8f0' : '#fed7aa'} strokeDasharray="1.8 1" />

      {/* Top/Bottom Device Mounting Ears */}
      <rect x={cx - 10} y={7} width={20} height={6} rx={1.5} fill={isSteel ? '#cbd5e1' : '#fb923c'} stroke="#1e293b" strokeWidth={0.7} />
      <rect x={cx - 10} y={height - 13} width={20} height={6} rx={1.5} fill={isSteel ? '#cbd5e1' : '#fb923c'} stroke="#1e293b" strokeWidth={0.7} />

      {/* Internal Pass-Through Splice Barrier Strip */}
      <rect x={11} y={18} width={width - 22} height={height - 36} rx={4} fill="#0f172a" stroke="#475569" strokeWidth={1} opacity={0.92} />

      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={5.8} fontWeight="bold" fontFamily="monospace" fill="#cbd5e1">
        2"×4" {isSteel ? 'GI BOX' : 'PVC BOX'}
      </text>

      {/* Material Switch Badge */}
      <g onClick={handleToggleMaterial} transform={`translate(${cx}, -8)`} className="cursor-pointer">
        <rect x={-26} y={-5.5} width={52} height={10} rx={5} fill="#0f172a" stroke="#f59e0b" strokeWidth={0.7} />
        <text x={0} y={0.5} textAnchor="middle" dominantBaseline="middle" fontSize={5.4} fontWeight="bold" fill="#fef08a">
          {isSteel ? 'GI Steel' : 'PVC Box'}
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
