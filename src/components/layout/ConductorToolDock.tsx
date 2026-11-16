import React, { useState } from 'react';
import { CodeStandard, WiringMode } from '../../types/electrical';
import { COLOR_STANDARDS, getWireStandards } from '../../data/standardsData';
import { Cable, ChevronDown, ChevronUp } from 'lucide-react';
import { conductorColor } from '../../styles/conductors';

interface ConductorToolDockProps {
  standard: CodeStandard;
  wiringMode: WiringMode;
  activeWireColor: string;
  activeWireGauge: string;
  activeWireLength: number;
  onSelectWiringMode: (mode: WiringMode) => void;
  onSelectWireColor: (color: string) => void;
  onSelectWireGauge: (gauge: string) => void;
  onSelectWireLength: (length: number) => void;
  isLocked?: boolean;
}

const MODE_LABEL: Record<WiringMode, string> = {
  single: '1-Wire',
  dual_ln: '2-Wire L+N',
  triple_lnpe: '3-Wire +PE',
};

/**
 * Compact, collapsible conductor & cable tool strip that sits at the top of the canvas.
 */
export const ConductorToolDock: React.FC<ConductorToolDockProps> = ({
  standard,
  wiringMode,
  activeWireColor,
  activeWireGauge,
  activeWireLength,
  onSelectWiringMode,
  onSelectWireColor,
  onSelectWireGauge,
  onSelectWireLength,
  isLocked = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = COLOR_STANDARDS[standard];
  const wireStandards = getWireStandards(standard);

  const swatches = [
    { color: colors.phase1, name: colors.names.phase1 },
    { color: colors.phase2, name: colors.names.phase2 },
    { color: colors.phase3, name: colors.names.phase3 },
    { color: colors.neutral, name: colors.names.neutral },
    { color: colors.earth, name: colors.names.earth },
    { color: colors.switched, name: colors.names.switched },
  ];

  return (
    <div
      className={`shrink-0 bg-surface/90 border-b border-border px-3 select-none z-20 ${
        isLocked ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3 h-9 overflow-x-auto">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-[0.08em] font-display shrink-0 hover:text-probe transition"
          title={isExpanded ? 'Collapse conductor tool' : 'Expand conductor tool'}
        >
          <Cable className="w-3.5 h-3.5" />
          Conductor Tool
          {isExpanded ? <ChevronUp className="w-3 h-3 text-ink-muted" /> : <ChevronDown className="w-3 h-3 text-ink-muted" />}
        </button>

        {!isExpanded && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-ink-muted shrink-0">
            <span className="font-bold">{MODE_LABEL[wiringMode]}</span>
            <span className="w-3.5 h-3.5 rounded border border-border-strong" style={{ backgroundColor: conductorColor(activeWireColor) }} />
            <span className="truncate max-w-[180px]">{activeWireGauge}</span>
            <span>{activeWireLength} m</span>
          </div>
        )}

        {isExpanded && (
          <>
            {/* Conductor pairing */}
            <div className="flex items-center gap-0.5 bg-surface-sunken p-0.5 rounded-md shrink-0">
              {(['single', 'dual_ln', 'triple_lnpe'] as WiringMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onSelectWiringMode(m)}
                  title={
                    m === 'single'
                      ? 'Single conductor (manual line, neutral or earth)'
                      : m === 'dual_ln'
                      ? 'Paired 2-wire cable: Feed (Live) + Return (Neutral)'
                      : '3-wire cable: Live + Neutral Return + Earth Ground'
                  }
                  className={`px-2 h-6 text-[11px] font-semibold rounded-sm transition ${
                    wiringMode === m
                      ? 'bg-surface text-ink shadow-1'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>

            {/* Colour swatches */}
            <div className="flex items-center gap-1 shrink-0">
              {swatches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSelectWireColor(s.color)}
                  style={{ backgroundColor: conductorColor(s.color) }}
                  title={s.name}
                  className={`w-5 h-5 rounded-sm border transition-transform ${
                    activeWireColor === s.color
                      ? 'border-probe ring-2 ring-probe ring-offset-1 ring-offset-surface'
                      : 'border-border-strong hover:scale-105'
                  }`}
                />
              ))}
            </div>

            {/* Gauge */}
            <select
              value={activeWireGauge}
              onChange={(e) => onSelectWireGauge(e.target.value)}
              title="Conductor gauge (cross-section)"
              className="bg-surface border border-border rounded-lg px-2 py-0.5 text-[11px] text-ink font-mono focus:outline-none focus:border-probe shrink-0"
            >
              {wireStandards.map((ws) => (
                <option key={ws.id} value={ws.name}>
                  {ws.name} (Max {ws.maxBreakerAmps}A)
                </option>
              ))}
            </select>

            {/* Length */}
            <div className="flex items-center gap-1.5 shrink-0" title="Conductor run length">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Run</span>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={activeWireLength}
                onChange={(e) => onSelectWireLength(Number(e.target.value))}
                className="w-24 accent-probe cursor-pointer h-1.5 bg-border rounded-lg"
              />
              <span className="text-[11px] font-mono font-bold text-ink w-9">{activeWireLength} m</span>
            </div>

            <span className="text-[10px] text-ink-muted font-mono font-bold shrink-0 ml-auto">{standard}</span>
          </>
        )}
      </div>
    </div>
  );
};
