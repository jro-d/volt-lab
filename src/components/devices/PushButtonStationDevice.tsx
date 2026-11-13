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
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15,23,42,0.16)" />

      {/* Outer Enclosure Housing */}
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Contact Block Pocket + Embedded Labels */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={17} rx={2} fill="#1f2937" />
      <rect x={x + 3} y={y + 19} width={width - 6} height={7.5} fill="#0f172a" />
      <text x={x + width * 0.22} y={y + 24.4} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#6ee7b7">
        3 NO
      </text>
      <text x={x + width * 0.78} y={y + 24.4} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#6ee7b7">
        4 NO
      </text>

      {/* Main Front Plate */}
      <rect x={x + 4} y={y + 27.5} width={width - 8} height={height - 55} rx={3} fill="#e5e7eb" stroke="#64748b" strokeWidth={0.9} />

      {/* START Legend + 22mm Flush Actuator */}
      <rect x={cx - 19} y={y + 30} width={38} height={8.5} rx={1.5} fill="#14532d" />
      <text x={cx} y={y + 36} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#f0fdf4">
        START
      </text>
      <g transform={`translate(${cx}, ${y + 53})`} className="cursor-pointer" onMouseDown={(e) => press(e, 'startPressed')} onClick={(e) => e.stopPropagation()}>
        <title>START — momentary Normally Open 3-4 (hold to press)</title>
        <circle r={13.5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1} />
        <circle r={11.5} fill="#1f2937" />
        <circle r={isStartPressed ? 8.5 : 10} fill={isStartPressed ? '#15803d' : '#22c55e'} stroke="#14532d" strokeWidth={0.9} />
        <text x={0} y={3.4} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff">
          I
        </text>
      </g>

      {/* STOP Legend + 22mm Flush Actuator */}
      <rect x={cx - 19} y={y + 72} width={38} height={8.5} rx={1.5} fill="#7f1d1d" />
      <text x={cx} y={y + 78} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#fef2f2">
        STOP
      </text>
      <g transform={`translate(${cx}, ${y + 95})`} className="cursor-pointer" onMouseDown={(e) => press(e, 'stopPressed')} onClick={(e) => e.stopPropagation()}>
        <title>STOP — momentary Normally Closed 1-2 (hold to open)</title>
        <circle r={13.5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1} />
        <circle r={11.5} fill="#1f2937" />
        <circle r={isStopPressed ? 8.5 : 10} fill={isStopPressed ? '#b91c1c' : '#ef4444'} stroke="#7f1d1d" strokeWidth={0.9} />
        <circle r={3.6} fill="none" stroke="#ffffff" strokeWidth={1.7} />
      </g>

      {/* Bottom Embedded Labels + Contact Block Pocket */}
      <rect x={x + 3} y={y + height - 26.5} width={width - 6} height={7.5} fill="#0f172a" />
      <text x={x + width * 0.22} y={y + height - 21} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
        1 NC
      </text>
      <text x={x + width * 0.78} y={y + height - 21} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
        2 NC
      </text>
      <rect x={x + 3} y={y + height - 19} width={width - 6} height={17} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
