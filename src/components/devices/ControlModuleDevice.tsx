import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, PushButton, Silk,
  Terminals, TermIds, act, deviceTag, makePatch, momentaryPress,
} from './kit';
import { operatorContacts, OperatorKind } from '../../core/behaviors/controlModules';

const OPERATOR_LABEL: Record<OperatorKind, string> = {
  illuminated_pb: 'ILLUM. PB',
  key_selector: 'KEY SEL.',
  selector_2pos: 'SELECTOR',
  foot_switch: 'FOOT SW.',
  pendant_station: 'PENDANT',
};

const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * Batch 3.3 control and timing devices. One renderer, one block per type; each draws a labelled face between
 * the terminal bays and shows the live state (LEDs, counters, clock) with the on-device controls clickable.
 */
export const ControlModuleDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);
  const tag = deviceTag(device) || String(state.tag || '');
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.92);
  const topBayY = tTop - 8;
  const botBayY = botTy - 8;
  const faceY = topBayY + 18;
  const faceH = botBayY - 2 - faceY;
  const cx = W / 2;

  if (type === 'mechanical_interlock') {
    const a = String(state.a || '—');
    const b = String(state.b || '—');
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <Housing w={W} h={H} m="light" rx={3} />
        <rect className="d-nameplate" x={3} y={3} width={W - 6} height={9} rx={1.5} />
        <Silk x={cx} y={10} size={5} anchor="middle" onDark bold>{`${tag} INTERLOCK`}</Silk>
        <path d={`M14 ${H - 10}H${W - 14}M14 ${H - 14}v8M${W - 14} ${H - 14}v8`} stroke="var(--mat-line)" strokeWidth={1.6} fill="none" />
        <Mono x={14} y={H - 15} size={4} muted>{a.slice(-8)}</Mono>
        <Mono x={W - 14} y={H - 15} size={4} muted anchor="end">{b.slice(-8)}</Mono>
        <title>Mechanical interlock: once one contactor is pulled in the other cannot close. Name them in the inspector.</title>
      </g>
    );
  }

  const frame = (center: string, text: string, body: React.ReactNode, opts: { din?: boolean; termSize?: number } = {}) => (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {opts.din !== false && <DinClip cx={cx} y={H} />}
      <Housing w={W} h={H} m="light" rx={4} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={tag} center={center} text={text} size={4.6} />
      {body}
      <TermIds device={device} local size={opts.termSize ?? 3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );

  const bar = (x: number, y: number, w: number, frac: number, color: string) => (
    <g>
      <rect x={x} y={y} width={w} height={5} rx={2.5} fill="var(--mat-line-soft)" />
      {frac > 0 && <rect x={x} y={y} width={Math.max(2, w * Math.min(1, frac))} height={5} rx={2.5} fill={color} />}
    </g>
  );
  const led = (x: number, y: number, on: boolean, color: 'green' | 'red' | 'amber', label: string) => (
    <g>
      <Led cx={x} cy={y} r={2.2} on={on} color={color} />
      <Mono x={x + 5} y={y + 1.4} size={3.6} muted>{label}</Mono>
    </g>
  );
  const y0 = faceY + 16;

  switch (type) {
    case 'star_delta_timer': {
      const phase = String(state.phase || 'idle');
      const starSec = Number(state.starSec) || 5;
      const frac = phase === 'star' ? (Number(state.elapsedSec) || 0) / starSec : phase === 'idle' ? 0 : 1;
      return frac >= 0 && frame('KT Y-Δ', `${starSec} s`, (
        <g>
          {led(14, y0 + 2, phase === 'star', 'amber', 'STAR')}
          {led(W / 2 - 4, y0 + 2, phase === 'pause', 'red', 'PAUSE')}
          {led(W - 38, y0 + 2, phase === 'delta', 'green', 'DELTA')}
          {bar(12, y0 + 14, W - 24, frac, 'var(--act-orange, #f59e0b)')}
          <Mono x={cx} y={y0 + 30} size={4.2} anchor="middle" muted>{`star ${starSec} s · pause ${Number(state.pauseMs) || 100} ms`}</Mono>
        </g>
      ));
    }

    case 'counter_relay': {
      const count = Number(state.count) || 0;
      const preset = Number(state.preset) || 5;
      return frame('COUNTER', `preset ${preset}`, (
        <g>
          <rect className="d-shade" x={cx - 26} y={y0 - 2} width={52} height={20} rx={2} />
          <Mono x={cx} y={y0 + 13} size={11} anchor="middle" weight={700}>{String(count).padStart(3, '0')}</Mono>
          {led(14, y0 + 26, !!state.out, 'green', 'OUT')}
          {led(W / 2 + 2, y0 + 26, !!state.countPrev, 'amber', 'COUNT')}
        </g>
      ));
    }

    case 'impulse_relay': {
      const on = !!state.latched;
      return frame('IMPULSE', on ? 'ON' : 'OFF', (
        <g {...act(() => patch({ latched: !on }))}>
          <title>Latched state: click to toggle by hand (a pulse on the coil toggles it too)</title>
          <rect className="d-shade" x={cx - 24} y={y0 - 2} width={48} height={26} rx={3} />
          <rect x={cx - 16} y={y0 + 2} width={32} height={18} rx={2} fill={on ? 'var(--ok)' : 'var(--mat-line-soft)'} opacity={on ? 0.9 : 1} />
          <Mono x={cx} y={y0 + 15} size={7} anchor="middle" onDark={on} weight={700}>{on ? 'I' : 'O'}</Mono>
        </g>
      ));
    }

    case 'staircase_timer': {
      const rem = Number(state.remainingSec) || 0;
      const total = Number(state.timeSec) || 30;
      return frame('STAIR', `${total} s`, (
        <g>
          {led(16, y0 + 2, !!state.active, 'green', 'LIGHT')}
          {bar(12, y0 + 14, W - 24, rem / total, 'var(--ok)')}
          <Mono x={cx} y={y0 + 30} size={4.6} anchor="middle" muted>{state.active ? `${rem.toFixed(0)} s left` : 'idle'}</Mono>
        </g>
      ));
    }

    case 'time_switch_24h': {
      const clock = Number(state.clockMin) || 0;
      const on = Number(state.onMin) || 0;
      const off = Number(state.offMin) || 0;
      const R = 22;
      const ccx = 34;
      const ccy = y0 + 22;
      const ang = (m: number) => ((m / 1440) * 360 - 90) * (Math.PI / 180);
      const pt = (m: number, r: number) => `${ccx + r * Math.cos(ang(m))} ${ccy + r * Math.sin(ang(m))}`;
      const large = ((off - on + 1440) % 1440) > 720 ? 1 : 0;
      const mode = String(state.mode || 'auto');
      const next = mode === 'auto' ? 'on' : mode === 'on' ? 'off' : 'auto';
      return frame('24 h', mode.toUpperCase(), (
        <g>
          <circle cx={ccx} cy={ccy} r={R} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
          {on !== off && <path d={`M${ccx} ${ccy}L${pt(on, R - 2)}A${R - 2} ${R - 2} 0 ${large} 1 ${pt(off, R - 2)}Z`} fill="var(--ok)" opacity={0.45} />}
          <line x1={ccx} y1={ccy} x2={ccx + (R - 3) * Math.cos(ang(clock))} y2={ccy + (R - 3) * Math.sin(ang(clock))} stroke="var(--act-red, #dc2626)" strokeWidth={1.4} />
          <Mono x={ccx + R + 8} y={y0 + 12} size={9} weight={700}>{hhmm(clock)}</Mono>
          <Mono x={ccx + R + 8} y={y0 + 22} size={4.2} muted>{`on ${hhmm(on)}  off ${hhmm(off)}`}</Mono>
          {led(ccx + R + 10, y0 + 33, !!state.out, 'green', 'OUT')}
          <g {...act(() => patch({ mode: next }))}>
            <title>Mode {mode}: click for AUTO / ON / OFF</title>
            <rect x={W - 36} y={y0 + 40} width={28} height={9} rx={2} className="d-shade" />
            <Mono x={W - 22} y={y0 + 46.6} size={4.4} anchor="middle">{mode.toUpperCase()}</Mono>
          </g>
          <Mono x={ccx + R + 8} y={y0 + 46.6} size={3.8} muted>{`x${Number(state.speed) || 60}`}</Mono>
        </g>
      ));
    }

    case 'alternating_relay': {
      const lead = Number(state.lead) || 1;
      const on = !!state.coilOn;
      return frame('ALTERN.', `lead P${lead}`, (
        <g>
          {led(16, y0 + 4, on && lead === 1, 'green', 'PUMP 1')}
          {led(16, y0 + 18, on && lead === 2, 'green', 'PUMP 2')}
          <Mono x={cx + 14} y={y0 + 12} size={4.4} muted>{on ? 'running' : 'stopped'}</Mono>
          <Mono x={cx + 14} y={y0 + 20} size={3.8} muted>next lead flips</Mono>
        </g>
      ));
    }

    case 'ssr_1p': {
      const on = !!state.on;
      return frame('SSR', '1P AC', (
        <g>
          {led(16, y0 + 4, on, 'green', 'ON')}
          <Mono x={cx} y={y0 + 20} size={4.4} anchor="middle" muted>zero-cross, no bounce</Mono>
          <Mono x={cx} y={y0 + 28} size={4} anchor="middle" muted>{`off-state leakage ~${Number(state.leakageMa) || 5} mA`}</Mono>
        </g>
      ), { termSize: 3.6 });
    }

    case 'operator_pilot': {
      const kind = (state.operatorKind as OperatorKind) || 'illuminated_pb';
      const { a, nc } = operatorContacts(state);
      const lit = !!state.lit;
      const press = (key: string) => (e: React.MouseEvent) => momentaryPress(e, device.id, key, props.onPatchState);
      let body: React.ReactNode;
      if (kind === 'illuminated_pb') {
        body = (
          <g onMouseDown={press('pressed')} className="cursor-pointer">
            <title>Illuminated push button: hold to close 13-14; the lamp is on its own X1-X2</title>
            <circle cx={cx} cy={y0 + 18} r={14} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" />
            <circle cx={cx} cy={y0 + 18} r={11} fill={lit ? '#4ade80' : 'var(--act-green, #16a34a)'} opacity={lit ? 1 : 0.55} stroke="var(--mat-line)" strokeWidth={1} />
            {lit && <circle cx={cx} cy={y0 + 18} r={16} fill="#4ade80" opacity={0.25} />}
            {state.pressed && <circle cx={cx} cy={y0 + 18} r={11} fill="var(--mat-line)" opacity={0.3} />}
          </g>
        );
      } else if (kind === 'foot_switch') {
        const guard = !!state.guardOpen;
        body = (
          <g>
            <g onMouseDown={press('pressed')} className="cursor-pointer">
              <title>Foot switch: needs the guard lifted, then hold to close 13-14</title>
              <rect x={cx - 24} y={y0 + 12} width={48} height={16} rx={3} fill="var(--act-black)" stroke="var(--mat-line)" />
              {state.pressed && <rect x={cx - 24} y={y0 + 12} width={48} height={16} rx={3} fill="var(--mat-line)" opacity={0.35} />}
            </g>
            <g {...act(() => patch({ guardOpen: !guard }))}>
              <title>Guard: click to lift or lower</title>
              <rect x={cx - 26} y={guard ? y0 - 2 : y0 + 8} width={52} height={guard ? 8 : 24} rx={3} fill="var(--act-yellow, #eab308)" opacity={guard ? 0.9 : 0.55} stroke="var(--mat-line)" />
            </g>
          </g>
        );
      } else if (kind === 'pendant_station') {
        body = (
          <g>
            <g onMouseDown={press('pressed')} className="cursor-pointer"><title>UP: hold to close 13-14</title><PushButton cx={cx - 24} cy={y0 + 16} r={11} color="green" pressed={!!state.pressed} legend="▲" /></g>
            <g onMouseDown={press('pressedB')} className="cursor-pointer"><title>DOWN: hold to close 23-24</title><PushButton cx={cx + 24} cy={y0 + 16} r={11} color="black" pressed={!!state.pressedB} legend="▼" /></g>
          </g>
        );
      } else {
        const pos = Number(state.pos) || 0;
        const key = kind === 'key_selector';
        const keyIn = state.keyIn !== false;
        body = (
          <g>
            <g {...act(() => (key && !keyIn ? undefined : patch({ pos: pos === 1 ? 0 : 1 })))}>
              <title>{key ? 'Key selector: turn with the key in; the key can only be removed at 0' : '2-position selector: click to turn'}</title>
              <circle cx={cx} cy={y0 + 18} r={13} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" />
              <g transform={`rotate(${pos === 1 ? 45 : -45} ${cx} ${y0 + 18})`}>
                <rect x={cx - 3} y={y0 + 7} width={6} height={13} rx={1.5} fill="var(--act-black)" stroke="var(--silk-on-dark)" strokeWidth={0.5} />
              </g>
              <Mono x={cx - 18} y={y0 + 30} size={4.2} muted>0</Mono>
              <Mono x={cx + 18} y={y0 + 30} size={4.2} anchor="end" muted>I</Mono>
            </g>
            {key && (
              <g {...act(() => (pos === 0 ? patch({ keyIn: !keyIn }) : undefined))}>
                <title>{keyIn ? 'Key in (can only be removed at position 0)' : 'Key out: insert it to operate'}</title>
                <rect x={W - 30} y={y0 + 4} width={20} height={8} rx={2} fill={keyIn ? 'var(--act-yellow, #eab308)' : 'none'} stroke="var(--mat-line)" strokeDasharray={keyIn ? undefined : '2 2'} />
                <Mono x={W - 20} y={y0 + 10.4} size={3.6} anchor="middle">{keyIn ? 'KEY' : 'out'}</Mono>
              </g>
            )}
          </g>
        );
      }
      return frame(OPERATOR_LABEL[kind], kind === 'pendant_station' ? 'A/B' : a ? 'I' : 'O', (
        <g>
          {body}
          <Mono x={8} y={faceY + faceH - 6} size={3.8} muted>{`13-14 ${a ? 'closed' : 'open'}`}</Mono>
          <Mono x={W - 8} y={faceY + faceH - 6} size={3.8} anchor="end" muted>{`21-22 ${nc ? 'closed' : 'open'}`}</Mono>
        </g>
      ), { din: false });
    }

    case 'aux_contact_block': {
      const eng = !!state.engaged;
      return frame('AUX 2NO+2NC', eng ? 'ENGAGED' : 'RELEASED', (
        <g>
          {led(16, y0 + 4, eng, 'green', `follows ${String(state.parentId || 'nothing').slice(-10)}`)}
          <Mono x={cx} y={y0 + 22} size={4.2} anchor="middle" muted>{eng ? '53-54 63-64 closed' : '71-72 81-82 closed'}</Mono>
        </g>
      ));
    }

    case 'safety_relay': {
      return frame('SAFETY', state.startMode === 'auto' ? 'AUTO START' : 'MON. START', (
        <g>
          {led(16, y0 + 2, !!state.powered, 'green', 'POWER')}
          {led(W / 2 - 24, y0 + 2, !!state.ch1, 'green', 'CH1')}
          {led(W / 2 + 6, y0 + 2, !!state.ch2, 'green', 'CH2')}
          {led(W - 40, y0 + 2, !!state.outOn, 'green', 'OUT')}
          {led(16, y0 + 16, !!state.fault, 'red', 'FAULT')}
          <Mono x={cx} y={y0 + 34} size={4.4} anchor="middle" muted>
            {state.fault ? 'channel discrepancy: open both channels' : state.outOn ? 'safety outputs closed' : state.ch1 && state.ch2 ? 'press START (X1-X2)' : 'waiting for both channels'}
          </Mono>
        </g>
      ), { termSize: 3.4 });
    }

    case 'two_hand_station': {
      const l = !!state.leftPressed;
      const r = !!state.rightPressed;
      const down = (side: 'left' | 'right') => (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const key = side === 'left' ? 'leftPressed' : 'rightPressed';
        const at = side === 'left' ? 'leftAt' : 'rightAt';
        props.onPatchState?.(device.id, { [key]: true, [at]: Date.now() });
        const up = () => {
          props.onPatchState?.(device.id, { [key]: false });
          window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mouseup', up);
      };
      return frame('TWO-HAND', state.armed ? 'OUTPUT' : 'OFF', (
        <g>
          <g onMouseDown={down('left')} className="cursor-pointer"><title>Left palm button (hold)</title><PushButton cx={cx - 26} cy={y0 + 18} r={13} color="green" pressed={l} /></g>
          <g onMouseDown={down('right')} className="cursor-pointer"><title>Right palm button (hold)</title><PushButton cx={cx + 26} cy={y0 + 18} r={13} color="green" pressed={r} /></g>
          {led(cx - 8, y0 + 42, !!state.armed, 'green', 'ARMED')}
          <Mono x={cx} y={y0 + 54} size={3.8} anchor="middle" muted>{state.needRelease ? 'too far apart: release both' : 'both within 0.5 s'}</Mono>
        </g>
      ), { din: false });
    }

    case 'door_interlock_switch': {
      const closed = state.doorClosed !== false;
      return frame('DOOR', closed ? 'CLOSED' : 'OPEN', (
        <g {...act(() => patch({ doorClosed: !closed }))}>
          <title>{closed ? 'Door closed: click to open it (NC contacts open)' : 'Door open: click to close it'}</title>
          <rect className="d-shade" x={cx - 30} y={y0} width={60} height={30} rx={2} />
          <rect x={cx - 26} y={y0 + 3} width={closed ? 24 : 12} height={24} fill="var(--mat-steel)" stroke="var(--mat-line)" />
          <g transform={closed ? '' : `rotate(-35 ${cx - 26} ${y0 + 3})`}>
            <rect x={cx - 2} y={y0 + 3} width={24} height={24} fill="var(--act-yellow, #eab308)" opacity={0.7} stroke="var(--mat-line)" />
          </g>
        </g>
      ), { din: false });
    }

    case 'pull_cord_switch': {
      const pulled = !!state.pulled;
      return frame('PULL-CORD', pulled ? 'TRIPPED' : 'READY', (
        <g>
          <g {...act(() => patch({ pulled: true }))}>
            <title>Pull the cord: opens 11-12, closes 23-24 and latches</title>
            <path d={`M${cx} ${y0} V${y0 + (pulled ? 26 : 18)}`} stroke="var(--act-red, #dc2626)" strokeWidth={2} fill="none" />
            <circle cx={cx} cy={y0 + (pulled ? 30 : 22)} r={4} fill="var(--act-red, #dc2626)" stroke="var(--mat-line)" />
          </g>
          <g {...act(() => patch({ pulled: false }))}>
            <title>Reset (releases the latch)</title>
            <rect x={W - 34} y={y0 + 22} width={26} height={9} rx={2} className="d-shade" />
            <Mono x={W - 21} y={y0 + 28.6} size={4} anchor="middle">RESET</Mono>
          </g>
        </g>
      ), { din: false });
    }

    default:
      return null;
  }
};
