import React from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

export interface DeviceTerminalsProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  /** Label colour per terminal (defaults to light grey) */
  labelColor?: (t: DeviceTerminal) => string;
  /** Hide the engraved label for a terminal */
  hideLabel?: (t: DeviceTerminal) => boolean;
  /** Draw labels on a dark backing chip (for light housings) */
  chip?: boolean;
}

/**
 * Terminal screws + engraved two-line labels ("13" / "NO"). Labels sit inside the housing:
 * below terminals in the top row, above terminals in the bottom row.
 */
export const DeviceTerminals: React.FC<DeviceTerminalsProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  labelColor,
  hideLabel,
  chip = false,
}) => {
  const { x, y, width, height } = device;
  return (
    <>
      {device.terminals.map((terminal) => {
        const tx = x + width * terminal.relX;
        const ty = y + height * terminal.relY;
        const termKey = `${device.id}:${terminal.id}`;
        const raw = terminal.label || terminal.id;
        const [main, sub] = raw.includes(' ') ? [raw.split(' ')[0], raw.split(' ').slice(1).join(' ')] : [raw, ''];
        const isTop = terminal.relY < 0.5;
        const ly = isTop ? ty + 13 : ty - 10;
        const color = labelColor ? labelColor(terminal) : '#e2e8f0';
        return (
          <g key={terminal.id}>
            {!hideLabel?.(terminal) && (
              <g className="pointer-events-none">
                {chip && (
                  <rect
                    x={tx - 9}
                    y={isTop ? ly - 6 : ly - 6 - (sub ? 5 : 0)}
                    width={18}
                    height={sub ? 13 : 8}
                    rx={2}
                    fill="#0f172a"
                    opacity={0.78}
                  />
                )}
                <text
                  x={tx}
                  y={isTop ? ly : sub ? ly - 5 : ly}
                  textAnchor="middle"
                  fontSize="5.8"
                  fontWeight="800"
                  fontFamily="ui-monospace, monospace"
                  fill={color}
                >
                  {main}
                </text>
                {sub && (
                  <text
                    x={tx}
                    y={isTop ? ly + 5.5 : ly + 0.5}
                    textAnchor="middle"
                    fontSize="4.4"
                    fontWeight="700"
                    fontFamily="ui-monospace, monospace"
                    fill={color}
                    opacity={0.85}
                  >
                    {sub}
                  </text>
                )}
              </g>
            )}
            <TerminalPoint
              terminal={terminal}
              x={tx}
              y={ty}
              isHovered={hoveredTerminalId === termKey}
              isSelected={selectedTerminalId === termKey}
              onMouseDown={(e) => onTerminalMouseDown(device, terminal, e)}
              onMouseEnter={() => setHoveredTerminalId(termKey)}
              onMouseLeave={() => setHoveredTerminalId(null)}
            />
          </g>
        );
      })}
    </>
  );
};

/** Stops canvas drag / selection when interacting with an on-device control */
export const stopCanvas = (e: React.MouseEvent) => {
  e.stopPropagation();
};

/** Small clickable pill drawn on SVG devices */
export const SvgPill: React.FC<{
  x: number;
  y: number;
  w: number;
  label: string;
  active?: boolean;
  activeColor?: string;
  title?: string;
  onClick: (e: React.MouseEvent) => void;
}> = ({ x, y, w, label, active, activeColor = '#0ea5e9', title, onClick }) => (
  <g
    transform={`translate(${x}, ${y})`}
    className="cursor-pointer"
    onMouseDown={stopCanvas}
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
  >
    {title && <title>{title}</title>}
    <rect
      x={-w / 2}
      y={-6}
      width={w}
      height={12}
      rx={6}
      fill={active ? activeColor : '#ffffff'}
      stroke={active ? activeColor : '#94a3b8'}
      strokeWidth={0.9}
      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
    />
    <text
      x={0}
      y={2.2}
      textAnchor="middle"
      fontSize="6"
      fontWeight="800"
      fontFamily="ui-sans-serif, system-ui"
      fill={active ? '#ffffff' : '#334155'}
    >
      {label}
    </text>
  </g>
);

/** Props shared by every workbench device renderer */
export interface DeviceComponentProps {
  device: ElectricalDevice;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
  /** Merge a partial state patch into the live device (momentary buttons, dials...) */
  onPatchState?: (deviceId: string, patch: Record<string, any>) => void;
}

/**
 * Momentary push-button helper: presses on mouse-down and springs back on mouse-up
 * anywhere in the window.
 */
export function momentaryPress(
  e: React.MouseEvent,
  deviceId: string,
  key: string,
  onPatchState?: (deviceId: string, patch: Record<string, any>) => void
) {
  e.stopPropagation();
  e.preventDefault();
  if (!onPatchState) return;
  onPatchState(deviceId, { [key]: true });
  const release = () => {
    onPatchState(deviceId, { [key]: false });
    window.removeEventListener('mouseup', release);
  };
  window.addEventListener('mouseup', release);
}
