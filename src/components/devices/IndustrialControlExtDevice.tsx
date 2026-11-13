import React from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

export const IndustrialControlExtDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, state } = device;

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
        <rect x={x + 2} y={y + 4} width={width} height={height} rx={7} fill="rgba(15,23,42,0.22)" />
        <rect x={x} y={y} width={width} height={height} rx={7} fill="#f8fafc" stroke="#475569" strokeWidth={1.6} />
        <rect x={x + 4} y={y + 2} width={width - 8} height={18} rx={3} fill="#1e293b" />
        <rect x={x + 4} y={y + height - 20} width={width - 8} height={18} rx={3} fill="#1e293b" />

        {/* Schneider green header stripe */}
        <rect x={x + 4} y={y + 22} width={width - 8} height={14} rx={2} fill="#15803d" />
        <text x={x + 10} y={y + 32} fontSize="7" fontWeight="900" fill="#ffffff" fontFamily="monospace">
          {tag} TIMER
        </text>
        {/* LEDs: UN & R */}
        <circle cx={x + width - 22} cy={y + 29} r={3} fill={energized ? '#4ade80' : '#14532d'} />
        <circle cx={x + width - 12} cy={y + 29} r={3} fill={timedOut ? '#fbbf24' : '#78350f'} />

        {/* Rotary Time Setting Dial (Click to cycle 2s / 5s / 10s / 15s) */}
        <g
          transform={`translate(${x + width / 2}, ${y + 58})`}
          className="cursor-pointer"
          onClick={(e) => {
            const presets = [2, 5, 10, 15];
            const idx = presets.indexOf(delaySec);
            const nextDelay = presets[(idx + 1) % presets.length];
            patch({ delaySec: nextDelay, elapsedSec: 0, timedOut: false }, e);
          }}
        >
          <title>Click dial to cycle On-Delay time (2s / 5s / 10s / 15s)</title>
          <circle r={17} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.2} />
          <circle r={13} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.9} />
          <circle r={16.5} fill="none" stroke={energized ? '#f59e0b' : 'transparent'} strokeWidth={2.5} strokeDasharray={`${Math.min(1, elapsedSec / Math.max(0.1, delaySec)) * 104} 104`} />
          <text x={0} y={3.5} textAnchor="middle" fontSize="8" fontWeight="900" fill="#0f172a" fontFamily="monospace">
            {delaySec}s
          </text>
        </g>

        <text x={x + width / 2} y={y + 84} textAnchor="middle" fontSize="6.5" fontWeight="800" fill={timedOut ? '#d97706' : energized ? '#16a34a' : '#64748b'} fontFamily="monospace">
          {timedOut ? '15-18 CLOSED' : energized ? `T=${elapsedSec.toFixed(1)}s` : 'IDLE'}
        </text>

        <DeviceTerminals {...props} />
      </g>
    );
  }

  if (type === 'selector_hoa') {
    const mode: 'hand' | 'off' | 'auto' = state.mode || 'off';
    const tag = state.tag || 'HOA1';
    const cx = x + width / 2;
    const cy = y + height * 0.54;
    const rotDeg = mode === 'hand' ? -45 : mode === 'auto' ? 45 : 0;

    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 4} width={width} height={height} rx={8} fill="rgba(15,23,42,0.22)" />
        <rect x={x} y={y} width={width} height={height} rx={8} fill="#cbd5e1" stroke="#475569" strokeWidth={1.5} />
        <rect x={x + 4} y={y + 2} width={width - 8} height={16} rx={3} fill="#1e293b" />
        <rect x={x + 4} y={y + height - 18} width={width - 8} height={16} rx={3} fill="#1e293b" />

        <text x={cx} y={y + 28} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">
          H  O  A
        </text>
        <text x={cx - 18} y={y + 38} textAnchor="middle" fontSize="5.5" fontWeight="800" fill={mode === 'hand' ? '#16a34a' : '#475569'}>
          HAND
        </text>
        <text x={cx + 18} y={y + 38} textAnchor="middle" fontSize="5.5" fontWeight="800" fill={mode === 'auto' ? '#0284c7' : '#475569'}>
          AUTO
        </text>

        {/* Winged 22mm Selector Knob */}
        <g
          transform={`translate(${cx}, ${cy})`}
          className="cursor-pointer"
          onClick={(e) => {
            const nextMode = mode === 'hand' ? 'off' : mode === 'off' ? 'auto' : 'hand';
            patch({ mode: nextMode }, e);
          }}
        >
          <title>Click to switch HAND → OFF → AUTO ({tag})</title>
          <circle r={17} fill="#94a3b8" stroke="#475569" strokeWidth={1.1} />
          <circle r={14} fill="#1e293b" />
          <g transform={`rotate(${rotDeg})`}>
            <rect x={-3} y={-14} width={6} height={28} rx={2} fill="#0f172a" stroke="#64748b" strokeWidth={0.8} />
            <rect x={-1.5} y={-13} width={3} height={9} rx={1} fill="#ffffff" />
          </g>
        </g>

        <DeviceTerminals {...props} />
      </g>
    );
  }

  if (type === 'limit_switch') {
    const actuated = !!state.actuated;
    const tag = state.tag || 'LS1';

    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 4} width={width} height={height} rx={7} fill="rgba(15,23,42,0.22)" />
        {/* Industrial blue die-cast body */}
        <rect x={x + 6} y={y + 24} width={width - 12} height={height - 28} rx={5} fill="#0369a1" stroke="#0c4a6e" strokeWidth={1.6} />
        <rect x={x + 4} y={y + 2} width={width - 8} height={20} rx={3} fill="#1e293b" />
        <rect x={x + 4} y={y + height - 20} width={width - 8} height={18} rx={3} fill="#1e293b" />

        {/* Roller Lever Turret */}
        <g
          transform={`translate(${x + width / 2}, ${y + 42})`}
          className="cursor-pointer"
          onClick={(e) => patch({ actuated: !actuated }, e)}
        >
          <title>Click to actuate / release limit switch roller lever ({tag})</title>
          <rect x={-12} y={-12} width={24} height={22} rx={3} fill="#334155" stroke="#0f172a" strokeWidth={1} />
          <g transform={`rotate(${actuated ? 35 : -25})`} style={{ transition: 'transform 120ms' }}>
            <rect x={-2} y={-24} width={4} height={24} rx={1.5} fill="#cbd5e1" stroke="#475569" strokeWidth={0.8} />
            <circle cx={0} cy={-24} r={5} fill="#f8fafc" stroke="#1e293b" strokeWidth={1.2} />
            <circle cx={0} cy={-24} r={2} fill="#1e293b" />
          </g>
        </g>

        <text x={x + width / 2} y={y + 74} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#ffffff" fontFamily="monospace">
          {tag}: {actuated ? 'TRIP' : 'NORM'}
        </text>

        <DeviceTerminals {...props} />
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
      <rect x={x + 3} y={y + 5} width={width} height={height} rx={8} fill="rgba(15,23,42,0.28)" />
      {/* Dark Charcoal Heatsink Chassis */}
      <rect x={x} y={y} width={width} height={height} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={1.8} />
      <rect x={x + 8} y={y + 20} width={width - 16} height={height - 40} rx={5} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />

      {/* Top/Bottom Power Terminal Guards */}
      <rect x={x + 4} y={y + 2} width={width - 8} height={18} rx={3} fill="#0f172a" />
      <rect x={x + 4} y={y + height - 20} width={width - 8} height={18} rx={3} fill="#0f172a" />

      {/* Schneider Green Header */}
      <rect x={x + 12} y={y + 24} width={width - 24} height={14} rx={2} fill="#15803d" />
      <text x={x + width / 2} y={y + 33.5} textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">
        ALTIVAR VFD ({tag})
      </text>

      {/* 7-Segment LED Keypad Display */}
      <rect x={x + 18} y={y + 44} width={width - 36} height={32} rx={4} fill="#090d16" stroke="#334155" strokeWidth={1.2} />
      <text x={x + width / 2} y={y + 66} textAnchor="middle" fontSize="15" fontWeight="900" fill={isOn ? (running ? '#ef4444' : '#f97316') : '#334155'} fontFamily="monospace">
        {isOn ? `${freqHz.toFixed(1)} Hz` : 'OFF'}
      </text>

      {/* Keypad Buttons: -Hz | +Hz | RUN/STOP */}
      <g transform={`translate(${x + 18}, ${y + 84})`}>
        <g
          className="cursor-pointer"
          onClick={(e) => patch({ freqHz: Math.max(10, freqHz - 10) }, e)}
        >
          <rect x={0} y={0} width={28} height={18} rx={3} fill="#334155" />
          <text x={14} y={12} textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff">-Hz</text>
        </g>
        <g
          className="cursor-pointer"
          onClick={(e) => patch({ freqHz: Math.min(60, freqHz + 10) }, e)}
        >
          <rect x={32} y={0} width={28} height={18} rx={3} fill="#334155" />
          <text x={46} y={12} textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff">+Hz</text>
        </g>
        <g
          className="cursor-pointer"
          onClick={(e) => patch({ isOn: !isOn }, e)}
        >
          <rect x={64} y={0} width={36} height={18} rx={3} fill={isOn ? '#16a34a' : '#dc2626'} />
          <text x={82} y={12} textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">
            {isOn ? 'RUN' : 'STOP'}
          </text>
        </g>
      </g>

      {/* Heatsink vent slots */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x + 18 + i * 21} y={y + 112} width={14} height={22} rx={2} fill="#94a3b8" />
      ))}

      <DeviceTerminals {...props} />
    </g>
  );
};
