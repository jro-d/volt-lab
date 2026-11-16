import React from 'react';
import { Bay, DeviceProps, Face, Housing, Led, Mono, Nameplate, Seams, Silk, SymCoil, SymNC, SymNO, Terminals, TermIds, act, deviceTag, momentaryPress } from './kit';

/**
 * 3-pole power contactor (AC-3) with a side-mounted 1NO+1NC auxiliary block.
 * State: the armature carrier moves down in its window when the coil pulls in, and the coil LED lights.
 * Hold the carrier window to close it by hand. X-RAY shows the magnet, coil and contact bridge.
 */
export const ContactorDevice: React.FC<DeviceProps> = (props) => {
  const { device, onToggleState, onPatchState } = props;
  const { width: W, height: H } = device;
  const coilOn = !!device.state.coilEnergized;
  const isClosed = coilOn || !!device.state.manualOverride;
  const isCutaway = !!device.state.cutaway;
  const amps = device.state.ratedAmps || 25;
  const uc = device.state.coilVoltage || 220;
  const uid = device.id.replace(/[^a-zA-Z0-9]/g, '');

  const manualHold = (e: React.MouseEvent) => {
    if (onPatchState) momentaryPress(e, device.id, 'manualOverride', onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, manualOverride: !device.state.manualOverride } });
    }
  };
  const toggleCutaway = () => {
    if (onPatchState) onPatchState(device.id, { cutaway: !isCutaway });
    else onToggleState?.({ ...device, state: { ...device.state, cutaway: !isCutaway } });
  };

  const mainW = W * 0.69;
  const auxX = mainW + 1.5;
  const auxW = W - auxX;
  const poleX = [31, 50.8, 70.7].map((v) => (v / 124) * W);
  const a1X = (9.9 / 124) * W;
  const tTop = H * (device.terminals[0]?.relY ?? 0.07);
  const bayH = 16;
  const topBayY = tTop - 7.8;
  const botBayY = H - tTop - 7.2;
  const faceY = topBayY + bayH + 1;
  const faceH = botBayY - 1 - faceY;
  const winX = mainW / 2 - 22;
  const winY = faceY + 20;
  const travel = isClosed ? 5 : 0;
  const mcx = mainW / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <defs>
        <clipPath id={`km-clip-${uid}`}>
          <rect x={4} y={faceY + 13} width={mainW - 8} height={faceH - 26} rx={2} />
        </clipPath>
      </defs>

      {/* ── Main body ── */}
      <Housing w={mainW} h={H} />
      <Bay x={3} y={topBayY} w={mainW - 6} h={bayH} />
      <Bay x={3} y={botBayY} w={mainW - 6} h={bayH} />
      <Seams xs={[(a1X + poleX[0]) / 2, (poleX[0] + poleX[1]) / 2, (poleX[1] + poleX[2]) / 2]} y1={topBayY} y2={topBayY + bayH} />
      <Seams xs={[(a1X + poleX[0]) / 2, (poleX[0] + poleX[1]) / 2, (poleX[1] + poleX[2]) / 2]} y1={botBayY} y2={botBayY + bayH} />
      <Face x={3} y={faceY} w={mainW - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 8} w={mainW - 6} h={8} tag={deviceTag(device) || 'KM'} text={`AC-3 ${amps}A`} />

      {!isCutaway ? (
        <g>
          {/* Armature carrier window: hold to close by hand */}
          <g onMouseDown={manualHold} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
            <title>Hold to push the armature in by hand (closes main + aux contacts)</title>
            <rect x={winX} y={winY} width={44} height={26} rx={2} fill="var(--mat-line)" />
            <g style={{ transform: `translateY(${travel}px)`, transition: 'transform 110ms ease-out' }}>
              <rect className="d-shade" x={winX + 4} y={winY + 2} width={36} height={16} rx={1.5} />
              <path className="d-seam" d={`M${winX + 8} ${winY + 6}h28M${winX + 8} ${winY + 9}h28M${winX + 8} ${winY + 12}h28`} />
              <rect x={mcx - 5} y={winY + 13.5} width={10} height={3.5} rx={0.8} fill={isClosed ? 'var(--flag-on)' : 'var(--flag-off)'} />
            </g>
            <Mono x={winX + 47} y={winY + 7} size={4.4} muted>I</Mono>
            <Mono x={winX + 47} y={winY + 23} size={4.4} muted>O</Mono>
          </g>
          <Led cx={mainW - 9} cy={faceY + 19} r={1.8} on={coilOn} color="green" />
          <Mono x={mainW - 9} y={faceY + 27} size={3.4} anchor="middle" muted>A1</Mono>

          {/* Ratings */}
          <Mono x={mcx} y={winY + 34} size={4.6} anchor="middle">{`${amps}A · 440V · ${device.state.motorKw || 11}kW`}</Mono>
          <Mono x={mcx} y={winY + 40} size={4} anchor="middle" muted>{`Uc ${uc}V~ 60Hz`}</Mono>

          {/* Printed schematic: coil + three main contacts, aligned under the terminals */}
          <g className="pointer-events-none">
            <SymCoil x={a1X} y={winY + 46} s={1.1} />
            {poleX.map((px) => (
              <SymNO key={px} x={px} y={winY + 46} s={1.1} />
            ))}
            <path className="d-sym" strokeDasharray="1.4 1.2" d={`M${a1X + 3.3} ${winY + 51.5}H${poleX[2] + 1.4}`} />
          </g>
          <Mono x={mcx} y={faceY + faceH - 10} size={3.4} anchor="middle" muted>IEC 60947-4-1</Mono>
        </g>
      ) : (
        /* ── X-ray cutaway ── */
        <g clipPath={`url(#km-clip-${uid})`} onMouseDown={manualHold} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
          <title>X-ray: hold to pull in the armature</title>
          <rect x={4} y={faceY + 13} width={mainW - 8} height={faceH - 26} fill="var(--console)" />
          {/* fixed contacts (copper) per pole */}
          {poleX.map((px) => (
            <g key={px}>
              <path d={`M${px} ${faceY + 13}V${faceY + 26}h-5M${px} ${faceY + faceH - 13}V${faceY + 42}h5`} fill="none" stroke="var(--mat-copper)" strokeWidth={1.6} />
              <rect x={px - 7} y={faceY + 27} width={4} height={2} fill="var(--mat-steel)" />
              <rect x={px + 3} y={faceY + 39} width={4} height={2} fill="var(--mat-steel)" />
            </g>
          ))}
          {/* moving bridge + carrier + armature */}
          <g style={{ transform: `translateY(${isClosed ? 6 : 0}px)`, transition: 'transform 110ms ease-out' }}>
            <rect x={10} y={faceY + 22} width={mainW - 20} height={3} rx={1} fill="var(--mat-housing-shade)" />
            {poleX.map((px) => (
              <rect key={px} x={px - 8} y={faceY + 25} width={16} height={2.4} rx={0.6} fill="var(--mat-copper)" />
            ))}
            <rect x={mcx - 1.5} y={faceY + 25} width={3} height={14} fill="var(--mat-steel)" />
            <rect x={mcx - 18} y={faceY + 39} width={36} height={6} rx={1} fill="var(--mat-steel-dark)" />
          </g>
          {/* fixed E-core and coil */}
          <path d={`M${mcx - 18} ${faceY + 52}h36v18h-36zM${mcx - 12} ${faceY + 52}v12M${mcx + 12} ${faceY + 52}v12`} fill="var(--mat-steel-dark)" stroke="var(--mat-steel)" strokeWidth={0.6} />
          {coilOn && <rect x={mcx - 14} y={faceY + 54} width={28} height={9} rx={2} fill="var(--lamp-glow)" />}
          <rect x={mcx - 11} y={faceY + 55} width={22} height={7} rx={1.2} fill={coilOn ? 'var(--mat-copper)' : 'var(--mat-copper-dark)'} />
          {Array.from({ length: 6 }).map((_, i) => (
            <path key={i} d={`M${mcx - 9 + i * 3.6} ${faceY + 55}v7`} stroke="var(--mat-copper-dark)" strokeWidth={0.5} />
          ))}
          <Mono x={mcx} y={faceY + 76} size={4} anchor="middle" fill="var(--console-ink)">
            {coilOn ? 'COIL ENERGIZED · PULLED IN' : isClosed ? 'HELD IN BY HAND' : 'SPRING OPEN'}
          </Mono>
        </g>
      )}

      {/* ── Auxiliary block 1NO + 1NC ── */}
      <Housing x={auxX} w={auxW} h={H} />
      <Bay x={auxX + 2.5} y={topBayY} w={auxW - 5} h={bayH} />
      <Bay x={auxX + 2.5} y={botBayY} w={auxW - 5} h={bayH} />
      <Seams xs={[auxX + auxW / 2]} y1={topBayY} y2={topBayY + bayH} />
      <Seams xs={[auxX + auxW / 2]} y1={botBayY} y2={botBayY + bayH} />
      <Face x={auxX + 2.5} y={faceY} w={auxW - 5} h={faceH} />
      <Nameplate x={auxX + 2.5} y={faceY + 8} w={auxW - 5} h={8} center="LADN11" size={4.4} />
      {[
        { cx: auxX + auxW * 0.27, nc: false, closed: isClosed, label: 'NO' },
        { cx: auxX + auxW * 0.73, nc: true, closed: !isClosed, label: 'NC' },
      ].map((c) => (
        <g key={c.label} className="pointer-events-none">
          <rect className="d-shade" x={c.cx - 6.5} y={winY} width={13} height={22} rx={1.5} />
          <path
            d={`M${c.cx} ${winY + 2.5}v5.5M${c.cx} ${winY + 14}v5.5M${c.cx} ${winY + 14}L${c.closed ? c.cx : c.cx + (c.nc ? -3.4 : 3.4)} ${winY + 8}`}
            fill="none"
            stroke={c.closed ? 'var(--ok)' : 'var(--silk)'}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          {c.nc && <path d={`M${c.cx} ${winY + 8}h-3.4`} stroke="var(--silk)" strokeWidth={0.8} />}
          <Mono x={c.cx} y={winY + 28} size={4} anchor="middle">{c.label}</Mono>
        </g>
      ))}
      <SymNO x={auxX + auxW * 0.27} y={winY + 34} s={0.9} />
      <SymNC x={auxX + auxW * 0.73} y={winY + 34} s={0.9} />
      <g {...act(toggleCutaway)}>
        <title>{isCutaway ? 'Show the front' : 'X-ray: show the coil, magnet and contacts'}</title>
        <rect x={auxX + 4} y={faceY + faceH - 17} width={auxW - 8} height={9} rx={4.5} fill={isCutaway ? 'var(--act-blue)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.7} />
        <Silk x={auxX + auxW / 2} y={faceY + faceH - 11} size={4.6} anchor="middle" bold fill={isCutaway ? 'var(--on-act)' : undefined}>
          {isCutaway ? 'FRONT' : 'X-RAY'}
        </Silk>
      </g>

      <TermIds device={device} local size={4.4} gap={2.6} />
      <Terminals {...props} local />
    </g>
  );
};
