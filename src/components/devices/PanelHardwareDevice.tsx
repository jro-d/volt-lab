import React, { useId } from 'react';
import { DeviceComponentProps, DeviceTerminals } from './DeviceTerminals';

export const PanelHardwareDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, state } = device;
  const uid = useId().replace(/:/g, '');

  const patch = (next: Record<string, any>, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPatchState) onPatchState(device.id, next);
    else onToggleState?.({ ...device, state: { ...device.state, ...next } });
  };

  if (type === 'panelboard_frame') {
    const label = state.label || 'LP-1 (230V 1Φ)';
    return (
      <g id={`device-${device.id}`} className="select-none">
        {/* NEMA-1 Powder-Coated Steel Enclosure */}
        <rect x={x + 4} y={y + 6} width={width} height={height} rx={10} fill="rgba(15,23,42,0.18)" />
        <rect x={x} y={y} width={width} height={height} rx={8} fill="#e2e8f0" stroke="#64748b" strokeWidth={2.2} />
        <rect x={x + 12} y={y + 12} width={width - 24} height={height - 24} rx={5} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.2} />

        {/* Steel Panel Label Header */}
        <rect x={x + width / 2 - 72} y={y + 4} width={144} height={18} rx={3} fill="#0f172a" />
        <text x={x + width / 2} y={y + 16} textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#f8fafc" fontFamily="monospace">
          {label}
        </text>

        {/* Central DIN Mounting Rail */}
        <rect x={x + 24} y={y + height * 0.45 - 12} width={width - 48} height={24} rx={2} fill="#94a3b8" stroke="#475569" strokeWidth={1} />
        <rect x={x + 28} y={y + height * 0.45 - 6} width={width - 56} height={12} fill="#e2e8f0" opacity={0.65} />

        {/* Neutral Busbar Block Left */}
        <rect x={x + 18} y={y + height - 46} width={76} height={24} rx={3} fill="#1d4ed8" stroke="#1e3a8a" strokeWidth={1} />
        <text x={x + 56} y={y + height - 30} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#ffffff">
          N-BUSBAR
        </text>

        {/* Ground Busbar Block Right */}
        <rect x={x + width - 94} y={y + height - 46} width={76} height={24} rx={3} fill="#15803d" stroke="#14532d" strokeWidth={1} />
        <text x={x + width - 56} y={y + height - 30} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#ffffff">
          PE-BUSBAR
        </text>

        {/* Knockout rings along top */}
        {[0.2, 0.35, 0.5, 0.65, 0.8].map((r) => (
          <circle key={r} cx={x + width * r} cy={y + 8} r={4.5} fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="3 2" />
        ))}

        <DeviceTerminals {...props} />
      </g>
    );
  }

  if (type === 'panel_meter') {
    const volts = typeof state.volts === 'number' ? state.volts : 0;
    const amps = typeof state.amps === 'number' ? state.amps : 0;
    const hz = typeof state.hz === 'number' ? state.hz : 60;
    return (
      <g id={`device-${device.id}`} className="select-none">
        <defs>
          <linearGradient id={`pmLcd-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f291e" />
            <stop offset="100%" stopColor="#061610" />
          </linearGradient>
        </defs>
        <rect x={x + 2} y={y + 4} width={width} height={height} rx={7} fill="rgba(15,23,42,0.25)" />
        <rect x={x} y={y} width={width} height={height} rx={7} fill="#1e293b" stroke="#475569" strokeWidth={1.6} />
        <rect x={x + 4} y={y + 18} width={width - 8} height={height - 36} rx={4} fill={`url(#pmLcd-${uid})`} stroke="#334155" strokeWidth={1.2} />

        <text x={x + 10} y={y + 29} fontSize="6" fontWeight="800" fill="#94a3b8" fontFamily="monospace">
          SCHNEIDER PM
        </text>
        <text x={x + width / 2} y={y + 44} textAnchor="middle" fontSize="11.5" fontWeight="900" fill={volts > 10 ? '#4ade80' : '#475569'} fontFamily="monospace">
          {volts.toFixed(1)} V
        </text>
        <text x={x + width / 2} y={y + 58} textAnchor="middle" fontSize="10" fontWeight="800" fill={amps > 0.05 ? '#38bdf8' : '#475569'} fontFamily="monospace">
          {amps.toFixed(2)} A
        </text>
        <text x={x + width / 2} y={y + 71} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fbbf24" fontFamily="monospace">
          {volts > 10 ? `${hz.toFixed(1)} Hz` : 'NO LINE'}
        </text>

        <DeviceTerminals {...props} />
      </g>
    );
  }

  // ats_changeover
  const isNormal = state.source !== 'generator';
  const autoMode = state.autoMode !== false;

  return (
    <g id={`device-${device.id}`} className="select-none">
      <rect x={x + 3} y={y + 5} width={width} height={height} rx={8} fill="rgba(15,23,42,0.25)" />
      <rect x={x} y={y} width={width} height={height} rx={8} fill="#f8fafc" stroke="#475569" strokeWidth={1.8} />
      <rect x={x + 4} y={y + 2} width={width - 8} height={20} rx={3} fill="#1e293b" />
      <rect x={x + 4} y={y + height - 22} width={width - 8} height={20} rx={3} fill="#1e293b" />

      <text x={x + width / 2} y={y + 34} textAnchor="middle" fontSize="8" fontWeight="900" fill="#0f172a">
        ATS 2P 63A CHANGEOVER
      </text>

      {/* Source Status LEDs */}
      <g>
        <rect x={x + 12} y={y + 42} width={54} height={22} rx={4} fill={isNormal ? '#dcfce7' : '#f1f5f9'} stroke={isNormal ? '#16a34a' : '#cbd5e1'} strokeWidth={1.2} />
        <circle cx={x + 21} cy={y + 53} r={3.5} fill={isNormal ? '#22c55e' : '#94a3b8'} />
        <text x={x + 44} y={y + 55.5} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">GRID</text>

        <rect x={x + width - 66} y={y + 42} width={54} height={22} rx={4} fill={!isNormal ? '#fef3c7' : '#f1f5f9'} stroke={!isNormal ? '#d97706' : '#cbd5e1'} strokeWidth={1.2} />
        <circle cx={x + width - 57} cy={y + 53} r={3.5} fill={!isNormal ? '#f59e0b' : '#94a3b8'} />
        <text x={x + width - 34} y={y + 55.5} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#0f172a">GEN</text>
      </g>

      {/* Interactive Transfer Handle + Auto/Man Mode */}
      <g
        className="cursor-pointer"
        onClick={(e) => patch({ source: isNormal ? 'generator' : 'normal' }, e)}
      >
        <title>Click to manually transfer between GRID (Normal) and GEN (Backup)</title>
        <rect x={x + 18} y={y + 71} width={width - 36} height={22} rx={4} fill="#0f172a" stroke="#475569" />
        <rect
          x={isNormal ? x + 21 : x + width / 2 + 2}
          y={y + 74}
          width={(width - 44) / 2}
          height={16}
          rx={3}
          fill={isNormal ? '#10b981' : '#f59e0b'}
        />
        <text x={x + width / 2} y={y + 85} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#ffffff">
          {isNormal ? '← SOURCE I' : 'SOURCE II →'}
        </text>
      </g>

      <g
        className="cursor-pointer"
        onClick={(e) => patch({ autoMode: !autoMode }, e)}
      >
        <rect x={x + width / 2 - 30} y={y + 98} width={60} height={13} rx={6.5} fill={autoMode ? '#0284c7' : '#64748b'} />
        <text x={x + width / 2} y={y + 107} textAnchor="middle" fontSize="6" fontWeight="900" fill="#ffffff">
          {autoMode ? 'AUTO TRANSFER' : 'MANUAL'}
        </text>
      </g>

      <DeviceTerminals {...props} />
    </g>
  );
};
