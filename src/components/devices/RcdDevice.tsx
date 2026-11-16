import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface RcdDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const RcdDevice: React.FC<RcdDeviceProps> = ({
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
  const ratedAmps = device.state.ratedAmps || 40;
  const sensitivityMa = device.state.sensitivityMa || 30;

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

  const handleTestTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.tripped = true;
    device.state.closed = false;
    device.state.tripReason = `Test Button: ${sensitivityMa}mA Simulated Earth Leakage Trip`;
    onToggleState?.(device);
  };

  const cx = width / 2;
  const cy = height / 2;
  const padX = 3;
  const innerW = width - padX * 2;
  const topBayH = Math.round(height * 0.22);
  const botBayY = Math.round(height * 0.78);
  const botBayH = height - botBayY;
  const faceY = topBayH + 1;
  const faceH = botBayY - faceY - 1;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* DIN Clips */}
      <rect x={-3} y={cy - 11} width={4} height={22} rx={1} fill="var(--mat-steel)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.9} />
      <rect x={width - 1} y={cy - 11} width={4} height={22} rx={1} fill="var(--mat-steel)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.9} />

      {/* Outer Flat CAD Body */}
      <rect x={0} y={0} width={width} height={height} rx={4} fill="var(--mat-housing)" stroke="var(--mat-housing-dark)" strokeWidth={1.4} />

      {/* Dark Charcoal Terminal Shroud Bays (Signature EduVolt Style) */}
      <rect x={padX} y={2} width={innerW} height={topBayH - 2} rx={2} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.9} />
      <rect x={padX} y={botBayY} width={innerW} height={botBayH - 2} rx={2} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.9} />
      <line x1={cx} y1={2} x2={cx} y2={topBayH} stroke="var(--silk-muted)" strokeWidth={0.9} />
      <line x1={cx} y1={botBayY} x2={cx} y2={height - 2} stroke="var(--silk-muted)" strokeWidth={0.9} />

      {/* Crisp Terminal Pocket Labels in Dedicated Dark Strip Rows */}
      <text x={width * 0.35} y={topBayH - 1.5} textAnchor="middle" fontSize={5.4} fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        1/2
      </text>
      <text x={width * 0.65} y={topBayH - 1.5} textAnchor="middle" fontSize={5.4} fontWeight="800" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        3/4 (N)
      </text>
      <text x={width * 0.35} y={botBayY + 6.8} textAnchor="middle" fontSize={5.4} fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-on-dark)">
        2/1
      </text>
      <text x={width * 0.65} y={botBayY + 6.8} textAnchor="middle" fontSize={5.4} fontWeight="800" fontFamily="var(--font-mono)" fill="var(--lamp-blue-on)">
        4/3 (N)
      </text>

      {/* Center White Faceplate Escutcheon */}
      <rect x={padX} y={faceY} width={innerW} height={faceH} rx={2} fill="var(--mat-housing)" stroke="var(--mat-housing-dark)" strokeWidth={1} />

      {/* Header Band: Left = RCCB 30mA, Right = Rating Pill (never overlaps!) */}
      <rect x={padX} y={faceY} width={innerW} height={11} rx={1.5} fill="var(--lamp-blue-off)" />
      <text x={padX + 4} y={faceY + 7.7} fontSize={5.8} fontWeight="900" fontFamily="var(--font-display)" fill="var(--silk-on-dark)">
        RCCB {sensitivityMa}mA
      </text>
      <rect x={width - padX - 21} y={faceY + 1.8} width={18} height={7.4} rx={1.5} fill="#e0f2fe" />
      <text x={width - padX - 12} y={faceY + 7.4} textAnchor="middle" fontSize={5.2} fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-blue-off)">
        {ratedAmps}A
      </text>

      {/* Upper Control Band: Left = Toroid + Status Shutter, Right = TEST Button */}
      <g transform={`translate(${padX + 10}, ${faceY + 21})`}>
        <ellipse cx={0} cy={0} rx={5.5} ry={3} fill="none" stroke="var(--mat-housing-dark-face)" strokeWidth={1} />
        <line x1={-2.5} y1={-5.5} x2={-2.5} y2={5.5} stroke="var(--cond-red)" strokeWidth={1} />
        <line x1={2.5} y1={-5.5} x2={2.5} y2={5.5} stroke="var(--cond-blue)" strokeWidth={1} />
      </g>

      <rect
        x={padX + 20}
        y={faceY + 16}
        width={24}
        height={10}
        rx={1.5}
        fill={isTripped ? 'var(--lamp-amber-on)' : isClosed ? 'var(--cond-red)' : 'var(--lamp-green-on)'}
        stroke="var(--mat-line)"
        strokeWidth={0.8}
      />
      <text
        x={padX + 32}
        y={faceY + 22.8}
        textAnchor="middle"
        fontSize={5.2}
        fontWeight="900"
        fontFamily="var(--font-mono)"
        fill={isTripped ? 'var(--silk)' : 'var(--silk-on-dark)'}
      >
        {isTripped ? 'FAULT' : isClosed ? 'I-ON' : 'O-OFF'}
      </text>

      {/* Isolated Right-Column Push-To-Test "T" Button */}
      <g onClick={handleTestTrip} className="cursor-pointer">
        <title>Push to simulate earth leakage trip ({sensitivityMa}mA)</title>
        <circle cx={width - padX - 12} cy={faceY + 20.5} r={7.5} fill="var(--cond-blue)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <text x={width - padX - 12} y={faceY + 22.8} textAnchor="middle" fontSize={7.2} fontWeight="900" fill="var(--silk-on-dark)">
          T
        </text>
        <text x={width - padX - 12} y={faceY + 33} textAnchor="middle" fontSize={4.2} fontWeight="800" fill="var(--silk)">
          TEST
        </text>
      </g>

      {/* Lower Control Band: Left = Toggle Handle, Right = Rating Text (separated!) */}
      <g onClick={handleToggle} className="cursor-pointer">
        <title>Click handle to toggle RCCB {isClosed ? 'OFF' : 'ON'}</title>
        <rect x={padX + 4} y={faceY + 31} width={38} height={17} rx={2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <rect
          x={padX + 6}
          y={isTripped ? faceY + 35.5 : isClosed ? faceY + 32.5 : faceY + 39.5}
          width={34}
          height={7}
          rx={1.5}
          fill="var(--nameplate)"
          stroke="var(--mat-line)"
          strokeWidth={0.8}
        />
      </g>

      <text x={width - padX - 13} y={faceY + 42} textAnchor="middle" fontSize={4.5} fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk)">
        240V~
      </text>
      <text x={width - padX - 13} y={faceY + 48.5} textAnchor="middle" fontSize={4.2} fontWeight="700" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
        IEC 61008
      </text>

      {/* Embedded Bottom Standard Label inside Faceplate */}
      <text x={cx} y={faceY + faceH - 3} textAnchor="middle" fontSize={4.4} fontWeight="800" fontFamily="var(--font-mono)" fill="var(--silk-muted)">
        {ratedAmps}A · Δn {sensitivityMa}mA · 6kA
      </text>

      {/* Terminations */}
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
