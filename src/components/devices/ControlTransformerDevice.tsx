import React from 'react';
import { Bay, DeviceProps, Led, Mono, Nameplate, Screw, Silk, Terminals, TermIds, deviceTag } from './kit';

/**
 * Single-phase control transformer: laminated E-I core in a steel frame, copper coil block,
 * primary terminals H1-H2 on top, secondary X1-X2 below with a secondary fuse and a LIVE lamp.
 */
export const ControlTransformerDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const live = !!device.state.secondaryLive;
  const pri = device.state.primaryVolts || 440;
  const sec = device.state.secondaryVolts || 220;
  const va = device.state.vaRating || 250;
  const tTop = H * (device.terminals[0]?.relY ?? 0.07);
  const topBayY = tTop - 8;
  const botBayY = H - tTop - 8;
  const coreY = topBayY + 20;
  const coreH = botBayY - 4 - coreY;
  const cx = W / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Mounting feet */}
      <rect className="d-steel" x={-3} y={coreY + 6} width={W + 6} height={6} rx={1.5} />
      <rect className="d-steel" x={-3} y={coreY + coreH - 12} width={W + 6} height={6} rx={1.5} />
      {[0, W].map((fx) => [coreY + 9, coreY + coreH - 9].map((fy) => <circle key={`${fx}-${fy}`} cx={fx} cy={fy} r={1.2} fill="var(--mat-line)" />))}

      {/* Laminated core */}
      <rect x={6} y={coreY} width={W - 12} height={coreH} rx={2} fill="var(--mat-steel-dark)" stroke="var(--mat-line)" strokeWidth={1.25} />
      {Array.from({ length: Math.floor((W - 16) / 3) }).map((_, i) => (
        <path key={i} d={`M${9 + i * 3} ${coreY + 2}v${coreH - 4}`} stroke="var(--mat-steel)" strokeWidth={0.5} opacity={0.6} />
      ))}
      {/* Coil block */}
      {live && <rect x={W * 0.2 - 3} y={coreY + 6} width={W * 0.6 + 6} height={coreH - 12} rx={4} fill="var(--lamp-glow)" />}
      <rect x={W * 0.2} y={coreY + 9} width={W * 0.6} height={coreH - 18} rx={3} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={1} />
      {Array.from({ length: 10 }).map((_, i) => (
        <path key={i} d={`M${W * 0.2 + 3} ${coreY + 12 + i * ((coreH - 24) / 9)}h${W * 0.6 - 6}`} stroke="var(--mat-copper-dark)" strokeWidth={0.5} opacity={0.7} />
      ))}
      {/* Insulation wrap + label */}
      <rect x={W * 0.24} y={coreY + coreH / 2 - 15} width={W * 0.52} height={30} rx={1.5} fill="var(--mat-porcelain)" stroke="var(--mat-line)" strokeWidth={0.6} />
      <Nameplate x={W * 0.24} y={coreY + coreH / 2 - 15} w={W * 0.52} h={7} tag={deviceTag(device) || 'T'} text={`${va}VA`} size={4.4} />
      <Mono x={cx} y={coreY + coreH / 2} size={4.6} anchor="middle">{`${pri}V → ${sec}V`}</Mono>
      {/* Transformer symbol (two coupled windings) */}
      <g className="d-sym pointer-events-none">
        <circle cx={cx - 3} cy={coreY + coreH / 2 + 8} r={3.6} />
        <circle cx={cx + 3} cy={coreY + coreH / 2 + 8} r={3.6} />
      </g>

      {/* Primary strip (H1-H2) */}
      <Bay x={10} y={topBayY} w={W - 20} h={16} dark />
      <Silk x={cx} y={topBayY + 10.5} size={4.6} anchor="middle" bold onDark>{`PRI ${pri}V`}</Silk>
      {/* Secondary strip (X1-X2) with fuse */}
      <Bay x={10} y={botBayY} w={W - 20} h={16} dark />
      <rect x={cx - 11} y={botBayY + 3} width={22} height={10} rx={2} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.6} />
      <rect x={cx - 7} y={botBayY + 5.5} width={14} height={5} rx={2.5} fill="var(--mat-porcelain)" />
      <Mono x={cx} y={botBayY + 9.4} size={3.4} anchor="middle">FU 2A</Mono>
      <Led cx={W - 22} cy={coreY + 3.5} r={1.8} on={live} color="green" />
      <Silk x={W - 26} y={coreY + 5.4} size={3.6} anchor="end" onDark>LIVE</Silk>
      <Screw cx={14} cy={coreY + 3.5} r={1.3} />

      <TermIds device={device} local size={4.6} onDark side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
