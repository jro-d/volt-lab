import React, { useId } from 'react';
import { ElectricalDevice, DeviceTerminal } from '../../types/electrical';
import { TerminalPoint } from './TerminalPoint';

interface JunctionBoxDeviceProps {
  device: ElectricalDevice;
  isSelected?: boolean;
  selectedTerminalId?: string | null;
  hoveredTerminalId?: string | null;
  onTerminalMouseDown?: (device: ElectricalDevice, terminal: DeviceTerminal, e: React.MouseEvent) => void;
  setHoveredTerminalId?: (id: string | null) => void;
  onToggleState?: (device: ElectricalDevice) => void;
}

export const JunctionBoxDevice: React.FC<JunctionBoxDeviceProps> = ({
  device,
  selectedTerminalId,
  hoveredTerminalId,
  onTerminalMouseDown,
  setHoveredTerminalId,
  onToggleState,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height, terminals } = device;
  const isOrangePvc = device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc';
  const cx = width / 2;
  const cy = height / 2;

  const handleToggleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    device.state.boxMaterial = isOrangePvc ? 'galvanized_steel' : 'orange_pvc';
    onToggleState?.(device);
  };

  // Octagonal polygon helper
  const pts = (inset: number) => {
    const w = width - inset * 2;
    const h = height - inset * 2;
    const c = Math.min(w, h) * 0.27;
    return [
      `${inset + c},${inset}`,
      `${inset + w - c},${inset}`,
      `${inset + w},${inset + c}`,
      `${inset + w},${inset + h - c}`,
      `${inset + w - c},${inset + h}`,
      `${inset + c},${inset + h}`,
      `${inset},${inset + h - c}`,
      `${inset},${inset + c}`,
    ].join(' ');
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <linearGradient id={`jbOrange-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="55%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id={`jbSteel-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <polygon points={pts(-1)} transform="translate(2, 3)" fill="rgba(15, 23, 42, 0.22)" />

      {/* Outer Octagonal Enclosure */}
      <polygon
        points={pts(0)}
        fill={isOrangePvc ? `url(#jbOrange-${uid})` : `url(#jbSteel-${uid})`}
        stroke={isOrangePvc ? '#7c2d12' : '#334155'}
        strokeWidth={1.8}
      />

      {/* Deep Interior Basin */}
      <polygon
        points={pts(9)}
        fill={isOrangePvc ? '#c2410c' : '#64748b'}
        stroke={isOrangePvc ? '#7c2d12' : '#334155'}
        strokeWidth={1.1}
      />
      <polygon
        points={pts(14)}
        fill={isOrangePvc ? '#9a3412' : '#475569'}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={0.8}
      />

      {/* Side Conduit Knockouts (KO Circles) */}
      {[
        [cx, 4.5],
        [cx, height - 4.5],
        [4.5, cy],
        [width - 4.5, cy],
      ].map(([kx, ky], i) => (
        <circle
          key={`ko-${i}`}
          cx={kx}
          cy={ky}
          r={4.2}
          fill="none"
          stroke={isOrangePvc ? '#fed7aa' : '#e2e8f0'}
          strokeWidth={0.9}
          strokeDasharray="2 1"
          opacity={0.75}
        />
      ))}

      {/* Mounting Cover Ears (#8-32 Screws) */}
      {[12, height - 12].map((ey, i) => (
        <g key={`ear-${i}`}>
          <rect x={cx - 8} y={ey - 3.5} width={16} height={7} rx={2} fill={isOrangePvc ? '#ea580c' : '#cbd5e1'} stroke="#1e293b" strokeWidth={0.8} />
          <circle cx={cx} cy={ey} r={2} fill="#1e293b" />
        </g>
      ))}

      {/* Ground Boss & Internal Terminal Splicing Block */}
      <rect x={16} y={cy - 18} width={width - 32} height={36} rx={5} fill="#0f172a" stroke="#475569" strokeWidth={1.1} opacity={0.92} />
      <text x={cx} y={cy - 19} textAnchor="middle" fontSize={5.5} fontWeight="900" fontFamily="monospace" fill="#f8fafc">
        {isOrangePvc ? '4" PVC OCTAGONAL' : '4" GI OCTAGONAL'}
      </text>

      {/* Top Quick Material Toggle */}
      <g onClick={handleToggleMaterial} transform={`translate(${cx}, -8)`} className="cursor-pointer">
        <rect x={-26} y={-5.5} width={52} height={10} rx={5} fill="#0f172a" stroke="#f59e0b" strokeWidth={0.7} />
        <text x={0} y={0.5} textAnchor="middle" dominantBaseline="middle" fontSize={5.5} fontWeight="bold" fill="#fef08a">
          {isOrangePvc ? 'Orange PVC' : 'GI Steel'}
        </text>
      </g>

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
