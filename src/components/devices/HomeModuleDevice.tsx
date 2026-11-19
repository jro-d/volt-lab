import React from 'react';
import {
  Bay, DeviceProps, Face, Housing, Led, Mono, Nameplate, Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';
import { APPLIANCE_KINDS, STRIP_LOADS } from '../../data/loadPresets';

const n1 = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const STRIP_ORDER = Object.keys(STRIP_LOADS);

/** Batch 3.6 residential and commercial loads: appliance, emergency luminaire, fan regulator, doorbell, power strip. */
export const HomeModuleDevice: React.FC<DeviceProps> = (props) => {
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

  const frame = (center: string, text: string, body: React.ReactNode) => (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" rx={4} />
      {hasTop && <Bay x={3} y={topBayY} w={W - 6} h={16} />}
      {hasBot && <Bay x={3} y={botBayY} w={W - 6} h={16} />}
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={tag} center={center} text={text} size={4.6} />
      {body}
      <TermIds device={device} local size={3.6} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
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
    case 'appliance_generic': {
      const kind = String(state.applianceKind || 'range');
      const preset = APPLIANCE_KINDS[kind];
      const watts = n1(state.wattsNow);
      return frame((preset?.label || kind).toUpperCase().slice(0, 12), `${n1(state.wattage)} W`, (
        <g>
          {led(14, y0 + 2, !!state.powered, 'green', 'POWER')}
          <Mono x={cx} y={y0 + 22} size={9} anchor="middle" weight={700}>{`${watts.toFixed(0)} W`}</Mono>
          <Mono x={cx} y={y0 + 32} size={4.2} anchor="middle" muted>{String(state.phase || 'off')}</Mono>
          {bar(10, y0 + 38, W - 20, n1(state.wattage) > 0 ? watts / n1(state.wattage) : 0, 'var(--act-orange, #f59e0b)')}
          {kind === 'microwave' && (
            <g {...act(() => patch({ timerSec: 30 }))}>
              <title>Start: 30 s of cooking</title>
              <rect x={W - 36} y={y0 - 4} width={28} height={10} rx={2} className="d-shade" />
              <Mono x={W - 22} y={y0 + 3.4} size={4} anchor="middle">{n1(state.timerSec) > 0 ? `${n1(state.timerSec).toFixed(0)} s` : 'START'}</Mono>
            </g>
          )}
        </g>
      ));
    }

    case 'emergency_light': {
      const exit = state.kind === 'exit_sign';
      return frame(exit ? 'EXIT' : 'EMERGENCY', `${n1(state.autonomyH, 3)} h`, (
        <g>
          <rect x={cx - 30} y={y0 - 2} width={60} height={22} rx={3} fill={state.lit ? (exit ? '#16a34a' : '#fde047') : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" opacity={state.lit ? 1 : 0.8} />
          {exit && <Mono x={cx} y={y0 + 13} size={9} anchor="middle" weight={700} fill={state.lit ? '#fff' : undefined}>EXIT</Mono>}
          {bar(12, y0 + 26, W - 24, n1(state.socPct) / 100, n1(state.socPct) < 25 ? 'var(--act-red, #dc2626)' : 'var(--ok)')}
          <Mono x={cx} y={y0 + 42} size={4.2} anchor="middle" muted>{state.onBattery ? `on battery ${n1(state.socPct).toFixed(0)} %` : state.mains ? 'mains: charging' : 'no supply'}</Mono>
        </g>
      ));
    }

    case 'fan_regulator': {
      const step = n1(state.step, 3);
      return frame('REGULATOR', step === 0 ? 'OFF' : `STEP ${step}`, (
        <g {...act(() => patch({ step: step >= 5 ? 0 : step + 1 }))}>
          <title>Click to turn the regulator up one step (5 wraps to off)</title>
          <circle cx={cx} cy={y0 + 18} r={16} fill="var(--act-black)" stroke="var(--mat-line)" />
          <line x1={cx} y1={y0 + 18} x2={cx + 12 * Math.sin(((step / 5) * 270 - 135) * (Math.PI / 180))} y2={y0 + 18 - 12 * Math.cos(((step / 5) * 270 - 135) * (Math.PI / 180))} stroke="var(--silk-on-dark)" strokeWidth={2} />
          <Mono x={cx} y={y0 + 46} size={4} anchor="middle" muted>{state.fanId ? `fan ${String(state.fanId).slice(-8)}` : 'not linked'}</Mono>
        </g>
      ));
    }

    case 'doorbell_set': {
      return frame('DOORBELL', state.ringing ? 'RINGING' : '12 V', (
        <g>
          <path d={`M${cx - 12} ${y0 + 18}a12 12 0 0 1 24 0v8h-24z`} fill={state.ringing ? 'var(--act-orange, #f59e0b)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" />
          {state.ringing && <path d={`M${cx - 20} ${y0 + 10}q-4 8 0 16M${cx + 20} ${y0 + 10}q4 8 0 16`} stroke="var(--act-orange, #f59e0b)" strokeWidth={1.6} fill="none" />}
          <Mono x={cx} y={y0 + 42} size={4.4} anchor="middle" muted>{`secondary ${n1(state.secondaryV)} V`}</Mono>
        </g>
      ));
    }

    case 'power_strip': {
      const slots = (state.slots as string[]) || ['none', 'none', 'none', 'none'];
      const amps = n1(state.loadAmps);
      const cord = n1(state.cordAmps, 10);
      const heat = n1(state.cordHeat);
      return frame(state.burnt ? 'CORD BURNT' : state.overload ? 'OVERLOAD' : 'POWER STRIP', `${cord} A cord`, (
        <g>
          {[0, 1, 2, 3].map((i) => {
            const k = slots[i] || 'none';
            const x = 12 + i * ((W - 24) / 4);
            return (
              <g key={i} {...act(() => patch({ slots: slots.map((s, j) => (j === i ? STRIP_ORDER[(STRIP_ORDER.indexOf(s) + 1) % STRIP_ORDER.length] : s)) }))}>
                <title>Socket {i + 1}: click to change what is plugged in</title>
                <rect x={x} y={y0 - 2} width={(W - 24) / 4 - 4} height={26} rx={3} className="d-shade" />
                <circle cx={x + 6} cy={y0 + 6} r={1.8} fill="var(--mat-line)" />
                <circle cx={x + 14} cy={y0 + 6} r={1.8} fill="var(--mat-line)" />
                <Mono x={x + ((W - 24) / 4 - 4) / 2} y={y0 + 19} size={3.6} anchor="middle" muted={k === 'none'}>{k === 'none' ? 'empty' : k}</Mono>
              </g>
            );
          })}
          <Mono x={12} y={y0 + 34} size={4.8}>{`${amps.toFixed(1)} A of ${cord} A`}</Mono>
          {bar(12, y0 + 40, W - 24, heat, heat > 0.6 ? 'var(--act-red, #dc2626)' : 'var(--act-orange, #f59e0b)')}
          <Mono x={W - 12} y={y0 + 34} size={3.8} anchor="end" muted>cord heat</Mono>
        </g>
      ));
    }

    default:
      return null;
  }
};
