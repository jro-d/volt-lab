import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, Silk,
  Terminals, TermIds, deviceTag,
} from './kit';

/**
 * Phase-failure / phase-sequence monitoring relay (IEC 60255 style, 3 x sense + supply + changeover output).
 * LEDs: L1 / L2 / L3 show which sense inputs are live, RELAY shows the output state, FAULT names the reason.
 */
export const PhaseMonitorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const ok = !!state.phaseOk;
  const live = (state.phasePresent || {}) as Record<string, boolean>;
  const fault = (state.phaseFault as string | undefined) || '';
  const pct = Number(state.underOverPct) || 10;
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.92);
  const topBayY = tTop - 8;
  const botBayY = botTy - 8;
  const faceY = topBayY + 18;
  const faceH = botBayY - 2 - faceY;
  const cx = W / 2;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={cx} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={8} tag={deviceTag(device) || 'K'} text="PHASE MON" size={4.4} />
      {(['l1', 'l2', 'l3'] as const).map((p, i) => {
        const x = 13 + i * ((W - 26) / 2);
        return (
          <g key={p}>
            <Led cx={x} cy={faceY + 21} r={2} on={!!live[p]} color="green" />
            <Mono x={x} y={faceY + 29} size={3.6} anchor="middle" muted>{p.toUpperCase()}</Mono>
          </g>
        );
      })}
      <Led cx={14} cy={faceY + 40} r={2.2} on={ok} color="green" />
      <Mono x={19} y={faceY + 41.4} size={3.8} muted>RELAY</Mono>
      <Led cx={W - 34} cy={faceY + 40} r={2.2} on={!ok && !!fault} color="red" />
      <Mono x={W - 29} y={faceY + 41.4} size={3.8} muted>FLT</Mono>
      <Mono x={cx} y={faceY + 52} size={3.8} anchor="middle" fill={ok ? 'var(--ok)' : 'var(--danger)'}>{ok ? 'PHASES OK' : fault || 'NO SUPPLY'}</Mono>
      <Silk x={cx} y={faceY + faceH - 4} size={3.8} anchor="middle" muted>{`±${pct}% · ${state.nominalV || 440}V`}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};
