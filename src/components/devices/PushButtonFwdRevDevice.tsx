import React from 'react';
import { DeviceComponentProps, DeviceTerminals, momentaryPress } from './DeviceTerminals';

const BUTTONS = [
  { key: 'stopPressed', rel: 0.18, topTxt: '1NC', botTxt: '2NC', legend: 'STOP', sub: 'NC 1-2', cap: 'var(--act-red)', capDown: 'var(--act-red)', ring: 'var(--lamp-red-off)', glyph: 'O', lblFill: 'var(--lamp-amber-on)' },
  { key: 'fwdPressed', rel: 0.50, topTxt: '3NO', botTxt: '4NO', legend: 'FWD', sub: 'NO 3-4', cap: 'var(--lamp-green-on)', capDown: 'var(--cond-green)', ring: 'var(--lamp-green-off)', glyph: '▶', lblFill: 'var(--lamp-green-on)' },
  { key: 'revPressed', rel: 0.82, topTxt: '5NO', botTxt: '6NO', legend: 'REV', sub: 'NO 5-6', cap: 'var(--lamp-amber-on)', capDown: 'var(--mat-copper)', ring: 'var(--mat-copper-dark)', glyph: '◀', lblFill: 'var(--lamp-green-on)' },
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
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Top Terminal Bay + Silkscreen Band */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={16} rx={2} fill="var(--mat-housing-dark)" />
      <rect x={x + 3} y={y + 18} width={width - 6} height={7.5} fill="var(--mat-line)" />

      {/* Center Aluminum/Gray Faceplate */}
      <rect x={x + 4} y={y + 26.5} width={width - 8} height={height - 53} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth={0.9} />

      {BUTTONS.map((b) => {
        const cx = x + width * b.rel;
        const cy = y + 60;
        const pressed = !!device.state[b.key];
        return (
          <g key={b.key}>
            <text x={cx} y={y + 23.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill={b.lblFill}>
              {b.topTxt}
            </text>
            <text x={cx} y={y + height - 20} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill={b.lblFill}>
              {b.botTxt}
            </text>

            {/* Legend Plate */}
            <rect x={cx - 15} y={y + 30} width={30} height={10} rx={1.5} fill="var(--nameplate)" />
            <text x={cx} y={y + 37.2} textAnchor="middle" fontSize="5.4" fontWeight="900" fontFamily="var(--font-display)" fill="var(--mat-housing)">
              {b.legend}
            </text>

            {/* Pushbutton Bezel & Plunger */}
            <g transform={`translate(${cx}, ${cy})`} className="cursor-pointer" onMouseDown={(e) => press(e, b.key)} onClick={(e) => e.stopPropagation()}>
              <title>{b.legend} ({b.sub}) — momentary, hold to press</title>
              <circle r={13.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
              <circle r={11.5} fill="var(--mat-housing-dark)" />
              <circle r={pressed ? 8.5 : 10} fill={pressed ? b.capDown : b.cap} stroke={b.ring} strokeWidth={0.9} />
              <text x={0} y={2.8} textAnchor="middle" fontSize="7.2" fontWeight="900" fill="var(--silk-on-dark)">
                {b.glyph}
              </text>
            </g>

            <text x={cx} y={y + 84} textAnchor="middle" fontSize="4.3" fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk)">
              {b.sub}
            </text>
          </g>
        );
      })}

      {/* Bottom Silkscreen Band + Contact Terminal Pocket */}
      <rect x={x + 3} y={y + height - 25.5} width={width - 6} height={7.5} fill="var(--mat-line)" />
      <rect x={x + 3} y={y + height - 18} width={width - 6} height={16} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
