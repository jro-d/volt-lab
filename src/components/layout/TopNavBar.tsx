import React from 'react';
import { CodeStandard } from '../../types/electrical';
import { 
  Zap, 
  RotateCcw, 
  BookOpen, 
  Download, 
  Upload, 
  Layers, 
  Eye, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Sun,
  ShieldAlert,
  Undo2,
  Redo2
} from 'lucide-react';

interface TopNavBarProps {
  standard: CodeStandard;
  onStandardChange: (std: CodeStandard) => void;
  viewMode: 'realistic' | 'schematic' | 'split';
  onViewModeChange: (mode: 'realistic' | 'schematic' | 'split') => void;
  isCompliant: boolean;
  totalWatts: number;
  totalAmps: number;
  trippedCount: number;
  activeLabTitle?: string;
  onOpenLabs: () => void;
  onResetSimulation: () => void;
  onClearCanvas: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onFlipAllOutlets?: () => void;
  isAllRearView?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  standard,
  onStandardChange,
  viewMode,
  onViewModeChange,
  isCompliant,
  totalWatts,
  totalAmps,
  trippedCount,
  activeLabTitle = 'Lab 1: Residential Installation with Junction Box',
  onOpenLabs,
  onResetSimulation,
  onClearCanvas,
  onExportJson,
  onImportJson,
  onFlipAllOutlets,
  isAllRearView = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  return (
    <header className="bg-[#faf8f5] border-b border-[#ece6de] px-5 py-2.5 z-20 select-none shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
      {/* Top Meta Line (Matching User Reference Image) */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
            Electrical Installation & Code Planner
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80">
              VOLTLAB 364
            </span>
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Real-time branch circuit ledger, return wire tracking & code compliance engine
          </p>
        </div>

        {/* Top Pills Row (Matching Reference Image) */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-sm">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light Mode</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 font-mono text-[11px] font-bold shadow-sm">
            <span>⚡ Exact (230V / 60Hz)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-300/80 text-emerald-800 font-bold text-[11px] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LIVE SIMULATING</span>
          </div>

          {/* Active Preset Dropdown Pill */}
          <button
            onClick={onOpenLabs}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-rose-200 hover:border-rose-400 text-stone-900 font-mono text-xs shadow-sm transition max-w-[320px] truncate group"
            title="Browse and Load Example Wirings"
          >
            <span className="text-rose-600 font-bold">⚡ Example:</span>
            <span className="truncate font-semibold text-stone-800">{activeLabTitle || 'Blank Canvas'}</span>
            <span className="text-[10px] text-stone-400 group-hover:text-stone-700">▼</span>
          </button>
        </div>
      </div>

      {/* Secondary Controls & Status Row */}
      <div className="flex items-center justify-between pt-1 border-t border-[#f1ede8]">
        {/* Status Pills */}
        <div className="flex items-center gap-3 text-xs text-stone-600 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            System Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Return Paths Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            PEC / IEC Verified
          </span>
        </div>

        {/* Center: Standard & View Mode Toggles */}
        <div className="flex items-center gap-2">
          {/* Code Standard Selector (PEC vs IEC) */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-stone-200 shadow-sm">
            <button
              onClick={() => onStandardChange('PEC')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                standard === 'PEC'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Philippine Electrical Code (60Hz, AWG, Black/Red/White/Green)"
            >
              <span>🇵🇭 PEC 2017</span>
            </button>

            <button
              onClick={() => onStandardChange('IEC')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                standard === 'IEC'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="International Electrotechnical Commission (50Hz, Metric mm², Brown/Blue/Green-Yellow)"
            >
              <span>🌐 IEC 60364</span>
            </button>
          </div>

          {/* Dual-View Mode Switcher */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-stone-200 shadow-sm">
            <button
              onClick={() => onViewModeChange('realistic')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'realistic'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Realistic Physical Wiring Workbench"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Realistic</span>
            </button>

            <button
              onClick={() => onViewModeChange('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Split Dual View (Physical + Single Line Diagram)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dual View</span>
            </button>

            <button
              onClick={() => onViewModeChange('schematic')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'schematic'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Single-Line Diagram (SLD)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Schematic</span>
            </button>
          </div>

          {/* Perspective Switcher for Outlets */}
          {onFlipAllOutlets && (
            <button
              onClick={onFlipAllOutlets}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold shadow-sm transition ${
                isAllRearView
                  ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                  : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700 hover:text-stone-900'
              }`}
              title="Flip all Duplex Outlets between Front Faceplate and Rear Modular Wiring Mechanism"
            >
              <span>{isAllRearView ? '🔧 Rear Modules View' : '👁️ Front Faceplates'}</span>
            </button>
          )}
        </div>

        {/* Action Buttons: Labs, Reset, Save/Load */}
        <div className="flex items-center gap-2">
          {trippedCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white font-mono text-xs font-bold animate-bounce shadow">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{trippedCount} TRIPPED</span>
            </div>
          )}

          <button
            onClick={onOpenLabs}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-stone-800 hover:text-rose-700 text-xs font-bold rounded-lg shadow-sm transition"
            title="Browse Curated Example Wirings & Learning Labs"
          >
            <BookOpen className="w-3.5 h-3.5 text-rose-600" />
            <span>Example Wirings</span>
          </button>

          {/* Undo & Redo History Controls */}
          <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-md transition ${
                canUndo 
                  ? 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 cursor-pointer' 
                  : 'text-stone-300 cursor-not-allowed'
              }`}
              title="Undo last action (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-md transition ${
                canRedo 
                  ? 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 cursor-pointer' 
                  : 'text-stone-300 cursor-not-allowed'
              }`}
              title="Redo action (Ctrl+Y or Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onResetSimulation}
            className="p-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-lg border border-stone-200 shadow-sm transition"
            title="Reset Simulation (Clear Breaker Trips)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onExportJson}
            className="p-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-lg border border-stone-200 shadow-sm transition"
            title="Save Project (Export JSON)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onImportJson}
            className="p-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-lg border border-stone-200 shadow-sm transition"
            title="Open Project (Import JSON)"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearCanvas}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 hover:border-rose-200 text-xs rounded-lg font-medium transition shadow-sm"
            title="Clear Board"
          >
            Clear
          </button>
        </div>
      </div>
    </header>
  );
};
