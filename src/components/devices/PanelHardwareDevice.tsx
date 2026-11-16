import React from 'react';
import { Bay, DeviceProps, Face, Housing, Led, Mono, Nameplate, Pill, Screw, Silk, Strap, SymEarth, Terminals, TermIds, act, deviceTag, makePatch } from './kit';

/** Panelboard enclosure (back pan + DIN rails + N / PE bars), 96 mm panel meter, and the ATS. */
export const PanelHardwareDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);

  /* ───────────── Panelboard (open, devices mount on the rails) ───────────── */
  if (type === 'panelboard_frame') {
    const label = state.label || 'LP-1 (230V 1Φ)';
    const nT = device.terminals.find((t) => t.id === 'n_bus');
    const peT = device.terminals.find((t) => t.id === 'pe_bus');
    const barY = H * (nT?.relY ?? 0.88);
    const rail = (ry: number) => (
      <g key={ry} className="pointer-events-none">
        <rect className="d-steel" x={22} y={ry - 9} width={W - 44} height={18} rx={1.5} />
        <rect x={22} y={ry - 5} width={W - 44} height={10} fill="var(--mat-steel)" stroke="var(--mat-steel-dark)" strokeWidth={0.5} />
        {Array.from({ length: Math.floor((W - 60) / 24) }).map((_, i) => (
          <rect key={i} x={32 + i * 24} y={ry - 1.6} width={12} height={3.2} rx={1.6} fill="var(--mat-steel-dark)" />
        ))}
      </g>
    );
    const bar = (cx: number, isEarth: boolean) => (
      <g className="pointer-events-none">
        <rect x={cx - 40} y={barY - 13} width={80} height={26} rx={3} fill={isEarth ? 'var(--cond-green)' : 'var(--cond-blue)'} stroke="var(--mat-line)" strokeWidth={1} />
        <rect x={cx - 34} y={barY - 4} width={68} height={8} rx={1.5} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={0.6} />
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={i} cx={cx - 28 + i * 11.2} cy={barY} r={1.8} fill="var(--mat-copper-dark)" />
        ))}
        <Mono x={cx + (isEarth ? -20 : 20)} y={barY - 6} size={5} anchor="middle" onDark>{isEarth ? 'PE' : 'N'}</Mono>
      </g>
    );
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        {/* enclosure flange + back pan */}
        <rect className="d-steel" x={0} y={0} width={W} height={H} rx={5} />
        <rect x={10} y={10} width={W - 20} height={H - 20} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
        {[[6, 6], [W - 6, 6], [6, H - 6], [W - 6, H - 6]].map(([sx, sy], i) => <Screw key={i} cx={sx} cy={sy} r={2} />)}
        {/* top knockouts */}
        {[0.25, 0.4, 0.6, 0.75].map((r) => (
          <circle key={r} cx={W * r} cy={5} r={3.2} fill="var(--mat-steel)" stroke="var(--mat-steel-dark)" strokeWidth={0.7} />
        ))}
        <Nameplate x={W / 2 - 80} y={14} w={160} h={14} tag={deviceTag(device) || 'DB'} center={label} size={6.4} />
        {rail(H * 0.36)}
        {rail(H * 0.6)}
        {bar(W * (nT?.relX ?? 0.14), false)}
        {bar(W * (peT?.relX ?? 0.86), true)}
        <SymEarth x={W * (peT?.relX ?? 0.86) + 30} y={barY - 22} s={0.6} />
        {/* circuit directory card */}
        <rect className="d-housing" x={W / 2 - 52} y={barY - 18} width={104} height={30} rx={1.5} />
        <Silk x={W / 2} y={barY - 11} size={4.6} anchor="middle" bold>CIRCUIT DIRECTORY</Silk>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${W / 2 - 46} ${barY - 5 + i * 5.5}H${W / 2 + 46}`} stroke="var(--mat-housing-shade)" strokeWidth={0.6} />
        ))}
        <Terminals {...props} local />
      </g>
    );
  }

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
