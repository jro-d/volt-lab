import React, { useId } from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

const PHASE_COLORS = {
  l1: { fill: '#dc2626', name: 'L1' },
  l2: { fill: '#eab308', name: 'L2' },
  l3: { fill: '#2563eb', name: 'L3' },
} as const;

/**
 * 440V 60Hz 3-phase + PE shipboard / industrial feeder terminal block with phase-presence
 * lamps, rotary main isolator and phase-sequence indicator.
 */
export const ThreePhaseSourceDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const uid = useId().replace(/:/g, '');
  const { x, y, width, height } = device;
  const on = device.state.closed !== false;
  const lv = device.state.lineVoltage || 440;
  const hz = device.state.frequency || 60;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, { closed: !on });
    else onToggleState?.({ ...device, state: { ...device.state, closed: !on } });
  };

  return (
    <g id={`device-${device.id}`}>
      <defs>
        <linearGradient id={`src3-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
      </defs>
      {/* Steel enclosure */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={`url(#src3-body-${uid})`}
        stroke="#6b7280"
        strokeWidth={1.4}
        filter="drop-shadow(0 6px 14px rgba(15,23,42,0.22))"
      />
      {/* Hazard header */}
      <rect x={x + 4} y={y + 4} width={width - 8} height={16} rx={3} fill="#111827" />
      <polygon points={`${x + 10},${y + 17} ${x + 15},${y + 7} ${x + 20},${y + 17}`} fill="#facc15" stroke="#111827" strokeWidth={0.5} />
      <text x={x + 15} y={y + 16} textAnchor="middle" fontSize="6" fontWeight="900" fill="#111827">!</text>
      <text x={x + 25} y={y + 15} fontSize="6.4" fontWeight="900" fill="#fde047" fontFamily="ui-sans-serif, system-ui" letterSpacing="0.3">
        {lv}V 3Φ {hz}Hz FEEDER
      </text>

      {/* Phase presence lamps */}
      {(['l1', 'l2', 'l3'] as const).map((k, i) => {
        const cx = x + 22 + i * 22;
        const c = PHASE_COLORS[k];
        return (
          <g key={k}>
            <circle cx={cx} cy={y + 34} r={7} fill="#1f2937" stroke="#4b5563" strokeWidth={0.8} />
            <circle cx={cx} cy={y + 34} r={5} fill={on ? c.fill : '#374151'} opacity={on ? 1 : 0.8} />
            {on && <circle cx={cx} cy={y + 34} r={8.5} fill={c.fill} opacity={0.25} />}
            <text x={cx} y={y + 49} textAnchor="middle" fontSize="5" fontWeight="900" fill="#111827" fontFamily="ui-monospace, monospace">
              {c.name}
            </text>
          </g>
        );
      })}

      {/* Phase sequence indicator */}
      <g transform={`translate(${x + 100}, ${y + 36})`}>
        <circle r={11} fill="#111827" stroke="#4b5563" strokeWidth={0.8} />
        <g className={on ? 'animate-spin' : undefined} style={{ transformOrigin: '0px 0px', animationDuration: '1.4s' }}>
          <path d="M 0 -7 A 7 7 0 1 1 -6 3.5" fill="none" stroke={on ? '#4ade80' : '#6b7280'} strokeWidth={1.4} />
          <polygon points="-8,2 -4,5 -6.5,6.5" fill={on ? '#4ade80' : '#6b7280'} />
        </g>
        <text x={0} y={18} textAnchor="middle" fontSize="4.2" fontWeight="900" fill="#111827" fontFamily="ui-monospace, monospace">
          L1→L2→L3
        </text>
      </g>

      {/* Rotary main isolator */}
      <g transform={`translate(${x + width - 26}, ${y + 36})`} onMouseDown={stopCanvas} onClick={toggle} className="cursor-pointer">
        <title>Main isolator — click to switch the 3-phase feeder {on ? 'OFF' : 'ON'}</title>
        <rect x={-14} y={-13} width={28} height={26} rx={3} fill="#facc15" stroke="#a16207" strokeWidth={0.8} />
        <circle r={9} fill="#dc2626" stroke="#7f1d1d" strokeWidth={0.8} />
        <rect
          x={-2.5}
          y={-10}
          width={5}
          height={20}
          rx={2}
          fill="#b91c1c"
          stroke="#7f1d1d"
          strokeWidth={0.6}
          transform={on ? 'rotate(90)' : 'rotate(0)'}
          style={{ transition: 'transform 160ms' }}
        />
        <text x={0} y={-15.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fill="#111827">
          {on ? 'I · ON' : 'O · OFF'}
        </text>
      </g>

      {/* Terminal block rail */}
      <rect x={x + 6} y={y + height - 26} width={width - 12} height={22} rx={3} fill="#1f2937" />
      {device.terminals.map((t) => {
        const tx = x + width * t.relX;
        const col = t.id === 'pe' ? '#16a34a' : PHASE_COLORS[t.id as 'l1' | 'l2' | 'l3']?.fill || '#9ca3af';
        return <rect key={t.id} x={tx - 10} y={y + height - 26} width={20} height={4} fill={col} />;
      })}

      <DeviceTerminals {...props} hideLabel={() => true} />
      {device.terminals.map((t) => (
        <text
          key={`lb-${t.id}`}
          x={x + width * t.relX + 12}
          y={y + height * t.relY + 2}
          fontSize="5.6"
          fontWeight="900"
          fill={t.id === 'pe' ? '#86efac' : '#f9fafb'}
          fontFamily="ui-monospace, monospace"
          className="pointer-events-none"
        >
          {t.label}
        </text>
      ))}
    </g>
  );
};
