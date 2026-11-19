import React from 'react';
import {
  Bay, DeviceProps, DinClip, Face, Housing, Led, Mono, Nameplate, Terminals, TermIds, act, deviceTag, makePatch,
} from './kit';

const n1 = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Batch 3.7 automation devices: 5/2 valve, cylinder, analog I/O module, HMI panel. */
export const AutomationModuleDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H, type, state } = device;
  const patch = makePatch(props);
  const tag = deviceTag(device) || String(state.tag || '');
  const rels = device.terminals.map((t) => t.relY);
  const hasTop = rels.some((r) => r < 0.5);
  const hasBot = rels.some((r) => r > 0.5);
  const topBayY = hasTop ? H * Math.min(...rels.filter((r) => r < 0.5)) - 8 : 0;
  const botBayY = hasBot ? H * Math.max(...rels.filter((r) => r > 0.5)) - 8 : H;
  const faceY = hasTop ? topBayY + 18 : 4;
  const faceB = hasBot ? botBayY - 2 : H - 4;
  const faceH = faceB - faceY;
  const cx = W / 2;
  const y0 = faceY + 16;

  if (type === 'cylinder_da') {
    const pos = n1(state.position);
    const bodyW = W - 60;
    const rodX = 30 + bodyW * (pos / 100) * 0.55;
    return (
      <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
        <rect x={10} y={22} width={bodyW + 20} height={34} rx={3} fill="var(--mat-steel)" stroke="var(--mat-line)" strokeWidth={1.2} />
        <rect x={10} y={22} width={14} height={34} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" />
        <rect x={10 + bodyW + 6} y={22} width={14} height={34} fill="var(--mat-housing-dark)" stroke="var(--mat-line)" />
        <rect x={rodX} y={36} width={bodyW * 0.45 + 40 - (rodX - 30)} height={6} fill="var(--mat-steel-dark, #94a3b8)" stroke="var(--mat-line)" strokeWidth={0.6} />
        <rect x={rodX - 4} y={24} width={8} height={30} fill="var(--act-orange, #f59e0b)" stroke="var(--mat-line)" strokeWidth={0.8} />
        <Mono x={W / 2} y={14} size={5} anchor="middle" weight={700}>{`${tag} ${pos.toFixed(0)} %`}</Mono>
        <Mono x={W / 2} y={70} size={4} anchor="middle" muted>{state.atExtended ? 'extended' : state.atRetracted ? 'retracted' : state.moving ? 'moving' : 'mid stroke'}</Mono>
        <title>Double-acting cylinder: driven by the valve named in the inspector</title>
      </g>
    );
  }

  const frame = (center: string, text: string, body: React.ReactNode) => (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {type !== 'hmi_panel' && <DinClip cx={cx} y={H} />}
      <Housing w={W} h={H} m="light" rx={4} />
      {hasTop && <Bay x={3} y={topBayY} w={W - 6} h={16} />}
      {hasBot && <Bay x={3} y={botBayY} w={W - 6} h={16} />}
      <Face x={3} y={faceY} w={W - 6} h={faceH} />
      <Nameplate x={3} y={faceY + 2} w={W - 6} h={9} tag={tag} center={center} text={text} size={4.6} />
      {body}
      <TermIds device={device} local size={3.4} gap={0} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
  const led = (x: number, y: number, on: boolean, color: 'green' | 'red' | 'amber', label: string) => (
    <g>
      <Led cx={x} cy={y} r={2.2} on={on} color={color} />
      <Mono x={x + 5} y={y + 1.4} size={3.6} muted>{label}</Mono>
    </g>
  );

  switch (type) {
    case 'valve_52': {
      const spool = String(state.spool || 'none');
      const left = spool === 'adv';
      return frame('5/2 VALVE', spool === 'adv' ? 'ADVANCE' : spool === 'ret' ? 'RETRACT' : spool === 'blocked' ? 'BLOCKED' : 'MEMORY', (
        <g>
          <rect className="d-shade" x={cx - 32} y={y0} width={64} height={28} rx={2} />
          <line x1={cx} x2={cx} y1={y0} y2={y0 + 28} stroke="var(--mat-line)" />
          <g transform={`translate(${left ? -6 : 6}, 0)`} style={{ transition: 'transform 200ms' }}>
            <path d={`M${cx - 24} ${y0 + 4}l12 20M${cx - 12} ${y0 + 4}l-12 20M${cx + 12} ${y0 + 4}v20M${cx + 24} ${y0 + 4}v20`} stroke="var(--mat-line)" strokeWidth={1.4} fill="none" />
          </g>
          {led(16, y0 + 38, !!state.y1, 'green', 'Y1')}
          {led(W - 40, y0 + 38, !!state.y2, 'amber', 'Y2')}
          <Mono x={cx} y={y0 + 52} size={3.8} anchor="middle" muted>{state.y1 && state.y2 ? 'both coils on: no movement' : 'double solenoid keeps its position'}</Mono>
        </g>
      ));
    }

    case 'analog_io_module': {
      const row = (i: 1 | 2, y: number) => {
        const type = String(state[`type${i}`] || (i === 1 ? '4-20mA' : '0-10V'));
        const fault = String(state[`fault${i}`] || '');
        return (
          <g key={i}>
            <Mono x={12} y={y} size={4.4}>{`AI${i}`}</Mono>
            <Mono x={28} y={y} size={4.4} muted>{type}</Mono>
            <Mono x={cx + 12} y={y} size={5.2} weight={700} fill={fault ? 'var(--act-red, #dc2626)' : undefined}>{`${n1(state[`raw${i}`]).toFixed(2)} ${type === '4-20mA' ? 'mA' : 'V'}`}</Mono>
            <Mono x={W - 10} y={y} size={5.2} anchor="end">{fault ? '!' : n1(state[`eng${i}`]).toFixed(1)}</Mono>
            {fault && <Mono x={12} y={y + 7} size={3.6} fill="var(--act-red, #dc2626)">{fault}</Mono>}
          </g>
        );
      };
      return frame('ANALOG', state.powered ? '2AI 1AO' : 'NO POWER', (
        <g>
          {row(1, y0 + 4)}
          {row(2, y0 + 22)}
          <Mono x={12} y={y0 + 44} size={4.4}>AO1</Mono>
          <Mono x={cx + 12} y={y0 + 44} size={5.2} weight={700}>{`${n1(state.aoMa, 12).toFixed(2)} mA`}</Mono>
          {led(14, y0 + 56, !!state.powered, 'green', 'POWER')}
        </g>
      ));
    }

    case 'hmi_panel': {
      return frame('HMI', state.linked ? 'LINKED' : 'NO PLC', (
        <g>
          {[1, 2, 3, 4].map((i) => {
            const on = !!state[`btn${i}`];
            const x = 12 + (i - 1) * ((W - 24) / 4);
            return (
              <g key={i} {...act(() => patch({ [`btn${i}`]: !on }))}>
                <title>{`Soft button ${i} (PLC input ${String(state[`btn${i}Addr`] || `I0.${3 + i}`)}): click to toggle`}</title>
                <rect x={x} y={y0 + 4} width={(W - 24) / 4 - 4} height={20} rx={3} fill={on ? 'var(--ok)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" />
                <Mono x={x + ((W - 24) / 4 - 4) / 2} y={y0 + 17} size={5} anchor="middle" onDark={on}>{`B${i}`}</Mono>
              </g>
            );
          })}
          {[1, 2, 3, 4].map((i) => (
            <g key={i}>{led(14 + (i - 1) * ((W - 24) / 4), y0 + 38, !!state[`lamp${i}`], 'green', `L${i}`)}</g>
          ))}
          <Mono x={cx} y={y0 + 54} size={3.8} anchor="middle" muted>{state.plcId ? `bound to ${String(state.plcId).slice(-10)}` : 'choose a PLC in the inspector'}</Mono>
        </g>
      ));
    }

    default:
      return null;
  }
};
