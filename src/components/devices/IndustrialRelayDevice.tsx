import React from 'react';
import { Bay, DeviceProps, Housing, Led, Mono, Nameplate, Silk, SymCoil, SymNC, SymNO, Terminals, TermIds, act, deviceTag } from './kit';

/**
 * Plug-in DPDT control relay on a DIN socket. The clear cube shows the coil and both changeover
 * contacts; the LED lights and the armature pulls in when energized. Click the test tab to latch it.
 */
export const IndustrialRelayDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const on = !!device.state.coilEnergized;
  const toggle = () => {
    const next = !on;
    if (onPatchState) onPatchState(device.id, { manualTest: !device.state.manualTest, coilEnergized: next });
    else onToggleState?.({ ...device, state: { ...device.state, manualTest: !device.state.manualTest, coilEnergized: next } });
  };

  const tTop = H * (device.terminals[0]?.relY ?? 0.08);
  const bayH = 16;
  const topBayY = tTop - 7.8;
  const botBayY = H - tTop - 8.2;
  const cubeX = 8;
  const cubeY = topBayY + bayH + 9;
  const cubeW = W - 16;
  const cubeH = botBayY - 9 - cubeY;
  const contactX = [W * 0.48, W * 0.72];

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Socket base */}
      <Housing w={W} h={H} m="dark" />
      <Bay x={3} y={topBayY} w={W - 6} h={bayH} dark />
      <Bay x={3} y={botBayY} w={W - 6} h={bayH} dark />
      <rect className="d-dark-face" x={4} y={topBayY + bayH + 3} width={W - 8} height={botBayY - topBayY - bayH - 6} rx={2} />

      {/* Relay cube: clear polycarbonate cover */}
      <rect x={cubeX} y={cubeY} width={cubeW} height={cubeH} rx={3} fill="var(--mat-housing-shade)" stroke="var(--mat-line)" strokeWidth={1.1} />
      <rect x={cubeX + 2} y={cubeY + 2} width={cubeW - 4} height={cubeH - 4} rx={2} fill="var(--mat-housing)" opacity={0.85} />
      <Nameplate x={cubeX + 2} y={cubeY + 2} w={cubeW - 4} h={7} tag={deviceTag(device) || 'K'} text={`${device.state.coilVoltage || 230}VAC`} size={4.4} />

      {/* Coil (copper winding on a bobbin) */}
      <rect x={cubeX + 5} y={cubeY + 14} width={14} height={22} rx={1.5} fill="var(--mat-housing-dark-face)" />
      <rect x={cubeX + 7} y={cubeY + 16} width={10} height={18} rx={1} fill={on ? 'var(--mat-copper)' : 'var(--mat-copper-dark)'} />
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={i} d={`M${cubeX + 7} ${cubeY + 18 + i * 2.8}h10`} stroke="var(--mat-copper-dark)" strokeWidth={0.4} />
      ))}
      {/* Armature + contact blades */}
      <g style={{ transform: `translateX(${on ? -2.5 : 0}px)`, transition: 'transform 110ms ease-out' }}>
        <rect x={cubeX + 21} y={cubeY + 14} width={2.4} height={22} fill="var(--mat-steel-dark)" />
        {contactX.map((cx) => (
          <path key={cx} d={`M${cubeX + 23} ${cubeY + 24}H${cx - 1}`} stroke="var(--mat-steel)" strokeWidth={0.8} strokeDasharray="1.4 1" />
        ))}
      </g>
      {contactX.map((cx) => (
        <g key={cx}>
          <path d={`M${cx} ${cubeY + 38}V${cubeY + 26}L${cx + (on ? 4 : -4)} ${cubeY + 16}`} fill="none" stroke="var(--mat-copper)" strokeWidth={1.3} strokeLinecap="round" />
          <circle cx={cx - 4} cy={cubeY + 15} r={1.2} fill="var(--mat-steel)" />
          <circle cx={cx + 4} cy={cubeY + 15} r={1.2} fill="var(--mat-steel)" />
        </g>
      ))}

      <Led cx={cubeX + cubeW - 6} cy={cubeY + 45} r={1.8} on={on} color="red" />
      {/* Printed contact diagram */}
      <g className="pointer-events-none">
        <SymCoil x={cubeX + 12} y={cubeY + 41} s={0.9} />
        <SymNO x={contactX[0]} y={cubeY + 41} s={0.9} />
        <SymNC x={contactX[1]} y={cubeY + 41} s={0.9} />
      </g>
      <Mono x={cubeX + cubeW / 2} y={cubeY + cubeH - 4} size={3.6} anchor="middle" muted>DPDT 10A 250V~</Mono>

      {/* Manual test tab */}
      <g {...act(toggle)}>
        <title>Test tab: latch the contacts by hand</title>
        <rect x={cubeX + cubeW - 17} y={cubeY + 11} width={12} height={7} rx={1.2} fill={on ? 'var(--act-blue)' : 'var(--mat-housing-shade)'} stroke="var(--mat-line)" strokeWidth={0.7} />
        <Silk x={cubeX + cubeW - 11} y={cubeY + 16.2} size={3.8} anchor="middle" bold fill={on ? 'var(--on-act)' : undefined}>TEST</Silk>
      </g>

      <TermIds device={device} local size={4.2} gap={0.5} onDark />
      <Terminals {...props} local />
    </g>
  );
};
