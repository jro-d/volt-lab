import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';
import { reedClosed } from '../../core/behaviors/fieldDevices';

const n1 = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/**
 * Batch 3.4 sensors and field devices. One renderer, one block per type, each a labelled face between
 * terminal bays (a bay is only drawn on the sides that have terminals).
 */
export const FieldModuleDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);
  const tag = deviceTag(device) || String(state.tag || '');
  const rels = device.terminals.map((t) => t.relY);
  const hasTop = rels.some((r) => r < 0.5);
  const hasBot = rels.some((r) => r > 0.5);
  const topBayY = hasTop ? H * Math.min(...rels.filter((r) => r < 0.5)) - 8 : 0;
  const botBayY = hasBot ? H * Math.max(...rels.filter((r) => r > 0.5)) - 8 : H;
  const faceY = hasTop ? topBayY + 18 : 4;
  const faceB = hasBot ? botBayY - 2 : H - 4;
  const faceH = faceB - faceY;
  const cx = W / 2;
  const y0 = faceY + 16;
  const din = ['electrode_level_relay', 'temp_controller', 'fire_alarm_panel'].includes(type);

  const frame = (center: string, text: string, body: React.ReactNode, termSize = 3.8) => (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {din && <DinClip cx={cx} y={H} />}
      <Housing w={W} h={H} m="light" rx={4} />
      {hasTop && <Bay x={3} y={topBayY} w={W - 6} h={16} />}
      {hasBot && <Bay x={3} y={botBayY} w={W - 6} h={16} />}
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={tag} center={center} text={text} size={4.6} />
      {body}
      <TermIds device={device} local size={termSize} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
  const led = (x: number, y: number, on: boolean, color: 'green' | 'red' | 'amber', label: string) => (
    <g>
      <Led cx={x} cy={y} r={2.2} on={on} color={color} />
      <Mono x={x + 5} y={y + 1.4} size={3.6} muted>{label}</Mono>
    </g>
  );
  const bar = (x: number, y: number, w: number, frac: number, color: string) => (
    <g>
      <rect x={x} y={y} width={w} height={5} rx={2.5} fill="var(--mat-line-soft)" />
      {frac > 0 && <rect x={x} y={y} width={Math.max(2, w * Math.min(1, frac))} height={5} rx={2.5} fill={color} />}
    </g>
  );

  switch (type) {
    case 'electrode_level_relay': {
      const level = n1(state.level);
      return frame('LEVEL', state.mode === 'drain' ? 'DRAIN' : 'FILL', (
        <g>
          <rect className="d-shade" x={14} y={y0 - 2} width={18} height={54} rx={2} />
          <rect x={14} y={y0 - 2 + 54 * (1 - level / 100)} width={18} height={54 * (level / 100)} rx={2} fill="var(--probe, #38bdf8)" opacity={0.55} />
          <line x1={11} x2={35} y1={y0 - 2 + 54 * (1 - n1(state.maxPct, 70) / 100)} y2={y0 - 2 + 54 * (1 - n1(state.maxPct, 70) / 100)} stroke={state.maxWet ? 'var(--ok)' : 'var(--mat-line)'} strokeWidth={1.2} />
          <line x1={11} x2={35} y1={y0 - 2 + 54 * (1 - n1(state.minPct, 30) / 100)} y2={y0 - 2 + 54 * (1 - n1(state.minPct, 30) / 100)} stroke={state.minWet ? 'var(--ok)' : 'var(--mat-line)'} strokeWidth={1.2} />
          <Mono x={42} y={y0 + 6} size={4.6} muted>{`level ${level.toFixed(0)} %`}</Mono>
          <Mono x={42} y={y0 + 15} size={3.8} muted>{`min ${n1(state.minPct, 30)}  max ${n1(state.maxPct, 70)}`}</Mono>
          {led(44, y0 + 28, !!state.out, 'green', 'OUTPUT')}
          {led(44, y0 + 40, !!state.powered, 'amber', 'SUPPLY')}
        </g>
      ));
    }

    case 'thermostat':
    case 'thermocouple_k': {
      const temp = n1(state.tempC, 20);
      const sp = type === 'thermostat' ? n1(state.setpointC, 22) : null;
      const frac = Math.min(1, Math.max(0, (temp + 10) / (type === 'thermostat' ? 60 : 600)));
      return frame(type === 'thermostat' ? 'THERMOSTAT' : 'TC TYPE K', type === 'thermostat' ? (state.mode === 'cool' ? 'COOL' : 'HEAT') : '', (
        <g>
          <rect className="d-shade" x={cx - 5} y={y0} width={10} height={44} rx={5} />
          <rect x={cx - 3} y={y0 + 44 * (1 - frac)} width={6} height={44 * frac} rx={3} fill="var(--act-red, #dc2626)" opacity={0.85} />
          <circle cx={cx} cy={y0 + 48} r={7} fill="var(--act-red, #dc2626)" opacity={0.85} />
          <Mono x={cx + 12} y={y0 + 12} size={9} weight={700}>{`${temp.toFixed(1)}°`}</Mono>
          {sp !== null && <Mono x={cx + 12} y={y0 + 22} size={4.4} muted>{`set ${sp}°  ±${n1(state.hystC, 2) / 2}`}</Mono>}
          {sp !== null && led(cx + 14, y0 + 34, !!state.out, 'amber', 'CONTACT')}
        </g>
      ));
    }

    case 'temp_controller': {
      const fault = String(state.fault || '');
      return frame('TIC', state.mode === 'cool' ? 'COOL' : 'HEAT', (
        <g>
          <rect className="d-shade" x={cx - 36} y={y0 - 2} width={72} height={30} rx={2} />
          <Mono x={cx - 30} y={y0 + 14} size={fault ? 6 : 11} weight={700} fill={fault ? 'var(--act-red, #dc2626)' : undefined}>{fault || `${n1(state.pv).toFixed(1)}`}</Mono>
          <Mono x={cx + 32} y={y0 + 8} size={4} anchor="end" muted>PV °C</Mono>
          <Mono x={cx + 32} y={y0 + 22} size={5} anchor="end">{`SP ${n1(state.setpointC, 80)}`}</Mono>
          {led(16, y0 + 40, !!state.out, 'green', 'OUT')}
          {led(W / 2 + 4, y0 + 40, !!fault, 'red', 'ALARM')}
        </g>
      ));
    }

    case 'reed_switch': {
      const pos = n1(state.position);
      const closed = reedClosed(state);
      return frame('REED', closed ? 'CLOSED' : 'OPEN', (
        <g>
          <rect className="d-shade" x={12} y={y0 + 4} width={W - 24} height={10} rx={2} />
          <rect x={cx - 8} y={y0 + 6} width={16} height={6} rx={1} fill={closed ? 'var(--ok)' : 'var(--mat-line-soft)'} />
          <g transform={`translate(${14 + ((W - 28) * pos) / 100}, ${y0 + 20})`}>
            <rect x={-6} y={0} width={12} height={10} fill="var(--act-red, #dc2626)" />
            <rect x={-6} y={0} width={6} height={10} fill="var(--mat-steel)" />
          </g>
          <Mono x={cx} y={y0 + 42} size={4.4} anchor="middle" muted>{`magnet at ${pos.toFixed(0)} %`}</Mono>
          <Mono x={cx} y={y0 + 50} size={3.8} anchor="middle" muted>{`operates ${n1(state.windowLo, 40)}-${n1(state.windowHi, 60)} %`}</Mono>
        </g>
      ), 3.6);
    }

    case 'photocell_switch': {
      const lux = n1(state.lux, 500);
      return frame('PHOTOCELL', state.on ? 'ON' : 'OFF', (
        <g>
          <circle cx={cx} cy={y0 + 16} r={12} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" />
          <circle cx={cx} cy={y0 + 16} r={7} fill={state.dark ? '#1e293b' : '#fde047'} opacity={0.9} />
          <Mono x={cx} y={y0 + 40} size={4.6} anchor="middle" muted>{`${lux.toFixed(0)} lux`}</Mono>
          {led(14, y0 + 48, !!state.on, 'green', 'OUT')}
        </g>
      ), 3.6);
    }

    case 'pir_sensor': {
      const rem = n1(state.remainingSec);
      const hold = n1(state.holdSec, 30);
      return frame('PIR', state.on ? 'ON' : 'OFF', (
        <g {...act(() => patch({ motion: !state.motion }))}>
          <title>Click to simulate movement (toggle)</title>
          <ellipse cx={cx} cy={y0 + 16} rx={16} ry={12} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" />
          <ellipse cx={cx} cy={y0 + 16} rx={9} ry={6} fill={state.motion ? '#f59e0b' : '#e5e7eb'} opacity={0.9} />
          {bar(12, y0 + 36, W - 24, rem / hold, 'var(--ok)')}
          <Mono x={cx} y={y0 + 52} size={4.4} anchor="middle" muted>{state.motion ? 'movement' : rem > 0 ? `holding ${rem.toFixed(0)} s` : 'no movement'}</Mono>
        </g>
      ), 3.6);
    }

    case 'flow_switch': {
      return frame('FLOW', state.flowing ? 'FLOW' : 'NO FLOW', (
        <g>
          <path d={`M${cx - 26} ${y0 + 16}H${cx + 26}`} stroke="var(--mat-line)" strokeWidth={9} strokeLinecap="round" />
          <path d={`M${cx - 20} ${y0 + 16}H${cx + 18}l-5 -4m5 4l-5 4`} stroke={state.flowing ? 'var(--probe, #38bdf8)' : 'var(--mat-line-soft)'} strokeWidth={2} fill="none" />
          <Mono x={cx} y={y0 + 40} size={5} anchor="middle">{`${n1(state.lpm).toFixed(0)} L/min`}</Mono>
          <Mono x={cx} y={y0 + 49} size={3.8} anchor="middle" muted>{`set ${n1(state.thresholdLpm, 5)} L/min`}</Mono>
        </g>
      ), 3.6);
    }

    case 'zero_speed_switch': {
      const sp = n1(state.speedPct);
      return frame('ZERO SPEED', state.zero ? 'STANDSTILL' : 'TURNING', (
        <g>
          <circle cx={cx} cy={y0 + 20} r={15} fill="none" stroke="var(--mat-line)" strokeWidth={1.2} />
          <line x1={cx} y1={y0 + 20} x2={cx + 12 * Math.sin((sp / 100) * 2.4)} y2={y0 + 20 - 12 * Math.cos((sp / 100) * 2.4)} stroke="var(--act-red, #dc2626)" strokeWidth={1.4} />
          <Mono x={cx} y={y0 + 46} size={5} anchor="middle">{`${sp.toFixed(0)} %`}</Mono>
          <Mono x={cx} y={y0 + 54} size={3.8} anchor="middle" muted>{`transfers below ${n1(state.setPct, 5)} %`}</Mono>
        </g>
      ), 3.6);
    }

    case 'solenoid_valve': {
      const open = !!state.open;
      return frame('VALVE 2/2', open ? 'OPEN' : 'CLOSED', (
        <g {...act(() => patch({ manual: !state.manual }))}>
          <title>{state.manual ? 'Manual override on: click to release' : 'Click for manual override (opens the valve without the coil)'}</title>
          <rect x={cx - 28} y={y0 + 6} width={56} height={14} fill="var(--mat-steel)" stroke="var(--mat-line)" />
          <rect x={cx - 10} y={y0 + 20} width={20} height={20} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" />
          <path d={open ? `M${cx - 6} ${y0 + 13}H${cx + 6}` : `M${cx - 6} ${y0 + 13}L${cx + 6} ${y0 + 13}`} stroke={open ? 'var(--probe, #38bdf8)' : 'var(--act-red, #dc2626)'} strokeWidth={open ? 4 : 1.5} />
          {!open && <line x1={cx} y1={y0 + 8} x2={cx} y2={y0 + 18} stroke="var(--act-red, #dc2626)" strokeWidth={2} />}
          {led(14, y0 + 48, open, 'green', state.manual ? 'MANUAL' : 'COIL')}
        </g>
      ), 3.6);
    }

    case 'smoke_detector': {
      const smoke = !!state.smoke;
      return frame('SMOKE', smoke ? 'ALARM' : 'NORMAL', (
        <g {...act(() => patch({ smoke: !smoke }))}>
          <title>Click to add or clear smoke</title>
          <circle cx={cx} cy={y0 + 14} r={16} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" />
          <circle cx={cx} cy={y0 + 14} r={9} fill="none" stroke="var(--mat-line)" strokeDasharray="2 2" />
          <circle cx={cx + 12} cy={y0 + 4} r={1.8} fill={smoke ? 'var(--act-red, #dc2626)' : 'var(--ok)'} />
          {smoke && <path d={`M${cx - 8} ${y0 + 10}q4 -6 8 0t8 0`} stroke="#94a3b8" strokeWidth={2} fill="none" />}
        </g>
      ), 3.6);
    }

    case 'manual_call_point': {
      const pulled = !!state.pulled;
      return frame('CALL POINT', pulled ? 'OPERATED' : 'READY', (
        <g>
          <g {...act(() => patch({ pulled: true }))}>
            <title>Break the glass: closes the alarm contact (latched)</title>
            <rect x={cx - 24} y={y0} width={48} height={32} rx={2} fill="var(--act-red, #dc2626)" opacity={0.9} />
            <rect x={cx - 17} y={y0 + 7} width={34} height={18} fill="#fff" opacity={pulled ? 0.15 : 0.5} />
            <Mono x={cx} y={y0 + 19} size={4} anchor="middle" fill="var(--act-red, #dc2626)">{pulled ? 'BROKEN' : 'PUSH'}</Mono>
          </g>
          <g {...act(() => patch({ pulled: false }))}>
            <title>Reset with the key</title>
            <rect x={W - 30} y={y0 + 36} width={22} height={8} rx={2} className="d-shade" />
            <Mono x={W - 19} y={y0 + 42} size={3.6} anchor="middle">RESET</Mono>
          </g>
        </g>
      ), 3.6);
    }

    case 'fire_alarm_panel': {
      return frame('FIRE', state.alarm ? 'ALARM' : state.powered ? 'NORMAL' : 'NO POWER', (
        <g>
          {led(16, y0 + 2, !!state.powered, 'green', 'POWER')}
          {led(cx - 6, y0 + 2, !!state.alarm, 'red', 'FIRE')}
          {led(W - 44, y0 + 2, !!state.alarm && !state.silenced, 'amber', 'BELL')}
          <Mono x={cx} y={y0 + 22} size={4.4} anchor="middle" muted>{state.alarm ? 'loop closed: bell and relay operated' : 'loop clear'}</Mono>
          <g {...act(() => patch({ silenced: !state.silenced }))}>
            <title>Silence or restore the bell</title>
            <rect x={14} y={y0 + 32} width={40} height={11} rx={2} className="d-shade" />
            <Mono x={34} y={y0 + 40} size={4.4} anchor="middle">SILENCE</Mono>
          </g>
          <g {...act(() => patch({ resetRequested: true }))}>
            <title>Reset the panel (works once the loop is clear)</title>
            <rect x={W - 54} y={y0 + 32} width={40} height={11} rx={2} className="d-shade" />
            <Mono x={W - 34} y={y0 + 40} size={4.4} anchor="middle">RESET</Mono>
          </g>
        </g>
      ), 3.4);
    }

    default:
      return null;
  }
};
