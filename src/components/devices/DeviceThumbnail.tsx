import React from 'react';
import { DeviceType } from '../../types/electrical';
import { createDeviceFromCatalog } from '../../data/defaultComponents';
import { DeviceRenderer } from './DeviceRenderer';

interface DeviceThumbnailProps {
  type: DeviceType;
  className?: string;
}

const noop = () => {};

/**
 * Library thumbnail: the real device drawing, scaled to fit. Uses the same renderer as the
 * workbench, so the library always matches what lands on the canvas.
 */
export const DeviceThumbnail: React.FC<DeviceThumbnailProps> = ({ type, className = 'w-14 h-14' }) => {
  const device = React.useMemo(() => {
    try {
      return createDeviceFromCatalog(type, 0, 0, `thumb-${type}`);
    } catch {
      return null;
    }
  }, [type]);
  if (!device) return <div className={className} />;
  const pad = 6;
  const size = Math.max(device.width, device.height) + pad * 2;
  const vx = device.width / 2 - size / 2;
  const vy = device.height / 2 - size / 2;

  return (
    <div className={`flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      <svg viewBox={`${vx} ${vy} ${size} ${size}`} className="w-full h-full select-none pointer-events-none" aria-hidden="true">
        <DeviceRenderer device={device} onDeviceMouseDown={noop} onTerminalMouseDown={noop} setHoveredTerminalId={noop} />
      </svg>
    </div>
  );
};
