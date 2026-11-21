export type DesktopUpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface DesktopUpdateStatus {
  state: DesktopUpdateState;
  version?: string;
  percent?: number;
  message?: string;
  manual?: boolean;
}

export interface DesktopAppInfo {
  version: string;
  platform: string;
  isPackaged: boolean;
}

export interface WireWiseDesktopBridge {
  getInfo: () => Promise<DesktopAppInfo>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (status: DesktopUpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    wirewiseDesktop?: WireWiseDesktopBridge;
  }
}
