import React from 'react';
import {
  Bay, DeviceProps, Face, Housing, Led, Mono, Nameplate, Screw, Silk,
  Terminals, TermIds, deviceTag,
} from './kit';
import { MAX_BAR } from '../../core/process';

/**
 * Level and pressure switches (IEC 60947-5-1 style changeover contacts).
 * Float switch: a level gauge with the high and low trip marks and a float that follows the shared tank level.
 * Pressure switch: a dial with cut-in and cut-out marks and a needle that follows the line pressure.
 * Both show which contact is closed (COM-NO or COM-NC).
 */
export const LevelSwitchDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const isFloat = device.type === 'float_switch';
  const closed = !!state.contactClosed;
  const tag = deviceTag(device) || (isFloat ? 'SL' : 'SP');
  const tTop = H * (device.terminals[0]?.relY ?? 0.92);
  const botBayY = tTop - 8;
  const faceY = 4;
  const faceH = botBayY - 2 - faceY;
  const cx = W / 2;

  if (isFloat) {
    const level = Math.max(0, Math.min(100, Number(state.level) || 0));
    const high = Number(state.highTrip) || 70;
    const low = Number(state.lowTrip) || 30;
    const form = state.contactForm === 'NC_on_rise' ? 'NC↑' : 'NO↑';
    const gx = 12;
    const gy = faceY + 18;
    const gh = faceH - 50;
    const yOf = (pct: number) => gy + gh * (1 - pct / 100);
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <Housing w={W} h={H} m="light" />
        <Bay x={3} y={botBayY} w={W - 6} h={H - botBayY - 3} />
        <Face x={3} y={faceY} w={W - 6} h={faceH} />
        <Nameplate x={3} y={faceY} w={W - 6} h={8} tag={tag} text={`LEVEL ${form}`} size={4.4} />
        {/* tank gauge */}
        <rect x={gx} y={gy} width={14} height={gh} rx={2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <rect x={gx + 1} y={yOf(level)} width={12} height={gy + gh - yOf(level)} rx={1.5} fill="var(--probe, #38bdf8)" opacity={0.75} />
        <path d={`M${gx - 3} ${yOf(high)}H${gx + 17}M${gx - 3} ${yOf(low)}H${gx + 17}`} stroke="var(--act-red)" strokeWidth={0.9} strokeDasharray="2 1.4" />
        <Mono x={gx + 19} y={yOf(high) + 1.4} size={3.6} muted>{high}</Mono>
        <Mono x={gx + 19} y={yOf(low) + 1.4} size={3.6} muted>{low}</Mono>
        {/* float ball on its cable */}
        <path d={`M${W - 18} ${gy - 4}V${yOf(level)}`} stroke="var(--mat-steel-dark)" strokeWidth={1} />
        <ellipse cx={W - 18} cy={yOf(level) + 4} rx={7} ry={5} fill="var(--act-orange, #f59e0b)" stroke="var(--mat-line)" strokeWidth={0.9} />
        <Mono x={cx} y={faceY + faceH - 22} size={5.4} anchor="middle">{`${level.toFixed(0)} %`}</Mono>
        <Led cx={14} cy={faceY + faceH - 8} r={2} on={closed} color="green" />
        <Mono x={19} y={faceY + faceH - 6.6} size={3.6} muted>COM-NO</Mono>
        <Led cx={W - 30} cy={faceY + faceH - 8} r={2} on={!closed} color="amber" />
        <Mono x={W - 25} y={faceY + faceH - 6.6} size={3.6} muted>NC</Mono>
        <TermIds device={device} local size={3.8} gap={0} />
        <Terminals {...props} local />
      </g>
    );
  }

  const bar = Math.max(0, Math.min(MAX_BAR, Number(state.pressure) || 0));
  const cutIn = Number(state.cutIn) || 2;
  const cutOut = Number(state.cutOut) || 3;
  const dialR = Math.min(W / 2 - 10, (faceH - 30) / 2);
  const dialCy = faceY + 18 + dialR;
  // 0 bar at -135 deg, MAX_BAR at +135 deg
  const angOf = (v: number) => ((-135 + (v / MAX_BAR) * 270 - 90) * Math.PI) / 180;
  const pt = (v: number, r: number) => ({ x: cx + Math.cos(angOf(v)) * r, y: dialCy + Math.sin(angOf(v)) * r });
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" />
      <Bay x={3} y={botBayY} w={W - 6} h={H - botBayY - 3} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY} w={W - 6} h={8} tag={tag} text="PRESSURE" size={4.4} />
      <circle cx={cx} cy={dialCy} r={dialR} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
      {[0, 1, 2, 3, 4, 5].map((v) => {
        const a = pt(v, dialR - 1);
        const b = pt(v, dialR - 4);
        const t = pt(v, dialR - 8);
        return (
          <g key={v}>
            <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="var(--mat-line)" strokeWidth={0.7} />
            <Mono x={t.x} y={t.y + 1.2} size={3.4} anchor="middle" muted>{v}</Mono>
          </g>
        );
      })}
      {[cutIn, cutOut].map((v, i) => {
        const a = pt(v, dialR);
        const b = pt(v, dialR - 5);
        return <path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="var(--act-red)" strokeWidth={1.4} />;
      })}
      <path d={`M${cx} ${dialCy}L${pt(bar, dialR - 6).x} ${pt(bar, dialR - 6).y}`} stroke="var(--ink)" strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={cx} cy={dialCy} r={2} fill="var(--mat-steel-dark)" />
      <Mono x={cx} y={dialCy + dialR + 7} size={4.6} anchor="middle">{`${bar.toFixed(2)} bar`}</Mono>
      <Mono x={cx} y={faceY + faceH - 3} size={3.6} anchor="middle" muted>{`IN ${cutIn} / OUT ${cutOut}`}</Mono>
      <Led cx={11} cy={faceY + faceH - 3.4} r={1.8} on={closed} color="green" />
      <TermIds device={device} local size={3.8} gap={0} />
      <Terminals {...props} local />
      <Screw cx={W - 9} cy={faceY + 14} r={1.4} />
    </g>
  );
};

/**
 * Booster pump: motor on a pump casing. The impeller turns and the flow arrows run while it is pumping.
 */
export const PumpDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const pumping = !!state.pumping;
  const is3p = device.type === 'pump_booster_3p';
  const kw = Number(state.kw) || (is3p ? 1.5 : 0.75);
  const tag = deviceTag(device) || 'M';
  const fault = state.motorFault as string | null | undefined;
  const tTop = H * (device.terminals[0]?.relY ?? 0.5);
  const topEdge = is3p ? tTop + 8 : 6;
  const botEdge = is3p ? H - 4 : H * 0.92 - 8;
  const bodyH = botEdge - topEdge;
  const motorW = (W - 12) * 0.5;
  const cy = topEdge + bodyH / 2 + (is3p ? 2 : -2);
  const impX = 6 + motorW + (W - 12 - motorW) / 2;
  const spin = pumping ? { animation: 'ww-spin 0.8s linear infinite', transformOrigin: `${impX}px ${cy}px` } : undefined;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <style>{'@keyframes ww-spin { to { transform: rotate(360deg); } }'}</style>
      <Housing w={W} h={H} m="shade" rx={5} />
      {/* motor body */}
      <rect x={6} y={cy - bodyH / 2.6} width={motorW} height={bodyH / 1.3} rx={5} className="d-steel" />
      <path d={`M${12} ${cy - bodyH / 3}V${cy + bodyH / 3}M${18} ${cy - bodyH / 3}V${cy + bodyH / 3}M${24} ${cy - bodyH / 3}V${cy + bodyH / 3}`} stroke="var(--mat-line-soft)" strokeWidth={0.9} />
      <Nameplate x={8} y={cy - 5} w={motorW - 4} h={9} tag={tag} text={`${kw} kW`} size={4.4} />
      {/* pump casing and impeller */}
      <circle cx={impX} cy={cy} r={Math.min(18, bodyH / 2.4)} fill="var(--mat-housing)" stroke="var(--mat-line)" strokeWidth={1} />
      <g style={spin}>
        <path d={`M${impX} ${cy - 11}L${impX + 4} ${cy}L${impX} ${cy + 11}L${impX - 4} ${cy}Z`} fill="var(--probe, #38bdf8)" opacity={0.9} />
        <path d={`M${impX - 11} ${cy}L${impX} ${cy - 4}L${impX + 11} ${cy}L${impX} ${cy + 4}Z`} fill="var(--probe, #38bdf8)" opacity={0.6} />
      </g>
      <circle cx={impX} cy={cy} r={2.2} fill="var(--mat-steel-dark)" />
      <rect x={impX - 3} y={cy - 24} width={6} height={7} className="d-steel" />
      <Led cx={W - 12} cy={topEdge + 2} r={2.2} on={pumping} color="green" />
      <Mono x={W - 8} y={cy + bodyH / 2.2 + 2} size={4} anchor="end" muted>{fault ? fault : pumping ? 'PUMPING' : 'STOPPED'}</Mono>
      <Silk x={9} y={cy + bodyH / 2.2 + 2} size={4} muted>{is3p ? '3Φ' : '1Φ'}</Silk>
      <TermIds device={device} local size={4} side={(t) => (t.relY < 0.5 ? 'below' : 'above')} />
      <Terminals {...props} local />
    </g>
  );
};
