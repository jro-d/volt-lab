import React from 'react';
import { DeviceComponentProps, DeviceTerminals, momentaryPress } from './DeviceTerminals';

const BUTTONS = [
  { key: 'stopPressed', rel: 0.18, legend: 'STOP', sub: 'NC 1-2', cap: '#ef4444', capDown: '#b91c1c', ring: '#7f1d1d', glyph: 'O' },
  { key: 'fwdPressed', rel: 0.5, legend: 'FWD', sub: 'NO 3-4', cap: '#22c55e', capDown: '#15803d', ring: '#14532d', glyph: '▶' },
  { key: 'revPressed', rel: 0.82, legend: 'REV', sub: 'NO 5-6', cap: '#f59e0b', capDown: '#b45309', ring: '#78350f', glyph: '◀' },
] as const;

/**
 * 3-hole 22mm operator station: STOP (NC 1-2), FORWARD (NO 3-4), REVERSE (NO 5-6).
 * All three are momentary (spring-return) — hold the mouse button to keep a button pressed.
 */
export const PushButtonFwdRevDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { x, y, width, height } = device;

  const press = (e: React.MouseEvent, key: string) => {
    if (onPatchState) momentaryPress(e, device.id, key, onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, [key]: !device.state[key] } });
    }
  };

  return (
    <g id={`device-${device.id}`}>
      {/* Enclosure base + cover */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="#9ca3af"
        stroke="#4b5563"
        strokeWidth={1.4}
        filter="drop-shadow(0 6px 14px rgba(15,23,42,0.2))"
      />
      <rect x={x + 4} y={y + 18} width={width - 8} height={height - 36} rx={6} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.8} />
      {/* Contact-block terminal strips */}
      <rect x={x + 4} y={y + 2} width={width - 8} height={15} rx={3} fill="#1f2937" />
      <rect x={x + 4} y={y + height - 17} width={width - 8} height={15} rx={3} fill="#1f2937" />
      {/* Cover screws */}
      {[
        [x + 9, y + 23],
        [x + width - 9, y + 23],
        [x + 9, y + height - 23],
        [x + width - 9, y + height - 23],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={2.2} fill="#d1d5db" stroke="#4b5563" strokeWidth={0.5} />
          <line x1={cx - 1.2} y1={cy} x2={cx + 1.2} y2={cy} stroke="#4b5563" strokeWidth={0.5} />
        </g>
      ))}

      {BUTTONS.map((b) => {
        const cx = x + width * b.rel;
        const cy = y + height / 2 + 4;
        const pressed = !!device.state[b.key];
        return (
          <g key={b.key}>
            {/* Legend plate */}
            <rect x={cx - 15} y={y + 31} width={30} height={11} rx={1.5} fill="#111827" />
            <text x={cx} y={y + 39} textAnchor="middle" fontSize="6.4" fontWeight="900" fill="#f9fafb" fontFamily="ui-sans-serif, system-ui">
              {b.legend}
            </text>
            {/* Button */}
            <g
              transform={`translate(${cx}, ${cy})`}
              className="cursor-pointer"
              onMouseDown={(e) => press(e, b.key)}
              onClick={(e) => e.stopPropagation()}
            >
              <title>{b.legend} ({b.sub}) — momentary, hold to press</title>
              <circle r={15} fill="#d1d5db" stroke="#6b7280" strokeWidth={1} />
              <circle r={12.5} fill="#1f2937" />
              <circle
                r={pressed ? 9.5 : 11}
                fill={pressed ? b.capDown : b.cap}
                stroke={b.ring}
                strokeWidth={1}
                filter={pressed ? undefined : 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))'}
                style={{ transition: 'r 80ms' }}
              />
              <circle r={pressed ? 6 : 7} fill="#ffffff" opacity={0.15} cx={-2} cy={-2} />
              <text x={0} y={3} textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff">
                {b.glyph}
              </text>
            </g>
            <text x={cx} y={cy + 24} textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#374151" fontFamily="ui-monospace, monospace">
              {b.sub}
            </text>
          </g>
        );
      })}

      <DeviceTerminals
        {...props}
        labelColor={(t) => (t.type === 'no' ? '#6ee7b7' : '#fcd34d')}
      />
    </g>
  );
};
