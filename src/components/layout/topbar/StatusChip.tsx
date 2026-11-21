import React from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react';
import { CodeStandard } from '../../../types/electrical';
import { Tooltip } from './Tooltip';

export interface StatusChipProps {
  isCompliant: boolean;
  trippedCount: number;
  standard: CodeStandard;
  onResetSimulation: () => void;
  onToggleHud: () => void;
  size?: 'md' | 'touch';
}

export const StatusChip: React.FC<StatusChipProps> = ({
  isCompliant,
  trippedCount,
  standard,
  onResetSimulation,
  onToggleHud,
  size = 'md',
}) => {
  const isTripped = trippedCount > 0;
  const heightClass = size === 'touch' ? 'h-11 px-3' : 'h-8 px-2.5';

  const tipLabel = isTripped
    ? 'Re-arm all tripped breakers'
    : isCompliant
    ? 'No code violations detected — toggle code inspector'
    : 'Code violations detected — open code inspector';

  const toneClass = isTripped
    ? 'bg-danger hover:opacity-90 text-surface border-danger'
    : isCompliant
    ? 'bg-ok-soft border-ok/40 text-ok hover:bg-ok-soft/80'
    : 'bg-warning-soft border-warning/40 text-warning hover:bg-warning-soft/80';

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Tooltip label={tipLabel} align="right">
        <button
          type="button"
          onClick={isTripped ? onResetSimulation : onToggleHud}
          aria-label={tipLabel}
          className={`flex items-center gap-1.5 rounded-md border text-xs font-bold shadow-1 transition motion-reduce:transition-none shrink-0 focus-visible:outline-none focus-visible:shadow-focus ${heightClass} ${toneClass}`}
        >
          {isTripped ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono">{trippedCount} TRIPPED</span>
              <RotateCcw className="w-3 h-3 opacity-80 shrink-0" />
            </>
          ) : isCompliant ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Compliant</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Violations</span>
            </>
          )}
        </button>
      </Tooltip>

      <span
        className="hidden xl:inline-flex items-center h-7 px-2 rounded-sm bg-surface-sunken border border-border text-[11px] font-mono font-semibold text-ink-muted shrink-0"
        title={standard === 'PEC' ? 'Philippine Electrical Code 2017 (60 Hz)' : 'IEC 60364 (50 Hz)'}
      >
        {standard === 'PEC' ? 'PEC 2017' : 'IEC 60364'}
      </span>
    </div>
  );
};
