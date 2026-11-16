import React from 'react';
import { Bay, DeviceProps, Housing, Mono, Screw, Silk, SymNC, Terminals, TermIds, act } from './kit';

/**
 * Emergency stop: yellow enclosure, red mushroom head (EN ISO 13850), latching NC 11-12.
 * Click to latch; click again to twist-release.
 */
export const EstopDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const latched = !!device.state.estopActive;
  const toggle = () => {
    if (onPatchState) onPatchState(device.id, { estopActive: !latched });
    else onToggleState?.({ ...device, state: { ...device.state, estopActive: !latched } });
  };
  const ty = H * (device.terminals[0]?.relY ?? 0.88);
  const botBayY = ty - 8;
  const cx = W / 2;
  const cy = H * 0.42;
  const head = latched ? 13 : 14.5;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" rx={4} />
      <rect x={1.5} y={1.5} width={W - 3} height={botBayY - 3} rx={3} fill="var(--act-yellow)" />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <Screw cx={7} cy={7} r={1.6} />
      <Screw cx={W - 7} cy={7} r={1.6} />
      <Silk x={cx} y={8.6} size={4.6} anchor="middle" bold fill="var(--mat-line)" ls={0.3}>EMERGENCY STOP</Silk>

      <g {...act(toggle)}>
        <title>{latched ? 'Latched: click to twist-release (closes 11-12)' : 'Click to strike the E-stop (opens 11-12, latches)'}</title>
        {/* yellow legend disc + guard collar */}
        <circle cx={cx} cy={cy} r={22} fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <circle cx={cx} cy={cy} r={17.5} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" strokeWidth={0.9} />
        {/* mushroom head: smaller and darker when pushed in */}
        <circle cx={cx} cy={cy} r={head} fill="var(--act-red)" stroke="var(--mat-line)" strokeWidth={1.1} />
        {latched && <circle cx={cx} cy={cy} r={head} fill="var(--mat-line)" opacity={0.25} />}
        <circle cx={cx - head * 0.3} cy={cy - head * 0.3} r={head * 0.35} fill="#fff" opacity={latched ? 0.1 : 0.22} />
        {/* twist-release arrows */}
        <path d={`M${cx - 7} ${cy - 3}a7.5 7.5 0 0 1 14 0`} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.1} />
        <path d={`M${cx + 7} ${cy - 3}l-2.6 -0.6M${cx + 7} ${cy - 3}l0.8 -2.6`} stroke="#fff" strokeOpacity={0.8} strokeWidth={1.1} strokeLinecap="round" />
      </g>
      {/* latch flag */}
      <rect x={cx - 13} y={cy + 25} width={26} height={7} rx={1.2} fill="var(--mat-line)" />
      <Mono x={cx} y={cy + 30.3} size={4.4} anchor="middle" fill={latched ? 'var(--flag-trip)' : 'var(--lamp-green-on)'}>{latched ? 'LATCHED' : 'ARMED'}</Mono>
      <SymNC x={W - 9} y={cy + 22} s={0.9} />

      <TermIds device={device} local size={4.4} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
