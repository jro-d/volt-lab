import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface McbDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const McbDevice: React.FC<McbDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 16;
  const curve = device.state.tripCurve || 'C';
  const is2P = device.type === 'mcb_2p' || device.type === 'service_disconnect_2p';
  const is3P = device.type === 'mcb_3p';
  const isServiceDisc = device.type === 'service_disconnect_2p';

  const profile: 'royu_bolt_on' | 'royu_din_rail' | 'generic_iec' =
    device.state.breakerProfile ||
    (device.state.mccbStyle === 'industrial_black'
      ? 'royu_bolt_on'
      : is2P && !isServiceDisc
        ? 'royu_bolt_on'
        : 'royu_din_rail');

  const isBoltOn = profile === 'royu_bolt_on';
  const isRoyuDin = profile === 'royu_din_rail';
  const poles = is3P ? 3 : is2P ? 2 : 1;

  const ampColors: Record<number, { fill: string; shade: string; text: string }> = {
    15: { fill: '#2563eb', shade: '#1e40af', text: '#ffffff' },
    20: { fill: '#dc2626', shade: '#991b1b', text: '#ffffff' },
    30: { fill: '#16a34a', shade: '#166534', text: '#ffffff' },
    40: { fill: '#ea580c', shade: '#9a3412', text: '#ffffff' },
    60: { fill: '#f1f5f9', shade: '#cbd5e1', text: '#0f172a' },
    63: { fill: '#f1f5f9', shade: '#cbd5e1', text: '#0f172a' },
  };
  const ampTone = ampColors[ratedAmps] || { fill: '#1e293b', shade: '#0f172a', text: '#f8fafc' };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    onToggleState?.(device);
  };

  const handleCycleStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: ('royu_bolt_on' | 'royu_din_rail' | 'generic_iec')[] = [
      'royu_bolt_on',
      'royu_din_rail',
      'generic_iec',
    ];
    const next = order[(order.indexOf(profile) + 1) % order.length];
    device.state.breakerProfile = next;
    device.state.mccbStyle = next === 'royu_bolt_on' ? 'industrial_black' : 'din_rail';
    onToggleState?.(device);
  };

  const handleManualTripTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.tripped = !device.state.tripped;
    if (device.state.tripped) {
      device.state.closed = false;
    }
    onToggleState?.(device);
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const poleWidth = (width - 14) / poles;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`shellDark-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2c3545" />
          <stop offset="50%" stopColor="#171d28" />
          <stop offset="100%" stopColor="#0b0f17" />
        </linearGradient>
        <linearGradient id={`shellLight-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#d5dde7" />
        </linearGradient>
        <linearGradient id={`dinClip-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id={`copperLug-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id={`handleGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isBoltOn ? ampTone.fill : '#334155'} />
          <stop offset="100%" stopColor={isBoltOn ? ampTone.shade : '#0f172a'} />
        </linearGradient>
      </defs>

      {/* Subtle Grounded Drop Shadow */}
      <rect x={2} y={3} width={width} height={height} rx={isBoltOn ? 6 : 8} fill="rgba(15, 23, 42, 0.24)" />

      {/* Bolt-On Copper Busbar Mounting Clip OR DIN-Rail Steel Clips */}
      {isBoltOn ? (
        <g>
          {/* Top Molded Copper Bus Stab Clips */}
          {Array.from({ length: poles }).map((_, idx) => {
            const cx = 7 + poleWidth * idx + poleWidth / 2;
            return (
              <g key={`stab-${idx}`}>
                <rect x={cx - 8} y={-5} width={16} height={7} rx={1.5} fill={`url(#copperLug-${uid})`} stroke="#78350f" strokeWidth={0.8} />
                <circle cx={cx} cy={-2} r={1.8} fill="#78350f" />
              </g>
            );
          })}
          {/* Side Phenolic Mounting Ears */}
          <rect x={-4} y={centerY - 12} width={5} height={24} rx={1.5} fill="#1f2937" stroke="#090d16" strokeWidth={0.8} />
          <rect x={width - 1} y={centerY - 12} width={5} height={24} rx={1.5} fill="#1f2937" stroke="#090d16" strokeWidth={0.8} />
        </g>
      ) : (
        <g>
          <rect x={-6} y={centerY - 13} width={9} height={26} rx={2} fill={`url(#dinClip-${uid})`} stroke="#64748b" strokeWidth={0.9} />
          <rect x={width - 3} y={centerY - 13} width={9} height={26} rx={2} fill={`url(#dinClip-${uid})`} stroke="#64748b" strokeWidth={0.9} />
          <rect x={centerX - 10} y={height - 2} width={20} height={6} rx={1.5} fill="#64748b" stroke="#334155" strokeWidth={0.8} />
        </g>
      )}

      {/* Main Molded Case Body */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={isBoltOn ? 6 : 8}
        fill={isBoltOn ? `url(#shellDark-${uid})` : `url(#shellLight-${uid})`}
        stroke={isBoltOn ? '#090d16' : '#94a3b8'}
        strokeWidth={1.6}
      />

      {/* Specular Bevel Highlight */}
      <rect
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        rx={isBoltOn ? 4.5 : 6.5}
        fill="none"
        stroke={isBoltOn ? 'rgba(255,255,255,0.1)' : '#ffffff'}
        strokeWidth={1}
      />

      {/* Pole Divider Seams & Finger-Safe Terminal Shrouds */}
      {Array.from({ length: poles }).map((_, idx) => {
        const px = 7 + poleWidth * idx;
        return (
          <g key={`pole-${idx}`}>
            {idx > 0 && (
              <line
                x1={px}
                y1={4}
                x2={px}
                y2={height - 4}
                stroke={isBoltOn ? '#090d16' : '#cbd5e1'}
                strokeWidth={1.2}
              />
            )}
            {/* Top terminal recessed well */}
            <rect
              x={px + 3}
              y={5}
              width={poleWidth - 6}
              height={24}
              rx={3}
              fill={isBoltOn ? '#0b0f17' : '#dce3ec'}
              stroke={isBoltOn ? '#334155' : '#b8c4d4'}
              strokeWidth={0.8}
            />
            {/* Bottom terminal recessed well */}
            <rect
              x={px + 3}
              y={height - 29}
              width={poleWidth - 6}
              height={24}
              rx={3}
              fill={isBoltOn ? '#0b0f17' : '#dce3ec'}
              stroke={isBoltOn ? '#334155' : '#b8c4d4'}
              strokeWidth={0.8}
            />
            {/* Terminal numbering */}
            <text
              x={px + poleWidth / 2}
              y={33.5}
              textAnchor="middle"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
              fill={isBoltOn ? '#94a3b8' : '#475569'}
            >
              {idx * 2 + 1}
            </text>
            <text
              x={px + poleWidth / 2}
              y={height - 31}
              textAnchor="middle"
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
              fill={isBoltOn ? '#94a3b8' : '#475569'}
            >
              {idx * 2 + 2}
            </text>
          </g>
        );
      })}

      {/* Arc-Chute Side Louvers */}
      {[-12, -4, 4, 12].map((dy) => (
        <g key={`louver-${dy}`}>
          <line
            x1={3}
            y1={centerY + dy}
            x2={6}
            y2={centerY + dy}
            stroke={isBoltOn ? '#475569' : '#94a3b8'}
            strokeWidth={1}
          />
          <line
            x1={width - 6}
            y1={centerY + dy}
            x2={width - 3}
            y2={centerY + dy}
            stroke={isBoltOn ? '#475569' : '#94a3b8'}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Raised Front Fascia / Escutcheon Plate */}
      <rect
        x={6}
        y={35}
        width={width - 12}
        height={height - 70}
        rx={4}
        fill={isBoltOn ? '#1e2532' : '#f8fafc'}
        stroke={isBoltOn ? '#3b475c' : '#cbd5e1'}
        strokeWidth={1}
      />

      {/* Brand & Rating Header */}
      {isBoltOn ? (
        <g>
          <rect x={10} y={38} width={width - 20} height={11} rx={2} fill="#0b1120" stroke="#334155" strokeWidth={0.6} />
          <text
            x={centerX}
            y={45.5}
            textAnchor="middle"
            fontSize={6.8}
            fontWeight="900"
            fontFamily="sans-serif"
            fill="#f8fafc"
            letterSpacing="0.8"
          >
            {isServiceDisc ? 'MAIN BREAKER' : 'ROYU BOLT-ON'}
          </text>
        </g>
      ) : isRoyuDin ? (
        <g>
          <rect x={6} y={35} width={width - 12} height={11} rx={3} fill="#0f4c81" />
          <rect x={width - 18} y={35} width={12} height={11} rx={2} fill="#dc2626" />
          <text x={11} y={42.5} fontSize={6.8} fontWeight="900" fill="#ffffff" letterSpacing="0.6">
            ROYU
          </text>
        </g>
      ) : (
        <g>
          <rect x={6} y={35} width={width - 12} height={10} rx={3} fill="#15803d" />
          <text x={centerX} y={42} textAnchor="middle" fontSize={6.2} fontWeight="bold" fill="#ffffff">
            IEC 60898
          </text>
        </g>
      )}

      {/* Trip / Status Window Shutter (with glass reflection) */}
      <g>
        <rect
          x={centerX - 16}
          y={49}
          width={32}
          height={10}
          rx={2.5}
          fill={isTripped ? '#f59e0b' : isClosed ? '#dc2626' : '#16a34a'}
          stroke="#0f172a"
          strokeWidth={0.9}
        />
        <line x1={centerX - 13} y1={51} x2={centerX + 13} y2={51} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        <text
          x={centerX}
          y={56}
          textAnchor="middle"
          fontSize={6.4}
          fontWeight="bold"
          fontFamily="monospace"
          fill={isTripped ? '#0f172a' : '#ffffff'}
        >
          {isTripped ? 'TRIP' : isClosed ? 'I ON' : 'O OFF'}
        </text>
      </g>

      {/* Recessed Handle Cavity */}
      <rect
        x={centerX - (is3P ? 22 : is2P ? 16 : 13)}
        y={centerY - 13}
        width={is3P ? 44 : is2P ? 32 : 26}
        height={28}
        rx={3.5}
        fill="#05080f"
        stroke={isBoltOn ? '#475569' : '#334155'}
        strokeWidth={1.1}
      />

      {/* Interactive 3D Breaker Rocker Handle + Metallic Tie-Bar */}
      <g onClick={handleToggle} className="cursor-pointer group">
        {/* Cavity drop shadow */}
        <rect
          x={centerX - (is3P ? 19 : is2P ? 13 : 10)}
          y={isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3}
          width={is3P ? 38 : is2P ? 26 : 20}
          height={11}
          rx={2.5}
          fill={`url(#handleGrad-${uid})`}
          stroke={isBoltOn ? '#020617' : '#0f172a'}
          strokeWidth={1}
          className="transition-all duration-150"
        />
        {/* Handle Top Bevel & Grip Ridges */}
        <line
          x1={centerX - (is3P ? 15 : is2P ? 10 : 7)}
          y1={(isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3) + 3}
          x2={centerX + (is3P ? 15 : is2P ? 10 : 7)}
          y2={(isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3) + 3}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1}
        />
        <line
          x1={centerX - (is3P ? 15 : is2P ? 10 : 7)}
          y1={(isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3) + 6}
          x2={centerX + (is3P ? 15 : is2P ? 10 : 7)}
          y2={(isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3) + 6}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        />
        {/* Multi-pole Tie Pin */}
        {(is2P || is3P) && (
          <circle
            cx={centerX}
            cy={(isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3) + 5.5}
            r={1.6}
            fill="#cbd5e1"
            stroke="#0f172a"
            strokeWidth={0.5}
          />
        )}
        {isBoltOn && (
          <text
            x={centerX}
            y={(isTripped ? centerY - 2 : isClosed ? centerY - 10 : centerY + 3) + 8.5}
            textAnchor="middle"
            fontSize={5.8}
            fontWeight="900"
            fontFamily="monospace"
            fill={ampTone.text}
          >
            {ratedAmps}A
          </text>
        )}
      </g>

      {/* Laser-Etched Engineering Nameplate */}
      <text
        x={centerX}
        y={height - 46}
        textAnchor="middle"
        fontSize={8.5}
        fontWeight="900"
        fontFamily="monospace"
        fill={isBoltOn ? '#f8fafc' : '#0f172a'}
      >
        {curve}{ratedAmps}
      </text>
      <text
        x={centerX}
        y={height - 37.5}
        textAnchor="middle"
        fontSize={5.8}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill={isBoltOn ? '#94a3b8' : '#475569'}
      >
        {poles}P {is3P ? '400V~' : '240V~'} {isBoltOn ? '10kA' : '6kA'}
      </text>

      {/* Small Tactile Trip Test Micro-Button (on 2P/3P Bolt-On & Service Disconnect) */}
      {(is2P || is3P) && (
        <g onClick={handleManualTripTest} className="cursor-pointer" opacity={0.9}>
          <circle cx={width - 13} cy={centerY + 20} r={3.5} fill="#0f172a" stroke="#64748b" strokeWidth={0.7} />
          <text x={width - 13} y={centerY + 21.8} textAnchor="middle" fontSize={4.5} fontWeight="bold" fill="#f59e0b">
            T
          </text>
        </g>
      )}

      {/* Subtle Floating Profile Pill (Top Edge) */}
      <g onClick={handleCycleStyle} transform={`translate(${centerX}, -9)`} className="cursor-pointer">
        <rect x={-30} y={-6} width={60} height={11} rx={5.5} fill="#0f172a" stroke="#38bdf8" strokeWidth={0.7} opacity={0.9} />
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={6} fontWeight="bold" fill="#e2e8f0">
          {isBoltOn ? 'Bolt-On' : isRoyuDin ? 'ROYU DIN' : 'IEC DIN'}
        </text>
      </g>

      {/* Terminations */}
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
