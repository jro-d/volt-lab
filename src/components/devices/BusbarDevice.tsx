import React from 'react';
import { DeviceProps, Mono, SymEarth, Terminals, TermIds } from './kit';

/** Neutral (blue insulators) or earth (green-yellow) busbar: tinned copper bar on two standoffs. */
export const BusbarDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const isEarth = device.type === 'earth_busbar';
  const cx = W / 2;
  const standoff = (y: number) => (
    <g>
      <rect x={cx - 9} y={y} width={18} height={9} rx={2} fill={isEarth ? 'var(--cond-green)' : 'var(--cond-blue)'} stroke="var(--mat-line)" strokeWidth={0.9} />
      {isEarth && <path d={`M${cx - 9} ${y + 6}l6 -6M${cx - 3} ${y + 9}l9 -9M${cx + 4} ${y + 9}l5 -5`} stroke="var(--cond-yellow)" strokeWidth={2.2} />}
      <circle cx={cx} cy={y + 4.5} r={1.6} fill="var(--mat-line)" />
    </g>
  );

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* bar */}
      <rect x={cx - 7} y={8} width={14} height={H - 16} rx={1.5} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={1} />
      <path d={`M${cx - 4.5} 10V${H - 10}`} stroke="#fff" strokeOpacity={0.3} strokeWidth={1.2} />
      {standoff(0)}
      {standoff(H - 9)}
      {/* bar marking */}
      <rect x={cx - 7} y={H * 0.5 - 21} width={14} height={8} rx={1} fill="var(--nameplate)" />
      <Mono x={cx} y={H * 0.5 - 15.6} size={4.6} anchor="middle" onDark>{isEarth ? 'PE' : 'N'}</Mono>
      {isEarth && <SymEarth x={cx} y={H - 25} s={0.6} />}

      <TermIds device={device} local size={4} side={() => 'right'} />
      <Terminals {...props} local />
    </g>
  );
};
