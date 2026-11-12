import { useSyncExternalStore } from 'react';

/**
 * Tiny external store for high-frequency CAD status values (cursor position, zoom, wiring flag).
 * Keeping these out of React state in <App/> means mouse movement only re-renders the status bar,
 * not the whole workbench (devices, wires, inspector...).
 */
export interface CadStatus {
  cursorX: number;
  cursorY: number;
  zoom: number;
  wiring: boolean;
}

let state: CadStatus = { cursorX: 0, cursorY: 0, zoom: 1, wiring: false };
const listeners = new Set<() => void>();

export const cadStatus = {
  get: (): CadStatus => state,
  set: (patch: Partial<CadStatus>) => {
    const next = { ...state, ...patch };
    if (
      next.cursorX === state.cursorX &&
      next.cursorY === state.cursorY &&
      next.zoom === state.zoom &&
      next.wiring === state.wiring
    ) {
      return;
    }
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useCadStatus(): CadStatus {
  return useSyncExternalStore(cadStatus.subscribe, cadStatus.get);
}
