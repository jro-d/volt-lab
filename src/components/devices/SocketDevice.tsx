import React from 'react';
import { DeviceProps, Mono, Pill, Silk, Strap, Terminals, TermIds, WallPlate } from './kit';

/**
 * Duplex receptacle (PH wide-series / NEMA 5-15, or Schuko). Front: two outlets with the ground
 * screw between them. Rear: brass line screws, silver neutral screws, green ground and the
 * break-off tabs that tie the two halves together. Click REAR / FRONT to flip.
 */
export const SocketDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const isSchuko = device.type === 'socket_schuko';
  const powered = !!device.state.powered;
  const isRearView = device.state.viewMode === 'rear';
  const tabBroken = !!device.state.tabBroken;
  const flip = () => {
    const next = isRearView ? 'front' : 'rear';
    if (onPatchState) onPatchState(device.id, { viewMode: next });
    else {
      device.state.viewMode = next;
      onToggleState?.({ ...device, state: { ...device.state, viewMode: next } });
    }
  };
  const p = (id: string) => {
    const t = device.terminals.find((x) => x.id === id);
    return { x: W * (t?.relX ?? 0), y: H * (t?.relY ?? 0) };
  };
  const outletX = [p('line').x, p('line_out').x];
  const cy = H / 2;

  const outlet = (ox: number) =>
    isSchuko ? (
      <g key={ox}>
        <circle cx={ox} cy={cy} r={13} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <circle cx={ox - 4.5} cy={cy} r={1.8} fill="var(--mat-line)" />
        <circle cx={ox + 4.5} cy={cy} r={1.8} fill="var(--mat-line)" />
        <rect x={ox - 1.5} y={cy - 13} width={3} height={4} fill="var(--mat-steel)" />
        <rect x={ox - 1.5} y={cy + 9} width={3} height={4} fill="var(--mat-steel)" />
      </g>
    ) : (
      <g key={ox}>
        {/* NEMA 5-15 face: rounded-square boss, two slots, round ground hole */}
        <rect x={ox - 12} y={cy - 15} width={24} height={30} rx={8} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <rect x={ox - 7} y={cy - 8} width={2.2} height={8} rx={0.6} fill="var(--mat-line)" />
        <rect x={ox + 4.8} y={cy - 8} width={2.2} height={9.5} rx={0.6} fill="var(--mat-line)" />
        <path d={`M${ox - 2.6} ${cy + 9}a2.6 2.6 0 0 1 5.2 0v2.4h-5.2z`} fill="var(--mat-line)" />
        {powered && <circle cx={ox + 8} cy={cy + 11} r={1.2} fill="var(--lamp-green-on)" />}
      </g>
    );

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {isRearView ? (
        <g>
          <rect className="d-steel" x={0} y={cy - 6} width={W} height={12} rx={2} />
          <rect className="d-dark" x={10} y={4} width={W - 20} height={H - 8} rx={4} />
          {/* line side (brass, bottom) and neutral side (silver, top) bus strips with break-off tabs */}
          <Strap d={`M${outletX[0]} ${p('line').y - 7}V${cy + 10}M${outletX[1]} ${p('line_out').y - 7}V${cy + 10}`} live={powered} w={3} />
          {!tabBroken && <rect className="d-brass" x={outletX[0] + 4} y={H - 16} width={outletX[1] - outletX[0] - 8} height={3.5} rx={1.5} />}
          <path d={`M${outletX[0]} ${p('neutral').y + 7}V${cy - 10}M${outletX[1]} ${p('neutral_out').y + 7}V${cy - 10}`} stroke="var(--mat-steel)" strokeWidth={3} strokeLinecap="round" />
          <rect className="d-steel" x={outletX[0] + 4} y={13} width={outletX[1] - outletX[0] - 8} height={3.5} rx={1.5} />
          <Mono x={W / 2} y={H - 19} size={3.6} anchor="middle" fill="var(--mat-brass)">{tabBroken ? 'TAB BROKEN · SPLIT' : 'BRASS TAB'}</Mono>
          <Mono x={W / 2} y={22.5} size={3.6} anchor="middle" onDark>SILVER = N</Mono>
        </g>
      ) : (
        <g>
          <WallPlate w={W} h={H} />
          {outletX.map(outlet)}
          <Silk x={W / 2} y={12} size={4} anchor="middle" bold muted>15A 250V~</Silk>
        </g>
      )}

      <Pill cx={W / 2} cy={H - 9} w={18} label={isRearView ? 'FRONT' : 'REAR'} active={isRearView} title="Flip between the faceplate and the rear wiring (brass = line, silver = neutral)" onToggle={flip} />
      <TermIds device={device} local size={4.2} onDark={isRearView} side={(t) => (t.id === 'ground' ? 'below' : t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
