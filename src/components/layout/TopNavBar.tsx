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
  ShieldAlert,
  Undo2,
  Redo2,
  Play,
  Square,
  Library,
  Lock,
  Unlock,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  FlipHorizontal2,
  PanelRight,
  Trash2,
  Rows3,
} from 'lucide-react';

interface TopNavBarProps {
  standard: CodeStandard;
  onStandardChange: (std: CodeStandard) => void;
  gridVoltage: number;
  viewMode: 'realistic' | 'split' | 'ladder' | 'schematic';
  onViewModeChange: (mode: 'realistic' | 'split' | 'ladder' | 'schematic') => void;
  isCompliant: boolean;
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
  // Simulation / Edit mode
  isSimulating: boolean;
  onToggleSimulation: () => void;
  // Floating panels
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  isHudOpen: boolean;
  onToggleHud: () => void;
  // CAD lock & align tools
  hasSelectedDevice: boolean;
  isSelectedLocked: boolean;
  onToggleLockSelected: () => void;
  canAlign: boolean;
  onAlignHorizontal: () => void;
  onAlignVertical: () => void;
}

/** Reusable ribbon icon button */
const RibbonButton: React.FC<{
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  label?: string;
  children: React.ReactNode;
}> = ({ onClick, title, disabled, active, danger, label, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-bold border transition shrink-0 ${
      disabled
        ? 'bg-transparent border-transparent text-stone-300 cursor-not-allowed'
        : active
        ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
        : danger
        ? 'bg-white border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 shadow-sm'
        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 hover:text-stone-900 shadow-sm'
    }`}
  >
    {children}
    {label && <span className="hidden 2xl:inline">{label}</span>}
  </button>
);

const Divider = () => <div className="w-px h-6 bg-stone-200 mx-1 shrink-0" />;

export const TopNavBar: React.FC<TopNavBarProps> = ({
  standard,
  onStandardChange,
  gridVoltage,
  viewMode,
  onViewModeChange,
  isCompliant,
  trippedCount,
  activeLabTitle,
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
  isSimulating,
  onToggleSimulation,
  isLibraryOpen,
  onToggleLibrary,
  isHudOpen,
  onToggleHud,
  hasSelectedDevice,
  isSelectedLocked,
  onToggleLockSelected,
  canAlign,
  onAlignHorizontal,
  onAlignVertical,
}) => {
  const hz = standard === 'PEC' ? 60 : 50;

  return (
    <header className="bg-[#faf8f5] border-b border-[#ece6de] px-3 h-14 shrink-0 z-30 select-none shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
      {/* ───────── LEFT GROUP: Project & File ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex items-center gap-2 pr-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="min-w-0 hidden xl:block">
            <div className="text-[13px] font-serif font-bold text-stone-900 leading-tight flex items-center gap-1.5">
              VoltLab
              <span className="text-[9px] font-mono font-bold px-1.5 py-px rounded-full bg-rose-50 text-rose-600 border border-rose-200/80">
                CAD
              </span>
            </div>
            <div
              className="text-[11px] font-mono text-stone-500 truncate max-w-[180px]"
              title={activeLabTitle || 'Blank Installation Canvas'}
            >
              {activeLabTitle || 'Blank Installation Canvas'}
            </div>
          </div>
        </div>

        <Divider />

        <RibbonButton onClick={onOpenLabs} title="Open Example Wirings & Learning Labs" label="Examples">
          <BookOpen className="w-4 h-4 text-rose-600" />
        </RibbonButton>
        <RibbonButton onClick={onImportJson} title="Open project (Import JSON)" label="Import">
          <Upload className="w-4 h-4" />
        </RibbonButton>
        <RibbonButton onClick={onExportJson} title="Save project (Export JSON)" label="Export">
          <Download className="w-4 h-4" />
        </RibbonButton>
        <RibbonButton
          onClick={onClearCanvas}
          disabled={isSimulating}
          danger
          title={isSimulating ? 'Stop simulation (■) to clear the canvas' : 'Clear canvas'}
          label="Clear"
        >
          <Trash2 className="w-4 h-4" />
        </RibbonButton>

        <Divider />

        <RibbonButton onClick={onUndo} disabled={!canUndo || isSimulating} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </RibbonButton>
        <RibbonButton onClick={onRedo} disabled={!canRedo || isSimulating} title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
          <Redo2 className="w-4 h-4" />
        </RibbonButton>
      </div>

      {/* ───────── CENTER GROUP: Simulation & CAD tools ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Play / Stop */}
        <button
          onClick={onToggleSimulation}
          title={isSimulating ? 'Stop simulation and return to Edit Mode' : 'Energize the grid and start simulation'}
          className={`flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-lg text-xs font-bold border shadow-sm transition shrink-0 ${
            isSimulating
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
          }`}
        >
          {isSimulating ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isSimulating ? 'Stop Sim' : 'Simulate'}</span>
        </button>

        {/* Mode status badge */}
        <div
          className={`hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[10px] font-mono font-bold shrink-0 ${
            isSimulating
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-slate-100 border-amber-300 text-amber-800'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          {isSimulating ? `LIVE SIMULATING (${gridVoltage}V)` : 'EDIT MODE (DE-ENERGIZED)'}
        </div>

        <Divider />

        <RibbonButton
          onClick={onToggleLibrary}
          active={isLibraryOpen}
          title={isLibraryOpen ? 'Hide component library' : 'Show component library'}
          label="Library"
        >
          <Library className="w-4 h-4" />
        </RibbonButton>

        {/* View mode switcher */}
        <div className="flex items-center bg-white p-0.5 rounded-lg border border-stone-200 shadow-sm shrink-0">
          {([
            { id: 'realistic', label: 'Realistic', icon: Eye, tip: 'Realistic physical wiring workbench' },
            { id: 'split', label: 'Dual View', icon: Layers, tip: 'Split dual view (physical workbench + live ladder / SLD)' },
            { id: 'ladder', label: 'Ladder Logic', icon: Rows3, tip: 'Control ladder diagram (live sync, lab target & rung builder)' },
            { id: 'schematic', label: 'SLD Schematic', icon: SlidersHorizontal, tip: 'Single-line diagram (SLD)' },
          ] as const).map((v) => (
            <button
              key={v.id}
              onClick={() => onViewModeChange(v.id)}
              title={v.tip}
              className={`flex items-center gap-1 px-2 h-7 rounded-md text-xs font-medium transition-all ${
                viewMode === v.id ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <Divider />

        {/* CAD lock & alignment tools */}
        <RibbonButton
          onClick={onToggleLockSelected}
          disabled={!hasSelectedDevice || isSimulating}
          active={hasSelectedDevice && isSelectedLocked}
          title={
            !hasSelectedDevice
              ? 'Select a device to lock / unlock its position'
              : isSelectedLocked
              ? 'Unlock selected device position'
              : 'Lock selected device position'
          }
          label={isSelectedLocked ? 'Unlock' : 'Lock'}
        >
          {isSelectedLocked && hasSelectedDevice ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </RibbonButton>
        <RibbonButton
          onClick={onAlignHorizontal}
          disabled={!canAlign || isSimulating}
          title="Align Horizontal — line selected devices up in a row (Shift+click to select several; aligns to the first one picked)"
          label="Align H"
        >
          <AlignHorizontalJustifyCenter className="w-4 h-4" />
        </RibbonButton>
        <RibbonButton
          onClick={onAlignVertical}
          disabled={!canAlign || isSimulating}
          title="Align Vertical — stack selected devices in a column (Shift+click to select several; aligns to the first one picked)"
          label="Align V"
        >
          <AlignVerticalJustifyCenter className="w-4 h-4" />
        </RibbonButton>
        {onFlipAllOutlets && (
          <span className="hidden xl:contents">
          <RibbonButton
            onClick={onFlipAllOutlets}
            active={isAllRearView}
            title="Flip all outlets between Front Faceplate and Rear Wiring Mechanism"
            label={isAllRearView ? 'Rear' : 'Front'}
          >
            <FlipHorizontal2 className="w-4 h-4" />
          </RibbonButton>
          </span>
        )}
      </div>

      {/* ───────── RIGHT GROUP: Standards & Audit ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {trippedCount > 0 && (
          <button
            onClick={onResetSimulation}
            title="Re-arm all tripped breakers"
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold animate-pulse shadow shrink-0"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{trippedCount} TRIPPED</span>
            <RotateCcw className="w-3 h-3 opacity-80" />
          </button>
        )}

        <div
          className={`hidden xl:flex items-center gap-1 h-8 px-2 rounded-lg border text-[10px] font-bold shrink-0 ${
            isCompliant
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
          title={isCompliant ? 'No code violations detected' : 'Open the inspector for code violations'}
        >
          {isCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {isCompliant ? 'Compliant' : 'Violations'}
        </div>

        <div className="flex items-center bg-white p-0.5 rounded-lg border border-stone-200 shadow-sm shrink-0">
          <button
            onClick={() => onStandardChange('PEC')}
            className={`px-2.5 h-7 rounded-md text-xs font-bold transition-all ${
              standard === 'PEC' ? 'bg-rose-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Philippine Electrical Code (60Hz, AWG, Black/Red/White/Green)"
          >
            🇵🇭 PEC<span className="hidden xl:inline"> 2017</span>
          </button>
          <button
            onClick={() => onStandardChange('IEC')}
            className={`px-2.5 h-7 rounded-md text-xs font-bold transition-all ${
              standard === 'IEC' ? 'bg-sky-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
            title={`International Electrotechnical Commission (${hz}Hz, metric mm², Brown/Blue/Green-Yellow)`}
          >
            🌐 IEC<span className="hidden xl:inline"> 60364</span>
          </button>
        </div>

        <RibbonButton
          onClick={onToggleHud}
          active={isHudOpen}
          title={isHudOpen ? 'Collapse code inspector' : 'Expand code inspector'}
          label="Inspector"
        >
          <PanelRight className="w-4 h-4" />
        </RibbonButton>
      </div>
    </header>
  );
};
