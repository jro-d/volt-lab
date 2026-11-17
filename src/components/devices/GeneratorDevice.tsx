import React from 'react';
import {
  Bay, DeviceProps, Face, Housing, Led, Mono, Nameplate, Screw, Silk,
  Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';
import { GENERATOR_START_DELAY_SEC } from '../../core/behaviors/generator';

/**
 * Generating set (ISO 8528-1): alternator and engine block with a control panel. START / STOP button,
 * RUN / STARTING / OVERLOAD lamps and a load bar against the rated kVA.
 */
export const GeneratorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const is3p = device.type === 'generator_set_3p';
  const running = !!state.running && !state.overloaded;
  const overloaded = !!state.overloaded;
  const requested = !!state.runRequested || !!state.remoteStart;
  const starting = requested && !running && !overloaded;
  const startSec = Math.min(GENERATOR_START_DELAY_SEC, Number(state.startSec) || 0);
  const ratedKva = Number(state.ratedKva) || (is3p ? 20 : 5);
  const volts = Number(state.voltage) || (is3p ? 440 : 230);
  const hz = Number(state.frequencyHz) || 60;
  const loadKw = Number(state.loadKw) || 0;
  const loadFrac = Math.min(1.2, loadKw / ratedKva);
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.92);
  const topBayY = tTop - 8;
  const botBayY = botTy - 8;
  const faceY = topBayY + 18;
  const faceH = botBayY - 2 - faceY;
  const tag = deviceTag(device) || 'G';
  const panelW = W - 18;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="steel" rx={5} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={tag} center={is3p ? 'GEN SET 3Φ' : 'GEN SET 1Φ'} text={`${ratedKva} kVA`} size={5} />

      {/* engine block + alternator drawing */}
      <g className="pointer-events-none">
        <rect x={9} y={faceY + 16} width={panelW * 0.55} height={26} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <rect x={9 + panelW * 0.55 + 2} y={faceY + 20} width={panelW * 0.4} height={18} rx={9} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <path d={`M${14} ${faceY + 24}h${panelW * 0.4}M${14} ${faceY + 29}h${panelW * 0.4}M${14} ${faceY + 34}h${panelW * 0.4}`} stroke="var(--mat-line-soft)" strokeWidth={0.8} />
        {running && <circle cx={9 + panelW * 0.55 + 2 + panelW * 0.2} cy={faceY + 29} r={5} fill="none" stroke="var(--ok)" strokeWidth={1.2} strokeDasharray="3 2" />}
        <Screw cx={13} cy={faceY + 19} r={1.4} />
        <Screw cx={W - 13} cy={faceY + 19} r={1.4} />
      </g>

      {/* lamps */}
      <Led cx={14} cy={faceY + 52} r={2.2} on={running} color="green" />
      <Mono x={19} y={faceY + 53.4} size={3.8} muted>RUN</Mono>
      <Led cx={W / 2 - 4} cy={faceY + 52} r={2.2} on={starting} color="amber" />
      <Mono x={W / 2 + 1} y={faceY + 53.4} size={3.8} muted>START</Mono>
      <Led cx={W - 38} cy={faceY + 52} r={2.2} on={overloaded} color="red" />
      <Mono x={W - 33} y={faceY + 53.4} size={3.8} muted>OVLD</Mono>

      {/* start / stop */}
      <g {...act(() => patch({ runRequested: !state.runRequested, ...(state.runRequested ? {} : { overloaded: false, overloadSec: 0 }) }))}>
        <title>{state.runRequested ? 'Click to stop the set' : 'Click to start the set (3 s start delay)'}</title>
        <rect x={9} y={faceY + 60} width={52} height={14} rx={3} fill={state.runRequested ? 'var(--act-red)' : 'var(--act-green)'} stroke="var(--mat-line)" strokeWidth={0.9} />
        <Silk x={35} y={faceY + 69.4} size={5.4} anchor="middle" bold onDark>{state.runRequested ? 'STOP' : 'START'}</Silk>
      </g>
      <Mono x={W - 9} y={faceY + 67} size={4.4} anchor="end">{starting ? `${startSec.toFixed(1)} / ${GENERATOR_START_DELAY_SEC} s` : `${volts}V ${hz}Hz`}</Mono>
      <Mono x={W - 9} y={faceY + 73.5} size={3.8} anchor="end" muted>{state.remoteStart ? 'REMOTE START' : state.runRequested ? 'MANUAL RUN' : 'STANDBY'}</Mono>

      {/* load bar */}
      <rect x={9} y={faceY + faceH - 11} width={W - 18} height={4} rx={2} fill="var(--mat-line-soft)" />
      {loadFrac > 0 && <rect x={9} y={faceY + faceH - 11} width={(W - 18) * Math.min(1, loadFrac / 1.2)} height={4} rx={2} fill={loadFrac > 1 ? 'var(--act-red)' : 'var(--ok)'} />}
      <Mono x={9} y={faceY + faceH - 14} size={3.6} muted>{`LOAD ${loadKw.toFixed(2)} kW`}</Mono>

      <TermIds device={device} local size={4} side={() => 'right'} text={(t) => (t.label || t.id).replace('START ', 'ST-')} />
      <Terminals {...props} local />
    </g>
  );
};
