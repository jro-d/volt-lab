import React from 'react';
import { BrandMark } from './BrandMark';
import {
  Activity,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  BookOpen,
  Download,
  FileCode2,
  FileText,
  FlipHorizontal2,
  FolderOpen,
  Layers,
  Library,
  Lock,
  Moon,
  MoreHorizontal,
  PanelRight,
  Play,
  Redo2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Square,
  Sun,
  Trash2,
  TrendingUp,
  Undo2,
  Unlock,
  Upload,
  Wrench,
  Zap,
} from 'lucide-react';
import { CodeStandard } from '../../types/electrical';
import { saveTheme } from '../../utils/themeStorage';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { IconButton } from './topbar/IconButton';
import { MenuButton, MenuEntry } from './topbar/Menu';
import { StatusChip } from './topbar/StatusChip';
import { Tooltip } from './topbar/Tooltip';
import { TopbarViewId, ViewSwitcher } from './topbar/ViewSwitcher';

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
  viewMode: TopbarViewId;
  onViewModeChange: (mode: TopbarViewId) => void;
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
  // Responsive / optional panel hooks
  isViewOnly?: boolean;
  troubleshootMode?: boolean;
  onToggleTroubleshoot?: () => void;
  recorderOpen?: boolean;
  onToggleRecorder?: () => void;
  curvesOpen?: boolean;
  onToggleCurves?: () => void;
  faultLevelsOn?: boolean;
  onToggleFaultLevels?: () => void;
  onOpenReports?: () => void;
  onOpenSafeIsolation?: () => void;
  // Desktop app updater hooks
  appVersion?: string;
  onCheckForUpdates?: () => void;
}

const Divider = () => <div className="hidden md:block w-px h-6 bg-border mx-0.5 shrink-0" />;

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
  isViewOnly,
  troubleshootMode = false,
  onToggleTroubleshoot,
  recorderOpen = false,
  onToggleRecorder,
  curvesOpen = false,
  onToggleCurves,
  faultLevelsOn = false,
  onToggleFaultLevels,
  onOpenReports,
  onOpenSafeIsolation,
  appVersion,
  onCheckForUpdates,
}) => {
  const hz = standard === 'PEC' ? 60 : 50;
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isPhone = isViewOnly ?? breakpoint === 'phone';
  const isDesktop = breakpoint === 'desktop' && !isPhone;
  const btnSize = isDesktop ? 'md' : 'touch';

  const fileItems: MenuEntry[] = [
    {
      id: 'examples',
      label: 'Examples & learning labs…',
      icon: BookOpen,
      onSelect: onOpenLabs,
    },
    {
      id: 'import',
      label: 'Import project JSON…',
      icon: Upload,
      disabled: isSimulating,
      onSelect: onImportJson,
    },
    {
      id: 'export-json',
      label: 'Export project as JSON',
      icon: Download,
      onSelect: onExportJson,
    },
  ];
  if (onExportHtml) {
    fileItems.push({
      id: 'export-html',
      label: 'Save standalone HTML',
      icon: FileCode2,
      onSelect: onExportHtml,
    });
  }
  fileItems.push({ kind: 'divider', id: 'file-div-1' });
  fileItems.push({
    id: 'reset-sim',
    label: 'Reset tripped breakers',
    icon: RotateCcw,
    disabled: trippedCount === 0,
    onSelect: onResetSimulation,
  });
  fileItems.push({
    id: 'clear-canvas',
    label: 'Clear canvas',
    icon: Trash2,
    disabled: isSimulating,
    danger: true,
    onSelect: onClearCanvas,
  });

  const panelSubmenuItems: MenuEntry[] = [];
  if (onToggleRecorder) {
    panelSubmenuItems.push({
      id: 'panel-recorder',
      label: 'Timing diagram recorder',
      icon: Activity,
      active: recorderOpen,
      onSelect: onToggleRecorder,
    });
  }
  if (onToggleCurves) {
    panelSubmenuItems.push({
      id: 'panel-curves',
      label: 'Time-current curves',
      icon: TrendingUp,
      active: curvesOpen,
      onSelect: onToggleCurves,
    });
  }
  if (onToggleFaultLevels) {
    panelSubmenuItems.push({
      id: 'panel-faults',
      label: 'Fault levels overlay',
      icon: Zap,
      active: faultLevelsOn,
      onSelect: onToggleFaultLevels,
    });
  }
  if (onOpenSafeIsolation || onOpenReports) {
    panelSubmenuItems.push({
      id: 'panel-isolation',
      label: 'Safe isolation & LOTO',
      icon: ShieldCheck,
      onSelect: onOpenSafeIsolation || onOpenReports,
    });
  }
  if (onOpenReports) {
    panelSubmenuItems.push({
      id: 'panel-reports',
      label: 'Reports & schedules…',
      icon: FileText,
      onSelect: onOpenReports,
    });
  }

  const overflowItems: MenuEntry[] = [];
  if (!isPhone) {
    overflowItems.push(
      {
        id: 'lock-selected',
        label: isSelectedLocked && hasSelectedDevice ? 'Unlock selected device' : 'Lock selected device',
        icon: isSelectedLocked && hasSelectedDevice ? Unlock : Lock,
        disabled: !hasSelectedDevice || isSimulating,
        active: hasSelectedDevice && isSelectedLocked,
        onSelect: onToggleLockSelected,
      },
      {
        id: 'align-h',
        label: 'Align selected horizontally',
        icon: AlignHorizontalJustifyCenter,
        disabled: !canAlign || isSimulating,
        onSelect: onAlignHorizontal,
      },
      {
        id: 'align-v',
        label: 'Align selected vertically',
        icon: AlignVerticalJustifyCenter,
        disabled: !canAlign || isSimulating,
        onSelect: onAlignVertical,
      }
    );
    if (onFlipAllOutlets) {
      overflowItems.push({
        id: 'flip-outlets',
        label: isAllRearView ? 'Switch outlets to front view' : 'Switch outlets to rear view',
        icon: FlipHorizontal2,
        disabled: isSimulating,
        active: isAllRearView,
        onSelect: onFlipAllOutlets,
      });
    }
    if (onToggleDmmMode) {
      overflowItems.push({
        id: 'dmm-mode',
        label: 'Meters & test instruments (DMM)',
        icon: Zap,
        active: dmmMode,
        onSelect: onToggleDmmMode,
      });
    }
    if (panelSubmenuItems.length > 0) {
      overflowItems.push({ kind: 'divider', id: 'overflow-div-panels' });
      overflowItems.push({
        kind: 'submenu',
        id: 'panels-submenu',
        label: 'Panels',
        icon: Layers,
        items: panelSubmenuItems,
      });
    }
    overflowItems.push({ kind: 'divider', id: 'overflow-div-std' });
  }

  overflowItems.push(
    { kind: 'header', id: 'std-header', label: 'Electrical standard' },
    {
      id: 'std-pec',
      label: 'PEC 2017 (60 Hz, AWG)',
      active: standard === 'PEC',
      onSelect: () => onStandardChange('PEC'),
    },
    {
      id: 'std-iec',
      label: `IEC 60364 (${hz} Hz, mm²)`,
      active: standard === 'IEC',
      onSelect: () => onStandardChange('IEC'),
    },
    { kind: 'divider', id: 'overflow-div-theme' },
    {
      id: 'toggle-theme',
      label: theme.dark ? 'Switch to light theme' : 'Switch to dark theme',
      icon: theme.dark ? Sun : Moon,
      onSelect: theme.toggle,
    }
  );
  if (onCheckForUpdates) {
    overflowItems.push(
      { kind: 'divider', id: 'overflow-div-desktop' },
      {
        kind: 'header',
        id: 'desktop-ver-header',
        label: appVersion ? `WireWise Desktop v${appVersion}` : 'WireWise Desktop',
      },
      {
        id: 'check-updates',
        label: 'Check for updates…',
        icon: RefreshCw,
        onSelect: onCheckForUpdates,
      }
    );
  }

  const runTooltip = isSimulating
    ? 'Stop simulation and return to Edit Mode'
    : 'Energize the grid and start simulation';

  return (
    <header className="bg-surface border-b border-border px-2.5 md:px-3 h-12 md:h-14 shrink-0 z-30 select-none shadow-1 flex items-center justify-between gap-1.5 md:gap-2">
      {/* ───────── LEFT GROUP: Brand, History, File ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Slot 1: Brand + active lab chip */}
        <div className="flex items-center gap-2 min-w-0">
          <BrandMark className="w-8 h-8 shrink-0" />
          <div className="hidden xl:flex items-center gap-2 min-w-0">
            <div className="text-[18px] font-display font-bold text-ink leading-none tracking-[-0.01em] flex items-center gap-1.5 shrink-0">
              <span>
                Wire<span className="text-brand">Wise</span>
              </span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-px rounded-sm bg-brand-soft text-brand-ink tracking-normal">
                CAD
              </span>
            </div>
            <Tooltip label="Open example wirings & learning labs" align="left">
              <button
                type="button"
                onClick={onOpenLabs}
                aria-label="Open example wirings and learning labs"
                className="h-7 px-2 rounded-md border border-border bg-surface-sunken hover:bg-surface-hover text-[11px] font-mono text-ink-muted hover:text-ink truncate max-w-[180px] transition motion-reduce:transition-none focus-visible:outline-none focus-visible:shadow-focus"
              >
                {activeLabTitle || 'Blank Installation'}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Slot 2: History (Undo / Redo) */}
        {!isPhone && (
          <>
            <Divider />
            <div className="flex items-center gap-1 shrink-0">
              <IconButton
                icon={Undo2}
                label="Undo"
                shortcut="Ctrl+Z"
                disabled={!canUndo || isSimulating}
                onClick={onUndo}
                size={btnSize}
              />
              <IconButton
                icon={Redo2}
                label="Redo"
                shortcut="Ctrl+Y"
                disabled={!canRedo || isSimulating}
                onClick={onRedo}
                size={btnSize}
              />
            </div>
          </>
        )}

        {/* Slot 3: File Menu */}
        {!isPhone && (
          <MenuButton
            icon={FolderOpen}
            label="Open file and project menu"
            text={isDesktop ? 'File' : undefined}
            items={fileItems}
            size={btnSize}
            showChevron
          />
        )}
      </div>

      {/* ───────── CENTER GROUP: Run & View Switcher ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Slot 4: Simulate / Stop + Live-mode indicator */}
        <Tooltip label={runTooltip}>
          <button
            type="button"
            onClick={onToggleSimulation}
            aria-label={runTooltip}
            aria-pressed={isSimulating}
            className={`flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold border shadow-1 transition motion-reduce:transition-none shrink-0 focus-visible:outline-none focus-visible:shadow-focus ${
              isDesktop ? 'h-8 px-3' : isPhone ? 'h-11 w-11' : 'h-11 px-3'
            } ${
              isSimulating
                ? 'bg-danger hover:opacity-90 text-surface border-danger'
                : 'bg-brand hover:bg-brand-strong text-on-brand border-brand hover:border-brand-strong'
            }`}
          >
            {isSimulating ? (
              <Square className="w-3.5 h-3.5 fill-current shrink-0" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            )}
            {!isPhone && <span>{isSimulating ? 'Stop Sim' : 'Simulate'}</span>}
            {isSimulating && (
              <span
                aria-hidden="true"
                className="xl:hidden w-1.5 h-1.5 rounded-full bg-surface animate-pulse motion-reduce:animate-none shrink-0"
              />
            )}
          </button>
        </Tooltip>

        {/* Live mode badge (full pill on desktop, compact dot below 1280 px) */}
        <div
          className={`hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[10px] font-mono font-bold shrink-0 ${
            isSimulating
              ? 'bg-ok-soft border-ok/40 text-ok'
              : 'bg-surface-sunken border-warning/40 text-warning'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-ok animate-pulse motion-reduce:animate-none' : 'bg-warning-fill'}`} />
          <span>{isSimulating ? `LIVE (${gridVoltage}V)` : 'EDIT MODE'}</span>
        </div>

        <Divider />

        {/* Slot 5: View switcher */}
        <ViewSwitcher
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          compact={!isDesktop}
          size={btnSize}
        />
      </div>

      {/* ───────── RIGHT GROUP: Status, Panels & Overflow ───────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Slot 6: Status chip (+ desktop standard tag) */}
        <StatusChip
          isCompliant={isCompliant}
          trippedCount={trippedCount}
          standard={standard}
          onResetSimulation={onResetSimulation}
          onToggleHud={onToggleHud}
          size={btnSize}
        />

        <Divider />

        {/* Slot 7: Panels toggles */}
        <div className="flex items-center gap-1 shrink-0">
          {!isPhone && onToggleTroubleshoot && (
            <IconButton
              icon={Wrench}
              label={troubleshootMode ? 'Exit troubleshooting mode' : 'Toggle troubleshooting mode'}
              active={troubleshootMode}
              onClick={onToggleTroubleshoot}
              size={btnSize}
            />
          )}
          {!isPhone && (
            <IconButton
              icon={Library}
              label={isLibraryOpen ? 'Hide component library' : 'Show component library'}
              active={isLibraryOpen}
              disabled={isSimulating}
              onClick={onToggleLibrary}
              size={btnSize}
            />
          )}
          <IconButton
            icon={PanelRight}
            label={isHudOpen ? 'Hide code inspector' : 'Show code inspector'}
            active={isHudOpen}
            onClick={onToggleHud}
            size={btnSize}
            alignTooltip="right"
          />
        </div>

        {/* Slot 8: Overflow menu */}
        <MenuButton
          icon={MoreHorizontal}
          label="More tools and settings"
          items={overflowItems}
          size={btnSize}
          align="right"
        />
      </div>
    </header>
  );
};
