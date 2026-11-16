import React from 'react';
import { CodeStandard } from '../../types/electrical';
import { useCadStatus } from '../../utils/cadStatusStore';

export type SnapSize = 10 | 5 | 0;

interface StatusBarProps {
  standard: CodeStandard;
  gridVoltage: number;
  gridFrequency: number;
  isSimulating: boolean;
  snapSize: SnapSize;
  onSnapChange: (snap: SnapSize) => void;
  totalWatts: number;
  totalAmps: number;
}

const SNAP_CYCLE: SnapSize[] = [10, 5, 0];

/**
 * Slim CAD status bar: live cursor world coordinates, zoom, snap, active mode, and grid summary.
 * Cursor/zoom/mode values come from a tiny external store so mouse moves never re-render <App/>.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  standard,
  gridVoltage,
  gridFrequency,
  isSimulating,
  snapSize,
  onSnapChange,
  totalWatts,
  totalAmps,
}) => {
  const { cursorX, cursorY, zoom, wiring } = useCadStatus();

  const mode = wiring ? 'Wiring Conductor' : isSimulating ? 'Live Simulation' : 'Selection / Edit';
  const standardLabel = standard === 'PEC' ? 'PEC 2017' : 'IEC 60364';

  const cycleSnap = () => {
    const next = SNAP_CYCLE[(SNAP_CYCLE.indexOf(snapSize) + 1) % SNAP_CYCLE.length];
    onSnapChange(next);
  };

  return (
    <footer className="h-7 shrink-0 flex items-center justify-between gap-4 px-3 bg-surface-sunken border-t border-border text-[11px] font-mono text-ink-muted select-none z-20">
      <div className="flex items-center gap-4 min-w-0">
        <span className="w-28 tabular-nums" title="Cursor position in workbench units">
          X: {Math.round(cursorX)}, Y: {Math.round(cursorY)}
        </span>
        <span className="w-20 tabular-nums">Zoom: {Math.round(zoom * 100)}%</span>
        <button
          onClick={cycleSnap}
          className="px-2 py-0.5 rounded border border-border-strong bg-surface hover:bg-surface-sunken font-bold text-ink transition"
          title="Cycle grid snapping: 10px → 5px → OFF"
        >
          Snap: {snapSize === 0 ? 'OFF' : `${snapSize}px`}
        </button>
        <span className="flex items-center gap-1.5 font-semibold truncate">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wiring ? 'bg-probe' : isSimulating ? 'bg-ok animate-pulse' : 'bg-warning-fill'
            }`}
          />
          Mode: {mode}
        </span>
      </div>

      <div className="hidden xl:flex items-center gap-2 text-[10px] text-ink-muted truncate" title="Keyboard shortcuts">
        {[
          ['Drag', 'select'],
          ['Dbl-click', 'inspect'],
          ['F', 'fit'],
          ['R', 'rotate'],
          ['Del', 'delete'],
          ['Ctrl+Z', 'undo'],
          ['Space+drag', 'pan'],
        ].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <kbd className="px-1 py-px rounded-xs border border-border bg-surface text-ink-muted font-semibold">{k}</kbd>
            {v}
          </span>
        ))}
      </div>

      <div className="font-semibold text-ink truncate">
        {standardLabel} • {gridVoltage}V {gridFrequency}Hz • Connected: {Math.round(totalWatts)}W ({totalAmps.toFixed(2)}A)
      </div>
    </footer>
  );
};
