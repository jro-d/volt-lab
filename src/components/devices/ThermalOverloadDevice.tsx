import React from 'react';
import { Bay, DeviceProps, Face, Housing, Mono, Nameplate, Seams, Silk, SymNC, SymNO, SymThermal, Terminals, TermIds, act, deviceTag, makePatch } from './kit';

const FLA_STEPS = [2.5, 4, 6, 10, 16];

/**
 * Thermal overload relay (bimetal, class 10) with 95-96 NC / 97-98 NO auxiliary contacts.
 * Click the FLA dial to set the trip current, STOP or TEST to trip, RESET to re-arm.
 */
export const ThermalOverloadDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const patch = makePatch(props);
  const tripped = !!device.state.tripped;
  const tripAmps = device.state.tripAmps || 6;
  const measuredAmps = device.state.measuredAmps || 0;
  const dialIdx = Math.max(0, FLA_STEPS.indexOf(tripAmps));
  const loadPct = Math.min(1.2, measuredAmps / tripAmps);

  const mainW = W * 0.69;
  const auxX = mainW + 1.5;
  const auxW = W - auxX;
  const poleX = [31, 50.8, 70.7].map((v) => (v / 124) * W);
  const tTop = H * (device.terminals[0]?.relY ?? 0.07);
  const bayH = 16;
  const topBayY = tTop - 7.8;
  const botBayY = H - tTop - 7.2;
  const faceY = topBayY + bayH + 1;
  const faceH = botBayY - 1 - faceY;
  const dial = { cx: 19, cy: faceY + 33, r: 11 };
  const angFor = (i: number) => -120 + (240 / (FLA_STEPS.length - 1)) * i;
  const ptr = ((angFor(dialIdx) - 90) * Math.PI) / 180;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* ── Main body (dark, mounts under the contactor) ── */}
      <Housing w={mainW} h={H} m="dark" />
      <Bay x={3} y={topBayY} w={mainW - 6} h={bayH} dark />
      <Bay x={3} y={botBayY} w={mainW - 6} h={bayH} dark />
      <Seams xs={[(poleX[0] + poleX[1]) / 2, (poleX[1] + poleX[2]) / 2]} y1={botBayY} y2={botBayY + bayH} />
      <Face x={3} y={faceY} w={mainW - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 6} w={mainW - 6} h={8} tag={deviceTag(device) || 'F'} text={`LRD ${tripAmps}A`} />

      {/* FLA dial */}
      <g {...act(() => patch({ tripAmps: FLA_STEPS[(dialIdx + 1) % FLA_STEPS.length] }))}>
        <title>{`FLA setting ${tripAmps} A: click to step (2.5 / 4 / 6 / 10 / 16 A)`}</title>
        <circle cx={dial.cx} cy={dial.cy} r={dial.r + 2.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
        {FLA_STEPS.map((v, i) => {
          const a = ((angFor(i) - 90) * Math.PI) / 180;
          return (
            <g key={v}>
              <path d={`M${dial.cx + Math.cos(a) * (dial.r - 1)} ${dial.cy + Math.sin(a) * (dial.r - 1)}L${dial.cx + Math.cos(a) * (dial.r + 1.5)} ${dial.cy + Math.sin(a) * (dial.r + 1.5)}`} stroke="var(--silk)" strokeWidth={0.6} />
            </g>
          );
        })}
        <circle cx={dial.cx} cy={dial.cy} r={dial.r - 2} fill="var(--act-blue)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <path d={`M${dial.cx} ${dial.cy}L${dial.cx + Math.cos(ptr) * (dial.r - 3)} ${dial.cy + Math.sin(ptr) * (dial.r - 3)}`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
        <path d={`M${dial.cx - 4} ${dial.cy}h8`} stroke="var(--mat-line)" strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
        <Mono x={dial.cx} y={dial.cy + dial.r + 8} size={4.6} anchor="middle">{`${tripAmps} A`}</Mono>
      </g>

      {/* Trip indicator window */}
      <rect x={38} y={faceY + 21} width={18} height={9} rx={1.2} fill="var(--mat-line)" />
      <rect x={39} y={faceY + 22} width={16} height={7} rx={0.8} fill={tripped ? 'var(--flag-trip)' : 'var(--mat-housing-shade)'} />
      <Mono x={47} y={faceY + 27.3} size={4} anchor="middle" fill={tripped ? 'var(--mat-line)' : 'var(--silk-muted)'}>{tripped ? 'TRIP' : 'O.K.'}</Mono>

      {/* STOP (red) + RESET (blue) */}
      <g {...act(() => patch({ tripped: !tripped }))}>
        <title>STOP: trip the relay by hand (opens 95-96, closes 97-98)</title>
        <rect x={38} y={faceY + 35} width={9} height={9} rx={1.5} fill="var(--act-red)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <Silk x={42.5} y={faceY + 49} size={3.8} anchor="middle" muted>STOP</Silk>
      </g>
      <g {...act(() => tripped && patch({ tripped: false }))}>
        <title>RESET: re-arm after the bimetal cools</title>
        <circle cx={58} cy={faceY + 39.5} r={5} fill="var(--act-blue)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <Silk x={58} y={faceY + 41.4} size={4.4} anchor="middle" bold fill="var(--on-act)">R</Silk>
        <Silk x={58} y={faceY + 49} size={3.8} anchor="middle" muted>RESET</Silk>
      </g>
      {/* TEST slot */}
      <g {...act(() => patch({ tripped: !tripped }))}>
        <title>TEST: simulate a thermal overload trip</title>
        <rect x={mainW - 15} y={faceY + 21} width={9} height={5} rx={1} fill="var(--act-red)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <Silk x={mainW - 10.5} y={faceY + 31} size={3.6} anchor="middle" muted>TEST</Silk>
      </g>

      {/* Load bar: measured current vs setting */}
      <rect x={38} y={faceY + 53} width={mainW - 44} height={3} rx={1.5} fill="var(--mat-housing-shade)" />
      <rect x={38} y={faceY + 53} width={(mainW - 44) * Math.min(1, loadPct)} height={3} rx={1.5} fill={loadPct > 1 ? 'var(--danger)' : loadPct > 0.85 ? 'var(--warning-fill)' : 'var(--ok)'} />
      <Mono x={38} y={faceY + 61.5} size={3.8} muted>{measuredAmps > 0 ? `I ${measuredAmps.toFixed(1)} A` : 'I — A'}</Mono>

      {/* Printed symbol: three thermal elements under the load terminals */}
      {poleX.map((px) => (
        <SymThermal key={px} x={px} y={faceY + 66} s={1} />
      ))}
      <path className="d-sym" strokeDasharray="1.2 1" d={`M${poleX[0] + 2} ${faceY + 71}H${poleX[2] + 2}`} />
      <Mono x={mainW / 2} y={faceY + 81} size={3.4} anchor="middle" muted>CLASS 10A · IEC 60947-4-1</Mono>

      {/* ── Aux contacts 95-96 NC / 97-98 NO ── */}
      <Housing x={auxX} w={auxW} h={H} m="dark" />
      <Bay x={auxX + 2.5} y={topBayY} w={auxW - 5} h={bayH} dark />
      <Bay x={auxX + 2.5} y={botBayY} w={auxW - 5} h={bayH} dark />
      <Face x={auxX + 2.5} y={faceY} w={auxW - 5} h={faceH} />
      <Nameplate x={auxX + 2.5} y={faceY + 6} w={auxW - 5} h={8} center="AUX" size={4.4} />
      {[
        { cx: auxX + auxW * 0.27, nc: true, closed: !tripped, label: '95-96' },
        { cx: auxX + auxW * 0.73, nc: false, closed: tripped, label: '97-98' },
      ].map((c) => (
        <g key={c.label} className="pointer-events-none">
          <rect className="d-shade" x={c.cx - 6.5} y={faceY + 20} width={13} height={22} rx={1.5} />
          <path
            d={`M${c.cx} ${faceY + 22.5}v5.5M${c.cx} ${faceY + 34}v5.5M${c.cx} ${faceY + 34}L${c.closed ? c.cx : c.cx + (c.nc ? -3.4 : 3.4)} ${faceY + 28}`}
            fill="none"
            stroke={c.closed ? 'var(--ok)' : 'var(--silk)'}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <Mono x={c.cx} y={faceY + 48} size={3.8} anchor="middle">{c.label}</Mono>
        </g>
      ))}
      <SymNC x={auxX + auxW * 0.27} y={faceY + 55} s={0.9} />
      <SymNO x={auxX + auxW * 0.73} y={faceY + 55} s={0.9} />

      <TermIds device={device} local size={4.4} gap={2.6} onDark={false} />
      <Terminals {...props} local />
    </g>
  );
};
