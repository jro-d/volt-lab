import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface ApplianceDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const ApplianceDevice: React.FC<ApplianceDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isTv = device.type === 'appliance_tv';
  const isFan = device.type === 'appliance_fan';
  const isAc = device.type === 'appliance_ac';
  const isPowered = !!device.state.powered;
  const hasFault = !!device.state.hasEarthFault;
  const cx = width / 2;

  const toggleEarthFault = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.hasEarthFault = !device.state.hasEarthFault;
    onToggleState?.(device);
  };

  const renderTerminals = () =>
    terminals.map((t) => {
      const tx = width * t.relX;
      const ty = height * t.relY;
      const termId = `${device.id}:${t.id}`;
      return (
        <TerminalPoint
          key={t.id}
          terminal={t}
          x={tx}
          y={ty}
          isSelected={selectedTerminalId === termId}
          isHovered={hoveredTerminalId === termId}
          onMouseDown={(e) => {
            e.stopPropagation();
            onTerminalMouseDown?.(device, t, e);
          }}
          onMouseEnter={() => setHoveredTerminalId?.(termId)}
          onMouseLeave={() => setHoveredTerminalId?.(null)}
        />
      );
    });

  // 1. SMART 4K OLED/LED TV
  if (isTv) {
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <defs>
          <linearGradient id={`tvBezel-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id={`tvScreen-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isPowered ? '#0ea5e9' : '#1e293b'} />
            <stop offset="55%" stopColor={isPowered ? '#1e3a8a' : '#0f172a'} />
            <stop offset="100%" stopColor={isPowered ? '#312e81' : '#020617'} />
          </linearGradient>
        </defs>

        {/* Stand Base & Neck */}
        <path d={`M ${cx - 8} ${height - 26} L ${cx - 24} ${height - 10} L ${cx + 24} ${height - 10} L ${cx + 8} ${height - 26} Z`} fill="#475569" stroke="#1e293b" strokeWidth={1} />
        <rect x={cx - 32} y={height - 13} width={64} height={5} rx={2.5} fill="#64748b" stroke="#0f172a" strokeWidth={0.9} />

        {/* Anodized Aluminum Ultra-Slim Frame */}
        <rect x={2} y={3} width={width} height={height - 26} rx={5} fill="rgba(15, 23, 42, 0.25)" />
        <rect x={0} y={0} width={width} height={height - 26} rx={5} fill={`url(#tvBezel-${uid})`} stroke="#475569" strokeWidth={1.4} />

        {/* Screen Panel */}
        <rect x={4} y={4} width={width - 8} height={height - 34} rx={2.5} fill={`url(#tvScreen-${uid})`} />

        {isPowered ? (
          <g>
            {/* Dynamic Color Glow & Dashboard Bars */}
            <circle cx={cx - 18} cy={(height - 34) / 2} r={18} fill="rgba(56, 189, 248, 0.25)" />
            <text x={cx} y={(height - 34) / 2 + 2} textAnchor="middle" fontSize={10} fontWeight="900" fontFamily="monospace" fill="#f8fafc" letterSpacing="1">
              4K UHD LIVE
            </text>
            <text x={cx} y={(height - 34) / 2 + 13} textAnchor="middle" fontSize={5.8} fontFamily="monospace" fill="#7dd3fc">
              HDMI 1 · 150W AC
            </text>
          </g>
        ) : (
          <text x={cx} y={(height - 34) / 2 + 4} textAnchor="middle" fontSize={7.5} fontWeight="bold" fontFamily="monospace" fill="#64748b">
            STANDBY
          </text>
        )}

        {/* Anti-glare Glass Diagonal Sheen */}
        <polygon points={`4,4 ${width * 0.6},4 4,${height - 38}`} fill="rgba(255,255,255,0.08)" className="pointer-events-none" />

        {/* Standby / Active IR Receiver LED */}
        <circle cx={cx} cy={height - 28} r={2} fill={isPowered ? '#22c55e' : '#ef4444'} />

        {renderTerminals()}
      </g>
    );
  }

  // 2. ELECTRIC PEDESTAL STAND FAN
  if (isFan) {
    const fanSpeed = device.state.speed || 2;
    const fanCy = 46;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <defs>
          <radialGradient id={`fanHub-${uid}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
        </defs>

        {/* Pedestal Column & Weighted Base */}
        <rect x={cx - 5} y={fanCy + 28} width={10} height={height - fanCy - 44} rx={2} fill="#94a3b8" stroke="#475569" strokeWidth={1} />
        <rect x={cx - 28} y={height - 20} width={56} height={11} rx={5} fill="#334155" stroke="#0f172a" strokeWidth={1.2} />
        {/* 3 Speed Piano Keys */}
        {[1, 2, 3].map((sp) => (
          <rect
            key={`sp-${sp}`}
            x={cx - 15 + (sp - 1) * 11}
            y={height - 17}
            width={8}
            height={5}
            rx={1}
            fill={fanSpeed === sp && isPowered ? '#38bdf8' : '#e2e8f0'}
            stroke="#0f172a"
            strokeWidth={0.6}
          />
        ))}

        {/* Chrome Radial Cage Guard */}
        <circle cx={cx} cy={fanCy} r={39} fill="rgba(226, 232, 240, 0.35)" stroke="#64748b" strokeWidth={2} />
        <circle cx={cx} cy={fanCy} r={34} fill="none" stroke="#94a3b8" strokeWidth={0.8} />
        <circle cx={cx} cy={fanCy} r={22} fill="none" stroke="#94a3b8" strokeWidth={0.7} />

        {/* Spinning / Stationary Translucent Pitched Airfoil Blades */}
        <g
          transform={`translate(${cx}, ${fanCy})`}
          className={isPowered ? 'animate-spin' : ''}
          style={{
            transformOrigin: '0px 0px',
            animationDuration: fanSpeed === 3 ? '0.28s' : fanSpeed === 2 ? '0.45s' : '0.7s',
          }}
        >
          {[0, 120, 240].map((deg) => (
            <path
              key={deg}
              transform={`rotate(${deg})`}
              d="M 0 0 C 10 -12, 28 -14, 30 -3 C 31 8, 12 12, 0 0 Z"
              fill={isPowered ? 'rgba(56, 189, 248, 0.72)' : 'rgba(100, 116, 139, 0.78)'}
              stroke="#0284c7"
              strokeWidth={0.9}
            />
          ))}
        </g>

        {/* Radial Guard Wires */}
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={`wire-${deg}`}
            x1={cx - 38 * Math.cos((deg * Math.PI) / 180)}
            y1={fanCy - 38 * Math.sin((deg * Math.PI) / 180)}
            x2={cx + 38 * Math.cos((deg * Math.PI) / 180)}
            y2={fanCy + 38 * Math.sin((deg * Math.PI) / 180)}
            stroke="#94a3b8"
            strokeWidth={0.7}
            opacity={0.7}
          />
        ))}

        {/* Chrome Center Spinner Hub */}
        <circle cx={cx} cy={fanCy} r={9.5} fill={`url(#fanHub-${uid})`} stroke="#334155" strokeWidth={1.1} />
        <text x={cx} y={fanCy + 2} textAnchor="middle" fontSize={5.5} fontWeight="bold" fill="#0f172a">
          {isPowered ? `SPD${fanSpeed}` : 'FAN'}
        </text>

        {renderTerminals()}
      </g>
    );
  }

  // 3. 1.5 HP SPLIT-TYPE INVERTER AC INDOOR UNIT
  if (isAc) {
    const temp = device.state.setTemp || 16;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <defs>
          <linearGradient id={`acShell-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id={`acAir-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
          </linearGradient>
        </defs>

        <rect x={2} y={4} width={width} height={height - 18} rx={7} fill="rgba(15, 23, 42, 0.18)" />
        <rect x={0} y={0} width={width} height={height - 18} rx={7} fill={`url(#acShell-${uid})`} stroke="#94a3b8" strokeWidth={1.6} />

        {/* Top Evaporator Intake Louvers */}
        {[7, 11, 15].map((ly) => (
          <line key={ly} x1={12} y1={ly} x2={width - 12} y2={ly} stroke="#cbd5e1" strokeWidth={1} />
        ))}

        {/* Chrome Trim Strip */}
        <rect x={2} y={37} width={width - 4} height={2.5} fill="#94a3b8" />

        {/* Inverter Nameplate */}
        <rect x={12} y={22} width={52} height={11} rx={2.5} fill="#0f172a" />
        <text x={38} y={29.5} textAnchor="middle" fontSize={5.8} fontWeight="bold" fill="#38bdf8">
          INVERTER 1.5HP
        </text>

        {/* Smoked Acrylic Hidden Temperature LED Display */}
        <rect x={width - 52} y={20} width={42} height={14} rx={3} fill="#020617" stroke="#475569" strokeWidth={0.9} />
        {isPowered ? (
          <text x={width - 31} y={30.5} textAnchor="middle" fontSize={8.5} fontWeight="900" fontFamily="monospace" fill="#38bdf8">
            {temp}°C
          </text>
        ) : (
          <text x={width - 31} y={29.5} textAnchor="middle" fontSize={6} fontWeight="bold" fontFamily="monospace" fill="#64748b">
            OFF
          </text>
        )}

        {/* Discharge Deflector Flap & Cool Mist Streaks */}
        <rect x={12} y={height - 25} width={width - 24} height={6} rx={2} fill={isPowered ? '#e0f2fe' : '#cbd5e1'} stroke="#64748b" strokeWidth={0.8} />
        {isPowered && (
          <path
            d={`M 16 ${height - 19} L ${width - 16} ${height - 19} L ${width - 6} ${height - 2} L 6 ${height - 2} Z`}
            fill={`url(#acAir-${uid})`}
            className="pointer-events-none"
          />
        )}

        {renderTerminals()}
      </g>
    );
  }

  // 4. INSTANT SHOWER WATER HEATER (3.5kW / 4.5kW)
  const wattageKw = ((device.state.wattage || 3500) / 1000).toFixed(1);
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`whBody-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <radialGradient id={`whKnob-${uid}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="60%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
      </defs>

      <rect x={2} y={4} width={width} height={height - 14} rx={10} fill="rgba(15, 23, 42, 0.2)" />
      {/* Stainless Cold Water Inlet & Hot Shower Outlet Fittings */}
      <rect x={22} y={height - 16} width={9} height={11} rx={1.5} fill="#94a3b8" stroke="#475569" strokeWidth={0.9} />
      <rect x={width - 31} y={height - 16} width={9} height={11} rx={1.5} fill="#d97706" stroke="#78350f" strokeWidth={0.9} />

      {/* Glossy ABS Heater Shell */}
      <rect x={0} y={0} width={width} height={height - 14} rx={10} fill={`url(#whBody-${uid})`} stroke="#94a3b8" strokeWidth={1.6} />

      {/* Header Plate */}
      <rect x={9} y={8} width={width - 18} height={16} rx={4} fill="#0369a1" />
      <text x={cx} y={18.5} textAnchor="middle" fontSize={7.5} fontWeight="900" fill="#ffffff">
        SHOWER {wattageKw}kW
      </text>

      {/* Chrome Temperature Knob with Numbered Scale */}
      <circle cx={cx} cy={47} r={17} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
      <circle cx={cx} cy={47} r={12.5} fill={`url(#whKnob-${uid})`} stroke="#0f172a" strokeWidth={1.1} />
      <line x1={cx} y1={37} x2={cx} y2={42} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />

      {/* Heating LED & Earth-Fault Simulator Button */}
      <circle cx={18} cy={74} r={3.5} fill={isPowered ? '#ef4444' : '#64748b'} />
      <text x={25} y={76.5} fontSize={6.5} fontWeight="bold" fill="#334155">
        ELCB
      </text>

      <g onClick={toggleEarthFault} className="cursor-pointer" transform={`translate(${width - 48}, 66)`}>
        <rect
          x={0}
          y={0}
          width={42}
          height={15}
          rx={3.5}
          fill={hasFault ? '#dc2626' : '#f1f5f9'}
          stroke={hasFault ? '#7f1d1d' : '#94a3b8'}
          strokeWidth={1}
        />
        <text x={21} y={10} textAnchor="middle" fontSize={5.8} fontWeight="bold" fill={hasFault ? '#ffffff' : '#334155'}>
          {hasFault ? 'FAULT!' : 'TEST ELCB'}
        </text>
      </g>

      {renderTerminals()}
    </g>
  );
};
