import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface IndustrialRelayDeviceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const IndustrialRelayDevice: React.FC<IndustrialRelayDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { x, y, width, height } = device;
  const isEnergized = !!device.state.coilEnergized;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleState) {
      onToggleState({
        ...device,
        state: {
          ...device.state,
          manualTest: !device.state.manualTest,
          coilEnergized: !device.state.coilEnergized,
        }
      });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      <defs>
        {/* Transparent Acrylic Glass Shading */}
        <linearGradient id="relayGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#bae6fd" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.30" />
        </linearGradient>

        {/* Copper Coil Bobbin */}
        <linearGradient id="copperCoil" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="25%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="75%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Silver Contacts */}
        <linearGradient id="silverContact" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* DIN Rail Socket Base */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth={1.5}
        filter="drop-shadow(0 4px 10px rgba(0,0,0,0.18))"
      />

      {/* DIN Rail Mounting Latch Ears */}
      <rect x={x - 4} y={y + 36} width={4} height={42} rx={1} fill="#475569" />
      <rect x={x + width} y={y + 36} width={4} height={42} rx={1} fill="#475569" />

      {/* Terminal Screw Blocks Background Top & Bottom */}
      <rect x={x + 3} y={y + 3} width={width - 6} height={18} rx={3} fill="#0f172a" />
      <rect x={x + 3} y={y + height - 21} width={width - 6} height={18} rx={3} fill="#0f172a" />

      {/* Clear Transparent Ice-Cube Relay Enclosure */}
      <rect
        x={x + 7}
        y={y + 22}
        width={width - 14}
        height={height - 44}
        rx={4}
        fill="url(#relayGlass)"
        stroke="#94a3b8"
        strokeWidth={1.2}
      />

      {/* Glass Corner Reflection Highlights */}
      <line x1={x + 10} y1={y + 26} x2={x + width - 10} y2={y + 26} stroke="#ffffff" strokeWidth={1} opacity={0.6} strokeLinecap="round" />
      <line x1={x + 10} y1={y + 26} x2={x + 10} y2={y + height - 26} stroke="#ffffff" strokeWidth={1} opacity={0.4} strokeLinecap="round" />

      {/* Internal Electromechanical Core: Copper Wire Coil Bobbin */}
      <g transform={`translate(${x + 16}, ${y + 32})`}>
        {/* Core Iron Cylinder */}
        <rect x="0" y="4" width="22" height="34" rx="2" fill="url(#copperCoil)" stroke="#451a03" strokeWidth="0.8" />
        {/* Copper Winding Strands */}
        {[8, 13, 18, 23, 28, 33].map((wy, idx) => (
          <line key={idx} x1="1" y1={wy} x2="21" y2={wy} stroke="#fef08a" strokeWidth="0.8" opacity="0.6" />
        ))}
        {/* Core Pole Piece */}
        <rect x="5" y="0" width="12" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
        <rect x="5" y="38" width="12" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
      </g>

      {/* Internal Contact Leaf Springs & Armature */}
      <g transform={`translate(${x + 44}, ${y + 32})`}>
        {/* Pole 1 & 2 Contact Blades */}
        <line x1="2" y1="4" x2="2" y2="38" stroke="url(#silverContact)" strokeWidth="1.8" />
        <line x1="14" y1="4" x2="14" y2="38" stroke="url(#silverContact)" strokeWidth="1.8" />

        {/* Movable Armature */}
        <path
          d={isEnergized ? "M 2 20 L 7 12 M 14 20 L 19 12" : "M 2 20 L -2 26 M 14 20 L 10 26"}
          stroke="#e2e8f0"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Silver Contact Buttons */}
        <circle cx={isEnergized ? 7 : -2} cy={isEnergized ? 12 : 26} r="2" fill="#f8fafc" stroke="#334155" strokeWidth="0.6" />
        <circle cx={isEnergized ? 19 : 10} cy={isEnergized ? 12 : 26} r="2" fill="#f8fafc" stroke="#334155" strokeWidth="0.6" />
      </g>

      {/* Coil Energized Status Indicator LED */}
      <g transform={`translate(${x + width / 2}, ${y + height - 30})`}>
        <circle r={4.5} fill={isEnergized ? "#22c55e" : "#334155"} stroke="#0f172a" strokeWidth={0.8} />
        {isEnergized && (
          <>
            <circle r={8} fill="#22c55e" opacity={0.4} className="animate-ping" />
            <circle r={2} fill="#ffffff" />
          </>
        )}
      </g>

      {/* Manual Test Push Button / Flag */}
      <g
        transform={`translate(${x + width / 2}, ${y + 26})`}
        onClick={handleToggle}
        className="cursor-pointer hover:brightness-125"
      >
        <title>Manual Test Push Button (Toggle Coil State)</title>
        <rect x="-8" y="-3" width="16" height="6" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
        <text x="0" y="2" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#ffffff">TEST</text>
      </g>

      {/* Relay Nameplate Label */}
      <text x={x + width / 2} y={y + 78} textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" fill="#f8fafc">
        DPDT RELAY
      </text>
      <text x={x + width / 2} y={y + 85} textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="monospace" fill={isEnergized ? "#4ade80" : "#94a3b8"}>
        {isEnergized ? "⚡ ENERGIZED" : "230VAC 10A"}
      </text>

      {/* Top & Bottom Terminal Connection Points */}
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
            {/* Terminal Pin Label */}
            <text
              x={tx}
              y={terminal.relY < 0.5 ? ty + 13 : ty - 8}
              textAnchor="middle"
              fontSize="6"
              fontWeight="bold"
              fontFamily="monospace"
              fill="#94a3b8"
            >
              {terminal.label || terminal.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
