import React from 'react';
import { DeviceType } from '../../types/electrical';

interface DeviceThumbnailProps {
  type: DeviceType;
  className?: string;
}

export const DeviceThumbnail: React.FC<DeviceThumbnailProps> = ({ type, className = "w-14 h-14" }) => {
  return (
    <div className={`flex items-center justify-center bg-[#fbfaf8] border border-border/90 rounded-lg p-1 overflow-hidden shrink-0 shadow-sm ${className}`}>
      <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm select-none">
        <defs>
          <linearGradient id="thumbPlastic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--mat-housing)" />
            <stop offset="60%" stopColor="var(--mat-housing)" />
            <stop offset="100%" stopColor="var(--mat-housing-shade)" />
          </linearGradient>
          <linearGradient id="thumbBrass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--mat-brass)" />
            <stop offset="50%" stopColor="var(--lamp-white-on)" />
            <stop offset="100%" stopColor="var(--cond-brown)" />
          </linearGradient>
          <linearGradient id="thumbSoil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--mat-copper-dark)" />
            <stop offset="100%" stopColor="var(--mat-copper-dark)" />
          </linearGradient>
          <linearGradient id="thumbLcd" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="100%" stopColor="#65a30d" />
          </linearGradient>
        </defs>

        {/* Dynamic rendering based on type */}
        {(type === 'kwh_meter_1p' || type === 'kwh_meter_3p') && (
          <g transform="translate(14, 6)">
            {/* Meter Body */}
            <rect x="0" y="0" width="52" height="68" rx="4" fill="url(#thumbPlastic)" stroke="var(--mat-steel)" strokeWidth="1.2" />
            {/* LCD Screen */}
            <rect x="6" y="10" width="40" height="18" rx="2" fill="url(#thumbLcd)" stroke="var(--mat-housing-dark-face)" strokeWidth="0.8" />
            <text x="26" y="23" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-green-off)">1234.5</text>
            {/* Red Pulse LED */}
            <circle cx="12" cy="24" r="1.5" fill="var(--act-red)" />
            {/* Terminal Cover */}
            <rect x="4" y="46" width="44" height="18" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="0.8" />
            {/* Terminals */}
            <circle cx="12" cy="55" r="2.5" fill="var(--mat-brass)" stroke="var(--mat-copper-dark)" strokeWidth="0.5" />
            <circle cx="21" cy="55" r="2.5" fill="var(--cond-blue)" stroke="var(--act-blue)" strokeWidth="0.5" />
            <circle cx="31" cy="55" r="2.5" fill="var(--cond-blue)" stroke="var(--act-blue)" strokeWidth="0.5" />
            <circle cx="40" cy="55" r="2.5" fill="var(--mat-brass)" stroke="var(--mat-copper-dark)" strokeWidth="0.5" />
          </g>
        )}

        {(type === 'mcb_1p' || type === 'service_disconnect_2p') && (
          <g transform="translate(24, 6)">
            <rect x="0" y="0" width="32" height="68" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="2" y="2" width="28" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="2" y="56" width="28" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <circle cx="16" cy="7" r="3" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <circle cx="16" cy="61" r="3" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <rect x="1" y="14" width="30" height="8" fill="var(--nameplate)" />
            <text x="16" y="19.8" textAnchor="middle" fontSize="5" fontWeight="900" fill="var(--silk-on-dark)">C16</text>
            <rect x="10" y="24" width="12" height="5" rx="0.8" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <rect x="7" y="34" width="18" height="13" rx="1.5" fill="var(--mat-line)" />
            <line x1="9" y1="40.5" x2="23" y2="40.5" stroke="var(--silk-muted)" strokeWidth="1" />
          </g>
        )}

        {type === 'mcb_2p' && (
          <g transform="translate(18, 6)">
            <rect x="0" y="0" width="44" height="68" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <line x1="22" y1="0" x2="22" y2="68" stroke="var(--mat-steel)" strokeWidth="0.8" />
            <rect x="2" y="2" width="40" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="2" y="56" width="40" height="10" rx="1" fill="var(--mat-housing-dark)" />
            {[12, 32].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="7" r="2.8" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <circle cx={cx} cy="61" r="2.8" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <rect x={cx - 4.5} y="24" width="9" height="4.5" rx="0.6" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
              </React.Fragment>
            ))}
            <rect x="1" y="14" width="42" height="8" fill="var(--nameplate)" />
            <text x="22" y="19.8" textAnchor="middle" fontSize="5" fontWeight="900" fill="var(--silk-on-dark)">2P C32</text>
            <rect x="8" y="34" width="28" height="13" rx="1.5" fill="var(--mat-line)" />
            <rect x="18" y="36" width="8" height="9" rx="1" fill="var(--mat-housing-dark-face)" />
          </g>
        )}

        {type === 'mcb_3p' && (
          <g transform="translate(12, 6)">
            <rect x="0" y="0" width="56" height="68" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <line x1="18.6" y1="0" x2="18.6" y2="68" stroke="var(--mat-steel)" strokeWidth="0.7" />
            <line x1="37.3" y1="0" x2="37.3" y2="68" stroke="var(--mat-steel)" strokeWidth="0.7" />
            <rect x="2" y="2" width="52" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="2" y="56" width="52" height="10" rx="1" fill="var(--mat-housing-dark)" />
            {[10, 28, 46].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="7" r="2.5" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <circle cx={cx} cy="61" r="2.5" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <rect x={cx - 4} y="24" width="8" height="4.5" rx="0.6" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
              </React.Fragment>
            ))}
            <rect x="1" y="14" width="54" height="8" fill="var(--nameplate)" />
            <text x="28" y="19.8" textAnchor="middle" fontSize="5" fontWeight="900" fill="var(--silk-on-dark)">3P D32</text>
            <rect x="8" y="34" width="40" height="13" rx="1.5" fill="var(--mat-line)" />
          </g>
        )}

        {type === 'rcd_2p' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="2" y="2" width="44" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="2" y="56" width="44" height="10" rx="1" fill="var(--mat-housing-dark)" />
            {[13, 35].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="7" r="2.8" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <circle cx={cx} cy="61" r="2.8" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
              </React.Fragment>
            ))}
            <rect x="1" y="14" width="46" height="8" fill="var(--nameplate)" />
            <text x="24" y="19.8" textAnchor="middle" fontSize="4.8" fontWeight="900" fill="var(--silk-on-dark)">RCCB 30mA</text>
            <rect x="7" y="25" width="12" height="5" rx="0.8" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <rect x="26" y="24" width="14" height="9" rx="1.5" fill="var(--cond-blue)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <text x="33" y="30.5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="var(--silk-on-dark)">T</text>
            <rect x="8" y="37" width="32" height="13" rx="1.5" fill="var(--mat-line)" />
          </g>
        )}

        {type === 'spd_surge' && (
          <g transform="translate(22, 6)">
            <rect x="0" y="0" width="36" height="68" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="2" y="2" width="32" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="2" y="56" width="32" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <circle cx="11" cy="7" r="2.5" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <circle cx="25" cy="7" r="2.5" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <circle cx="18" cy="61" r="2.8" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <rect x="1" y="14" width="34" height="8" fill="var(--nameplate)" />
            <text x="18" y="19.5" textAnchor="middle" fontSize="4.8" fontWeight="900" fill="var(--act-yellow)">SPD T2</text>
            <path d="M 19 25 L 14 34 L 18 34 L 15 43 L 23 32 L 19 32 Z" fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth="0.7" />
            <rect x="10" y="46" width="16" height="6" rx="1" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.6" />
          </g>
        )}

        {(type === 'earth_busbar' || type === 'neutral_busbar') ? (
          <g transform="translate(26, 6)">
            {/* Standoff Brackets (Green for earth, Blue for neutral) */}
            <rect x="0" y="0" width="28" height="12" rx="2" fill={type === 'neutral_busbar' ? 'var(--cond-blue)' : 'var(--cond-green)'} />
            <rect x="0" y="56" width="28" height="12" rx="2" fill={type === 'neutral_busbar' ? 'var(--cond-blue)' : 'var(--cond-green)'} />
            {/* Brass Bar */}
            <rect x="7" y="6" width="14" height="56" rx="1" fill="url(#thumbBrass)" stroke="var(--cond-brown)" strokeWidth="0.8" />
            {/* Screws */}
            {[14, 24, 34, 44, 54].map((sy, i) => (
              <circle key={i} cx="14" cy={sy} r="2.5" fill="var(--mat-brass)" stroke="var(--mat-copper-dark)" strokeWidth="0.5" />
            ))}
          </g>
        ) : null}

        {type === 'ground_pit' && (
          <g transform="translate(10, 8)">
            {/* Soil Cutaway */}
            <rect x="0" y="0" width="60" height="64" rx="4" fill="url(#thumbSoil)" stroke="var(--mat-copper-dark)" strokeWidth="1" />
            {/* Concrete Well */}
            <rect x="10" y="8" width="40" height="32" rx="2" fill="var(--silk-muted)" stroke="var(--mat-line-soft)" strokeWidth="1" />
            <rect x="13" y="11" width="34" height="26" fill="var(--mat-housing-dark)" />
            {/* Copper Rod */}
            <rect x="27" y="16" width="6" height="44" rx="1.5" fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth="0.8" />
            {/* Clamp */}
            <rect x="23" y="20" width="14" height="8" rx="1.5" fill="var(--mat-brass)" stroke="var(--mat-copper-dark)" strokeWidth="0.8" />
          </g>
        )}

        {(type === 'switch_1gang' || type === 'switch_3way' || type === 'switch_4way') && (
          <g transform="translate(16, 6)">
            {/* Wall Plate */}
            <rect x="0" y="0" width="48" height="68" rx="5" fill="url(#thumbPlastic)" stroke="var(--mat-housing-shade)" strokeWidth="1.5" />
            {/* Plate Screws */}
            <circle cx="24" cy="8" r="1.5" fill="var(--mat-steel)" />
            <circle cx="24" cy="60" r="1.5" fill="var(--mat-steel)" />
            {/* Rocker */}
            <rect x="10" y="16" width="28" height="36" rx="3" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="0.8" />
            <line x1="14" y1="34" x2="34" y2="34" stroke="var(--mat-brass)" strokeWidth="1.5" />
          </g>
        )}

        {type === 'socket_duplex' && (
          <g transform="translate(8, 17)">
            <rect x="0" y="0" width="64" height="44" rx="3" fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="3" y="3" width="58" height="38" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="0.6" />
            {[10, 36].map((gx) => (
              <g key={gx}>
                <rect x={gx} y="8" width="18" height="28" rx="2" fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth="0.8" />
                <rect x={gx + 3.5} y="13" width="4" height="2" fill="var(--mat-line)" />
                <rect x={gx + 10.5} y="13" width="4" height="2" fill="var(--mat-line)" />
                <circle cx={gx + 9} cy="25" r="2.2" fill="var(--mat-line)" />
              </g>
            ))}
            <circle cx="32" cy="22" r="2" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
          </g>
        )}

        {type === 'socket_schuko' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="5" fill="url(#thumbPlastic)" stroke="var(--mat-housing-shade)" strokeWidth="1.5" />
            <circle cx="24" cy="7" r="1.5" fill="var(--mat-steel)" />
            <circle cx="24" cy="61" r="1.5" fill="var(--mat-steel)" />
            {/* Receptacle Cavity */}
            <rect x="8" y="14" width="32" height="40" rx="4" fill="var(--mat-housing)" stroke="var(--mat-housing-shade)" strokeWidth="0.8" />
            <circle cx="16" cy="34" r="3" fill="var(--mat-housing-dark)" />
            <circle cx="32" cy="34" r="3" fill="var(--mat-housing-dark)" />
            <rect x="23" y="18" width="2" height="6" fill="var(--mat-brass)" />
            <rect x="23" y="44" width="2" height="6" fill="var(--mat-brass)" />
          </g>
        )}

        {type === 'light_bulb' && (
          <g transform="translate(16, 6)">
            {/* Radiant glow background */}
            <circle cx="24" cy="24" r="22" fill="var(--lamp-white-on)" opacity="0.6" />
            {/* Ceramic Socket Base */}
            <rect x="14" y="44" width="20" height="18" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="1" />
            {/* Glass Bulb */}
            <path d="M 16 44 C 4 32, 4 16, 16 6 C 22 1, 26 1, 32 6 C 44 16, 44 32, 32 44 Z" fill="var(--mat-housing)" stroke="var(--act-yellow)" strokeWidth="1.2" opacity="0.9" />
            {/* Tungsten Filament */}
            <path d="M 20 28 Q 24 20 28 28" fill="none" stroke="var(--lamp-amber-on)" strokeWidth="1.5" />
          </g>
        )}

        {type === 'appliance_tv' && (
          <g transform="translate(10, 14)">
            <rect x="0" y="0" width="60" height="42" rx="2" fill="var(--mat-line)" stroke="var(--mat-housing-dark-face)" strokeWidth="1.5" />
            <rect x="3" y="3" width="54" height="32" rx="1.5" fill="var(--lamp-blue-on)" />
            <polygon points="26,14 36,19 26,24" fill="var(--mat-housing)" />
            <rect x="26" y="42" width="8" height="6" fill="var(--silk-muted)" />
            <rect x="15" y="48" width="30" height="3" rx="1" fill="var(--mat-housing-dark)" />
          </g>
        )}

        {type === 'appliance_water_heater' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="6" fill="var(--mat-housing)" stroke="var(--mat-housing-shade)" strokeWidth="1.5" />
            <rect x="6" y="6" width="36" height="14" rx="2" fill="var(--console)" />
            <circle cx="24" cy="34" r="10" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="1" />
            <circle cx="24" cy="34" r="7" fill="var(--mat-line)" />
            <circle cx="12" cy="54" r="2.5" fill="var(--act-red)" />
            <text x="24" y="62" textAnchor="middle" fontSize="6" fontWeight="bold" fill="var(--silk)">3.5kW</text>
          </g>
        )}

        {type === 'appliance_fan' && (
          <g transform="translate(14, 4)">
            {/* Stand */}
            <ellipse cx="26" cy="64" rx="20" ry="6" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="1" />
            <rect x="24" y="42" width="4" height="22" fill="var(--mat-line-soft)" />
            {/* Fan Cage Ring */}
            <circle cx="26" cy="26" r="22" fill="#f0f9ff" stroke="var(--act-blue)" strokeWidth="1.5" />
            {/* 3 Blades */}
            <g transform="translate(26, 26)">
              <path d="M 0 0 C 6 -8, 14 -12, 0 -18 C -10 -12, -4 -6, 0 0 Z" fill="var(--lamp-blue-on)" />
              <path d="M 0 0 C 6 -8, 14 -12, 0 -18 C -10 -12, -4 -6, 0 0 Z" fill="var(--lamp-blue-on)" transform="rotate(120)" />
              <path d="M 0 0 C 6 -8, 14 -12, 0 -18 C -10 -12, -4 -6, 0 0 Z" fill="var(--lamp-blue-on)" transform="rotate(240)" />
              <circle cx="0" cy="0" r="4" fill="var(--act-blue)" stroke="var(--mat-housing)" strokeWidth="0.8" />
            </g>
          </g>
        )}

        {type === 'appliance_ac' && (
          <g transform="translate(8, 20)">
            {/* Indoor AC Unit */}
            <rect x="0" y="0" width="64" height="38" rx="3" fill="var(--mat-housing)" stroke="var(--mat-steel)" strokeWidth="1.2" />
            <line x1="6" y1="6" x2="58" y2="6" stroke="var(--mat-housing-shade)" strokeWidth="1" />
            <line x1="6" y1="10" x2="58" y2="10" stroke="var(--mat-housing-shade)" strokeWidth="1" />
            {/* Inverter Tag */}
            <rect x="6" y="16" width="18" height="6" rx="1" fill="var(--mat-line)" />
            <text x="15" y="21" textAnchor="middle" fontSize="4" fontWeight="bold" fill="var(--nameplate-tag)">INV</text>
            {/* Digital Display */}
            <rect x="42" y="14" width="18" height="10" rx="1.5" fill="var(--mat-line)" />
            <text x="51" y="22" textAnchor="middle" fontSize="6.5" fontWeight="bold" fontFamily="var(--font-mono)" fill="var(--nameplate-tag)">16°</text>
            {/* Louver Slot */}
            <rect x="4" y="30" width="56" height="3" rx="0.5" fill="var(--mat-line-soft)" />
          </g>
        )}

        {type === 'motor_3phase_dol' && (
          <g transform="translate(10, 10)">
            {/* Motor Cylinder */}
            <rect x="8" y="14" width="44" height="40" rx="8" fill="var(--mat-housing-dark-face)" stroke="var(--silk-muted)" strokeWidth="1.5" />
            {/* Fins */}
            {[22, 30, 38, 46].map((fy, i) => (
              <line key={i} x1="6" y1={fy} x2="54" y2={fy} stroke="var(--silk-muted)" strokeWidth="1.2" />
            ))}
            {/* Rotating Fan Center */}
            <circle cx="30" cy="34" r="10" fill="var(--mat-line)" stroke="var(--lamp-blue-on)" strokeWidth="0.8" />
            {/* Top Terminal Box */}
            <rect x="12" y="2" width="36" height="14" rx="2" fill="var(--mat-housing-dark)" stroke="var(--mat-line-soft)" strokeWidth="1" />
          </g>
        )}

        {type === 'junction_box_octagonal_orange' ? (
          <g transform="translate(12, 12)">
            <rect x="23" y="-5" width="10" height="6" rx="1" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth={0.8} />
            <rect x="23" y="55" width="10" height="6" rx="1" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth={0.8} />
            <rect x="-5" y="23" width="6" height="10" rx="1" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth={0.8} />
            <rect x="55" y="23" width="6" height="10" rx="1" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth={0.8} />
            <polygon points="12,0 44,0 56,12 56,44 44,56 12,56 0,44 0,12" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth={1.5} />
            <polygon points="14,4 42,4 52,14 52,42 42,52 14,52 4,42 4,14" fill="var(--mat-pvc-orange-dark)" />
            <circle cx="28" cy="28" r="6" fill="none" stroke="var(--mat-pvc-orange)" strokeWidth={1} strokeDasharray="3,1" />
            <polygon points="12,20 18,20 16,12 14,12" fill="var(--cond-red)" />
            <polygon points="38,20 44,20 42,12 40,12" fill="var(--cond-blue)" />
          </g>
        ) : type.includes('junction_box') ? (
          <g transform="translate(12, 12)">
            {/* 4 External Conduit Hubs */}
            <rect x="23" y="-5" width="10" height="6" rx="1" fill="var(--mat-steel)" stroke="var(--mat-line-soft)" strokeWidth="0.8" />
            <rect x="23" y="55" width="10" height="6" rx="1" fill="var(--mat-steel)" stroke="var(--mat-line-soft)" strokeWidth="0.8" />
            <rect x="-5" y="23" width="6" height="10" rx="1" fill="var(--mat-steel)" stroke="var(--mat-line-soft)" strokeWidth="0.8" />
            <rect x="55" y="23" width="6" height="10" rx="1" fill="var(--mat-steel)" stroke="var(--mat-line-soft)" strokeWidth="0.8" />
            {/* Octagonal Body */}
            <polygon points="12,0 44,0 56,12 56,44 44,56 12,56 0,44 0,12" fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth="1.5" />
            <polygon points="14,4 42,4 52,14 52,42 42,52 14,52 4,42 4,14" fill="var(--mat-housing-dark)" />
            {/* Internal Wire Nuts */}
            <polygon points="12,20 18,20 16,12 14,12" fill="var(--cond-red)" />
            <polygon points="38,20 44,20 42,12 40,12" fill="var(--cond-blue)" />
            <polygon points="12,44 18,44 16,36 14,36" fill="var(--cond-green)" />
            <polygon points="38,44 44,44 42,36 40,36" fill="var(--mat-copper)" />
          </g>
        ) : null}

        {type === 'splice_wire_nut' && (
          <g transform="translate(20, 10)">
            <polygon points="12,4 28,4 34,44 6,44" fill="var(--act-red)" stroke="var(--lamp-red-off)" strokeWidth="1.2" />
            <line x1="16" y1="8" x2="13" y2="40" stroke="#fee2e2" strokeWidth="1" opacity="0.7" />
            <line x1="20" y1="6" x2="20" y2="42" stroke="#fee2e2" strokeWidth="1" opacity="0.8" />
            <line x1="24" y1="8" x2="27" y2="40" stroke="#fee2e2" strokeWidth="1" opacity="0.7" />
            <rect x="7" y="44" width="26" height="8" rx="1.5" fill="var(--lamp-red-off)" />
          </g>
        )}

        {type === 'wago_connector_3p' && (
          <g transform="translate(14, 18)">
            <rect x="0" y="0" width="52" height="42" rx="3" fill="var(--mat-housing)" stroke="var(--mat-steel)" strokeWidth="1.2" />
            {/* 3 Orange levers */}
            <rect x="8" y="4" width="8" height="18" rx="1.5" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth="0.8" />
            <rect x="22" y="4" width="8" height="18" rx="1.5" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth="0.8" />
            <rect x="36" y="4" width="8" height="18" rx="1.5" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth="0.8" />
            {/* Copper Bus */}
            <rect x="6" y="26" width="40" height="4" fill="var(--mat-copper)" />
          </g>
        )}

        {type === 'industrial_relay_dpdt' && (
          <g transform="translate(18, 6)">
            {/* DIN Socket Base */}
            <rect x="0" y="0" width="44" height="68" rx="4" fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth="1.2" />
            {/* Clear Cover */}
            <rect x="4" y="10" width="36" height="48" rx="3" fill="#bae6fd" opacity="0.45" stroke="var(--mat-steel)" strokeWidth="0.8" />
            {/* Copper Coil */}
            <rect x="10" y="18" width="14" height="24" rx="2" fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth="0.6" />
            <circle cx="28" cy="24" r="2" fill="var(--lamp-green-on)" />
            <text x="22" y="64" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="var(--nameplate-tag)">RELAY</text>
          </g>
        )}

        {type === 'contactor_3p' && (
          <g transform="translate(10, 6)">
            <rect x="0" y="0" width="42" height="68" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="2" y="2" width="38" height="10" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="2" y="56" width="38" height="10" rx="1" fill="var(--mat-housing-dark)" />
            {[10, 21, 32].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="7" r="2.4" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <circle cx={cx} cy="61" r="2.4" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
              </React.Fragment>
            ))}
            <rect x="1" y="14" width="40" height="7" fill="var(--nameplate)" />
            <text x="6" y="19.3" fontSize="4.6" fontWeight="900" fill="var(--silk-on-dark)">VoltLab</text>
            <rect x="5" y="26" width="32" height="13" rx="1.5" fill="var(--mat-housing-dark)" />
            {[9, 18, 27].map((px) => (
              <rect key={px} x={px} y="28.5" width="6.5" height="8" rx="0.8" fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth="0.5" />
            ))}
            <text x="21" y="49" textAnchor="middle" fontSize="5" fontWeight="900" fill="var(--silk)">3P 25A</text>
            <rect x="44" y="4" width="16" height="60" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1" />
            <circle cx="52" cy="10" r="2.2" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <circle cx="52" cy="58" r="2.2" fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <text x="52" y="34" textAnchor="middle" fontSize="4.5" fontWeight="900" fill="var(--lamp-green-off)">NO</text>
            <text x="52" y="43" textAnchor="middle" fontSize="4.5" fontWeight="900" fill="var(--mat-copper-dark)">NC</text>
          </g>
        )}

        {type === 'thermal_overload_relay' && (
          <g transform="translate(10, 9)">
            {[10, 21, 32].map((cx) => (
              <rect key={cx} x={cx - 1.5} y="-4" width="3" height="6" rx="0.5" fill="var(--mat-copper)" stroke="var(--mat-line)" strokeWidth="0.5" />
            ))}
            <rect x="0" y="2" width="42" height="60" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="1" y="3" width="40" height="8" fill="var(--nameplate)" />
            <text x="21" y="8.8" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="var(--silk-on-dark)">VoltLab TOR</text>
            <circle cx="13" cy="27" r="8" fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth="1" />
            <line x1="13" y1="27" x2="17" y2="21" stroke="var(--mat-line)" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="26" y="18" width="11" height="5" rx="1" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <rect x="26" y="26" width="11" height="5" rx="1" fill="var(--cond-red)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <circle cx="31.5" cy="37.5" r="3.5" fill="var(--cond-blue)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <text x="31.5" y="39" textAnchor="middle" fontSize="4" fontWeight="900" fill="var(--silk-on-dark)">R</text>
            <rect x="2" y="51" width="38" height="9" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="44" y="6" width="16" height="52" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1" />
            <text x="52" y="22" textAnchor="middle" fontSize="4.2" fontWeight="900" fill="var(--mat-copper-dark)">95</text>
            <text x="52" y="30" textAnchor="middle" fontSize="4.2" fontWeight="900" fill="var(--mat-copper-dark)">96</text>
            <text x="52" y="40" textAnchor="middle" fontSize="4.2" fontWeight="900" fill="var(--lamp-green-off)">97</text>
            <text x="52" y="48" textAnchor="middle" fontSize="4.2" fontWeight="900" fill="var(--lamp-green-off)">98</text>
          </g>
        )}

        {type === 'control_transformer' && (
          <g transform="translate(10, 6)">
            <rect x="6" y="0" width="48" height="12" rx="2" fill="var(--mat-housing-dark)" />
            <rect x="6" y="56" width="48" height="12" rx="2" fill="var(--mat-housing-dark)" />
            <circle cx="16" cy="6" r="2.4" fill="var(--cond-red)" />
            <circle cx="44" cy="6" r="2.4" fill="var(--cond-red)" />
            <circle cx="16" cy="62" r="2.4" fill="var(--act-yellow)" />
            <circle cx="44" cy="62" r="2.4" fill="var(--cond-blue)" />
            <rect x="2" y="14" width="56" height="40" rx="2" fill="var(--silk-muted)" stroke="var(--mat-housing-dark)" strokeWidth="1" />
            <rect x="12" y="18" width="36" height="32" rx="4" fill="var(--mat-pvc-orange-dark)" stroke="var(--mat-pvc-orange-dark)" strokeWidth="0.8" />
            <rect x="15" y="27" width="30" height="14" rx="1.5" fill="var(--lamp-white-on)" />
            <text x="30" y="36.5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="var(--silk)">440/220</text>
          </g>
        )}

        {type === 'source_3phase_440v' && (
          <g transform="translate(8, 12)">
            <rect x="0" y="0" width="64" height="56" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="1" y="1" width="62" height="9" fill="var(--nameplate)" />
            <text x="32" y="7.5" textAnchor="middle" fontSize="5" fontWeight="900" fill="var(--act-yellow)">440V 3Φ</text>
            {[0, 1, 2, 3].map((i) => {
              const colX = 4 + i * 14.5;
              const isPe = i === 3;
              return (
                <g key={i}>
                  <rect x={colX} y="13" width="12.5" height="39" rx="1" fill={isPe ? 'var(--lamp-green-on)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth="0.9" />
                  <rect x={colX + 1.5} y="15" width="9.5" height="8" rx="0.8" fill="var(--mat-housing-dark)" />
                  <circle cx={colX + 6.25} cy="19" r="2.2" fill="var(--mat-housing-shade)" />
                  <text x={colX + 6.25} y="34" textAnchor="middle" fontSize="4.8" fontWeight="900" fill="var(--silk)">
                    {['L1', 'L2', 'L3', 'PE'][i]}
                  </text>
                  <rect x={colX + 1.5} y="41" width="9.5" height="8" rx="0.8" fill="var(--mat-housing-dark)" />
                  <circle cx={colX + 6.25} cy="45" r="2.2" fill={['var(--cond-red)', 'var(--act-yellow)', 'var(--cond-blue)', 'var(--cond-green)'][i]} />
                </g>
              );
            })}
          </g>
        )}

        {type === 'push_button_fwd_rev' && (
          <g transform="translate(6, 14)">
            <rect x="0" y="0" width="68" height="52" rx="6" fill="var(--mat-steel)" stroke="var(--silk-muted)" strokeWidth="1.2" />
            <rect x="3" y="8" width="62" height="36" rx="5" fill="var(--mat-housing-shade)" />
            {[
              { cx: 14, c: 'var(--act-red)' },
              { cx: 34, c: 'var(--lamp-green-on)' },
              { cx: 54, c: 'var(--lamp-amber-on)' },
            ].map((b) => (
              <React.Fragment key={b.cx}>
                <circle cx={b.cx} cy="28" r="8" fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth="0.6" />
                <circle cx={b.cx} cy="28" r="5.8" fill={b.c} />
              </React.Fragment>
            ))}
            <text x="14" y="16" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="var(--silk)">STOP</text>
            <text x="34" y="16" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="var(--silk)">FWD</text>
            <text x="54" y="16" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="var(--silk)">REV</text>
          </g>
        )}

        {type === 'push_button_station' && (
          <g transform="translate(20, 6)">
            <rect x="0" y="0" width="40" height="68" rx="5" fill="var(--mat-housing)" stroke="var(--mat-line-soft)" strokeWidth="1.2" />
            {/* Green Start */}
            <circle cx="20" cy="22" r="11" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="0.8" />
            <circle cx="20" cy="22" r="8" fill="var(--lamp-green-on)" stroke="var(--cond-green)" strokeWidth="0.8" />
            <text x="20" y="25" textAnchor="middle" fontSize="8" fontWeight="bold" fill="var(--silk-on-dark)">I</text>
            {/* Red Stop */}
            <circle cx="20" cy="48" r="11" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="0.8" />
            <circle cx="20" cy="48" r="8" fill="var(--act-red)" stroke="var(--lamp-red-off)" strokeWidth="0.8" />
            <circle cx="20" cy="48" r="3" fill="none" stroke="var(--mat-housing)" strokeWidth="1.5" />
          </g>
        )}

        {type === 'push_button_estop' && (
          <g transform="translate(18, 10)">
            <rect x="0" y="0" width="44" height="60" rx="5" fill="var(--act-yellow)" stroke="var(--mat-brass)" strokeWidth="1.2" />
            <circle cx="22" cy="24" r="18" fill="var(--lamp-white-on)" stroke="var(--mat-brass)" strokeWidth="0.8" />
            <circle cx="22" cy="24" r="14" fill="var(--act-red)" stroke="var(--lamp-red-off)" strokeWidth="1" />
            <text x="22" y="52" textAnchor="middle" fontSize="6" fontWeight="900" fill="var(--cond-brown)">E-STOP</text>
          </g>
        )}

        {type === 'pilot_light_indicator' && (
          <g transform="translate(22, 12)">
            <rect x="0" y="0" width="36" height="56" rx="4" fill="var(--mat-housing)" stroke="var(--mat-housing-shade)" strokeWidth="1.2" />
            <circle cx="18" cy="22" r="14" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="1" />
            <circle cx="18" cy="22" r="10" fill="var(--lamp-green-on)" stroke="var(--cond-green)" strokeWidth="1" />
            <circle cx="18" cy="22" r="6" fill="var(--lamp-green-on)" opacity="0.6" />
            <text x="18" y="48" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="var(--cond-green)">PILOT</text>
          </g>
        )}

        {type === 'plc_micro_controller' && (
          <g transform="translate(8, 10)">
            <rect x="0" y="0" width="64" height="60" rx="2" fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="3" y="2" width="58" height="8" rx="1" fill="var(--mat-housing-dark)" />
            <rect x="3" y="50" width="58" height="8" rx="1" fill="var(--mat-housing-dark)" />
            {[10, 20, 30, 40, 50].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="6" r="1.8" fill="var(--mat-housing-shade)" />
                <circle cx={cx} cy="54" r="1.8" fill="var(--mat-housing-shade)" />
              </React.Fragment>
            ))}
            <rect x="4" y="13" width="33" height="34" rx="1.5" fill="var(--nameplate)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <text x="14" y="18.2" textAnchor="middle" fontSize="3.6" fontWeight="900" fill="var(--nameplate-tag)">SIEMENS</text>
            <text x="30" y="18.2" textAnchor="middle" fontSize="3.6" fontWeight="900" fill="var(--silk-on-dark)">LOGO!</text>
            <rect x="6" y="20" width="29" height="24" rx="1" fill="var(--mat-housing)" />
            <rect x="7" y="21.5" width="27" height="5" fill="var(--nameplate)" />
            <text x="9" y="25.5" fontSize="3.8" fontWeight="800" fill="var(--silk-on-dark)">Start</text>
            <text x="9" y="32" fontSize="3.6" fontFamily="var(--font-mono)" fill="var(--silk)">Program</text>
            <text x="9" y="37.5" fontSize="3.6" fontFamily="var(--font-mono)" fill="var(--silk)">Setup</text>
            <polygon points="49,17 52,22 46,22" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <polygon points="49,33 52,28 46,28" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <polygon points="41,25 46,22 46,28" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <polygon points="57,25 52,22 52,28" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.5" />
            <rect x="41" y="38" width="8" height="6" rx="1" fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth="0.6" />
            <rect x="51" y="38" width="8" height="6" rx="1" fill="var(--lamp-green-on)" stroke="var(--mat-line)" strokeWidth="0.6" />
          </g>
        )}

        {(type === 'motor_ac_industrial' || type === 'motor_6lead_star_delta') && (
          <g transform="translate(10, 10)">
            <rect x="10" y="18" width="40" height="34" rx="6" fill="var(--mat-cast)" stroke="var(--mat-line)" strokeWidth="1.2" />
            {/* Fins */}
            <line x1="14" y1="24" x2="46" y2="24" stroke="var(--mat-cast-dark)" strokeWidth="1" opacity="0.5" />
            <line x1="14" y1="30" x2="46" y2="30" stroke="var(--mat-cast-dark)" strokeWidth="1" opacity="0.5" />
            <line x1="14" y1="36" x2="46" y2="36" stroke="var(--mat-cast-dark)" strokeWidth="1" opacity="0.5" />
            {/* Terminal Box */}
            <rect x="18" y={type === 'motor_6lead_star_delta' ? 3 : 8} width="24" height={type === 'motor_6lead_star_delta' ? 17 : 12} rx="2" fill="var(--mat-line)" />
            {type === 'motor_6lead_star_delta' && (
              <g fill="var(--lamp-amber-on)">
                <circle cx="23" cy="9" r="1.4" />
                <circle cx="30" cy="9" r="1.4" />
                <circle cx="37" cy="9" r="1.4" />
                <circle cx="23" cy="15" r="1.4" />
                <circle cx="30" cy="15" r="1.4" />
                <circle cx="37" cy="15" r="1.4" />
              </g>
            )}
            {/* Shaft */}
            <rect x="2" y="30" width="10" height="8" rx="1" fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth="0.6" />
            <text x="30" y="47" textAnchor="middle" fontSize="5" fontWeight="bold" fill="var(--silk-on-dark)">
              {type === 'motor_6lead_star_delta' ? 'Y-Δ 6-LEAD' : '3P MOTOR'}
            </text>
          </g>
        )}

        {type === 'royu_safety_breaker_2p' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="4" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="1.2" />
            <rect x="4" y="6" width="40" height="12" rx="2" fill="var(--cond-red)" />
            <text x="24" y="15" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="var(--silk-on-dark)">ROYU SAFETY</text>
            <rect x="8" y="24" width="32" height="28" rx="2" fill="var(--mat-line)" stroke="var(--silk-muted)" strokeWidth="0.8" />
            <rect x="14" y="30" width="20" height="12" rx="2" fill="var(--act-red)" stroke="var(--mat-housing)" strokeWidth="0.6" />
            <text x="24" y="39" textAnchor="middle" fontSize="6" fontWeight="bold" fill="var(--silk-on-dark)">ON</text>
            <text x="24" y="60" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="var(--silk-muted)">2P 30A</text>
          </g>
        )}

        {type === 'din_rail_track' && (
          <g transform="translate(6, 26)">
            <rect x="0" y="0" width="68" height="28" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth="1" />
            <line x1="0" y1="5" x2="68" y2="5" stroke="var(--mat-housing)" strokeWidth="1" />
            <line x1="0" y1="23" x2="68" y2="23" stroke="var(--silk-muted)" strokeWidth="1" />
            {[10, 24, 38, 52].map(sx => (
              <rect key={sx} x={sx} y="10" width="8" height="8" rx="2" fill="var(--mat-housing-dark-face)" opacity="0.6" />
            ))}
          </g>
        )}

        {type === 'utility_box_surface_pvc' && (
          <g transform="translate(18, 6)">
            <rect x="0" y="0" width="44" height="68" rx="4" fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth="1.2" />
            <rect x="4" y="5" width="36" height="58" rx="3" fill="var(--mat-pvc-orange-dark)" stroke="var(--mat-pvc-orange-dark)" strokeWidth="0.8" />
            <circle cx="22" cy="12" r="3" fill="var(--mat-brass)" />
            <circle cx="22" cy="56" r="3" fill="var(--mat-brass)" />
            <text x="22" y="34" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#fed7aa">ROYU</text>
            <text x="22" y="42" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#ffedd5">2"×4" BOX</text>
          </g>
        )}

        {type === 'royu_modular_combo_plate' && (
          <g transform="translate(16, 6)">
            <rect x="0" y="0" width="48" height="68" rx="5" fill="var(--mat-housing)" stroke="var(--mat-housing-shade)" strokeWidth="1.2" />
            {/* Rocker */}
            <rect x="6" y="8" width="36" height="15" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-steel)" strokeWidth="0.6" />
            <circle cx="24" cy="13" r="1.5" fill="var(--mat-pvc-orange)" />
            {/* Red Pilot */}
            <rect x="6" y="27" width="36" height="12" rx="2" fill="var(--mat-housing)" stroke="var(--mat-housing-shade)" strokeWidth="0.6" />
            <circle cx="24" cy="33" r="4" fill="var(--act-red)" stroke="var(--act-red)" strokeWidth="0.8" />
            {/* Outlet */}
            <rect x="6" y="43" width="36" height="19" rx="2" fill="var(--mat-housing)" stroke="var(--mat-housing-shade)" strokeWidth="0.6" />
            <line x1="16" y1="48" x2="16" y2="53" stroke="var(--mat-housing-dark)" strokeWidth="1" />
            <line x1="32" y1="48" x2="32" y2="53" stroke="var(--mat-housing-dark)" strokeWidth="1" />
            <circle cx="24" cy="56" r="1.5" fill="var(--mat-housing-dark)" />
          </g>
        )}

        {(type === 'switch_2gang' || type === 'switch_3gang') && (
          <g transform="translate(14, 10)">
            <rect x="0" y="0" width="52" height="60" rx="5" fill="var(--mat-housing)" stroke="var(--mat-steel)" strokeWidth="1.2" />
            {(type === 'switch_3gang' ? [0, 1, 2] : [0, 1]).map((i) => {
              const count = type === 'switch_3gang' ? 3 : 2;
              const w = 40 / count;
              return (
                <rect key={i} x={6 + i * w} y="12" width={w - 3} height="36" rx="2" fill="var(--mat-housing-shade)" stroke="var(--mat-line-soft)" strokeWidth="0.9" />
              );
            })}
          </g>
        )}

        {type === 'dimmer_switch' && (
          <g transform="translate(18, 10)">
            <rect x="0" y="0" width="44" height="60" rx="5" fill="var(--mat-housing)" stroke="var(--mat-steel)" strokeWidth="1.2" />
            <circle cx="22" cy="30" r="13" fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth="1.2" />
            <line x1="22" y1="30" x2="29" y2="21" stroke="var(--act-blue)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {type === 'ats_changeover' && (
          <g transform="translate(10, 12)">
            <rect x="0" y="0" width="60" height="56" rx="5" fill="var(--mat-housing)" stroke="var(--silk-muted)" strokeWidth="1.4" />
            <rect x="8" y="10" width="20" height="12" rx="2" fill="var(--lamp-green-on)" />
            <rect x="32" y="10" width="20" height="12" rx="2" fill="var(--lamp-amber-on)" />
            <rect x="12" y="32" width="36" height="14" rx="3" fill="var(--mat-line)" />
            <text x="30" y="42" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="var(--silk-on-dark)">ATS</text>
          </g>
        )}

        {type === 'panelboard_frame' && (
          <g transform="translate(8, 10)">
            <rect x="0" y="0" width="64" height="60" rx="4" fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth="1.5" />
            <rect x="8" y="22" width="48" height="12" fill="var(--mat-line-soft)" />
            <rect x="10" y="44" width="18" height="8" rx="1" fill="var(--act-blue)" />
            <rect x="36" y="44" width="18" height="8" rx="1" fill="var(--cond-green)" />
          </g>
        )}

        {type === 'panel_meter' && (
          <g transform="translate(14, 14)">
            <rect x="0" y="0" width="52" height="52" rx="5" fill="var(--mat-housing-dark)" stroke="var(--silk-muted)" strokeWidth="1.5" />
            <rect x="6" y="10" width="40" height="32" rx="3" fill="var(--lamp-green-off)" stroke="var(--mat-housing-dark-face)" />
            <text x="26" y="24" textAnchor="middle" fontSize="8" fontWeight="900" fill="var(--lamp-green-on)" fontFamily="var(--font-mono)">230V</text>
            <text x="26" y="36" textAnchor="middle" fontSize="7" fontWeight="800" fill="var(--nameplate-tag)" fontFamily="var(--font-mono)">12.4A</text>
          </g>
        )}

        {type === 'timer_relay' && (
          <g transform="translate(20, 6)">
            <rect x="0" y="0" width="40" height="68" rx="2" fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth="1.2" />
            <rect x="2" y="2" width="36" height="9" rx="1" fill="var(--nameplate)" />
            <rect x="2" y="57" width="36" height="9" rx="1" fill="var(--nameplate)" />
            {[10, 20, 30].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="6.5" r="2.2" fill="var(--mat-housing-shade)" />
                <circle cx={cx} cy="61.5" r="2.2" fill="var(--mat-housing-shade)" />
              </React.Fragment>
            ))}
            <rect x="6" y="14" width="28" height="8" rx="1" fill="var(--mat-housing)" />
            <text x="20" y="20" textAnchor="middle" fontSize="5" fontWeight="900" fill="var(--silk)">T: 5.0s</text>
            {[28, 38, 48].map((cy) => (
              <g key={cy}>
                <circle cx="20" cy={cy} r="4" fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth="0.6" />
                <line x1="20" y1={cy} x2="22.5" y2={cy - 2} stroke="var(--mat-line)" strokeWidth="1" />
              </g>
            ))}
          </g>
        )}

        {type === 'selector_hoa' && (
          <g transform="translate(16, 12)">
            <rect x="0" y="0" width="48" height="56" rx="5" fill="var(--mat-housing-shade)" stroke="var(--silk-muted)" strokeWidth="1.3" />
            <circle cx="24" cy="32" r="14" fill="var(--mat-housing-dark)" />
            <rect x="21" y="19" width="6" height="26" rx="2" fill="var(--mat-housing)" transform="rotate(-35 24 32)" />
          </g>
        )}

        {type === 'limit_switch' && (
          <g transform="translate(18, 10)">
            <rect x="6" y="24" width="32" height="36" rx="4" fill="var(--mat-cast-dark)" stroke="var(--mat-cast-dark)" strokeWidth="1.3" />
            <line x1="22" y1="24" x2="34" y2="8" stroke="var(--mat-steel)" strokeWidth="3" />
            <circle cx="34" cy="8" r="4.5" fill="var(--mat-housing)" stroke="var(--mat-housing-dark)" strokeWidth="1.2" />
          </g>
        )}

        {type === 'vfd_drive' && (
          <g transform="translate(14, 8)">
            <rect x="0" y="0" width="52" height="64" rx="5" fill="var(--mat-housing-dark)" stroke="var(--silk-muted)" strokeWidth="1.4" />
            <rect x="6" y="10" width="40" height="8" fill="var(--cond-green)" />
            <rect x="8" y="24" width="36" height="18" rx="2" fill="var(--mat-line)" />
            <text x="26" y="36" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="var(--act-red)" fontFamily="var(--font-mono)">60.0Hz</text>
            <circle cx="38" cy="50" r="5" fill="var(--cond-green)" />
          </g>
        )}
      </svg>
    </div>
  );
};
