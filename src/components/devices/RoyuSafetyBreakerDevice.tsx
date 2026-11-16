import React from 'react';
import { Bay, DeviceProps, Flag, Housing, Lever, Mono, Nameplate, Screw, Silk, SymEarth, Terminals, TermIds, act, deviceTag, makePatch } from './kit';

/**
 * ROYU 2P safety breaker in a surface enclosure (residential ACU / water-heater disconnect).
 * Closed cover: the lever shows through the cover window. Open cover: the bolt-on breaker,
 * copper stabs and lugs are visible. Click COVER to open/close; click the lever to switch.
 */
export const RoyuSafetyBreakerDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const patch = makePatch(props);
  const isTripped = !!device.state.tripped;
  const isClosed = !!device.state.closed && !isTripped;
  const ratedAmps = device.state.ratedAmps || 30;
  const isCoverOpen = !!device.state.enclosureCoverOpen;
  const toggle = () => (isTripped ? patch({ tripped: false, closed: true }) : patch({ closed: !device.state.closed }));
  const pos = isTripped ? 0.5 : isClosed ? 0 : 1;

  const tTop = H * 0.1;
  const bayH = tTop * 2 - 2;
  const botBayY = H - 2 - bayH;
  const coverY = 2 + bayH + 3;
  const coverH = botBayY - 3 - coverY;
  const cx = W / 2;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Enclosure back box with mounting ears */}
      <rect className="d-shade" x={-3} y={H / 2 - 10} width={4} height={20} rx={1.5} />
      <rect className="d-shade" x={W - 1} y={H / 2 - 10} width={4} height={20} rx={1.5} />
      <Housing w={W} h={H} />
      <Bay x={3} y={2} w={W - 6} h={bayH} />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} />

      {isCoverOpen ? (
        /* Interior: bolt-on 2P breaker on copper stabs */
        <g>
          <rect className="d-shade" x={6} y={coverY} width={W - 12} height={coverH} rx={2} />
          <path d={`M${W * 0.28} ${coverY}V${coverY + 10}M${W * 0.72} ${coverY}V${coverY + 10}`} stroke="var(--mat-copper)" strokeWidth={3} />
          <rect className="d-dark" x={14} y={coverY + 10} width={W - 28} height={coverH - 22} rx={2} />
          <Nameplate x={16} y={coverY + 12} w={W - 32} h={7} tag={deviceTag(device)} text={`2P ${ratedAmps}A`} size={4.6} />
          <g {...act(toggle)}>
            <title>Click the lever to switch (or reset a trip)</title>
            <Lever cx={cx} y={coverY + 22} slotH={24} w={20} pos={pos} color="var(--act-black)" />
          </g>
          <Flag cx={cx} y={coverY + 49} state={isTripped ? 'trip' : isClosed ? 'on' : 'off'} />
          {/* load-side lugs */}
          {[W * 0.28, W * 0.72].map((lx) => (
            <g key={lx} className="pointer-events-none">
              <rect className="d-copper" x={lx - 5} y={coverY + coverH - 11} width={10} height={7} rx={1} />
              <circle cx={lx} cy={coverY + coverH - 7.5} r={2} fill="var(--mat-copper-dark)" />
            </g>
          ))}
          <Silk x={cx} y={coverY + coverH - 13} size={4} anchor="middle" muted>LUGS</Silk>
        </g>
      ) : (
        /* Front cover with lever window */
        <g>
          <rect className="d-face" x={6} y={coverY} width={W - 12} height={coverH} rx={3} />
          <Screw cx={11} cy={coverY + 5} r={1.8} />
          <Screw cx={W - 11} cy={coverY + 5} r={1.8} />
          <Screw cx={11} cy={coverY + coverH - 5} r={1.8} />
          <Screw cx={W - 11} cy={coverY + coverH - 5} r={1.8} />
          <rect className="d-nameplate" x={14} y={coverY + 4} width={W - 28} height={9} rx={1.5} />
          <Silk x={18} y={coverY + 10.6} size={5.6} bold fill="var(--brand)">ROYU</Silk>
          <Mono x={W - 18} y={coverY + 10.4} size={4.6} anchor="end" onDark>{deviceTag(device)}</Mono>
          <Silk x={cx} y={coverY + 21} size={5} anchor="middle" bold>SAFETY BREAKER</Silk>
          {/* window */}
          <rect x={cx - 15} y={coverY + 24} width={30} height={30} rx={2.5} fill="var(--mat-line)" />
          <g {...act(toggle)}>
            <title>Click the lever to switch (or reset a trip)</title>
            <Lever cx={cx} y={coverY + 26} slotH={26} w={20} pos={pos} />
          </g>
          <Flag cx={cx} y={coverY + 57} state={isTripped ? 'trip' : isClosed ? 'on' : 'off'} />
          <Mono x={cx - 14} y={coverY + 69} size={4} anchor="start">{`2P ${ratedAmps}A 240V~`}</Mono>
          
        </g>
      )}

      {/* COVER toggle tab */}
      <g {...act(() => patch({ enclosureCoverOpen: !isCoverOpen }))}>
        <title>{isCoverOpen ? 'Close the front cover' : 'Open the cover to see the breaker and lugs'}</title>
        <rect x={W - 30} y={coverY + coverH - 15} width={20} height={7} rx={3.5} fill={isCoverOpen ? 'var(--act-blue)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.7} />
        <Silk x={W - 20} y={coverY + coverH - 10.3} size={4} anchor="middle" bold fill={isCoverOpen ? 'var(--on-act)' : undefined}>COVER</Silk>
      </g>
      <SymEarth x={cx} y={botBayY - 1} s={0.5} />

      <TermIds device={device} local size={4.6} side={(t) => (t.relX < 0.4 ? 'left' : t.relX > 0.6 ? 'right' : 'above')} />
      <Terminals {...props} local />
    </g>
  );
};
