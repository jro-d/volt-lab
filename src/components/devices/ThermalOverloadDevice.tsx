import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

const FLA_STEPS = [2.5, 4, 6, 10, 16];

/**
 * EduVolt-style Thermal Overload Relay (SIRIUS 3RU class).
 * Top copper busbar stabs (1/L1, 3/L2, 5/L3), rotary FLA dial, TEST/STOP/RESET controls,
 * integrated 95-96 NC & 97-98 NO auxiliary block, and embedded non-overlapping labels.
 */
export const ThermalOverloadDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const tripped = !!device.state.tripped;
  const tripAmps = device.state.tripAmps || 6;
  const measuredAmps = device.state.measuredAmps || 0;
  const mainW = width * 0.69;
  const auxX = x + width * 0.70;
  const auxW = width * 0.30;

  const dialX = x + 23;
  const dialY = y + 52;
  const dialIdx = Math.max(0, FLA_STEPS.indexOf(tripAmps));
  const dialAngle = -115 + dialIdx * 57.5;

  const patch = (p: Record<string, any>) => {
    if (onPatchState) onPatchState(device.id, p);
    else onToggleState?.({ ...device, state: { ...device.state, ...p } });
  };

  const cycleFla = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = FLA_STEPS[(dialIdx + 1) % FLA_STEPS.length];
    patch({ tripAmps: next });
  };

  const testTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    patch({ tripped: !tripped });
  };

  const resetRelay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tripped) patch({ tripped: false });
  };

  return (
    <g className="select-none">
      {/* Subtle architectural CAD shadow */}
      <rect x={x + 2} y={y + 18} width={width} height={height - 16} rx={4} fill="rgba(15, 23, 42, 0.14)" />

      {/* Top Copper Busbar Stab Prongs (1/L1, 3/L2, 5/L3) */}
      {[0.25, 0.41, 0.57].map((rel, idx) => {
        const px = x + width * rel;
        return (
          <g key={`stab-${idx}`}>
            <rect x={px - 2.6} y={y + 1} width={5.2} height={17} rx={1} fill="#c2410c" stroke="#7c2d12" strokeWidth={0.7} />
            <rect x={px - 1.3} y={y + 1} width={2.6} height={15} fill="#fb923c" />
          </g>
        );
      })}

      {/* Main Enclosure (starts cleanly below top screw clearance at y+17) */}
      <rect x={x} y={y + 17} width={mainW} height={height - 17} rx={4} fill="#e5e7eb" stroke="#0f172a" strokeWidth={1.3} />

      {/* Right Integrated Aux Contact Module (95-96 NC, 97-98 NO) */}
      <rect x={auxX} y={y + 1} width={auxW} height={height - 1} rx={3} fill="#d1d5db" stroke="#0f172a" strokeWidth={1.2} />
      <rect x={auxX + 1.5} y={y + 2} width={auxW - 3} height={15} rx={2} fill="#1f2937" />
      <line x1={x + width * 0.855} y1={y + 2} x2={x + width * 0.855} y2={y + 17} stroke="#64748b" strokeWidth={0.8} />

      {/* Top Aux Silkscreen Labels (below top screws) */}
      <rect x={auxX + 1.5} y={y + 17.5} width={auxW - 3} height={8.5} fill="#f1f5f9" />
      <text x={x + width * 0.78} y={y + 23.6} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#b45309">
        95NC
      </text>
      <text x={x + width * 0.93} y={y + 23.6} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#047857">
        97NO
      </text>

      {/* Top Dark EduVolt Brand & Specs Header */}
      <rect x={x + 1.5} y={y + 18.5} width={mainW - 3} height={12.5} rx={1.5} fill="#111827" />
      <text x={x + 5} y={y + 26.8} fontSize="5.2" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#ffffff">
        VoltLab
      </text>
      <text x={x + mainW - 4} y={y + 26.8} textAnchor="end" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill={tripped ? '#f87171' : '#38bdf8'}>
        {device.state.tag || 'F2'} {measuredAmps > 0 ? `${measuredAmps.toFixed(1)}A` : `≤${tripAmps}A`}
      </text>

      <rect x={auxX + 1.5} y={y + 26.5} width={auxW - 3} height={9.5} fill="#334155" />
      <text x={auxX + auxW / 2} y={y + 33} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#e2e8f0">
        95-98 AUX
      </text>

      {/* Left Control Column: Rotary FLA Trip Dial */}
      <g onMouseDown={stopCanvas} onClick={cycleFla} className="cursor-pointer">
        <title>{`FLA Trip Dial: ${tripAmps}A — click to cycle (2.5 / 4 / 6 / 10 / 16 A)`}</title>
        <circle cx={dialX} cy={dialY} r={12.5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.1} />
        {[-115, -57.5, 0, 57.5, 115].map((ang, i) => {
          const rad = ((ang - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={dialX + Math.cos(rad) * 10}
              y1={dialY + Math.sin(rad) * 10}
              x2={dialX + Math.cos(rad) * 12.2}
              y2={dialY + Math.sin(rad) * 12.2}
              stroke="#475569"
              strokeWidth={0.9}
            />
          );
        })}
        <g transform={`rotate(${dialAngle}, ${dialX}, ${dialY})`}>
          <circle cx={dialX} cy={dialY} r={7.5} fill="#cbd5e1" stroke="#334155" strokeWidth={0.9} />
          <line x1={dialX} y1={dialY + 4} x2={dialX} y2={dialY - 6.5} stroke="#0f172a" strokeWidth={1.5} strokeLinecap="round" />
        </g>
        <rect x={dialX - 15} y={y + 68} width={30} height={10} rx={1.5} fill="#1e293b" />
        <text x={dialX} y={y + 75} textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#38bdf8">
          {tripAmps.toFixed(1)}A
        </text>
        <text x={dialX} y={y + 85.5} textAnchor="middle" fontSize="3.8" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#475569">
          {(tripAmps * 0.7).toFixed(1)}–{(tripAmps * 1.3).toFixed(0)}A
        </text>
      </g>

      {/* Center-Right Column: Status Flag + TEST Slider (left) | STOP + RESET (right) */}
      {/* TEST Slide Actuator + Status Flag */}
      <g onMouseDown={stopCanvas} onClick={testTrip} className="cursor-pointer">
        <title>TEST — trigger thermal overload trip (opens 95-96, closes 97-98)</title>
        <text x={x + 51} y={y + 39} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
          TEST
        </text>
        <rect x={x + 42} y={y + 42} width={18} height={8} rx={2} fill="#1e293b" stroke="#0f172a" strokeWidth={0.6} />
        <rect
          x={tripped ? x + 51 : x + 43.5}
          y={y + 43.5}
          width={7.5}
          height={5}
          rx={1}
          fill={tripped ? '#ef4444' : '#22c55e'}
        />
        <text x={x + 51} y={y + 57} textAnchor="middle" fontSize="4" fontWeight="900" fontFamily="ui-monospace, monospace" fill={tripped ? '#dc2626' : '#15803d'}>
          {tripped ? 'TRIP' : 'OK'}
        </text>
      </g>

      {/* Red Square STOP Actuator */}
      <g onMouseDown={stopCanvas} onClick={testTrip} className="cursor-pointer">
        <title>STOP — manually trip 95-96 control interlock</title>
        <text x={x + mainW - 12} y={y + 39} textAnchor="middle" fontSize="4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#b91c1c">
          STOP
        </text>
        <rect x={x + mainW - 18.5} y={y + 42} width={13} height={11} rx={1.5} fill="#dc2626" stroke="#7f1d1d" strokeWidth={0.9} />
        <rect x={x + mainW - 16} y={y + 44.5} width={8} height={2.5} rx={0.5} fill="#fca5a5" opacity={0.5} />
      </g>

      {/* Blue RESET Pushbutton (well clear horizontally & vertically) */}
      <g onMouseDown={stopCanvas} onClick={resetRelay} className="cursor-pointer">
        <title>RESET — re-arm thermal bimetal relay after cooling</title>
        <circle cx={x + mainW - 12} cy={y + 72} r={7.2} fill="#1e3a8a" stroke="#0f172a" strokeWidth={0.9} />
        <circle
          cx={x + mainW - 12}
          cy={y + 72}
          r={tripped ? 5.6 : 4.8}
          fill="#2563eb"
          stroke="#93c5fd"
          strokeWidth={0.6}
          className={tripped ? 'animate-pulse' : undefined}
        />
        <text x={x + mainW - 12} y={y + 74} textAnchor="middle" fontSize="5" fontWeight="900" fill="#ffffff">
          R
        </text>
        <text x={x + mainW - 12} y={y + 85.5} textAnchor="middle" fontSize="3.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1e40af">
          RESET
        </text>
      </g>

      {/* Aux Trip Contact Mimic Windows (95-96 NC / 97-98 NO) */}
      {[
        { relX: 0.78, nc: true },
        { relX: 0.925, nc: false },
      ].map(({ relX, nc }) => {
        const cx = x + width * relX;
        const cy = y + 62;
        const closed = nc ? !tripped : tripped;
        const col = closed ? '#16a34a' : nc ? '#dc2626' : '#475569';
        return (
          <g key={`auxw-${nc ? 'nc' : 'no'}`}>
            <rect x={cx - 6} y={cy - 15} width={12} height={28} rx={1.5} fill="#ffffff" stroke="#475569" strokeWidth={0.8} />
            <line x1={cx} y1={cy - 12} x2={cx} y2={cy - 4} stroke={col} strokeWidth={1.1} />
            <line x1={cx} y1={cy + 4} x2={cx} y2={cy + 12} stroke={col} strokeWidth={1.1} />
            <line x1={cx} y1={cy + 4} x2={closed ? cx : cx + (nc ? 4 : -4)} y2={cy - 4} stroke={col} strokeWidth={1.3} />
            {nc && <line x1={cx - 3} y1={cy - 4} x2={cx + 3} y2={cy - 4} stroke={col} strokeWidth={0.9} />}
            <text x={cx} y={cy + 20} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#1e293b">
              {nc ? 'NC' : 'NO'}
            </text>
          </g>
        );
      })}

      {/* Embedded Bottom Silkscreen Strip */}
      <rect x={x + 1.5} y={y + height - 29} width={mainW - 3} height={9} fill="#f8fafc" />
      <rect x={auxX + 1.5} y={y + height - 29} width={auxW - 3} height={9} fill="#f1f5f9" />
      {[
        { relX: 0.25, text: '2/T1', color: '#0f172a' },
        { relX: 0.41, text: '4/T2', color: '#0f172a' },
        { relX: 0.57, text: '6/T3', color: '#0f172a' },
        { relX: 0.78, text: '96NC', color: '#b45309' },
        { relX: 0.93, text: '98NO', color: '#047857' },
      ].map((lbl) => (
        <text
          key={`torb-${lbl.text}`}
          x={x + width * lbl.relX}
          y={y + height - 22.5}
          textAnchor="middle"
          fontSize="4.5"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill={lbl.color}
        >
          {lbl.text}
        </text>
      ))}

      {/* Bottom Terminal Bay */}
      <rect x={x + 1.5} y={y + height - 19} width={mainW - 3} height={17.5} rx={2} fill="#1f2937" />
      <rect x={auxX + 1.5} y={y + height - 19} width={auxW - 3} height={17.5} rx={2} fill="#1f2937" />
      {[0.33, 0.49].map((r) => (
        <line key={`td-${r}`} x1={x + width * r} y1={y + height - 19} x2={x + width * r} y2={y + height - 2} stroke="#64748b" strokeWidth={0.8} />
      ))}
      <line x1={x + width * 0.855} y1={y + height - 19} x2={x + width * 0.855} y2={y + height - 2} stroke="#64748b" strokeWidth={0.8} />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
