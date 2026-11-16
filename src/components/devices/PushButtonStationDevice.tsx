import React from 'react';
import { DeviceComponentProps, DeviceTerminals, momentaryPress } from './DeviceTerminals';

/**
 * EduVolt-style 2-button 22mm operator station: START (momentary NO 3-4) above STOP (momentary NC 1-2).
 * Embedded top/bottom contact block silkscreen bands prevent label overlap.
 */
export const PushButtonStationDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isStartPressed = !!device.state.startPressed;
  const isStopPressed = !!device.state.stopPressed;
  const cx = x + width / 2;

  const press = (e: React.MouseEvent, key: 'startPressed' | 'stopPressed') => {
    if (onPatchState) momentaryPress(e, device.id, key, onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, [key]: !device.state[key] } });
    }
  };

  return (
    <g id={`device-${device.id}`} className="select-none">
      {/* Subtle CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />

      {/* Outer Enclosure Housing */}
      <rect x={x} y={y} width={width} height={height} rx={5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Top Contact Block Pocket + Embedded Labels */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={17} rx={2} fill="var(--mat-housing-dark)" />
      <rect x={x + 3} y={y + 19} width={width - 6} height={7.5} fill="var(--mat-line)" />
      <text x={x + width * 0.22} y={y + 24.4} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-green-on)">
        3 NO
      </text>
      <text x={x + width * 0.78} y={y + 24.4} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-green-on)">
        4 NO
      </text>

      {/* Main Front Plate */}
      <rect x={x + 4} y={y + 27.5} width={width - 8} height={height - 55} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth={0.9} />

      {/* START Legend + 22mm Flush Actuator */}
      <rect x={cx - 19} y={y + 30} width={38} height={8.5} rx={1.5} fill="var(--lamp-green-off)" />
      <text x={cx} y={y + 36} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="var(--font-display)" fill="#f0fdf4">
        START
      </text>
      <g transform={`translate(${cx}, ${y + 53})`} className="cursor-pointer" onMouseDown={(e) => press(e, 'startPressed')} onClick={(e) => e.stopPropagation()}>
        <title>START — momentary Normally Open 3-4 (hold to press)</title>
        <circle r={13.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
        <circle r={11.5} fill="var(--mat-housing-dark)" />
        <circle r={isStartPressed ? 8.5 : 10} fill={isStartPressed ? 'var(--cond-green)' : 'var(--lamp-green-on)'} stroke="var(--lamp-green-off)" strokeWidth={0.9} />
        <text x={0} y={3.4} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="var(--silk-on-dark)">
          I
        </text>
      </g>

      {/* STOP Legend + 22mm Flush Actuator */}
      <rect x={cx - 19} y={y + 72} width={38} height={8.5} rx={1.5} fill="var(--lamp-red-off)" />
      <text x={cx} y={y + 78} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="var(--font-display)" fill="#fef2f2">
        STOP
      </text>
      <g transform={`translate(${cx}, ${y + 95})`} className="cursor-pointer" onMouseDown={(e) => press(e, 'stopPressed')} onClick={(e) => e.stopPropagation()}>
        <title>STOP — momentary Normally Closed 1-2 (hold to open)</title>
        <circle r={13.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
        <circle r={11.5} fill="var(--mat-housing-dark)" />
        <circle r={isStopPressed ? 8.5 : 10} fill={isStopPressed ? 'var(--act-red)' : 'var(--act-red)'} stroke="var(--lamp-red-off)" strokeWidth={0.9} />
        <circle r={3.6} fill="none" stroke="var(--mat-housing)" strokeWidth={1.7} />
      </g>

      {/* Bottom Embedded Labels + Contact Block Pocket */}
      <rect x={x + 3} y={y + height - 26.5} width={width - 6} height={7.5} fill="var(--mat-line)" />
      <text x={x + width * 0.22} y={y + height - 21} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-amber-on)">
        1 NC
      </text>
      <text x={x + width * 0.78} y={y + height - 21} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-amber-on)">
        2 NC
      </text>
      <rect x={x + 3} y={y + height - 19} width={width - 6} height={17} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
