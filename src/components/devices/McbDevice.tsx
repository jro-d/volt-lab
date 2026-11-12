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

const getRoyuHandleColor = (amps: number, isTripped: boolean) => {
  if (isTripped) return '#dc2626';
  if (amps <= 15) return '#3b82f6'; // 15A Blue
  if (amps <= 20) return '#ef4444'; // 20A Red
  if (amps <= 30) return '#10b981'; // 30A Green
  if (amps <= 40) return '#f97316'; // 40A Orange
  return '#ffffff'; // 60A+ White
};

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
  const is3P = device.type === 'mcb_3p';

  // Breaker profile: 'royu_bolt_on' | 'royu_din_rail' | 'generic_iec'
  const profile = device.state.breakerProfile || (device.state.mccbStyle === 'industrial_black' ? 'royu_bolt_on' : is2P ? 'royu_bolt_on' : 'royu_din_rail');
  const isBoltOn = profile === 'royu_bolt_on';
  const isRoyuDin = profile === 'royu_din_rail';
  const isGeneric = profile === 'generic_iec';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playBreakerSnap();
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    if (onToggleState) onToggleState(device);
  };

  const handleCycleProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    const cycle: Array<'royu_bolt_on' | 'royu_din_rail' | 'generic_iec'> = ['royu_bolt_on', 'royu_din_rail', 'generic_iec'];
    const next = cycle[(cycle.indexOf(profile) + 1) % cycle.length];
    device.state.breakerProfile = next;
    device.state.mccbStyle = next === 'royu_bolt_on' ? 'industrial_black' : 'din_rail';
    if (next === 'royu_bolt_on') {
      device.brand = 'ROYU';
      device.kaRating = 10;
      device.mountingType = 'bolt_on';
      device.modelNumber = is2P ? 'ROYU RCB220' : 'ROYU RCB120';
    } else if (next === 'royu_din_rail') {
      device.brand = 'ROYU';
      device.kaRating = 6;
      device.mountingType = 'din_rail';
      device.modelNumber = is2P ? 'ROYU RDM220' : 'ROYU RDM120';
    } else {
      device.brand = 'Generic';
      device.kaRating = 6;
      device.mountingType = 'din_rail';
      device.modelNumber = undefined;
    }
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

        {/* Breaker Molded Shell Gradient (White DIN) */}
        <linearGradient id={`mcbShell_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="25%" stopColor="#f1f5f9" />
          <stop offset="75%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Industrial Black Bakelite Shell Gradient (Bolt-On) */}
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

        {/* Copper Bolt-On Busbar Tab */}
        <linearGradient id={`copperLug_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Standard Dark Toggle Handle */}
        <linearGradient id={`toggleGrad_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="40%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* 1. DIN Rail (Only for DIN-rail breakers, not Bolt-On) */}
      {!isBoltOn && (
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
        rx={isBoltOn ? 3 : 5}
        fill="#000000"
        opacity={0.16}
      />

      {/* Bolt-On Busbar Copper Stabs (at top of breaker) */}
      {isBoltOn && (
        <g>
          {device.terminals
            .filter((t) => t.relY < 0.3)
            .map((t) => {
              const tx = width * t.relX;
              return (
                <g key={t.id} transform={`translate(${tx - 6}, -6)`}>
                  {/* Copper stab blade */}
                  <rect x={0} y={0} width={12} height={10} rx={1} fill={`url(#copperLug_${device.id})`} stroke="#78350f" strokeWidth={0.5} />
                  {/* Slotted hex bolt screw */}
                  <circle cx={6} cy={5} r={3} fill="#d4d4d8" stroke="#52525b" strokeWidth={0.5} />
                  <line x1={4} y1={5} x2={8} y2={5} stroke="#18181b" strokeWidth={0.8} />
                </g>
              );
            })}
        </g>
      )}

      {/* 3. Main Enclosure Body */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={isBoltOn ? 3 : 5}
        fill={isBoltOn ? `url(#mcbBlackShell_${device.id})` : `url(#mcbShell_${device.id})`}
        stroke={isBoltOn ? '#09090b' : '#94a3b8'}
        strokeWidth={1.5}
      />

      {/* ROYU DIN Distinctive Signature Blue/Red Diagonal Accent Stripe */}
      {isRoyuDin && (
        <g>
          <path d={`M 0 12 L 8 4 L 14 4 L 0 18 Z`} fill="#2563eb" />
          <path d={`M 0 18 L 14 4 L 18 4 L 0 22 Z`} fill="#ef4444" />
        </g>
      )}

      {/* Side Molding Vents or Molded Ribs */}
      {[22, 30, 80, 88].map((vy, i) => (
        <line
          key={i}
          x1={3}
          y1={vy}
          x2={width * 0.15}
          y2={vy}
          stroke={isBoltOn ? '#3f3f46' : '#cbd5e1'}
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
        fill={isBoltOn ? `url(#mcbDarkFace_${device.id})` : `url(#mcbFace_${device.id})`}
        stroke={isBoltOn ? '#18181b' : '#cbd5e1'}
        strokeWidth={1}
      />

      {/* Brand Badge on Front Face */}
      {isBoltOn && (
        <g transform={`translate(${width / 2}, ${height * 0.22})`}>
          <rect x={-20} y={-4} width={40} height={9} rx={1.5} fill="#dc2626" />
          <text x={0} y={3} textAnchor="middle" fontSize={6} fontWeight="900" fontFamily="sans-serif" fill="#ffffff" letterSpacing="0.8px">
            ROYU
          </text>
        </g>
      )}

      {isRoyuDin && (
        <g transform={`translate(${width / 2}, ${height * 0.22})`}>
          <text x={0} y={3} textAnchor="middle" fontSize={6} fontWeight="900" fontFamily="sans-serif" fill="#1e40af" letterSpacing="0.8px">
            ROYU
          </text>
        </g>
      )}

      {/* 5. Flag Indicator Window (Glassy Lens) */}
      <rect
        x={width / 2 - 12}
        y={height * 0.27}
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
        y={height * 0.27 + 7.5}
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
        y={height * 0.39}
        width={28}
        height={28}
        rx={2.5}
        fill="#09090b"
        stroke="#27272a"
        strokeWidth={1}
      />

      {/* 7. Interactive Toggle Handle Lever (Color-coded for ROYU Bolt-On) */}
      <g onClick={handleToggle} className="cursor-pointer group">
        <rect
          x={width / 2 - 12}
          y={isClosed ? height * 0.40 : height * 0.50}
          width={24}
          height={16}
          rx={2.5}
          fill={
            isTripped
              ? '#dc2626'
              : isBoltOn
              ? getRoyuHandleColor(ratedAmps, isTripped)
              : `url(#toggleGrad_${device.id})`
          }
          stroke={isBoltOn ? '#18181b' : '#475569'}
          strokeWidth={1}
          className="transition-all duration-100 group-hover:brightness-110"
        />
        {/* Ampere Number on Bolt-On Handle */}
        {isBoltOn && (
          <text
            x={width / 2}
            y={(isClosed ? height * 0.40 : height * 0.50) + 11}
            textAnchor="middle"
            fontSize={7.5}
            fontWeight="900"
            fontFamily="monospace"
            fill={ratedAmps <= 15 || ratedAmps === 20 || ratedAmps === 30 ? '#ffffff' : '#0f172a'}
          >
            {ratedAmps}
          </text>
        )}

        {/* Tactile Grip Ridges on Lever (DIN style) */}
        {!isBoltOn &&
          [4, 8, 12].map((oy) => (
            <line
              key={oy}
              x1={width / 2 - 8}
              y1={(isClosed ? height * 0.40 : height * 0.50) + oy}
              x2={width / 2 + 8}
              y2={(isClosed ? height * 0.40 : height * 0.50) + oy}
              stroke="#94a3b8"
              strokeWidth={0.8}
            />
          ))}
      </g>

      {/* 8. Breaker Rating & Engineering Markings */}
      <text
        x={width / 2}
        y={height * 0.72}
        textAnchor="middle"
        fontSize={10}
        fontWeight="900"
        fontFamily="monospace"
        fill={isBoltOn ? '#ffffff' : '#0f172a'}
      >
        {curve}{ratedAmps}
      </text>

      {/* Inscription & Breaking Capacity */}
      <text
        x={width / 2}
        y={height * 0.78}
        textAnchor="middle"
        fontSize={6}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill={isBoltOn ? '#a1a1aa' : '#64748b'}
      >
        {isBoltOn ? '10kA 240V~' : is3P ? '3P 400V~ 6kA' : is2P ? '2P 240V~ 6kA' : '230V~ 6kA'}
      </text>

      {/* Trip Warning Banner if Tripped */}
      {isTripped && (
        <g transform={`translate(${width / 2}, ${height * 0.51})`}>
          <rect x={-26} y={-7} width={52} height={14} rx={3} fill="#ef4444" stroke="#ffffff" strokeWidth={1} />
          <text x={0} y={3} textAnchor="middle" fontSize={6.5} fontWeight="bold" fill="#ffffff">
            TRIPPED
          </text>
        </g>
      )}

      {/* Breaker Profile Cycle Badge */}
      <g
        transform={`translate(${width - 4}, -4)`}
        className="cursor-pointer group"
        onClick={handleCycleProfile}
      >
        <rect
          x={-54}
          y={-10}
          width={58}
          height={14}
          rx={7}
          fill={isBoltOn ? '#b91c1c' : isRoyuDin ? '#2563eb' : '#64748b'}
          stroke="#ffffff"
          strokeWidth={1}
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
          className="transition-all hover:scale-105"
        />
        <text
          x={-25}
          y={0}
          textAnchor="middle"
          fontSize={5.8}
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#ffffff"
        >
          {isBoltOn ? '⚡ ROYU 10kA' : isRoyuDin ? '⚪ ROYU 6kA' : '⚙️ IEC DIN'}
        </text>
      </g>

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
