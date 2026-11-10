import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface ApplianceProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const ApplianceDevice: React.FC<ApplianceProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isTv = device.type === 'appliance_tv';
  const isFan = device.type === 'appliance_fan';
  const isAc = device.type === 'appliance_ac';
  const isPowered = !!device.state.powered;

  const toggleEarthFault = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.hasEarthFault = !device.state.hasEarthFault;
    if (onToggleState) onToggleState(device);
  };

  // --- ELECTRIC FAN WITH ROTATING BLADES ---
  if (isFan) {
    const hubX = width / 2;
    const hubY = 38;
    const cageR = 30;

    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <defs>
          <linearGradient id={`fanGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {/* Base Drop Shadow */}
        <ellipse cx={hubX + 2} cy={height - 20} rx={28} ry={10} fill="#000000" opacity={0.12} />

        {/* Fan Pedestal Base */}
        <ellipse cx={hubX} cy={height - 22} rx={28} ry={10} fill="url(#fanGrad_${device.id})" stroke="#94a3b8" strokeWidth={1.2} />
        <ellipse cx={hubX} cy={height - 24} rx={22} ry={7} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />

        {/* Speed Buttons on Base */}
        <circle cx={hubX - 12} cy={height - 24} r={2.5} fill="#64748b" />
        <circle cx={hubX - 4} cy={height - 24} r={2.5} fill="#64748b" />
        <circle cx={hubX + 4} cy={height - 24} r={2.5} fill="#0284c7" />
        <circle cx={hubX + 12} cy={height - 24} r={2.5} fill={isPowered ? '#22c55e' : '#ef4444'} />

        {/* Telescopic Stem Pole */}
        <rect x={hubX - 4} y={hubY + cageR - 6} width={8} height={height - 54} fill="#64748b" stroke="#475569" strokeWidth={0.8} />
        <rect x={hubX - 3} y={hubY + cageR} width={6} height={10} fill="#94a3b8" />

        {/* Motor Housing Capsule */}
        <rect x={hubX - 12} y={hubY - 10} width={24} height={20} rx={6} fill="#334155" stroke="#1e293b" strokeWidth={1} />

        {/* Rear Wire Cage Ring */}
        <circle cx={hubX} cy={hubY} r={cageR} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} />
        {/* Wire Cage Spokes */}
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <line
            key={deg}
            x1={hubX - cageR * Math.cos((deg * Math.PI) / 180)}
            y1={hubY - cageR * Math.sin((deg * Math.PI) / 180)}
            x2={hubX + cageR * Math.cos((deg * Math.PI) / 180)}
            y2={hubY + cageR * Math.sin((deg * Math.PI) / 180)}
            stroke="#cbd5e1"
            strokeWidth={0.8}
          />
        ))}

        {/* ROTATING FAN ROTOR BLADES */}
        <g transform={`translate(${hubX}, ${hubY})`}>
          <g>
            {isPowered && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="0.22s"
                repeatCount="indefinite"
              />
            )}
            {/* 3 Aerodynamic Blue Translucent Blades */}
            {[0, 120, 240].map((rot) => (
              <g key={rot} transform={`rotate(${rot})`}>
                <path
                  d="M 0 0 C 8 -10, 18 -18, 5 -27 C -8 -25, -12 -12, 0 0 Z"
                  fill="#0ea5e9"
                  opacity={isPowered ? 0.75 : 0.88}
                  stroke="#0284c7"
                  strokeWidth={0.8}
                />
              </g>
            ))}
            {/* Blade Center Nut */}
            <circle cx="0" cy="0" r="5.5" fill="#0369a1" stroke="#ffffff" strokeWidth={1} />
          </g>
        </g>

        {/* Front Grill Center Badge */}
        <circle cx={hubX} cy={hubY} r={8} fill="#ffffff" stroke="#0284c7" strokeWidth={1.2} />
        <circle cx={hubX} cy={hubY} r={cageR} fill="none" stroke="#64748b" strokeWidth={1.5} />
        <text x={hubX} y={hubY + 2.5} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#0284c7">
          FAN
        </text>

        {/* Operating status badge */}
        {isPowered && (
          <g transform={`translate(${hubX - 22}, 2)`}>
            <rect x="0" y="0" width="44" height="11" rx="3" fill="#059669" opacity={0.9} />
            <text x="22" y="8" textAnchor="middle" fontSize={6.5} fontWeight="bold" fill="#ffffff" letterSpacing="0.5">
              SPINNING 65W
            </text>
          </g>
        )}

        {/* Terminals */}
        {device.terminals.map((t) => {
          const tx = width * t.relX;
          const ty = height * t.relY;
          const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
          const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

          return (
            <TerminalPoint
              key={t.id}
              terminal={t}
              x={tx}
              y={ty}
              isHovered={isHovered}
              isSelected={isSelected}
              onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
              onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
          );
        })}
      </g>
    );
  }

  // --- AIR CONDITIONER (1.5 HP INVERTER INDOOR UNIT) ---
  if (isAc) {
    const isPowered = !!device.state.powered;

    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <defs>
          <linearGradient id={`acBody_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id={`acAirGlow_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {/* Drop Shadow */}
        <rect x={2} y={3} width={width} height={height - 18} rx={6} fill="#000000" opacity={0.12} />

        {/* AC Main Casing */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height - 18}
          rx={6}
          fill={`url(#acBody_${device.id})`}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />

        {/* Top Intake Air Louvers */}
        <g stroke="#cbd5e1" strokeWidth={1}>
          <line x1={12} y1={8} x2={width - 12} y2={8} />
          <line x1={12} y1={12} x2={width - 12} y2={12} />
          <line x1={12} y1={16} x2={width - 12} y2={16} />
        </g>

        {/* Inverter Badge */}
        <rect x={12} y={24} width={38} height={11} rx={2} fill="#0f172a" />
        <text x={31} y={32} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#38bdf8" letterSpacing="0.5">
          INVERTER 1.5HP
        </text>

        {/* Front Panel Seam Line */}
        <line x1={0} y1={38} x2={width} y2={38} stroke="#cbd5e1" strokeWidth={0.8} />

        {/* Digital LED Display (Right side of panel) */}
        <rect
          x={width - 48}
          y={22}
          width={38}
          height={14}
          rx={3}
          fill={isPowered ? '#020617' : '#e2e8f0'}
          stroke="#94a3b8"
          strokeWidth={0.8}
        />
        {isPowered ? (
          <g>
            <text
              x={width - 36}
              y={32.5}
              fontSize={8.5}
              fontWeight="900"
              fontFamily="monospace"
              fill="#38bdf8"
              className="drop-shadow-[0_0_4px_rgba(56,189,248,0.8)]"
            >
              16°C
            </text>
            <text x={width - 14} y={32.5} fontSize={5.5} fontWeight="bold" fill="#22c55e">
              COOL
            </text>
          </g>
        ) : (
          <text x={width - 29} y={31.5} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#94a3b8">
            OFF
          </text>
        )}

        {/* Status Indicator LEDs */}
        <circle cx={width - 16} cy={44} r={1.5} fill={isPowered ? '#22c55e' : '#64748b'} />
        <circle cx={width - 22} cy={44} r={1.5} fill={isPowered ? '#38bdf8' : '#64748b'} />
        <circle cx={width - 28} cy={44} r={1.5} fill="#64748b" />

        {/* Motorized Bottom Air Discharge Louver */}
        {isPowered ? (
          <g>
            {/* Air flow glow projection downward */}
            <path
              d={`M 14 ${height - 20} L ${width - 14} ${height - 20} L ${width - 6} ${height - 4} L 6 ${height - 4} Z`}
              fill={`url(#acAirGlow_${device.id})`}
            />
            {/* Opened louver flap */}
            <rect
              x={10}
              y={height - 21}
              width={width - 20}
              height={5}
              rx={1.5}
              fill="#64748b"
              stroke="#334155"
              strokeWidth={0.8}
            />
          </g>
        ) : (
          /* Closed flush flap */
          <rect
            x={10}
            y={height - 22}
            width={width - 20}
            height={4}
            rx={1}
            fill="#e2e8f0"
            stroke="#cbd5e1"
            strokeWidth={0.8}
          />
        )}

        {/* Terminals */}
        {device.terminals.map((t) => {
          const tx = width * t.relX;
          const ty = height * t.relY;
          const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
          const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

          return (
            <TerminalPoint
              key={t.id}
              terminal={t}
              x={tx}
              y={ty}
              isHovered={isHovered}
              isSelected={isSelected}
              onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
              onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
          );
        })}
      </g>
    );
  }

  if (isTv) {
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        {/* Drop Shadow */}
        <rect
          x={2}
          y={3}
          width={width}
          height={height - 14}
          rx={3}
          fill="#000000"
          opacity={0.12}
        />

        {/* TV Screen Bezel (Brushed Dark Slate) */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height - 14}
          rx={3}
          fill="#0f172a"
          stroke="#334155"
          strokeWidth={1.5}
        />

        {/* TV Screen Glass */}
        <rect
          x={4}
          y={4}
          width={width - 8}
          height={height - 22}
          rx={2}
          fill={isPowered ? '#0284c7' : '#020617'}
          stroke="#1e293b"
          strokeWidth={0.8}
        />

        {/* Screen Content when powered */}
        {isPowered && (
          <g>
            <circle cx={width / 2} cy={(height - 22) / 2} r={12} fill="#38bdf8" opacity={0.7} />
            <polygon points={`${width / 2 - 4},${(height - 22) / 2 - 6} ${width / 2 + 6},${(height - 22) / 2} ${width / 2 - 4},${(height - 22) / 2 + 6}`} fill="#ffffff" />
            <text x={width / 2} y={height - 25} textAnchor="middle" fontSize={7} fill="#ffffff" fontWeight="bold">SMART 4K TV</text>
          </g>
        )}

        {/* TV Pedestal Stand */}
        <rect x={width / 2 - 4} y={height - 14} width={8} height={10} fill="#64748b" />
        <rect x={width / 2 - 22} y={height - 5} width={44} height={5} rx={1.5} fill="#1e293b" stroke="#475569" strokeWidth={0.8} />

        {/* Power LED Indicator */}
        <circle cx={width - 8} cy={height - 16} r={1.8} fill={isPowered ? '#22c55e' : '#ef4444'} />

        {/* Power Cord Plug Terminal */}
        {device.terminals.map((t) => {
          const tx = width * t.relX;
          const ty = height * t.relY;
          const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
          const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

          return (
            <TerminalPoint
              key={t.id}
              terminal={t}
              x={tx}
              y={ty}
              isHovered={isHovered}
              isSelected={isSelected}
              onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
              onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
          );
        })}
      </g>
    );
  }

  // Water Heater unit
  const hasFault = !!device.state.hasEarthFault;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`heaterBody_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Drop Shadow */}
      <rect
        x={2}
        y={3}
        width={width}
        height={height - 14}
        rx={8}
        fill="#000000"
        opacity={0.12}
      />

      {/* Water Heater White ABS Casing */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height - 14}
        rx={8}
        fill={`url(#heaterBody_${device.id})`}
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />

      {/* Brand Header Banner */}
      <rect x={10} y={10} width={width - 20} height={18} rx={3} fill="#0284c7" />
      <text x={width / 2} y={22} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#ffffff">
        SHOWER 3.5kW
      </text>

      {/* Temperature Control Dial */}
      <circle cx={width / 2} cy={48} r={16} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
      <circle cx={width / 2} cy={48} r={12} fill="#0f172a" />
      <line x1={width / 2} y1={40} x2={width / 2} y2={44} stroke="#ef4444" strokeWidth={2.5} />

      {/* Heating Status LED */}
      <circle cx={25} cy={75} r={3} fill={isPowered ? '#ef4444' : '#64748b'} className={isPowered ? 'animate-ping' : ''} />
      <circle cx={25} cy={75} r={3} fill={isPowered ? '#ef4444' : '#64748b'} />
      <text x={33} y={77} fontSize={7} fill="#334155" fontWeight="bold">HEATER</text>

      {/* Interactive Fault Injector Button */}
      <g
        onClick={toggleEarthFault}
        className="cursor-pointer group"
        transform={`translate(${width - 48}, 68)`}
      >
        <rect
          x={0}
          y={0}
          width={42}
          height={16}
          rx={3}
          fill={hasFault ? '#dc2626' : '#64748b'}
          className="transition-colors group-hover:brightness-110 shadow-sm"
        />
        <text x={21} y={11} textAnchor="middle" fontSize={6.5} fontWeight="bold" fill="#ffffff">
          {hasFault ? 'FAULT ON' : 'SIM FAULT'}
        </text>
      </g>

      {/* Terminals */}
      {device.terminals.map((t) => {
        const tx = width * t.relX;
        const ty = height * t.relY;
        const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
        const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={tx}
            y={ty}
            isHovered={isHovered}
            isSelected={isSelected}
            onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
            onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
            onMouseLeave={() => setHoveredTerminalId(null)}
          />
        );
      })}
    </g>
  );
};
