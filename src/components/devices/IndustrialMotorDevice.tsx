import React, { useId } from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * TEFC squirrel-cage induction motor (side view): finned cast-iron frame, fan cowl, keyed shaft,
 * terminal box U1/V1/W1/PE. The solver reports direction from the phase sequence on U1-V1-W1.
 */
export const IndustrialMotorDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const uid = useId().replace(/:/g, '');
  const { x, y, width, height } = device;
  const isRunning = !!(device.state.motorRunning || device.state.running);
  const dir: 'CW' | 'CCW' | null = device.state.motorDirection || (isRunning ? 'CW' : null);
  const fault: string | null = device.state.motorFault || null;
  const rpm = device.state.motorRpm || 1750;
  const hp = device.state.motorHp || (device.state.wattage ? +(device.state.wattage / 746).toFixed(1) : 3);
  const amps = device.state.measuredAmps || 0;

  const bodyX = x + 16;
  const bodyY = y + 40;
  const bodyW = width - 44;
  const bodyH = height - 58;
  const shaftCy = bodyY + bodyH / 2;

  const spinStyle: React.CSSProperties = {
    transformOrigin: '0px 0px',
    animationDuration: '0.35s',
    animationDirection: dir === 'CCW' ? 'reverse' : 'normal',
  };

  return (
    <g id={`device-${device.id}`}>
      <defs>
        <linearGradient id={`mot-frame-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="18%" stopColor="#0284c7" />
          <stop offset="60%" stopColor="#075985" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
        <linearGradient id={`mot-shaft-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="45%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <pattern id={`mot-grille-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#0c4a6e" />
          <circle cx="1.5" cy="1.5" r="0.8" fill="#082f49" />
        </pattern>
      </defs>

      {/* Mounting feet */}
      <path d={`M ${bodyX + 6} ${bodyY + bodyH - 2} l -4 16 h 30 l -4 -16 Z`} fill="#0c4a6e" stroke="#082f49" strokeWidth={0.8} />
      <path d={`M ${bodyX + bodyW - 32} ${bodyY + bodyH - 2} l -4 16 h 30 l -4 -16 Z`} fill="#0c4a6e" stroke="#082f49" strokeWidth={0.8} />
      <rect x={bodyX - 4} y={bodyY + bodyH + 13} width={bodyW + 8} height={3} rx={1} fill="#475569" opacity={0.5} />

      {/* Fan cowl (non-drive end) */}
      <path
        d={`M ${bodyX + bodyW - 2} ${bodyY + 3} L ${x + width - 8} ${bodyY + 8} Q ${x + width - 2} ${shaftCy} ${x + width - 8} ${bodyY + bodyH - 8} L ${bodyX + bodyW - 2} ${bodyY + bodyH - 3} Z`}
        fill={`url(#mot-grille-${uid})`}
        stroke="#082f49"
        strokeWidth={1}
      />

      {/* Finned cast-iron frame */}
      <rect
        x={bodyX}
        y={bodyY}
        width={bodyW}
        height={bodyH}
        rx={7}
        fill={`url(#mot-frame-${uid})`}
        stroke="#0c4a6e"
        strokeWidth={1.4}
        filter="drop-shadow(0 8px 16px rgba(2,6,23,0.25))"
        className={fault ? 'animate-pulse' : undefined}
      />
      {Array.from({ length: 7 }).map((_, i) => (
        <line
          key={i}
          x1={bodyX + 5}
          y1={bodyY + 6 + i * ((bodyH - 12) / 6)}
          x2={bodyX + bodyW - 5}
          y2={bodyY + 6 + i * ((bodyH - 12) / 6)}
          stroke="#7dd3fc"
          strokeWidth={1}
          opacity={0.35}
        />
      ))}
      {/* Drive-end bearing shield */}
      <rect x={bodyX - 5} y={bodyY + 6} width={7} height={bodyH - 12} rx={2} fill="#075985" stroke="#082f49" strokeWidth={0.8} />

      {/* Keyed output shaft */}
      <rect x={x - 6} y={shaftCy - 5} width={18} height={10} rx={1.5} fill={`url(#mot-shaft-${uid})`} stroke="#334155" strokeWidth={0.8} />
      <rect x={x - 4} y={shaftCy - 1.5} width={9} height={3} fill="#1e293b" />

      {/* Shaft end-view rotor disc (spins in the solver-reported direction) */}
      <g transform={`translate(${x + 2}, ${shaftCy + 22})`}>
        <circle r={9} fill="#0f172a" stroke={isRunning ? '#4ade80' : '#38bdf8'} strokeWidth={1.2} />
        <g className={isRunning ? 'animate-spin' : undefined} style={spinStyle}>
          <line x1={-7} y1={0} x2={7} y2={0} stroke="#f8fafc" strokeWidth={1.6} strokeLinecap="round" />
          <line x1={0} y1={-7} x2={0} y2={7} stroke="#f8fafc" strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={0} cy={-6} r={1.5} fill="#f97316" />
        </g>
        <circle r={2.2} fill="#64748b" />
      </g>

      {/* Direction badge on the shaft */}
      {isRunning && dir && (
        <g transform={`translate(${x + 26}, ${shaftCy + 22})`} className="pointer-events-none">
          <rect x={-12} y={-8} width={50} height={16} rx={8} fill={dir === 'CW' ? '#16a34a' : '#7c3aed'} stroke="#ffffff" strokeWidth={1} />
          <g transform="translate(-3, 0)">
            <path
              d={dir === 'CW' ? 'M -4 2 A 4.5 4.5 0 1 1 3 3' : 'M 4 2 A 4.5 4.5 0 1 0 -3 3'}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.4}
            />
            <polygon points={dir === 'CW' ? '1.5,1 5,3.5 1.5,5.5' : '-1.5,1 -5,3.5 -1.5,5.5'} fill="#ffffff" />
          </g>
          <text x={16} y={2.6} textAnchor="middle" fontSize="6" fontWeight="900" fill="#ffffff" fontFamily="ui-monospace, monospace">
            {dir === 'CW' ? 'CW FWD' : 'CCW REV'}
          </text>
        </g>
      )}

      {/* Lifting eyebolt */}
      <circle cx={bodyX + bodyW / 2 + 22} cy={bodyY - 6} r={4} fill="none" stroke="#64748b" strokeWidth={1.6} />
      <line x1={bodyX + bodyW / 2 + 22} y1={bodyY - 2} x2={bodyX + bodyW / 2 + 22} y2={bodyY + 1} stroke="#64748b" strokeWidth={2} />

      {/* Terminal box */}
      <rect
        x={x + 30}
        y={y + 12}
        width={width - 42}
        height={28}
        rx={3}
        fill="#0f172a"
        stroke="#0284c7"
        strokeWidth={1.2}
        filter="drop-shadow(0 2px 5px rgba(0,0,0,0.3))"
      />
      <rect x={x + 33} y={y + 15} width={width - 48} height={2} rx={1} fill="#1e293b" />

      {/* Nameplate (aluminium) */}
      <rect x={bodyX + 8} y={bodyY + 9} width={bodyW - 16} height={bodyH - 18} rx={2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.6} opacity={0.95} />
      <text x={bodyX + bodyW / 2} y={bodyY + 18} textAnchor="middle" fontSize="5.4" fontWeight="900" fill="#0c4a6e" fontFamily="ui-sans-serif, system-ui">
        3~ IND. MOTOR · {device.state.tag || 'M1'}
      </text>
      <text x={bodyX + bodyW / 2} y={bodyY + 25} textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#334155" fontFamily="ui-monospace, monospace">
        {hp}HP · 440V Δ · 60Hz · IP55
      </text>
      <text
        x={bodyX + bodyW / 2}
        y={bodyY + 33}
        textAnchor="middle"
        fontSize="5.4"
        fontWeight="900"
        fill={fault ? '#dc2626' : isRunning ? '#15803d' : '#64748b'}
        fontFamily="ui-monospace, monospace"
      >
        {fault ? `⚠ ${fault.split(' (')[0]}` : isRunning ? `${rpm} RPM · ${amps > 0 ? amps.toFixed(1) + 'A' : 'RUN'}` : 'STOPPED · 0 RPM'}
      </text>

      <DeviceTerminals
        {...props}
        labelColor={(t) => (t.id === 'pe' ? '#4ade80' : '#f8fafc')}
      />
    </g>
  );
};
