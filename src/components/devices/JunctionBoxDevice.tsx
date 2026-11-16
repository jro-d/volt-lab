import React from 'react';
import { DeviceComponentProps, DeviceTerminals, stopCanvas } from './DeviceTerminals';

/**
 * EduVolt-style 4" Octagonal Utility / Junction Box (Orange PVC or GI Steel).
 * Embedded material toggle button & spaced terminal legend inside cavity (zero floating external pills).
 */
export const JunctionBoxDevice: React.FC<DeviceComponentProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { x, y, width, height, terminals } = device;
  const isOrangePvc = device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc';
  const cx = x + width / 2;
  const cy = y + height / 2;

  const handleToggleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isOrangePvc ? 'galvanized_steel' : 'orange_pvc';
    if (onPatchState) onPatchState(device.id, { boxMaterial: next });
    else {
      device.state.boxMaterial = next;
      onToggleState?.({ ...device, state: { ...device.state, boxMaterial: next } });
    }
  };

  const pts = (inset: number) => {
    const w = width - inset * 2;
    const h = height - inset * 2;
    const c = Math.min(w, h) * 0.27;
    return [
      `${x + inset + c},${y + inset}`,
      `${x + inset + w - c},${y + inset}`,
      `${x + inset + w},${y + inset + c}`,
      `${x + inset + w},${y + inset + h - c}`,
      `${x + inset + w - c},${y + inset + h}`,
      `${x + inset + c},${y + inset + h}`,
      `${x + inset},${y + inset + h - c}`,
      `${x + inset},${y + inset + c}`,
    ].join(' ');
  };

  return (
    <g className="select-none">
      {/* Subtle CAD Shadow */}
      <polygon points={pts(-1)} transform="translate(2, 3)" fill="transparent" />

      {/* Outer Octagonal Flange */}
      <polygon
        points={pts(0)}
        fill={isOrangePvc ? 'var(--mat-pvc-orange)' : 'var(--mat-housing-shade)'}
        stroke="var(--mat-line)"
        strokeWidth={1.3}
      />

      {/* Recessed Box Basin */}
      <polygon
        points={pts(9)}
        fill={isOrangePvc ? 'var(--mat-pvc-orange-dark)' : 'var(--silk-muted)'}
        stroke="var(--mat-housing-dark)"
        strokeWidth={1}
      />

      {/* Side Conduit Knockouts */}
      {[
        [cx, y + 4.5],
        [cx, y + height - 4.5],
        [x + 4.5, cy],
        [x + width - 4.5, cy],
      ].map(([kx, ky], i) => (
        <circle key={`ko-${i}`} cx={kx} cy={ky} r={3.6} fill="none" stroke={isOrangePvc ? '#fed7aa' : 'var(--mat-housing-shade)'} strokeWidth={0.8} strokeDasharray="1.8 1" />
      ))}

      {/* Internal Wire-Nut Terminal Bridge Block */}
      <rect x={x + 15} y={y + 13} width={width - 30} height={height - 26} rx={3.5} fill="var(--mat-line)" stroke="var(--mat-housing-dark-face)" strokeWidth={0.9} opacity={0.92} />

      {/* Embedded Material Switch Pill centered cleanly between left & right columns */}
      <g onMouseDown={stopCanvas} onClick={handleToggleMaterial} className="cursor-pointer">
        <title>Click to switch between Orange uPVC Box and GI Galvanized Steel Box</title>
        <rect x={cx - 19} y={cy - 6} width={38} height={12} rx={2.5} fill="var(--mat-housing-dark)" stroke="var(--lamp-amber-on)" strokeWidth={0.7} />
        <text x={cx} y={cy + 2} textAnchor="middle" fontSize="4.2" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--lamp-white-on)">
          {isOrangePvc ? '4" PVC' : '4" GI'}
        </text>
      </g>

      {/* Non-overlapping compact edge labels next to each screw */}
      {terminals.map((t) => {
        const tx = x + t.relX * width;
        const ty = y + t.relY * height;
        const isLeft = t.relX < 0.5;
        return (
          <text
            key={`jbl-${t.id}`}
            x={isLeft ? tx - 8.5 : tx + 8.5}
            y={ty + 1.5}
            textAnchor={isLeft ? 'end' : 'start'}
            fontSize="3.8"
            fontWeight="900"
            fontFamily="var(--font-mono)"
            fill={t.type === 'phase' ? 'var(--lamp-red-on)' : t.type === 'neutral' ? 'var(--lamp-blue-on)' : t.type === 'earth' ? 'var(--lamp-green-on)' : '#fdba74'}
          >
            {t.label}
          </text>
        );
      })}

      <DeviceTerminals {...props} hideLabel={() => true} />
    </g>
  );
};
