import React from 'react';
import { Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, Seams, Silk, Terminals, TermIds, act, deviceTag } from './kit';

/**
 * Compact logic module (LOGO!-class micro PLC): L/N supply + I1–I4 inputs on top, four relay
 * outputs Q1–Q4 below. Backlit LCD (click to switch between status and I/O monitor), I/O LEDs,
 * RUN LED and the six-key keypad.
 */
export const PlcDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const powered = !!device.state.plcPowered;
  const running = powered && device.state.plcRunning !== false;
  const inputs: Record<string, boolean> = device.state.plcInputs || {};
  const outputs: Record<string, boolean> = device.state.plcOutputs || {};
  const pageIdx = Number(device.state.plcMenuPage || 0) % 2;
  const toggleMenu = () => {
    const next = pageIdx === 0 ? 1 : 0;
    if (onPatchState) onPatchState(device.id, { plcMenuPage: next });
    else onToggleState?.({ ...device, state: { ...device.state, plcMenuPage: next } });
  };

  const tTop = H * (device.terminals[0]?.relY ?? 0.09);
  const botTy = H * (device.terminals.find((t) => t.relY > 0.5)?.relY ?? 0.91);
  const topBayY = tTop - 8;
  const botBayY = botTy - 8;
  const faceY = topBayY + 18;
  const faceH = botBayY - 2 - faceY;
  const ins = ['i1', 'i2', 'i3', 'i4'] as const;
  const outs = ['q1', 'q2', 'q3', 'q4'] as const;
  const outPairs = outs.map((q, i) => {
    const a = device.terminals.find((t) => t.id === `${q}_1`);
    const b = device.terminals.find((t) => t.id === `${q}_2`);
    return { q, i, x1: W * (a?.relX ?? 0), x2: W * (b?.relX ?? 0) };
  });
  const lcd = { x: 8, y: faceY + 21, w: 74, h: 34 };

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <DinClip cx={W / 2} y={H} />
      <Housing w={W} h={H} />
      <Bay x={3} y={topBayY} w={W * 0.3} h={16} />
      <Bay x={W * 0.33} y={topBayY} w={W * 0.67 - 3} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <Seams xs={outPairs.slice(1).map((p) => (p.x1 + outPairs[p.i - 1].x2) / 2)} y1={botBayY} y2={botBayY + 16} />
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 6} w={W - 6} h={8} tag={deviceTag(device) || 'A'} center="LOGIC MODULE 230RC" text="4DI/4DO" size={4.6} />

      {/* LCD */}
      <g {...act(toggleMenu)}>
        <title>Click the display to switch between status and I/O monitor</title>
        <rect className="d-dark-face" x={lcd.x} y={lcd.y} width={lcd.w} height={lcd.h} rx={2} />
        <rect x={lcd.x + 2.5} y={lcd.y + 2.5} width={lcd.w - 5} height={lcd.h - 5} rx={1} fill={powered ? 'var(--lcd-bg)' : 'var(--mat-housing-dark-face)'} />
        {powered &&
          (pageIdx === 0 ? (
            <g>
              <rect x={lcd.x + 2.5} y={lcd.y + 2.5} width={lcd.w - 5} height={7} fill="var(--lcd-ink)" />
              <Mono x={lcd.x + 5} y={lcd.y + 8} size={4.4} fill="var(--lcd-bg)">{running ? '▶ RUN' : '■ STOP'}</Mono>
              <Mono x={lcd.x + 5} y={lcd.y + 17} size={4.4} fill="var(--lcd-ink)">Mo 08:30</Mono>
              <Mono x={lcd.x + 5} y={lcd.y + 24} size={4.4} fill="var(--lcd-ink)">PRG: MOTOR_SEQ</Mono>
              
            </g>
          ) : (
            <g>
              <Mono x={lcd.x + 5} y={lcd.y + 11} size={4.4} fill="var(--lcd-ink)">I 1234</Mono>
              <Mono x={lcd.x + 5} y={lcd.y + 25} size={4.4} fill="var(--lcd-ink)">Q 1234</Mono>
              {ins.map((k, i) => (
                <rect key={k} x={lcd.x + 22 + i * 10} y={lcd.y + 13.5} width={7} height={4} fill={inputs[k] ? 'var(--lcd-ink)' : 'none'} stroke="var(--lcd-ink)" strokeWidth={0.6} />
              ))}
              {outs.map((k, i) => (
                <rect key={k} x={lcd.x + 22 + i * 10} y={lcd.y + 27.5} width={7} height={4} fill={outputs[k] ? 'var(--lcd-ink)' : 'none'} stroke="var(--lcd-ink)" strokeWidth={0.6} />
              ))}
            </g>
          ))}
      </g>

      {/* Keypad */}
      {(() => {
        const kx = lcd.x + lcd.w + 14;
        const ky = lcd.y + 4;
        const key = (x: number, y: number, label: string, w = 9) => (
          <g key={label} className="pointer-events-none">
            <rect x={x} y={y} width={w} height={7} rx={1.2} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={0.6} />
            <Mono x={x + w / 2} y={y + 5.1} size={3.8} anchor="middle">{label}</Mono>
          </g>
        );
        return (
          <g>
            {key(kx + 10, ky, '▲')}
            {key(kx, ky + 9, '◀')}
            {key(kx + 20, ky + 9, '▶')}
            {key(kx + 10, ky + 18, '▼')}
            {key(kx + 34, ky + 4, 'ESC', 13)}
            {key(kx + 34, ky + 14, 'OK', 13)}
          </g>
        );
      })()}

      {/* I/O status LEDs above their terminals, RUN LED */}
      {ins.map((k) => {
        const t = device.terminals.find((x) => x.id === k);
        return t ? <Led key={k} cx={W * t.relX} cy={faceY + 18} r={1.4} on={powered && !!inputs[k]} color="green" ring={false} /> : null;
      })}
      {outPairs.map((p) => (
        <g key={p.q}>
          <Led cx={(p.x1 + p.x2) / 2} cy={faceY + faceH - 13} r={1.6} on={powered && !!outputs[p.q]} color="amber" />
          <Silk x={(p.x1 + p.x2) / 2} y={faceY + faceH - 5} size={4.2} anchor="middle" bold>{p.q.toUpperCase()}</Silk>
        </g>
      ))}
      <Led cx={W - 12} cy={lcd.y + lcd.h - 4} r={1.8} on={running} color="green" />
      <Mono x={W - 16} y={lcd.y + lcd.h - 2.6} size={3.6} anchor="end" muted>RUN</Mono>

      <TermIds device={device} local size={4.2} gap={0.6} onDark={false} skip={(t) => t.relY > 0.5} side={() => 'below'} />
      <Terminals {...props} local />
    </g>
  );
};
