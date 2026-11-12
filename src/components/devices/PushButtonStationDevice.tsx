import React from 'react';
import { DeviceComponentProps, DeviceTerminals, momentaryPress } from './DeviceTerminals';

/**
 * 2-hole 22mm operator station: green START (momentary NO 3-4) above red STOP (momentary NC 1-2).
 * Top terminal strip carries the START contact block, bottom strip the STOP contact block.
 */
export const PushButtonStationDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height } = device;
  const isStartPressed = !!device.state.startPressed;
  const isStopPressed = !!device.state.stopPressed;
  const cx = x + width / 2;
  const startCy = y + height * 0.43;
  const stopCy = y + height * 0.75;

  const press = (e: React.MouseEvent, key: 'startPressed' | 'stopPressed') => {
    if (onPatchState) momentaryPress(e, device.id, key, onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, [key]: !device.state[key] } });
    }
  };

  const Button = ({
    cy,
    pressed,
    cap,
    capDown,
    ring,
    keyName,
    title,
    children,
  }: {
    cy: number;
    pressed: boolean;
    cap: string;
    capDown: string;
    ring: string;
    keyName: 'startPressed' | 'stopPressed';
    title: string;
    children: React.ReactNode;
  }) => (
    <g
      transform={`translate(${cx}, ${cy})`}
      className="cursor-pointer"
      onMouseDown={(e) => press(e, keyName)}
      onClick={(e) => e.stopPropagation()}
    >
      <title>{title}</title>
      {/* chrome bezel */}
      <circle r={17} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1.1} />
      <circle r={14.5} fill="#1f2937" />
      <circle
        r={pressed ? 10.5 : 12.5}
        fill={pressed ? capDown : cap}
        stroke={ring}
        strokeWidth={1}
        filter={pressed ? undefined : 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))'}
        style={{ transition: 'r 80ms' }}
      />
      <ellipse cx={-3} cy={-4} rx={6} ry={3.5} fill="#ffffff" opacity={pressed ? 0.08 : 0.22} />
      {children}
    </g>
  );

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
      <rect x={x + 3} y={y + 20} width={width - 6} height={height - 40} rx={6} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.8} />
      {/* Contact-block terminal strips */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={16} rx={3} fill="#1f2937" />
      <rect x={x + 3} y={y + height - 18} width={width - 6} height={16} rx={3} fill="#1f2937" />

      {/* Legend plates */}
      <rect x={cx - 21} y={y + 31} width={42} height={10} rx={1.5} fill="#14532d" />
      <text x={cx} y={y + 38.4} textAnchor="middle" fontSize="6.2" fontWeight="900" fill="#f0fdf4" fontFamily="ui-sans-serif, system-ui">
        START
      </text>
      <rect x={cx - 21} y={y + height * 0.59 - 5} width={42} height={10} rx={1.5} fill="#7f1d1d" />
      <text x={cx} y={y + height * 0.59 + 2.4} textAnchor="middle" fontSize="6.2" fontWeight="900" fill="#fef2f2" fontFamily="ui-sans-serif, system-ui">
        STOP
      </text>

      <Button
        cy={startCy}
        pressed={isStartPressed}
        cap="#22c55e"
        capDown="#15803d"
        ring="#14532d"
        keyName="startPressed"
        title="START — momentary Normally Open 3-4 (hold to press)"
      >
        <text x={0} y={4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffffff">I</text>
      </Button>
      <Button
        cy={stopCy}
        pressed={isStopPressed}
        cap="#ef4444"
        capDown="#b91c1c"
        ring="#7f1d1d"
        keyName="stopPressed"
        title="STOP — momentary Normally Closed 1-2 (hold to open)"
      >
        <circle r={4.5} fill="none" stroke="#ffffff" strokeWidth={2} />
      </Button>

      <DeviceTerminals {...props} labelColor={(t) => (t.type === 'no' ? '#6ee7b7' : '#fcd34d')} />
    </g>
  );
};
