import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface McbDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const McbDevice: React.FC<McbDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const { width, height, terminals } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 16;
  const curve = device.state.tripCurve || 'C';
  const is2P = device.type === 'mcb_2p' || device.type === 'service_disconnect_2p';
  const is3P = device.type === 'mcb_3p';
  const isServiceDisc = device.type === 'service_disconnect_2p';

  const profile: 'royu_bolt_on' | 'royu_din_rail' | 'generic_iec' =
    device.state.breakerProfile ||
    (device.state.mccbStyle === 'industrial_black'
      ? 'royu_bolt_on'
      : is2P && !isServiceDisc
        ? 'royu_bolt_on'
        : 'royu_din_rail');

  const isBoltOn = profile === 'royu_bolt_on';
  const isRoyuDin = profile === 'royu_din_rail';
  const poles = is3P ? 3 : is2P ? 2 : 1;

  const ampColors: Record<number, string> = {
    15: '#2563eb',
    20: '#dc2626',
    30: '#16a34a',
    40: '#ea580c',
    60: '#475569',
    63: '#475569',
  };
  const handleAccent = isBoltOn ? ampColors[ratedAmps] || '#1e293b' : '#111827';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    onToggleState?.(device);
  };

  const handleCycleStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: ('royu_bolt_on' | 'royu_din_rail' | 'generic_iec')[] = [
      'royu_bolt_on',
      'royu_din_rail',
      'generic_iec',
    ];
    const next = order[(order.indexOf(profile) + 1) % order.length];
    device.state.breakerProfile = next;
    device.state.mccbStyle = next === 'royu_bolt_on' ? 'industrial_black' : 'din_rail';
    onToggleState?.(device);
  };

  const handleManualTripTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.tripped = !device.state.tripped;
    if (device.state.tripped) {
      device.state.closed = false;
    }
    onToggleState?.(device);
  };

  const cx = width / 2;
  const cy = height / 2;
  const padX = 3;
  const innerW = width - padX * 2;
  const poleW = innerW / poles;

  // Vertical bands scaled strictly from height so zero text can collide
  const topBayH = Math.round(height * 0.22); // ~24px
  const botBayY = Math.round(height * 0.78); // ~86px
  const botBayH = height - botBayY;
  const faceY = topBayH + 1;
  const faceH = botBayY - faceY - 1;
  const brandBarH = 11;
  const flagY = faceY + brandBarH + 3;
  const handleY = flagY + 12;
  const specY = faceY + faceH - 3.5;

  const topPairs = ['1/2', '3/4', '5/6'];
  const botPairs = ['2/1', '4/3', '6/5'];

  // Crisp DIN rail silhouette behind DIN breakers OR copper stabs for Bolt-On
  const bodyBg = isBoltOn ? '#1e293b' : '#f1f5f9';
  const shroudBg = isBoltOn ? '#0f172a' : '#e2e8f0';
  const strokeCol = isBoltOn ? '#090d16' : '#1e293b';
  const faceBg = isBoltOn ? '#273244' : '#ffffff';
  const textCol = isBoltOn ? '#f8fafc' : '#0f172a';
  const subTextCol = isBoltOn ? '#cbd5e1' : '#475569';

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Mounting Stabs (Bolt-On) or DIN Rail Clips */}
      {isBoltOn ? (
        Array.from({ length: poles }).map((_, idx) => {
          const sx = padX + poleW * idx + poleW / 2;
          return (
            <rect
              key={`stab-${idx}`}
              x={sx - 6}
              y={-4}
              width={12}
              height={5}
              rx={1}
              fill="#d97706"
              stroke="#78350f"
              strokeWidth={0.9}
            />
          );
        })
      ) : (
        <g>
          <rect x={-3} y={cy - 11} width={4} height={22} rx={1} fill="#94a3b8" stroke="#334155" strokeWidth={0.9} />
          <rect x={width - 1} y={cy - 11} width={4} height={22} rx={1} fill="#94a3b8" stroke="#334155" strokeWidth={0.9} />
        </g>
      )}

      {/* Main EduVolt Flat CAD Housing */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={4}
        fill={bodyBg}
        stroke={strokeCol}
        strokeWidth={1.4}
      />

      {/* Top & Bottom Modular Terminal Pocket Bays */}
      <rect x={padX} y={2} width={innerW} height={topBayH - 2} rx={2} fill={shroudBg} stroke={strokeCol} strokeWidth={0.9} />
      <rect x={padX} y={botBayY} width={innerW} height={botBayH - 2} rx={2} fill={shroudBg} stroke={strokeCol} strokeWidth={0.9} />

      {/* Per-pole Divider Lines + Top/Bottom Silkscreen Numbers (1/2, 3/4, 5/6) */}
      {Array.from({ length: poles }).map((_, idx) => {
        const px = padX + poleW * idx;
        const pcx = px + poleW / 2;
        return (
          <g key={`pole-${idx}`}>
            {idx > 0 && (
              <>
                <line x1={px} y1={2} x2={px} y2={topBayH} stroke={strokeCol} strokeWidth={0.9} />
                <line x1={px} y1={botBayY} x2={px} y2={height - 2} stroke={strokeCol} strokeWidth={0.9} />
                <line x1={px} y1={faceY} x2={px} y2={botBayY - 1} stroke={isBoltOn ? '#334155' : '#cbd5e1'} strokeWidth={0.8} />
              </>
            )}
            <text
              x={pcx}
              y={topBayH - 1.5}
              textAnchor="middle"
              fontSize={poles === 1 ? 5.2 : 5.5}
              fontWeight="800"
              fontFamily="ui-monospace, monospace"
              fill={subTextCol}
            >
              {topPairs[idx]}
            </text>
            <text
              x={pcx}
              y={botBayY + 6.5}
              textAnchor="middle"
              fontSize={poles === 1 ? 5.2 : 5.5}
              fontWeight="800"
              fontFamily="ui-monospace, monospace"
              fill={subTextCol}
            >
              {botPairs[idx]}
            </text>
          </g>
        );
      })}

      {/* Center Raised Faceplate Escutcheon */}
      <rect
        x={padX}
        y={faceY}
        width={innerW}
        height={faceH}
        rx={2}
        fill={faceBg}
        stroke={strokeCol}
        strokeWidth={1}
      />

      {/* Embedded Header Band (click to cycle Bolt-On / ROYU DIN / IEC DIN) */}
      <g onClick={handleCycleStyle} className="cursor-pointer">
        <title>Click header band to cycle breaker profile (Bolt-On / ROYU DIN / IEC DIN)</title>
        <rect
          x={padX}
          y={faceY}
          width={innerW}
          height={brandBarH}
          rx={1.5}
          fill={isServiceDisc ? '#991b1b' : isRoyuDin ? '#0f4c81' : '#111827'}
        />
        <text
          x={cx}
          y={faceY + 7.8}
          textAnchor="middle"
          fontSize={poles === 1 ? 5.4 : 6.2}
          fontWeight="900"
          fontFamily="ui-sans-serif, system-ui"
          fill="#ffffff"
          letterSpacing="0.4"
        >
          {isServiceDisc ? 'MAIN' : isBoltOn ? 'ROYU' : isRoyuDin ? 'VoltLab' : 'IEC DIN'}
        </text>
      </g>

      {/* Rating & Multi-Pole Flag Windows Band (never touches handle!) */}
      <text
        x={poles === 1 ? padX + 4 : padX + 5}
        y={flagY + 6.5}
        fontSize={poles === 1 ? 6 : 6.8}
        fontWeight="900"
        fontFamily="ui-monospace, monospace"
        fill={textCol}
      >
        {curve}{ratedAmps}
      </text>

      {/* Per-pole Status Window (Green O / Red I / Amber TRIP) */}
      {Array.from({ length: poles }).map((_, idx) => {
        const winW = poles === 1 ? 10 : 11;
        const wx = poles === 1 ? width - padX - winW - 3 : padX + poleW * idx + poleW / 2 - winW / 2;
        const wy = poles === 1 ? flagY + 0.5 : flagY;
        const winFill = isTripped ? '#f59e0b' : isClosed ? '#dc2626' : '#22c55e';
        return (
          <g key={`win-${idx}`}>
            {poles > 1 && idx === 0 && null}
            <rect
              x={poles === 1 ? wx : Math.max(padX + (idx === 0 ? 22 : 0), wx)}
              y={wy}
              width={winW}
              height={6}
              rx={1}
              fill={winFill}
              stroke="#0f172a"
              strokeWidth={0.7}
            />
          </g>
        );
      })}

      {/* EduVolt Crisp Bridged Toggle Lever Slot & Interactive Handle */}
      <g onClick={handleToggle} className="cursor-pointer">
        <title>Click handle to toggle breaker {isClosed ? 'OFF' : 'ON'}</title>
        <rect
          x={padX + 4}
          y={handleY}
          width={innerW - 8}
          height={18}
          rx={2}
          fill={isBoltOn ? '#0b1120' : '#cbd5e1'}
          stroke="#0f172a"
          strokeWidth={0.8}
        />
        {/* Sliding Bridged Handle */}
        <rect
          x={padX + 6}
          y={isTripped ? handleY + 4.5 : isClosed ? handleY + 1.5 : handleY + 8.5}
          width={innerW - 12}
          height={8}
          rx={1.5}
          fill={handleAccent}
          stroke="#020617"
          strokeWidth={0.9}
        />
        <line
          x1={padX + 8}
          y1={(isTripped ? handleY + 4.5 : isClosed ? handleY + 1.5 : handleY + 8.5) + 2.5}
          x2={width - padX - 8}
          y2={(isTripped ? handleY + 4.5 : isClosed ? handleY + 1.5 : handleY + 8.5) + 2.5}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={0.9}
        />
        <text
          x={cx}
          y={(isTripped ? handleY + 4.5 : isClosed ? handleY + 1.5 : handleY + 8.5) + 6.4}
          textAnchor="middle"
          fontSize={4.8}
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill="#ffffff"
        >
          {isTripped ? 'TRIP' : isClosed ? 'ON' : 'OFF'}
        </text>
      </g>

      {/* Bottom Embedded Rating & Mount Spec Line */}
      <text
        x={poles > 1 ? padX + 5 : cx}
        y={specY}
        textAnchor={poles > 1 ? 'start' : 'middle'}
        fontSize={poles === 1 ? 4.4 : 4.8}
        fontWeight="800"
        fontFamily="ui-monospace, monospace"
        fill={subTextCol}
      >
        {poles === 1 ? `${isBoltOn ? 'BOLT' : 'DIN'} 10kA` : `${poles}P ${isBoltOn ? 'BOLT-ON' : 'DIN'} ${is3P ? '400V' : '240V'}`}
      </text>

      {/* Compact Flush Trip-Test Button inside faceplate (no overlapping!) */}
      {(is2P || is3P) && (
        <g onClick={handleManualTripTest} className="cursor-pointer">
          <title>Simulate manual trip test</title>
          <circle cx={width - padX - 7} cy={specY - 2} r={3.5} fill="#0f172a" stroke="#64748b" strokeWidth={0.7} />
          <text x={width - padX - 7} y={specY - 0.5} textAnchor="middle" fontSize={4.2} fontWeight="900" fill="#fbbf24">
            T
          </text>
        </g>
      )}

      {/* Terminals */}
      {terminals.map((t) => {
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
      })}
    </g>
  );
};
