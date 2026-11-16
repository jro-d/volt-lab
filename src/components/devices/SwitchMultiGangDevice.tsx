import React from 'react';
import { Bay, DeviceProps, Mono, Rocker, Screw, Silk, Strap, Terminals, TermIds, WallPlate, act } from './kit';

/**
 * 2- and 3-gang wide-series switches (independent SPST per gang, L1/L2/L3 in → 1/2/3 out)
 * and the rotary LED dimmer (L IN → LOAD, click the knob to step 25 / 50 / 75 / 100 %).
 */
export const SwitchMultiGangDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H, type, state } = device;
  const update = (key: string, value: any) => {
    if (onPatchState) onPatchState(device.id, { [key]: value });
    else onToggleState?.({ ...device, state: { ...device.state, [key]: value } });
  };

  if (type === 'dimmer_switch') {
    const isOn = state.isOn !== false;
    const level = typeof state.level === 'number' ? state.level : 80;
    const cx = W / 2;
    const cy = H * 0.6;
    const ang = ((-135 + (level / 100) * 270 - 90) * Math.PI) / 180;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <WallPlate w={W} h={H} />
        <Bay x={8} y={H * 0.15 - 8} w={W - 16} h={16} />
        <Silk x={cx} y={H * 0.33} size={4.4} anchor="middle" bold fill="var(--brand)">ROYU</Silk>
        <Mono x={cx} y={H * 0.33 + 5.5} size={3.6} anchor="middle" muted>LED DIMMER 200W</Mono>
        {/* level scale */}
        {Array.from({ length: 11 }).map((_, i) => {
          const a = ((-135 + i * 27 - 90) * Math.PI) / 180;
          const lit = isOn && i * 10 <= level;
          return <circle key={i} cx={cx + Math.cos(a) * 19} cy={cy + Math.sin(a) * 19} r={i % 5 ? 0.9 : 1.3} fill={lit ? 'var(--lamp-amber-on)' : 'var(--mat-line-soft)'} />;
        })}
        <g {...act(() => update('level', level >= 100 ? 25 : Math.min(100, level + 25)))}>
          <title>{`Click the knob to step brightness (${level}%)`}</title>
          <circle cx={cx} cy={cy} r={15} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <circle cx={cx} cy={cy} r={12} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1} />
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <path key={i} d={`M${cx + Math.cos(a) * 10.5} ${cy + Math.sin(a) * 10.5}L${cx + Math.cos(a) * 12} ${cy + Math.sin(a) * 12}`} stroke="var(--mat-line-soft)" strokeWidth={0.6} />;
          })}
          <path d={`M${cx + Math.cos(ang) * 3} ${cy + Math.sin(ang) * 3}L${cx + Math.cos(ang) * 9.5} ${cy + Math.sin(ang) * 9.5}`} stroke="var(--mat-line)" strokeWidth={1.6} strokeLinecap="round" />
        </g>
        <g {...act(() => update('isOn', !isOn))}>
          <title>Push-on / push-off</title>
          <rect x={cx - 11} y={H - 17} width={22} height={8} rx={4} fill={isOn ? 'var(--act-green)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.7} />
          <Silk x={cx} y={H - 11.4} size={4.4} anchor="middle" bold fill={isOn ? 'var(--on-act)' : undefined}>{isOn ? `ON ${level}%` : 'OFF'}</Silk>
        </g>
        <TermIds device={device} local size={4} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
        <Terminals {...props} local />
      </g>
    );
  }

  const gangs = type === 'switch_3gang' ? 3 : 2;
  const states = gangs === 3 ? [!!state.isOn, !!state.isOn2, !!state.isOn3] : [!!state.isOn, !!state.isOn2];
  const stateKeys = gangs === 3 ? ['isOn', 'isOn2', 'isOn3'] : ['isOn', 'isOn2'];
  const isRear = !!state.rearView;
  const ins = device.terminals.filter((t) => t.relY < 0.5);
  const outs = device.terminals.filter((t) => t.relY >= 0.5);
  const topY = H * (ins[0]?.relY ?? 0.2);
  const botY = H * (outs[0]?.relY ?? 0.8);

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {isRear ? (
        <g>
          <rect className="d-steel" x={0} y={H / 2 - 6} width={W} height={12} rx={2} />
          <rect className="d-dark" x={5} y={4} width={W - 10} height={H - 8} rx={3} />
          {ins.map((t, i) => (
            <g key={t.id}>
              <Strap d={`M${W * t.relX} ${topY + 7}V${H / 2 - 3}`} live />
              <Strap d={states[i] ? `M${W * t.relX} ${H / 2 - 3}V${botY - 7}` : `M${W * t.relX} ${H / 2 - 3}l5 7M${W * t.relX} ${H / 2 + 6}V${botY - 7}`} live={states[i]} w={2} />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <WallPlate w={W} h={H} />
          {states.map((on, i) => {
            const t = ins[i];
            const cx = W * (t?.relX ?? (i + 0.5) / gangs);
            const rw = Math.min(26, W / gangs - 6);
            return (
              <g key={i} {...act(() => update(stateKeys[i], !on))}>
                <title>{`Click to switch gang ${i + 1}`}</title>
                <Rocker x={cx - rw / 2} y={topY + 12} w={rw} h={botY - topY - 24} on={on} mark={['I', 'O']} />
              </g>
            );
          })}
          <Screw cx={W / 2} cy={7} r={1.6} />
          <Screw cx={W / 2} cy={H - 7} r={1.6} />
        </g>
      )}
      <Bay x={6} y={topY - 8} w={W - 12} h={16} />
      <Bay x={6} y={botY - 8} w={W - 12} h={16} />
      <TermIds device={device} local size={4} onDark={isRear} side={() => 'right'} />
      <Terminals {...props} local />
    </g>
  );
};
