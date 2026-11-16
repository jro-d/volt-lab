import React from 'react';
import { Bay, DeviceProps, Housing, LampColor, Mono, SymLamp, Terminals, TermIds, act } from './kit';

/** 22 mm LED pilot light (IEC 60073 colours). Lit when X1-X2 is energized; click the bezel to change colour. */
export const PilotLightDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const lit = !!device.state.pilotLit;
  const color = (device.state.pilotColor || 'green') as LampColor;
  const cycle = () => {
    const colors = ['green', 'red', 'amber', 'blue'];
    const next = colors[(colors.indexOf(color) + 1) % colors.length];
    if (onPatchState) onPatchState(device.id, { pilotColor: next });
    else onToggleState?.({ ...device, state: { ...device.state, pilotColor: next } });
  };
  const ty = H * (device.terminals[0]?.relY ?? 0.88);
  const botBayY = ty - 8;
  const cx = W / 2;
  const cy = H * 0.36;
  const lens = `var(--lamp-${color}-${lit ? 'on' : 'off'})`;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="dark" rx={4} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} dark />

      <g {...act(cycle)}>
        <title>Click the bezel to change colour (green / red / amber / blue)</title>
        {lit && <circle cx={cx} cy={cy} r={22} fill="var(--lamp-glow)" />}
        {/* chrome bezel with knurling */}
        <circle cx={cx} cy={cy} r={15} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={1} />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <path key={i} d={`M${cx + Math.cos(a) * 13.4} ${cy + Math.sin(a) * 13.4}L${cx + Math.cos(a) * 15} ${cy + Math.sin(a) * 15}`} stroke="var(--mat-steel-dark)" strokeWidth={0.6} />;
        })}
        <circle cx={cx} cy={cy} r={12} fill={lens} stroke="var(--mat-line)" strokeWidth={0.9} />
        {/* LED cluster behind the fresnel lens */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return <circle key={i} cx={cx + Math.cos(a) * 5.5} cy={cy + Math.sin(a) * 5.5} r={1.4} fill="#fff" opacity={lit ? 0.55 : 0.12} />;
        })}
        <circle cx={cx} cy={cy} r={1.6} fill="#fff" opacity={lit ? 0.7 : 0.15} />
        <path d={`M${cx - 7} ${cy - 6}a9 9 0 0 1 8 -3.6`} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.2} strokeLinecap="round" />
      </g>

      <SymLamp x={W - 9} y={cy + 20} s={0.9} dark />
      <Mono x={cx} y={cy + 22} size={4.2} anchor="middle" onDark>{`${color.toUpperCase()} 24–240V`}</Mono>

      <TermIds device={device} local size={4.4} onDark side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
