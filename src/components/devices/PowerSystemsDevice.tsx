import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Lever, Led, Mono, Nameplate, Silk,
  Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';

type LampLevel = 'off' | 'dim' | 'dark' | 'bright';

/** A lamp with four brightness levels for the ground detection and synchroscope lamps. */
const Lamp: React.FC<{ cx: number; cy: number; level: LampLevel; color?: string; label?: string }> = ({ cx, cy, level, color = 'var(--act-orange, #f59e0b)', label }) => {
  const opacity = level === 'bright' ? 1 : level === 'dim' ? 0.45 : level === 'dark' ? 0.08 : 0.04;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.9} />
      <circle cx={cx} cy={cy} r={4.6} fill={color} opacity={opacity} />
      {level === 'bright' && <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.18} />}
      {label && <Mono x={cx} y={cy + 13} size={3.8} anchor="middle" muted>{label}</Mono>}
    </g>
  );
};

/**
 * Batch 3.2 devices (sources and power systems). One renderer, one block per type; every block draws a
 * labelled face between the terminal bays and shows the device's live state.
 */
export const PowerSystemsDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);
  const tag = deviceTag(device) || '';
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.92);
  const topBayY = tTop - 8;
  const botBayY = botTy - 8;
  const faceY = topBayY + 18;
  const faceH = botBayY - 2 - faceY;
  const cx = W / 2;
  const din = ['pf_controller', 'reverse_power_relay', 'preferential_trip_relay', 'dc_isolator'].includes(type);

  const frame = (center: string, text: string, body: React.ReactNode, termSize = 3.8) => (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {din && <DinClip cx={cx} y={H} />}
      <Housing w={W} h={H} m="light" rx={4} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={tag} center={center} text={text} size={4.6} />
      {body}
      <TermIds device={device} local size={termSize} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );

  const bar = (x: number, y: number, w: number, frac: number, color: string) => (
    <g>
      <rect x={x} y={y} width={w} height={5} rx={2.5} fill="var(--mat-line-soft)" />
      {frac > 0 && <rect x={x} y={y} width={Math.max(2, w * Math.min(1, frac))} height={5} rx={2.5} fill={color} />}
    </g>
  );

  switch (type) {
    case 'transfer_switch_manual': {
      const pos = (state.position as string) || 'normal';
      // The handle can only move to the next position: I -> 0 -> II -> 0 -> I (break before make)
      const next = pos === 'off' ? (state.lastSide === 'normal' ? 'generator' : 'normal') : 'off';
      const click = () => patch({ position: next, ...(pos !== 'off' ? { lastSide: pos } : {}) });
      const hx = pos === 'normal' ? -26 : pos === 'generator' ? 26 : 0;
      return frame('MTS I-0-II', '2P', (
        <g {...act(click)}>
          <title>{`Handle at ${pos === 'off' ? '0 (off)' : pos === 'normal' ? 'I (normal)' : 'II (generator)'}: click to move. It always passes through 0.`}</title>
          <rect className="d-shade" x={cx - 40} y={faceY + 20} width={80} height={26} rx={3} />
          <Mono x={cx - 30} y={faceY + 36} size={5.4} anchor="middle" muted={pos !== 'normal'}>I</Mono>
          <Mono x={cx} y={faceY + 36} size={5.4} anchor="middle" muted={pos !== 'off'}>0</Mono>
          <Mono x={cx + 30} y={faceY + 36} size={5.4} anchor="middle" muted={pos !== 'generator'}>II</Mono>
          <g style={{ transform: `translateX(${hx}px)`, transition: 'transform 160ms ease-out' }}>
            <rect x={cx - 8} y={faceY + 22} width={16} height={22} rx={2} fill="var(--act-black)" stroke="var(--mat-line)" strokeWidth={0.9} />
            <path d={`M${cx - 4} ${faceY + 28}h8M${cx - 4} ${faceY + 33}h8M${cx - 4} ${faceY + 38}h8`} stroke="var(--silk-on-dark)" strokeWidth={0.6} opacity={0.6} />
          </g>
        </g>
      ));
    }

    case 'ups_battery': {
      const soc = Number(state.socPct) || 0;
      const onBat = !!state.onBattery;
      return frame('UPS 1Φ', `${Math.round(Number(state.capacityWh) || 500)} Wh`, (
        <g>
          <Led cx={16} cy={faceY + 24} r={2.2} on={!!state.inputLive} color="green" />
          <Mono x={22} y={faceY + 25.4} size={3.8} muted>LINE</Mono>
          <Led cx={W / 2 - 4} cy={faceY + 24} r={2.2} on={onBat} color="amber" />
          <Mono x={W / 2 + 1} y={faceY + 25.4} size={3.8} muted>BATT</Mono>
          <Led cx={W - 40} cy={faceY + 24} r={2.2} on={soc <= 0 && !state.inputLive} color="red" />
          <Mono x={W - 35} y={faceY + 25.4} size={3.8} muted>EMPTY</Mono>
          {bar(12, faceY + 34, W - 24, soc / 100, soc < 25 ? 'var(--act-red)' : 'var(--ok)')}
          <Mono x={12} y={faceY + 49} size={5}>{`${soc.toFixed(0)} %`}</Mono>
          <Mono x={W - 12} y={faceY + 49} size={4.4} anchor="end" muted>{`${Math.round(Number(state.loadW) || 0)} W load`}</Mono>
          <Mono x={cx} y={faceY + 60} size={4.2} anchor="middle" muted>{Number(state.autonomyMin) >= 999 ? 'autonomy: no load' : `autonomy ${Number(state.autonomyMin).toFixed(1)} min`}</Mono>
        </g>
      ));
    }

    case 'pv_string': {
      const irr = Number(state.irradiance) || 0;
      return frame('PV STRING', `${state.kwp || 3} kWp`, (
        <g {...act(() => patch({ irradiance: irr > 0 ? 0 : 100 }))}>
          <title>Click to toggle sun / night (irradiance 100 % / 0 %)</title>
          {[0, 1, 2].map((c) => [0, 1].map((r) => (
            <rect key={`${c}${r}`} x={14 + c * 26} y={faceY + 16 + r * 14} width={24} height={12} rx={1.2} fill={irr > 0 ? 'var(--probe, #38bdf8)' : 'var(--mat-housing-shade)'} opacity={irr > 0 ? 0.35 + 0.65 * (irr / 100) : 1} stroke="var(--mat-line)" strokeWidth={0.7} />
          )))}
          <Mono x={cx} y={faceY + 50} size={4.4} anchor="middle">{`${Math.round(Number(state.powerW) || 0)} W  ${Math.round(Number(state.dcVolts) || 0)} V`}</Mono>
          <Mono x={cx} y={faceY + 58} size={3.8} anchor="middle" muted>{`irradiance ${irr.toFixed(0)} %`}</Mono>
        </g>
      ));
    }

    case 'dc_isolator': {
      const closed = state.closed !== false;
      return frame('DC ISOLATOR', 'PV', (
        <g {...act(() => patch({ closed: !closed }))}>
          <title>{closed ? 'Closed: click to open (isolate the string)' : 'Open: click to close'}</title>
          <Lever cx={cx} y={faceY + 14} slotH={26} w={30} pos={closed ? 0 : 1} color="var(--act-red)" />
          <Silk x={9} y={faceY + 22} size={3.8} muted>I</Silk>
          <Silk x={9} y={faceY + 38} size={3.8} muted>O</Silk>
        </g>
      ), 3.6);
    }

    case 'inverter_gridtie': {
      const status = (state.status as string) || '';
      const ok = status === 'EXPORTING';
      return frame('GRID-TIE INV', `${((Number(state.ratedW) || 3000) / 1000).toFixed(1)} kW`, (
        <g>
          <rect className="d-lcd" x={12} y={faceY + 16} width={W - 24} height={30} rx={2} />
          <Mono x={16} y={faceY + 27} size={4.4} fill="var(--lcd-ink)">{status}</Mono>
          <Mono x={16} y={faceY + 40} size={6} fill="var(--lcd-ink)">{`${Math.round(Number(state.acPowerW) || 0)} W`}</Mono>
          <Mono x={W - 16} y={faceY + 40} size={4.2} anchor="end" fill="var(--lcd-ink)">{`DC ${Math.round(Number(state.dcW) || 0)} W`}</Mono>
          <Led cx={16} cy={faceY + 56} r={2.2} on={ok} color="green" />
          <Mono x={22} y={faceY + 57.4} size={3.8} muted>EXPORT</Mono>
          <Led cx={W - 48} cy={faceY + 56} r={2.2} on={status.startsWith('ANTI')} color="red" />
          <Mono x={W - 43} y={faceY + 57.4} size={3.8} muted>ISLAND</Mono>
          {Number(state.reconnectSec) > 0 && <Mono x={cx} y={faceY + 66} size={3.8} anchor="middle" muted>{`reconnect in ${Number(state.reconnectSec).toFixed(1)} s`}</Mono>}
        </g>
      ));
    }

    case 'net_meter': {
      const imp = Number(state.importKwh) || 0;
      const exp = Number(state.exportKwh) || 0;
      return frame('NET METER', 'CL.1', (
        <g>
          <rect className="d-lcd" x={12} y={faceY + 16} width={W - 24} height={34} rx={2} />
          <Mono x={16} y={faceY + 27} size={3.8} fill="var(--lcd-ink)">IMPORT kWh</Mono>
          <Mono x={W - 16} y={faceY + 27} size={7} anchor="end" fill="var(--lcd-ink)">{imp.toFixed(3)}</Mono>
          <Mono x={16} y={faceY + 44} size={3.8} fill="var(--lcd-ink)">EXPORT kWh</Mono>
          <Mono x={W - 16} y={faceY + 44} size={7} anchor="end" fill="var(--lcd-ink)">{exp.toFixed(3)}</Mono>
          <Mono x={16} y={faceY + 62} size={4.2}>{`load ${Math.round(Number(state.loadW) || 0)} W`}</Mono>
          <Mono x={16} y={faceY + 71} size={4.2}>{`PV ${Math.round(Number(state.pvW) || 0)} W`}</Mono>
          <Led cx={W - 40} cy={faceY + 61} r={2} on={(Number(state.importW) || 0) > 0} color="amber" />
          <Mono x={W - 35} y={faceY + 62.4} size={3.8} muted>IMP</Mono>
          <Led cx={W - 40} cy={faceY + 70} r={2} on={(Number(state.exportW) || 0) > 0} color="green" />
          <Mono x={W - 35} y={faceY + 71.4} size={3.8} muted>EXP</Mono>
        </g>
      ));
    }

    case 'transformer_1p_pole':
    case 'transformer_3p_delta_wye': {
      const is3p = type === 'transformer_3p_delta_wye';
      const live = !!state.primaryLive;
      const sec = Number(state.secondaryLoadedV) || 0;
      const unl = Number(state.secondaryUnloadedV) || 0;
      return frame(is3p ? 'TRANSFORMER 3Φ' : 'TRANSFORMER 1Φ', `${state.kva} kVA`, (
        <g>
          {/* two windings on a core */}
          <g stroke="var(--ink)" strokeWidth={1.2} fill="none">
            <path d={`M${cx - 26} ${faceY + 17}q4 -5 8 0t8 0t8 0t8 0`} />
            <path d={`M${cx - 26} ${faceY + 30}q4 -5 8 0t8 0t8 0t8 0`} />
            <path d={`M${cx - 28} ${faceY + 22}h56M${cx - 28} ${faceY + 24.5}h56`} strokeWidth={0.8} />
          </g>
          <Led cx={14} cy={faceY + 46} r={2} on={live} color="green" />
          <Mono x={19} y={faceY + 47.4} size={3.8} muted>PRI</Mono>
          <Mono x={W - 12} y={faceY + 47.4} size={4.4} anchor="end">{live ? `${state.primaryV} V` : '-- V'}</Mono>
          <Mono x={12} y={faceY + 58} size={4.4}>{`${state.vectorGroup}  1:${state.ratio}`}</Mono>
          <Mono x={W - 12} y={faceY + 58} size={4.4} anchor="end">{live ? `${sec.toFixed(0)} V` : '-- V'}</Mono>
          <Mono x={12} y={faceY + 67} size={3.8} muted>{live ? `no load ${unl} V` : 'primary dead'}</Mono>
          <Mono x={W - 12} y={faceY + 67} size={3.8} anchor="end" muted>{`load ${Number(state.loadPct) || 0} %`}</Mono>
        </g>
      ), 3.6);
    }

    case 'capacitor_bank_3p': {
      const steps = Math.max(1, Math.min(4, Number(state.steps) || 4));
      return frame('CAP BANK', `${(Number(state.kvarPerStep) || 5) * steps} kvar`, (
        <g>
          {Array.from({ length: steps }).map((_, i) => {
            const x = 12 + i * ((W - 24) / steps);
            const on = !!state[`on${i + 1}`];
            const lock = Number(state[`lock${i + 1}`]) || 0;
            return (
              <g key={i}>
                <rect x={x} y={faceY + 16} width={(W - 24) / steps - 6} height={22} rx={2} fill={on ? 'var(--ok-soft, #bbf7d0)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.8} />
                <path d={`M${x + 8} ${faceY + 22}v10M${x + 12} ${faceY + 22}v10`} stroke="var(--ink)" strokeWidth={1.4} />
                <Led cx={x + ((W - 24) / steps - 6) / 2} cy={faceY + 44} r={2} on={on} color={lock > 0 ? 'amber' : 'green'} />
                <Mono x={x + ((W - 24) / steps - 6) / 2} y={faceY + 54} size={3.6} anchor="middle" muted>{`S${i + 1}`}</Mono>
              </g>
            );
          })}
          <Mono x={cx} y={faceY + 64} size={4.4} anchor="middle">{`${Number(state.kvarOn) || 0} kvar in`}</Mono>
        </g>
      ));
    }

    case 'pf_controller': {
      const pf = Number(state.pf);
      const cmd = Number(state.stepsCmd) || 0;
      return frame('PF CONTROL', `→ ${state.targetPf}`, (
        <g>
          <rect className="d-lcd" x={10} y={faceY + 15} width={W - 20} height={28} rx={2} />
          <Mono x={cx} y={faceY + 33} size={11} anchor="middle" fill="var(--lcd-ink)">{`${pf.toFixed(2)}${state.leading ? ' c' : ''}`}</Mono>
          <Mono x={14} y={faceY + 23} size={3.6} fill="var(--lcd-ink)">PF</Mono>
          {[1, 2, 3, 4].map((i) => (
            <g key={i}>
              <Led cx={16 + (i - 1) * ((W - 32) / 3)} cy={faceY + 52} r={2} on={i <= cmd} color="green" />
              <Mono x={16 + (i - 1) * ((W - 32) / 3)} y={faceY + 61} size={3.4} anchor="middle" muted>{`K${i}`}</Mono>
            </g>
          ))}
          <Mono x={cx} y={faceY + 70} size={3.8} anchor="middle" muted>{`${(Number(state.kw) || 0).toFixed(1)} kW  ${(Number(state.kvar) || 0).toFixed(1)} kvar`}</Mono>
        </g>
      ), 3.6);
    }

    case 'shore_connection_box': {
      const closed = state.closed !== false;
      const ok = !!state.seqOk;
      const fault = (state.seqFault as string) || '';
      return frame('SHORE BOX', '3P+PE', (
        <g>
          <Led cx={18} cy={faceY + 24} r={2.6} on={ok} color="green" />
          <Mono x={25} y={faceY + 25.4} size={3.8} muted>L1-L2-L3</Mono>
          <Led cx={W - 56} cy={faceY + 24} r={2.6} on={!ok && !!state.shorePresent} color="red" />
          <Mono x={W - 49} y={faceY + 25.4} size={3.8} muted>WRONG</Mono>
          <Mono x={cx} y={faceY + 40} size={4.4} anchor="middle" fill={ok ? 'var(--ok)' : 'var(--danger)'}>{ok ? 'SEQUENCE OK' : fault || 'NO SHORE POWER'}</Mono>
          <g {...act(() => patch({ closed: !closed }))}>
            <title>{closed ? 'Closed: click to open' : 'Open: click to close'}</title>
            <rect x={cx - 26} y={faceY + 48} width={52} height={14} rx={3} fill={closed ? 'var(--act-green)' : 'var(--act-red)'} stroke="var(--mat-line)" strokeWidth={0.9} />
            <Silk x={cx} y={faceY + 57.4} size={5} anchor="middle" bold onDark>{closed ? 'CLOSED' : 'OPEN'}</Silk>
          </g>
        </g>
      ));
    }

    case 'ground_detection_lamps': {
      const lamp = (i: number) => (state[`lamp${i}`] as LampLevel) || 'off';
      return frame('GND DETECT', 'IT', (
        <g>
          {[1, 2, 3].map((i) => <Lamp key={i} cx={22 + (i - 1) * ((W - 44) / 2)} cy={faceY + 28} level={lamp(i)} label={`L${i}`} />)}
          <Mono x={cx} y={faceY + 56} size={4.4} anchor="middle" fill={state.faultPhase ? 'var(--danger)' : 'var(--ok)'}>{state.faultPhase ? `EARTH FAULT ${state.faultPhase}` : state.powered ? 'INSULATION OK' : 'NO SUPPLY'}</Mono>
        </g>
      ), 3.6);
    }

    case 'synchroscope': {
      const diff = Number(state.phaseDiffDeg) || 0;
      const r = Math.min(30, (W - 24) / 2);
      const dcy = faceY + 14 + r;
      const a = ((diff - 90) * Math.PI) / 180;
      const lamp = Number(state.lampBright) || 0;
      const level: LampLevel = lamp > 0.7 ? 'bright' : lamp > 0.25 ? 'dim' : 'dark';
      return frame('SYNCHROSCOPE', 'BUS / INC', (
        <g>
          <circle cx={cx} cy={dcy} r={r} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
          <path d={`M${cx} ${dcy - r}v5`} stroke="var(--act-green)" strokeWidth={2} />
          <Mono x={cx} y={dcy - r + 11} size={3.6} anchor="middle" muted>SYNC</Mono>
          <Mono x={cx - r + 6} y={dcy + 2} size={3.6} anchor="middle" muted>SLOW</Mono>
          <Mono x={cx + r - 6} y={dcy + 2} size={3.6} anchor="middle" muted>FAST</Mono>
          <path d={`M${cx} ${dcy}L${cx + Math.cos(a) * (r - 4)} ${dcy + Math.sin(a) * (r - 4)}`} stroke={state.inSync ? 'var(--ok)' : 'var(--ink)'} strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={cx} cy={dcy} r={2} fill="var(--mat-steel-dark)" />
          {[0, 1, 2].map((i) => <Lamp key={i} cx={cx - 26 + i * 26} cy={dcy + r + 9} level={level} />)}
          <Mono x={cx} y={dcy + r + 26} size={4} anchor="middle" fill={state.inSync ? 'var(--ok)' : 'var(--ink)'}>{`${diff.toFixed(0)}°  ${(Number(state.deltaHz) || 0).toFixed(2)} Hz`}</Mono>
        </g>
      ), 3.4);
    }

    case 'reverse_power_relay':
    case 'preferential_trip_relay': {
      const isPref = type === 'preferential_trip_relay';
      const tripped = !!state.tripped;
      return frame(isPref ? 'PREF TRIP' : 'REV POWER', isPref ? `${state.thresholdPct}%` : `${state.delaySec}s`, (
        <g>
          <Led cx={16} cy={faceY + 24} r={2.4} on={!tripped} color="green" />
          <Mono x={22} y={faceY + 25.4} size={3.8} muted>OK</Mono>
          <Led cx={W - 36} cy={faceY + 24} r={2.4} on={tripped} color="red" />
          <Mono x={W - 30} y={faceY + 25.4} size={3.8} muted>TRIP</Mono>
          {isPref ? (
            <>
              <Mono x={cx} y={faceY + 40} size={4.4} anchor="middle">{`set load ${Number(state.loadPct) || 0} %`}</Mono>
              <g {...act(() => patch({ tripped: false, timerSec: 0 }))}>
                <title>Reset the latched trip</title>
                <rect x={cx - 18} y={faceY + 46} width={36} height={12} rx={3} fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth={0.9} />
                <Silk x={cx} y={faceY + 54.6} size={4.6} anchor="middle" bold>RESET</Silk>
              </g>
            </>
          ) : (
            <Mono x={cx} y={faceY + 40} size={4.4} anchor="middle" fill={state.reversePower ? 'var(--danger)' : 'var(--ink)'}>{state.reversePower ? 'REVERSE POWER' : 'forward power'}</Mono>
          )}
        </g>
      ), 3.6);
    }

    default:
      return null;
  }
};
