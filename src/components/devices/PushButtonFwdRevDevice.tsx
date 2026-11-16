import React from 'react';
import { Bay, DeviceProps, Housing, LegendPlate, Mono, Nameplate, PushButton, Screw, SymNC, SymNO, Terminals, TermIds, deviceTag, momentaryPress } from './kit';

const BUTTONS = [
  { key: 'stopPressed', legend: 'STOP', mark: 'O', color: 'red' as const, rel: 0.18, nc: true, sub: 'NC 1-2' },
  { key: 'fwdPressed', legend: 'FWD', mark: 'I', color: 'green' as const, rel: 0.5, nc: false, sub: 'NO 3-4' },
  { key: 'revPressed', legend: 'REV', mark: 'II', color: 'blue' as const, rel: 0.82, nc: false, sub: 'NO 5-6' },
];

/** Three-button reversing station: STOP (NC 1-2), FORWARD (NO 3-4), REVERSE (NO 5-6). Hold to press. */
export const PushButtonFwdRevDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const press = (e: React.MouseEvent, key: string) => {
    if (onPatchState) momentaryPress(e, device.id, key, onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, [key]: !device.state[key] } });
    }
  };
  const tTop = H * (device.terminals[0]?.relY ?? 0.07);
  const topBayY = tTop - 7.8;
  const botBayY = H - tTop - 8.2;
  const by = H * 0.56;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="shade" rx={4} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <rect className="d-face" x={5} y={topBayY + 21} width={W - 10} height={botBayY - topBayY - 26} rx={3} />
      {[10, W - 10].map((sx) => [topBayY + 26, botBayY - 6].map((sy) => <Screw key={`${sx}-${sy}`} cx={sx} cy={sy} r={1.8} />))}
      <Nameplate x={18} y={topBayY + 22.5} w={W - 36} h={7} tag={deviceTag(device) || 'S'} center="REVERSING" text="3×Ø22" size={4.4} />

      {BUTTONS.map((b) => {
        const cx = W * b.rel;
        const pressed = !!device.state[b.key];
        return (
          <g key={b.key}>
            <LegendPlate cx={cx} y={by - 21} w={28} text={b.legend} />
            <g onMouseDown={(e) => press(e, b.key)} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
              <title>{`${b.legend} (${b.sub}): momentary, hold to press`}</title>
              <PushButton cx={cx} cy={by} r={9} color={b.color} pressed={pressed} legend={b.mark} guard={b.nc} />
            </g>
            {b.nc ? <SymNC x={cx + 1} y={by + 15} s={0.9} /> : <SymNO x={cx} y={by + 15} s={0.9} />}
            <Mono x={cx} y={by + 30.5} size={3.6} anchor="middle" muted>{b.sub}</Mono>
          </g>
        );
      })}
      <path className="d-sym" strokeDasharray="1.2 1" d={`M${W * 0.5 + 2.3} ${by + 19.5}H${W * 0.82 + 2.3}`} />

      <TermIds device={device} local size={4.4} side={() => 'left'} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};
