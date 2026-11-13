import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style Extended Industrial Controls: On-Delay Timer Relay (RE17), HOA Selector, Limit Switch, and VFD Drive.
 */
export const IndustrialControlExtDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, state, terminals } = device;

  const patch = (next: Record<string, any>, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, next);
    else onToggleState?.({ ...device, state: { ...device.state, ...next } });
  };

  if (type === 'timer_relay') {
    const delaySec = typeof state.delaySec === 'number' ? state.delaySec : 5;
    const elapsedSec = typeof state.elapsedSec === 'number' ? state.elapsedSec : 0;
    const energized = !!state.energized;
    const timedOut = !!state.timedOut;
    const tag = state.tag || 'KT1';

    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15,23,42,0.16)" />
        {/* Dark Slate DIN Timer Enclosure (RE17 aesthetic) */}
        <rect x={x} y={y} width={width} height={height} rx={4} fill="#334155" stroke="#0f172a" strokeWidth={1.3} />

        {/* Top Bay + Silkscreen A1/A2 */}
        <rect x={x + 3} y={y + 2} width={width - 6} height={16} rx={2} fill="#1f2937" />
        <rect x={x + 3} y={y + 18} width={width - 6} height={7.5} fill="#0f172a" />
        <text x={x + width * 0.25} y={y + 23.4} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#d8b4fe">
          A1
        </text>
        <text x={x + width * 0.75} y={y + 23.4} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#93c5fd">
          A2
        </text>

        {/* Header Band */}
        <rect x={x + 3} y={y + 26.5} width={width - 6} height={11} fill="#15803d" />
        <text x={x + 7} y={y + 34} fontSize="5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
          {tag} · ON-DLY
        </text>
        <circle cx={x + width - 16} cy={y + 32} r={2.2} fill={energized ? '#4ade80' : '#052e16'} />
        <circle cx={x + width - 9} cy={y + 32} r={2.2} fill={timedOut ? '#fbbf24' : '#451a03'} />

        {/* Time Setting Dial */}
        <g
          transform={`translate(${x + width / 2}, ${y + 57})`}
          onMouseDown={stopCanvas}
          onClick={(e) => {
            const presets = [2, 5, 10, 15];
            const idx = presets.indexOf(delaySec);
            patch({ delaySec: presets[(idx + 1) % presets.length], elapsedSec: 0, timedOut: false }, e);
          }}
          className="cursor-pointer"
        >
          <title>{`Click dial to cycle delay preset (${delaySec}s)`}</title>
          <circle r={15.5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1} />
          <circle r={11.5} fill="#ffffff" stroke="#475569" strokeWidth={0.8} />
          <circle
            r={14.5}
            fill="none"
            stroke={energized ? '#f59e0b' : 'transparent'}
            strokeWidth={2.2}
            strokeDasharray={`${Math.min(1, elapsedSec / Math.max(0.1, delaySec)) * 91} 91`}
          />
          <text x={0} y={3} textAnchor="middle" fontSize="7.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
            {delaySec}s
          </text>
        </g>

        <text x={x + width / 2} y={y + 82} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill={timedOut ? '#fbbf24' : energized ? '#4ade80' : '#cbd5e1'}>
          {timedOut ? '15-18 CLOSED' : energized ? `RUN ${elapsedSec.toFixed(1)}s` : 'READY'}
        </text>

        {/* Bottom Silkscreen + Terminal Pocket */}
        <rect x={x + 3} y={y + height - 26.5} width={width - 6} height={7.5} fill="#0f172a" />
        <text x={x + width * 0.22} y={y + height - 21} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#e2e8f0">
          15 COM
        </text>
        <text x={x + width * 0.50} y={y + height - 21} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
          16 NC
        </text>
        <text x={x + width * 0.78} y={y + height - 21} textAnchor="middle" fontSize="4.1" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#6ee7b7">
          18 NO
        </text>
        <rect x={x + 3} y={y + height - 19} width={width - 6} height={17} rx={2} fill="#1f2937" />

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  if (type === 'selector_hoa') {
    const mode: 'hand' | 'off' | 'auto' = state.mode || 'off';
    const tag = state.tag || 'HOA1';
    const cx = x + width / 2;
    const cy = y + 54;
    const rotDeg = mode === 'hand' ? -45 : mode === 'auto' ? 45 : 0;

    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15,23,42,0.16)" />
        <rect x={x} y={y} width={width} height={height} rx={4} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.3} />

        {/* Top Pocket + Label */}
        <rect x={x + 3} y={y + 2} width={width - 6} height={16} rx={2} fill="#1f2937" />
        <rect x={x + 3} y={y + 18} width={width - 6} height={7} fill="#0f172a" />
        <text x={cx} y={y + 23.2} textAnchor="middle" fontSize="4.3" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#f87171">
          COM IN
        </text>

        {/* Legend Arc */}
        <text x={cx - 21} y={y + 35} textAnchor="middle" fontSize="4.4" fontWeight="900" fill={mode === 'hand' ? '#16a34a' : '#475569'}>
          HAND
        </text>
        <text x={cx} y={y + 33} textAnchor="middle" fontSize="4.6" fontWeight="900" fill="#0f172a">
          OFF
        </text>
        <text x={cx + 21} y={y + 35} textAnchor="middle" fontSize="4.4" fontWeight="900" fill={mode === 'auto' ? '#0284c7' : '#475569'}>
          AUTO
        </text>

        {/* Winged Selector Handle */}
        <g
          transform={`translate(${cx}, ${cy})`}
          onMouseDown={stopCanvas}
          onClick={(e) => {
            const nextMode = mode === 'hand' ? 'off' : mode === 'off' ? 'auto' : 'hand';
            patch({ mode: nextMode }, e);
          }}
          className="cursor-pointer"
        >
          <title>{`Click to switch HAND → OFF → AUTO (${tag})`}</title>
          <circle r={15} fill="#94a3b8" stroke="#0f172a" strokeWidth={1.1} />
          <circle r={12.5} fill="#1e293b" />
          <g transform={`rotate(${rotDeg})`}>
            <rect x={-2.8} y={-12} width={5.6} height={24} rx={1.8} fill="#0f172a" stroke="#64748b" strokeWidth={0.8} />
            <rect x={-1.4} y={-11} width={2.8} height={8} rx={1} fill="#ffffff" />
          </g>
        </g>

        {/* Bottom Silkscreen + Terminal Pocket */}
        <rect x={x + 3} y={y + height - 25} width={width - 6} height={7} fill="#0f172a" />
        <text x={x + width * 0.25} y={y + height - 19.8} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#6ee7b7">
          HAND
        </text>
        <text x={x + width * 0.75} y={y + height - 19.8} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#38bdf8">
          AUTO
        </text>
        <rect x={x + 3} y={y + height - 18} width={width - 6} height={16} rx={2} fill="#1f2937" />

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  if (type === 'limit_switch') {
    const actuated = !!state.actuated;
    const tag = state.tag || 'LS1';

    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 3} width={width} height={height} rx={4} fill="rgba(15,23,42,0.16)" />
        <rect x={x} y={y} width={width} height={height} rx={4} fill="#0369a1" stroke="#0f172a" strokeWidth={1.3} />

        {/* Top Bay + Labels */}
        <rect x={x + 3} y={y + 2} width={width - 6} height={21} rx={2} fill="#1f2937" />
        <rect x={x + 3} y={y + 23} width={width - 6} height={7.5} fill="#0f172a" />
        <text x={x + width * 0.28} y={y + 28.4} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
          11 NC
        </text>
        <text x={x + width * 0.72} y={y + 28.4} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#6ee7b7">
          13 NO
        </text>

        {/* Roller Lever Mechanism (clean center clearance) */}
        <g transform={`translate(${x + width / 2}, ${y + 54})`} onMouseDown={stopCanvas} onClick={(e) => patch({ actuated: !actuated }, e)} className="cursor-pointer">
          <title>{`Click roller lever to actuate/release (${tag})`}</title>
          <rect x={-11} y={-8} width={22} height={16} rx={2} fill="#1f2937" stroke="#0f172a" strokeWidth={0.9} />
          <g transform={`rotate(${actuated ? 35 : -25})`} style={{ transition: 'transform 120ms' }}>
            <rect x={-2} y={-19} width={4} height={19} rx={1.5} fill="#cbd5e1" stroke="#334155" strokeWidth={0.8} />
            <circle cx={0} cy={-19} r={4.5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.1} />
          </g>
        </g>

        <text x={x + width / 2} y={y + 73} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
          {tag}: {actuated ? 'TRIP' : 'NORM'}
        </text>

        {/* Bottom Silkscreen + Bay */}
        <rect x={x + 3} y={y + height - 26.5} width={width - 6} height={7.5} fill="#0f172a" />
        <text x={x + width * 0.28} y={y + height - 21} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
          12 NC
        </text>
        <text x={x + width * 0.72} y={y + height - 21} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#6ee7b7">
          14 NO
        </text>
        <rect x={x + 3} y={y + height - 19} width={width - 6} height={17} rx={2} fill="#1f2937" />

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  // vfd_drive
  const isOn = state.isOn !== false;
  const freqHz = typeof state.freqHz === 'number' ? state.freqHz : 60;
  const running = !!state.running;
  const tag = state.tag || 'VFD1';

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15,23,42,0.18)" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#334155" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Bay + Silkscreen */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={16} rx={2} fill="#1f2937" />
      <rect x={x + 3} y={y + 18} width={width - 6} height={7.5} fill="#0f172a" />
      {terminals
        .filter((t) => t.relY < 0.5)
        .map((t) => (
          <text
            key={`vt-${t.id}`}
            x={x + t.relX * width}
            y={y + 23.4}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill={t.type === 'earth' ? '#4ade80' : '#fca5a5'}
          >
            {t.label}
          </text>
        ))}

      {/* Inner Faceplate */}
      <rect x={x + 6} y={y + 27} width={width - 12} height={height - 54} rx={3} fill="#e5e7eb" stroke="#0f172a" strokeWidth={1} />
      <rect x={x + 8} y={y + 29} width={width - 16} height={12} rx={1.5} fill="#15803d" />
      <text x={x + width / 2} y={y + 37.2} textAnchor="middle" fontSize="5.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
        ALTIVAR VFD ({tag})
      </text>

      {/* 7-Segment Display */}
      <rect x={x + 14} y={y + 44} width={width - 28} height={26} rx={2.5} fill="#090d16" stroke="#334155" strokeWidth={1} />
      <text x={x + width / 2} y={y + 62} textAnchor="middle" fontSize="12.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill={isOn ? (running ? '#ef4444' : '#f97316') : '#475569'}>
        {isOn ? `${freqHz.toFixed(1)} Hz` : 'OFF'}
      </text>

      {/* Keypad */}
      <g transform={`translate(${x + 14}, ${y + 74})`} onMouseDown={stopCanvas}>
        <g className="cursor-pointer" onClick={(e) => patch({ freqHz: Math.max(10, freqHz - 10) }, e)}>
          <rect x={0} y={0} width={28} height={15} rx={2} fill="#334155" />
          <text x={14} y={10} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#ffffff">-Hz</text>
        </g>
        <g className="cursor-pointer" onClick={(e) => patch({ freqHz: Math.min(60, freqHz + 10) }, e)}>
          <rect x={32} y={0} width={28} height={15} rx={2} fill="#334155" />
          <text x={46} y={10} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#ffffff">+Hz</text>
        </g>
        <g className="cursor-pointer" onClick={(e) => patch({ isOn: !isOn }, e)}>
          <rect x={64} y={0} width={44} height={15} rx={2} fill={isOn ? '#16a34a' : '#dc2626'} />
          <text x={86} y={10} textAnchor="middle" fontSize="6.2" fontWeight="900" fill="#ffffff">{isOn ? 'RUN' : 'STOP'}</text>
        </g>
      </g>

      {/* Heatsink Vents */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x + 15 + i * 22} y={y + 96} width={15} height={36} rx={1.5} fill="#94a3b8" stroke="#64748b" strokeWidth={0.5} />
      ))}

      {/* Bottom Silkscreen + Terminal Bay */}
      <rect x={x + 3} y={y + height - 25.5} width={width - 6} height={7.5} fill="#0f172a" />
      {terminals
        .filter((t) => t.relY >= 0.5)
        .map((t) => (
          <text
            key={`vb-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 20}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill="#38bdf8"
          >
            {t.label}
          </text>
        ))}
      <rect x={x + 3} y={y + height - 18} width={width - 6} height={16} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
