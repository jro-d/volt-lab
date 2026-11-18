import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, Silk,
  Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';

/** 24 V DC supply (IEC 61204 style): AC input top, DC output bottom, LEDs for output OK and the current-limit state. */
export const PsuDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const on = !!state.dcOutputOn;
  const tripped = !!state.psuTripped;
  const fault = (state.psuFault as string) || '';
  const rated = Number(state.ratedAmps) || 5;
  const load = Number(state.dcLoadAmps) || 0;
  const cx = W / 2;
  const faceY = 22;
  const faceH = H - 44;
  const fill = Math.min(1, load / rated);
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={cx} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={H * 0.08 - 8} w={W - 6} h={16} />
      <Bay x={3} y={H * 0.92 - 8} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={8} tag={deviceTag(device) || 'G'} text="24V DC PSU" size={4.4} />
      <Led cx={14} cy={faceY + 20} r={2.2} on={on} color="green" />
      <Mono x={19} y={faceY + 21.4} size={3.8} muted>DC OK</Mono>
      <Led cx={W - 34} cy={faceY + 20} r={2.2} on={tripped} color="red" />
      <Mono x={W - 29} y={faceY + 21.4} size={3.8} muted>LIM</Mono>
      <rect x={10} y={faceY + 30} width={W - 20} height={5} rx={1.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.6} />
      <rect x={10} y={faceY + 30} width={(W - 20) * fill} height={5} rx={1.5} fill={fill > 0.95 ? 'var(--danger)' : 'var(--ok)'} />
      <Mono x={cx} y={faceY + 43} size={3.8} anchor="middle" muted>{`${load.toFixed(2)} A / ${rated} A`}</Mono>
      <Mono x={cx} y={faceY + 52} size={3.8} anchor="middle" fill={tripped ? 'var(--danger)' : on ? 'var(--ok)' : undefined}>
        {tripped ? `${fault} · restart ${(Number(state.psuRecoverSec) || 0).toFixed(1)}s` : on ? '24.0 V' : 'NO INPUT'}
      </Mono>
      <Silk x={cx} y={faceY + faceH - 4} size={3.8} anchor="middle" muted>230V AC → 24V DC</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

const SENSOR_LABEL: Record<string, string> = {
  sensor_inductive: 'INDUCTIVE',
  sensor_capacitive: 'CAPACITIVE',
  sensor_photoelectric: 'PHOTOELECTRIC',
};

/** Three-wire proximity / photoelectric sensor. Click the sensing face to put a target in front of it. */
export const SensorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const detected = !!state.detected;
  const active = !!state.outActive;
  const powered = !!state.sensorPowered;
  const note = (state.wiringNote as string) || (state.supplyNote as string) || '';
  const cx = W / 2;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Nameplate x={3} y={4} w={W - 6} h={8} tag={deviceTag(device) || 'B'} text={SENSOR_LABEL[device.type] || 'SENSOR'} size={3.6} />
      {/* sensing face: click to toggle a target */}
      <g {...act(() => patch({ detected: !detected }))}>
        <circle cx={cx} cy={30} r={13} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
        <circle cx={cx} cy={30} r={8} fill={detected ? 'var(--act-orange, #f59e0b)' : 'var(--mat-steel-dark)'} opacity={detected ? 0.95 : 0.55} />
      </g>
      <Mono x={cx} y={50} size={3.6} anchor="middle" muted>{detected ? 'TARGET' : 'CLEAR'}</Mono>
      <Led cx={14} cy={58} r={2} on={powered} color="green" />
      <Mono x={19} y={59.4} size={3.4} muted>PWR</Mono>
      <Led cx={W - 24} cy={58} r={2} on={active} color="amber" />
      <Mono x={W - 19} y={59.4} size={3.4} muted>OUT</Mono>
      <Mono x={cx} y={68} size={3.6} anchor="middle">{`${state.output || 'PNP'} · ${state.contact || 'NO'}`}</Mono>
      <Silk x={cx} y={75} size={3.4} anchor="middle" muted>{`${state.rangeMm || 0} mm`}</Silk>
      {note && <Mono x={cx} y={82} size={3.2} anchor="middle" fill="var(--danger)">{note.length > 22 ? note.slice(0, 21) + '…' : note}</Mono>}
      <TermIds device={device} local size={3.6} gap={0} text={(t) => t.label || t.id} />
      <Terminals {...props} local />
    </g>
  );
};

/** 24 V DC PLC: 8 inputs along the top, 8 sourcing transistor outputs along the bottom, RUN / STOP toggle. */
export const Plc24Device: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const powered = !!state.plcPowered;
  const running = state.plcRunning !== false;
  const ins = (state.plcInputs || {}) as Record<string, boolean>;
  const outs = (state.plcOutputs || {}) as Record<string, boolean>;
  const note = (state.dcNote as string) || '';
  const cx = W / 2;
  const faceY = 20;
  const faceH = H - 40;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={cx} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={H * 0.09 - 8} w={W - 6} h={16} />
      <Bay x={3} y={H * 0.91 - 8} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={8} tag={deviceTag(device) || 'A'} text="PLC 24V DC · 8DI / 8DO" size={4.4} />
      {Array.from({ length: 8 }, (_, n) => {
        const x = W * (0.10 + n * 0.11);
        return (
          <g key={n}>
            <Led cx={x} cy={faceY + 18} r={1.8} on={!!ins[`i${n}`]} color="green" />
            <Mono x={x} y={faceY + 25} size={3} anchor="middle" muted>{`I0.${n}`}</Mono>
            <Led cx={x} cy={faceY + faceH - 12} r={1.8} on={!!outs[`q${n}`]} color="amber" />
            <Mono x={x} y={faceY + faceH - 4} size={3} anchor="middle" muted>{`Q0.${n}`}</Mono>
          </g>
        );
      })}
      <Led cx={cx - 40} cy={faceY + 36} r={2.2} on={powered} color="green" />
      <Mono x={cx - 35} y={faceY + 37.4} size={3.6} muted>24V</Mono>
      <g {...act(() => patch({ plcRunning: !running }))}>
        <rect x={cx - 14} y={faceY + 31} width={28} height={9} rx={2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <rect x={running ? cx : cx - 13} y={faceY + 32} width={13} height={7} rx={1.5} fill={running ? 'var(--ok)' : 'var(--danger)'} />
        <Mono x={running ? cx + 6.5 : cx - 6.5} y={faceY + 37} size={3.6} anchor="middle" fill="#fff">{running ? 'RUN' : 'STOP'}</Mono>
      </g>
      <Mono x={cx + 22} y={faceY + 37.4} size={3.6} muted>{state.program === 'start_stop_latch' ? 'LATCH' : 'PASS'}</Mono>
      <Mono x={cx + 62} y={faceY + 37.4} size={3.6} muted>{state.inputMode === 'sourcing' ? 'SRC IN' : 'SINK IN'}</Mono>
      {note && <Mono x={cx} y={faceY + 47} size={3.4} anchor="middle" fill="var(--danger)">{note}</Mono>}
      <TermIds device={device} local size={3.4} gap={0} text={(t) => (t.label || t.id).replace('I0.', '').replace('Q0.', '')} />
      <Terminals {...props} local />
    </g>
  );
};
