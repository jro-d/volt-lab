import React from 'react';
import { DeviceProps, Terminals } from './kit';

const NUT: Record<string, { fill: string; dark: string }> = {
  red: { fill: 'var(--act-red)', dark: 'var(--lamp-red-off)' },
  yellow: { fill: 'var(--act-yellow)', dark: 'var(--mat-copper-dark)' },
  orange: { fill: 'var(--mat-pvc-orange)', dark: 'var(--mat-pvc-orange-dark)' },
  blue: { fill: 'var(--act-blue)', dark: 'var(--lamp-blue-off)' },
  grey: { fill: 'var(--mat-steel)', dark: 'var(--mat-steel-dark)' },
};

/** Twist-on wire nut (colour by size) or a 3-way lever splice connector (clear body, orange levers). */
export const SpliceNutDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const ports = device.terminals.map((t) => ({ x: W * t.relX, y: H * t.relY }));

  if (device.type === 'lever_connector_3p') {
    const bodyY = 2;
    const bodyH = ports[0].y - 6;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <rect x={2} y={bodyY} width={W - 4} height={bodyH} rx={3} fill="var(--mat-porcelain)" fillOpacity={0.85} stroke="var(--mat-line)" strokeWidth={1.1} />
        {/* internal busbar seen through the clear body */}
        <rect x={6} y={bodyY + bodyH - 9} width={W - 12} height={2.4} rx={1} fill="var(--mat-copper)" />
        {ports.map((p, i) => (
          <g key={i} className="pointer-events-none">
            <rect x={p.x - 5} y={bodyY + 2} width={10} height={bodyH - 13} rx={1.5} fill="var(--mat-pvc-orange)" stroke="var(--mat-pvc-orange-dark)" strokeWidth={0.7} />
            <path d={`M${p.x - 3} ${bodyY + 5}h6`} stroke="var(--mat-pvc-orange-dark)" strokeWidth={0.8} />
          </g>
        ))}
        <Terminals {...props} local />
      </g>
    );
  }

  const nut = NUT[(device.state.color as string) || 'red'] || NUT.red;
  const top = 4;
  const base = ports[0].y - 9;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* cone with wings and ribs */}
      <path d={`M${W / 2 - 8} ${top}h16l6 ${base - top}h${-28}z`} fill={nut.fill} stroke="var(--mat-line)" strokeWidth={1.1} strokeLinejoin="round" />
      <path d={`M${W / 2 - 14} ${top + (base - top) * 0.45}l-5 4l5 3zM${W / 2 + 14} ${top + (base - top) * 0.45}l5 4l-5 3z`} fill={nut.fill} stroke="var(--mat-line)" strokeWidth={0.8} />
      {[-6, -2, 2, 6].map((dx) => (
        <path key={dx} d={`M${W / 2 + dx * 0.8} ${top + 2}L${W / 2 + dx * 1.6} ${base - 2}`} stroke={nut.dark} strokeWidth={0.8} />
      ))}
      <rect x={W / 2 - 14} y={base} width={28} height={4} rx={1} fill={nut.dark} />
      <Terminals {...props} local />
    </g>
  );
};
