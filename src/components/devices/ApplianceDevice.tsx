import React from 'react';
import { Bay, DeviceProps, Led, Mono, Silk, Terminals, TermIds, act, makePatch } from './kit';

/** Household loads: LED TV, instant water heater (with ELCB test), stand fan and split-type AC. */
export const ApplianceDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type } = device;
  const patch = makePatch(props);
  const on = !!device.state.powered;
  const hasFault = !!device.state.hasEarthFault;
  const watts = device.state.wattage || 0;
  const cx = W / 2;
  const botTy = H * (device.terminals[0]?.relY ?? 0.9);

  /* ───────────── LED TV ───────────── */
  if (type === 'appliance_tv') {
    const scrH = H - 24;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        {/* stand */}
        <path d={`M${cx - 6} ${scrH}l-14 ${H - scrH - 5}h40l-14 ${-(H - scrH - 5)}z`} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <rect x={cx - 24} y={H - 6} width={48} height={4} rx={2} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.8} />
        {/* bezel + panel */}
        <rect className="d-dark" x={0} y={0} width={W} height={scrH} rx={3} />
        <rect x={3} y={3} width={W - 6} height={scrH - 8} rx={1.5} fill={on ? 'var(--lamp-blue-off)' : 'var(--mat-line)'} />
        {on && (
          <g className="pointer-events-none">
            <path d={`M3 ${scrH - 12}l18 -12l12 8l16 -14l14 10l14 -6V${scrH - 5}H3z`} fill="var(--lamp-blue-on)" opacity={0.55} />
            <circle cx={W - 16} cy={12} r={5} fill="var(--lamp-white-on)" opacity={0.8} />
          </g>
        )}
        {!on && <Mono x={cx} y={scrH / 2 + 6} size={4.4} anchor="middle" fill="var(--mat-line-soft)">STANDBY</Mono>}
        <Led cx={cx} cy={scrH - 2.5} r={1} on color={on ? 'white' : 'red'} ring={false} />
        <Mono x={W - 5} y={scrH - 1.4} size={3} anchor="end" fill="var(--silk-on-dark)">{`${watts || 120}W`}</Mono>
        {/* rear inlet pocket for the plug terminal */}
        <rect className="d-dark-face" x={cx - 9} y={H * (device.terminals[0]?.relY ?? 0.2) - 8} width={18} height={16} rx={2.5} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── Stand fan ───────────── */
  if (type === 'appliance_fan') {
    const speed = device.state.speed || 2;
    const cy = 34;
    const R = 30;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        {/* pole + base */}
        <rect className="d-steel" x={cx - 2.5} y={cy + R - 2} width={5} height={botTy - cy - R - 6} />
        <rect className="d-dark" x={6} y={botTy - 10} width={W - 12} height={H - botTy + 8} rx={4} />
        {/* guard */}
        <circle cx={cx} cy={cy} r={R} fill="var(--mat-housing)" fillOpacity={0.4} stroke="var(--mat-steel-dark)" strokeWidth={1.4} />
        {[0.5, 0.75].map((f) => <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke="var(--mat-steel)" strokeWidth={0.6} />)}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <path key={i} d={`M${cx + Math.cos(a) * 6} ${cy + Math.sin(a) * 6}L${cx + Math.cos(a) * R} ${cy + Math.sin(a) * R}`} stroke="var(--mat-steel)" strokeWidth={0.5} />;
        })}
        {/* blades */}
        <g className={on ? 'animate-spin' : undefined} style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `${1.2 / speed}s` }}>
          {[0, 120, 240].map((r) => (
            <path key={r} d={`M${cx} ${cy}c6 -8 16 -14 4 -${R - 6}c-9 4 -9 14 -4 ${R - 6}z`} fill="var(--lamp-blue-on)" fillOpacity={0.75} stroke="var(--lamp-blue-off)" strokeWidth={0.7} transform={`rotate(${r} ${cx} ${cy})`} />
          ))}
        </g>
        <circle cx={cx} cy={cy} r={6} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <Mono x={cx} y={cy + 1.4} size={3.6} anchor="middle" onDark>{on ? speed : 'OFF'}</Mono>
        {/* speed keys on the base */}
        {[1, 2, 3].map((s) => (
          <g key={s} {...act(() => patch({ speed: s }))}>
            <title>{`Speed ${s}`}</title>
            <rect x={cx - 16 + (s - 1) * 11} y={botTy - 22} width={10} height={7} rx={1.5} fill={speed === s ? 'var(--act-blue)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.6} />
            <Mono x={cx - 11 + (s - 1) * 11} y={botTy - 16.8} size={4} anchor="middle" fill={speed === s ? 'var(--on-act)' : undefined}>{s}</Mono>
          </g>
        ))}
        <Bay x={9} y={botTy - 8} w={W - 18} h={16} dark />
        <TermIds device={device} local size={3.6} onDark side={() => 'above'} gap={-1.6} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── Split-type AC indoor unit ───────────── */
  if (type === 'appliance_ac') {
    const temp = device.state.setTemp || 16;
    const bodyH = botTy - 12;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <rect className="d-housing" x={0} y={0} width={W} height={bodyH} rx={8} />
        <path d={`M8 6H${W - 8}`} stroke="var(--mat-housing-shade)" strokeWidth={1} />
        {Array.from({ length: 5 }).map((_, i) => (
          <path key={i} d={`M10 ${8 + i * 2.6}H${W - 10}`} stroke="var(--mat-line-soft)" strokeWidth={0.5} />
        ))}
        {/* display */}
        <rect x={cx - 15} y={bodyH * 0.42} width={30} height={12} rx={2} fill="var(--console)" />
        <Mono x={cx + 6} y={bodyH * 0.42 + 9.2} size={8} anchor="end" fill={on ? 'var(--console-readout)' : 'var(--console-muted)'}>{on ? temp : '--'}</Mono>
        <Mono x={cx + 8} y={bodyH * 0.42 + 9.2} size={3.8} fill="var(--console-muted)">°C</Mono>
        <Led cx={cx + 22} cy={bodyH * 0.42 + 6} r={1.3} on={on} color="green" ring={false} />
        <Silk x={10} y={bodyH * 0.42 + 9} size={4.4} bold muted>INVERTER</Silk>
        {/* louvre (open when running) */}
        <rect x={10} y={bodyH - 9} width={W - 20} height={on ? 6 : 3} rx={1.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.6} />
        {on && [0, 1, 2].map((i) => <path key={i} d={`M${W * (0.3 + i * 0.2)} ${bodyH + 1}q-3 4 0 8`} fill="none" stroke="var(--lamp-blue-on)" strokeWidth={0.8} opacity={0.7} />)}
        <Mono x={W - 10} y={bodyH * 0.42 + 9} size={3.6} anchor="end" muted>{`${((watts || 1200) / 1000).toFixed(1)}kW`}</Mono>
        <Bay x={W * 0.18} y={botTy - 8} w={W * 0.64} h={16} />
        <TermIds device={device} local size={3.8} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── Instant water heater ───────────── */
  const kw = ((watts || 3500) / 1000).toFixed(1);
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <rect className="d-housing" x={0} y={0} width={W} height={H} rx={8} />
      <rect className="d-nameplate" x={10} y={7} width={W - 20} height={10} rx={2} />
      <Silk x={cx} y={14} size={5} anchor="middle" bold onDark>{`HEATER ${kw}kW`}</Silk>
      {/* temperature knob */}
      <circle cx={cx} cy={42} r={15} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
      <circle cx={cx} cy={42} r={11} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1} />
      <path d={`M${cx} 33v6`} stroke="var(--act-red)" strokeWidth={2} strokeLinecap="round" />
      <path d={`M${cx - 17} 52a19 19 0 0 1 0 -20`} fill="none" stroke="var(--act-blue)" strokeWidth={1.4} />
      <path d={`M${cx + 17} 32a19 19 0 0 1 0 20`} fill="none" stroke="var(--act-red)" strokeWidth={1.4} />
      {/* heating LED + built-in ELCB */}
      <Led cx={14} cy={70} r={2.2} on={on && !hasFault} color="red" />
      <Silk x={19} y={71.6} size={4.4} muted>HEAT</Silk>
      <rect className="d-shade" x={W - 45} y={63} width={38} height={14} rx={2} />
      <g {...act(() => patch({ hasEarthFault: !hasFault }))}>
        <title>{hasFault ? 'Clear the simulated earth fault' : 'TEST: simulate an earth fault on the heating element'}</title>
        <rect x={W - 43} y={65} width={34} height={10} rx={1.5} fill={hasFault ? 'var(--danger)' : 'var(--mat-housing)'} stroke="var(--mat-line)" strokeWidth={0.7} />
        <Mono x={W - 26} y={71.6} size={4.2} anchor="middle" fill={hasFault ? 'var(--surface)' : undefined}>{hasFault ? 'FAULT' : 'ELCB TEST'}</Mono>
      </g>
      {/* water pipes */}
      {[W * 0.3, W * 0.7].map((px, i) => (
        <g key={px} className="pointer-events-none">
          <rect className="d-steel" x={px - 3} y={82} width={6} height={10} />
          <circle cx={px} cy={87} r={1.2} fill={i === 0 ? 'var(--act-blue)' : 'var(--act-red)'} />
        </g>
      ))}
      <Bay x={8} y={botTy - 8} w={W - 16} h={16} />
      <TermIds device={device} local size={3.8} side={() => 'right'} />
      <Terminals {...props} local />
    </g>
  );
};
