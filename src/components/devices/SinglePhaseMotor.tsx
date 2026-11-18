import React from 'react';
import {
  DeviceProps, Housing, Led, Mono, Nameplate, Silk,
  Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';

const KIND_LABEL: Record<string, string> = {
  split_phase: 'SPLIT-PHASE',
  capacitor_start: 'CAP-START',
  psc: 'PSC',
};

/**
 * Single-phase induction motor. The centrifugal switch is drawn on the end shield: it is closed (green) while the
 * starting winding is in circuit and flies open at 75 % speed (split-phase and capacitor-start); a PSC motor has none.
 * Click the motor kind label to cycle split-phase -> capacitor-start -> PSC.
 */
export const Motor1pDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const kind = (state.motorKind as string) || 'capacitor_start';
  const speed = Math.max(0, Math.min(100, Number(state.speedPct) || 0));
  const fault = state.motorFault as string | null;
  const note = (state.motorNote as string) || '';
  const dir = (state.motorDirection as 'CW' | 'CCW' | null) || 'CW';
  const running = !!state.motorRunning && !fault;
  const hasSwitch = kind !== 'psc';
  const switchClosed = !hasSwitch || speed < 75;
  const hum = !!fault && !!state.mainPowered;
  const cx = W * 0.5;
  const cy = H * 0.62;
  const bodyR = Math.min(W, H) * 0.3;
  const tag = deviceTag(device) || 'M';
  const next = kind === 'split_phase' ? 'capacitor_start' : kind === 'capacitor_start' ? 'psc' : 'split_phase';
  const spinSec = speed > 3 ? Math.max(0.15, 1.6 - speed * 0.0145) : 0;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <style>{'@keyframes ww-spin1p { to { transform: rotate(360deg); } } @keyframes ww-hum { 0%,100% { transform: translateX(-0.7px); } 50% { transform: translateX(0.7px); } }'}</style>
      <Housing w={W} h={H} m="shade" rx={5} />
      {/* terminal box */}
      <rect x={W * 0.06} y={H * 0.04} width={W * 0.88} height={H * 0.2} rx={3} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={0.8} />
      {/* frame */}
      <g style={hum ? { animation: 'ww-hum 0.08s linear infinite' } : undefined}>
        <circle cx={cx} cy={cy} r={bodyR + 6} className="d-steel" />
        <circle cx={cx} cy={cy} r={bodyR} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1} />
        {/* rotor / hub */}
        <g style={spinSec ? { animation: `ww-spin1p ${spinSec}s linear infinite ${dir === 'CCW' ? 'reverse' : 'normal'}`, transformOrigin: `${cx}px ${cy}px` } : undefined}>
          <path d={`M${cx - bodyR * 0.7} ${cy}H${cx + bodyR * 0.7}M${cx} ${cy - bodyR * 0.7}V${cy + bodyR * 0.7}`} stroke="var(--mat-steel-dark)" strokeWidth={2.2} />
          <circle cx={cx} cy={cy} r={bodyR * 0.22} fill="var(--mat-steel-dark)" />
        </g>
        {/* centrifugal switch on the end shield */}
        {hasSwitch && (
          <g>
            <rect x={cx + bodyR * 0.45} y={cy + bodyR * 0.35} width={bodyR * 0.55} height={bodyR * 0.4} rx={1.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.7} />
            <path
              d={switchClosed ? `M${cx + bodyR * 0.52} ${cy + bodyR * 0.55}H${cx + bodyR * 0.93}` : `M${cx + bodyR * 0.52} ${cy + bodyR * 0.55}L${cx + bodyR * 0.86} ${cy + bodyR * 0.4}`}
              stroke={switchClosed ? 'var(--ok)' : 'var(--act-orange, #f59e0b)'}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
      <g {...act(() => patch({ motorKind: next }))}>
        <Nameplate x={6} y={H * 0.27} w={W * 0.42} h={9} tag={tag} text={KIND_LABEL[kind]} size={3.8} />
      </g>
      <Led cx={W - 12} cy={H * 0.3} r={2.2} on={running} color="green" />
      <Mono x={W - 6} y={H - 5} size={3.8} anchor="end" fill={fault ? 'var(--danger)' : running ? 'var(--ok)' : undefined} muted={!fault && !running}>
        {fault ? `${fault.toUpperCase()}${hum ? ' · HUM' : ''}` : running ? `${dir} ${Math.round(speed)}%` : 'STOPPED'}
      </Mono>
      {note && <Mono x={6} y={H - 5} size={3.4} fill="var(--act-orange, #f59e0b)">{note.length > 30 ? note.slice(0, 29) + '…' : note}</Mono>}
      <Silk x={6} y={H - 15} size={3.6} muted>{`${state.wattage || 370} W · 1Φ`}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

/** AC motor capacitor (can): shows its value and a crack when it has failed open. */
export const CapacitorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const open = !!state.open;
  const cx = W / 2;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" rx={5} />
      <g {...act(() => patch({ open: !open }))}>
        <rect x={cx - 14} y={6} width={28} height={H * 0.62} rx={5} fill={open ? 'var(--mat-steel-dark)' : 'var(--mat-steel)'} stroke="var(--mat-line)" strokeWidth={1} />
        {open && <path d={`M${cx - 6} 12L${cx + 2} 24L${cx - 4} 34L${cx + 5} 46`} stroke="var(--danger)" strokeWidth={1.4} fill="none" />}
      </g>
      <Mono x={cx} y={H * 0.62 + 16} size={4.6} anchor="middle">{`${state.uF || 100} µF`}</Mono>
      <Silk x={cx} y={H * 0.62 + 24} size={3.4} anchor="middle" muted>{open ? 'FAILED OPEN' : `${state.voltsRating || 250} V AC`}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};
