import React, { useContext } from 'react';
import { DeviceTerminal } from '../../types/electrical';
import { DeviceIdContext, TerminalHighlightContext } from './TerminalContext';

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

  let ringColor = '#64748b';
  let haloColor = 'rgba(148, 163, 184, 0.35)';

  if (terminal.type === 'earth') {
    ringColor = '#16a34a';
    haloColor = 'rgba(34, 197, 94, 0.38)';
  } else if (terminal.type === 'neutral') {
    ringColor = '#2563eb';
    haloColor = 'rgba(59, 130, 246, 0.38)';
  } else if (terminal.type === 'phase' || terminal.type === 'phase2' || terminal.type === 'phase3') {
    ringColor = '#dc2626';
    haloColor = 'rgba(239, 68, 68, 0.38)';
  } else if (terminal.type === 'switched' || terminal.type === 'traveler') {
    ringColor = '#eab308';
    haloColor = 'rgba(234, 179, 8, 0.38)';
  } else if (terminal.type === 'coil') {
    ringColor = '#8b5cf6';
    haloColor = 'rgba(139, 92, 246, 0.38)';
  } else if (terminal.type === 'no') {
    ringColor = '#10b981';
    haloColor = 'rgba(16, 185, 129, 0.38)';
  } else if (terminal.type === 'nc') {
    ringColor = '#f59e0b';
    haloColor = 'rgba(245, 158, 11, 0.38)';
  } else if (terminal.type === 'input') {
    ringColor = '#06b6d4';
    haloColor = 'rgba(6, 182, 212, 0.38)';
  } else if (terminal.type === 'output') {
    ringColor = '#f97316';
    haloColor = 'rgba(249, 115, 22, 0.38)';
  }

  const labelText = terminal.label || terminal.name;
  const tooltipW = Math.max(70, labelText.length * 6.5 + (connected ? 48 : 16));

  return (
    <g
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
        fill={
          isWireEndpointHighlighted
            ? 'rgba(14, 165, 233, 0.25)'
            : isHovered || isSelected
              ? haloColor
              : 'transparent'
        }
        className="transition-colors duration-150"
      />

      {/* Wire-Connected Port Highlight (when user selects a connected wire, both ends light up) */}
      {isWireEndpointHighlighted && wireEndpoint && (
        <g className="pointer-events-none">
          <circle r={13} fill="none" stroke="#38bdf8" strokeWidth={2} opacity={0.45} className="animate-ping" />
          <circle r={11} fill="none" stroke="#ffffff" strokeWidth={2.8} />
          <circle r={11} fill="none" stroke="#0284c7" strokeWidth={1.8} strokeDasharray="4 2" />
          <path
            d="M -12.5 -7.5 L -12.5 -12.5 L -7.5 -12.5 M 7.5 -12.5 L 12.5 -12.5 L 12.5 -7.5 M -12.5 7.5 L -12.5 12.5 L -7.5 12.5 M 7.5 12.5 L 12.5 12.5 L 12.5 7.5"
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Subtle Connected Ferrule Ring (only when wire is terminated here) */}
      {connected && !isWireEndpointHighlighted && (
        <circle
          r={8.4}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.3}
          strokeDasharray="2.5 1.5"
          opacity={0.9}
          className="pointer-events-none"
        />
      )}

      {/* EduVolt CAD Recessed Cage Pocket */}
      <rect
        x={-6.4}
        y={-6.4}
        width={12.8}
        height={12.8}
        rx={2.2}
        fill="#1e293b"
        stroke={isWireEndpointHighlighted ? '#38bdf8' : isHovered ? ringColor : '#0f172a'}
        strokeWidth={1.1}
      />

      {/* Metallic Screw Shoulder Ring (subtle polarity tint) */}
      <circle
        r={5.1}
        fill="#e2e8f0"
        stroke={isHovered || isSelected ? ringColor : '#334155'}
        strokeWidth={isHovered || isSelected ? 1.3 : 0.9}
      />

      {/* Recessed Machined Phillips (+) Screw Head */}
      <circle r={3.9} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.5} />
      <line x1={-2.6} y1={0} x2={2.6} y2={0} stroke="#0f172a" strokeWidth={1.35} strokeLinecap="round" />
      <line x1={0} y1={-2.6} x2={0} y2={2.6} stroke="#0f172a" strokeWidth={1.35} strokeLinecap="round" />

      {/* Center Ferrule Indicator Dot when occupied */}
      {connected && <circle r={1.1} fill={ringColor} />}

      {/* Selected Pulse Ring (during wire drawing start) */}
      {isSelected && (
        <circle
          r={10}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          strokeDasharray="3 3"
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
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth={1.1}
          />
          <circle cx={-36} cy={-2} r={2.8} fill={wireEndpoint.wireColor} stroke="#ffffff" strokeWidth={0.6} />
          <text
            x={4}
            y={-2}
            fill="#f8fafc"
            fontSize={8.2}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="monospace"
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
            fill="#0f172a"
            stroke="#475569"
            strokeWidth={0.9}
          />
          <text
            x={0}
            y={-4}
            fill="#f8fafc"
            fontSize={8.5}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="monospace"
          >
            {connected ? `${labelText} • R-Click` : labelText}
          </text>
        </g>
      )}
    </g>
  );
};
