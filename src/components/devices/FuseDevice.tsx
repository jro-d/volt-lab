import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Lever, Led, Mono, Nameplate, Seams, Silk,
  Terminals, TermIds, act, click, deviceTag, makePatch,
} from './kit';

const PHASES = ['l1', 'l2', 'l3'] as const;

/**
 * Fuse devices (IEC 60269-1 holder, IEC 60947-3 fuse switch disconnector).
 * Each link has an indicator window: green while intact, red once blown. Click a blown link to replace it.
 * The 3-pole unit also has a handle that isolates the load.
 */
export const FuseDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const tag = deviceTag(device);
  const kind = String(state.fuseKind || 'gG');
  const rated = Number(state.ratedAmps) || (device.type === 'fuse_holder_1p' ? 16 : 32);
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const bayH = tTop * 2 - 1.5;
  const botBayY = H - 2 - bayH;
  const faceY = 2 + bayH + 2;
  const faceH = botBayY - 2 - faceY;

  /* ───────────── 1-pole holder ───────────── */
  if (device.type === 'fuse_holder_1p') {
    const blown = !!state.blown || !!state.tripped;
    const heat = Math.min(1, Number(state.heat) || 0);
    const replace = () => patch({ blown: false, tripped: false, closed: true, heat: 0, onSec: 0, tripReason: undefined });
    const cx = W / 2;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <DinClip cx={cx} y={H} />
        <Housing w={W} h={H} m="light" />
        <Bay x={3} y={2} w={W - 6} h={bayH} />
        <Bay x={3} y={botBayY} w={W - 6} h={bayH} />
        <Face x={3} y={faceY} w={W - 6} h={faceH} />
        <Nameplate x={3} y={faceY} w={W - 6} h={8} tag={tag} text={`${kind}${rated}`} size={4.8} />
        {/* carrier with the cylindrical link; click a blown link to replace it */}
        <g onClick={click(blown ? replace : () => undefined)} className={blown ? 'cursor-pointer' : undefined}>
          <title>{blown ? 'Blown: click to replace the fuse link' : `${kind} ${rated} A link (intact)`}</title>
          <rect x={7} y={faceY + 11} width={W - 14} height={34} rx={6} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <rect x={cx - 6} y={faceY + 15} width={12} height={26} rx={2.2} fill={blown ? 'var(--act-red)' : 'var(--mat-steel)'} stroke="var(--mat-line)" strokeWidth={0.7} />
          <rect x={cx - 6} y={faceY + 15} width={12} height={4} rx={1.5} fill="var(--mat-brass)" />
          <rect x={cx - 6} y={faceY + 37} width={12} height={4} rx={1.5} fill="var(--mat-brass)" />
          {blown && <path d={`M${cx - 4} ${faceY + 24}l3 4l-3 4l6 -3l-2 -5z`} fill="var(--surface)" opacity={0.9} />}
        </g>
        <Led cx={cx - 8} cy={faceY + 52} r={2.2} on={!blown} color="green" />
        <Led cx={cx + 8} cy={faceY + 52} r={2.2} on={blown} color="red" />
        <Mono x={cx} y={faceY + 61} size={3.8} anchor="middle" muted>{blown ? 'BLOWN' : `${kind} ${rated}A`}</Mono>
        {/* thermal state of the link */}
        <rect x={6} y={faceY + faceH - 4.5} width={W - 12} height={2.6} rx={1.2} fill="var(--mat-line-soft)" />
        {heat > 0 && <rect x={6} y={faceY + faceH - 4.5} width={(W - 12) * heat} height={2.6} rx={1.2} fill="var(--act-red)" />}
        <TermIds device={device} local size={4.2} gap={2} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── 3-pole fuse switch disconnector ───────────── */
  const closed = state.closed !== false;
  const pw = (W - 6) / 3;
  const poleCx = (i: number) => 3 + pw * i + pw / 2;
  const blownOf = (p: (typeof PHASES)[number]) => !!state[`blown_${p}`];
  const replaceLink = (p: (typeof PHASES)[number]) => patch({ [`blown_${p}`]: false, [`heat_${p}`]: 0, [`onSec_${p}`]: 0 });
  const handleY = faceY + 12;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" />
      <Bay x={3} y={2} w={W - 6} h={bayH} />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} />
      <Seams xs={[3 + pw, 3 + pw * 2]} y1={2} y2={H - 2} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY} w={W - 6} h={8} tag={tag} text={`${kind}${rated} 3P`} size={5} />
      {/* handle: click to open / close the isolator */}
      <g {...act(() => patch({ closed: !closed }))}>
        <title>{closed ? 'Handle closed: click to open (isolate)' : 'Handle open: click to close'}</title>
        <Lever cx={W / 2} y={handleY} slotH={22} w={34} pos={closed ? 0 : 1} color="var(--act-red)" />
        <Silk x={8} y={handleY + 8} size={3.8} muted>I</Silk>
        <Silk x={8} y={handleY + 20} size={3.8} muted>O</Silk>
      </g>
      {/* three links */}
      {PHASES.map((p, i) => {
        const blown = blownOf(p);
        const heat = Math.min(1, Number(state[`heat_${p}`]) || 0);
        const cx = poleCx(i);
        const y0 = handleY + 30;
        return (
          <g key={p} onClick={click(blown ? () => replaceLink(p) : () => undefined)} className={blown ? 'cursor-pointer' : undefined}>
            <title>{blown ? `Link ${p.toUpperCase()} blown: click to replace` : `Link ${p.toUpperCase()} ${kind} ${rated} A (intact)`}</title>
            <rect x={cx - 7} y={y0} width={14} height={faceH - 56} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
            <rect x={cx - 4.5} y={y0 + 3} width={9} height={Math.max(8, faceH - 62)} rx={2} fill={blown ? 'var(--act-red)' : 'var(--mat-steel)'} stroke="var(--mat-line)" strokeWidth={0.6} />
            <Led cx={cx} cy={y0 + faceH - 56 + 6} r={2} on={!blown} color={blown ? 'red' : 'green'} />
            <rect x={cx - 8} y={y0 + faceH - 56 + 12} width={16} height={2.2} rx={1} fill="var(--mat-line-soft)" />
            {heat > 0 && <rect x={cx - 8} y={y0 + faceH - 56 + 12} width={16 * heat} height={2.2} rx={1} fill="var(--act-red)" />}
          </g>
        );
      })}
      <TermIds device={device} local size={4} gap={2} />
      <Terminals {...props} local />
    </g>
  );
};
