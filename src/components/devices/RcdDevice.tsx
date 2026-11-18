import React from 'react';
import {
  Bay, DeviceProps, SymNO, DinClip, Face, Flag, Housing, Lever, Mono, Nameplate, Seams, Silk, Terminals, TermIds, click, deviceTag,
} from './kit';

/**
 * RCCB 2P (residual-current circuit breaker) and RCBO 1P+N (breaker + RCD). Lever + flag window show state; the yellow T button
 * simulates an earth-leakage trip at the rated IΔn.
 */
export const RcdDevice: React.FC<DeviceProps> = (props) => {
  const { device, onToggleState } = props;
  const { width: W, height: H } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 40;
  const isRcbo = device.type === 'rcbo_1pn';
  const sensitivityMa = (isRcbo ? device.state.leakageMa : device.state.sensitivityMa) || 30;
  const curve = device.state.tripCurve || 'C';

  const toggle = () => {
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    onToggleState?.(device);
  };
  const testTrip = () => {
    device.state.tripped = true;
    device.state.closed = false;
    device.state.tripReason = `Test Button: ${sensitivityMa}mA Simulated Earth Leakage Trip`;
    onToggleState?.(device);
  };

  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const bayH = tTop * 2 - 1.5;
  const botBayY = H - 2 - bayH;
  const faceY = 2 + bayH + 2;
  const faceH = botBayY - 2 - faceY;
  const lx = W * (device.terminals.find((t) => t.id === 'in_l')?.relX ?? 0.35);
  const nx = W * (device.terminals.find((t) => t.id === 'in_n')?.relX ?? 0.65);
  const slotY = faceY + 11;
  const slotH = 24;
  const pos = isTripped ? 0.5 : isClosed ? 0 : 1;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={W / 2} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={2} w={W - 6} h={bayH} />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} />
      <Seams xs={[W / 2]} y1={2} y2={2 + bayH} />
      <Seams xs={[W / 2]} y1={botBayY} y2={H - 2} />

      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY} w={W - 6} tag={deviceTag(device)} text={isRcbo ? `RCBO ${curve}${ratedAmps}` : `RCCB ${ratedAmps}A`} />

      {/* Lever pair (L + N) with tie bar */}
      <g onClick={click(toggle)} className="cursor-pointer">
        <title>{isTripped ? 'Tripped: click the lever to reset' : `Click the lever to switch ${isClosed ? 'OFF' : 'ON'}`}</title>
        <Lever cx={lx} y={slotY} slotH={slotH} w={14} pos={pos} />
        <Lever cx={nx} y={slotY} slotH={slotH} w={14} pos={pos} />
        <rect x={lx} y={slotY + 2 + (slotH - 13) * pos + 3} width={nx - lx} height={3} rx={1} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={0.6} />
      </g>
      <Flag cx={W / 2} y={slotY + slotH + 3} state={isTripped ? 'trip' : isClosed ? 'on' : 'off'} />

      {/* Test button */}
      <g onClick={click(testTrip)} className="cursor-pointer">
        <title>Test: simulate a {sensitivityMa} mA earth-leakage trip</title>
        <rect x={W - 19} y={slotY + 1} width={12} height={12} rx={2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <circle cx={W - 13} cy={slotY + 7} r={4.4} fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <Mono x={W - 13} y={slotY + 8.8} size={5} anchor="middle" fill="var(--mat-line)">T</Mono>
        <Silk x={W - 13} y={slotY + 18.5} size={3.8} anchor="middle" muted>TEST</Silk>
      </g>

      {/* RCD symbol (IEC 60617): two switching contacts, mechanical link, toroid around both conductors */}
      <SymNO x={12} y={slotY + slotH + 12} />
      <SymNO x={20} y={slotY + slotH + 12} />
      <path className="d-sym" strokeDasharray="1.2 1" d={`M13.4 ${slotY + slotH + 17}H21.4`} />
      <ellipse className="d-sym" cx={16} cy={slotY + slotH + 25.5} rx={6.5} ry={1.8} />
      <path className="d-sym" d={`M12 ${slotY + slotH + 22}v7M20 ${slotY + slotH + 22}v7`} />
      <Silk x={W - 8} y={slotY + slotH + 16} size={5.4} anchor="end" bold>{`IΔn ${sensitivityMa} mA`}</Silk>
      <Silk x={W - 8} y={slotY + slotH + 22.5} size={4.4} anchor="end" muted>230V~ Type AC</Silk>
      {/* Type AC waveform mark */}
      <path className="d-sym" d={`M${W - 50} ${slotY + slotH + 29}q2 -3.4 4 0t4 0`} />
      <Mono x={W - 8} y={slotY + slotH + 30.5} size={3.6} anchor="end" muted>{isRcbo ? 'IEC 61009-1' : 'IEC 61008'}</Mono>

      <TermIds device={device} local size={4.8} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
