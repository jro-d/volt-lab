import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';
import { rvStartMultiple } from '../../core/behaviors/drives';

const n1 = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

const METHOD_LABEL: Record<string, string> = { autotransformer: 'AUTOTRANSFORMER', primary_resistor: 'PRIMARY RESISTOR', part_winding: 'PART WINDING' };

/**
 * Batch 3.5 starters, motors and drive accessories. One renderer, one block per type (bays are drawn only on
 * the sides that have terminals).
 */
export const DriveModuleDevice: React.FC<DeviceProps> = (props) => {
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
  const motorLike = ['motor_dahlander', 'motor_wound_rotor', 'motor_dc_shunt', 'motor_brake', 'pump_submersible_3p', 'air_compressor_3p', 'hoist_conveyor'].includes(type);
  const din = !motorLike && !['speed_potentiometer'].includes(type);

  const frame = (center: string, text: string, body: React.ReactNode, termSize = 3.6) => (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {din && <DinClip cx={cx} y={H} />}
      <Housing w={W} h={H} m={motorLike ? 'steel' : 'light'} rx={4} />
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
  /** Shaft / fan wheel with a speed readout */
  const wheel = (speed: number, label: string, sub?: string, cxx = cx, cyy = y0 + 22) => (
    <g>
      <circle cx={cxx} cy={cyy} r={17} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
      <g style={{ transformOrigin: `${cxx}px ${cyy}px`, transform: `rotate(${(speed / 100) * 90}deg)`, transition: 'transform 400ms linear' }}>
        {[0, 120, 240].map((a) => <line key={a} x1={cxx} y1={cyy} x2={cxx + 13 * Math.cos((a * Math.PI) / 180)} y2={cyy + 13 * Math.sin((a * Math.PI) / 180)} stroke="var(--mat-line)" strokeWidth={2.2} strokeLinecap="round" />)}
      </g>
      <Mono x={cxx} y={cyy + 30} size={5.4} anchor="middle" weight={700}>{`${speed.toFixed(0)} % speed`}</Mono>
      <Mono x={cxx} y={cyy + 38} size={3.8} anchor="middle" muted>{label}</Mono>
      {sub && <Mono x={cxx} y={cyy + 45} size={3.6} anchor="middle" fill="var(--act-red, #dc2626)">{sub}</Mono>}
    </g>
  );

  switch (type) {
    case 'soft_starter': {
      const ramp = n1(state.rampPct);
      const start = n1(state.startPct, 30);
      const frac = Math.min(1, n1(state.elapsedSec) / Math.max(n1(state.rampSec, 6), 0.5));
      const px = (f: number) => 14 + f * (W - 28);
      const py = (p: number) => y0 + 38 - (p / 100) * 30;
      return frame('SOFT START', `${n1(state.rampSec, 6)} s`, (
        <g>
          <rect className="d-shade" x={10} y={y0 - 2} width={W - 20} height={46} rx={2} />
          <path d={`M${px(0)} ${py(start)}L${px(1)} ${py(100)}L${W - 14} ${py(100)}`} stroke="var(--mat-line)" strokeWidth={1.2} fill="none" strokeDasharray="3 2" />
          {state.on && <circle cx={px(frac)} cy={py(ramp)} r={2.6} fill="var(--act-orange, #f59e0b)" />}
          {led(14, y0 + 56, !!state.on, 'green', 'RUN')}
          {led(cx - 6, y0 + 56, state.phase === 'done', 'amber', 'END OF RAMP')}
          <Mono x={W - 14} y={y0 + 57} size={4.4} anchor="end">{`${ramp.toFixed(0)} %`}</Mono>
          <Mono x={cx} y={y0 + 68} size={3.8} anchor="middle" muted>{`inrush limited to ${n1(state.startMult, 3).toFixed(1)} x FLA (DOL 6 x)`}</Mono>
        </g>
      ), 3.4);
    }

    case 'starter_reduced_voltage': {
      const method = String(state.method || 'autotransformer');
      const mult = rvStartMultiple(state);
      return frame('RV START', METHOD_LABEL[method] || method, (
        <g>
          {led(14, y0 + 2, state.phase === 'start', 'amber', 'START')}
          {led(cx - 10, y0 + 2, state.phase === 'run', 'green', 'RUN')}
          {bar(12, y0 + 16, W - 24, state.phase === 'start' ? n1(state.elapsedSec) / Math.max(n1(state.startSec, 6), 0.5) : state.phase === 'run' ? 1 : 0, 'var(--act-orange, #f59e0b)')}
          <Mono x={cx} y={y0 + 34} size={4.6} anchor="middle">{`starting current ${mult.toFixed(1)} x FLA`}</Mono>
          <Mono x={cx} y={y0 + 43} size={3.8} anchor="middle" muted>{method === 'autotransformer' ? `tap ${n1(state.tapPct, 65)} %` : method === 'primary_resistor' ? `resistor drops ${n1(state.resistorDropPct, 30)} %` : 'second winding after the start time'}</Mono>
        </g>
      ), 3.4);
    }

    case 'motor_dahlander': {
      const set = String(state.speedSet || 'off');
      const fault = String(state.fault3 || '');
      return frame('DAHLANDER', set === 'high' ? 'HIGH 2P' : set === 'low' ? 'LOW 4P' : 'STOPPED', wheel(n1(state.speedPct), set === 'off' ? 'stopped' : `${set} speed`, fault || undefined));
    }

    case 'motor_wound_rotor': {
      const stages = n1(state.stages, -1);
      return frame('WOUND ROTOR', stages < 0 ? 'NO BANK' : `STEP ${stages}`, wheel(n1(state.speedPct), stages < 0 ? 'rotor circuit open' : `${stages} of 3 stages shorted`, String(state.rotorNote || '') || undefined));
    }

    case 'rotor_resistor_bank': {
      const stages = n1(state.stages);
      return frame('ROTOR R', `${stages}/3`, (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${14 + i * ((W - 28) / 3)}, ${y0})`}>
              <path d="M0 0v6l4 3l-8 6l8 6l-8 6l4 3v6" stroke={i < stages ? 'var(--mat-line-soft)' : 'var(--act-orange, #f59e0b)'} strokeWidth={1.6} fill="none" />
              <line x1={-6} x2={10} y1={2} y2={2} stroke={i < stages ? 'var(--ok)' : 'transparent'} strokeWidth={2} />
              <Mono x={2} y={46} size={3.8} anchor="middle" muted>{i < stages ? 'shorted' : `R${i + 1}`}</Mono>
            </g>
          ))}
        </g>
      ));
    }

    case 'motor_dc_shunt': {
      return frame('DC SHUNT', state.overspeed ? 'OVERSPEED' : state.armPowered ? 'RUN' : 'STOP', (
        <g>
          {wheel(n1(state.speedPct), `starter step ${n1(state.starterStep)}/3`, state.overspeed ? 'FIELD LOSS: RUNAWAY' : undefined, cx, y0 + 18)}
          {led(14, y0 + 2, !!state.armPowered, 'green', 'ARM')}
          {led(W - 36, y0 + 2, !!state.fieldPowered, 'green', 'FIELD')}
        </g>
      ));
    }

    case 'motor_brake': {
      return frame('BRAKE MOTOR', state.brakeReleased ? 'RELEASED' : 'BRAKE ON', (
        <g>
          {wheel(n1(state.speedPct), state.running ? 'running' : 'stopped', state.locked ? 'BRAKE LOCKED' : undefined)}
          {led(14, y0 + 2, !!state.brakeReleased, 'green', 'BRAKE')}
        </g>
      ));
    }

    case 'dc_injection_brake': {
      const remaining = n1(state.remainingSec);
      return frame('DC BRAKE', state.braking ? 'BRAKING' : 'READY', (
        <g>
          {led(14, y0 + 2, !!state.powered, 'green', 'POWER')}
          {led(cx - 4, y0 + 2, !!state.braking, 'amber', 'BRAKING')}
          {bar(12, y0 + 18, W - 24, remaining / Math.max(n1(state.brakeSec, 3), 0.5), 'var(--act-orange, #f59e0b)')}
          <Mono x={cx} y={y0 + 36} size={4.4} anchor="middle" muted>{`brake time ${n1(state.brakeSec, 3)} s`}</Mono>
        </g>
      ));
    }

    case 'speed_potentiometer': {
      const v = n1(state.value, 50);
      return frame('SPEED', `${Math.round((v / 100) * 60)} Hz`, (
        <g {...act(() => patch({ value: v >= 100 ? 0 : v + 10 }))}>
          <title>Click to turn the knob up by 10 % (wraps to 0); set an exact value in the inspector</title>
          <circle cx={cx} cy={y0 + 18} r={16} fill="var(--act-black)" stroke="var(--mat-line)" />
          <line x1={cx} y1={y0 + 18} x2={cx + 12 * Math.sin(((v / 100) * 270 - 135) * (Math.PI / 180))} y2={y0 + 18 - 12 * Math.cos(((v / 100) * 270 - 135) * (Math.PI / 180))} stroke="var(--silk-on-dark)" strokeWidth={2} />
          <Mono x={cx} y={y0 + 46} size={5} anchor="middle">{`${v.toFixed(0)} %`}</Mono>
          <Mono x={cx} y={y0 + 54} size={3.6} anchor="middle" muted>{state.vfdId ? `drives ${String(state.vfdId).slice(-8)}` : 'not linked'}</Mono>
        </g>
      ), 3.4);
    }

    case 'braking_resistor': {
      return frame('BRAKE R', `${n1(state.ohms, 100)} Ω`, (
        <g>
          <path d={`M${cx} ${y0}v6l8 4l-16 8l16 8l-16 8l8 4v6`} stroke="var(--act-orange, #f59e0b)" strokeWidth={2} fill="none" />
          <Mono x={cx} y={y0 + 54} size={4.2} anchor="middle" muted>{`${n1(state.watts, 200)} W`}</Mono>
        </g>
      ));
    }

    case 'line_reactor': {
      return frame('REACTOR', `${n1(state.impedancePct, 3)} %`, (
        <g>
          {[0.2, 0.5, 0.8].map((x, i) => (
            <path key={i} d={`M${W * x} ${y0}q8 4 0 8t0 8t0 8t0 8t0 8`} stroke="var(--mat-line)" strokeWidth={1.6} fill="none" />
          ))}
          <Mono x={cx} y={y0 + 52} size={3.8} anchor="middle" muted>series choke, no harmonic model</Mono>
        </g>
      ));
    }

    case 'pump_submersible_3p':
    case 'air_compressor_3p': {
      const comp = type === 'air_compressor_3p';
      return frame(comp ? 'COMPRESSOR' : 'SUBMERSIBLE', state.running ? 'RUNNING' : 'STOPPED', (
        <g>
          {wheel(state.running ? 100 : 0, comp ? 'raises line pressure' : 'fills the tank', String(state.fault3 || '') || undefined)}
        </g>
      ));
    }

    case 'hoist_conveyor': {
      const pos = n1(state.position);
      const dir = String(state.direction || 'CW');
      return frame('HOIST', state.stalled ? 'STALLED' : state.moving ? (dir === 'CW' ? 'UP' : 'DOWN') : 'STOPPED', (
        <g>
          <rect className="d-shade" x={cx - 8} y={y0 - 2} width={16} height={58} rx={2} />
          <rect x={cx - 11} y={y0 + 50 - (pos / 100) * 46} width={22} height={9} fill="var(--act-orange, #f59e0b)" stroke="var(--mat-line)" />
          <Mono x={cx + 18} y={y0 + 8} size={5} weight={700}>{`${pos.toFixed(0)} %`}</Mono>
          {led(cx + 18, y0 + 20, pos >= 98, 'red', 'TOP')}
          {led(cx + 18, y0 + 32, pos <= 2, 'red', 'BOTTOM')}
          <g {...act(() => patch({ position: pos >= 100 ? 0 : Math.min(100, pos + 25) }))}>
            <title>Click to move the load by hand (25 %)</title>
            <rect x={10} y={y0 + 40} width={34} height={11} rx={2} className="d-shade" />
            <Mono x={27} y={y0 + 48} size={4} anchor="middle">NUDGE</Mono>
          </g>
        </g>
      ));
    }

    default:
      return null;
  }
};
