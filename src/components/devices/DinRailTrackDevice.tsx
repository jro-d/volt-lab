import React from 'react';
import { DeviceProps, Mono, Screw, Terminals, TermIds } from './kit';

/** 35 mm top-hat DIN rail (IEC 60715) with end stops and a green-yellow PE terminal block. */
export const DinRailTrackDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const cy = H / 2;
  const peX = W * (device.terminals[0]?.relX ?? 0.95);

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* rail flanges + hat */}
      <rect className="d-steel" x={0} y={cy - 13} width={W} height={26} rx={1.5} />
      <rect x={0} y={cy - 8} width={W} height={16} fill="var(--mat-steel)" stroke="var(--mat-steel-dark)" strokeWidth={0.6} />
      <path d={`M0 ${cy - 8}H${W}M0 ${cy + 8}H${W}`} stroke="var(--mat-steel-dark)" strokeWidth={0.8} />
      {/* mounting slots */}
      {Array.from({ length: Math.floor((W - 40) / 25) }).map((_, i) => (
        <rect key={i} x={18 + i * 25} y={cy - 2.2} width={14} height={4.4} rx={2.2} fill="var(--mat-steel-dark)" />
      ))}
      {/* end stops */}
      {[2, peX - 22].map((ex) => (
        <g key={ex}>
          <rect className="d-dark" x={ex} y={cy - 15} width={8} height={30} rx={1.5} />
          <Screw cx={ex + 4} cy={cy - 9} r={1.6} m="dark" />
        </g>
      ))}
      <Mono x={W / 2} y={cy - 9.6} size={3.8} anchor="middle" muted>TH35-7.5 · IEC 60715</Mono>
      {/* PE terminal block */}
      <rect x={peX - 11} y={cy - 16} width={22} height={32} rx={2} fill="var(--cond-green)" stroke="var(--mat-line)" strokeWidth={1} />
      <path d={`M${peX - 11} ${cy + 6}l8 -8M${peX - 5} ${cy + 16}l16 -16M${peX + 5} ${cy + 16}l6 -6M${peX - 11} ${cy - 6}l10 -10`} stroke="var(--cond-yellow)" strokeWidth={3} />
      <rect x={peX - 11} y={cy - 16} width={22} height={32} rx={2} fill="none" stroke="var(--mat-line)" strokeWidth={1} />

      <TermIds device={device} local size={4.2} side={() => 'left'} skip={() => true} />
      <Terminals {...props} local />
    </g>
  );
};
