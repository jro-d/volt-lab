import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';
import { sound } from '../../utils/soundFx';

interface RoyuSafetyBreakerProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  hoveredTerminalId?: string | null;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RoyuSafetyBreakerDevice: React.FC<RoyuSafetyBreakerProps> = ({
  device,
  selectedTerminalId,
  onTerminalMouseDown,
  hoveredTerminalId,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 30;
  const isCoverOpen = !!device.state.enclosureCoverOpen;

  const handleToggleBreaker = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playBreakerSnap();
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    if (onToggleState) onToggleState(device);
  };

  const handleToggleCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    device.state.enclosureCoverOpen = !device.state.enclosureCoverOpen;
    if (onToggleState) onToggleState(device);
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        {/* NEMA 1 Industrial Gray Thermoplastic Enclosure */}
        <linearGradient id={`sbBox_${device.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Internal Chamber Shadow */}
        <linearGradient id={`sbInner_${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>

        {/* Safety Red Accent */}
        <linearGradient id={`sbRedGrad_${device.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      {/* 1. Outer Enclosure Drop Shadow */}
      <rect
        x={2}
        y={4}
        width={width}
        height={height}
        rx={6}
        fill="#000000"
        opacity={0.18}
      />

      {/* 2. Main Thermoplastic Enclosure Base */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={6}
        fill={`url(#sbBox_${device.id})`}
        stroke="#94a3b8"
        strokeWidth={1.5}
      />

      {/* Wall Mounting Flange Ears */}
      <rect x={width / 2 - 10} y={-4} width={20} height={5} rx={1.5} fill="#94a3b8" />
      <circle cx={width / 2} cy={-1.5} r={1.5} fill="#475569" />
      <rect x={width / 2 - 10} y={height - 1} width={20} height={5} rx={1.5} fill="#94a3b8" />
      <circle cx={width / 2} cy={height + 1.5} r={1.5} fill="#475569" />

      {/* Top & Bottom Conduit Knockout Rings (3/4" EMT / PVC) */}
      <circle cx={width / 2} cy={6} r={12} fill="none" stroke="#94a3b8" strokeDasharray="3 2" strokeWidth={1} />
      <circle cx={width / 2} cy={height - 6} r={12} fill="none" stroke="#94a3b8" strokeDasharray="3 2" strokeWidth={1} />

      {/* 3. Internal Chamber or Sealed Front Panel */}
      {isCoverOpen ? (
        /* OPEN COVER: Internal Bolt-On Breaker & Wire Gutter */
        <g>
          {/* Recessed Gutter */}
          <rect
            x={6}
            y={14}
            width={width - 12}
            height={height - 28}
            rx={4}
            fill={`url(#sbInner_${device.id})`}
            stroke="#09090b"
            strokeWidth={1}
          />

          {/* Internal ROYU 2P Bolt-On Breaker Body */}
          <rect
            x={width * 0.18}
            y={height * 0.22}
            width={width * 0.64}
            height={height * 0.54}
            rx={3}
            fill="#18181b"
            stroke="#3f3f46"
            strokeWidth={1}
          />

          {/* Breaker Label Inscription */}
          <text
            x={width / 2}
            y={height * 0.32}
            textAnchor="middle"
            fontSize={7}
            fontWeight="900"
            fontFamily="monospace"
            fill="#f59e0b"
          >
            ROYU 2P {ratedAmps}A
          </text>
          <text
            x={width / 2}
            y={height * 0.38}
            textAnchor="middle"
            fontSize={5.5}
            fontWeight="bold"
            fill="#a1a1aa"
          >
            10kA 240V~ 60Hz
          </text>

          {/* Copper Busbar Lugs */}
          <rect x={width * 0.24} y={height * 0.16} width={8} height={10} fill="#b45309" stroke="#78350f" strokeWidth={0.5} />
          <rect x={width * 0.64} y={height * 0.16} width={8} height={10} fill="#b45309" stroke="#78350f" strokeWidth={0.5} />
          <rect x={width * 0.24} y={height * 0.72} width={8} height={10} fill="#b45309" stroke="#78350f" strokeWidth={0.5} />
          <rect x={width * 0.64} y={height * 0.72} width={8} height={10} fill="#b45309" stroke="#78350f" strokeWidth={0.5} />

          {/* Ground Lug on Side Gutter */}
          <rect x={width * 0.44} y={height * 0.78} width={10} height={8} rx={1.5} fill="#15803d" stroke="#166534" strokeWidth={0.5} />
          <text x={width / 2} y={height * 0.84} textAnchor="middle" fontSize={5} fontWeight="bold" fill="#ffffff">PE</text>

          {/* Interactive Internal Toggle Lever */}
          <g onClick={handleToggleBreaker} className="cursor-pointer group">
            <rect
              x={width / 2 - 12}
              y={isClosed ? height * 0.44 : height * 0.54}
              width={24}
              height={14}
              rx={2}
              fill={isTripped ? '#dc2626' : '#22c55e'}
              stroke="#ffffff"
              strokeWidth={1}
              className="transition-all duration-100 group-hover:brightness-110"
            />
            <text
              x={width / 2}
              y={(isClosed ? height * 0.44 : height * 0.54) + 9.5}
              textAnchor="middle"
              fontSize={7}
              fontWeight="900"
              fill="#ffffff"
            >
              {isTripped ? 'TRIP' : isClosed ? 'ON' : 'OFF'}
            </text>
          </g>
        </g>
      ) : (
        /* CLOSED COVER: Sealed Faceplate with Padlockable Latch */
        <g>
          {/* Molded Front Cover Door */}
          <rect
            x={5}
            y={12}
            width={width - 10}
            height={height - 24}
            rx={4}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth={1.2}
          />

          {/* Top Brand Header Badge */}
          <rect
            x={10}
            y={16}
            width={width - 20}
            height={16}
            rx={2}
            fill={`url(#sbRedGrad_${device.id})`}
          />
          <text
            x={width / 2}
            y={24}
            textAnchor="middle"
            fontSize={7}
            fontWeight="900"
            fontFamily="sans-serif"
            fill="#ffffff"
            letterSpacing="0.8px"
          >
            ROYU
          </text>
          <text
            x={width / 2}
            y={30}
            textAnchor="middle"
            fontSize={4.5}
            fontWeight="bold"
            fill="#fee2e2"
            letterSpacing="0.5px"
          >
            SAFETY BREAKER / ACU
          </text>

          {/* Viewing Window */}
          <rect
            x={width * 0.20}
            y={height * 0.30}
            width={width * 0.60}
            height={height * 0.36}
            rx={3}
            fill="#09090b"
            stroke="#475569"
            strokeWidth={1}
          />

          {/* Breaker Rating Badge */}
          <text
            x={width / 2}
            y={height * 0.38}
            textAnchor="middle"
            fontSize={8}
            fontWeight="900"
            fontFamily="monospace"
            fill="#ffffff"
          >
            2P {ratedAmps}A
          </text>
          <text
            x={width / 2}
            y={height * 0.43}
            textAnchor="middle"
            fontSize={5.5}
            fontWeight="bold"
            fill="#94a3b8"
          >
            240V~ 10kAIC
          </text>

          {/* Interactive External Lever / Window Handle */}
          <g onClick={handleToggleBreaker} className="cursor-pointer group">
            <rect
              x={width / 2 - 14}
              y={isClosed ? height * 0.46 : height * 0.54}
              width={28}
              height={14}
              rx={2}
              fill={isTripped ? '#dc2626' : isClosed ? '#ef4444' : '#22c55e'}
              stroke="#ffffff"
              strokeWidth={1}
              className="transition-all duration-100 group-hover:brightness-110"
            />
            <text
              x={width / 2}
              y={(isClosed ? height * 0.46 : height * 0.54) + 10}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight="900"
              fill="#ffffff"
            >
              {isTripped ? 'TRIP' : isClosed ? 'ON' : 'OFF'}
            </text>
          </g>

          {/* Safety Warning Inscription */}
          <text
            x={width / 2}
            y={height * 0.74}
            textAnchor="middle"
            fontSize={5}
            fontWeight="bold"
            fill="#b91c1c"
          >
            PEC 4.40 DISCONNECT
          </text>
          <text
            x={width / 2}
            y={height * 0.79}
            textAnchor="middle"
            fontSize={4.5}
            fontWeight="normal"
            fill="#64748b"
          >
            KEEP CLOSED IN SERVICE
          </text>

          {/* Padlock Latch Loop */}
          <rect x={width / 2 - 6} y={height * 0.82} width={12} height={6} rx={2} fill="#94a3b8" stroke="#475569" strokeWidth={0.8} />
          <circle cx={width / 2} cy={height * 0.85} r={1.5} fill="#334155" />
        </g>
      )}

      {/* Cover Open/Close Badge Toggle */}
      <g
        transform={`translate(${width - 4}, -4)`}
        className="cursor-pointer group"
        onClick={handleToggleCover}
      >
        <rect
          x={-44}
          y={-10}
          width={48}
          height={14}
          rx={7}
          fill={isCoverOpen ? '#f59e0b' : '#3b82f6'}
          stroke="#ffffff"
          strokeWidth={1}
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
          className="transition-all hover:scale-105"
        />
        <text
          x={-20}
          y={0}
          textAnchor="middle"
          fontSize={6}
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#ffffff"
        >
          {isCoverOpen ? '🔒 Close' : '🔓 Open'}
        </text>
      </g>

      {/* Terminals (Screw Lugs) */}
      {device.terminals.map((t) => {
        const tx = width * t.relX;
        const ty = height * t.relY;
        const isHovered = hoveredTerminalId === `${device.id}:${t.id}`;
        const isSelected = selectedTerminalId === `${device.id}:${t.id}`;

        return (
          <TerminalPoint
            key={t.id}
            terminal={t}
            x={tx}
            y={ty}
            isHovered={isHovered}
            isSelected={isSelected}
            onMouseDown={(e) => onTerminalMouseDown(device, t, e)}
            onMouseEnter={() => setHoveredTerminalId(`${device.id}:${t.id}`)}
            onMouseLeave={() => setHoveredTerminalId(null)}
          />
        );
      })}
    </g>
  );
};
