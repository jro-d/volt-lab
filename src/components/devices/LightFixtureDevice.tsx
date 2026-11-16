import React from 'react';
import { Bay, DeviceProps, Mono, Terminals, TermIds } from './kit';

/** A19 incandescent lamp in a porcelain E27 holder. Lit: warm glass, glowing filament and halo. */
export const LightFixtureDevice: React.FC<DeviceProps> = (props) => {
  const { device } = props;
  const { width: W, height: H } = device;
  const lit = !!device.state.lit;
  const wattage = device.state.wattage || 60;
  const brightness = typeof device.state.brightness === 'number' ? device.state.brightness : lit ? 1 : 0;
  const cx = W / 2;
  const ty = H * (device.terminals[0]?.relY ?? 0.9);
  const holderY = ty - 22;
  const bulbCy = holderY - 26;
  const r = Math.min(19, W / 2 - 6);

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {lit && <circle cx={cx} cy={bulbCy} r={r * 2} fill="var(--lamp-glow)" opacity={0.5 + brightness * 0.5} className="pointer-events-none" />}
      {lit && <circle cx={cx} cy={bulbCy} r={r * 1.4} fill="var(--lamp-glow)" className="pointer-events-none" />}

      {/* Glass envelope */}
      <path
        d={`M${cx - 8} ${holderY - 2}C${cx - 8} ${bulbCy + r * 0.8} ${cx - r} ${bulbCy + r * 0.6} ${cx - r} ${bulbCy}a${r} ${r} 0 0 1 ${r * 2} 0c0 ${r * 0.6} ${-r + 8} ${r * 0.8} ${-r + 8} ${holderY - 2 - bulbCy}z`}
        fill={lit ? 'var(--lamp-white-on)' : 'var(--mat-porcelain)'}
        fillOpacity={lit ? 1 : 0.55}
        stroke="var(--mat-line)"
        strokeWidth={1}
      />
      <path d={`M${cx - r * 0.55} ${bulbCy - r * 0.45}a${r * 0.7} ${r * 0.7} 0 0 1 ${r * 0.45} ${-r * 0.35}`} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.4} strokeLinecap="round" />
      {/* Stem, lead wires, coiled filament */}
      <path d={`M${cx - 3} ${holderY - 2}V${bulbCy + 4}M${cx + 3} ${holderY - 2}V${bulbCy + 4}`} stroke="var(--mat-steel-dark)" strokeWidth={0.6} />
      <path
        d={`M${cx - 3} ${bulbCy + 4}l0 -6q1.5 -2 3 0t3 0l0 6`}
        fill="none"
        stroke={lit ? 'var(--lamp-amber-on)' : 'var(--mat-line-soft)'}
        strokeWidth={lit ? 1.3 : 0.8}
        strokeLinejoin="round"
      />
      <Mono x={cx} y={bulbCy + 12} size={4.4} anchor="middle" muted={!lit}>{`${wattage}W`}</Mono>

      {/* E27 screw base */}
      <rect className="d-steel" x={cx - 8.5} y={holderY - 4} width={17} height={8} rx={1.5} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${cx - 8.5} ${holderY - 2.6 + i * 2.4}l17 1`} stroke="var(--mat-steel-dark)" strokeWidth={0.6} />
      ))}

      {/* Porcelain lampholder with terminal bay */}
      <path className="d-porcelain" d={`M${cx - 14} ${holderY + 4}H${cx + 14}L${W - 4} ${holderY + 11}V${H - 3}a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2V${holderY + 11}z`} />
      <Mono x={cx} y={holderY + 10.5} size={3.8} anchor="middle" muted>E27 · 230V</Mono>
      <Bay x={7} y={ty - 8} w={W - 14} h={16} />

      <TermIds device={device} local size={4.2} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
