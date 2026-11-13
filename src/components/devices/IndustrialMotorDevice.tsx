import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

/**
 * EduVolt-style 3-Phase Squirrel-Cage Induction Motor (TEFC).
 * Supports both standard 4-lead DOL/FWD-REV (U1/V1/W1/PE) and 6-lead Wye-Delta
 * (U1/V1/W1/PE + W2/U2/V2) terminal blocks with crisp non-overlapping silkscreens.
 */
export const IndustrialMotorDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device } = props;
  const { x, y, width, height } = device;
  const isStarDelta = device.type === 'motor_6lead_star_delta';
  const isRunning = !!(device.state.motorRunning || device.state.running);
  const dir: 'CW' | 'CCW' | null = device.state.motorDirection || (isRunning ? 'CW' : null);
  const starterMode: 'wye' | 'delta' | null = device.state.starterMode || null;
  const fault: string | null = device.state.motorFault || null;
  const rpm = device.state.motorRpm || (isStarDelta ? 1760 : 1750);
  const hp = device.state.motorHp || (device.state.wattage ? +(device.state.wattage / 746).toFixed(1) : (isStarDelta ? 7.5 : 3));
  const amps = device.state.measuredAmps || 0;

  const bodyX = x + 16;
  const bodyY = isStarDelta ? y + 66 : y + 44;
  const bodyW = width - 44;
  const bodyH = isStarDelta ? height - 80 : height - 60;
  const shaftCy = bodyY + bodyH / 2;

  return (
    <g id={`device-${device.id}`} className="select-none">
      {/* Mounting Feet */}
      <path d={`M ${bodyX + 6} ${bodyY + bodyH - 2} l -4 13 h 28 l -4 -13 Z`} fill="#075985" stroke="#0f172a" strokeWidth={0.9} />
      <path d={`M ${bodyX + bodyW - 30} ${bodyY + bodyH - 2} l -4 13 h 28 l -4 -13 Z`} fill="#075985" stroke="#0f172a" strokeWidth={0.9} />

      {/* Fan Cowl */}
      <path
        d={`M ${bodyX + bodyW - 2} ${bodyY + 3} L ${x + width - 7} ${bodyY + 8} Q ${x + width - 1} ${shaftCy} ${x + width - 7} ${bodyY + bodyH - 8} L ${bodyX + bodyW - 2} ${bodyY + bodyH - 3} Z`}
        fill="#0c4a6e"
        stroke="#0f172a"
        strokeWidth={1.1}
      />

      {/* Cast-Iron Finned Motor Stator Frame */}
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={5} fill="#0284c7" stroke="#0f172a" strokeWidth={1.3} className={fault ? 'animate-pulse' : undefined} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={bodyX + 4} y1={bodyY + 6 + i * ((bodyH - 12) / 5)} x2={bodyX + bodyW - 4} y2={bodyY + 6 + i * ((bodyH - 12) / 5)} stroke="#7dd3fc" strokeWidth={0.9} opacity={0.4} />
      ))}

      {/* Output Shaft */}
      <rect x={x - 5} y={shaftCy - 4.5} width={17} height={9} rx={1.5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={0.9} />
      <rect x={x - 3} y={shaftCy - 1.5} width={8} height={3} fill="#334155" />

      {/* Rotor Indicator Disc */}
      <g transform={`translate(${x + 4}, ${shaftCy + 19})`}>
        <circle r={8.5} fill="#0f172a" stroke={isRunning ? '#4ade80' : '#38bdf8'} strokeWidth={1.1} />
        <g className={isRunning ? 'animate-spin' : undefined} style={{ transformOrigin: '0px 0px', animationDuration: starterMode === 'wye' ? '0.65s' : '0.35s', animationDirection: dir === 'CCW' ? 'reverse' : 'normal' }}>
          <line x1={-6} y1={0} x2={6} y2={0} stroke="#f8fafc" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={0} y1={-6} x2={0} y2={6} stroke="#f8fafc" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={0} cy={-5} r={1.4} fill="#f97316" />
        </g>
        <circle r={2} fill="#64748b" />
      </g>

      {isRunning && dir && (
        <g transform={`translate(${x + 28}, ${shaftCy + 19})`} className="pointer-events-none">
          <rect
            x={-12}
            y={-7}
            width={isStarDelta ? 54 : 44}
            height={14}
            rx={3}
            fill={starterMode === 'wye' ? '#d97706' : starterMode === 'delta' ? '#16a34a' : dir === 'CW' ? '#16a34a' : '#7c3aed'}
            stroke="#0f172a"
            strokeWidth={0.8}
          />
          <text x={isStarDelta ? 15 : 10} y={2.2} textAnchor="middle" fontSize="5.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
            {isStarDelta
              ? starterMode === 'wye'
                ? '★ WYE 1/3 I'
                : starterMode === 'delta'
                ? '▲ DELTA RUN'
                : `${dir} RUN`
              : dir === 'CW'
              ? 'CW FWD'
              : 'CCW REV'}
          </text>
        </g>
      )}

      {/* Cast-Iron Terminal Box + Embedded Labels */}
      {isStarDelta ? (
        <g>
          <rect x={x + 17} y={y + 6} width={width - 28} height={58} rx={3.5} fill="#1f2937" stroke="#0f172a" strokeWidth={1.1} />
          {/* Internal winding bridge visualization */}
          {starterMode === 'wye' && (
            <line x1={x + width * 0.22} y1={y + height * 0.41} x2={x + width * 0.60} y2={y + height * 0.41} stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
          )}
          {starterMode === 'delta' && (
            <g stroke="#22c55e" strokeWidth={1.6} opacity={0.8}>
              <line x1={x + width * 0.22} y1={y + height * 0.14} x2={x + width * 0.22} y2={y + height * 0.41} />
              <line x1={x + width * 0.41} y1={y + height * 0.14} x2={x + width * 0.41} y2={y + height * 0.41} />
              <line x1={x + width * 0.60} y1={y + height * 0.14} x2={x + width * 0.60} y2={y + height * 0.41} />
            </g>
          )}
          {/* Top row silkscreen */}
          <rect x={x + 18.5} y={y + 25.5} width={width - 31} height={7.5} fill="#0f172a" />
          {[
            { rel: 0.22, lbl: 'U1', col: '#f87171' },
            { rel: 0.41, lbl: 'V1', col: '#fde047' },
            { rel: 0.60, lbl: 'W1', col: '#60a5fa' },
            { rel: 0.80, lbl: 'PE', col: '#4ade80' },
          ].map((t) => (
            <text key={t.lbl} x={x + width * t.rel} y={y + 30.8} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
              {t.lbl}
            </text>
          ))}
          {/* Bottom row silkscreen */}
          <rect x={x + 18.5} y={y + 37} width={width - 31} height={7.5} fill="#0f172a" />
          {[
            { rel: 0.22, lbl: 'W2', col: '#60a5fa' },
            { rel: 0.41, lbl: 'U2', col: '#f87171' },
            { rel: 0.60, lbl: 'V2', col: '#fde047' },
          ].map((t) => (
            <text key={t.lbl} x={x + width * t.rel} y={y + 42.3} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
              {t.lbl}
            </text>
          ))}
          <text x={x + width * 0.80} y={y + 55.5} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill={starterMode === 'wye' ? '#fbbf24' : starterMode === 'delta' ? '#4ade80' : '#94a3b8'}>
            {starterMode === 'wye' ? '★ Y' : starterMode === 'delta' ? '▲ Δ' : 'Y / Δ'}
          </text>
        </g>
      ) : (
        <g>
          <rect x={x + 26} y={y + 13} width={width - 38} height={29} rx={3} fill="#1f2937" stroke="#0f172a" strokeWidth={1.1} />
          <rect x={x + 27} y={y + 34} width={width - 40} height={7.5} fill="#0f172a" />
          {[
            { rel: 0.32, lbl: 'U1', col: '#f87171' },
            { rel: 0.50, lbl: 'V1', col: '#fde047' },
            { rel: 0.68, lbl: 'W1', col: '#60a5fa' },
            { rel: 0.84, lbl: 'PE', col: '#4ade80' },
          ].map((t) => (
            <text key={t.lbl} x={x + width * t.rel} y={y + 39.4} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill={t.col}>
              {t.lbl}
            </text>
          ))}
        </g>
      )}

      {/* Clean Aluminum Nameplate */}
      <rect x={bodyX + 8} y={bodyY + 8} width={bodyW - 16} height={bodyH - 16} rx={2} fill="#f1f5f9" stroke="#334155" strokeWidth={0.8} />
      <text x={bodyX + bodyW / 2} y={bodyY + 17} textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#0c4a6e">
        {isStarDelta ? `Y-Δ MOTOR · ${device.state.tag || 'M1'}` : `3~ MOTOR · ${device.state.tag || 'M1'}`}
      </text>
      <text x={bodyX + bodyW / 2} y={bodyY + 24.5} textAnchor="middle" fontSize="4.4" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#334155">
        {isStarDelta ? `${hp}HP · 440V Y/Δ · 6-LEAD` : `${hp}HP · 440V Δ · IP55`}
      </text>
      <text x={bodyX + bodyW / 2} y={bodyY + 32.5} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill={fault ? '#dc2626' : starterMode === 'wye' ? '#b45309' : isRunning ? '#15803d' : '#64748b'}>
        {fault
          ? `⚠ ${fault.split(' (')[0]}`
          : isRunning
          ? `${starterMode === 'wye' ? 'STAR ' : starterMode === 'delta' ? 'DELTA ' : ''}${amps > 0 ? amps.toFixed(1) + 'A' : `${rpm} RPM`}`
          : 'STOPPED'}
      </text>

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
