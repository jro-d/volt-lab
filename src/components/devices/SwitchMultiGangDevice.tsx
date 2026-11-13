import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style ROYU 2-Gang, 3-Gang Wide Switches & Rotary Dimmer Switch.
 * Embedded silkscreen terminal pockets so rocker buttons and labels never overlap.
 */
export const SwitchMultiGangDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, state, terminals } = device;
  const isRear = !!state.rearView;

  const updateKey = (key: string, value: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, { [key]: value });
    else onToggleState?.({ ...device, state: { ...device.state, [key]: value } });
  };

  if (type === 'dimmer_switch') {
    const isOn = state.isOn !== false;
    const level = typeof state.level === 'number' ? state.level : 80;
    const cx = x + width / 2;
    const cy = y + 66;
    const knobAngle = -135 + (level / 100) * 270;

    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15,23,42,0.14)" />
        <rect x={x} y={y} width={width} height={height} rx={5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.3} />

        {/* Top Terminal Pocket + Embedded Labels */}
        <rect x={x + 4} y={y + 2} width={width - 8} height={21} rx={2} fill="#1f2937" />
        <rect x={x + 4} y={y + 23} width={width - 8} height={8} fill="#0f172a" />
        {terminals.map((t) => (
          <text
            key={`dimt-${t.id}`}
            x={x + t.relX * width}
            y={y + 28.6}
            textAnchor="middle"
            fontSize="4.3"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill={t.type === 'phase' ? '#f87171' : '#fb923c'}
          >
            {t.label}
          </text>
        ))}

        {/* Plate label cleanly above dial */}
        <text x={cx} y={y + 39.5} textAnchor="middle" fontSize="5.4" fontWeight="900" fill="#0f172a" fontFamily="ui-monospace, monospace">
          ROYU DIMMER {level}%
        </text>

        {/* Scale Arc Indicators */}
        {[-120, -80, -40, 0, 40, 80, 120].map((deg, idx) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const active = (idx / 6) * 100 <= level && isOn;
          return <circle key={deg} cx={cx + Math.cos(rad) * 21} cy={cy + Math.sin(rad) * 21} r={1.8} fill={active ? '#16a34a' : '#94a3b8'} />;
        })}

        {/* Rotary Knob */}
        <g
          transform={`translate(${cx}, ${cy})`}
          onMouseDown={stopCanvas}
          onClick={(e) => {
            const nextLevel = level >= 100 ? 25 : Math.min(100, level + 25);
            updateKey('level', nextLevel, e);
          }}
          className="cursor-pointer"
        >
          <title>{`Click knob to step brightness (${level}%)`}</title>
          <circle r={16.5} fill="#cbd5e1" stroke="#334155" strokeWidth={1.1} />
          <circle r={13.5} fill="#ffffff" stroke="#0f172a" strokeWidth={0.9} />
          <g transform={`rotate(${knobAngle})`}>
            <line x1={0} y1={-3} x2={0} y2={-11} stroke={isOn ? '#0284c7' : '#64748b'} strokeWidth={2.2} strokeLinecap="round" />
          </g>
          <circle r={3} fill={isOn ? '#16a34a' : '#94a3b8'} />
        </g>

        {/* Push Power Switch cleanly at bottom */}
        <g onMouseDown={stopCanvas} onClick={(e) => updateKey('isOn', !isOn, e)} className="cursor-pointer">
          <rect x={cx - 17} y={y + height - 18} width={34} height={11} rx={2.5} fill={isOn ? '#16a34a' : '#475569'} stroke="#0f172a" strokeWidth={0.7} />
          <text x={cx} y={y + height - 10.6} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
            {isOn ? 'ON' : 'OFF'}
          </text>
        </g>

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  const gangs = type === 'switch_3gang' ? 3 : 2;
  const states = gangs === 3 ? [!!state.isOn, !!state.isOn2, !!state.isOn3] : [!!state.isOn, !!state.isOn2];
  const stateKeys = gangs === 3 ? ['isOn', 'isOn2', 'isOn3'] : ['isOn', 'isOn2'];

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15,23,42,0.14)" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill={isRear ? '#334155' : '#f8fafc'} stroke="#0f172a" strokeWidth={1.3} />

      {/* Top Pocket + Silkscreen */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={24} rx={2} fill="#1f2937" />
      <rect x={x + 3} y={y + 26} width={width - 6} height={8} fill="#0f172a" />
      {terminals
        .filter((t) => t.relY < 0.5)
        .map((t) => (
          <text
            key={`mgt-${t.id}`}
            x={x + t.relX * width}
            y={y + 31.6}
            textAnchor="middle"
            fontSize="4.4"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill="#f87171"
          >
            {t.label}
          </text>
        ))}

      {/* Center Wide Rockers */}
      {states.map((closed, i) => {
        const slotW = (width - 14) / gangs;
        const rx = x + 7 + i * slotW + 1.5;
        const rw = slotW - 3;
        const ry = y + 36;
        const rh = height - 73;
        return (
          <g key={i} onMouseDown={stopCanvas} onClick={(e) => updateKey(stateKeys[i], !closed, e)} className="cursor-pointer">
            <title>Click to toggle SW{i + 1}</title>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              rx={2.5}
              fill={closed ? '#ffffff' : '#cbd5e1'}
              stroke={closed ? '#0284c7' : '#334155'}
              strokeWidth={1.1}
            />
            <rect x={rx + 3} y={closed ? ry + 3 : ry + rh - 6.5} width={rw - 6} height={3} rx={1} fill={closed ? '#16a34a' : '#64748b'} />
            <text x={rx + rw / 2} y={ry + rh / 2 + 2} textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
              S{i + 1}
            </text>
          </g>
        );
      })}

      {/* Embedded Bottom Silkscreen + Line Out Terminal Bay */}
      <rect x={x + 3} y={y + height - 35} width={width - 6} height={8} fill="#0f172a" />
      {terminals
        .filter((t) => t.relY >= 0.5)
        .map((t) => (
          <text
            key={`mgb-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 29.4}
            textAnchor="middle"
            fontSize="4.4"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill="#38bdf8"
          >
            {t.label}
          </text>
        ))}
      <rect x={x + 3} y={y + height - 27} width={width - 6} height={24} rx={2} fill="#1f2937" />
      <text x={x + width / 2} y={y + height - 4.5} textAnchor="middle" fontSize="4" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#ef4444" letterSpacing="0.8">
        ROYU {gangs}-GANG
      </text>

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
