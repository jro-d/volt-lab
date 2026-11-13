import React, { useId } from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

export const SwitchMultiGangDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, state } = device;
  const uid = useId().replace(/:/g, '');
  const isRear = !!state.rearView;

  const updateKey = (key: string, value: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) {
      onPatchState(device.id, { [key]: value });
    } else {
      onToggleState?.({ ...device, state: { ...device.state, [key]: value } });
    }
  };

  if (type === 'dimmer_switch') {
    const isOn = state.isOn !== false;
    const level = typeof state.level === 'number' ? state.level : 80;
    const cx = x + width / 2;
    const cy = y + height * 0.56;
    const knobAngle = -135 + (level / 100) * 270;

    return (
      <g id={`device-${device.id}`} className="select-none">
        <defs>
          <linearGradient id={`dimPlate-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dce3ec" />
          </linearGradient>
        </defs>
        <rect x={x + 2} y={y + 4} width={width} height={height} rx={9} fill="rgba(15,23,42,0.22)" />
        <rect x={x} y={y} width={width} height={height} rx={9} fill={`url(#dimPlate-${uid})`} stroke="#94a3b8" strokeWidth={1.5} />
        <rect x={x + 7} y={y + 18} width={width - 14} height={height - 26} rx={5} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.9} />

        {/* Terminal block strip */}
        <rect x={x + 8} y={y + 3} width={width - 16} height={15} rx={3} fill="#1e293b" />

        <text x={cx} y={y + 29} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#0f172a" fontFamily="ui-sans-serif, system-ui">
          ROYU DIMMER {level}%
        </text>

        {/* Scale Dots */}
        {[-120, -80, -40, 0, 40, 80, 120].map((deg, idx) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const active = (idx / 6) * 100 <= level && isOn;
          return (
            <circle
              key={deg}
              cx={cx + Math.cos(rad) * 24}
              cy={cy + Math.sin(rad) * 24}
              r={2}
              fill={active ? '#10b981' : '#94a3b8'}
            />
          );
        })}

        {/* Rotary Knob */}
        <g
          transform={`translate(${cx}, ${cy})`}
          className="cursor-pointer"
          onClick={(e) => {
            const nextLevel = level >= 100 ? 25 : Math.min(100, level + 25);
            updateKey('level', nextLevel, e);
          }}
        >
          <title>Click knob to step brightness ({level}%)</title>
          <circle r={19} fill="#cbd5e1" stroke="#64748b" strokeWidth={1.2} />
          <circle r={16} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} filter="drop-shadow(0 2px 3px rgba(0,0,0,0.2))" />
          <g transform={`rotate(${knobAngle})`}>
            <line x1={0} y1={-4} x2={0} y2={-13} stroke={isOn ? '#0284c7' : '#64748b'} strokeWidth={2.5} strokeLinecap="round" />
          </g>
          <circle r={3.5} fill={isOn ? '#10b981' : '#94a3b8'} />
        </g>

        {/* Push Power Pill */}
        <g
          className="cursor-pointer"
          onClick={(e) => updateKey('isOn', !isOn, e)}
        >
          <rect x={cx - 16} y={y + height - 20} width={32} height={11} rx={5.5} fill={isOn ? '#10b981' : '#64748b'} />
          <text x={cx} y={y + height - 12.3} textAnchor="middle" fontSize="6" fontWeight="900" fill="#ffffff">
            {isOn ? 'ON' : 'OFF'}
          </text>
        </g>

        <DeviceTerminals {...props} />
      </g>
    );
  }

  const gangs = type === 'switch_3gang' ? 3 : 2;
  const states = gangs === 3 ? [!!state.isOn, !!state.isOn2, !!state.isOn3] : [!!state.isOn, !!state.isOn2];
  const stateKeys = gangs === 3 ? ['isOn', 'isOn2', 'isOn3'] : ['isOn', 'isOn2'];

  return (
    <g id={`device-${device.id}`} className="select-none">
      <defs>
        <linearGradient id={`mgPlate-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isRear ? '#334155' : '#ffffff'} />
          <stop offset="100%" stopColor={isRear ? '#1e293b' : '#dde4ed'} />
        </linearGradient>
      </defs>
      <rect x={x + 2} y={y + 4} width={width} height={height} rx={9} fill="rgba(15,23,42,0.22)" />
      <rect x={x} y={y} width={width} height={height} rx={9} fill={`url(#mgPlate-${uid})`} stroke={isRear ? '#475569' : '#94a3b8'} strokeWidth={1.6} />
      {!isRear && <rect x={x + 3} y={y + 3} width={width - 6} height={height - 6} rx={7} fill="none" stroke="#ffffff" strokeWidth={1} />}

      {/* Terminal top & bottom header bars */}
      <rect x={x + 6} y={y + 4} width={width - 12} height={24} rx={4} fill={isRear ? '#0f172a' : '#e2e8f0'} />
      <rect x={x + 6} y={y + height - 28} width={width - 12} height={24} rx={4} fill={isRear ? '#0f172a' : '#e2e8f0'} />

      {/* Center Rockers */}
      {states.map((closed, i) => {
        const slotW = (width - 20) / gangs;
        const rx = x + 10 + i * slotW + 2;
        const rw = slotW - 4;
        const ry = y + 32;
        const rh = height - 64;
        return (
          <g
            key={i}
            className="cursor-pointer"
            onClick={(e) => updateKey(stateKeys[i], !closed, e)}
          >
            <title>Click to toggle SW{i + 1}</title>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              rx={3.5}
              fill={closed ? '#f8fafc' : '#cbd5e1'}
              stroke={closed ? '#0284c7' : '#64748b'}
              strokeWidth={1.2}
            />
            <rect x={rx + 3} y={closed ? ry + 4 : ry + rh - 10} width={rw - 6} height={4} rx={1.5} fill={closed ? '#10b981' : '#94a3b8'} />
            <text x={rx + rw / 2} y={ry + rh / 2 + 3} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">
              S{i + 1}
            </text>
          </g>
        );
      })}

      {/* Brand */}
      <text x={x + width / 2} y={y + height - 31} textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#dc2626" letterSpacing="1">
        ROYU
      </text>

      <DeviceTerminals {...props} />
    </g>
  );
};
