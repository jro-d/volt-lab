import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface ContactorDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const ContactorDevice: React.FC<ContactorDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isClosed = !!(device.state.coilEnergized || device.state.closed);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      onToggleState({
        ...device,
        state: {
          ...device.state,
          closed: !isClosed,
          coilEnergized: !isClosed,
        }
      });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      {/* Contactor Main Body Frame */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill="#f1f5f9"
        stroke="#94a3b8"
        strokeWidth={1.5}
        filter="drop-shadow(0 6px 14px rgba(0,0,0,0.12))"
      />

      {/* Recessed Center Dark Section */}
      <rect
        x={x + 24}
        y={y + 18}
        width={width - 28}
        height={height - 36}
        rx={4}
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth={1.2}
      />

      {/* Auxiliary Contact Block Housing on Left */}
      <rect
        x={x + 4}
        y={y + 36}
        width={18}
        height={54}
        rx={3}
        fill="#334155"
        stroke="#1e293b"
        strokeWidth={1}
      />
      <text x={x + 13} y={y + 64} textAnchor="middle" fontSize="5" fontWeight="bold" fill="#38bdf8" transform={`rotate(-90, ${x + 13}, ${y + 64})`}>
        AUX NO
      </text>

      {/* Vent Louvers for Arc Chute Coolant */}
      {[24, 30, 36].map((vy, i) => (
        <line key={i} x1={x + 32} y1={y + vy} x2={x + width - 12} y2={y + vy} stroke="#334155" strokeWidth={1.2} strokeLinecap="round" />
      ))}

      {/* Central Moving Armature Plunger Window */}
      <g
        transform={`translate(${x + 30 + (width - 40) / 2}, ${y + height / 2})`}
        onClick={handleToggle}
        className="cursor-pointer hover:brightness-110"
      >
        <title>Manual Test Plunger (Click to manually pull-in contactor)</title>
        <rect x="-14" y="-12" width="28" height="24" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1" />
        {/* Moving Orange Indicator Tab */}
        <rect
          x="-11"
          y={isClosed ? "-5" : "-10"}
          width="22"
          height="14"
          rx="2"
          fill={isClosed ? "#f97316" : "#64748b"}
          stroke={isClosed ? "#c2410c" : "#334155"}
          strokeWidth="1"
          className="transition-all duration-150"
        />
        <text x="0" y={isClosed ? "4" : "-1"} textAnchor="middle" fontSize="6" fontWeight="900" fill="#ffffff">
          {isClosed ? "I (ON)" : "0 (OFF)"}
        </text>
      </g>

      {/* Contactor Rating & Brand Nameplate */}
      <text x={x + 32 + (width - 40) / 2} y={y + height - 26} textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" fill="#f8fafc">
        3P CONTACTOR
      </text>
      <text x={x + 32 + (width - 40) / 2} y={y + height - 20} textAnchor="middle" fontSize="5" fontWeight="bold" fontFamily="monospace" fill="#38bdf8">
        KM1 • 25A 7.5kW AC-3
      </text>

      {/* Status LED / Indicator Dot */}
      <circle
        cx={x + 13}
        cy={y + 26}
        r={3.5}
        fill={isClosed ? "#22c55e" : "#475569"}
        stroke="#0f172a"
        strokeWidth={0.8}
      />
      {isClosed && (
        <circle cx={x + 13} cy={y + 26} r={6} fill="#22c55e" opacity={0.4} className="animate-ping" />
      )}

      {/* Terminals */}
      {device.terminals.map((terminal) => {
        const tx = x + width * terminal.relX;
        const ty = y + height * terminal.relY;
        const termKey = `${device.id}:${terminal.id}`;

        return (
          <g key={terminal.id}>
            <TerminalPoint
              terminal={terminal}
              x={tx}
              y={ty}
              isHovered={hoveredTerminalId === termKey}
              isSelected={selectedTerminalId === termKey}
              onMouseDown={(e) => onTerminalMouseDown(device, terminal, e)}
              onMouseEnter={() => setHoveredTerminalId(termKey)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
            {/* Terminal Label */}
            <text
              x={tx}
              y={terminal.relY < 0.3 ? ty + 12 : terminal.relY > 0.7 ? ty - 8 : ty - 7}
              textAnchor="middle"
              fontSize="5.5"
              fontWeight="bold"
              fontFamily="monospace"
              fill={terminal.id.includes('a') ? '#c084fc' : terminal.id.includes('no') ? '#34d399' : '#64748b'}
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
