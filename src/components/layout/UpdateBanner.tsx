import React from 'react';
import { AlertTriangle, CheckCircle2, Download, RefreshCw, RotateCcw, X } from 'lucide-react';
import type { DesktopUpdateStatus } from '../../types/desktop';

interface UpdateBannerProps {
  status: DesktopUpdateStatus | null;
  currentVersion?: string;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  status,
  currentVersion,
  onDownload,
  onInstall,
  onDismiss,
}) => {
  if (!status || status.state === 'idle') return null;
  if (status.state === 'checking' && !status.manual) return null;
  if ((status.state === 'not-available' || status.state === 'error') && !status.manual) return null;

  const isError = status.state === 'error';
  const isOk = status.state === 'downloaded' || status.state === 'not-available';
  const toneClass = isError
    ? 'bg-danger-soft border-danger/40 text-danger'
    : isOk
    ? 'bg-ok-soft border-ok/40 text-ok'
    : 'bg-brand-soft border-brand/40 text-brand-ink';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`shrink-0 border-b px-3 py-1.5 text-xs flex items-center justify-between gap-3 z-20 select-none ${toneClass}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {status.state === 'checking' && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {status.state === 'available' && <Download className="w-3.5 h-3.5 shrink-0" />}
        {status.state === 'downloading' && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {(status.state === 'downloaded' || status.state === 'not-available') && (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        )}
        {status.state === 'error' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}

        <span className="font-medium truncate">
          {status.state === 'checking' && 'Checking GitHub Releases for WireWise updates…'}
          {status.state === 'available' &&
            `WireWise v${status.version} is available (installed: v${currentVersion || '1.0.0'}).`}
          {status.state === 'downloading' &&
            `Downloading WireWise update… ${status.percent ?? 0}%`}
          {status.state === 'downloaded' &&
            `WireWise v${status.version} is downloaded and ready to install.`}
          {status.state === 'not-available' &&
            (status.message || `WireWise v${status.version || currentVersion || '1.0.0'} is up to date.`)}
          {status.state === 'error' &&
            `Could not check for updates: ${status.message || 'verify internet connection.'}`}
        </span>

        {status.state === 'downloading' && (
          <div className="w-28 h-1.5 rounded-full bg-surface border border-border overflow-hidden shrink-0">
            <div
              className="h-full bg-brand transition-all duration-150"
              style={{ width: `${Math.min(100, Math.max(0, status.percent ?? 0))}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {status.state === 'available' && (
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-brand hover:bg-brand-strong text-on-brand text-xs font-semibold shadow-1 transition focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download update</span>
          </button>
        )}

        {status.state === 'downloaded' && (
          <button
            type="button"
            onClick={onInstall}
            className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-ok text-surface hover:opacity-90 text-xs font-semibold shadow-1 transition focus-visible:outline-none focus-visible:shadow-focus"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart &amp; update</span>
          </button>
        )}

        {status.state !== 'downloading' && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss update notification"
            className="p-1 rounded-md hover:bg-surface/60 transition focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
