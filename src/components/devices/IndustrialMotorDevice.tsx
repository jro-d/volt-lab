import React from 'react';
import { DeviceProps, Mono, Screw, Silk, Terminals, TermIds, deviceTag } from './kit';

/** End-on foreshortening: circles on the drive end are drawn as ellipses this wide. */
const K = 0.4;
/** Seconds per visual revolution of the coupling (not real speed: 1750 rpm would strobe). */
const SPIN_FULL = 0.42;
const SPIN_STAR = 0.85;

/** Keep whole words up to max characters. */
const fitWords = (text: string, max: number) => {
  let out = '';
  for (const w of text.split(' ')) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  return out || text.slice(0, max);
};

const pt = (cx: number, cy: number, rx: number, ry: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
};

/**
 * 3-phase squirrel-cage induction motor, TEFC, three-quarter view from the drive end:
 * terminal box on a pedestal, finned cast frame, drive-end shield with bearing cap, keyed
 * shaft and coupling hub, fan cowl behind, bolted feet. 4-lead (U1 V1 W1 PE) or 6-lead
 * star-delta (+ W2 U2 V2) with the star / delta links drawn in copper.
 *
 * While running, the coupling hub turns (CW or CCW as seen from the drive end, slower in
 * star). Stopping pauses it where it is rather than snapping back.
 */
export const IndustrialMotorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const isStarDelta = device.type === 'motor_6lead_star_delta';
  const fault: string | null = device.state.motorFault || null;
  const isRunning = !fault && !!(device.state.motorRunning || device.state.running);
  const dir: 'CW' | 'CCW' | null = device.state.motorDirection || (isRunning ? 'CW' : null);
  const starterMode: 'wye' | 'delta' | null = device.state.starterMode || null;
  const rpm = device.state.motorRpm || (isStarDelta ? 1760 : 1750);
  const hp = device.state.motorHp || (device.state.wattage ? +(device.state.wattage / 746).toFixed(1) : isStarDelta ? 7.5 : 3);
  const amps = device.state.measuredAmps || 0;
  const kw = (hp * 0.746).toFixed(1);

  /* Terminal box geometry follows the catalogue terminals (unchanged from v2). */
  const t = (id: string) => device.terminals.find((x) => x.id === id);
  const at = (id: string) => ({ x: W * (t(id)?.relX ?? 0), y: H * (t(id)?.relY ?? 0) });
  const rowY = H * (device.terminals[0]?.relY ?? 0.2);
  const lastRowY = isStarDelta ? at('u2').y : rowY;
  const boxX = (isStarDelta ? at('w2').x : at('u1').x) - 13;
  const boxY = rowY - 13;
  const boxW = at('pe').x + 19 - boxX;
  const boxH = lastRowY + 12 - boxY;

  /* Frame: a cylinder seen from the drive end. */
  const feetH = 9;
  const bodyTop = boxY + boxH + 3;
  const bodyBot = H - feetH - 1;
  const ry = (bodyBot - bodyTop) / 2;
  const rx = ry * K;
  const cy = bodyTop + ry;
  const hubR = ry * 0.5;
  const hubT = 4;
  const hubX = hubR * K + 3;
  const shaftR = hubR * 0.34;
  const ex = hubX + hubT + 6 + rx; // drive-end shield centre
  const ryc = ry * 0.9; // fan cowl
  const rxc = ryc * K;
  const xc = W - rxc - 1;
  const xc0 = xc - 18; // where the frame ends and the cowl starts

  const runCol = fault ? 'var(--danger)' : isRunning ? 'var(--ok)' : 'var(--silk-muted)';
  const fins = Array.from({ length: 9 }, (_, i) => ((i + 0.5) / 9) * Math.PI);

  /* Nameplate + status chip on the frame side. */
  const npX = ex + rx + 3;
  const npW = xc0 - 3 - npX;
  const npY = cy - 17;
  const npH = 24;

  /* Rotation arrow around the hub (screen-space ellipse so the head stays undistorted). */
  const arR = hubR + 4;
  const arrow = (() => {
    if (!isRunning || !dir) return null;
    const [a0, a1] = dir === 'CCW' ? [-30, -150] : [-150, -30];
    const p0 = pt(hubX, cy, arR * K, arR, a0);
    const p1 = pt(hubX, cy, arR * K, arR, a1);
    const rad = (a1 * Math.PI) / 180;
    const sgn = dir === 'CCW' ? -1 : 1;
    const tx = -arR * K * Math.sin(rad) * sgn;
    const ty = arR * Math.cos(rad) * sgn;
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;
    const head = (side: number) => `M${p1.x} ${p1.y}l${(-ux * 3 - uy * side * 1.8).toFixed(2)} ${(-uy * 3 + ux * side * 1.8).toFixed(2)}`;
    return (
      <g className="pointer-events-none" stroke={runCol} strokeWidth={1.1} strokeLinecap="round" fill="none">
        <path d={`M${p0.x} ${p0.y}A${arR * K} ${arR} 0 0 ${dir === 'CCW' ? 0 : 1} ${p1.x} ${p1.y}`} />
        <path d={head(1) + head(-1)} />
      </g>
    );
  })();

  const faultShort = fault ? fault.split(' (')[0] : '';
  const faultMax = Math.floor((npW - 10) / 2.05);
  const statusLeft = fault
    ? `FAULT ${faultShort}`.length <= faultMax
      ? `FAULT ${faultShort}`
      : fitWords(faultShort, faultMax)
    : isRunning
    ? `${dir ?? 'CW'}${starterMode === 'wye' ? ' · Y' : starterMode === 'delta' ? ' · Δ' : ''}`
    : 'STOPPED';
  const statusRight = !fault && isRunning ? (amps > 0 ? `${amps.toFixed(1)} A` : `${rpm} RPM`) : '';
  const statusCol = fault
    ? 'var(--console-danger)'
    : isRunning
    ? starterMode === 'wye'
      ? 'var(--console-warning)'
      : 'var(--console-readout)'
    : 'var(--console-muted)';

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Feet with slotted bolt holes */}
      {[ex + 2, xc0 - 26].map((fx) => (
        <g key={fx} className="pointer-events-none">
          <path className="d-cast" d={`M${fx + 4} ${cy + ry * 0.55}L${fx} ${H - 1.5}h24l-4 ${-(H - 1.5 - cy - ry * 0.55)}z`} />
          <rect className="d-dark-face" x={fx + 7} y={H - 6} width={10} height={2.6} rx={1.3} />
        </g>
      ))}
      <path d={`M${ex - 2} ${H - 1}H${xc0 + 2}`} stroke="var(--mat-line)" strokeWidth={0.6} />

      {/* Fan cowl (behind the frame) with stiffening bands */}
      <path className="d-cast" d={`M${xc0} ${cy - ryc}H${xc}A${rxc} ${ryc} 0 0 1 ${xc} ${cy + ryc}H${xc0}z`} />
      {[6, 11, 16].map((dx) => (
        <path key={dx} d={`M${xc0 + dx} ${cy - ryc}A${rxc} ${ryc} 0 0 1 ${xc0 + dx} ${cy + ryc}`} fill="none" stroke="var(--mat-cast-dark)" strokeWidth={0.7} opacity={0.7} />
      ))}

      {/* Finned frame */}
      <path className="d-cast" d={`M${ex} ${cy - ry}H${xc0}A${rx} ${ry} 0 0 1 ${xc0} ${cy + ry}H${ex}z`} />
      <rect x={ex} y={cy + ry * 0.45} width={xc0 - ex} height={ry * 0.5} fill="var(--mat-cast-dark)" opacity={0.22} className="pointer-events-none" />
      {fins.map((th, i) => {
        const y = cy - ry * Math.cos(th);
        const xr = xc0 + rx * Math.sin(th) - 0.8;
        return (
          <g key={i} className="pointer-events-none">
            <path d={`M${ex} ${y}H${xr}`} stroke="var(--mat-cast-dark)" strokeWidth={1.2} strokeLinecap="round" />
            <path d={`M${ex} ${y + 1}H${xr - 0.6}`} stroke="var(--silk-on-dark)" strokeWidth={0.45} opacity={0.35} />
          </g>
        );
      })}

      {/* Drive-end shield: rim, radial ribs, bearing cap, seal */}
      <ellipse className="d-cast" cx={ex} cy={cy} rx={rx} ry={ry} />
      <ellipse cx={ex} cy={cy} rx={rx * 0.86} ry={ry * 0.86} fill="none" stroke="var(--mat-cast-dark)" strokeWidth={0.8} />
      {[30, 90, 150, 210, 270, 330].map((a) => {
        const p0 = pt(ex, cy, rx * 0.46, ry * 0.46, a);
        const p1 = pt(ex, cy, rx * 0.84, ry * 0.84, a);
        return <path key={a} d={`M${p0.x} ${p0.y}L${p1.x} ${p1.y}`} stroke="var(--mat-cast-dark)" strokeWidth={1} strokeLinecap="round" />;
      })}
      <ellipse cx={ex} cy={cy} rx={rx * 0.42} ry={ry * 0.42} fill="var(--mat-cast)" stroke="var(--mat-line)" strokeWidth={0.7} />
      {[45, 135, 225, 315].map((a) => {
        const p = pt(ex, cy, rx * 0.32, ry * 0.32, a);
        return <ellipse key={a} cx={p.x} cy={p.y} rx={1.1 * K + 0.3} ry={1.1} fill="var(--term-screw)" stroke="var(--term-screw-line)" strokeWidth={0.4} />;
      })}
      <ellipse className="d-rubber" cx={ex} cy={cy} rx={shaftR * K + 1} ry={shaftR + 1.6} />

      {/* Shaft */}
      <rect className="d-steel" x={hubX + hubT - 0.5} y={cy - shaftR} width={ex - hubX - hubT + 0.5} height={shaftR * 2} />
      <path d={`M${hubX + hubT} ${cy + shaftR * 0.5}H${ex - 1}`} stroke="var(--mat-steel-dark)" strokeWidth={0.6} opacity={0.6} />

      {/* Coupling hub: rim band, then the turning face */}
      <path className="d-steel" d={`M${hubX} ${cy - hubR}H${hubX + hubT}A${hubR * K} ${hubR} 0 0 1 ${hubX + hubT} ${cy + hubR}H${hubX}z`} />
      <g transform={`translate(${hubX} ${cy}) scale(${K} 1)`}>
        <circle r={hubR} fill="var(--mat-steel)" stroke="var(--mat-steel-dark)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        <g
          className="motor-rotor"
          style={{
            animationDuration: `${starterMode === 'wye' ? SPIN_STAR : SPIN_FULL}s`,
            animationDirection: dir === 'CCW' ? 'reverse' : 'normal',
            animationPlayState: isRunning ? 'running' : 'paused',
          }}
        >
          <circle r={hubR * 0.82} fill="none" stroke="var(--mat-steel-dark)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          {[45, 135, 225, 315].map((a) => {
            const p = pt(0, 0, hubR * 0.6, hubR * 0.6, a);
            return <circle key={a} cx={p.x} cy={p.y} r={hubR * 0.12} fill="var(--mat-steel-dark)" />;
          })}
          <circle r={hubR * 0.3} fill="var(--mat-housing-dark-face)" />
          <rect x={-hubR * 0.08} y={-hubR * 0.4} width={hubR * 0.16} height={hubR * 0.14} fill="var(--mat-housing-dark-face)" />
          {/* paint index mark on the rim */}
          <rect x={-hubR * 0.11} y={-hubR * 0.98} width={hubR * 0.22} height={hubR * 0.3} rx={hubR * 0.04} fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
        </g>
      </g>
      {arrow}

      {/* Riveted nameplate */}
      <g className="pointer-events-none">
        <rect x={npX} y={npY} width={npW} height={npH} rx={1.5} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <rect x={npX + 1.6} y={npY + 1.6} width={npW - 3.2} height={npH - 3.2} rx={1} fill="var(--mat-porcelain)" />
        {[[npX + 2.8, npY + 2.8], [npX + npW - 2.8, npY + 2.8], [npX + 2.8, npY + npH - 2.8], [npX + npW - 2.8, npY + npH - 2.8]].map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={0.7} fill="var(--mat-steel-dark)" />
        ))}
        <Silk x={npX + 4.5} y={npY + 7.4} size={4.4} bold>{`3~ MOTOR ${deviceTag(device) || 'M'}`}</Silk>
        <Mono x={npX + npW - 4.5} y={npY + 7.4} size={3.4} anchor="end" muted>IE3</Mono>
        <Mono x={npX + 4.5} y={npY + 13.6} size={3.6}>{`${kw}kW ${hp}HP ${isStarDelta ? 'Δ440/Y760V' : 'Δ440V'}`}</Mono>
        <Mono x={npX + 4.5} y={npY + 19.4} size={3.4} muted>{`${rpm} min⁻¹`}</Mono>
        <Mono x={npX + npW - 4.5} y={npY + 19.4} size={3.4} anchor="end" muted>{npW > 60 ? '60Hz IP55' : 'IP55'}</Mono>
      </g>

      {/* Status chip */}
      <g className="pointer-events-none">
        <rect x={npX} y={npY + npH + 2.5} width={npW} height={8} rx={1.5} fill="var(--console)" stroke="var(--mat-line)" strokeWidth={0.5} />
        <circle cx={npX + 4} cy={npY + npH + 6.5} r={1.3} fill={runCol} opacity={isRunning || fault ? 1 : 0.5} />
        <Mono x={npX + 7} y={npY + npH + 8} size={fault ? 3.4 : 3.8} weight={700} fill={statusCol}>{statusLeft}</Mono>
        {statusRight && (
          <Mono x={npX + npW - 3} y={npY + npH + 8} size={3.8} anchor="end" fill={statusCol}>{statusRight}</Mono>
        )}
      </g>

      {/* Terminal box on its pedestal */}
      <rect className="d-cast" x={boxX + boxW * 0.32} y={boxY + boxH - 2} width={boxW * 0.36} height={bodyTop - (boxY + boxH) + 5} rx={1.5} />
      <rect className="d-cast" x={boxX} y={boxY} width={boxW} height={boxH} rx={3} />
      <rect className="d-dark-face" x={boxX + 3} y={boxY + 3} width={boxW - 6} height={boxH - 6} rx={2} />
      <Screw cx={boxX + 4.5} cy={boxY + 4.5} r={1.4} m="dark" />
      <Screw cx={boxX + boxW - 4.5} cy={boxY + 4.5} r={1.4} m="dark" />
      <Screw cx={boxX + 4.5} cy={boxY + boxH - 4.5} r={1.4} m="dark" />
      <Screw cx={boxX + boxW - 4.5} cy={boxY + boxH - 4.5} r={1.4} m="dark" />
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
        <Mono x={boxX + boxW - 8} y={boxY + boxH - 3.4} size={3.8} anchor="end" onDark>
          {starterMode === 'wye' ? 'Y' : starterMode === 'delta' ? 'Δ' : 'Y/Δ'}
        </Mono>
      )}

      <TermIds device={device} local size={4.2} onDark side={() => 'right'} />
      <Terminals {...props} local />
    </g>
  );
};
