import React, { useState } from 'react';
import { ElectricalAnalysisReport, CodeViolation } from '../../types/codes';
import { SolvedCircuit } from '../../core/circuitSolver';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RotateCcw,
  Sparkles,
  Zap,
  X
} from 'lucide-react';

interface CodeInspectorHUDProps {
  report: ElectricalAnalysisReport;
  solved: SolvedCircuit;
  onResetSimulation: () => void;
  onHighlightViolation?: (violation: CodeViolation) => void;
}

export const CodeInspectorHUD: React.FC<CodeInspectorHUDProps> = ({
  report,
  solved,
  onResetSimulation,
  onHighlightViolation,
}) => {
  const [isHazardDismissed, setIsHazardDismissed] = useState(false);
  const [isHazardExpanded, setIsHazardExpanded] = useState(false);

  const vd = report.maxBranchVoltageDropPercent;
  const vdColor = vd <= 3.0 ? 'bg-emerald-500' : vd <= 5.0 ? 'bg-amber-500' : 'bg-rose-600';

  const conduitFill = report.conduitFillPercent || 0;
  const conduitColor = conduitFill <= 40.0 ? 'bg-emerald-500' : 'bg-rose-600';

  const errors = report.violations.filter(v => v.severity === 'error');
  const warnings = report.violations.filter(v => v.severity === 'warning');
  const fatalShockViolations = report.violations.filter(v => v.hazardLevel === 'fatal_electrocution');

  return (
    <aside className="w-84 bg-[#faf8f5] border-l border-[#ece6de] flex flex-col h-full overflow-hidden select-none z-10 font-sans text-stone-800">
      {/* Header */}
      <div className="p-3.5 border-b border-[#ece6de] bg-white flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest font-mono block">
            LIVE COMPLIANCE AUDIT
          </span>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">
              PEC & IEC Inspector HUD
            </h2>
            {fatalShockViolations.length > 0 && isHazardDismissed && (
              <button
                onClick={() => { setIsHazardDismissed(false); setIsHazardExpanded(true); }}
                className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center transition"
                title="Shock Hazard Present (Click to view)"
              >
                <Zap className="w-3 h-3 fill-rose-600" />
              </button>
            )}
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-stone-100 text-stone-700 border border-stone-200">
          {report.activeStandards} 2017
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* COMPACT SHOCK HAZARD ALERT PILL */}
        {fatalShockViolations.length > 0 && !isHazardDismissed && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-2.5 text-rose-950 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <div 
                onClick={() => setIsHazardExpanded(!isHazardExpanded)}
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center shrink-0 text-white animate-pulse">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-rose-900 truncate">
                    {fatalShockViolations[0].title}
                  </div>
                  <div className="text-[10px] text-rose-700 flex items-center gap-1 font-medium">
                    <span>Fatal Shock Hazard</span>
                    <span>{isHazardExpanded ? '▲ Hide' : '▼ Details'}</span>
                  </div>
                </div>
              </div>

              {/* Dismiss 'X' Button */}
              <button
                onClick={() => setIsHazardDismissed(true)}
                className="p-1 hover:bg-rose-200/60 rounded-md text-rose-600 hover:text-rose-900 transition shrink-0"
                title="Dismiss Warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expandable Details & PEC Remediation */}
            {isHazardExpanded && (
              <div className="mt-2 pt-2 border-t border-rose-200/80 text-[11px] space-y-1.5 font-sans animate-in fade-in">
                <div className="text-rose-800 leading-snug font-medium">
                  ⚠️ {fatalShockViolations[0].message}
                </div>
                <div className="text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200/80 font-medium">
                  ✅ <span className="font-bold">Code Fix:</span> {fatalShockViolations[0].recommendation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tripped Protection Alert Card if active */}
        {solved.trippedDevices.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-rose-900 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4" />
                OVERCURRENT / TRIP ACTIVE
              </span>
              <button
                onClick={onResetSimulation}
                className="text-[10px] px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition flex items-center gap-1 shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="space-y-1">
              {solved.trippedDevices.map((id) => (
                <div key={id} className="text-[11px] font-mono text-rose-800">
                  ⚠️ {solved.tripReasons[id] || 'Breaker Tripped'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Big Metrics Card (Matching User Reference Image Totals Card) */}
        <div className="bg-white border border-[#f1ede8] rounded-xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold text-rose-600 uppercase tracking-widest block">
                CIRCUIT LOAD INTELLIGENCE
              </span>
              <div className="text-xs font-bold text-stone-900">
                Continuous Power & Ampacity
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200">
              ⚡ Loop Closed
            </span>
          </div>

          {/* Big Stat Numbers Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
            <div className="bg-[#faf8f5] p-2 rounded-lg border border-stone-100">
              <div className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                ACTIVE LOAD
              </div>
              <div className="text-xl font-bold font-mono text-[#e11d48]">
                {report.totalConnectedWatts.toFixed(0)} <span className="text-xs font-sans text-stone-500">W</span>
              </div>
              <div className="text-[9px] text-stone-400">Total connected watts</div>
            </div>

            <div className="bg-[#faf8f5] p-2 rounded-lg border border-stone-100">
              <div className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                LINE CURRENT
              </div>
              <div className="text-xl font-bold font-mono text-stone-900">
                {report.totalCurrentAmps.toFixed(2)} <span className="text-xs font-sans text-stone-500">A</span>
              </div>
              <div className="text-[9px] text-stone-400">Branch feed & return</div>
            </div>
          </div>

          {/* Voltage Drop % Indicator */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[11px] font-medium text-stone-600">Max Branch Voltage Drop</span>
              <span className={`font-mono font-bold text-xs ${vd <= 3.0 ? 'text-emerald-600' : vd <= 5.0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {vd.toFixed(2)}% (Max 3.0%)
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${vdColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, (vd / 6.0) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-stone-400 mt-0.5 block font-mono">
              Ref: {report.activeStandards === 'PEC' ? 'PEC 2.10.1.19 (FPN 4)' : 'IEC 60364-5-52 Cl. 525'}
            </span>
          </div>

          {/* Conduit Fill % Indicator */}
          <div className="pt-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[11px] font-medium text-stone-600">Conduit Fill (3/4" EMT)</span>
              <span className={`font-mono font-bold text-xs ${conduitFill <= 40.0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {conduitFill.toFixed(1)}% (Max 40%)
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${conduitColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, (conduitFill / 60.0) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-stone-400 mt-0.5 block font-mono">
              Ref: {report.activeStandards === 'PEC' ? 'PEC Chapter 9, Table 1' : 'IEC 60364-5-52 Table A'}
            </span>
          </div>
        </div>

        {/* Violations & Code Rule Checks Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
              Compliance Rules Checklist
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
              report.isCompliant 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {errors.length} Errors • {warnings.length} Warnings
            </span>
          </div>

          {report.violations.length === 0 ? (
            <div className="bg-white border border-emerald-200/80 rounded-xl p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-stone-900">100% Code Compliant</div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                All branch circuits, return paths, wire gauges, and earthing bonds satisfy {report.activeStandards} safety rules.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {report.violations.map((viol) => (
                <div
                  key={viol.id}
                  onClick={() => onHighlightViolation && onHighlightViolation(viol)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition shadow-[0_1px_4px_rgba(0,0,0,0.02)] bg-white ${
                    viol.severity === 'error'
                      ? 'border-rose-200 hover:border-rose-300'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold text-stone-900">
                      {viol.severity === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>{viol.title}</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold">
                      {viol.articleRef}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-600 mb-2 leading-relaxed">
                    {viol.message}
                  </p>

                  <div className="text-[10px] bg-rose-50/60 border border-rose-100 p-2 rounded-lg text-rose-900 font-medium">
                    💡 <span className="font-bold text-rose-700">Code Fix:</span> {viol.recommendation}
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
