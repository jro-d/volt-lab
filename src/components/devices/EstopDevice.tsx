import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style Yellow NEMA 4X Emergency Stop Twist-to-Release Station.
 * Non-overlapping header, mushroom button, state strip, and embedded 11-12 NC label band.
 */
export const EstopDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isLatched = !!device.state.estopActive;
  const cx = x + width / 2;
  const mushCy = y + 36;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, { estopActive: !isLatched });
    else onToggleState?.({ ...device, state: { ...device.state, estopActive: !isLatched } });
  };

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15, 23, 42, 0.16)" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#facc15" stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Safety Header Strip */}
      <rect x={x + 3} y={y + 3} width={width - 6} height={11} rx={2} fill="#991b1b" />
      <text x={cx} y={y + 10.4} textAnchor="middle" fontSize="4.5" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#fef08a" letterSpacing="0.4">
        EMERGENCY STOP
      </text>

      {/* Anti-Tamper Collar + 40mm Mushroom Cap */}
      <circle cx={cx} cy={mushCy} r={19} fill="#fef08a" stroke="#713f12" strokeWidth={1} />
      <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
        <title>Click Emergency Stop to latch / twist-release NC 11-12 contacts</title>
        <circle cx={cx} cy={mushCy} r={15.5} fill="#7f1d1d" />
        <circle
          cx={cx}
          cy={mushCy}
          r={isLatched ? 12.5 : 14.5}
          fill={isLatched ? '#b91c1c' : '#ef4444'}
          stroke="#450a0a"
          strokeWidth={1.1}
        />
        <path d={`M ${cx - 6} ${mushCy + 1} A 6 6 0 0 1 ${cx + 6} ${mushCy + 1}`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.3} strokeLinecap="round" />
        <polygon points={`${cx + 6},${mushCy + 1} ${cx + 3.5},${mushCy - 1.5} ${cx + 8},${mushCy - 1.5}`} fill="#ffffff" />
      </g>

      {/* Crisp State Indicator Strip cleanly below ring */}
      <rect x={x + 6} y={y + 56.5} width={width - 12} height={8.5} rx={1.5} fill="#0f172a" />
      <text x={cx} y={y + 62.6} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill={isLatched ? '#f87171' : '#4ade80'}>
        {isLatched ? 'LATCHED · OPEN' : 'ARMED · CLOSED'}
      </text>

      {/* Embedded Bottom Silkscreen + Terminal Pocket */}
      <rect x={x + 3} y={y + 67} width={width - 6} height={7.5} fill="#1e293b" />
      <text x={x + width * 0.32} y={y + 72.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
        11 NC
      </text>
      <text x={x + width * 0.68} y={y + 72.5} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#fcd34d">
        12 NC
      </text>
      <rect x={x + 3} y={y + 74.5} width={width - 6} height={height - 76.5} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
