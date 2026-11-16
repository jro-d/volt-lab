import React from 'react';
import { DeviceProps, Mono, Pill, Screw, Strap, Terminals, TermIds } from './kit';

/**
 * 4" junction box, open: galvanized-steel square box or orange PVC octagonal box. Knockouts on
 * every side, cover-screw bosses, and the spliced pairs (L, N, PE, SW) joined inside.
 * The pill switches material (GI ↔ PVC).
 */
export const JunctionBoxDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const isPvc = device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc';
  const isOct = device.type === 'junction_box_octagonal_orange';
  const toggleMaterial = () => {
    const next = isPvc ? 'galvanized_steel' : 'orange_pvc';
    if (onPatchState) onPatchState(device.id, { boxMaterial: next });
    else {
      device.state.boxMaterial = next;
      onToggleState?.({ ...device, state: { ...device.state, boxMaterial: next } });
    }
  };
  const c = 9;
  const outline = isOct
    ? `M${c * 2.6} 0H${W - c * 2.6}L${W} ${c * 2.6}V${H - c * 2.6}L${W - c * 2.6} ${H}H${c * 2.6}L0 ${H - c * 2.6}V${c * 2.6}z`
    : `M3 0H${W - 3}a3 3 0 0 1 3 3V${H - 3}a3 3 0 0 1 -3 3H3a3 3 0 0 1 -3 -3V3a3 3 0 0 1 3 -3z`;
  const bodyFill = isPvc ? 'var(--mat-pvc-orange)' : 'var(--mat-steel)';
  const bodyStroke = isPvc ? 'var(--mat-pvc-orange-dark)' : 'var(--mat-steel-dark)';
  const pt = (id: string) => {
    const t = device.terminals.find((x) => x.id === id);
    return t ? { x: W * t.relX, y: H * t.relY } : null;
  };
  const pairs: [string, string, string][] = [
    ['l_in', 'l_out', 'var(--cond-red)'],
    ['n_in', 'n_out', 'var(--cond-white)'],
    ['pe_in', 'pe_out', 'var(--cond-green)'],
    ['sw_in', 'sw_out', 'var(--cond-yellow)'],
  ];
  const knock = [
    [W / 2, 4], [W / 2, H - 4], [4, H / 2], [W - 4, H / 2],
  ];

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <path d={outline} fill={bodyFill} stroke="var(--mat-line)" strokeWidth={1.25} />
      {/* inner wall + floor */}
      <path d={outline} fill="none" stroke={bodyStroke} strokeWidth={5} transform={`translate(${W * 0.06} ${H * 0.06}) scale(0.88)`} />
      <path d={outline} fill={isPvc ? 'var(--mat-pvc-orange-dark)' : 'var(--mat-steel-dark)'} opacity={0.35} transform={`translate(${W * 0.1} ${H * 0.1}) scale(0.8)`} />
      {/* knockouts */}
      {knock.map(([kx, ky], i) => (
        <g key={i} className="pointer-events-none">
          <circle cx={kx} cy={ky} r={5} fill={bodyFill} stroke={bodyStroke} strokeWidth={0.8} />
          <circle cx={kx} cy={ky} r={3.4} fill="none" stroke={bodyStroke} strokeWidth={0.5} strokeDasharray="1.2 0.8" />
        </g>
      ))}
      {/* cover-screw bosses */}
      {(isOct ? [[W / 2, 11], [W / 2, H - 11]] : [[12, 12], [W - 12, H - 12]]).map(([sx, sy], i) => (
        <g key={i}>
          <circle cx={sx} cy={sy} r={4} fill={bodyFill} stroke="var(--mat-line)" strokeWidth={0.6} />
          <Screw cx={sx} cy={sy} r={2} />
        </g>
      ))}
      {/* spliced pairs */}
      {pairs.map(([a, b, col]) => {
        const pa = pt(a);
        const pb = pt(b);
        if (!pa || !pb) return null;
        return (
          <g key={a} className="pointer-events-none">
            <path d={`M${pa.x} ${pa.y}L${pb.x} ${pb.y}`} stroke="var(--wire-casing)" strokeWidth={4.4} strokeLinecap="round" />
            <path d={`M${pa.x} ${pa.y}L${pb.x} ${pb.y}`} stroke={col} strokeWidth={3} strokeLinecap="round" />
            <Strap d={`M${(pa.x + pb.x) / 2 - 0.1} ${(pa.y + pb.y) / 2}h0.2`} live w={5} />
          </g>
        );
      })}
      <Mono x={W / 2} y={H / 2 + 1.6} size={4.4} anchor="middle" fill={isPvc ? 'var(--silk-on-dark)' : 'var(--silk)'}>{isOct ? '4" OCT' : '4" SQ'}</Mono>
      <Pill cx={W / 2} cy={H / 2 + 9} w={18} label={isPvc ? 'PVC' : 'GI'} title="Switch the box material: orange PVC or galvanized steel" onToggle={toggleMaterial} />

      <TermIds device={device} local size={3.8} onDark={isPvc} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} />
      <Terminals {...props} local />
    </g>
  );
};
