import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface PlcDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const PlcDevice: React.FC<PlcDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isRunning = device.state.plcRunning !== false;
  const inputs = device.state.plcInputs || {};
  const outputs = device.state.plcOutputs || {};
  const cx = width / 2;

  const handleToggleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleState?.({
      ...device,
      state: {
        ...device.state,
        plcRunning: !isRunning,
      },
    });
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`plcShell-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={`plcLcd-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isRunning ? '#22c55e' : '#f59e0b'} stopOpacity={0.22} />
          <stop offset="100%" stopColor="#052e16" stopOpacity={0.95} />
        </linearGradient>
      </defs>

      {/* Main DIN-Rail Smart Relay Chassis */}
      <rect x={2} y={4} width={width} height={height} rx={8} fill="rgba(15, 23, 42, 0.25)" />
      <rect x={0} y={0} width={width} height={height} rx={8} fill={`url(#plcShell-${uid})`} stroke="#090d16" strokeWidth={1.6} />

      {/* Top & Bottom Recessed Cage Terminal Bays */}
      <rect x={8} y={4} width={width - 16} height={24} rx={3.5} fill="#090d16" stroke="#334155" strokeWidth={0.9} />
      <rect x={8} y={height - 28} width={width - 16} height={24} rx={3.5} fill="#090d16" stroke="#334155" strokeWidth={0.9} />

      {/* Front Operator Console Bezel */}
      <rect x={8} y={32} width={width - 16} height={height - 64} rx={5} fill="#172030" stroke="#475569" strokeWidth={1} />

      {/* Header Strip & Interactive RUN/STOP Switch */}
      <text x={14} y={43} fontSize={7} fontWeight="900" fontFamily="monospace" fill="#38bdf8" letterSpacing="0.6">
        SMART PLC 230RCE
      </text>
      <g onClick={handleToggleRun} className="cursor-pointer">
        <rect
          x={width - 52}
          y={35}
          width={38}
          height={12}
          rx={3}
          fill={isRunning ? '#16a34a' : '#d97706'}
          stroke="#0f172a"
          strokeWidth={0.9}
        />
        <text x={width - 33} y={43} textAnchor="middle" fontSize={6} fontWeight="bold" fontFamily="monospace" fill="#ffffff">
          {isRunning ? '● RUN' : '■ STOP'}
        </text>
      </g>

      {/* Backlit Matrix LCD Screen */}
      <rect x={14} y={50} width={width - 58} height={38} rx={3} fill="#020617" stroke="#334155" strokeWidth={1} />
      <rect x={16} y={52} width={width - 62} height={34} rx={2} fill={`url(#plcLcd-${uid})`} />

      {/* Live I/O Status Grid inside LCD */}
      <text x={20} y={62} fontSize={6.2} fontWeight="bold" fontFamily="monospace" fill="#86efac">
        IN : I1={inputs.i1 ? '1' : '0'} I2={inputs.i2 ? '1' : '0'} I3={inputs.i3 ? '1' : '0'} I4={inputs.i4 ? '1' : '0'}
      </text>
      <text x={20} y={73} fontSize={6.2} fontWeight="bold" fontFamily="monospace" fill="#fde047">
        OUT: Q1={outputs.q1 ? '1' : '0'} Q2={outputs.q2 ? '1' : '0'} Q3={outputs.q3 ? '1' : '0'} Q4={outputs.q4 ? '1' : '0'}
      </text>
      <text x={20} y={82} fontSize={5.2} fontFamily="monospace" fill="#cbd5e1">
        LAD: I1→Q1  I2→Q2
      </text>

      {/* Cursor Keypad Diamond (Right Side of LCD) */}
      <g transform={`translate(${width - 28}, 69)`}>
        <circle cx={0} cy={0} r={12} fill="#0f172a" stroke="#475569" strokeWidth={0.9} />
        <polygon points="0,-9 -3,-4 3,-4" fill="#94a3b8" />
        <polygon points="0,9 -3,4 3,4" fill="#94a3b8" />
        <polygon points="-9,0 -4,-3 -4,3" fill="#94a3b8" />
        <polygon points="9,0 4,-3 4,3" fill="#94a3b8" />
        <circle cx={0} cy={0} r={2.5} fill="#38bdf8" />
      </g>

      {/* Bottom Relay Output LED Strip */}
      <g transform={`translate(${cx - 42}, ${height - 39})`}>
        {['q1', 'q2', 'q3', 'q4'].map((qKey, idx) => {
          const active = !!(outputs as Record<string, boolean>)[qKey];
          return (
            <g key={qKey} transform={`translate(${idx * 24}, 0)`}>
              <rect x={0} y={0} width={16} height={6} rx={1.5} fill={active ? '#f59e0b' : '#334155'} stroke="#0f172a" strokeWidth={0.6} />
            </g>
          );
        })}
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
