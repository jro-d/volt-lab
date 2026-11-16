import React from 'react';
import { Bay, DeviceProps, Housing, LegendPlate, Led, Mono, Nameplate, PushButton, Screw, Silk, SymEarth, Terminals, TermIds, act, deviceTag } from './kit';

/**
 * Direct-on-line motor starter in a steel enclosure: contactor + overload behind the door,
 * START (I) / STOP (O) on the door, RUN and TRIP lamps, and a door-mounted ammeter.
 */
export const MotorStarterDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const running = !!device.state.running;
  const fault = !!device.state.motorFault || !!device.state.tripped;
  const kw = ((device.state.wattage || 2200) / 1000).toFixed(1);
  const setRunning = (next: boolean) => {
    if (onPatchState) onPatchState(device.id, { running: next });
    else {
      device.state.running = next;
      onToggleState?.({ ...device, state: { ...device.state, running: next } });
    }
  };
  const ty = H * (device.terminals[0]?.relY ?? 0.1);
  const bayY = ty - 8;
  const doorY = bayY + 22;
  const doorH = H - doorY - 5;
  const amps = running ? Math.max(0.5, ((device.state.wattage || 2200) / (1.732 * 440 * 0.85))) : 0;
  const needle = (-50 + Math.min(1, amps / 10) * 100) * (Math.PI / 180);
  const meter = { cx: W - 36, cy: doorY + 40 };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Steel enclosure with gland plate on top */}
      <Housing w={W} h={H} m="shade" rx={4} />
      <Bay x={4} y={bayY} w={W - 8} h={16} />
      <rect className="d-housing" x={5} y={doorY} width={W - 10} height={doorH} rx={3} />
      {/* door hinges + quarter-turn lock */}
      <rect className="d-steel" x={2} y={doorY + 10} width={4} height={12} rx={1} />
      <rect className="d-steel" x={2} y={doorY + doorH - 22} width={4} height={12} rx={1} />
      <circle cx={W - 10} cy={doorY + doorH / 2} r={3.2} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={0.7} />
      <path d={`M${W - 12} ${doorY + doorH / 2}h4`} stroke="var(--mat-line)" strokeWidth={1.1} strokeLinecap="round" />

      <Nameplate x={11} y={doorY + 5} w={W - 22} h={10} tag={deviceTag(device) || 'Q'} center="DOL STARTER" text={`${kw} kW`} size={5.2} />

      {/* Status lamps */}
      <Led cx={22} cy={doorY + 27} r={3.2} on={running && !fault} color="green" />
      <Silk x={22} y={doorY + 36} size={4.2} anchor="middle" muted>RUN</Silk>
      <Led cx={40} cy={doorY + 27} r={3.2} on={fault} color="amber" />
      <Silk x={40} y={doorY + 36} size={4.2} anchor="middle" muted>TRIP</Silk>

      {/* Door ammeter (72 mm, 0–10 A) */}
      <g className="pointer-events-none">
        <rect className="d-dark" x={meter.cx - 18} y={meter.cy - 18} width={36} height={30} rx={2} />
        <rect x={meter.cx - 15} y={meter.cy - 15} width={30} height={22} rx={1.2} fill="var(--mat-porcelain)" />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = (-50 + i * 10 - 90) * (Math.PI / 180);
          return <path key={i} d={`M${meter.cx + Math.cos(a) * 11} ${meter.cy + 4 + Math.sin(a) * 11}L${meter.cx + Math.cos(a) * (i % 5 ? 12.5 : 14)} ${meter.cy + 4 + Math.sin(a) * (i % 5 ? 12.5 : 14)}`} stroke="var(--mat-line)" strokeWidth={0.5} />;
        })}
        <path d={`M${meter.cx} ${meter.cy + 4}L${meter.cx + Math.sin(needle) * 13} ${meter.cy + 4 - Math.cos(needle) * 13}`} stroke="var(--act-red)" strokeWidth={0.8} style={{ transition: 'all 300ms ease-out' }} />
        <circle cx={meter.cx} cy={meter.cy + 4} r={1.2} fill="var(--mat-line)" />
        <Mono x={meter.cx} y={meter.cy + 1} size={3.4} anchor="middle">A</Mono>
        <Mono x={meter.cx} y={meter.cy + 19} size={3.8} anchor="middle">{`${amps.toFixed(1)} A`}</Mono>
      </g>

      {/* START / STOP */}
      <LegendPlate cx={30} y={doorY + 47} w={26} text="START" />
      <g {...act(() => setRunning(true))}>
        <title>START motor (I)</title>
        <PushButton cx={30} cy={doorY + 66} r={9} color="green" legend="I" pressed={running} />
      </g>
      <LegendPlate cx={64} y={doorY + 47} w={26} text="STOP" />
      <g {...act(() => setRunning(false))}>
        <title>STOP motor (O)</title>
        <PushButton cx={64} cy={doorY + 66} r={9} color="red" legend="O" guard />
      </g>

      {/* Rating label */}
      <rect className="d-shade" x={11} y={doorY + doorH - 15} width={W - 32} height={10} rx={1} />
      <Mono x={15} y={doorY + doorH - 8.6} size={3.8}>{`400–440V 3~ · ${kw}kW · AC-3 · IP55`}</Mono>
      <Screw cx={9} cy={bayY + 20} r={1.4} />
      <SymEarth x={W - 16} y={doorY + doorH - 15} s={0.55} />

      <TermIds device={device} local size={4.4} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
