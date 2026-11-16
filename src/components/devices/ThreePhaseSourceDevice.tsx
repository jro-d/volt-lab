import React from 'react';
import { Bay, DeviceProps, Housing, Led, Mono, Nameplate, Screw, Silk, SymEarth, Terminals, TermIds, deviceTag } from './kit';

/** 3-phase supply feeder panel: phase lamps, line-voltage readout and an L1 L2 L3 PE terminal bay. */
export const ThreePhaseSourceDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const on = device.state.energized !== false && device.state.closed !== false;
  const v = device.state.lineVoltage || 440;
  const hz = device.state.frequency || 60;
  const ty = H * (device.terminals[0]?.relY ?? 0.86);
  const bayY = ty - 8;
  const phases = ['l1', 'l2', 'l3'].map((id) => device.terminals.find((t) => t.id === id)!).filter(Boolean);
  const phaseCol = ['var(--cond-red)', 'var(--cond-blue)', 'var(--cond-black)'];

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="shade" rx={4} />
      <rect className="d-housing" x={4} y={4} width={W - 8} height={bayY - 7} rx={2.5} />
      {[8, W - 8].map((sx) => <Screw key={sx} cx={sx} cy={8} r={1.6} />)}
      <Nameplate x={13} y={6} w={W - 26} h={9} tag={deviceTag(device) || 'X'} center={`3Φ ${v}V · ${hz}Hz SUPPLY`} text={on ? 'ON' : 'OFF'} size={5} />

      {/* Phase lamps above each phase terminal */}
      {phases.map((t, i) => {
        const cx = W * t.relX;
        return (
          <g key={t.id}>
            <circle cx={cx} cy={33} r={7} fill="none" stroke={phaseCol[i]} strokeWidth={2} />
            <Led cx={cx} cy={33} r={4} on={on} color="white" />
            <Silk x={cx} y={48} size={5.6} anchor="middle" bold>{['L1', 'L2', 'L3'][i]}</Silk>
            <Mono x={cx} y={54.5} size={3.8} anchor="middle" muted>{`${Math.round(v / Math.sqrt(3))}V`}</Mono>
          </g>
        );
      })}

      {/* Line-voltage readout */}
      {(() => {
        const pe = device.terminals.find((t) => t.id === 'pe');
        const cx = W * (pe?.relX ?? 0.82);
        return (
          <g className="pointer-events-none">
            <rect className="d-console" x={cx - 17} y={23} width={34} height={20} rx={2} />
            <Mono x={cx + 13} y={36} size={9} anchor="end" fill={on ? 'var(--console-readout)' : 'var(--console-muted)'}>{on ? v : '---'}</Mono>
            <Mono x={cx - 14} y={40} size={3.6} fill="var(--console-muted)">V L-L</Mono>
            <SymEarth x={cx} y={46} s={0.7} />
          </g>
        );
      })()}

      <Bay x={4} y={bayY} w={W - 8} h={16} />
      <TermIds device={device} local size={4.6} side={(t) => (t.id === 'pe' ? 'right' : 'left')} />
      <Terminals {...props} local />
    </g>
  );
};
