import React from 'react';
import { Bay, DeviceProps, Mono, Pill, Rocker, Screw, Silk, Strap, Terminals, TermIds, WallPlate, act, makePatch } from './kit';

/**
 * Wall switches: 1-gang 1-way (SPST), 3-way (SPDT, COM → T1/T2) and 4-way intermediate (crossover).
 * Front: plate with rocker. Rear: the mechanism with its internal contacts drawn between the real
 * terminal positions, so students can see which screws are joined. Click the rocker to operate.
 */
export const WallSwitchDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type } = device;
  const patch = makePatch(props);
  const isClosed = !!device.state.closed;
  const position3Way = device.state.position || 'A';
  const cross4Way = !!device.state.crossState;
  const isRearView = device.state.viewMode === 'rear';
  const hasTopTerms = type === 'switch_3way' || type === 'switch_4way';
  const isActive = type === 'switch_1gang' ? isClosed : type === 'switch_3way' ? position3Way === 'A' : cross4Way;

  const toggle = () => {
    if (type === 'switch_1gang') patch({ closed: !isClosed });
    else if (type === 'switch_3way') patch({ position: position3Way === 'A' ? 'B' : 'A' });
    else patch({ crossState: !cross4Way });
  };
  const pt = (id: string) => {
    const t = device.terminals.find((x) => x.id === id);
    return { x: W * (t?.relX ?? 0), y: H * (t?.relY ?? 0) };
  };
  const botY = H * 0.88;
  const topY = H * 0.12;
  const name = type === 'switch_1gang' ? '1-WAY' : type === 'switch_3way' ? '3-WAY' : '4-WAY';
  const mark: [string, string] = type === 'switch_3way' ? ['A', 'B'] : type === 'switch_4way' ? ['╳', '‖'] : ['I', 'O'];

  // Internal contact paths between terminals (rear view)
  const contacts = () => {
    if (type === 'switch_1gang') {
      const a = pt('l_in');
      const b = pt('sw_out');
      const my = H * 0.5;
      return (
        <g>
          <Strap d={`M${a.x} ${a.y - 7}V${my + 6}`} live />
          <Strap d={`M${b.x} ${b.y - 7}V${my + 6}`} live={isClosed} />
          <Strap d={isClosed ? `M${a.x} ${my + 6}L${b.x} ${my + 6}` : `M${a.x} ${my + 6}L${b.x - 6} ${my - 6}`} live w={2} />
          <circle cx={a.x} cy={my + 6} r={1.6} fill="var(--mat-steel)" />
          <circle cx={b.x} cy={my + 6} r={1.6} fill="var(--mat-steel)" />
        </g>
      );
    }
    if (type === 'switch_3way') {
      const c = pt('com');
      const t1 = pt('t1');
      const t2 = pt('t2');
      const my = H * 0.56;
      const tgt = position3Way === 'A' ? t1 : t2;
      return (
        <g>
          <Strap d={`M${c.x} ${c.y + 7}V${H * 0.38}`} live />
          <Strap d={`M${t1.x} ${t1.y - 7}V${my}`} live={position3Way === 'A'} />
          <Strap d={`M${t2.x} ${t2.y - 7}V${my}`} live={position3Way === 'B'} />
          <Strap d={`M${c.x} ${H * 0.38}L${tgt.x} ${my}`} live w={2} />
          <circle cx={t1.x} cy={my} r={1.6} fill="var(--mat-steel)" />
          <circle cx={t2.x} cy={my} r={1.6} fill="var(--mat-steel)" />
        </g>
      );
    }
    const i1 = pt('in_1');
    const i2 = pt('in_2');
    const o1 = pt('out_1');
    const o2 = pt('out_2');
    return cross4Way ? (
      <g>
        <Strap d={`M${i1.x} ${i1.y + 7}L${o2.x} ${o2.y - 7}`} live w={2} />
        <Strap d={`M${i2.x} ${i2.y + 7}L${o1.x} ${o1.y - 7}`} live w={2} />
      </g>
    ) : (
      <g>
        <Strap d={`M${i1.x} ${i1.y + 7}V${o1.y - 7}`} live w={2} />
        <Strap d={`M${i2.x} ${i2.y + 7}V${o2.y - 7}`} live w={2} />
      </g>
    );
  };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {isRearView ? (
        <g>
          {/* Rear: steel strap + moulded mechanism body */}
          <rect className="d-steel" x={W / 2 - 9} y={0} width={18} height={H} rx={2} />
          <rect className="d-dark" x={7} y={hasTopTerms ? 6 : 18} width={W - 14} height={hasTopTerms ? H - 12 : H - 24} rx={3} />
          <Mono x={W / 2} y={H * 0.3} size={4.4} anchor="middle" onDark>{name}</Mono>
          <Mono x={W / 2} y={H * 0.3 + 5.5} size={3.6} anchor="middle" onDark>16A 250V~</Mono>
          {contacts()}
        </g>
      ) : (
        <g>
          <WallPlate w={W} h={H} />
          {!hasTopTerms && <Screw cx={W / 2} cy={11} r={1.8} />}
          <g {...act(toggle)}>
            <title>{`Click the rocker to switch (${name})`}</title>
            <Rocker x={W / 2 - 16} y={H * 0.3} w={32} h={H * 0.38} on={isActive} mark={mark} />
          </g>
          <Silk x={W / 2} y={H * 0.28 - 2} size={4.4} anchor="middle" bold fill="var(--brand)">ROYU</Silk>
        </g>
      )}

      {/* Terminal bays (back-wired screws stay reachable in both views) */}
      {hasTopTerms && <Bay x={8} y={topY - 8} w={W - 16} h={16} />}
      <Bay x={8} y={botY - 8} w={W - 16} h={16} />
      <Pill cx={W - 13} cy={isRearView ? H * 0.75 + 7 : H * 0.72 + 6} w={18} label={isRearView ? 'FRONT' : 'REAR'} active={isRearView} title="Flip between the faceplate and the rear mechanism" onToggle={() => patch({ viewMode: isRearView ? 'front' : 'rear' })} />

      <TermIds device={device} local size={4.4} onDark={isRearView} side={(t) => (t.relX < 0.45 ? 'left' : t.relX > 0.55 ? 'right' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
