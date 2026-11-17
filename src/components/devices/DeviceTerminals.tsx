import React from 'react';

/**
 * Momentary push-button helper: presses on mouse-down and springs back on mouse-up
 * anywhere in the window.
 */
export function momentaryPress(
  e: React.MouseEvent,
  deviceId: string,
  key: string,
  onPatchState?: (deviceId: string, patch: Record<string, any>) => void
) {
  e.stopPropagation();
  e.preventDefault();
  if (!onPatchState) return;
  onPatchState(deviceId, { [key]: true });
  const release = () => {
    onPatchState(deviceId, { [key]: false });
    window.removeEventListener('mouseup', release);
  };
  window.addEventListener('mouseup', release);
}
