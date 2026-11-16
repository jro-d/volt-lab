import React, { useContext } from 'react';
import { DeviceTerminal } from '../../types/electrical';
import { DeviceIdContext, TerminalHighlightContext } from './TerminalContext';
import { conductorColor } from '../../styles/conductors';

interface TerminalPointProps {
  terminal: DeviceTerminal;
  x: number;
  y: number;
  isHovered?: boolean;
  isSelected?: boolean;
  isConnected?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const TerminalPoint: React.FC<TerminalPointProps> = ({
  terminal,
  x,
  y,
  isHovered,
  isSelected,
  isConnected,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  const deviceId = useContext(DeviceIdContext);
  const { connectedTerminalKeys, highlightedWireEndpoints, onPortContextMenu } = useContext(TerminalHighlightContext);
  const termKey = deviceId ? `${deviceId}:${terminal.id}` : null;
  const connected = isConnected ?? (termKey ? connectedTerminalKeys.has(termKey) : false);
  const wireEndpoint = termKey ? highlightedWireEndpoints.get(termKey) : undefined;
  const isWireEndpointHighlighted = Boolean(wireEndpoint);

  // Role ring hues (v2): line, neutral, earth, control, signal. Shown on hover and as the occupied dot.
  let ringColor = 'var(--mat-line-soft)';
  if (terminal.type === 'earth') ringColor = 'var(--port-earth)';
  else if (terminal.type === 'neutral') ringColor = 'var(--port-neutral)';
  else if (['phase', 'phase2', 'phase3', 'switched', 'traveler'].includes(terminal.type)) ringColor = 'var(--port-line)';
  else if (['coil', 'no', 'nc'].includes(terminal.type)) ringColor = 'var(--port-control)';
  else if (terminal.type === 'input' || terminal.type === 'output') ringColor = 'var(--port-signal)';

  const labelText = terminal.label || terminal.name;
  const tooltipW = Math.max(70, labelText.length * 6.5 + (connected ? 48 : 16));

  return (
    <g
      data-terminal="1"
      transform={`translate(${x}, ${y})`}
      className="cursor-crosshair group"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => {
        if (connected && deviceId && onPortContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onPortContextMenu(deviceId, terminal.id, e.clientX, e.clientY);
        }
      }}
    >
      {/* Interactive Hit Target / Snap Halo */}
      <circle
        r={isWireEndpointHighlighted ? 16 : 14}
        fill={isWireEndpointHighlighted ? 'var(--probe)' : isHovered || isSelected ? ringColor : 'transparent'}
        fillOpacity={isWireEndpointHighlighted ? 0.22 : 0.28}
        className="transition-colors duration-150"
      />

      {/* Wire-Connected Port Highlight (when user selects a connected wire, both ends light up) */}
      {isWireEndpointHighlighted && wireEndpoint && (
        <g className="pointer-events-none">
          <circle r={10.5} fill="none" stroke="var(--canvas)" strokeWidth={3} />
          <circle r={10.5} fill="none" stroke="var(--probe)" strokeWidth={1.6} />
          <path
            d="M -12.5 -7.5 L -12.5 -12.5 L -7.5 -12.5 M 7.5 -12.5 L 12.5 -12.5 L 12.5 -7.5 M -12.5 7.5 L -12.5 12.5 L -7.5 12.5 M 7.5 12.5 L 12.5 12.5 L 12.5 7.5"
            fill="none"
            stroke="var(--probe)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Subtle Connected Ferrule Ring (only when wire is terminated here) */}
      {connected && !isWireEndpointHighlighted && (
        <circle
          r={8.2}
          fill="none"
          stroke="var(--wire-lug)"
          strokeWidth={1.4}
          className="pointer-events-none"
        />
      )}

      {/* Screw-cage pocket */}
      <rect
        x={-6.4}
        y={-6.4}
        width={12.8}
        height={12.8}
        rx={2.2}
        fill="var(--term-cage)"
        stroke={isWireEndpointHighlighted ? 'var(--probe)' : isHovered ? ringColor : 'var(--mat-line)'}
        strokeWidth={1}
      />

      {/* Metallic Screw Shoulder Ring (subtle polarity tint) */}
      <circle
        r={5.1}
        fill="var(--term-screw)"
        stroke={isHovered || isSelected ? ringColor : 'var(--term-screw-line)'}
        strokeWidth={isHovered || isSelected ? 1.3 : 0.9}
      />

      {/* Recessed Machined Phillips (+) Screw Head */}
      <circle r={3.9} fill="var(--term-screw)" stroke="var(--term-screw-line)" strokeWidth={0.5} />
      <line x1={-2.6} y1={0} x2={2.6} y2={0} stroke="var(--mat-line)" strokeWidth={1.2} strokeLinecap="round" />
      <line x1={0} y1={-2.6} x2={0} y2={2.6} stroke="var(--mat-line)" strokeWidth={1.2} strokeLinecap="round" />

      {/* Center Ferrule Indicator Dot when occupied */}
      {connected && <circle r={1.1} fill={ringColor} />}

      {/* Selected Pulse Ring (during wire drawing start) */}
      {isSelected && (
        <circle
          r={9.5}
          fill="none"
          stroke="var(--probe)"
          strokeWidth={1.4}
          strokeDasharray="3 2"
          className="animate-spin origin-center"
        />
      )}

      {/* Highlighted Port Callout Badge when selected wire terminates here */}
      {isWireEndpointHighlighted && wireEndpoint && !isHovered && (
        <g transform="translate(0, -21)" className="pointer-events-none">
          <rect
            x={-44}
            y={-10}
            width={88}
            height={16}
            rx={4}
            fill="var(--probe)"
          />
          <circle cx={-36} cy={-2} r={2.8} fill={conductorColor(wireEndpoint.wireColor)} stroke="var(--on-probe)" strokeWidth={0.6} />
          <text
            x={4}
            y={-2}
            fill="var(--on-probe)"
            fontSize={8.2}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono)"
          >
            {wireEndpoint.role}: {wireEndpoint.label.slice(0, 8)}
          </text>
        </g>
      )}

      {/* Clean Hover Tooltip */}
      {isHovered && (
        <g transform="translate(0, -20)" className="pointer-events-none">
          <rect
            x={-tooltipW / 2}
            y={-12}
            width={tooltipW}
            height={16}
            rx={3.5}
            fill="var(--nameplate)"
          />
          <text
            x={0}
            y={-4}
            fill="var(--silk-on-dark)"
            fontSize={8.5}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono)"
          >
            {connected ? `${labelText} · right-click` : labelText}
          </text>
        </g>
      )}
    </g>
  );
};
