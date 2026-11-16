import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, LegendPlate, Led, Mono, Nameplate, PushButton, Screw, Silk, SymCoil, SymNC, SymNO,
  Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';

/**
 * Control extensions: on-delay timer relay (KT), HAND-OFF-AUTO selector (SA), roller-lever limit
 * switch (SQ) and a variable-frequency drive (U) with keypad.
 */
export const IndustrialControlExtDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);
  const tag = deviceTag(device);
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);

  /* ───────────── Timer relay (on-delay) ───────────── */
  if (type === 'timer_relay') {
    const delaySec = typeof state.delaySec === 'number' ? state.delaySec : 5;
    const elapsedSec = typeof state.elapsedSec === 'number' ? state.elapsedSec : 0;
    const energized = !!state.energized;
    const timedOut = !!state.timedOut;
    const presets = [2, 5, 10, 15];
    const frac = Math.min(1, elapsedSec / delaySec);
    const topBayY = tTop - 8;
    const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.92);
    const botBayY = botTy - 8;
    const faceY = topBayY + 18;
    const faceH = botBayY - 2 - faceY;
    const cx = W / 2;
    const dialCy = faceY + 36;
    const ang = ((-135 + (presets.indexOf(delaySec) / 3) * 270 - 90) * Math.PI) / 180;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <DinClip cx={cx} y={H} />
        <Housing w={W} h={H} />
        <Bay x={3} y={topBayY} w={W - 6} h={16} />
        <Bay x={3} y={botBayY} w={W - 6} h={16} />
        <Face x={3} y={faceY} w={W - 6} h={faceH} />
        <Nameplate x={3} y={faceY + 6} w={W - 6} h={8} tag={tag || 'KT'} text="ON-DELAY" size={4.6} />
        {/* status LEDs */}
        <Led cx={12} cy={faceY + 21} r={1.8} on={energized} color="green" />
        <Mono x={16} y={faceY + 22.6} size={3.6} muted>U</Mono>
        <Led cx={W - 18} cy={faceY + 21} r={1.8} on={timedOut} color="amber" />
        <Mono x={W - 14} y={faceY + 22.6} size={3.6} muted>R</Mono>
        {/* time dial with progress ring */}
        <g {...act(() => patch({ delaySec: presets[(Math.max(0, presets.indexOf(delaySec)) + 1) % presets.length], elapsedSec: 0, timedOut: false }))}>
          <title>{`Click the dial to change the delay (${delaySec} s)`}</title>
          <circle cx={cx} cy={dialCy} r={14} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
          {energized && (
            <circle cx={cx} cy={dialCy} r={14} fill="none" stroke="var(--ok)" strokeWidth={2} strokeDasharray={`${frac * 88} 88`} transform={`rotate(-90 ${cx} ${dialCy})`} />
          )}
          {presets.map((p, i) => {
            const a = ((-135 + (i / 3) * 270 - 90) * Math.PI) / 180;
            return <Mono key={p} x={cx + Math.cos(a) * 19} y={dialCy + Math.sin(a) * 19 + 1.4} size={3.6} anchor="middle" muted>{p}</Mono>;
          })}
          <circle cx={cx} cy={dialCy} r={9} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1} />
          <path d={`M${cx} ${dialCy}L${cx + Math.cos(ang) * 8} ${dialCy + Math.sin(ang) * 8}`} stroke="var(--act-red)" strokeWidth={1.4} strokeLinecap="round" />
        </g>
        <Mono x={cx} y={dialCy + 24} size={4.4} anchor="middle">{energized ? `${elapsedSec.toFixed(1)} / ${delaySec} s` : `t = ${delaySec} s`}</Mono>
        {/* printed function: delayed-on coil + changeover */}
        <g className="pointer-events-none">
          <SymCoil x={14} y={faceY + faceH - 14} s={0.9} />
          <path className="d-sym" d={`M11.3 ${faceY + faceH - 11.5}h5.4M11.3 ${faceY + faceH - 9.5}h5.4`} />
          <SymNC x={W * 0.5} y={faceY + faceH - 14} s={0.9} />
          <SymNO x={W * 0.78} y={faceY + faceH - 14} s={0.9} />
        </g>
        <TermIds device={device} local size={4} gap={3} text={(t) => (t.label || t.id).split(' ')[0]} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── HAND-OFF-AUTO selector ───────────── */
  if (type === 'selector_hoa') {
    const mode: 'hand' | 'off' | 'auto' = state.mode || 'off';
    const rot = mode === 'hand' ? -45 : mode === 'auto' ? 45 : 0;
    const cx = W / 2;
    const cy = H * 0.57;
    const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.9);
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <Housing w={W} h={H} m="shade" rx={4} />
        <Bay x={3} y={tTop - 8} w={W - 6} h={16} />
        <Bay x={3} y={botTy - 8} w={W - 6} h={16} />
        <rect className="d-face" x={5} y={tTop + 10} width={W - 10} height={botTy - tTop - 20} rx={3} />
        <LegendPlate cx={cx} y={tTop + 13} w={W - 22} text={tag || 'SA'} />
        {(['hand', 'off', 'auto'] as const).map((m, i) => {
          const a = ((-45 + i * 45 - 90) * Math.PI) / 180;
          return (
            <Silk key={m} x={cx + Math.cos(a) * 19} y={cy + Math.sin(a) * 19 + 1.6} size={4.6} anchor="middle" bold={mode === m} muted={mode !== m} fill={mode === m ? 'var(--silk)' : undefined}>
              {m.toUpperCase()}
            </Silk>
          );
        })}
        <g {...act(() => patch({ mode: mode === 'hand' ? 'off' : mode === 'off' ? 'auto' : 'hand' }))}>
          <title>{`Click to turn HAND → OFF → AUTO (${tag})`}</title>
          <circle cx={cx} cy={cy} r={13} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <circle cx={cx} cy={cy} r={11} fill="var(--act-black)" stroke="var(--mat-line)" strokeWidth={1} />
          <g transform={`rotate(${rot} ${cx} ${cy})`} style={{ transition: 'transform 110ms ease-out' }}>
            <rect x={cx - 3} y={cy - 10} width={6} height={20} rx={2.5} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={0.7} />
            <path d={`M${cx} ${cy - 9}v4`} stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
          </g>
        </g>
        <TermIds device={device} local size={4} side={(t) => (t.relY < 0.5 ? 'right' : 'above')} gap={2.6} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── Limit switch (roller lever) ───────────── */
  if (type === 'limit_switch') {
    const actuated = !!state.actuated;
    const cx = W / 2;
    const headY = H * 0.5;
    const ang = actuated ? 30 : 0;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <Housing w={W} h={H} m="cast" rx={4} />
        <rect className="d-dark-face" x={4} y={tTop - 9} width={W - 8} height={H - 2 * (tTop - 9)} rx={2.5} />
        <Nameplate x={8} y={tTop + 9} w={W - 16} h={7} tag={tag || 'SQ'} text="1NO+1NC" size={4.2} />
        {/* rotary head + roller lever */}
        <g {...act(() => patch({ actuated: !actuated }))}>
          <title>{`Click the roller lever to actuate / release (${tag})`}</title>
          <circle cx={cx} cy={headY} r={9} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={1} />
          <g transform={`rotate(${ang} ${cx} ${headY})`} style={{ transition: 'transform 110ms ease-out' }}>
            <rect x={cx - 2} y={headY - 24} width={4} height={24} rx={1.5} fill="var(--mat-steel-dark)" stroke="var(--mat-line)" strokeWidth={0.6} />
            <circle cx={cx} cy={headY - 24} r={5.5} fill="var(--mat-rubber)" stroke="var(--mat-line)" strokeWidth={0.8} />
            <circle cx={cx} cy={headY - 24} r={1.4} fill="var(--mat-steel)" />
          </g>
          <circle cx={cx} cy={headY} r={3} fill="var(--mat-line)" />
        </g>
        <rect x={cx - 15} y={headY + 13} width={30} height={7} rx={1.2} fill="var(--mat-line)" />
        <Mono x={cx} y={headY + 18.2} size={4} anchor="middle" fill={actuated ? 'var(--flag-trip)' : 'var(--lamp-green-on)'}>{actuated ? 'ACTUATED' : 'FREE'}</Mono>
        <SymNC x={W * 0.28} y={headY + 23} s={0.8} dark />
        <SymNO x={W * 0.72} y={headY + 23} s={0.8} dark />
        <TermIds device={device} local size={3.8} onDark side={(t) => (t.relX < 0.5 ? 'left' : 'right')} text={(t) => (t.label || t.id).split(' ')[0]} />
        <Terminals {...props} local />
      </g>
    );
  }

  /* ───────────── VFD ───────────── */
  const isOn = state.isOn !== false;
  const freqHz = typeof state.freqHz === 'number' ? state.freqHz : 60;
  const running = !!state.running;
  const topBayY = tTop - 8;
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.94);
  const botBayY = botTy - 8;
  const cx = W / 2;
  const kY = topBayY + 22;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="dark" rx={4} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} dark />
      <Bay x={3} y={botBayY} w={W - 6} h={16} dark />
      {/* heatsink fins on the sides */}
      {[2, W - 6].map((fx) => Array.from({ length: 8 }).map((_, i) => (
        <rect key={`${fx}-${i}`} x={fx} y={kY + 4 + i * 10} width={4} height={6} rx={1} fill="var(--mat-housing-dark-face)" />
      )))}
      <Nameplate x={10} y={kY} w={W - 20} h={9} tag={tag || 'U'} center="VFD" text="2.2kW 3~" size={4.8} />
      {/* keypad: console display + keys */}
      <rect className="d-housing" x={14} y={kY + 13} width={W - 28} height={70} rx={3} />
      <rect className="d-console" x={19} y={kY + 18} width={W - 38} height={24} rx={2} />
      <Mono x={W - 24} y={kY + 35} size={11} anchor="end" fill={isOn ? 'var(--console-readout)' : 'var(--console-muted)'}>{isOn ? `${freqHz.toFixed(1)}` : '----'}</Mono>
      <Mono x={24} y={kY + 25} size={3.6} fill="var(--console-muted)">Hz</Mono>
      <Mono x={24} y={kY + 39} size={3.6} fill={running ? 'var(--console-readout)' : 'var(--console-muted)'}>{running ? 'RUN ▶' : 'RDY'}</Mono>
      <g {...act(() => patch({ freqHz: Math.max(10, freqHz - 10) }))}>
        <title>Lower the output frequency</title>
        <rect x={20} y={kY + 47} width={22} height={11} rx={2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <Mono x={31} y={kY + 54.6} size={5} anchor="middle">▼</Mono>
      </g>
      <g {...act(() => patch({ freqHz: Math.min(60, freqHz + 10) }))}>
        <title>Raise the output frequency</title>
        <rect x={W - 42} y={kY + 47} width={22} height={11} rx={2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <Mono x={W - 31} y={kY + 54.6} size={5} anchor="middle">▲</Mono>
      </g>
      <g {...act(() => patch({ isOn: !isOn }))}>
        <title>{isOn ? 'Disable the drive' : 'Enable the drive'}</title>
        <PushButton cx={cx} cy={kY + 70} r={6} color={isOn ? 'green' : 'black'} legend={isOn ? 'I' : 'O'} />
      </g>
      <Led cx={cx - 18} cy={kY + 70} r={1.8} on={isOn} color="green" />
      <Led cx={cx + 18} cy={kY + 70} r={1.8} on={running} color="amber" />
      {/* vents */}
      {Array.from({ length: 4 }).map((_, i) => (
        <rect key={i} x={20} y={kY + 89 + i * 4} width={W - 40} height={1.6} rx={0.8} fill="var(--mat-line)" />
      ))}
      <Screw cx={10} cy={kY + 4} r={1.4} m="dark" />
      <TermIds device={device} local size={4} onDark gap={0.5} text={(t) => (t.label || t.id).split('/').pop() || ''} />
      <Terminals {...props} local />
    </g>
  );
};
