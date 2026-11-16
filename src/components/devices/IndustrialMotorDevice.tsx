import React from 'react';
import { DeviceProps, Mono, Screw, Silk, Terminals, TermIds, deviceTag } from './kit';

/**
 * 3-phase squirrel-cage induction motor, TEFC, side view: terminal box, finned cast frame,
 * fan cowl, shaft and feet. 4-lead (U1 V1 W1 PE) or 6-lead star-delta (+ W2 U2 V2) with the
 * star / delta links drawn in copper. Rotation shows as an arrow and a direction chip.
 */
export const IndustrialMotorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const isStarDelta = device.type === 'motor_6lead_star_delta';
  const isRunning = !!(device.state.motorRunning || device.state.running);
  const dir: 'CW' | 'CCW' | null = device.state.motorDirection || (isRunning ? 'CW' : null);
  const starterMode: 'wye' | 'delta' | null = device.state.starterMode || null;
  const fault: string | null = device.state.motorFault || null;
  const rpm = device.state.motorRpm || (isStarDelta ? 1760 : 1750);
  const hp = device.state.motorHp || (device.state.wattage ? +(device.state.wattage / 746).toFixed(1) : isStarDelta ? 7.5 : 3);
  const amps = device.state.measuredAmps || 0;
  const kw = (hp * 0.746).toFixed(1);

  const t = (id: string) => device.terminals.find((x) => x.id === id);
  const at = (id: string) => ({ x: W * (t(id)?.relX ?? 0), y: H * (t(id)?.relY ?? 0) });
  const rowY = H * (device.terminals[0]?.relY ?? 0.2);
  const lastRowY = isStarDelta ? at('u2').y : rowY;
  const boxX = (isStarDelta ? at('w2').x : at('u1').x) - 13;
  const boxY = rowY - 13;
  const boxW = at('pe').x + 19 - boxX;
  const boxH = lastRowY + 12 - boxY;

  const bodyY = boxY + boxH + 2;
  const feetH = 9;
  const bodyH = H - bodyY - feetH - 1;
  const shaftW = 14;
  const cowlW = 16;
  const bodyX = shaftW;
  const bodyW = W - shaftW - cowlW;
  const cy = bodyY + bodyH / 2;
  const runCol = fault ? 'var(--danger)' : isRunning ? 'var(--ok)' : 'var(--silk-muted)';

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Feet */}
      <path className="d-cast" d={`M${bodyX + 6} ${bodyY + bodyH - 4}l-3 ${feetH + 3}h22l-3 ${-feetH - 3}zM${bodyX + bodyW - 26} ${bodyY + bodyH - 4}l-3 ${feetH + 3}h22l-3 ${-feetH - 3}z`} />
      <path d={`M${bodyX + 5} ${H - 3}h18M${bodyX + bodyW - 27} ${H - 3}h18`} stroke="var(--mat-line)" strokeWidth={0.5} />

      {/* Shaft with key */}
      <rect className="d-steel" x={2} y={cy - 5} width={shaftW + 2} height={10} rx={1.2} />
      <rect x={4} y={cy - 1.4} width={8} height={2.8} rx={0.6} fill="var(--mat-steel-dark)" />
      {/* Drive-end shield */}
      <rect className="d-cast" x={bodyX - 2} y={bodyY + 3} width={6} height={bodyH - 6} rx={2} />

      {/* Finned frame */}
      <rect className="d-cast" x={bodyX + 2} y={bodyY} width={bodyW - 2} height={bodyH} rx={5} />
      {Array.from({ length: 7 }).map((_, i) => (
        <path key={i} d={`M${bodyX + 6} ${bodyY + 5 + i * ((bodyH - 10) / 6)}H${bodyX + bodyW - 4}`} stroke="var(--mat-cast-dark)" strokeWidth={1.1} strokeLinecap="round" />
      ))}
      {/* Lifting eye */}
      <circle cx={bodyX + bodyW * 0.5} cy={bodyY - 1} r={3.4} fill="none" stroke="var(--mat-cast-dark)" strokeWidth={1.6} />

      {/* Fan cowl (non-drive end) with grille */}
      <path className="d-cast" d={`M${W - cowlW - 1} ${bodyY + 2}h${cowlW - 4}q5 0 5 6v${bodyH - 16}q0 6 -5 6h${-cowlW + 4}z`} />
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={i} d={`M${W - cowlW + 3} ${bodyY + 8 + i * ((bodyH - 16) / 5)}h${cowlW - 7}`} stroke="var(--mat-line)" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
      ))}

      {/* Riveted nameplate */}
      <g className="pointer-events-none">
        <rect x={bodyX + 10} y={cy - 15} width={bodyW - 22} height={30} rx={1.5} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <rect x={bodyX + 12} y={cy - 13} width={bodyW - 26} height={26} rx={1} fill="var(--mat-porcelain)" />
        {[[bodyX + 13.2, cy - 12], [bodyX + bodyW - 15.2, cy - 12], [bodyX + 13.2, cy + 12], [bodyX + bodyW - 15.2, cy + 12]].map(([rx, ry], i) => (
          <circle key={i} cx={rx} cy={ry} r={0.8} fill="var(--mat-steel-dark)" />
        ))}
        <Silk x={bodyX + 15} y={cy - 7} size={4.6} bold>{`3~ MOTOR ${deviceTag(device) || 'M'}`}</Silk>
        <Mono x={bodyX + bodyW - 16} y={cy - 7} size={3.6} anchor="end" muted>IE3</Mono>
        <Mono x={bodyX + 15} y={cy - 1} size={3.8}>{`${kw}kW ${hp}HP ${isStarDelta ? 'Δ440/Y760V' : 'Δ440V'}`}</Mono>
        <Mono x={bodyX + 15} y={cy + 4.6} size={3.6} muted>{`${rpm} min⁻¹ · 60Hz · IP55`}</Mono>
        <Mono x={bodyX + 15} y={cy + 10.4} size={3.8} weight={700} fill={runCol}>
          {fault
            ? `FAULT ${fault.split(' (')[0]}`.slice(0, 26)
            : isRunning
            ? `${starterMode === 'wye' ? 'STAR · ' : starterMode === 'delta' ? 'DELTA · ' : ''}${amps > 0 ? amps.toFixed(1) + ' A' : `${rpm} RPM`}`
            : 'STOPPED'}
        </Mono>
      </g>

      {/* Rotation arrow on the drive end + direction chip */}
      <g className="pointer-events-none">
        <path
          d={dir === 'CCW' ? `M9 ${cy - 10}a10 10 0 0 0 0 20` : `M9 ${cy + 10}a10 10 0 0 1 0 -20`}
          fill="none"
          stroke={runCol}
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={isRunning ? 1 : 0.5}
        />
        <path d={dir === 'CCW' ? `M9 ${cy + 10}l3 -1.6M9 ${cy + 10}l2 2.6` : `M9 ${cy - 10}l3 1.6M9 ${cy - 10}l2 -2.6`} stroke={runCol} strokeWidth={1.3} strokeLinecap="round" opacity={isRunning ? 1 : 0.5} />
        {isRunning && dir && (
          <g>
            <rect x={bodyX + 10} y={bodyY + bodyH - 10} width={30} height={7} rx={1.2} fill="var(--nameplate)" />
            <Mono x={bodyX + 25} y={bodyY + bodyH - 5} size={4} anchor="middle" fill={starterMode === 'wye' ? 'var(--console-warning)' : 'var(--console-readout)'}>
              {starterMode === 'wye' ? 'Y START' : starterMode === 'delta' ? 'Δ RUN' : `${dir} RUN`}
            </Mono>
          </g>
        )}
      </g>

      {/* Terminal box */}
      <rect className="d-cast" x={boxX} y={boxY} width={boxW} height={boxH} rx={3} />
      <rect className="d-dark-face" x={boxX + 3} y={boxY + 3} width={boxW - 6} height={boxH - 6} rx={2} />
      <Screw cx={boxX + 4.5} cy={boxY + 4.5} r={1.4} m="dark" />
      <Screw cx={boxX + boxW - 4.5} cy={boxY + 4.5} r={1.4} m="dark" />
      {/* cable gland */}
      <rect className="d-rubber" x={boxX + boxW} y={boxY + boxH / 2 - 4} width={5} height={8} rx={1.2} />

      {/* Star / delta links (copper) */}
      {isStarDelta && starterMode === 'wye' && (
        <rect x={at('w2').x - 4} y={at('w2').y - 2} width={at('v2').x - at('w2').x + 8} height={4} rx={1.5} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={0.6} />
      )}
      {isStarDelta && starterMode === 'delta' &&
        [['u1', 'w2'], ['v1', 'u2'], ['w1', 'v2']].map(([a, b]) => (
          <rect key={a} x={at(a).x - 2} y={at(a).y} width={4} height={at(b).y - at(a).y} rx={1.5} fill="var(--mat-copper)" stroke="var(--mat-copper-dark)" strokeWidth={0.6} />
        ))}
      {isStarDelta && (
        <Mono x={boxX + boxW - 6} y={boxY + boxH - 5} size={3.8} anchor="end" onDark>
          {starterMode === 'wye' ? 'Y' : starterMode === 'delta' ? 'Δ' : 'Y/Δ'}
        </Mono>
      )}

      <TermIds device={device} local size={4.2} onDark side={() => 'right'} />
      <Terminals {...props} local />
    </g>
  );
};
