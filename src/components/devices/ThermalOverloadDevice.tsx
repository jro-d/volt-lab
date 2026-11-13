import React, { useId } from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

export const TOR_DIAL_STEPS = [4, 5, 6, 7, 8, 10];

/**
 * 3-pole bimetallic Thermal Overload Relay (Siemens SIRIUS 3RU / Schneider LRD style).
 * Main poles always pass through; 95-96 NC opens and 97-98 NO closes when tripped.
 * Front controls: rotary ampere dial, red TEST slider, blue RESET button, trip flag window.
 */
export const ThermalOverloadDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const uid = useId().replace(/:/g, '');
  const { x, y, width, height } = device;
  const tripped = !!device.state.tripped;
  const setting: number = device.state.tripAmps || 6;
  const amps: number = device.state.measuredAmps || 0;
  const load = Math.min(1.4, amps / setting); // thermal image 0..1.4
  const mainW = width * 0.69;
  const auxX = x + width * 0.705;
  const auxW = width - width * 0.705;
  const poleX = [0.25, 0.41, 0.57].map((r) => x + width * r);

  const patch = (p: Record<string, any>) => {
    if (onPatchState) onPatchState(device.id, p);
    else onToggleState?.({ ...device, state: { ...device.state, ...p } });
  };

  const cycleDial = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = TOR_DIAL_STEPS.indexOf(setting);
    patch({ tripAmps: TOR_DIAL_STEPS[(idx + 1) % TOR_DIAL_STEPS.length] });
  };
  const testTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tripped) patch({ tripped: true, tripReason: 'TOR manual TEST trip (95-96 opened, 97-98 closed)' });
  };
  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tripped) patch({ tripped: false, tripReason: undefined });
  };

  // Dial geometry: 270° sweep from 4A (−135°) to 10A (+135°)
  const minA = 4;
  const maxA = 10;
  const angleFor = (a: number) => -135 + ((a - minA) / (maxA - minA)) * 270;
  const dialCx = x + mainW * 0.32;
  const dialCy = y + 58;
  const pointer = (angleFor(setting) * Math.PI) / 180;

  const heaterColor = (lvl: number) =>
    lvl <= 0.01 ? '#64748b' : lvl < 0.8 ? '#f59e0b' : lvl < 1.0 ? '#f97316' : '#ef4444';

  return (
    <g id={`device-${device.id}`}>
      <defs>
        <linearGradient id={`tor-housing-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="60%" stopColor="#cfd4da" />
          <stop offset="100%" stopColor="#a7afb9" />
        </linearGradient>
        <radialGradient id={`tor-dial-${uid}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#075985" />
        </radialGradient>
      </defs>

      {/* Main housing */}
      <rect
        x={x}
        y={y}
        width={mainW}
        height={height}
        rx={6}
        fill={`url(#tor-housing-${uid})`}
        stroke="#8b939e"
        strokeWidth={1.3}
        filter="drop-shadow(0 6px 12px rgba(15,23,42,0.18))"
      />
      {/* Top: plug-in pins under contactor + bottom motor terminal shroud */}
      <rect x={x + 2} y={y + 2} width={mainW - 4} height={20} rx={4} fill="#334155" />
      <rect x={x + 2} y={y + height - 22} width={mainW - 4} height={20} rx={4} fill="#334155" />

      {/* Bimetal heater windows (thermal image) */}
      {poleX.map((px, i) => (
        <g key={i}>
          <rect x={px - 6} y={y + 25} width={12} height={14} rx={1.5} fill="#0f172a" stroke="#475569" strokeWidth={0.6} />
          <path
            d={`M ${px - 3} ${y + 37} L ${px - 3} ${y + 28} Q ${px} ${y + 26} ${px + 3} ${y + 28} L ${px + 3} ${y + 37}`}
            fill="none"
            stroke={heaterColor(load)}
            strokeWidth={1.6}
            filter={load > 0.6 ? 'drop-shadow(0 0 2px rgba(249,115,22,0.9))' : undefined}
          />
          {/* bimetal strip deflects with heat */}
          <line
            x1={px}
            y1={y + 37}
            x2={px + Math.min(4, load * 4)}
            y2={y + 29}
            stroke="#e2e8f0"
            strokeWidth={0.9}
          />
        </g>
      ))}

      {/* Rotary ampere setting dial */}
      <g onMouseDown={stopCanvas} onClick={cycleDial} className="cursor-pointer">
        <title>Ampere setting dial — click to set the overload current (now {setting}A)</title>
        {TOR_DIAL_STEPS.map((a) => {
          const ang = (angleFor(a) * Math.PI) / 180;
          const r1 = 13;
          const r2 = 16;
          return (
            <g key={a}>
              <line
                x1={dialCx + Math.sin(ang) * r1}
                y1={dialCy - Math.cos(ang) * r1}
                x2={dialCx + Math.sin(ang) * r2}
                y2={dialCy - Math.cos(ang) * r2}
                stroke="#1e293b"
                strokeWidth={0.8}
              />
              <text
                x={dialCx + Math.sin(ang) * 20.5}
                y={dialCy - Math.cos(ang) * 20.5 + 1.8}
                textAnchor="middle"
                fontSize="4.6"
                fontWeight={a === setting ? 900 : 700}
                fontFamily="ui-monospace, monospace"
                fill={a === setting ? '#0369a1' : '#334155'}
              >
                {a}
              </text>
            </g>
          );
        })}
        <circle cx={dialCx} cy={dialCy} r={11.5} fill={`url(#tor-dial-${uid})`} stroke="#0c4a6e" strokeWidth={1} />
        <line
          x1={dialCx}
          y1={dialCy}
          x2={dialCx + Math.sin(pointer) * 10}
          y2={dialCy - Math.cos(pointer) * 10}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transition: 'all 160ms' }}
        />
        <circle cx={dialCx} cy={dialCy} r={2} fill="#0f172a" />
      </g>
      <text x={dialCx} y={dialCy + 30} textAnchor="middle" fontSize="5.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0c4a6e">
        Ir {setting}A
      </text>

      {/* Trip indicator flag */}
      <rect x={x + mainW * 0.62} y={y + 44} width={20} height={10} rx={1.5} fill="#0f172a" />
      <rect
        x={x + mainW * 0.62 + 2}
        y={y + 46}
        width={16}
        height={6}
        rx={1}
        fill={tripped ? '#f97316' : '#22c55e'}
        className={tripped ? 'animate-pulse' : undefined}
      />
      <text x={x + mainW * 0.62 + 10} y={y + 42} textAnchor="middle" fontSize="4.2" fontWeight="900" fill="#1e293b" fontFamily="ui-monospace, monospace">
        {tripped ? 'TRIPPED' : 'READY'}
      </text>

      {/* TEST slider (red) */}
      <g onMouseDown={stopCanvas} onClick={testTrip} className="cursor-pointer">
        <title>TEST — simulate a thermal overload trip (opens 95-96, closes 97-98)</title>
        <rect x={x + mainW * 0.62} y={y + 60} width={20} height={8} rx={4} fill="#1e293b" />
        <rect
          x={tripped ? x + mainW * 0.62 + 10 : x + mainW * 0.62 + 1}
          y={y + 61}
          width={9}
          height={6}
          rx={3}
          fill="#dc2626"
          stroke="#7f1d1d"
          strokeWidth={0.5}
          style={{ transition: 'x 140ms' }}
        />
        <text x={x + mainW * 0.62 + 10} y={y + 75} textAnchor="middle" fontSize="4.4" fontWeight="900" fill="#b91c1c" fontFamily="ui-monospace, monospace">
          TEST
        </text>
      </g>

      {/* RESET button (blue) */}
      <g onMouseDown={stopCanvas} onClick={reset} className="cursor-pointer">
        <title>RESET (R) — re-arm the relay after it has cooled</title>
        <circle cx={x + mainW * 0.62 + 10} cy={y + 86} r={7} fill="#1e3a8a" stroke="#0f172a" strokeWidth={0.8} />
        <circle
          cx={x + mainW * 0.62 + 10}
          cy={y + 86}
          r={tripped ? 5.6 : 4.6}
          fill="#2563eb"
          stroke="#93c5fd"
          strokeWidth={0.6}
          className={tripped ? 'animate-pulse' : undefined}
        />
        <text x={x + mainW * 0.62 + 10} y={y + 88} textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#ffffff">
          R
        </text>
      </g>

      {/* Nameplate */}
      <text x={x + 7} y={y + height - 27} fontSize="5" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#0f766e">
        SIRIUS 3RU
      </text>
      <text x={x + mainW - 6} y={y + height - 27} textAnchor="end" fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#713f12">
        {device.state.tag || 'F2'}{amps > 0 ? ` ${amps.toFixed(1)}A` : ''}
      </text>

      {/* Auxiliary trip contact block 95-96 / 97-98 */}
      <rect x={auxX} y={y + 6} width={auxW} height={height - 12} rx={4} fill="#b6bdc7" stroke="#8b939e" strokeWidth={1} />
      <rect x={auxX + 2} y={y + 8} width={auxW - 4} height={16} rx={2} fill="#334155" />
      <rect x={auxX + 2} y={y + height - 24} width={auxW - 4} height={16} rx={2} fill="#334155" />
      {[
        { rel: 0.78, nc: true },
        { rel: 0.93, nc: false },
      ].map(({ rel, nc }) => {
        const cx = x + width * rel;
        const cy = y + height / 2;
        const closed = nc ? !tripped : tripped;
        const col = closed ? '#16a34a' : nc ? '#dc2626' : '#475569';
        return (
          <g key={rel}>
            <rect x={cx - 7} y={cy - 16} width={14} height={32} rx={2} fill="#f8fafc" stroke="#64748b" strokeWidth={0.6} />
            <line x1={cx} y1={cy - 14} x2={cx} y2={cy - 5} stroke={col} strokeWidth={1.2} />
            <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 14} stroke={col} strokeWidth={1.2} />
            <line x1={cx} y1={cy + 5} x2={closed ? cx : cx + (nc ? 5 : -5)} y2={cy - 5} stroke={col} strokeWidth={1.4} style={{ transition: 'all 120ms' }} />
            {nc && <line x1={cx - 3} y1={cy - 5} x2={cx + 3} y2={cy - 5} stroke={col} strokeWidth={0.9} />}
            <text x={cx} y={cy + 23} textAnchor="middle" fontSize="4.2" fontWeight="900" fill={nc ? '#92400e' : '#065f46'} fontFamily="ui-monospace, monospace">
              {nc ? 'NC' : 'NO'}
            </text>
          </g>
        );
      })}

      <DeviceTerminals
        {...props}
        labelColor={(t) => (t.type === 'no' ? '#6ee7b7' : t.type === 'nc' ? '#fcd34d' : '#e2e8f0')}
      />
    </g>
  );
};
