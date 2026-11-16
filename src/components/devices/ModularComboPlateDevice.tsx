import React from 'react';
import { DeviceProps, Led, Mono, Pill, Rocker, Screw, Silk, Strap, Terminals, TermIds, WallPlate, act, makePatch } from './kit';

/**
 * Wide-series combination plate: switch (top), pilot neon or second switch (middle),
 * duplex-style receptacle (bottom). Front shows the modules; rear shows the snap-in strap and
 * each module's terminals. Click a rocker to switch; REAR / FRONT flips the view.
 */
export const ModularComboPlateDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const patch = makePatch(props);
  const isRearView = device.state.viewMode === 'rear';
  const sw1 = device.state.switchClosed !== false && device.state.closed !== false;
  const sw2 = !!device.state.switch2Closed;
  const slot2Pilot = device.state.comboSlot2 !== 'switch2';
  const pilotLit = !!device.state.pilotLit;
  const recPowered = !!device.state.receptaclePowered;
  const p = (id: string) => {
    const t = device.terminals.find((x) => x.id === id);
    return { x: W * (t?.relX ?? 0), y: H * (t?.relY ?? 0) };
  };
  const cx = W / 2;
  const m1 = p('sw_in').y;
  const m2 = p('pilot_l').y;
  const m3 = p('rec_l').y;
  // One recessed pocket per back-wired screw (drawn under the modules)
  const pockets = device.terminals.map((t) => (
    <rect key={t.id} className="d-shade" x={W * t.relX - 8} y={H * t.relY - 8} width={16} height={16} rx={2.5} />
  ));

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {isRearView ? (
        <g>
          <rect className="d-steel" x={cx - 10} y={0} width={20} height={H} rx={2} />
          {[m1, m2, m3 - 6].map((my, i) => (
            <rect key={i} className="d-dark" x={7} y={my - 15} width={W - 14} height={i === 2 ? 40 : 30} rx={3} />
          ))}
          {pockets}
          <Strap d={`M${p('sw_in').x + 7} ${m1}H${p('sw_out').x - 7}`} live={sw1} w={2} />
          <Mono x={cx} y={m1 + 11} size={3.6} anchor="middle" onDark>{sw1 ? 'SW CLOSED' : 'SW OPEN'}</Mono>
          <Mono x={cx} y={m2 + 11} size={3.6} anchor="middle" onDark>{slot2Pilot ? 'NEON 230V' : sw2 ? 'SW2 CLOSED' : 'SW2 OPEN'}</Mono>
          <Mono x={cx} y={m3 - 12} size={3.6} anchor="middle" onDark>RECEPTACLE 15A</Mono>
        </g>
      ) : (
        <g>
          <WallPlate w={W} h={H} />
          {pockets}
          <Screw cx={cx} cy={(m1 + m2) / 2 + 1} r={1.5} />
          <Screw cx={cx} cy={(m2 + m3) / 2 - 4} r={1.5} />
          {/* Module 1: switch */}
          <g {...act(() => patch({ switchClosed: !sw1, closed: !sw1 }))}>
            <title>Click to switch the lighting circuit</title>
            <Rocker x={cx - 10} y={m1 - 11} w={20} h={22} on={sw1} />
          </g>
          {/* Module 2: pilot neon or switch 2 */}
          {slot2Pilot ? (
            <g className="pointer-events-none">
              <rect x={cx - 10} y={m2 - 9} width={20} height={18} rx={2.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
              <Led cx={cx} cy={m2} r={4} on={pilotLit} color="red" />
              <Silk x={cx} y={m2 + 14} size={3.6} anchor="middle" muted>PILOT</Silk>
            </g>
          ) : (
            <g {...act(() => patch({ switch2Closed: !sw2 }))}>
              <title>Click to switch circuit 2</title>
              <Rocker x={cx - 10} y={m2 - 11} w={20} h={22} on={sw2} />
            </g>
          )}
          {/* Module 3: receptacle */}
          <rect x={cx - 13} y={m3 - 23} width={26} height={22} rx={7} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <rect x={cx - 7.5} y={m3 - 18} width={2.2} height={7.5} rx={0.6} fill="var(--mat-line)" />
          <rect x={cx + 5.3} y={m3 - 18} width={2.2} height={9} rx={0.6} fill="var(--mat-line)" />
          <path d={`M${cx - 2.4} ${m3 - 6}a2.4 2.4 0 0 1 4.8 0v2h-4.8z`} fill="var(--mat-line)" />
          {recPowered && <circle cx={cx + 10} cy={m3 - 4} r={1.2} fill="var(--lamp-green-on)" />}
          <Silk x={cx} y={7.6} size={4} anchor="middle" bold muted>250V~</Silk>
        </g>
      )}
      <Pill cx={W - 15} cy={H - 4} w={18} label={isRearView ? 'FRONT' : 'REAR'} active={isRearView} title="Flip between the plate and the rear snap-in strap" onToggle={() => patch({ viewMode: isRearView ? 'front' : 'rear' })} />
      <TermIds device={device} local size={3.8} onDark={isRearView} side={(t) => (t.id === 'rec_pe' ? 'left' : t.relX < 0.5 ? 'left' : 'right')} text={(t) => (t.label || t.id).replace(/^(SW|PL|REC)_/, '')} />
      <Terminals {...props} local />
    </g>
  );
};
