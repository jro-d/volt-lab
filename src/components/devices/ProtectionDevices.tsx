import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Flag, Housing, Led, Lever, Mono, Nameplate, Seams, Silk,
  Terminals, TermIds, act, click, deviceTag, makePatch,
} from './kit';

const BREAKER_LABEL: Record<string, string> = {
  rcd_4p: 'RCCB 4P',
  afdd_1pn: 'AFDD',
  mccb_3p: 'MCCB 3P',
  mpcb_3p: 'MPCB',
  rotary_isolator_3p: 'ISOLATOR',
};

/**
 * Breaker-style modules: RCCB 4P, AFDD, MCCB, MPCB and the lockable rotary isolator. A lever shows state; the yellow T button
 * simulates a leakage / arc test trip where the device has one; the isolator has a padlock; the MCCB and MPCB show their
 * dials and a heat bar for the thermal element.
 */
export const ProtectionModuleDevice: React.FC<DeviceProps> = (props) => {
  const { device, onToggleState } = props;
  const { width: W, height: H, state, type } = device;
  const patch = makePatch(props);
  const tripped = !!state.tripped;
  const closed = !!state.closed && !tripped;
  const locked = !!state.locked;
  const heat = Math.max(0, Math.min(1, Number(state.heat) || 0));
  const isIso = type === 'rotary_isolator_3p';
  const hasTest = type === 'rcd_4p' || type === 'afdd_1pn';

  const toggle = () => {
    if (isIso && locked) return;
    if (tripped) {
      device.state.tripped = false;
      device.state.closed = true;
      device.state.heat = 0;
    } else {
      device.state.closed = !device.state.closed;
    }
    onToggleState?.(device);
  };
  const testTrip = () => {
    device.state.tripped = true;
    device.state.closed = false;
    device.state.tripReason = type === 'afdd_1pn' ? 'Test Button: simulated arc-fault trip' : `Test Button: ${state.sensitivityMa || 30} mA simulated earth-leakage trip`;
    onToggleState?.(device);
  };

  const rating =
    type === 'mccb_3p' ? `${state.ratedAmps} A` :
    type === 'mpcb_3p' ? `Ir ${state.irAmps} A` :
    type === 'afdd_1pn' ? `${state.tripCurve || 'C'}${state.ratedAmps}` :
    type === 'rcd_4p' ? `${state.ratedAmps} A` : `${state.ratedAmps} A`;
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const bayH = tTop * 2 - 1.5;
  const botBayY = H - 2 - bayH;
  const faceY = 2 + bayH + 2;
  const faceH = botBayY - 2 - faceY;
  const cx = W / 2;
  const slotY = faceY + 11;
  const slotH = 24;
  const pos = tripped ? 0.5 : closed ? 0 : 1;
  const leverXs = type === 'rcd_4p' ? [0.2, 0.4, 0.6, 0.8] : type === 'afdd_1pn' ? [0.35, 0.65] : [0.25, 0.5, 0.75];

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={cx} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={2} w={W - 6} h={bayH} />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} />
      <Seams xs={[cx]} y1={2} y2={2 + bayH} />
      <Seams xs={[cx]} y1={botBayY} y2={H - 2} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY} w={W - 6} tag={deviceTag(device)} text={`${BREAKER_LABEL[type]} ${rating}`} />

      {isIso ? (
        <g onClick={click(toggle)} className="cursor-pointer">
          <title>{locked ? 'Locked off: remove the padlock in the inspector to operate' : `Click the handle to switch ${closed ? 'OFF' : 'ON'}`}</title>
          <circle cx={cx} cy={slotY + 14} r={14} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1} />
          <g transform={`rotate(${closed ? 0 : 90} ${cx} ${slotY + 14})`}>
            <rect x={cx - 3} y={slotY - 1} width={6} height={15} rx={2} fill={closed ? 'var(--ok)' : 'var(--act-orange, #f59e0b)'} />
          </g>
          <Mono x={cx} y={slotY + 36} size={4.4} anchor="middle" fill={closed ? 'var(--ok)' : undefined}>{closed ? 'I  ON' : '0  OFF'}</Mono>
        </g>
      ) : (
        <g onClick={click(toggle)} className="cursor-pointer">
          <title>{tripped ? 'Tripped: click the lever to reset' : `Click the lever to switch ${closed ? 'OFF' : 'ON'}`}</title>
          {leverXs.map((rx) => <Lever key={rx} cx={W * rx} y={slotY} slotH={slotH} w={type === 'rcd_4p' ? 10 : 12} pos={pos} />)}
        </g>
      )}
      {!isIso && <Flag cx={cx} y={slotY + slotH + 3} state={tripped ? 'trip' : closed ? 'on' : 'off'} />}

      {hasTest && (
        <g onClick={click(testTrip)} className="cursor-pointer">
          <title>Test: simulate a trip</title>
          <circle cx={W - 14} cy={slotY + slotH + 9} r={4.6} fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth={0.9} />
          <Mono x={W - 14} y={slotY + slotH + 10.8} size={5} anchor="middle" fill="var(--mat-line)">T</Mono>
        </g>
      )}

      {isIso && (
        <g {...act(() => patch({ locked: !locked, ...(!locked ? { closed: false } : {}) }))}>
          <title>{locked ? 'Padlock fitted: handle locked in OFF' : 'Click to fit a padlock (locks the handle in OFF)'}</title>
          <rect x={W - 26} y={faceY + faceH - 20} width={14} height={10} rx={2} fill={locked ? 'var(--danger)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.8} />
          <path d={`M${W - 23} ${faceY + faceH - 20}v-4a4 4 0 0 1 8 0v4`} fill="none" stroke="var(--mat-line)" strokeWidth={1.2} />
        </g>
      )}

      {(type === 'mccb_3p' || type === 'mpcb_3p') && (
        <g>
          <rect x={8} y={faceY + faceH - 30} width={W - 16} height={4} rx={1.5} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.5} />
          <rect x={8} y={faceY + faceH - 30} width={(W - 16) * heat} height={4} rx={1.5} fill={heat > 0.7 ? 'var(--danger)' : 'var(--act-orange, #f59e0b)'} />
          <Mono x={8} y={faceY + faceH - 12} size={3.8} muted>
            {type === 'mccb_3p' ? `Ir ${((Number(state.ratedAmps) || 100) * (Number(state.irFactor) || 1)).toFixed(0)} A · Im ${state.imFactor}×Ir` : 'Class 10 · Im 13×Ir'}
          </Mono>
          {type === 'mccb_3p' && (state.shuntTrip || state.uvRelease) && (
            <Silk x={8} y={faceY + faceH - 4} size={3.6} muted>{[state.shuntTrip ? 'SHT' : '', state.uvRelease ? 'UVR' : ''].filter(Boolean).join(' + ')}</Silk>
          )}
        </g>
      )}
      {type === 'rcd_4p' && <Silk x={W - 8} y={faceY + faceH - 6} size={5} anchor="end" bold>{`IΔn ${state.sensitivityMa || 30} mA`}</Silk>}
      {type === 'afdd_1pn' && <Silk x={W - 8} y={faceY + faceH - 6} size={4.4} anchor="end" muted>ARC FAULT</Silk>}
      <TermIds device={device} local size={4} side={(t) => (t.relY < 0.5 ? 'below' : 'above')} />
      <Terminals {...props} local />
    </g>
  );
};

/** GFCI receptacle: TEST and RESET buttons, a status lamp and the receptacle face. */
export const GfciDevice: React.FC<DeviceProps> = (props) => {
  const { device, onToggleState } = props;
  const { width: W, height: H, state } = device;
  const tripped = !!state.tripped;
  const closed = !!state.closed && !tripped;
  const cx = W / 2;
  const test = () => {
    device.state.tripped = true;
    device.state.closed = false;
    device.state.tripReason = 'TEST pressed: simulated ground-fault trip';
    onToggleState?.(device);
  };
  const reset = () => {
    device.state.tripped = false;
    device.state.closed = true;
    onToggleState?.(device);
  };
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="light" rx={5} />
      <Face x={5} y={20} w={W - 10} h={H - 40} />
      <Nameplate x={5} y={20} w={W - 10} h={8} tag={deviceTag(device) || 'GFCI'} text="GFCI" size={4.4} />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={cx - 17 + i * 20} y={50} width={14} height={20} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
          <path d={`M${cx - 13 + i * 20} 56v4M${cx - 7 + i * 20} 56v4M${cx - 10 + i * 20} 65v2`} stroke="var(--mat-line)" strokeWidth={1.2} />
        </g>
      ))}
      <Led cx={cx} cy={38} r={2.2} on={closed} color="green" />
      <g onClick={click(test)} className="cursor-pointer">
        <title>TEST: trips the GFCI</title>
        <rect x={cx - 26} y={76} width={22} height={9} rx={2} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={0.7} />
        <Mono x={cx - 15} y={82.4} size={4} anchor="middle" onDark>TEST</Mono>
      </g>
      <g onClick={click(reset)} className="cursor-pointer">
        <title>RESET: re-arms the GFCI</title>
        <rect x={cx + 4} y={76} width={22} height={9} rx={2} fill={tripped ? 'var(--danger)' : 'var(--mat-housing-dark-face)'} stroke="var(--mat-line)" strokeWidth={0.7} />
        <Mono x={cx + 15} y={82.4} size={4} anchor="middle" onDark>RESET</Mono>
      </g>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

const RELAY_TITLE: Record<string, string> = { voltage_relay: 'U< / U> RELAY', earth_leakage_relay: 'EARTH LEAKAGE', ptc_relay: 'PTC RELAY' };

/** Under/over-voltage relay, earth-leakage relay and PTC relay share one front: status LEDs, a reading and the output state. */
export const MonitoringRelayDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state, type } = device;
  const supplied = !!state.supplied;
  const on = !!state.relayOn;
  const fault = String(state.relayFault || '');
  const cx = W / 2;
  const faceY = 22;
  const faceH = H - 44;
  let reading = '';
  let status = '';
  let bad = false;
  if (type === 'voltage_relay') {
    reading = `${Number(state.senseV) || 0} V  (${state.nominalV} V −${state.underPct}% +${state.overPct}%)`;
    bad = supplied && !on;
    status = !supplied ? 'NO SUPPLY' : on ? 'VOLTAGE OK' : fault || (state.windowOk ? 'VOLTAGE OK' : 'OUT OF WINDOW');
  } else if (type === 'earth_leakage_relay') {
    reading = `${Number(state.leakageMa) || 0} mA  (set ${state.sensitivityMa} mA, ${state.delaySec} s)`;
    bad = on;
    status = !supplied ? 'NO SUPPLY' : on ? 'EARTH LEAKAGE' : 'HEALTHY';
  } else {
    reading = `${Number(state.windingC) || 40} °C  (trip ${state.tripTempC} °C)`;
    bad = supplied && !on;
    status = !supplied ? 'NO SUPPLY' : on ? 'WINDING OK' : 'OVER-TEMPERATURE';
  }
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={cx} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={H * 0.08 - 8} w={W - 6} h={16} />
      <Bay x={3} y={H * 0.92 - 8} w={W - 6} h={16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={8} tag={deviceTag(device) || 'K'} text={RELAY_TITLE[type]} size={4.2} />
      <Led cx={14} cy={faceY + 22} r={2.2} on={supplied} color="green" />
      <Mono x={19} y={faceY + 23.4} size={3.8} muted>PWR</Mono>
      <Led cx={W / 2 + 4} cy={faceY + 22} r={2.2} on={bad} color="red" />
      <Mono x={W / 2 + 9} y={faceY + 23.4} size={3.8} muted>FLT</Mono>
      <Mono x={cx} y={faceY + 36} size={3.4} anchor="middle">{reading}</Mono>
      <Mono x={cx} y={faceY + 46} size={3.8} anchor="middle" fill={bad ? 'var(--danger)' : supplied ? 'var(--ok)' : undefined} muted={!supplied}>{status}</Mono>
      <Silk x={cx} y={faceY + faceH - 4} size={3.6} anchor="middle" muted>{on ? '15-18 CLOSED' : '15-16 CLOSED'}</Silk>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

/** Core-balance CT (ring) and measuring CT. Shows the primary / secondary currents and a red open-secondary warning. */
export const CtDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state, type } = device;
  const zct = type === 'core_balance_ct';
  const cx = W / 2;
  const open = !!state.openSecondary;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Nameplate x={3} y={zct ? 20 : 4} w={W - 6} h={8} tag={deviceTag(device) || 'CT'} text={zct ? 'CORE-BAL CT' : `CT ${state.primaryA}/5A`} size={4} />
      <circle cx={cx} cy={zct ? 50 : 46} r={zct ? 15 : 16} fill="none" stroke="var(--mat-steel-dark)" strokeWidth={zct ? 6 : 6} />
      <circle cx={cx} cy={zct ? 50 : 46} r={zct ? 15 : 16} fill="none" stroke={open ? 'var(--danger)' : 'var(--probe, #38bdf8)'} strokeWidth={1.2} opacity={0.8} />
      {zct ? (
        <Mono x={cx} y={76} size={3.8} anchor="middle" fill={Number(state.leakageMa) > 0 ? 'var(--danger)' : undefined} muted={!(Number(state.leakageMa) > 0)}>{`${Number(state.leakageMa) || 0} mA residual`}</Mono>
      ) : (
        <>
          <Mono x={cx} y={74} size={3.8} anchor="middle">{`${Number(state.primaryAmps || 0).toFixed(1)} A → ${Number(state.secondaryA || 0).toFixed(2)} A`}</Mono>
          {open && <Mono x={cx} y={82} size={3.6} anchor="middle" fill="var(--danger)">OPEN SECONDARY!</Mono>}
        </>
      )}
      <TermIds device={device} local size={3.6} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

/** Panel ammeter (CT-operated): an arc scale and needle. */
export const AmmeterDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const full = Number(state.fullScaleA) || 100;
  const reading = Number(state.readingA) || 0;
  const frac = Math.max(0, Math.min(1, reading / full));
  const cx = W / 2;
  const cy = 58;
  const ang = (-150 + frac * 120) * (Math.PI / 180);
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Nameplate x={3} y={4} w={W - 6} h={8} tag={deviceTag(device) || 'PA'} text="AMMETER A" size={4} />
      <rect x={6} y={16} width={W - 12} height={46} rx={3} fill="var(--mat-housing-light, #f1f5f9)" stroke="var(--mat-line)" strokeWidth={0.8} />
      <path d={`M${cx - 26} ${cy - 6}A${26} ${26} 0 0 1 ${cx + 26} ${cy - 6}`} fill="none" stroke="var(--mat-line)" strokeWidth={0.9} />
      <path d={`M${cx} ${cy} L${cx + Math.cos(ang) * 26} ${cy + Math.sin(ang) * 26}`} stroke="var(--danger)" strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={2} fill="var(--mat-steel-dark)" />
      <Mono x={6} y={26} size={3.4} muted>0</Mono>
      <Mono x={W - 6} y={26} size={3.4} anchor="end" muted>{full}</Mono>
      <Mono x={cx} y={72} size={4.4} anchor="middle">{`${reading.toFixed(1)} A`}</Mono>
      <TermIds device={device} local size={3.6} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

const SELECTOR_STEPS = ['OFF', 'L1-L2', 'L2-L3', 'L3-L1', 'L1-N', 'L2-N', 'L3-N'];

/** Voltmeter with a 7-position phase selector: click the knob to step round. */
export const VoltmeterSelectorDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state } = device;
  const patch = makePatch(props);
  const sel = String(state.selector || 'L1-L2');
  const next = SELECTOR_STEPS[(SELECTOR_STEPS.indexOf(sel) + 1) % SELECTOR_STEPS.length];
  const cx = W / 2;
  const idx = Math.max(0, SELECTOR_STEPS.indexOf(sel));
  const a = ((-120 + idx * 40) * Math.PI) / 180;
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} />
      <Nameplate x={3} y={4} w={W - 6} h={8} tag={deviceTag(device) || 'PV'} text="VOLTMETER V" size={4} />
      <rect x={10} y={16} width={W - 20} height={22} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.8} />
      <Mono x={cx} y={32} size={9} anchor="middle" fill={Number(state.readingV) > 0 ? 'var(--ok)' : undefined} muted={!(Number(state.readingV) > 0)}>{`${Number(state.readingV) || 0} V`}</Mono>
      <g {...act(() => patch({ selector: next }))}>
        <title>Click to step the selector: {sel} → {next}</title>
        <circle cx={cx} cy={64} r={14} fill="var(--mat-housing-dark-face)" stroke="var(--mat-line)" strokeWidth={1} />
        <path d={`M${cx} 64L${cx + Math.sin(a) * 12} ${64 - Math.cos(a) * 12}`} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      </g>
      <Mono x={cx} y={86} size={4.4} anchor="middle">{sel}</Mono>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};

/** DIN-rail terminal strip (feed-through / fused / PE) and the power distribution block. */
export const TerminalBlockDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, state, type } = device;
  const patch = makePatch(props);
  const dist = type === 'distribution_block';
  const kind = String(state.kind || 'feedthrough');
  const open = (state.openPoles || {}) as Record<string, boolean>;
  const colour = kind === 'pe' ? '#16a34a' : dist ? '#b45309' : '#94a3b8';
  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <Housing w={W} h={H} m="shade" />
      {dist ? (
        <>
          <rect x={6} y={H * 0.4} width={W - 12} height={H * 0.22} rx={3} fill={colour} stroke="var(--mat-line)" strokeWidth={0.8} />
          <Mono x={W / 2} y={H * 0.4 + 12} size={4.4} anchor="middle" fill="#fff">1 IN → 4 OUT</Mono>
        </>
      ) : (
        [1, 2, 3, 4].map((n) => {
          const x = W * (0.14 + (n - 1) * 0.24);
          const pulled = kind === 'fused' && open[`p${n}`];
          return (
            <g key={n}>
              <rect x={x - 9} y={H * 0.2} width={18} height={H * 0.6} rx={2.5} fill={colour} stroke="var(--mat-line)" strokeWidth={0.7} />
              {kind === 'fused' ? (
                <g {...act(() => patch({ openPoles: { ...open, [`p${n}`]: !pulled } }))}>
                  <title>{pulled ? 'Fuse pulled: click to close' : 'Click to pull the fuse'}</title>
                  <rect x={x - 5} y={H * 0.36} width={10} height={H * 0.28} rx={2} fill={pulled ? 'var(--act-orange, #f59e0b)' : 'var(--mat-housing-dark-face)'} />
                </g>
              ) : (
                <path d={`M${x} ${H * 0.28}V${H * 0.72}`} stroke="var(--mat-steel-dark)" strokeWidth={1.4} />
              )}
              <Mono x={x} y={H * 0.52 + 1.4} size={4} anchor="middle" fill="#fff">{n}</Mono>
            </g>
          );
        })
      )}
      {dist && <Silk x={W / 2} y={H * 0.78} size={3.6} anchor="middle" muted>DISTRIBUTION</Silk>}
      <title>{dist ? 'Power distribution block' : kind === 'pe' ? 'PE terminal block (all poles bonded)' : kind === 'fused' ? 'Fused terminal block' : 'Feed-through terminal block'}</title>
      <TermIds device={device} local size={3.8} gap={0} text={(t) => t.label || t.id} />
      <Terminals {...props} local />
    </g>
  );
};
