import React from 'react';
import { Bay, DeviceProps, DinClip, Housing, Mono, Nameplate, Silk, Terminals, TermIds, deviceTag } from './kit';

/**
 * Type 2 surge protective device: base with two plug-in MOV cartridges (L–N, N–PE).
 * Each cartridge has a status window: green = protecting, red = replace.
 */
export const SpdDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const healthy = device.state.healthy !== false;
  const uc = device.state.ucVolts || 275;
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const bayH = tTop * 2 - 1.5;
  const botBayY = H - 2 - bayH;
  const cartY = 2 + bayH + 11;
  const cartH = botBayY - 16 - cartY;
  const cw = (W - 9) / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={W / 2} y={H} />
      <Housing w={W} h={H} m="shade" />
      <Bay x={3} y={2} w={W - 6} h={bayH} />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} />
      <Nameplate x={3} y={2 + bayH + 1.5} w={W - 6} h={7} tag={deviceTag(device)} text="T2" size={4.6} />

      {/* Plug-in cartridges */}
      {[0, 1].map((i) => {
        const x0 = 3 + i * (cw + 3);
        const ccx = x0 + cw / 2;
        return (
          <g key={i} className="pointer-events-none">
            <rect className="d-face" x={x0} y={cartY} width={cw} height={cartH} rx={2} />
            {/* release grip ribs */}
            <path className="d-seam" d={`M${x0 + 3} ${cartY + 2.5}h${cw - 6}M${x0 + 3} ${cartY + 4.5}h${cw - 6}`} />
            <Silk x={ccx} y={cartY + 12} size={4.6} anchor="middle" bold>{i === 0 ? 'L–N' : 'N–PE'}</Silk>
            {/* status window */}
            <rect x={ccx - 5} y={cartY + 15} width={10} height={6} rx={1} fill="var(--mat-line)" />
            <rect x={ccx - 4} y={cartY + 16} width={8} height={4} rx={0.6} fill={healthy ? 'var(--flag-off)' : 'var(--flag-on)'} />
            {/* MOV / GDT symbol: varistor box with slash */}
            <path className="d-sym" d={`M${ccx} ${cartY + 25}v3M${ccx - 2.5} ${cartY + 28}h5v8h-5zM${ccx - 4} ${cartY + 37}l8 -10M${ccx} ${cartY + 36}v3`} />
            <Mono x={ccx} y={cartY + cartH - 4} size={3.4} anchor="middle" muted>{i === 0 ? 'MOV' : 'GDT'}</Mono>
          </g>
        );
      })}

      <Mono x={W / 2} y={botBayY - 9.5} size={3.8} anchor="middle">{`Uc ${uc}V~`}</Mono>
      <Mono x={W / 2} y={botBayY - 4} size={3.4} anchor="middle" muted>In 20kA Imax 40kA</Mono>
      {!healthy && (
        <Silk x={W / 2} y={cartY - 2} size={4} anchor="middle" bold fill="var(--danger)">REPLACE</Silk>
      )}

      <TermIds device={device} local size={4.6} side={(t) => (t.relY > 0.5 ? 'right' : t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
