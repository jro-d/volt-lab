import React from 'react';
import { Bay, DeviceProps, Housing, Led, Mono, Nameplate, SealHole, Silk, Terminals, TermIds, deviceTag } from './kit';

/**
 * Single-phase revenue kWh meter (IEC 62053-21, class 1): hanging hook, clear cover over an LCD
 * register, 1600 imp/kWh test LED that blinks while energized, sealed terminal cover below.
 */
export const KwhMeterDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const three = device.type === 'kwh_meter_3p';
  const on = device.state.energized !== false;
  const kwh = Number(device.state.kwh ?? 0);
  const v = device.state.voltageIn || 230;
  const hz = device.state.frequency || 60;
  const ty = H * (device.terminals[0]?.relY ?? 0.9);
  const bayY = ty - 9;
  const coverY = bayY - 22;
  const cx = W / 2;
  const reading = three ? kwh.toFixed(2).padStart(8, '0') : kwh.toFixed(1).padStart(7, '0');

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* hanging hook */}
      <path d={`M${cx - 6} 2V-3a6 6 0 0 1 12 0V2`} fill="none" stroke="var(--mat-steel-dark)" strokeWidth={2} />
      <Housing w={W} h={H} m="light" rx={5} />
      {/* clear cover outline */}
      <rect x={4} y={4} width={W - 8} height={coverY - 6} rx={4} fill="var(--mat-housing-shade)" opacity={0.35} stroke="var(--mat-line-soft)" strokeWidth={0.6} />
      <Nameplate x={10} y={10} w={W - 20} h={9} tag={deviceTag(device) || 'P'} center={three ? 'kWh METER 3Φ' : 'kWh METER'} text="CL.1" size={5} />

      {/* LCD register */}
      <rect className="d-dark-face" x={14} y={24} width={W - 28} height={30} rx={2.5} />
      <rect className="d-lcd" x={17} y={27} width={W - 34} height={24} rx={1.5} />
      <Mono x={W - 36} y={45} size={12} anchor="end" fill={on ? 'var(--lcd-ink)' : 'var(--mat-line-soft)'}>{reading}</Mono>
      <Mono x={W - 21} y={45} size={5} anchor="end" fill="var(--lcd-ink)">kWh</Mono>
      <Mono x={20} y={33} size={3.8} fill="var(--lcd-ink)">{on ? 'T1 ▸' : 'NO V'}</Mono>

      {/* Test LED + optical port */}
      <Led cx={24} cy={66} r={2.2} on={on} color="red" />
      {three ? (
        <Mono x={30} y={67.6} size={4.2}>{`L1 ${Number(device.state.l1Amps || 0).toFixed(1)}A  L2 ${Number(device.state.l2Amps || 0).toFixed(1)}A  L3 ${Number(device.state.l3Amps || 0).toFixed(1)}A`}</Mono>
      ) : (
        <Mono x={30} y={67.6} size={4.2}>1600 imp/kWh</Mono>
      )}
      <circle cx={W - 24} cy={66} r={7} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={0.8} />
      <circle cx={W - 24} cy={66} r={3} fill="var(--mat-line)" />
      <Silk x={W - 24} y={77.5} size={3.6} anchor="middle" muted>OPTO</Silk>

      {/* Rating plate */}
      <rect className="d-face" x={14} y={84} width={W - 28} height={coverY - 92} rx={1.5} />
      <Mono x={18} y={91} size={4.2}>{three ? `${v}V  10(100)A  ${hz}Hz` : `${v}V  10(60)A  ${hz}Hz`}</Mono>
      <Mono x={18} y={97.5} size={3.6} muted>{three ? 'IEC 62053-21 · 3Φ 4W' : 'IEC 62053-21 · 1Φ 2W'}</Mono>
      <Silk x={18} y={105} size={3.8} muted>UTILITY REVENUE METER</Silk>
      {/* barcode */}
      {Array.from({ length: 22 }).map((_, i) => (
        <rect key={i} x={W - 46 + i * 1.4} y={99} width={(i * 7) % 3 === 0 ? 0.9 : 0.5} height={7} fill="var(--mat-line)" />
      ))}

      {/* Terminal cover with seal */}
      <rect className="d-shade" x={3} y={coverY} width={W - 6} height={H - coverY - 3} rx={3} />
      <SealHole cx={10} cy={coverY + 6} />
      <SealHole cx={W - 10} cy={coverY + 6} />
      <Bay x={6} y={bayY} w={W - 12} h={18} />

      <TermIds device={device} local size={4} gap={4.6} text={(t) => (t.label || t.id).replace('_', ' ')} />
      <Terminals {...props} local />
    </g>
  );
};
