import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Flag, FlagState, Housing, Lever, Mono, Nameplate, SealHole, Seams, Silk, SymBreaker,
  Terminals, TermIds, click, deviceTag,
} from './kit';

/**
 * Miniature circuit breakers (1P / 2P / 3P) and the 2P main service disconnect.
 * v2 construction: bays → face + nameplate → per-pole lever with tie bar → I/O/TRIP flag → terminals.
 * Click the lever to switch (or reset a trip), the nameplate to cycle the profile, T to trip-test.
 */
export const McbDevice: React.FC<DeviceProps> = (props) => {
  const { device, onToggleState } = props;
  const { width: W, height: H } = device;
  const isClosed = !!device.state.closed && !device.state.tripped;
  const isTripped = !!device.state.tripped;
  const ratedAmps = device.state.ratedAmps || 16;
  const curve = device.state.tripCurve || 'C';
  const is2P = device.type === 'mcb_2p' || device.type === 'service_disconnect_2p';
  const is3P = device.type === 'mcb_3p';
  const isMain = device.type === 'service_disconnect_2p';
  const poles = is3P ? 3 : is2P ? 2 : 1;

  const profile: 'royu_bolt_on' | 'royu_din_rail' | 'generic_iec' =
    device.state.breakerProfile ||
    (device.state.mccbStyle === 'industrial_black' ? 'royu_bolt_on' : is2P && !isMain ? 'royu_bolt_on' : 'royu_din_rail');
  const isBoltOn = profile === 'royu_bolt_on';

  // ROYU bolt-on handles are colour-coded by rating; DIN breakers use a black lever.
  const ampColors: Record<number, string> = {
    15: 'var(--act-blue)', 20: 'var(--act-red)', 30: 'var(--act-green)', 40: 'var(--mat-pvc-orange)',
  };
  const leverColor = isMain ? 'var(--act-red)' : isBoltOn ? ampColors[ratedAmps] || 'var(--act-black)' : 'var(--act-black)';

  const toggle = () => {
    if (isTripped) {
      device.state.tripped = false;
      device.state.closed = true;
    } else {
      device.state.closed = !device.state.closed;
    }
    onToggleState?.(device);
  };
  const cycleProfile = () => {
    const order = ['royu_bolt_on', 'royu_din_rail', 'generic_iec'] as const;
    const next = order[(order.indexOf(profile) + 1) % order.length];
    device.state.breakerProfile = next;
    device.state.mccbStyle = next === 'royu_bolt_on' ? 'industrial_black' : 'din_rail';
    onToggleState?.(device);
  };
  const tripTest = () => {
    device.state.tripped = !device.state.tripped;
    if (device.state.tripped) device.state.closed = false;
    onToggleState?.(device);
  };

  // Geometry from the terminal rows so every size keeps its catalogue terminal positions.
  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const bayH = tTop * 2 - 1.5;
  const botBayY = H - 2 - bayH;
  const faceY = 2 + bayH + 2;
  const faceH = botBayY - 2 - faceY;
  const pw = (W - 6) / poles;
  const poleCx = (i: number) => 3 + pw * i + pw / 2;
  const seamXs = Array.from({ length: poles - 1 }, (_, i) => 3 + pw * (i + 1));

  const plateY = faceY;
  const slotY = plateY + 10.5;
  const slotH = Math.min(26, faceH * 0.4);
  const leverPos = isTripped ? 0.5 : isClosed ? 0 : 1;
  const flagY = slotY + slotH + 3;
  const flagState: FlagState = isTripped ? 'trip' : isClosed ? 'on' : 'off';
  const lowerY = flagY + 9;
  const leverW = Math.min(15, pw - 7);

  const body = isBoltOn ? 'dark' : 'light';
  const onDark = isBoltOn;
  const tag = deviceTag(device);
  const brand = isMain ? 'MAIN' : isBoltOn ? 'ROYU' : profile === 'royu_din_rail' ? 'ROYU' : 'IEC';
  const kA = device.kaRating || (is3P ? 10 : 6);

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Mounting: copper bus stabs (bolt-on) or a DIN clip */}
      {isBoltOn
        ? Array.from({ length: poles }).map((_, i) => (
            <rect key={i} className="d-copper" x={poleCx(i) - 5} y={-3.5} width={10} height={4.5} rx={1} />
          ))
        : <DinClip cx={W / 2} y={H} />}

      {/* 1 Housing */}
      <Housing w={W} h={H} m={body} />
      {/* moulded side ribs */}
      <path className="d-seam" d={`M1.6 ${faceY + 4}V${botBayY - 4}M${W - 1.6} ${faceY + 4}V${botBayY - 4}`} />

      {/* 2 Bays + pole seams */}
      <Bay x={3} y={2} w={W - 6} h={bayH} dark={onDark} />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} dark={onDark} />
      <Seams xs={seamXs} y1={2} y2={H - 2} />

      {/* 3 Face + nameplate (click to cycle bolt-on / ROYU DIN / IEC DIN) */}
      <Face x={3} y={faceY} w={W - 6} h={faceH} dark={onDark} />
      <g onClick={click(cycleProfile)} className="cursor-pointer">
        <title>Click the nameplate to cycle the breaker profile (bolt-on / ROYU DIN / IEC DIN)</title>
        <Nameplate x={3} y={plateY} w={W - 6} h={8} tag={tag} text={`${curve}${ratedAmps}`} size={poles === 1 ? 4.8 : 5.4} />
      </g>

      {/* 4 State: levers (one per pole, tied), flag window */}
      <g onClick={click(toggle)} className="cursor-pointer">
        <title>{isTripped ? 'Tripped: click the lever to reset' : `Click the lever to switch ${isClosed ? 'OFF' : 'ON'}`}</title>
        {Array.from({ length: poles }).map((_, i) => (
          <Lever key={i} cx={poleCx(i)} y={slotY} slotH={slotH} w={leverW} pos={leverPos} color={leverColor} />
        ))}
        {poles > 1 && (
          <rect
            x={poleCx(0)}
            y={slotY + 2 + (slotH - 13) * leverPos + 3}
            width={pw * (poles - 1)}
            height={3}
            rx={1}
            fill="var(--mat-housing-dark-face)"
            stroke="var(--mat-line)"
            strokeWidth={0.6}
          />
        )}
        {/* ON / OFF arrows printed beside the slot */}
        <Silk x={3 + 2.2} y={slotY + 4.5} size={3.8} onDark={onDark} muted={!onDark}>I</Silk>
        <Silk x={3 + 2.2} y={slotY + slotH - 1} size={3.8} onDark={onDark} muted={!onDark}>O</Silk>
      </g>
      <Flag cx={W / 2} y={flagY} state={flagState} />

      {/* Silkscreen: breaker symbol, brand, ratings */}
      <SymBreaker x={9} y={lowerY} s={0.9} dark={onDark} />
      <Silk x={W / 2 + (poles === 1 ? 3 : 0)} y={lowerY + 4.6} anchor="middle" size={poles === 1 ? 4.6 : 5.2} bold onDark={onDark}>
        {brand}
      </Silk>
      <Silk x={W / 2 + (poles === 1 ? 3 : 0)} y={lowerY + 9.6} anchor="middle" size={4.2} muted={!onDark} onDark={onDark}>
        {is3P ? '400V~' : '230V~'}
      </Silk>
      {/* breaking-capacity box (EN 60898: "6000" + energy class 3) */}
      {poles > 1 && (
        <g className="pointer-events-none">
          <rect x={W - 21} y={lowerY + 0.5} width={14} height={6} fill="none" stroke={onDark ? 'var(--silk-on-dark)' : 'var(--silk)'} strokeWidth={0.5} />
          <Mono x={W - 14} y={lowerY + 5} size={3.8} anchor="middle" onDark={onDark}>{kA * 1000}</Mono>
          <rect x={W - 21} y={lowerY + 7} width={6} height={4.5} fill="none" stroke={onDark ? 'var(--silk-on-dark)' : 'var(--silk)'} strokeWidth={0.5} />
          <Mono x={W - 18} y={lowerY + 10.6} size={3.4} anchor="middle" onDark={onDark}>3</Mono>
        </g>
      )}

      {/* Trip-test button (multi-pole) */}
      {poles > 1 && (
        <g onClick={click(tripTest)} className="cursor-pointer">
          <title>Trip test</title>
          <circle cx={W - 9} cy={faceY + faceH - 6} r={3.4} fill="var(--act-yellow)" stroke="var(--mat-line)" strokeWidth={0.8} />
          <Mono x={W - 9} y={faceY + faceH - 4.6} size={4} anchor="middle" fill="var(--mat-line)">T</Mono>
        </g>
      )}
      {isMain && <SealHole cx={8} cy={faceY + faceH - 6} />}

      {/* 5 Terminals + IEC markings beside each screw */}
      <TermIds device={device} local onDark={onDark} size={4.8} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};

