import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style Household & HVAC Loads: Smart TV, Stand Fan, 1.5HP Inverter ACU, Instant Water Heater.
 * Crisp CAD styling with embedded bottom L/PE/N pocket labels.
 */
export const ApplianceDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, terminals } = device;
  const isTv = device.type === 'appliance_tv';
  const isFan = device.type === 'appliance_fan';
  const isAc = device.type === 'appliance_ac';
  const isPowered = !!device.state.powered;
  const hasFault = !!device.state.hasEarthFault;
  const cx = x + width / 2;

  // 1. SMART 4K LED TV
  if (isTv) {
    return (
      <g className="select-none">
        <path d={`M ${cx - 8} ${y + height - 24} L ${cx - 22} ${y + height - 8} L ${cx + 22} ${y + height - 8} L ${cx + 8} ${y + height - 24} Z`} fill="#475569" stroke="#0f172a" strokeWidth={1} />
        <rect x={cx - 30} y={y + height - 11} width={60} height={5} rx={2} fill="#64748b" stroke="#0f172a" strokeWidth={0.9} />

        <rect x={x} y={y} width={width} height={height - 23} rx={4} fill="#1e293b" stroke="#0f172a" strokeWidth={1.3} />
        <rect x={x + 4} y={y + 4} width={width - 8} height={height - 31} rx={2} fill={isPowered ? '#0284c7' : '#0f172a'} />
        {isPowered ? (
          <g>
            <text x={cx} y={y + 19} textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
              4K UHD LIVE
            </text>
            <text x={cx} y={y + 29} textAnchor="middle" fontSize="4.8" fontFamily="ui-monospace, monospace" fill="#bae6fd">
              HDMI 1 · 150W AC
            </text>
          </g>
        ) : (
          <text x={cx} y={y + 24} textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#64748b">
            STANDBY
          </text>
        )}
        <circle cx={cx} cy={y + height - 25.5} r={1.8} fill={isPowered ? '#22c55e' : '#ef4444'} />
        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  // 2. ELECTRIC PEDESTAL STAND FAN
  if (isFan) {
    const fanSpeed = device.state.speed || 2;
    const fanCy = y + 42;
    return (
      <g className="select-none">
        <rect x={cx - 4.5} y={fanCy + 26} width={9} height={height - 84} rx={1.5} fill="#94a3b8" stroke="#0f172a" strokeWidth={0.9} />
        <rect x={x + 8} y={y + height - 24} width={width - 16} height={22} rx={4} fill="#1f2937" stroke="#0f172a" strokeWidth={1.1} />

        <circle cx={cx} cy={fanCy} r={34} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.3} />
        <circle cx={cx} cy={fanCy} r={29} fill="none" stroke="#94a3b8" strokeWidth={0.8} />

        <g
          transform={`translate(${cx}, ${fanCy})`}
          className={isPowered ? 'animate-spin' : ''}
          style={{ transformOrigin: '0px 0px', animationDuration: fanSpeed === 3 ? '0.28s' : fanSpeed === 2 ? '0.45s' : '0.7s' }}
        >
          {[0, 120, 240].map((deg) => (
            <path
              key={deg}
              transform={`rotate(${deg})`}
              d="M 0 0 C 8 -10, 24 -12, 26 -2 C 27 7, 10 10, 0 0 Z"
              fill={isPowered ? '#38bdf8' : '#94a3b8'}
              stroke="#0f172a"
              strokeWidth={0.8}
            />
          ))}
        </g>

        <circle cx={cx} cy={fanCy} r={8.5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1} />
        <text x={cx} y={fanCy + 2} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#0f172a">
          {isPowered ? `S${fanSpeed}` : 'FAN'}
        </text>

        {/* Embedded L / PE / N Pocket Strip */}
        <rect x={x + 10} y={y + height - 24} width={width - 20} height={7} fill="#0f172a" />
        {terminals.map((t) => (
          <text
            key={`ft-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 18.8}
            textAnchor="middle"
            fontSize="4.1"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill={t.type === 'earth' ? '#4ade80' : t.type === 'neutral' ? '#60a5fa' : '#f87171'}
          >
            {t.label}
          </text>
        ))}

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  // 3. 1.5HP INVERTER SPLIT-TYPE ACU
  if (isAc) {
    const temp = device.state.setTemp || 16;
    return (
      <g className="select-none">
        <rect x={x + 2} y={y + 3} width={width} height={height - 3} rx={5} fill="rgba(15,23,42,0.14)" />
        <rect x={x} y={y} width={width} height={height - 2} rx={5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.3} />

        {[6, 10, 14].map((ly) => (
          <line key={ly} x1={x + 10} y1={y + ly} x2={x + width - 10} y2={y + ly} stroke="#cbd5e1" strokeWidth={1} />
        ))}
        <rect x={x + 10} y={y + 20} width={56} height={12} rx={2} fill="#0f172a" />
        <text x={x + 38} y={y + 28} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#38bdf8">
          INVERTER 1.5HP
        </text>

        <rect x={x + width - 50} y={y + 19} width={40} height={14} rx={2} fill="#020617" stroke="#334155" strokeWidth={0.8} />
        <text x={x + width - 30} y={y + 29} textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="ui-monospace, monospace" fill={isPowered ? '#38bdf8' : '#64748b'}>
          {isPowered ? `${temp}°C` : 'OFF'}
        </text>

        {/* Discharge Deflector + Embedded Bottom Terminal Bay */}
        <rect x={x + 8} y={y + 38} width={width - 16} height={5} rx={1.5} fill={isPowered ? '#38bdf8' : '#cbd5e1'} stroke="#475569" strokeWidth={0.6} />

        <rect x={x + 4} y={y + height - 24} width={width - 8} height={7} fill="#0f172a" />
        {terminals.map((t) => (
          <text
            key={`act-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 18.8}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill={t.type === 'earth' ? '#4ade80' : t.type === 'neutral' ? '#60a5fa' : '#f87171'}
          >
            {t.label}
          </text>
        ))}
        <rect x={x + 4} y={y + height - 17} width={width - 8} height={15} rx={2} fill="#1f2937" />

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  // 4. INSTANT WATER HEATER (3.5kW / 4.5kW)
  const wattageKw = ((device.state.wattage || 3500) / 1000).toFixed(1);
  return (
    <g className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15,23,42,0.14)" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.3} />

      <rect x={x + 6} y={y + 5} width={width - 12} height={14} rx={2} fill="#0369a1" />
      <text x={cx} y={y + 14.2} textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="ui-monospace, monospace" fill="#ffffff">
        HEATER {wattageKw}kW
      </text>

      {/* Temperature Knob */}
      <circle cx={cx} cy={y + 42} r={14.5} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1} />
      <circle cx={cx} cy={y + 42} r={10} fill="#475569" stroke="#0f172a" strokeWidth={0.9} />
      <line x1={cx} y1={y + 33} x2={cx} y2={y + 38} stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round" />

      {/* Heating LED & Test ELCB */}
      <circle cx={x + 15} cy={y + 72} r={3} fill={isPowered ? '#ef4444' : '#64748b'} stroke="#0f172a" strokeWidth={0.6} />
      <text x={x + 21} y={y + 74} fontSize="5" fontWeight="900" fill="#1e293b">
        ELCB
      </text>
      <g
        onMouseDown={stopCanvas}
        onClick={(e) => {
          e.stopPropagation();
          if (onPatchState) onPatchState(device.id, { hasEarthFault: !hasFault });
          else {
            device.state.hasEarthFault = !hasFault;
            onToggleState?.({ ...device, state: { ...device.state, hasEarthFault: !hasFault } });
          }
        }}
        className="cursor-pointer"
      >
        <rect x={x + width - 44} y={y + 65} width={37} height={13} rx={2} fill={hasFault ? '#dc2626' : '#cbd5e1'} stroke="#0f172a" strokeWidth={0.8} />
        <text x={x + width - 25.5} y={y + 73.5} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="ui-monospace, monospace" fill={hasFault ? '#ffffff' : '#0f172a'}>
          {hasFault ? 'FAULT!' : 'TEST'}
        </text>
      </g>

      {/* Bottom Embedded Silkscreen + Pocket */}
      <rect x={x + 4} y={y + height - 26} width={width - 8} height={7} fill="#0f172a" />
      {terminals.map((t) => (
        <text
          key={`wht-${t.id}`}
          x={x + t.relX * width}
          y={y + height - 20.8}
          textAnchor="middle"
          fontSize="4.2"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill={t.type === 'earth' ? '#4ade80' : t.type === 'neutral' ? '#60a5fa' : '#f87171'}
        >
          {t.label}
        </text>
      ))}
      <rect x={x + 4} y={y + height - 19} width={width - 8} height={17} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
