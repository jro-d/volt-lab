import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface RoyuModularComboProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RoyuModularComboPlateDevice: React.FC<RoyuModularComboProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isRearView = device.state.viewMode === 'rear';
  const isSwitch1Closed = device.state.switchClosed !== false && device.state.closed !== false;
  const isSwitch2Closed = !!device.state.switch2Closed;
  const isSlot2Pilot = device.state.comboSlot2 !== 'switch2';
  const isPilotLit = !!device.state.pilotLit;
  const isReceptaclePowered = !!device.state.receptaclePowered;

  const handleToggleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.viewMode = isRearView ? 'front' : 'rear';
    if (onToggleState) onToggleState(device);
  };

  const handleToggleSwitch1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playSwitchClick();
    const next = !isSwitch1Closed;
    device.state.switchClosed = next;
    device.state.closed = next;
    if (onToggleState) onToggleState(device);
  };

  const handleToggleSwitch2 = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playSwitchClick();
    device.state.switch2Closed = !device.state.switch2Closed;
    if (onToggleState) onToggleState(device);
  };

  const handleToggleSlot2Mode = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.comboSlot2 = isSlot2Pilot ? 'switch2' : 'pilot';
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* Glossy White Faceplate Gradient */}
        <linearGradient id={`plateGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Rocker Switch Bevel Gradient */}
        <linearGradient id={`rockerGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Rear Metal Mounting Strap */}
        <linearGradient id={`strapGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* ROYU Blue Module Housing */}
        <linearGradient id={`royuModuleBlue_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        {/* ROYU Green Module Housing */}
        <linearGradient id={`royuModuleGreen_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        {/* Neon Glow Filter */}
        <filter id={`neonGlow_${device.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Plate Drop Shadow */}
      <rect
        x={2}
        y={4}
        width={width}
        height={height}
        rx={8}
        fill="#000000"
        opacity={0.16}
      />

      {!isRearView ? (
        /* FRONT VIEW: ROYU Wide-Series Faceplate */
        <g>
          {/* Main Faceplate Base */}
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={8}
            fill={`url(#plateGrad_${device.id})`}
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />

          {/* Recessed Modular Bezel Frame */}
          <rect
            x={8}
            y={12}
            width={width - 16}
            height={height - 24}
            rx={4}
            fill="#f1f5f9"
            stroke="#e2e8f0"
            strokeWidth={1}
          />

          {/* --- SLOT 1 (TOP): 1-Way Wide Rocker Switch --- */}
          <g
            transform={`translate(12, 16)`}
            className="cursor-pointer group"
            onClick={handleToggleSwitch1}
          >
            {/* Rocker Well */}
            <rect x={0} y={0} width={width - 24} height={28} rx={3} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
            {/* Rocker Paddle */}
            <rect
              x={2}
              y={isSwitch1Closed ? 2 : 4}
              width={width - 28}
              height={24}
              rx={2}
              fill={`url(#rockerGrad_${device.id})`}
              stroke="#94a3b8"
              strokeWidth={0.8}
              className="transition-all duration-100 group-hover:brightness-105"
            />
            {/* Tactile Rocker Ridge / Indicator Pip */}
            <circle
              cx={(width - 24) / 2}
              cy={isSwitch1Closed ? 8 : 20}
              r={2}
              fill={isSwitch1Closed ? '#f97316' : '#94a3b8'}
            />
            <text
              x={(width - 24) / 2}
              y={isSwitch1Closed ? 20 : 12}
              textAnchor="middle"
              fontSize={6}
              fontWeight="bold"
              fill="#64748b"
            >
              {isSwitch1Closed ? 'ON' : 'OFF'}
            </text>
          </g>

          {/* --- SLOT 2 (MIDDLE): Neon Pilot Indicator OR 2nd Switch --- */}
          {isSlot2Pilot ? (
            <g transform={`translate(12, 48)`}>
              {/* Pilot Jewel Bezel */}
              <rect x={0} y={0} width={width - 24} height={24} rx={3} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={0.8} />
              {/* Neon Lens Jewel */}
              <circle
                cx={(width - 24) / 2}
                cy={12}
                r={7}
                fill={isPilotLit ? '#ef4444' : '#7f1d1d'}
                stroke="#b91c1c"
                strokeWidth={1}
                filter={isPilotLit ? `url(#neonGlow_${device.id})` : undefined}
                className="transition-all duration-200"
              />
              {/* Neon Internal Electrodes */}
              {isPilotLit && (
                <>
                  <circle cx={(width - 24) / 2} cy={12} r={3} fill="#fef08a" />
                  <circle cx={(width - 24) / 2} cy={12} r={12} fill="#ef4444" opacity={0.25} className="animate-pulse" />
                </>
              )}
              <text
                x={(width - 24) / 2}
                y={22}
                textAnchor="middle"
                fontSize={5}
                fontWeight="900"
                fontFamily="sans-serif"
                fill={isPilotLit ? '#dc2626' : '#94a3b8'}
                letterSpacing="0.5px"
              >
                PILOT {isPilotLit ? '• LIVE' : ''}
              </text>
            </g>
          ) : (
            <g
              transform={`translate(12, 48)`}
              className="cursor-pointer group"
              onClick={handleToggleSwitch2}
            >
              <rect x={0} y={0} width={width - 24} height={24} rx={3} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
              <rect
                x={2}
                y={isSwitch2Closed ? 2 : 4}
                width={width - 28}
                height={20}
                rx={2}
                fill={`url(#rockerGrad_${device.id})`}
                stroke="#94a3b8"
                strokeWidth={0.8}
                className="transition-all duration-100 group-hover:brightness-105"
              />
              <circle
                cx={(width - 24) / 2}
                cy={isSwitch2Closed ? 8 : 16}
                r={1.8}
                fill={isSwitch2Closed ? '#f97316' : '#94a3b8'}
              />
              <text
                x={(width - 24) / 2}
                y={isSwitch2Closed ? 18 : 11}
                textAnchor="middle"
                fontSize={5.5}
                fontWeight="bold"
                fill="#64748b"
              >
                {isSwitch2Closed ? 'SW2 ON' : 'SW2 OFF'}
              </text>
            </g>
          )}

          {/* --- SLOT 3 (BOTTOM): Universal 3-Prong Receptacle --- */}
          <g transform={`translate(12, 76)`}>
            <rect x={0} y={0} width={width - 24} height={36} rx={3} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.8} />
            
            {/* Live Indicator Halo on Receptacle */}
            {isReceptaclePowered && (
              <rect x={2} y={2} width={width - 28} height={32} rx={2} fill="#dbeafe" opacity={0.4} />
            )}

            {/* Left Slot (Neutral / Long Flat Blade + Round Hole) */}
            <rect x={14} y={8} width={3} height={10} rx={0.8} fill="#1e293b" />
            <circle cx={15.5} cy={13} r={2.5} fill="#1e293b" />

            {/* Right Slot (Line / Short Flat Blade + Round Hole) */}
            <rect x={width - 41} y={9} width={3} height={8} rx={0.8} fill="#1e293b" />
            <circle cx={width - 39.5} cy={13} r={2.5} fill="#1e293b" />

            {/* Bottom Ground U-Slot */}
            <path
              d={`M ${(width - 24) / 2 - 2.5} 25 A 3 3 0 0 1 ${(width - 24) / 2 + 2.5} 25 L ${(width - 24) / 2 + 2.5} 29 L ${(width - 24) / 2 - 2.5} 29 Z`}
              fill="#1e293b"
            />

            {/* Inscribed Rating */}
            <text
              x={(width - 24) / 2}
              y={34}
              textAnchor="middle"
              fontSize={4.5}
              fontWeight="bold"
              fill={isReceptaclePowered ? '#2563eb' : '#94a3b8'}
            >
              {isReceptaclePowered ? '⚡ 230V LIVE' : '16A 250V~'}
            </text>
          </g>

          {/* ROYU Brand Inscription on Faceplate Bottom */}
          <text
            x={width / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize={5.5}
            fontWeight="900"
            fontFamily="sans-serif"
            fill="#94a3b8"
            letterSpacing="0.8px"
          >
            ROYU WIDE SERIES
          </text>
        </g>
      ) : (
        /* REAR VIEW: Galvanized Strap & Snap-In Module Wiring Blocks */
        <g>
          {/* Metal Galvanized Mounting Strap Frame */}
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={6}
            fill={`url(#strapGrad_${device.id})`}
            stroke="#475569"
            strokeWidth={1.5}
          />

          {/* Top & Bottom Mounting Screw Slots */}
          <rect x={width / 2 - 4} y={3} width={8} height={5} rx={2} fill="#334155" />
          <rect x={width / 2 - 4} y={height - 8} width={8} height={5} rx={2} fill="#334155" />

          {/* Module 1 (Switch): ROYU Blue Thermoplastic Housing */}
          <rect
            x={8}
            y={12}
            width={width - 16}
            height={32}
            rx={3}
            fill={`url(#royuModuleBlue_${device.id})`}
            stroke="#172554"
            strokeWidth={1}
          />
          <text x={width / 2} y={22} textAnchor="middle" fontSize={5} fontWeight="bold" fill="#bfdbfe">
            ROYU SW1 (16A 250V~)
          </text>

          {/* Module 2 (Pilot or Switch 2): ROYU Red/Blue Housing */}
          <rect
            x={8}
            y={48}
            width={width - 16}
            height={32}
            rx={3}
            fill={isSlot2Pilot ? '#7f1d1d' : `url(#royuModuleBlue_${device.id})`}
            stroke={isSlot2Pilot ? '#450a0a' : '#172554'}
            strokeWidth={1}
          />
          <text x={width / 2} y={58} textAnchor="middle" fontSize={5} fontWeight="bold" fill={isSlot2Pilot ? '#fecaca' : '#bfdbfe'}>
            {isSlot2Pilot ? 'ROYU NEON PILOT (230V)' : 'ROYU SW2 (16A 250V~)'}
          </text>

          {/* Module 3 (Receptacle): ROYU Green Thermoplastic Housing */}
          <rect
            x={8}
            y={84}
            width={width - 16}
            height={38}
            rx={3}
            fill={`url(#royuModuleGreen_${device.id})`}
            stroke="#022c22"
            strokeWidth={1}
          />
          <text x={width / 2} y={94} textAnchor="middle" fontSize={5} fontWeight="bold" fill="#a7f3d0">
            ROYU OUTLET (16A + PE)
          </text>

          {/* Educational Jumper Tip on Strap */}
          <text x={width / 2} y={height - 10} textAnchor="middle" fontSize={4.2} fontWeight="bold" fill="#0f172a">
            PEC 3.14 • Jumper L across modules
          </text>
        </g>
      )}

      {/* View Toggle Badge (🔄 Front / Rear) */}
      <g
        transform={`translate(${width - 4}, -4)`}
        className="cursor-pointer group"
        onClick={handleToggleView}
      >
        <rect
          x={-42}
          y={-10}
          width={46}
          height={14}
          rx={7}
          fill={isRearView ? '#10b981' : '#3b82f6'}
          stroke="#ffffff"
          strokeWidth={1}
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
          className="transition-all hover:scale-105"
        />
        <text
          x={-19}
          y={0}
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#ffffff"
        >
          {isRearView ? '🔄 Front' : '🔄 Rear'}
        </text>
      </g>

      {/* Slot 2 Module Mode Badge Toggle (Only in Rear View) */}
      {isRearView && (
        <g
          transform={`translate(4, -4)`}
          className="cursor-pointer group"
          onClick={handleToggleSlot2Mode}
        >
          <rect
            x={0}
            y={-10}
            width={48}
            height={14}
            rx={7}
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth={1}
            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
            className="transition-all hover:scale-105"
          />
          <text
            x={24}
            y={0}
            textAnchor="middle"
            fontSize={5.5}
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#ffffff"
          >
            {isSlot2Pilot ? '🔴 Pilot' : '⚡ 2nd SW'}
          </text>
        </g>
      )}

      {/* Terminals (Only active/visible in REAR VIEW or when connecting wires) */}
      {device.terminals.map((t) => {
        // In front view, render faint hints so students know terminals exist or can connect
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
