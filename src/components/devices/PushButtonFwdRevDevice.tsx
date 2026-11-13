import React from 'react';
import { DeviceComponentProps, DeviceTerminals, momentaryPress } from './DeviceTerminals';

const BUTTONS = [
  { key: 'stopPressed', rel: 0.18, topTxt: '1NC', botTxt: '2NC', legend: 'STOP', sub: 'NC 1-2', cap: '#ef4444', capDown: '#b91c1c', ring: '#7f1d1d', glyph: 'O', lblFill: '#fcd34d' },
  { key: 'fwdPressed', rel: 0.50, topTxt: '3NO', botTxt: '4NO', legend: 'FWD', sub: 'NO 3-4', cap: '#22c55e', capDown: '#15803d', ring: '#14532d', glyph: '▶', lblFill: '#6ee7b7' },
  { key: 'revPressed', rel: 0.82, topTxt: '5NO', botTxt: '6NO', legend: 'REV', sub: 'NO 5-6', cap: '#f59e0b', capDown: '#b45309', ring: '#78350f', glyph: '◀', lblFill: '#6ee7b7' },
] as const;

/**
 * EduVolt-style 3-button Forward/Reverse/Stop pendant station.
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
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15,23,42,0.16)" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Terminal Bay + Silkscreen Band */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={16} rx={2} fill="#1f2937" />
      <rect x={x + 3} y={y + 18} width={width - 6} height={7.5} fill="#0f172a" />

      {/* Center Aluminum/Gray Faceplate */}
      <rect x={x + 4} y={y + 26.5} width={width - 8} height={height - 53} rx={3} fill="#e5e7eb" stroke="#64748b" strokeWidth={0.9} />

      {BUTTONS.map((b) => {
        const cx = x + width * b.rel;
        const cy = y + 60;
        const pressed = !!device.state[b.key];
        return (
          <g key={b.key}>
            <text x={cx} y={y + 23.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill={b.lblFill}>
              {b.topTxt}
            </text>
            <text x={cx} y={y + height - 20} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill={b.lblFill}>
              {b.botTxt}
            </text>

            {/* Legend Plate */}
            <rect x={cx - 15} y={y + 30} width={30} height={10} rx={1.5} fill="#111827" />
            <text x={cx} y={y + 37.2} textAnchor="middle" fontSize="5.4" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#f9fafb">
              {b.legend}
            </text>

            {/* Pushbutton Bezel & Plunger */}
            <g transform={`translate(${cx}, ${cy})`} className="cursor-pointer" onMouseDown={(e) => press(e, b.key)} onClick={(e) => e.stopPropagation()}>
              <title>{b.legend} ({b.sub}) — momentary, hold to press</title>
              <circle r={13.5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1} />
              <circle r={11.5} fill="#1f2937" />
              <circle r={pressed ? 8.5 : 10} fill={pressed ? b.capDown : b.cap} stroke={b.ring} strokeWidth={0.9} />
              <text x={0} y={2.8} textAnchor="middle" fontSize="7.2" fontWeight="900" fill="#ffffff">
                {b.glyph}
              </text>
            </g>

            <text x={cx} y={y + 84} textAnchor="middle" fontSize="4.3" fontWeight="800" fontFamily="ui-monospace, monospace" fill="#334155">
              {b.sub}
            </text>
          </g>
        );
      })}

      {/* Bottom Silkscreen Band + Contact Terminal Pocket */}
      <rect x={x + 3} y={y + height - 25.5} width={width - 6} height={7.5} fill="#0f172a" />
      <rect x={x + 3} y={y + height - 18} width={width - 6} height={16} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
