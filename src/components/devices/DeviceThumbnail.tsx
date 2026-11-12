import React from 'react';
import { DeviceType } from '../../types/electrical';

interface DeviceThumbnailProps {
  type: DeviceType;
  className?: string;
}

export const DeviceThumbnail: React.FC<DeviceThumbnailProps> = ({ type, className = "w-14 h-14" }) => {
  return (
    <div className={`flex items-center justify-center bg-[#fbfaf8] border border-stone-200/90 rounded-lg p-1 overflow-hidden shrink-0 shadow-sm ${className}`}>
      <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm select-none">
        <defs>
          <linearGradient id="thumbPlastic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="thumbBrass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id="thumbSoil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#1a0a01" />
          </linearGradient>
          <linearGradient id="thumbLcd" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="100%" stopColor="#65a30d" />
          </linearGradient>
        </defs>

        {/* Dynamic rendering based on type */}
        {type.includes('meter') && (
          <g transform="translate(14, 6)">
            {/* Meter Body */}
            <rect x="0" y="0" width="52" height="68" rx="4" fill="url(#thumbPlastic)" stroke="#94a3b8" strokeWidth="1.2" />
            {/* LCD Screen */}
            <rect x="6" y="10" width="40" height="18" rx="2" fill="url(#thumbLcd)" stroke="#334155" strokeWidth="0.8" />
            <text x="26" y="23" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="monospace" fill="#14532d">1234.5</text>
            {/* Red Pulse LED */}
            <circle cx="12" cy="24" r="1.5" fill="#ef4444" />
            {/* Terminal Cover */}
            <rect x="4" y="46" width="44" height="18" rx="2" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
            {/* Terminals */}
            <circle cx="12" cy="55" r="2.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
            <circle cx="21" cy="55" r="2.5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.5" />
            <circle cx="31" cy="55" r="2.5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.5" />
            <circle cx="40" cy="55" r="2.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
          </g>
        )}

        {(type === 'mcb_1p' || type === 'service_disconnect_2p') && (
          <g transform="translate(24, 6)">
            <rect x="-6" y="24" width="44" height="20" fill="#64748b" opacity="0.3" stroke="#475569" strokeWidth="0.8" />
            {/* Breaker Body */}
            <rect x="0" y="0" width="32" height="68" rx="3" fill="url(#thumbPlastic)" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="4" y="14" width="24" height="40" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            {/* Flag Window */}
            <rect x="10" y="18" width="12" height="5" rx="1" fill="#ef4444" stroke="#334155" strokeWidth="0.5" />
            {/* Lever */}
            <rect x="8" y="28" width="16" height="14" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
            {/* Rating text */}
            <text x="16" y="50" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a">C16</text>
            {/* Terminal Screws */}
            <circle cx="16" cy="6" r="2.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
            <circle cx="16" cy="62" r="2.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
          </g>
        )}

        {type === 'mcb_2p' && (
          <g transform="translate(18, 6)">
            <rect x="0" y="0" width="44" height="68" rx="3" fill="url(#thumbPlastic)" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="4" y="14" width="36" height="40" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <rect x="12" y="28" width="20" height="14" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
            <text x="22" y="50" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a">2P C32</text>
            <circle cx="12" cy="6" r="2.5" fill="#ca8a04" />
            <circle cx="32" cy="6" r="2.5" fill="#ca8a04" />
            <circle cx="12" cy="62" r="2.5" fill="#ca8a04" />
            <circle cx="32" cy="62" r="2.5" fill="#ca8a04" />
          </g>
        )}

        {type === 'mcb_3p' && (
          <g transform="translate(12, 6)">
            <rect x="0" y="0" width="56" height="68" rx="3" fill="url(#thumbPlastic)" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="4" y="14" width="48" height="40" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <rect x="14" y="28" width="28" height="14" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
            <text x="28" y="50" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a">3P D32</text>
            <circle cx="12" cy="6" r="2" fill="#ca8a04" />
            <circle cx="28" cy="6" r="2" fill="#ca8a04" />
            <circle cx="44" cy="6" r="2" fill="#ca8a04" />
            <circle cx="12" cy="62" r="2" fill="#ca8a04" />
            <circle cx="28" cy="62" r="2" fill="#ca8a04" />
            <circle cx="44" cy="62" r="2" fill="#ca8a04" />
          </g>
        )}

        {type === 'rcd_2p' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="3" fill="url(#thumbPlastic)" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="4" y="14" width="40" height="40" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            {/* Test Button "T" */}
            <circle cx="14" cy="35" r="7" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.8" />
            <text x="14" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff">T</text>
            {/* Lever */}
            <rect x="26" y="28" width="14" height="14" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
            <text x="24" y="50" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0284c7">30mA</text>
            <circle cx="14" cy="6" r="2.5" fill="#ca8a04" />
            <circle cx="34" cy="6" r="2.5" fill="#2563eb" />
            <circle cx="14" cy="62" r="2.5" fill="#ca8a04" />
            <circle cx="34" cy="62" r="2.5" fill="#2563eb" />
          </g>
        )}

        {type === 'spd_surge' && (
          <g transform="translate(22, 6)">
            <rect x="0" y="0" width="36" height="68" rx="3" fill="url(#thumbPlastic)" stroke="#94a3b8" strokeWidth="1.2" />
            {/* Lightning bolt */}
            <path d="M 19 22 L 14 32 L 18 32 L 15 42 L 23 30 L 19 30 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.8" />
            {/* Green OK status window */}
            <rect x="10" y="46" width="16" height="7" rx="1.5" fill="#22c55e" stroke="#15803d" strokeWidth="0.5" />
            <circle cx="12" cy="6" r="2.5" fill="#ca8a04" />
            <circle cx="24" cy="6" r="2.5" fill="#2563eb" />
            <circle cx="18" cy="62" r="2.5" fill="#16a34a" />
          </g>
        )}

        {(type === 'earth_busbar' || type === 'neutral_busbar') ? (
          <g transform="translate(26, 6)">
            {/* Standoff Brackets (Green for earth, Blue for neutral) */}
            <rect x="0" y="0" width="28" height="12" rx="2" fill={type === 'neutral_busbar' ? '#2563eb' : '#16a34a'} />
            <rect x="0" y="56" width="28" height="12" rx="2" fill={type === 'neutral_busbar' ? '#2563eb' : '#16a34a'} />
            {/* Brass Bar */}
            <rect x="7" y="6" width="14" height="56" rx="1" fill="url(#thumbBrass)" stroke="#854d0e" strokeWidth="0.8" />
            {/* Screws */}
            {[14, 24, 34, 44, 54].map((sy, i) => (
              <circle key={i} cx="14" cy={sy} r="2.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
            ))}
          </g>
        ) : null}

        {type === 'ground_pit' && (
          <g transform="translate(10, 8)">
            {/* Soil Cutaway */}
            <rect x="0" y="0" width="60" height="64" rx="4" fill="url(#thumbSoil)" stroke="#78350f" strokeWidth="1" />
            {/* Concrete Well */}
            <rect x="10" y="8" width="40" height="32" rx="2" fill="#475569" stroke="#64748b" strokeWidth="1" />
            <rect x="13" y="11" width="34" height="26" fill="#1e293b" />
            {/* Copper Rod */}
            <rect x="27" y="16" width="6" height="44" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
            {/* Clamp */}
            <rect x="23" y="20" width="14" height="8" rx="1.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
          </g>
        )}

        {(type === 'switch_1gang' || type === 'switch_3way' || type === 'switch_4way') && (
          <g transform="translate(16, 6)">
            {/* Wall Plate */}
            <rect x="0" y="0" width="48" height="68" rx="5" fill="url(#thumbPlastic)" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Plate Screws */}
            <circle cx="24" cy="8" r="1.5" fill="#94a3b8" />
            <circle cx="24" cy="60" r="1.5" fill="#94a3b8" />
            {/* Rocker */}
            <rect x="10" y="16" width="28" height="36" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
            <line x1="14" y1="34" x2="34" y2="34" stroke="#ca8a04" strokeWidth="1.5" />
          </g>
        )}

        {type === 'socket_duplex' && (
          <g transform="translate(10, 16)">
            {/* Horizontal Duplex Plate */}
            <rect x="0" y="0" width="60" height="42" rx="4" fill="url(#thumbPlastic)" stroke="#cbd5e1" strokeWidth="1.2" />
            <circle cx="4" cy="21" r="1.2" fill="#94a3b8" />
            <circle cx="56" cy="21" r="1.2" fill="#94a3b8" />
            {/* Gang 1 Receptacle */}
            <rect x="10" y="8" width="18" height="26" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
            <rect x="13" y="13" width="12" height="2" rx="0.5" fill="#1e293b" />
            <rect x="14" y="20" width="10" height="2" rx="0.5" fill="#1e293b" />
            {/* Gang 2 Receptacle */}
            <rect x="32" y="8" width="18" height="26" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
            <rect x="35" y="13" width="12" height="2" rx="0.5" fill="#1e293b" />
            <rect x="36" y="20" width="10" height="2" rx="0.5" fill="#1e293b" />
            {/* Center Status Glow LED */}
            <circle cx="30" cy="21" r="1.8" fill="#22c55e" />
          </g>
        )}

        {type === 'socket_schuko' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="5" fill="url(#thumbPlastic)" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="24" cy="7" r="1.5" fill="#94a3b8" />
            <circle cx="24" cy="61" r="1.5" fill="#94a3b8" />
            {/* Receptacle Cavity */}
            <rect x="8" y="14" width="32" height="40" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
            <circle cx="16" cy="34" r="3" fill="#1e293b" />
            <circle cx="32" cy="34" r="3" fill="#1e293b" />
            <rect x="23" y="18" width="2" height="6" fill="#ca8a04" />
            <rect x="23" y="44" width="2" height="6" fill="#ca8a04" />
          </g>
        )}

        {type === 'light_bulb' && (
          <g transform="translate(16, 6)">
            {/* Radiant glow background */}
            <circle cx="24" cy="24" r="22" fill="#fef08a" opacity="0.6" />
            {/* Ceramic Socket Base */}
            <rect x="14" y="44" width="20" height="18" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            {/* Glass Bulb */}
            <path d="M 16 44 C 4 32, 4 16, 16 6 C 22 1, 26 1, 32 6 C 44 16, 44 32, 32 44 Z" fill="#ffffff" stroke="#eab308" strokeWidth="1.2" opacity="0.9" />
            {/* Tungsten Filament */}
            <path d="M 20 28 Q 24 20 28 28" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          </g>
        )}

        {type === 'appliance_tv' && (
          <g transform="translate(10, 14)">
            <rect x="0" y="0" width="60" height="42" rx="2" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
            <rect x="3" y="3" width="54" height="32" rx="1.5" fill="#0284c7" />
            <polygon points="26,14 36,19 26,24" fill="#ffffff" />
            <rect x="26" y="42" width="8" height="6" fill="#475569" />
            <rect x="15" y="48" width="30" height="3" rx="1" fill="#1e293b" />
          </g>
        )}

        {type === 'appliance_water_heater' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            <rect x="6" y="6" width="36" height="14" rx="2" fill="#0284c7" />
            <circle cx="24" cy="34" r="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="24" cy="34" r="7" fill="#0f172a" />
            <circle cx="12" cy="54" r="2.5" fill="#ef4444" />
            <text x="24" y="62" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#334155">3.5kW</text>
          </g>
        )}

        {type === 'appliance_fan' && (
          <g transform="translate(14, 4)">
            {/* Stand */}
            <ellipse cx="26" cy="64" rx="20" ry="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
            <rect x="24" y="42" width="4" height="22" fill="#64748b" />
            {/* Fan Cage Ring */}
            <circle cx="26" cy="26" r="22" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.5" />
            {/* 3 Blades */}
            <g transform="translate(26, 26)">
              <path d="M 0 0 C 6 -8, 14 -12, 0 -18 C -10 -12, -4 -6, 0 0 Z" fill="#38bdf8" />
              <path d="M 0 0 C 6 -8, 14 -12, 0 -18 C -10 -12, -4 -6, 0 0 Z" fill="#38bdf8" transform="rotate(120)" />
              <path d="M 0 0 C 6 -8, 14 -12, 0 -18 C -10 -12, -4 -6, 0 0 Z" fill="#38bdf8" transform="rotate(240)" />
              <circle cx="0" cy="0" r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
            </g>
          </g>
        )}

        {type === 'appliance_ac' && (
          <g transform="translate(8, 20)">
            {/* Indoor AC Unit */}
            <rect x="0" y="0" width="64" height="38" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="6" y1="6" x2="58" y2="6" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="6" y1="10" x2="58" y2="10" stroke="#cbd5e1" strokeWidth="1" />
            {/* Inverter Tag */}
            <rect x="6" y="16" width="18" height="6" rx="1" fill="#0f172a" />
            <text x="15" y="21" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#38bdf8">INV</text>
            {/* Digital Display */}
            <rect x="42" y="14" width="18" height="10" rx="1.5" fill="#020617" />
            <text x="51" y="22" textAnchor="middle" fontSize="6.5" fontWeight="bold" fontFamily="monospace" fill="#38bdf8">16°</text>
            {/* Louver Slot */}
            <rect x="4" y="30" width="56" height="3" rx="0.5" fill="#64748b" />
          </g>
        )}

        {type === 'motor_3phase_dol' && (
          <g transform="translate(10, 10)">
            {/* Motor Cylinder */}
            <rect x="8" y="14" width="44" height="40" rx="8" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            {/* Fins */}
            {[22, 30, 38, 46].map((fy, i) => (
              <line key={i} x1="6" y1={fy} x2="54" y2={fy} stroke="#475569" strokeWidth="1.2" />
            ))}
            {/* Rotating Fan Center */}
            <circle cx="30" cy="34" r="10" fill="#090d16" stroke="#38bdf8" strokeWidth="0.8" />
            {/* Top Terminal Box */}
            <rect x="12" y="2" width="36" height="14" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
          </g>
        )}

        {type === 'junction_box_octagonal_orange' ? (
          <g transform="translate(12, 12)">
            <rect x="23" y="-5" width="10" height="6" rx="1" fill="#ea580c" stroke="#9a3412" strokeWidth={0.8} />
            <rect x="23" y="55" width="10" height="6" rx="1" fill="#ea580c" stroke="#9a3412" strokeWidth={0.8} />
            <rect x="-5" y="23" width="6" height="10" rx="1" fill="#ea580c" stroke="#9a3412" strokeWidth={0.8} />
            <rect x="55" y="23" width="6" height="10" rx="1" fill="#ea580c" stroke="#9a3412" strokeWidth={0.8} />
            <polygon points="12,0 44,0 56,12 56,44 44,56 12,56 0,44 0,12" fill="#f97316" stroke="#c2410c" strokeWidth={1.5} />
            <polygon points="14,4 42,4 52,14 52,42 42,52 14,52 4,42 4,14" fill="#7c2d12" />
            <circle cx="28" cy="28" r="6" fill="none" stroke="#ea580c" strokeWidth={1} strokeDasharray="3,1" />
            <polygon points="12,20 18,20 16,12 14,12" fill="#dc2626" />
            <polygon points="38,20 44,20 42,12 40,12" fill="#2563eb" />
          </g>
        ) : type.includes('junction_box') ? (
          <g transform="translate(12, 12)">
            {/* 4 External Conduit Hubs */}
            <rect x="23" y="-5" width="10" height="6" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
            <rect x="23" y="55" width="10" height="6" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
            <rect x="-5" y="23" width="6" height="10" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
            <rect x="55" y="23" width="6" height="10" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
            {/* Octagonal Body */}
            <polygon points="12,0 44,0 56,12 56,44 44,56 12,56 0,44 0,12" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
            <polygon points="14,4 42,4 52,14 52,42 42,52 14,52 4,42 4,14" fill="#1e293b" />
            {/* Internal Wire Nuts */}
            <polygon points="12,20 18,20 16,12 14,12" fill="#dc2626" />
            <polygon points="38,20 44,20 42,12 40,12" fill="#2563eb" />
            <polygon points="12,44 18,44 16,36 14,36" fill="#16a34a" />
            <polygon points="38,44 44,44 42,36 40,36" fill="#d97706" />
          </g>
        ) : null}

        {type === 'splice_wire_nut' && (
          <g transform="translate(20, 10)">
            <polygon points="12,4 28,4 34,44 6,44" fill="#ef4444" stroke="#991b1b" strokeWidth="1.2" />
            <line x1="16" y1="8" x2="13" y2="40" stroke="#fee2e2" strokeWidth="1" opacity="0.7" />
            <line x1="20" y1="6" x2="20" y2="42" stroke="#fee2e2" strokeWidth="1" opacity="0.8" />
            <line x1="24" y1="8" x2="27" y2="40" stroke="#fee2e2" strokeWidth="1" opacity="0.7" />
            <rect x="7" y="44" width="26" height="8" rx="1.5" fill="#991b1b" />
          </g>
        )}

        {type === 'wago_connector_3p' && (
          <g transform="translate(14, 18)">
            <rect x="0" y="0" width="52" height="42" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
            {/* 3 Orange levers */}
            <rect x="8" y="4" width="8" height="18" rx="1.5" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
            <rect x="22" y="4" width="8" height="18" rx="1.5" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
            <rect x="36" y="4" width="8" height="18" rx="1.5" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
            {/* Copper Bus */}
            <rect x="6" y="26" width="40" height="4" fill="#d97706" />
          </g>
        )}

        {type === 'industrial_relay_dpdt' && (
          <g transform="translate(18, 6)">
            {/* DIN Socket Base */}
            <rect x="0" y="0" width="44" height="68" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
            {/* Clear Cover */}
            <rect x="4" y="10" width="36" height="48" rx="3" fill="#bae6fd" opacity="0.45" stroke="#94a3b8" strokeWidth="0.8" />
            {/* Copper Coil */}
            <rect x="10" y="18" width="14" height="24" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="0.6" />
            <circle cx="28" cy="24" r="2" fill="#22c55e" />
            <text x="22" y="64" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#38bdf8">RELAY</text>
          </g>
        )}

        {type === 'contactor_3p' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="12" y="10" width="32" height="48" rx="3" fill="#1e293b" />
            {/* Moving Orange Tab */}
            <rect x="22" y="26" width="12" height="16" rx="2" fill="#f97316" />
            <text x="24" y="64" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a">3P KM1</text>
          </g>
        )}

        {type === 'push_button_station' && (
          <g transform="translate(20, 6)">
            <rect x="0" y="0" width="40" height="68" rx="5" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
            {/* Green Start */}
            <circle cx="20" cy="22" r="11" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="20" cy="22" r="8" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
            <text x="20" y="25" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff">I</text>
            {/* Red Stop */}
            <circle cx="20" cy="48" r="11" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="20" cy="48" r="8" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
            <circle cx="20" cy="48" r="3" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}

        {type === 'push_button_estop' && (
          <g transform="translate(18, 10)">
            <rect x="0" y="0" width="44" height="60" rx="5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
            <circle cx="22" cy="24" r="18" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="22" cy="24" r="14" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
            <text x="22" y="52" textAnchor="middle" fontSize="6" fontWeight="900" fill="#854d0e">E-STOP</text>
          </g>
        )}

        {type === 'pilot_light_indicator' && (
          <g transform="translate(22, 12)">
            <rect x="0" y="0" width="36" height="56" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
            <circle cx="18" cy="22" r="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="18" cy="22" r="10" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
            <circle cx="18" cy="22" r="6" fill="#86efac" opacity="0.6" />
            <text x="18" y="48" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#15803d">PILOT</text>
          </g>
        )}

        {type === 'plc_micro_controller' && (
          <g transform="translate(10, 10)">
            <rect x="0" y="0" width="60" height="60" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
            {/* LCD Screen */}
            <rect x="14" y="12" width="32" height="24" rx="2" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
            <text x="30" y="23" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="monospace" fill="#052e16">PLC RUN</text>
            <text x="30" y="31" textAnchor="middle" fontSize="4.5" fontWeight="bold" fontFamily="monospace" fill="#052e16">I:1 Q:1</text>
            <circle cx="10" cy="46" r="1.5" fill="#22c55e" />
            <circle cx="16" cy="46" r="1.5" fill="#22c55e" />
            <circle cx="44" cy="46" r="1.5" fill="#f97316" />
            <circle cx="50" cy="46" r="1.5" fill="#f97316" />
          </g>
        )}

        {type === 'motor_ac_industrial' && (
          <g transform="translate(10, 10)">
            <rect x="10" y="18" width="40" height="34" rx="6" fill="#0284c7" stroke="#075985" strokeWidth="1.2" />
            {/* Fins */}
            <line x1="14" y1="24" x2="46" y2="24" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
            <line x1="14" y1="30" x2="46" y2="30" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
            <line x1="14" y1="36" x2="46" y2="36" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
            {/* Terminal Box */}
            <rect x="20" y="8" width="20" height="12" rx="2" fill="#0f172a" />
            {/* Shaft */}
            <rect x="2" y="30" width="10" height="8" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.6" />
            <text x="30" y="47" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#ffffff">3P MOTOR</text>
          </g>
        )}

        {type === 'royu_safety_breaker_2p' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="4" y="6" width="40" height="12" rx="2" fill="#dc2626" />
            <text x="24" y="15" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#ffffff">ROYU SAFETY</text>
            <rect x="8" y="24" width="32" height="28" rx="2" fill="#18181b" stroke="#475569" strokeWidth="0.8" />
            <rect x="14" y="30" width="20" height="12" rx="2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
            <text x="24" y="39" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#ffffff">ON</text>
            <text x="24" y="60" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#475569">2P 30A</text>
          </g>
        )}

        {type === 'din_rail_track' && (
          <g transform="translate(6, 26)">
            <rect x="0" y="0" width="68" height="28" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="5" x2="68" y2="5" stroke="#ffffff" strokeWidth="1" />
            <line x1="0" y1="23" x2="68" y2="23" stroke="#475569" strokeWidth="1" />
            {[10, 24, 38, 52].map(sx => (
              <rect key={sx} x={sx} y="10" width="8" height="8" rx="2" fill="#334155" opacity="0.6" />
            ))}
          </g>
        )}

        {type === 'utility_box_surface_pvc' && (
          <g transform="translate(18, 6)">
            <rect x="0" y="0" width="44" height="68" rx="4" fill="#ea580c" stroke="#9a3412" strokeWidth="1.2" />
            <rect x="4" y="5" width="36" height="58" rx="3" fill="#7c2d12" stroke="#431407" strokeWidth="0.8" />
            <circle cx="22" cy="12" r="3" fill="#ca8a04" />
            <circle cx="22" cy="56" r="3" fill="#ca8a04" />
            <text x="22" y="34" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#fed7aa">ROYU</text>
            <text x="22" y="42" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#ffedd5">2"×4" BOX</text>
          </g>
        )}

        {type === 'royu_modular_combo_plate' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
            {/* Rocker */}
            <rect x="6" y="8" width="36" height="15" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.6" />
            <circle cx="24" cy="13" r="1.5" fill="#f97316" />
            {/* Red Pilot */}
            <rect x="6" y="27" width="36" height="12" rx="2" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.6" />
            <circle cx="24" cy="33" r="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
            {/* Outlet */}
            <rect x="6" y="43" width="36" height="19" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
            <line x1="16" y1="48" x2="16" y2="53" stroke="#1e293b" strokeWidth="1" />
            <line x1="32" y1="48" x2="32" y2="53" stroke="#1e293b" strokeWidth="1" />
            <circle cx="24" cy="56" r="1.5" fill="#1e293b" />
          </g>
        )}
      </svg>
    </div>
  );
};
