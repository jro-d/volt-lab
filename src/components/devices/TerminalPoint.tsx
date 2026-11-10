import React from 'react';
import { DeviceTerminal } from '../../types/electrical';

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
  // Determine color based on terminal type
  let ringColor = '#ca8a04'; // Brass/gold default
  let haloColor = 'rgba(234, 179, 8, 0.4)';

  if (terminal.type === 'earth') {
    ringColor = '#16a34a'; // Green
    haloColor = 'rgba(34, 197, 94, 0.4)';
  } else if (terminal.type === 'neutral') {
    ringColor = '#2563eb'; // Blue
    haloColor = 'rgba(59, 130, 246, 0.4)';
  } else if (terminal.type === 'phase' || terminal.type === 'phase2' || terminal.type === 'phase3') {
    ringColor = '#dc2626'; // Red
    haloColor = 'rgba(239, 68, 68, 0.4)';
  } else if (terminal.type === 'switched' || terminal.type === 'traveler') {
    ringColor = '#eab308'; // Amber
    haloColor = 'rgba(234, 179, 8, 0.4)';
  } else if (terminal.type === 'coil') {
    ringColor = '#8b5cf6'; // Purple for relay/contactor coils (A1/A2)
    haloColor = 'rgba(139, 92, 246, 0.4)';
  } else if (terminal.type === 'no') {
    ringColor = '#10b981'; // Emerald for Normally Open contacts
    haloColor = 'rgba(16, 185, 129, 0.4)';
  } else if (terminal.type === 'nc') {
    ringColor = '#f59e0b'; // Amber for Normally Closed contacts
    haloColor = 'rgba(245, 158, 11, 0.4)';
  } else if (terminal.type === 'input') {
    ringColor = '#06b6d4'; // Cyan for PLC digital inputs
    haloColor = 'rgba(6, 182, 212, 0.4)';
  } else if (terminal.type === 'output') {
    ringColor = '#f97316'; // Orange for PLC relay outputs
    haloColor = 'rgba(249, 115, 22, 0.4)';
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-crosshair group"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Interactive Hit Target / Snap Halo */}
      <circle
        r={14}
        fill={isHovered || isSelected ? haloColor : 'transparent'}
        className="transition-colors duration-150"
      />

      {/* Outer Metal Collar / Lug */}
      <circle
        r={7}
        fill="#475569"
        stroke="#1e293b"
        strokeWidth={1}
      />

      {/* Brass / Copper Terminal Ring */}
      <circle
        r={5}
        fill={ringColor}
        stroke="#0f172a"
        strokeWidth={0.8}
      />

      {/* Center Screw Slot or Wire Hole */}
      <circle
        r={2.2}
        fill="#0f172a"
      />

      {/* Screw Head Slot Line */}
      <line
        x1={-3}
        y1={-1}
        x2={3}
        y2={1}
        stroke="#fef08a"
        strokeWidth={0.8}
        opacity={0.7}
      />

      {/* Selected Pulse Ring */}
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

      {/* Small Label Tooltip on Hover */}
      {isHovered && (
        <g transform="translate(0, -18)" className="pointer-events-none">
          <rect
            x={-35}
            y={-12}
            width={70}
            height={16}
            rx={3}
            fill="#090d16"
            stroke="#475569"
            strokeWidth={0.8}
          />
          <text
            x={0}
            y={0}
            fill="#f8fafc"
            fontSize={9}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="monospace"
          >
            {terminal.label || terminal.name}
          </text>
        </g>
      )}
    </g>
  );
};
