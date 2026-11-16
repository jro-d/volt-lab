import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style Panel Hardware: Panelboard Distribution Enclosure, Digital Panel Meter, and ATS Changeover.
 */
export const PanelHardwareDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, state, terminals } = device;

  const patch = (next: Record<string, any>, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, next);
    else onToggleState?.({ ...device, state: { ...device.state, ...next } });
  };

  if (type === 'panelboard_frame') {
    const label = state.label || 'LP-1 (230V 1Φ)';
    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 3} y={y + 4} width={width} height={height} rx={6} fill="transparent" />
        <rect x={x} y={y} width={width} height={height} rx={6} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.6} />
        <rect x={x + 12} y={y + 12} width={width - 24} height={height - 24} rx={4} fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth={1} />

        {/* Steel Header Plate */}
        <rect x={x + width / 2 - 74} y={y + 4} width={148} height={16} rx={2} fill="var(--nameplate)" />
        <text x={x + width / 2} y={y + 14.5} textAnchor="middle" fontSize="7.5" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          {label}
        </text>

        {/* Central Slotted Steel DIN Rail */}
        <rect x={x + 24} y={y + height * 0.45 - 11} width={width - 48} height={22} rx={2} fill="var(--mat-steel)" stroke="var(--mat-housing-dark-face)" strokeWidth={1} />
        <rect x={x + 28} y={y + height * 0.45 - 5} width={width - 56} height={10} fill="var(--mat-housing-shade)" />

        {/* Neutral & Ground Busbar Mounts cleanly below terminal screws */}
        <rect x={x + 16} y={y + height - 46} width={76} height={26} rx={3} fill="var(--act-blue)" stroke="var(--mat-line)" strokeWidth={1} />
        <text x={x + 54} y={y + height - 38} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          N-BUS
        </text>
        <rect x={x + width - 92} y={y + height - 46} width={76} height={26} rx={3} fill="var(--cond-green)" stroke="var(--mat-line)" strokeWidth={1} />
        <text x={x + width - 54} y={y + height - 38} textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          PE-BUS
        </text>

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  if (type === 'panel_meter') {
    const volts = typeof state.volts === 'number' ? state.volts : 0;
    const amps = typeof state.amps === 'number' ? state.amps : 0;
    const hz = typeof state.hz === 'number' ? state.hz : 60;
    return (
      <g id={`device-${device.id}`} className="select-none">
        <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />
        <rect x={x} y={y} width={width} height={height} rx={5} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={1.3} />

        {/* Top Sense Bay + Silkscreen */}
        <rect x={x + 3} y={y + 2} width={width - 6} height={15} rx={2} fill="var(--mat-housing-dark)" />
        <rect x={x + 3} y={y + 17} width={width - 6} height={7} fill="var(--mat-line)" />
        <text x={x + width * 0.22} y={y + 22.3} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-red-on)">
          V+
        </text>
        <text x={x + width * 0.42} y={y + 22.3} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
          V-
        </text>

        {/* Center Backlit Meter LCD */}
        <rect x={x + 5} y={y + 25.5} width={width - 10} height={height - 51} rx={3} fill="var(--lamp-green-off)" stroke="var(--mat-line)" strokeWidth={1} />
        <text x={x + 9} y={y + 34} fontSize="4.6" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
          VOLTLAB PM
        </text>
        <text x={x + width / 2} y={y + 47} textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="var(--font-mono)" fill={volts > 10 ? 'var(--lamp-green-on)' : 'var(--silk-muted)'}>
          {volts.toFixed(1)} V
        </text>
        <text x={x + width / 2} y={y + 59} textAnchor="middle" fontSize="8.8" fontWeight="800" fontFamily="var(--font-mono)" fill={amps > 0.05 ? 'var(--nameplate-tag)' : 'var(--silk-muted)'}>
          {amps.toFixed(2)} A
        </text>
        <text x={x + width / 2} y={y + 68} textAnchor="middle" fontSize="5.4" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--lamp-amber-on)">
          {volts > 10 ? `${hz.toFixed(1)} Hz` : 'NO LINE'}
        </text>

        {/* Bottom CT Silkscreen + Terminal Bay */}
        <rect x={x + 3} y={y + height - 24} width={width - 6} height={7} fill="var(--mat-line)" />
        <text x={x + width * 0.65} y={y + height - 18.8} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-red-on)">
          I IN
        </text>
        <text x={x + width * 0.85} y={y + height - 18.8} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--mat-pvc-orange)">
          I OUT
        </text>
        <rect x={x + 3} y={y + height - 17} width={width - 6} height={15} rx={2} fill="var(--mat-housing-dark)" />

        <DeviceTerminals {...props} hideLabel={() => true} />
      </g>
    );
  }

  // ats_changeover
  const isNormal = state.source !== 'generator';
  const autoMode = state.autoMode !== false;

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="transparent" />
      <rect x={x} y={y} width={width} height={height} rx={5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.3} />

      {/* Top Bay + Labels */}
      <rect x={x + 3} y={y + 2} width={width - 6} height={17} rx={2} fill="var(--mat-housing-dark)" />
      <rect x={x + 3} y={y + 19} width={width - 6} height={7.5} fill="var(--mat-line)" />
      {terminals
        .filter((t) => t.relY < 0.5)
        .map((t) => (
          <text
            key={`atst-${t.id}`}
            x={x + t.relX * width}
            y={y + 24.4}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="900"
            fontFamily="var(--font-mono)"
            fill={t.type === 'phase' ? 'var(--lamp-red-on)' : 'var(--lamp-blue-on)'}
          >
            {t.label}
          </text>
        ))}

      <text x={x + width / 2} y={y + 35.5} textAnchor="middle" fontSize="6.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--silk)">
        ATS 2P 63A CHANGEOVER
      </text>

      {/* Source Status Cards */}
      <rect x={x + 10} y={y + 40} width={56} height={20} rx={2.5} fill={isNormal ? '#dcfce7' : 'var(--mat-housing)'} stroke={isNormal ? 'var(--cond-green)' : 'var(--mat-steel)'} strokeWidth={1} />
      <circle cx={x + 20} cy={y + 50} r={3} fill={isNormal ? 'var(--lamp-green-on)' : 'var(--mat-steel)'} />
      <text x={x + 44} y={y + 52.5} textAnchor="middle" fontSize="5.8" fontWeight="900" fill="var(--silk)">
        GRID
      </text>

      <rect x={x + width - 66} y={y + 40} width={56} height={20} rx={2.5} fill={!isNormal ? 'var(--lamp-white-on)' : 'var(--mat-housing)'} stroke={!isNormal ? 'var(--mat-copper)' : 'var(--mat-steel)'} strokeWidth={1} />
      <circle cx={x + width - 56} cy={y + 50} r={3} fill={!isNormal ? 'var(--lamp-amber-on)' : 'var(--mat-steel)'} />
      <text x={x + width - 32} y={y + 52.5} textAnchor="middle" fontSize="5.8" fontWeight="900" fill="var(--silk)">
        GEN
      </text>

      {/* Manual Transfer Handle */}
      <g onMouseDown={stopCanvas} onClick={(e) => patch({ source: isNormal ? 'generator' : 'normal' }, e)} className="cursor-pointer">
        <title>Click to manually transfer between GRID (Normal) and GEN (Backup)</title>
        <rect x={x + 14} y={y + 65} width={width - 28} height={20} rx={3} fill="var(--mat-line)" />
        <rect x={isNormal ? x + 17 : x + width / 2 + 2} y={y + 68} width={(width - 36) / 2} height={14} rx={2} fill={isNormal ? 'var(--cond-green)' : 'var(--mat-copper)'} />
        <text x={x + width / 2} y={y + 77.5} textAnchor="middle" fontSize="5.8" fontWeight="900" fill="var(--silk-on-dark)">
          {isNormal ? '← SOURCE I' : 'SOURCE II →'}
        </text>
      </g>

      <g onMouseDown={stopCanvas} onClick={(e) => patch({ autoMode: !autoMode }, e)} className="cursor-pointer">
        <rect x={x + width / 2 - 28} y={y + 89} width={56} height={12} rx={3} fill={autoMode ? 'var(--act-blue)' : 'var(--mat-line-soft)'} />
        <text x={x + width / 2} y={y + 97} textAnchor="middle" fontSize="5.2" fontWeight="900" fill="var(--silk-on-dark)">
          {autoMode ? 'AUTO MODE' : 'MANUAL'}
        </text>
      </g>

      {/* Bottom Silkscreen + Load Terminal Bay */}
      <rect x={x + 3} y={y + height - 27.5} width={width - 6} height={7.5} fill="var(--mat-line)" />
      <text x={x + width * 0.35} y={y + height - 22} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--mat-pvc-orange)">
        LOAD L
      </text>
      <text x={x + width * 0.65} y={y + height - 22} textAnchor="middle" fontSize="4.4" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        LOAD N
      </text>
      <rect x={x + 3} y={y + height - 20} width={width - 6} height={18} rx={2} fill="var(--mat-housing-dark)" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
