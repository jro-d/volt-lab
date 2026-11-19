import React from 'react';
import { CodeStandard } from '../../types/electrical';
import { saveTheme } from '../../utils/themeStorage';
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
  Cpu,
  Map as MapIcon,
  FileCode2,
  Sun,
  Moon,
} from 'lucide-react';

/** Light / dark theme, saved per browser. The initial class is set in index.html before first paint. */
const useTheme = () => {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  const toggle = React.useCallback(() => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle('dark', next);
      saveTheme(localStorage, next ? 'dark' : 'light');
      return next;
    });
  }, []);
  return { dark, toggle };
};

interface TopNavBarProps {
  standard: CodeStandard;
  onStandardChange: (std: CodeStandard) => void;
  gridVoltage: number;
  viewMode: 'realistic' | 'split' | 'ladder' | 'schematic' | 'plc' | 'plan';
  onViewModeChange: (mode: 'realistic' | 'split' | 'ladder' | 'schematic' | 'plc' | 'plan') => void;
  isCompliant: boolean;
  trippedCount: number;
  activeLabTitle?: string;
  onOpenLabs: () => void;
  onResetSimulation: () => void;
  onClearCanvas: () => void;
  onExportJson: () => void;
  onExportHtml?: () => void;
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
  // Digital Multimeter / Clamp Meter
  dmmMode?: boolean;
  onToggleDmmMode?: () => void;
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
    className={`flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium border transition shrink-0 ${
      disabled
        ? 'bg-transparent border-transparent text-ink-faint cursor-not-allowed'
        : active
        ? 'bg-probe text-on-probe border-probe shadow-1'
        : danger
        ? 'bg-surface border-border text-danger hover:bg-danger-soft hover:border-danger/40 shadow-1'
        : 'bg-surface border-border text-ink hover:bg-surface-hover hover:border-border-strong shadow-1'
    }`}
  >
    {children}
    {label && <span className="hidden 2xl:inline">{label}</span>}
  </button>
);

const Divider = () => <div className="w-px h-6 bg-border mx-1 shrink-0" />;

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
  onExportHtml,
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
  dmmMode = false,
  onToggleDmmMode,
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
  const theme = useTheme();

  return (
    <header className="bg-surface border-b border-border px-3 h-14 shrink-0 z-30 select-none shadow-1 flex items-center justify-between gap-3">
      {/* ───────── LEFT GROUP: Project & File ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex items-center gap-2 pr-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-on-brand fill-current" />
          </div>
          <div className="min-w-0 hidden xl:block">
            <div className="text-[18px] font-display font-bold text-ink leading-none tracking-[-0.01em] flex items-center gap-1.5">
              <span>
                Wire<span className="text-brand">Wise</span>
              </span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-px rounded-sm bg-brand-soft text-brand-ink tracking-normal">
                CAD
              </span>
            </div>
            <div
              className="text-[11px] font-mono text-ink-muted truncate max-w-[180px]"
              title={activeLabTitle || 'Blank Installation Canvas'}
            >
              {activeLabTitle || 'Blank Installation Canvas'}
            </div>
          </div>
        </div>

        <Divider />

        <RibbonButton onClick={onOpenLabs} title="Open Example Wirings & Learning Labs" label="Examples">
          <BookOpen className="w-4 h-4" />
        </RibbonButton>
        <RibbonButton onClick={onImportJson} title="Open project (Import JSON)" label="Import">
          <Upload className="w-4 h-4" />
        </RibbonButton>
        <RibbonButton onClick={onExportJson} title="Save project (Export JSON)" label="Export">
          <Download className="w-4 h-4" />
        </RibbonButton>
        {onExportHtml && (
          <RibbonButton
            onClick={onExportHtml}
            title="Save self-contained offline HTML (opens directly to your wiring)"
            label="Save HTML"
          >
            <FileCode2 className="w-4 h-4" />
          </RibbonButton>
        )}
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
          className={`flex items-center gap-1.5 h-8 pl-3 pr-3.5 rounded-md text-xs font-semibold border shadow-1 transition shrink-0 ${
            isSimulating
              ? 'bg-danger hover:opacity-90 text-surface border-danger'
              : 'bg-brand hover:bg-brand-strong text-on-brand border-brand hover:border-brand-strong'
          }`}
        >
          {isSimulating ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isSimulating ? 'Stop Sim' : 'Simulate'}</span>
        </button>

        {/* Mode status badge */}
        <div
          className={`hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[10px] font-mono font-bold shrink-0 ${
            isSimulating
              ? 'bg-ok-soft border-ok/40 text-ok'
              : 'bg-surface-sunken border-warning/40 text-warning'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-ok animate-pulse' : 'bg-warning-fill'}`} />
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
        <div className="flex items-center gap-0.5 bg-surface-sunken p-0.5 rounded-md shrink-0">
          {([
            { id: 'realistic', label: 'Realistic', icon: Eye, tip: 'Realistic physical wiring workbench' },
            { id: 'split', label: 'Dual View', icon: Layers, tip: 'Split dual view (physical workbench + live ladder / SLD)' },
            { id: 'ladder', label: 'Ladder Logic', icon: Rows3, tip: 'Control ladder diagram (live sync, lab target & rung builder)' },
            { id: 'schematic', label: 'SLD Schematic', icon: SlidersHorizontal, tip: 'Single-line diagram (SLD)' },
            { id: 'plc', label: 'PLC', icon: Cpu, tip: 'PLC program editor: write, run and monitor ladder logic' },
            { id: 'plan', label: 'Plan', icon: MapIcon, tip: 'Floor plan: rooms, symbols linked to devices and home runs that set the wire lengths' },
          ] as const).map((v) => (
            <button
              key={v.id}
              onClick={() => onViewModeChange(v.id)}
              title={v.tip}
              className={`flex items-center gap-1 px-2 h-7 rounded-sm text-xs font-medium transition-all ${
                viewMode === v.id ? 'bg-surface text-ink font-semibold shadow-1' : 'text-ink-muted hover:text-ink'
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
        {onToggleDmmMode && (
          <RibbonButton
            onClick={onToggleDmmMode}
            active={dmmMode}
            title="Meters & Test Instruments: DMM / clamp (click a wire for Amps, 2 terminals for Volts), insulation tester, earth tester, phase rotation meter, continuity buzzer"
            label="DMM"
          >
            <Zap className="w-4 h-4" />
          </RibbonButton>
        )}
      </div>

      {/* ───────── RIGHT GROUP: Standards & Audit ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {trippedCount > 0 && (
          <button
            onClick={onResetSimulation}
            title="Re-arm all tripped breakers"
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-danger hover:opacity-90 text-surface font-mono text-xs font-bold shadow-1 shrink-0"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{trippedCount} TRIPPED</span>
            <RotateCcw className="w-3 h-3 opacity-80" />
          </button>
        )}

        <div
          className={`hidden xl:flex items-center gap-1 h-8 px-2 rounded-lg border text-[10px] font-bold shrink-0 ${
            isCompliant
              ? 'bg-ok-soft border-ok/40 text-ok'
              : 'bg-warning-soft border-warning/40 text-warning'
          }`}
          title={isCompliant ? 'No code violations detected' : 'Open the inspector for code violations'}
        >
          {isCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {isCompliant ? 'Compliant' : 'Violations'}
        </div>

        <div className="flex items-center gap-0.5 bg-surface-sunken p-0.5 rounded-md shrink-0">
          <button
            onClick={() => onStandardChange('PEC')}
            className={`px-2.5 h-7 rounded-sm text-xs font-semibold transition-all ${
              standard === 'PEC' ? 'bg-surface text-ink shadow-1' : 'text-ink-muted hover:text-ink'
            }`}
            title="Philippine Electrical Code (60Hz, AWG, Black/Red/White/Green)"
          >
            PEC<span className="hidden xl:inline"> 2017</span>
          </button>
          <button
            onClick={() => onStandardChange('IEC')}
            className={`px-2.5 h-7 rounded-sm text-xs font-semibold transition-all ${
              standard === 'IEC' ? 'bg-surface text-ink shadow-1' : 'text-ink-muted hover:text-ink'
            }`}
            title={`International Electrotechnical Commission (${hz}Hz, metric mm², Brown/Blue/Green-Yellow)`}
          >
            IEC<span className="hidden xl:inline"> 60364</span>
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
        <RibbonButton onClick={theme.toggle} title={theme.dark ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme.dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </RibbonButton>
      </div>
    </header>
  );
};
