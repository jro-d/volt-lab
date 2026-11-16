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
        <path d={`M ${cx - 8} ${y + height - 24} L ${cx - 22} ${y + height - 8} L ${cx + 22} ${y + height - 8} L ${cx + 8} ${y + height - 24} Z`} fill="var(--silk-muted)" stroke="var(--mat-line)" strokeWidth={1} />
        <rect x={cx - 30} y={y + height - 11} width={60} height={5} rx={2} fill="var(--mat-line-soft)" stroke="var(--mat-line)" strokeWidth={0.9} />

        <rect x={x} y={y} width={width} height={height - 23} rx={4} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={1.3} />
        <rect x={x + 4} y={y + 4} width={width - 8} height={height - 31} rx={2} fill={isPowered ? 'var(--lamp-blue-on)' : 'var(--mat-line)'} />
        {isPowered ? (
          <g>
            <text x={cx} y={y + 19} textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
              4K UHD LIVE
            </text>
            <text x={cx} y={y + 29} textAnchor="middle" fontSize="4.8" fontFamily="var(--font-mono)" fill="#bae6fd">
              HDMI 1 · 150W AC
            </text>
          </g>
        ) : (
          <text x={cx} y={y + 24} textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
            STANDBY
          </text>
        )}
        <circle cx={cx} cy={y + height - 25.5} r={1.8} fill={isPowered ? 'var(--lamp-green-on)' : 'var(--act-red)'} />
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
        <rect x={cx - 4.5} y={fanCy + 26} width={9} height={height - 84} rx={1.5} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <rect x={x + 8} y={y + height - 24} width={width - 16} height={22} rx={4} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={1.1} />

        <circle cx={cx} cy={fanCy} r={34} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.3} />
        <circle cx={cx} cy={fanCy} r={29} fill="none" stroke="var(--mat-steel)" strokeWidth={0.8} />

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
              fill={isPowered ? 'var(--lamp-blue-on)' : 'var(--mat-steel)'}
              stroke="var(--mat-line)"
              strokeWidth={0.8}
            />
          ))}
        </g>

        <circle cx={cx} cy={fanCy} r={8.5} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1} />
        <text x={cx} y={fanCy + 2} textAnchor="middle" fontSize="4.8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
          {isPowered ? `S${fanSpeed}` : 'FAN'}
        </text>

        {/* Embedded L / PE / N Pocket Strip */}
        <rect x={x + 10} y={y + height - 24} width={width - 20} height={7} fill="var(--mat-line)" />
        {terminals.map((t) => (
          <text
            key={`ft-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 18.8}
            textAnchor="middle"
            fontSize="4.1"
            fontWeight="900"
            fontFamily="var(--font-mono)"
            fill={t.type === 'earth' ? 'var(--lamp-green-on)' : t.type === 'neutral' ? 'var(--lamp-blue-on)' : 'var(--lamp-red-on)'}
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
        <rect x={x + 2} y={y + 3} width={width} height={height - 3} rx={5} fill="transparent" />
        <rect x={x} y={y} width={width} height={height - 2} rx={5} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1.3} />

        {[6, 10, 14].map((ly) => (
          <line key={ly} x1={x + 10} y1={y + ly} x2={x + width - 10} y2={y + ly} stroke="var(--mat-housing-shade)" strokeWidth={1} />
        ))}
        <rect x={x + 10} y={y + 20} width={56} height={12} rx={2} fill="var(--mat-line)" />
        <text x={x + 38} y={y + 28} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--nameplate-tag)">
          INVERTER 1.5HP
        </text>

        <rect x={x + width - 50} y={y + 19} width={40} height={14} rx={2} fill="var(--mat-line)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.8} />
        <text x={x + width - 30} y={y + 29} textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="var(--font-mono)" fill={isPowered ? 'var(--nameplate-tag)' : 'var(--silk-muted)'}>
          {isPowered ? `${temp}°C` : 'OFF'}
        </text>

        {/* Discharge Deflector + Embedded Bottom Terminal Bay */}
        <rect x={x + 8} y={y + 38} width={width - 16} height={5} rx={1.5} fill={isPowered ? 'var(--lamp-blue-on)' : 'var(--mat-housing-shade)'} stroke="var(--silk-muted)" strokeWidth={0.6} />

        <rect x={x + 4} y={y + height - 24} width={width - 8} height={7} fill="var(--mat-line)" />
        {terminals.map((t) => (
          <text
            key={`act-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 18.8}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="900"
            fontFamily="var(--font-mono)"
            fill={t.type === 'earth' ? 'var(--lamp-green-on)' : t.type === 'neutral' ? 'var(--lamp-blue-on)' : 'var(--lamp-red-on)'}
          >
            {t.label}
          </text>
        ))}
        <rect x={x + 4} y={y + height - 17} width={width - 8} height={15} rx={2} fill="var(--mat-housing-dark)" />

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  // 4. INSTANT WATER HEATER (3.5kW / 4.5kW)
  const wattageKw = ((device.state.wattage || 3500) / 1000).toFixed(1);
  return (
    <g className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1.3} />

      <rect x={x + 6} y={y + 5} width={width - 12} height={14} rx={2} fill="var(--lamp-blue-off)" />
      <text x={cx} y={y + 14.2} textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        HEATER {wattageKw}kW
      </text>

      {/* Temperature Knob */}
      <circle cx={cx} cy={y + 42} r={14.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
      <circle cx={cx} cy={y + 42} r={10} fill="var(--silk-muted)" stroke="var(--mat-line)" strokeWidth={0.9} />
      <line x1={cx} y1={y + 33} x2={cx} y2={y + 38} stroke="var(--act-red)" strokeWidth={2.2} strokeLinecap="round" />

      {/* Heating LED & Test ELCB */}
      <circle cx={x + 15} cy={y + 72} r={3} fill={isPowered ? 'var(--act-red)' : 'var(--mat-line-soft)'} stroke="var(--mat-line)" strokeWidth={0.6} />
      <text x={x + 21} y={y + 74} fontSize="5" fontWeight="900" fill="var(--silk)">
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
        <rect x={x + width - 44} y={y + 65} width={37} height={13} rx={2} fill={hasFault ? 'var(--cond-red)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.8} />
        <text x={x + width - 25.5} y={y + 73.5} textAnchor="middle" fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill={hasFault ? 'var(--silk-on-dark)' : 'var(--silk)'}>
          {hasFault ? 'FAULT!' : 'TEST'}
        </text>
      </g>

      {/* Bottom Embedded Silkscreen + Pocket */}
      <rect x={x + 4} y={y + height - 26} width={width - 8} height={7} fill="var(--mat-line)" />
      {terminals.map((t) => (
        <text
          key={`wht-${t.id}`}
          x={x + t.relX * width}
          y={y + height - 20.8}
          textAnchor="middle"
          fontSize="4.2"
          fontWeight="900"
          fontFamily="var(--font-mono)"
          fill={t.type === 'earth' ? 'var(--lamp-green-on)' : t.type === 'neutral' ? 'var(--lamp-blue-on)' : 'var(--lamp-red-on)'}
        >
          {t.label}
        </text>
      ))}
      <rect x={x + 4} y={y + height - 19} width={width - 8} height={17} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
