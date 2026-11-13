import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style ROYU Wide-Series 1-Way / 3-Way / 4-Way Flush Wall Switch.
 * Pure flat architectural CAD plate with embedded [FRONT / REAR] toggle inside trim band
 * and non-overlapping terminal silkscreen labels.
 */
export const WallSwitchDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, type, terminals } = device;
  const isClosed = !!device.state.closed;
  const position3Way = device.state.position || 'A';
  const cross4Way = !!device.state.crossState;
  const isRearView = device.state.viewMode === 'rear';
  const cx = x + width / 2;
  const cy = y + height / 2;
  const hasTopTerms = type === 'switch_3way' || type === 'switch_4way';

  const isActive =
    type === 'switch_1gang' ? isClosed : type === 'switch_3way' ? position3Way === 'A' : cross4Way;

  const patch = (p: Record<string, any>) => {
    if (onPatchState) onPatchState(device.id, p);
    else {
      Object.assign(device.state, p);
      onToggleState?.({ ...device, state: { ...device.state, ...p } });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'switch_1gang') patch({ closed: !isClosed });
    else if (type === 'switch_3way') patch({ position: position3Way === 'A' ? 'B' : 'A' });
    else patch({ crossState: !cross4Way });
  };

  const handleFlipView = (e: React.MouseEvent) => {
    e.stopPropagation();
    patch({ viewMode: isRearView ? 'front' : 'rear' });
  };

  const tagText = type === 'switch_1gang' ? '1-WAY' : type === 'switch_3way' ? '3-WAY' : '4-WAY';
  const headerY = hasTopTerms ? y + 26 : y + 4;
  const bodyTop = hasTopTerms ? y + 41 : y + 19;
  const bodyBot = y + height - 29;
  const bodyH = bodyBot - bodyTop;

  return (
    <g className="select-none">
      {/* Subtle CAD shadow */}
      <rect x={x + 2} y={y + 3} width={width} height={height} rx={5} fill="rgba(15, 23, 42, 0.14)" />

      {/* Wallplate Frame */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={isRearView ? '#475569' : '#f8fafc'}
        stroke="#0f172a"
        strokeWidth={1.3}
      />

      {/* Top Terminal Bay & Embedded Silkscreen Labels (for 3-way / 4-way) */}
      {hasTopTerms && (
        <g>
          <rect x={x + 3} y={y + 2} width={width - 6} height={17} rx={2} fill="#1f2937" />
          <rect x={x + 3} y={y + 19} width={width - 6} height={7} fill="#0f172a" />
          {terminals
            .filter((t) => t.relY < 0.5)
            .map((t) => (
              <text
                key={`wt-${t.id}`}
                x={x + t.relX * width}
                y={y + 24.3}
                textAnchor="middle"
                fontSize="4.4"
                fontWeight="900"
                fontFamily="ui-monospace, monospace"
                fill="#fcd34d"
              >
                {t.label}
              </text>
            ))}
        </g>
      )}

      {/* Embedded Top Branding & Flip Chip (No floating external pill) */}
      <rect x={x + 4} y={headerY} width={width - 8} height={13} rx={2} fill="#0f172a" />
      <text x={x + 8} y={headerY + 8.6} fontSize="5" fontWeight="900" fontFamily="ui-sans-serif, system-ui" fill="#ef4444">
        ROYU
      </text>
      <g onMouseDown={stopCanvas} onClick={handleFlipView} className="cursor-pointer">
        <title>Flip between Front Wallplate and Rear Terminal Schematic</title>
        <rect
          x={x + width - 33}
          y={headerY + 1.5}
          width={26}
          height={10}
          rx={2}
          fill={isRearView ? '#0284c7' : '#334155'}
          stroke="#38bdf8"
          strokeWidth={0.5}
        />
        <text
          x={x + width - 20}
          y={headerY + 8.2}
          textAnchor="middle"
          fontSize="4"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          fill="#f8fafc"
        >
          {isRearView ? 'FRONT' : 'REAR'}
        </text>
      </g>

      {!isRearView ? (
        /* Front Architectural Rocker Actuator */
        <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
          <title>Click switch rocker to toggle contact state</title>
          <rect x={x + 8} y={bodyTop} width={width - 16} height={bodyH} rx={3} fill="#e2e8f0" stroke="#334155" strokeWidth={1.1} />
          <rect
            x={x + 11}
            y={bodyTop + (isActive ? 3 : 2)}
            width={width - 22}
            height={bodyH - 5}
            rx={2}
            fill={isActive ? '#ffffff' : '#cbd5e1'}
            stroke="#64748b"
            strokeWidth={0.8}
          />
          <rect
            x={cx - 10}
            y={isActive ? bodyTop + 7 : bodyBot - 10}
            width={20}
            height={3.2}
            rx={1.5}
            fill={type === 'switch_1gang' ? (isClosed ? '#16a34a' : '#64748b') : '#0284c7'}
          />
          <text
            x={cx}
            y={bodyTop + bodyH * 0.48}
            textAnchor="middle"
            fontSize="6"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill="#0f172a"
          >
            {type === 'switch_1gang'
              ? isClosed
                ? 'ON'
                : 'OFF'
              : type === 'switch_3way'
              ? `POS ${position3Way}`
              : cross4Way
              ? 'CROSS'
              : 'STRAIGHT'}
          </text>
          <text
            x={cx}
            y={bodyTop + bodyH * 0.68}
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="800"
            fontFamily="ui-monospace, monospace"
            fill="#475569"
          >
            {tagText} 16A
          </text>
        </g>
      ) : (
        /* Rear Polyamide Terminal Block & Live Contact Schematic */
        <g onMouseDown={stopCanvas} onClick={handleToggle} className="cursor-pointer">
          <title>Click rear mechanism to toggle contact path</title>
          <rect x={x + 7} y={bodyTop} width={width - 14} height={bodyH} rx={3} fill="#111827" stroke="#0f172a" strokeWidth={1} />
          {type === 'switch_1gang' && (
            <g strokeWidth={1.8} strokeLinecap="round">
              <circle cx={x + width * 0.30} cy={bodyTop + bodyH * 0.5} r={2.5} fill="#fbbf24" />
              <circle cx={x + width * 0.70} cy={bodyTop + bodyH * 0.5} r={2.5} fill="#fbbf24" />
              <line
                x1={x + width * 0.30}
                y1={bodyTop + bodyH * 0.5}
                x2={isClosed ? x + width * 0.70 : cx + 6}
                y2={isClosed ? bodyTop + bodyH * 0.5 : bodyTop + bodyH * 0.25}
                stroke={isClosed ? '#22c55e' : '#94a3b8'}
              />
            </g>
          )}
          {type === 'switch_3way' && (
            <g strokeWidth={1.6} strokeLinecap="round">
              <circle cx={cx} cy={bodyTop + bodyH * 0.28} r={2.5} fill="#f59e0b" />
              <circle cx={x + width * 0.30} cy={bodyTop + bodyH * 0.72} r={2.3} fill="#38bdf8" />
              <circle cx={x + width * 0.70} cy={bodyTop + bodyH * 0.72} r={2.3} fill="#38bdf8" />
              <line
                x1={cx}
                y1={bodyTop + bodyH * 0.28}
                x2={position3Way === 'A' ? x + width * 0.30 : x + width * 0.70}
                y2={bodyTop + bodyH * 0.72}
                stroke="#22c55e"
              />
            </g>
          )}
          {type === 'switch_4way' && (
            <g strokeWidth={1.6} strokeLinecap="round">
              <line
                x1={x + width * 0.30}
                y1={bodyTop + bodyH * 0.25}
                x2={cross4Way ? x + width * 0.70 : x + width * 0.30}
                y2={bodyTop + bodyH * 0.75}
                stroke="#22c55e"
              />
              <line
                x1={x + width * 0.70}
                y1={bodyTop + bodyH * 0.25}
                x2={cross4Way ? x + width * 0.30 : x + width * 0.70}
                y2={bodyTop + bodyH * 0.75}
                stroke="#38bdf8"
              />
            </g>
          )}
        </g>
      )}

      {/* Embedded Bottom Silkscreen Strip */}
      <rect x={x + 3} y={y + height - 27} width={width - 6} height={7} fill="#0f172a" />
      {terminals
        .filter((t) => t.relY >= 0.5)
        .map((t) => (
          <text
            key={`wb-${t.id}`}
            x={x + t.relX * width}
            y={y + height - 21.8}
            textAnchor="middle"
            fontSize="4.4"
            fontWeight="900"
            fontFamily="ui-monospace, monospace"
            fill={t.type === 'phase' ? '#f87171' : t.type === 'switched' ? '#fb923c' : '#38bdf8'}
          >
            {t.label}
          </text>
        ))}

      {/* Bottom Terminal Bay */}
      <rect x={x + 3} y={y + height - 20} width={width - 6} height={18} rx={2} fill="#1f2937" />

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
