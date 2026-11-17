import React from 'react';
import { Bay, DeviceProps, Housing, LegendPlate, Nameplate, PushButton, Screw, SymNC, SymNO, Terminals, TermIds, deviceTag, momentaryPress } from './kit';

/**
 * Two-button 22 mm control station: START (green, momentary NO 3-4) above STOP (red, momentary NC 1-2).
 * Hold a button to press it; it springs back on release.
 */
export const PushButtonStationDevice: React.FC<DeviceProps> = (props) => {
  const { device, onPatchState, onToggleState } = props;
  const { width: W, height: H } = device;
  const start = !!device.state.startPressed;
  const stop = !!device.state.stopPressed;
  const press = (e: React.MouseEvent, key: 'startPressed' | 'stopPressed') => {
    if (onPatchState) momentaryPress(e, device.id, key, onPatchState);
    else {
      e.stopPropagation();
      onToggleState?.({ ...device, state: { ...device.state, [key]: !device.state[key] } });
    }
  };
  const tTop = H * (device.terminals[0]?.relY ?? 0.07);
  const topBayY = tTop - 7.8;
  const botBayY = H - tTop - 8.2;
  const cx = W / 2;
  const startY = H * 0.4;
  const stopY = H * 0.7;

  return (
    <g transform={`translate(${device.x}, ${device.y})`} className="select-none">
      {/* Enclosure (grey polycarbonate) with lid screws */}
      <Housing w={W} h={H} m="shade" rx={4} />
      <Bay x={3} y={topBayY} w={W - 6} h={16} />
      <Bay x={3} y={botBayY} w={W - 6} h={16} />
      <rect className="d-face" x={5} y={topBayY + 21} width={W - 10} height={botBayY - topBayY - 26} rx={3} />
      <Screw cx={10} cy={topBayY + 26} r={1.8} />
      <Screw cx={W - 10} cy={topBayY + 26} r={1.8} />
      <Screw cx={10} cy={botBayY - 6} r={1.8} />
      <Screw cx={W - 10} cy={botBayY - 6} r={1.8} />
      <Nameplate x={16} y={topBayY + 22.5} w={W - 32} h={7} tag={deviceTag(device) || 'S'} text="XAL" size={4.4} />

      {/* START */}
      <LegendPlate cx={cx} y={startY - 20} w={30} text="START" />
      <g onMouseDown={(e) => press(e, 'startPressed')} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
        <title>START: momentary NO 3-4 (hold to press)</title>
        <PushButton cx={cx} cy={startY} r={9} color="green" pressed={start} legend="I" />
      </g>
      <SymNO x={W - 11} y={startY - 5} s={1} />

      {/* STOP */}
      <LegendPlate cx={cx} y={stopY - 20} w={30} text="STOP" />
      <g onMouseDown={(e) => press(e, 'stopPressed')} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
        <title>STOP: momentary NC 1-2 (hold to open)</title>
        <PushButton cx={cx} cy={stopY} r={9} color="red" pressed={stop} legend="O" />
      </g>
      <SymNC x={W - 9} y={stopY - 5} s={1} />

      <TermIds device={device} local size={4.4} side={(t) => (t.relX < 0.5 ? 'left' : 'right')} text={(t) => (t.label || t.id).split(' ')[0]} />
      <Terminals {...props} local />
    </g>
  );
};
