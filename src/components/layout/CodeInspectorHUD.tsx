import React, { useState } from 'react';
import { ElectricalAnalysisReport, CodeViolation } from '../../types/codes';
import { SolvedCircuit } from '../../core/circuitSolver';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RotateCcw,
  Zap,
  X
} from 'lucide-react';

interface CodeInspectorHUDProps {
  report: ElectricalAnalysisReport;
  solved: SolvedCircuit;
  /** Edit Mode shows a static (de-energized) audit; Simulation Mode shows live results */
  isSimulating?: boolean;
  onResetSimulation: () => void;
  onHighlightViolation?: (violation: CodeViolation) => void;
  /** Troubleshooting mode: show symptoms only (no code findings, no trip reasons) */
  troubleshoot?: { symptom: string; found: number; total: number };
}

export const CodeInspectorHUD: React.FC<CodeInspectorHUDProps> = ({
  report,
  solved,
  isSimulating = true,
  onResetSimulation,
  onHighlightViolation,
  troubleshoot,
}) => {
  const [isHazardDismissed, setIsHazardDismissed] = useState(false);
  const [isHazardExpanded, setIsHazardExpanded] = useState(false);

  const vd = report.maxBranchVoltageDropPercent;
  const vdColor = vd <= 3.0 ? 'bg-console-readout' : vd <= 5.0 ? 'bg-console-warning' : 'bg-console-danger';

  const conduitFill = report.conduitFillPercent || 0;
  const conduitColor = conduitFill <= 40.0 ? 'bg-console-readout' : 'bg-console-danger';

  const errors = report.violations.filter(v => v.severity === 'error');
  const warnings = report.violations.filter(v => v.severity === 'warning');
  const fatalShockViolations = report.violations.filter(v => v.hazardLevel === 'fatal_electrocution');

  if (troubleshoot) {
    const tripped = solved.trippedDevices.length;
    return (
      <aside className="wirewise-console wirewise-scroll-dark w-[21.5rem] shrink-0 bg-console border-l-2 border-console-line shadow-2 flex flex-col h-full overflow-hidden select-none z-10 font-sans text-console-ink">
        <div className="p-3.5 border-b border-console-line bg-console-raised">
          <span className="text-[11px] font-semibold text-console-muted uppercase tracking-[0.08em] font-display block">TROUBLESHOOTING</span>
          <h2 className="text-xs font-bold text-console-ink uppercase tracking-wider font-mono mt-0.5">Symptoms only</h2>
        </div>
        <div className="p-3.5 space-y-3 text-xs">
          <p className="text-console-ink leading-relaxed">{troubleshoot.symptom}</p>
          <div className="rounded-lg border border-console-line bg-console-raised px-3 py-2 font-mono space-y-1">
            <div className="flex justify-between"><span className="text-console-muted">Load</span><span>{solved.totalWatts.toFixed(0)} W · {solved.totalAmps.toFixed(1)} A</span></div>
            <div className="flex justify-between"><span className="text-console-muted">Protective devices open</span><span>{tripped}</span></div>
            <div className="flex justify-between"><span className="text-console-muted">Sparks / arcs seen</span><span>{solved.sparks.length}</span></div>
            <div className="flex justify-between"><span className="text-console-muted">Faults found</span><span>{troubleshoot.found} of {troubleshoot.total}</span></div>
          </div>
          <p className="text-console-muted leading-relaxed">The code audit and the trip reasons are hidden in this mode, because they would give the cause away. Measure with the DMM, the clamp meter and the test instruments.</p>
          <button onClick={onResetSimulation} className="px-2.5 py-1 rounded-md border border-console-line text-[11px] font-semibold hover:bg-console-raised">Reset simulation</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="wirewise-console wirewise-scroll-dark w-[21.5rem] shrink-0 bg-console border-l-2 border-console-line shadow-2 flex flex-col h-full overflow-hidden select-none z-10 font-sans text-console-ink">
      {/* Header */}
      <div className="p-3.5 border-b border-console-line bg-console-raised flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-console-muted uppercase tracking-[0.08em] font-display block">
            LIVE COMPLIANCE AUDIT
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-xs font-bold text-console-ink uppercase tracking-wider font-mono">
              PEC & IEC Inspector HUD
            </h2>
            {fatalShockViolations.length > 0 && isHazardDismissed && (
              <button
                onClick={() => { setIsHazardDismissed(false); setIsHazardExpanded(true); }}
                className="w-5 h-5 rounded-full bg-console-danger/20 border border-console-danger/60 text-console-danger hover:bg-console-danger/30 flex items-center justify-center transition"
                title="Shock Hazard Present (Click to view)"
              >
                <Zap className="w-3 h-3 fill-console-danger" />
              </button>
            )}
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-console text-console-readout border border-console-line">
          {report.activeStandards} 2017
        </span>
      </div>

      <div className="wirewise-scroll-dark flex-1 overflow-y-auto p-3 space-y-3">
        {/* Mode banner */}
        <div
          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-mono font-bold border ${
            isSimulating
              ? 'bg-console-raised/75 border-console-readout/60 text-console-readout'
              : 'bg-console-raised/70 border-console-warning/50 text-console-warning'
          }`}
        >
          {isSimulating
            ? '● LIVE — results reflect the energized circuit'
            : '○ EDIT MODE — static wiring, polarity & gauge audit (grid de-energized)'}
        </div>
        {/* COMPACT SHOCK HAZARD ALERT PILL */}
        {fatalShockViolations.length > 0 && !isHazardDismissed && (
          <div className="bg-console-raised/85 border border-console-danger/80 rounded-md p-2.5 text-console-danger shadow-md animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <div 
                onClick={() => setIsHazardExpanded(!isHazardExpanded)}
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
              >
                <div className="w-6 h-6 rounded-lg bg-console-danger flex items-center justify-center shrink-0 text-console-ink animate-pulse">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-console-danger truncate">
                    {fatalShockViolations[0].title}
                  </div>
                  <div className="text-[10px] text-console-danger flex items-center gap-1 font-medium">
                    <span>Fatal Shock Hazard</span>
                    <span>{isHazardExpanded ? '▲ Hide' : '▼ Details'}</span>
                  </div>
                </div>
              </div>

              {/* Dismiss 'X' Button */}
              <button
                onClick={() => setIsHazardDismissed(true)}
                className="p-1 hover:bg-console-raised/70 rounded-md text-console-danger hover:text-console-ink transition shrink-0"
                title="Dismiss Warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expandable Details & PEC Remediation */}
            {isHazardExpanded && (
              <div className="mt-2 pt-2 border-t border-console-danger/70 text-[11px] space-y-1.5 font-sans animate-in fade-in">
                <div className="text-console-danger leading-snug font-medium">
                  ⚠️ {fatalShockViolations[0].message}
                </div>
                <div className="text-console-readout bg-console-raised/75 p-2 rounded-lg border border-console-readout/60 font-medium">
                  ✅ <span className="font-bold">Code Fix:</span> {fatalShockViolations[0].recommendation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tripped Protection Alert Card if active */}
        {solved.trippedDevices.length > 0 && (
          <div className="bg-console-raised/85 border border-console-danger rounded-md p-3 text-console-danger shadow-md animate-pulse">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-console-danger flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4" />
                OVERCURRENT / TRIP ACTIVE
              </span>
              <button
                onClick={onResetSimulation}
                className="text-[10px] px-2.5 py-0.5 bg-console-danger hover:bg-console-danger text-console-ink rounded font-bold transition flex items-center gap-1 shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="space-y-1">
              {solved.trippedDevices.map((id) => (
                <div key={id} className="text-[11px] font-mono text-console-danger">
                  ⚠️ {solved.tripReasons[id] || 'Breaker Tripped'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Big Metrics Card */}
        <div className="bg-console-raised border border-console-line rounded-md p-3.5 shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-display font-semibold text-console-muted uppercase tracking-[0.08em] block">
                CIRCUIT LOAD INTELLIGENCE
              </span>
              <div className="text-xs font-bold text-console-ink">
                Continuous Power & Ampacity
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-console-raised/80 text-console-readout font-mono font-bold border border-console-readout/60">
              ⚡ Loop Closed
            </span>
          </div>

          {/* Big Stat Numbers Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-console-line/80">
            <div className="bg-console/90 p-2.5 rounded-lg border border-console-line">
              <div className="text-[9px] font-mono font-bold text-console-muted uppercase tracking-wider">
                ACTIVE LOAD
              </div>
              <div className="text-xl font-bold font-mono text-console-readout">
                {report.totalConnectedWatts.toFixed(0)} <span className="text-xs font-sans text-console-muted">W</span>
              </div>
              <div className="text-[9px] text-console-muted">Total connected watts</div>
            </div>

            <div className="bg-console/90 p-2.5 rounded-lg border border-console-line">
              <div className="text-[9px] font-mono font-bold text-console-muted uppercase tracking-wider">
                LINE CURRENT
              </div>
              <div className="text-xl font-bold font-mono text-console-readout">
                {report.totalCurrentAmps.toFixed(2)} <span className="text-xs font-sans text-console-muted">A</span>
              </div>
              <div className="text-[9px] text-console-muted">Branch feed & return</div>
            </div>
          </div>

          {/* Voltage Drop % Indicator */}
          <div className="pt-2 border-t border-console-line/80">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[11px] font-medium text-console-ink">Max Branch Voltage Drop</span>
              <span className={`font-mono font-bold text-xs ${vd <= 3.0 ? 'text-console-readout' : vd <= 5.0 ? 'text-console-warning' : 'text-console-danger'}`}>
                {vd.toFixed(2)}% (Max 3.0%)
              </span>
            </div>
            <div className="w-full bg-console border border-console-line h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${vdColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, (vd / 6.0) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-console-muted mt-1 block font-mono">
              Ref: {report.activeStandards === 'PEC' ? 'PEC 2.10.1.19 (FPN 4)' : 'IEC 60364-5-52 Cl. 525'}
            </span>
          </div>

          {/* Conduit Fill % Indicator */}
          <div className="pt-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[11px] font-medium text-console-ink">Conduit Fill (3/4" EMT)</span>
              <span className={`font-mono font-bold text-xs ${conduitFill <= 40.0 ? 'text-console-readout' : 'text-console-danger'}`}>
                {conduitFill.toFixed(1)}% (Max 40%)
              </span>
            </div>
            <div className="w-full bg-console border border-console-line h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${conduitColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, (conduitFill / 60.0) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-console-muted mt-1 block font-mono">
              Ref: {report.activeStandards === 'PEC' ? 'PEC Chapter 9, Table 1' : 'IEC 60364-5-52 Table A'}
            </span>
          </div>
        </div>

        {/* Violations & Code Rule Checks Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-console-ink uppercase tracking-wider font-mono">
              Compliance Rules Checklist
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
              report.isCompliant 
                ? 'bg-console-raised/80 text-console-readout border-console-readout/60' 
                : 'bg-console-raised/80 text-console-danger border-console-danger/60'
            }`}>
              {errors.length} Errors • {warnings.length} Warnings
            </span>
          </div>

          {report.violations.length === 0 ? (
            <div className="bg-console-raised border border-console-readout/50 rounded-md p-4 text-center shadow-inner">
              <div className="w-8 h-8 rounded-full bg-console-raised border border-console-readout/60 text-console-readout flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-console-ink">100% Code Compliant</div>
              <div className="text-[11px] text-console-ink mt-0.5 leading-relaxed">
                All branch circuits, return paths, wire gauges, and earthing bonds satisfy {report.activeStandards} safety rules.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {report.violations.map((viol) => (
                <div
                  key={viol.id}
                  onClick={() => onHighlightViolation && onHighlightViolation(viol)}
                  className={`p-3 rounded-md border text-xs cursor-pointer transition bg-console-raised hover:bg-console-line ${
                    viol.severity === 'error'
                      ? 'border-console-danger/60 hover:border-console-danger'
                      : 'border-console-warning/60 hover:border-console-warning'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-1.5">
                    <span className="flex items-center gap-1.5 font-bold text-console-ink min-w-0">
                      {viol.severity === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-console-danger shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-console-warning shrink-0" />
                      )}
                      <span className="truncate">{viol.title}</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-console border border-console-line text-console-ink font-bold shrink-0">
                      {viol.articleRef}
                    </span>
                  </div>

                  <p className="text-[11px] text-console-ink mb-2 leading-relaxed">
                    {viol.message}
                  </p>

                  <div className="text-[10px] bg-console/90 border border-console-line p-2 rounded-lg text-console-ink font-medium">
                    💡 <span className="font-bold text-console-readout">Code Fix:</span> {viol.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
