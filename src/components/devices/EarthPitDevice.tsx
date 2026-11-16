import React from 'react';
import { DeviceProps, Mono, Silk, SymEarth, Terminals, TermIds } from './kit';

/** Earth electrode pit: concrete inspection chamber, copper-bonded rod, brass clamp, resistance tag. */
export const EarthPitDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const ohms = device.state.earthResistanceOhms ?? 4.8;
  const ok = ohms <= 25;
  const t = device.terminals[0];
  const rx = W * (t?.relX ?? 0.5);
  const ry = H * (t?.relY ?? 0.28);

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* soil */}
      <rect x={0} y={14} width={W} height={H - 14} rx={3} fill="var(--mat-cast-dark)" stroke="var(--mat-line)" strokeWidth={1} />
      {Array.from({ length: 16 }).map((_, i) => (
        <circle key={i} cx={(i * 37) % (W - 8) + 4} cy={30 + ((i * 23) % (H - 40))} r={0.9} fill="var(--mat-cast)" />
      ))}
      {/* concrete chamber */}
      <rect x={rx - 26} y={6} width={52} height={40} rx={2} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={1.25} />
      <rect x={rx - 21} y={11} width={42} height={30} rx={1.5} fill="var(--mat-cast)" stroke="var(--mat-line)" strokeWidth={0.7} />
      <rect className="d-nameplate" x={rx - 26} y={0} width={52} height={8} rx={1.5} />
      <Silk x={rx} y={5.8} size={4.6} anchor="middle" bold onDark>EARTH PIT</Silk>
      {/* rod */}
      <rect x={rx - 2.5} y={ry} width={5} height={H - ry - 4} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={0.6} />
      <path d={`M${rx - 2.5} ${H - 4}l2.5 4l2.5 -4`} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={0.6} />
      {/* brass clamp */}
      <rect className="d-brass" x={rx - 9} y={ry - 3} width={18} height={6} rx={1.5} />
      {/* tag */}
      <rect x={6} y={H - 22} width={W - 12} height={16} rx={2} fill="var(--nameplate)" />
      <Mono x={rx} y={H - 15} size={5} anchor="middle" fill={ok ? 'var(--console-readout)' : 'var(--console-danger)'}>{`R = ${ohms} Ω`}</Mono>
      <Mono x={rx} y={H - 9} size={3.6} anchor="middle" fill="var(--console-muted)">{ok ? '≤ 25 Ω PEC 2.50' : '> 25 Ω: ADD ROD'}</Mono>
      <SymEarth x={W - 12} y={18} s={0.6} dark />

      <TermIds device={device} local size={4} onDark side={() => 'right'} />
      <Terminals {...props} local />
    </g>
  );
};
