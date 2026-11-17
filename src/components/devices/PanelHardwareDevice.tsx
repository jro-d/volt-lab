import React from 'react';
import { Bay, DeviceProps, Face, Housing, Led, Mono, Nameplate, Pill, Silk, Strap, Terminals, TermIds, act, deviceTag, makePatch } from './kit';

/** 96 mm panel meter and the ATS changeover. */
export const PanelHardwareDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);

  /* ───────────── 96 mm panel meter ───────────── */
  if (type === 'panel_meter') {
    const volts = typeof state.volts === 'number' ? state.volts : 0;
    const amps = typeof state.amps === 'number' ? state.amps : 0;
    const hz = typeof state.hz === 'number' ? state.hz : 60;
    const live = volts > 1;
    const rows: [string, string][] = [
      [live ? volts.toFixed(1) : '---.-', 'V'],
      [live ? amps.toFixed(2) : '-.--', 'A'],
      [live ? hz.toFixed(1) : '--.-', 'Hz'],
    ];
    const tTop = H * (device.terminals[0]?.relY ?? 0.1);
    const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.9);
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <Housing w={W} h={H} m="dark" rx={3} />
        <Bay x={3} y={tTop - 8} w={W * 0.55} h={16} dark />
        <Bay x={W * 0.45} y={botTy - 8} w={W * 0.55 - 3} h={16} dark />
        {/* bezel + display */}
        <rect className="d-dark-face" x={8} y={tTop + 11} width={W - 16} height={botTy - tTop - 22} rx={2} />
        <rect x={13} y={tTop + 15} width={W - 26} height={botTy - tTop - 40} rx={1.5} fill="var(--console)" />
        {rows.map(([v, u], i) => (
          <g key={u}>
            <Mono x={W - 30} y={tTop + 27 + i * 13} size={10} anchor="end" fill={live ? 'var(--led-display)' : 'var(--console-muted)'}>{v}</Mono>
            <Mono x={W - 27} y={tTop + 27 + i * 13} size={4.4} fill="var(--console-muted)">{u}</Mono>
          </g>
        ))}
        <Silk x={14} y={botTy - 15} size={4.4} bold onDark>{`${deviceTag(device) || 'P'} · PM96`}</Silk>
        <Led cx={W - 16} cy={botTy - 16.5} r={1.6} on={live} color="green" />
        <TermIds device={device} local size={3.6} onDark side={(t) => (t.relY < 0.5 ? 'below' : 'above')} gap={0.5} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── ATS changeover ───────────── */
  const isNormal = state.source !== 'generator';
  const autoMode = state.autoMode !== false;
  const amps = state.ampsRating || 63;
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.92);
  const topBayY = tTop - 8;
  const botBayY = botTy - 8;
  const faceY = topBayY + 19;
  const faceH = botBayY - 2 - faceY;
  const cx = W / 2;
  const pt = (id: string) => {
    const t = device.terminals.find((x) => x.id === id);
    return { x: W * (t?.relX ?? 0), y: H * (t?.relY ?? 0) };
  };
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" rx={4} />
      <Bay x={3} y={topBayY} w={cx - 5} h={16} />
      <Bay x={cx + 2} y={topBayY} w={cx - 5} h={16} />
      <Bay x={W * 0.25} y={botBayY} w={W * 0.5} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={deviceTag(device) || 'Q'} center="ATS 2P" text={`${amps}A`} size={5} />
      {/* source lamps */}
      <Led cx={pt('norm_l').x + 12} cy={faceY + 19} r={2.4} on={isNormal} color="green" />
      <Silk x={pt('norm_l').x + 12} y={faceY + 28} size={4.4} anchor="middle" bold={isNormal} muted={!isNormal}>I · GRID</Silk>
      <Led cx={pt('gen_l').x + 12} cy={faceY + 19} r={2.4} on={!isNormal} color="amber" />
      <Silk x={pt('gen_l').x + 12} y={faceY + 28} size={4.4} anchor="middle" bold={!isNormal} muted={isNormal}>II · GEN</Silk>
      {/* mechanical position indicator I – 0 – II with handle */}
      <g {...act(() => patch({ source: isNormal ? 'generator' : 'normal' }))}>
        <title>Click to transfer between GRID (I) and GEN (II)</title>
        <rect className="d-shade" x={cx - 34} y={faceY + 34} width={68} height={22} rx={3} />
        <Mono x={cx - 26} y={faceY + 47} size={5} anchor="middle" muted={!isNormal}>I</Mono>
        <Mono x={cx} y={faceY + 47} size={5} anchor="middle" muted>0</Mono>
        <Mono x={cx + 26} y={faceY + 47} size={5} anchor="middle" muted={isNormal}>II</Mono>
        <g style={{ transform: `translateX(${isNormal ? -15 : 15}px)`, transition: 'transform 160ms ease-out' }}>
          <rect x={cx - 7} y={faceY + 36} width={14} height={18} rx={2} fill="var(--act-black)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <path d={`M${cx - 3.5} ${faceY + 41}h7M${cx - 3.5} ${faceY + 45}h7M${cx - 3.5} ${faceY + 49}h7`} stroke="var(--silk-on-dark)" strokeWidth={0.6} opacity={0.6} />
        </g>
      </g>
      {/* internal changeover diagram */}
      <g className="pointer-events-none">
        <Strap d={`M${pt('norm_l').x} ${faceY + 64}V${faceY + 72}M${pt('gen_l').x} ${faceY + 64}V${faceY + 72}`} live />
        <Strap d={`M${pt('load_l').x} ${faceY + faceH - 6}V${faceY + 86}L${isNormal ? pt('norm_l').x + 4 : pt('gen_l').x - 4} ${faceY + 73}`} live w={2} />
        <circle cx={pt('norm_l').x} cy={faceY + 73} r={1.5} fill="var(--mat-steel)" />
        <circle cx={pt('gen_l').x} cy={faceY + 73} r={1.5} fill="var(--mat-steel)" />
      </g>
      <Pill cx={W - 22} cy={faceY + faceH - 8} w={26} label={autoMode ? 'AUTO' : 'MANUAL'} active={autoMode} title="Toggle automatic transfer on generator start / grid return" onToggle={() => patch({ autoMode: !autoMode })} />
      <TermIds device={device} local size={3.8} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} text={(t) => (t.label || t.id).replace('LOAD ', 'LD-')} />
      <Terminals {...props} local />
    </g>
  );
};
