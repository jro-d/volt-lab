import React from 'react';
import {
  Bay, DeviceProps, Face, Housing, Mono, Nameplate, Silk,
  Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';
import { playBuzzerBeep } from '../../utils/soundFx';

const COLORS: Record<string, string> = { red: '#ef4444', amber: '#f59e0b', green: '#22c55e', blue: '#3b82f6', white: '#f8fafc' };
const supplyText = (state: Record<string, any>) => (state.supply === 'dc24' ? '24 V DC' : '230 V AC');

/** Panel buzzer: sounds while powered (and not muted). Click the speaker to mute it. */
export const BuzzerDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const active = !!state.active;
  const muted = !!state.muted;
  React.useEffect(() => {
    if (!active || muted) return;
    playBuzzerBeep();
    const id = window.setInterval(playBuzzerBeep, 600);
    return () => window.clearInterval(id);
  }, [active, muted]);
  const cx = W / 2;
  const botY = H * 0.88 - 8;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Bay x={3} y={botY} w={W - 6} h={H - botY - 3} />
      <Face x={3} y={4} w={W - 6} h={botY - 8} />
      <Nameplate x={3} y={4} w={W - 6} h={8} tag={deviceTag(device) || 'HA'} text="BUZZER" size={4.4} />
      <g {...act(() => patch({ muted: !muted }))}>
        <circle cx={cx} cy={32} r={14} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={cx + Math.cos((i * Math.PI) / 3) * 6} cy={32 + Math.sin((i * Math.PI) / 3) * 6} r={1.3} fill="var(--mat-line)" />
        ))}
        <circle cx={cx} cy={32} r={1.6} fill="var(--mat-line)" />
        {active && !muted && [20, 25].map((r) => (
          <circle key={r} cx={cx} cy={32} r={r} fill="none" stroke="var(--act-orange, #f59e0b)" strokeWidth={1}>
            <animate attributeName="opacity" values="0.9;0" dur="0.6s" repeatCount="indefinite" />
          </circle>
        ))}
      </g>
      <Mono x={cx} y={H * 0.88 - 14} size={3.6} anchor="middle" fill={active ? 'var(--danger)' : undefined} muted={!active}>
        {active ? (muted ? 'POWERED · MUTED' : 'SOUNDING') : 'SILENT'}
      </Mono>
      <Silk x={cx} y={botY + 3} size={3.4} anchor="middle" muted>{supplyText(state)}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

/** Signal beacon: steady or flashing lens in the chosen colour. */
export const BeaconDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const active = !!state.active;
  const flashing = state.mode === 'flashing';
  const colour = COLORS[(state.color as string) || 'red'] || COLORS.red;
  const cx = W / 2;
  const botY = H * 0.9 - 8;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Bay x={3} y={botY} w={W - 6} h={H - botY - 3} />
      <Face x={3} y={4} w={W - 6} h={botY - 8} />
      <Nameplate x={3} y={4} w={W - 6} h={8} tag={deviceTag(device) || 'HL'} text={flashing ? 'BEACON FLASH' : 'BEACON'} size={3.8} />
      <path d={`M${cx - 15} 56 A15 22 0 0 1 ${cx + 15} 56 Z`} fill={colour} opacity={active ? 1 : 0.25} stroke="var(--mat-line)" strokeWidth={1}>
        {active && flashing && <animate attributeName="opacity" values="1;0.15;1" dur="0.8s" repeatCount="indefinite" />}
      </path>
      {active && <ellipse cx={cx} cy={42} rx={24} ry={20} fill={colour} opacity={0.18} />}
      <rect x={cx - 17} y={56} width={34} height={5} rx={1.5} fill="var(--mat-steel-dark)" />
      <Silk x={cx} y={botY + 3} size={3.4} anchor="middle" muted>{supplyText(state)}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

/** Three-segment stack light, each segment lit by its own terminal. */
export const TowerLightDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const seg = (state.segments || {}) as Record<string, boolean>;
  const cx = W / 2;
  const botY = H * 0.93 - 8;
  const rows: [string, string][] = [['r', COLORS.red], ['a', COLORS.amber], ['g', COLORS.green]];
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Bay x={3} y={botY} w={W - 6} h={H - botY - 3} />
      <Face x={3} y={4} w={W - 6} h={botY - 8} />
      <Nameplate x={3} y={4} w={W - 6} h={8} tag={deviceTag(device) || 'HL'} text="TOWER" size={4.4} />
      {rows.map(([k, c], i) => (
        <g key={k}>
          <rect x={cx - 15} y={16 + i * 29} width={30} height={25} rx={4} fill={c} opacity={seg[k] ? 1 : 0.22} stroke="var(--mat-line)" strokeWidth={0.9} />
          {seg[k] && <rect x={cx - 21} y={13 + i * 29} width={42} height={31} rx={7} fill={c} opacity={0.2} />}
        </g>
      ))}
      <Silk x={cx} y={botY + 3} size={3.4} anchor="middle" muted>{supplyText(state)}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};
