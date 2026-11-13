import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface RoyuModularComboPlateDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RoyuModularComboPlateDevice: React.FC<RoyuModularComboPlateDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isRearView = device.state.viewMode === 'rear';
  const isSwitch1Closed = device.state.switchClosed !== false && device.state.closed !== false;
  const isSwitch2Closed = !!device.state.switch2Closed;
  const isSlot2Pilot = device.state.comboSlot2 !== 'switch2';
  const isPilotLit = !!device.state.pilotLit;
  const isReceptaclePowered = !!device.state.receptaclePowered;
  const cx = width / 2;

  const handleToggleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.viewMode = isRearView ? 'front' : 'rear';
    onToggleState?.(device);
  };

  const handleToggleSwitch1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isSwitch1Closed;
    device.state.switchClosed = next;
    device.state.closed = next;
    onToggleState?.(device);
  };

  const handleToggleSwitch2 = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.switch2Closed = !device.state.switch2Closed;
    onToggleState?.(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`comboPlate-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`comboStrap-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      <rect x={2} y={4} width={width} height={height} rx={9} fill="rgba(15, 23, 42, 0.22)" />

      {/* Outer Frame */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={9}
        fill={isRearView ? `url(#comboStrap-${uid})` : `url(#comboPlate-${uid})`}
        stroke="#64748b"
        strokeWidth={1.6}
      />

      {/* Top Quick View Switch Pill */}
      <g onClick={handleToggleView} transform={`translate(${cx}, -9)`} className="cursor-pointer">
        <rect x={-32} y={-6} width={64} height={11} rx={5.5} fill="#0f172a" stroke="#38bdf8" strokeWidth={0.7} />
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5.8} fontWeight="bold" fill="#e2e8f0">
          {isRearView ? 'Front Plate' : 'Rear Strap'}
        </text>
      </g>

      {!isRearView ? (
        <g>
          {/* Wide-Series 3-Module Inner Recess */}
          <rect x={8} y={8} width={width - 16} height={height - 16} rx={6} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
          <text x={cx} y={17} textAnchor="middle" fontSize={5.8} fontWeight="900" fill="#0f4c81" letterSpacing="0.8">
            ROYU WIDE 3-MOD
          </text>

          {/* MODULE 1: Wide Rocker Switch */}
          <g onClick={handleToggleSwitch1} className="cursor-pointer">
            <rect x={14} y={22} width={width - 28} height={32} rx={3.5} fill="#0f172a" stroke="#64748b" strokeWidth={0.9} />
            <rect
              x={16}
              y={24}
              width={width - 32}
              height={28}
              rx={2.5}
              fill={isSwitch1Closed ? '#ffffff' : '#e2e8f0'}
              stroke="#94a3b8"
              strokeWidth={0.8}
            />
            <rect x={cx - 8} y={36.5} width={16} height={3} rx={1.5} fill={isSwitch1Closed ? '#f59e0b' : '#94a3b8'} />
            <text x={width - 21} y={32} textAnchor="end" fontSize={5.4} fontWeight="bold" fill="#475569">
              {isSwitch1Closed ? 'ON' : 'OFF'}
            </text>
          </g>

          {/* MODULE 2: Pilot Jewel OR 2nd Rocker Switch */}
          {isSlot2Pilot ? (
            <g>
              <rect x={14} y={59} width={width - 28} height={26} rx={3.5} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.9} />
              <circle
                cx={cx}
                cy={72}
                r={7.5}
                fill={isPilotLit ? '#ef4444' : '#7f1d1d'}
                stroke="#334155"
                strokeWidth={1}
              />
              {isPilotLit && <circle cx={cx} cy={72} r={11} fill="rgba(239,68,68,0.32)" />}
              <circle cx={cx - 2} cy={70} r={2} fill="rgba(255,255,255,0.6)" />
            </g>
          ) : (
            <g onClick={handleToggleSwitch2} className="cursor-pointer">
              <rect x={14} y={59} width={width - 28} height={26} rx={3.5} fill="#0f172a" stroke="#64748b" strokeWidth={0.9} />
              <rect x={16} y={61} width={width - 32} height={22} rx={2.5} fill={isSwitch2Closed ? '#ffffff' : '#e2e8f0'} />
              <rect x={cx - 8} y={70.5} width={16} height={3} rx={1.5} fill={isSwitch2Closed ? '#22c55e' : '#94a3b8'} />
            </g>
          )}

          {/* MODULE 3: Universal Convenience Outlet */}
          <g>
            <rect x={14} y={90} width={width - 28} height={height - 102} rx={4} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
            <rect x={cx - 18} y={98} width={9} height={3.5} rx={1} fill="#0f172a" />
            <rect x={cx + 9} y={98} width={9} height={3.5} rx={1} fill="#0f172a" />
            <path d={`M ${cx - 3} 107 L ${cx + 3} 107 L ${cx + 3} 111 A 3 3 0 0 1 ${cx - 3} 111 Z`} fill="#16a34a" />
            <circle cx={width - 20} cy={96} r={2.2} fill={isReceptaclePowered ? '#22c55e' : '#cbd5e1'} />
          </g>
        </g>
      ) : (
        <g>
          {/* Rear Galvanized Steel Strap & Snap-in Terminal Blocks */}
          <rect x={8} y={8} width={width - 16} height={height - 16} rx={5} fill="#1e293b" stroke="#0f172a" strokeWidth={1.2} />
          <rect x={cx - 6} y={10} width={12} height={height - 20} rx={2} fill="#94a3b8" stroke="#475569" />
          {[32, 72, 112].map((my, i) => (
            <rect key={`modb-${i}`} x={12} y={my - 12} width={width - 24} height={24} rx={3} fill="#334155" stroke="#64748b" strokeWidth={0.9} />
          ))}
          <text x={cx} y={height - 13} textAnchor="middle" fontSize={5.5} fontWeight="bold" fontFamily="monospace" fill="#93c5fd">
            GALV STRAP · REAR LUGS
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
