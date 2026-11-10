import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface McbProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const McbDevice: React.FC<McbProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 16;
  const curve = device.state.tripCurve || 'C';
  const is2P = device.type === 'mcb_2p';
  const isIndustrial = is2P && device.state.mccbStyle === 'industrial_black';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTripped) {
      sound.playBreakerSnap();
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      sound.playBreakerSnap();
      device.state.closed = !device.state.closed;
    }
    if (onToggleState) onToggleState(device);
  };

  const handleToggleStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.mccbStyle = isIndustrial ? 'din_rail' : 'industrial_black';
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* DIN Rail Metallic Zinc Gradient */}
        <linearGradient id={`dinRail_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="25%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Breaker Molded Shell Gradient */}
        <linearGradient id={`mcbShell_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="25%" stopColor="#f1f5f9" />
          <stop offset="75%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Industrial Black Bakelite Shell Gradient */}
        <linearGradient id={`mcbBlackShell_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="35%" stopColor="#18181b" />
          <stop offset="70%" stopColor="#09090b" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>

        {/* Escutcheon Stepped Front Plate */}
        <linearGradient id={`mcbFace_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>

        {/* Dark Escutcheon Front Plate */}
        <linearGradient id={`mcbDarkFace_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>

        {/* Toggle 3D Handle */}
        <linearGradient id={`toggleGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="40%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Industrial White Toggle Handle */}
        <linearGradient id={`whiteToggleGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f4f4f5" />
          <stop offset="100%" stopColor="#d4d4d8" />
        </linearGradient>
      </defs>

      {/* 1. DIN Rail (Only for standard DIN-rail breakers) */}
      {!isIndustrial && (
        <>
          <rect
            x={-10}
            y={height / 2 - 18}
            width={width + 20}
            height={36}
            fill={`url(#dinRail_${device.id})`}
            stroke="#475569"
            strokeWidth={1}
          />
          <line x1={-10} y1={height / 2 - 10} x2={width + 10} y2={height / 2 - 10} stroke="#cbd5e1" strokeWidth={1} />
          <line x1={-10} y1={height / 2 + 10} x2={width + 10} y2={height / 2 + 10} stroke="#64748b" strokeWidth={1} />
          {[-4, width / 2, width + 4].map((sx, i) => (
            <rect key={i} x={sx - 3} y={height / 2 - 4} width={6} height={8} rx={2} fill="#334155" opacity={0.6} />
          ))}
        </>
      )}

      {/* 2. Breaker Body Drop Shadow */}
      <rect
        x={2}
        y={3}
        width={width}
        height={height}
        rx={isIndustrial ? 3 : 5}
        fill="#000000"
        opacity={0.16}
      />

      {/* 3. Main Enclosure Body */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={isIndustrial ? 3 : 5}
        fill={isIndustrial ? `url(#mcbBlackShell_${device.id})` : `url(#mcbShell_${device.id})`}
        stroke={isIndustrial ? '#09090b' : '#94a3b8'}
        strokeWidth={1.5}
      />

      {/* Side Molding Vents or Molded Ribs */}
      {[22, 30, 80, 88].map((vy, i) => (
        <line
          key={i}
          x1={3}
          y1={vy}
          x2={width * 0.15}
          y2={vy}
          stroke={isIndustrial ? '#3f3f46' : '#cbd5e1'}
          strokeWidth={1}
        />
      ))}

      {/* 4. Front Stepped Escutcheon Plate */}
      <rect
        x={width * 0.08}
        y={height * 0.18}
        width={width * 0.84}
        height={height * 0.64}
        rx={3}
        fill={isIndustrial ? `url(#mcbDarkFace_${device.id})` : `url(#mcbFace_${device.id})`}
        stroke={isIndustrial ? '#18181b' : '#cbd5e1'}
        strokeWidth={1}
      />

      {/* 5. Flag Indicator Window (Glassy Lens) */}
      <rect
        x={width / 2 - 12}
        y={height * 0.24}
        width={24}
        height={10}
        rx={2}
        fill={isClosed ? '#ef4444' : '#22c55e'}
        stroke="#475569"
        strokeWidth={0.8}
      />
      {/* Indicator Text */}
      <text
        x={width / 2}
        y={height * 0.24 + 7.5}
        textAnchor="middle"
        fontSize={6.5}
        fontWeight="bold"
        fill="#ffffff"
      >
        {isClosed ? 'ON' : 'OFF'}
      </text>

      {/* 6. Toggle Handle Recess Well */}
      <rect
        x={width / 2 - 14}
        y={height * 0.38}
        width={28}
        height={28}
        rx={2.5}
        fill="#09090b"
        stroke="#27272a"
        strokeWidth={1}
      />

      {/* 7. Interactive Toggle Handle Lever */}
      <g
        onClick={handleToggle}
        className="cursor-pointer group"
      >
        <rect
          x={width / 2 - 12}
          y={isClosed ? height * 0.39 : height * 0.49}
          width={24}
          height={16}
          rx={2.5}
          fill={isTripped ? '#dc2626' : isIndustrial ? `url(#whiteToggleGrad_${device.id})` : `url(#toggleGrad_${device.id})`}
          stroke={isIndustrial ? '#71717a' : '#475569'}
          strokeWidth={1}
          className="transition-all duration-100 group-hover:brightness-110"
        />
        {/* Tactile Grip Ridges on Lever */}
        {[4, 8, 12].map((oy) => (
          <line
            key={oy}
            x1={width / 2 - 8}
            y1={(isClosed ? height * 0.39 : height * 0.49) + oy}
            x2={width / 2 + 8}
            y2={(isClosed ? height * 0.39 : height * 0.49) + oy}
            stroke={isIndustrial ? '#a1a1aa' : '#94a3b8'}
            strokeWidth={0.8}
          />
        ))}
      </g>

      {/* 8. Breaker Rating & Engineering Markings */}
      <text
        x={width / 2}
        y={height * 0.72}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight="900"
        fontFamily="monospace"
        fill={isIndustrial ? '#ffffff' : '#0f172a'}
      >
        {curve}{ratedAmps}
      </text>

      {/* Inscription & Breaking Capacity */}
      <text
        x={width / 2}
        y={height * 0.78}
        textAnchor="middle"
        fontSize={6.5}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill={isIndustrial ? '#a1a1aa' : '#64748b'}
      >
        {is2P ? '2P 240V~ 10kA' : '230/400V~ 6kA'}
      </text>

      {/* Trip Warning Banner if Tripped */}
      {isTripped && (
        <g transform={`translate(${width / 2}, ${height * 0.50})`}>
          <rect x={-26} y={-7} width={52} height={14} rx={3} fill="#ef4444" stroke="#ffffff" strokeWidth={1} />
          <text x={0} y={3} textAnchor="middle" fontSize={6.5} fontWeight="bold" fill="#ffffff">
            TRIPPED
          </text>
        </g>
      )}

      {/* 2P Breaker Style Toggle Badge */}
      {is2P && (
        <g
          transform={`translate(${width - 4}, -4)`}
          className="cursor-pointer group"
          onClick={handleToggleStyle}
        >
          <rect
            x={-48}
            y={-10}
            width={52}
            height={14}
            rx={7}
            fill={isIndustrial ? '#18181b' : '#3b82f6'}
            stroke="#ffffff"
            strokeWidth={1}
            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
            className="transition-all hover:scale-105"
          />
          <text
            x={-22}
            y={0}
            textAnchor="middle"
            fontSize={6}
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#ffffff"
          >
            {isIndustrial ? '⚡ Industrial' : '⚪ DIN-Rail'}
          </text>
        </g>
      )}

      {/* Terminals (Screw Lugs) */}
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
