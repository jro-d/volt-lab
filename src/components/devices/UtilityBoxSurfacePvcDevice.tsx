import React from 'react';
import { Bay, DeviceProps, Mono, Pill, Screw, Terminals, TermIds } from './kit';

/**
 * 2×4 surface utility box (orange PVC or galvanized steel), open: device mounting ears top and
 * bottom, knockouts, and L / N / PE runs passing from the IN strip to the OUT strip.
 */
export const UtilityBoxSurfacePvcDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const isPvc = device.state.boxMaterial !== 'galvanized_steel';
  const toggleMaterial = () => {
    const next = isPvc ? 'galvanized_steel' : 'orange_pvc';
    if (onPatchState) onPatchState(device.id, { boxMaterial: next });
    else {
      device.state.boxMaterial = next;
      onToggleState?.({ ...device, state: { ...device.state, boxMaterial: next } });
    }
  };
  const fill = isPvc ? 'var(--mat-pvc-orange)' : 'var(--mat-steel)';
  const dark = isPvc ? 'var(--mat-pvc-orange-dark)' : 'var(--mat-steel-dark)';
  const ins = device.terminals.filter((t) => t.relY < 0.5);
  const outs = device.terminals.filter((t) => t.relY >= 0.5);
  const topY = H * (ins[0]?.relY ?? 0.12);
  const botY = H * (outs[0]?.relY ?? 0.88);
  const runCol = ['var(--cond-red)', 'var(--cond-white)', 'var(--cond-green)'];

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      <rect x={0} y={0} width={W} height={H} rx={4} fill={fill} stroke="var(--mat-line)" strokeWidth={1.25} />
      <rect x={5} y={5} width={W - 10} height={H - 10} rx={3} fill={dark} opacity={0.35} stroke={dark} strokeWidth={1} />
      {/* knockouts on the sides */}
      {[H * 0.35, H * 0.65].map((ky) => [3, W - 3].map((kx) => (
        <circle key={`${kx}-${ky}`} cx={kx} cy={ky} r={4} fill={fill} stroke={dark} strokeWidth={0.7} />
      )))}
      {/* device mounting ears */}
      {[topY + 13, botY - 13].map((ey) => (
        <g key={ey}>
          <rect x={W / 2 - 7} y={ey - 4} width={14} height={8} rx={2} fill={fill} stroke="var(--mat-line)" strokeWidth={0.6} />
          <Screw cx={W / 2} cy={ey} r={1.8} />
        </g>
      ))}
      {/* pass-through runs IN → OUT */}
      {ins.map((t, i) => {
        const x = W * t.relX;
        return (
          <g key={t.id} className="pointer-events-none">
            <path d={`M${x} ${topY + 7}V${botY - 7}`} stroke="var(--wire-casing)" strokeWidth={4.2} strokeLinecap="round" />
            <path d={`M${x} ${topY + 7}V${botY - 7}`} stroke={runCol[i] || 'var(--cond-black)'} strokeWidth={2.8} strokeLinecap="round" />
          </g>
        );
      })}
      <rect className="d-nameplate" x={W / 2 - 18} y={H / 2 - 6} width={36} height={12} rx={1.5} />
      <Mono x={W / 2} y={H / 2 - 0.6} size={4} anchor="middle" onDark>{isPvc ? '2×4 PVC' : '2×4 GI'}</Mono>
      <Mono x={W / 2} y={H / 2 + 4.2} size={3.2} anchor="middle" fill="var(--console-muted)">UTILITY BOX</Mono>
      <Bay x={5} y={topY - 8} w={W - 10} h={16} />
      <Bay x={5} y={botY - 8} w={W - 10} h={16} />
      <Pill cx={W / 2} cy={H / 2 + 13} w={16} label={isPvc ? 'PVC' : 'GI'} title="Switch the box material: orange PVC or galvanized steel" onToggle={toggleMaterial} />

      <TermIds device={device} local size={3.6} gap={1.5} onDark={isPvc} text={(t) => (t.label || t.id).split('_')[0]} />
      <Terminals {...props} local />
    </g>
  );
};
