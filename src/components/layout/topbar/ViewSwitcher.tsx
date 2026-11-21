import React from 'react';
import { Cpu, Eye, Layers, Map as MapIcon, Rows3, SlidersHorizontal } from 'lucide-react';
import { MenuButton, MenuEntry } from './Menu';
import { Tooltip } from './Tooltip';

export type TopbarViewId = 'realistic' | 'split' | 'ladder' | 'schematic' | 'plc' | 'plan';

export interface ViewOption {
  id: TopbarViewId;
  label: string;
  shortLabel: string;
  tip: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

export const DEFAULT_VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'realistic',
    label: 'Realistic Wiring',
    shortLabel: 'Realistic',
    tip: 'Switch to Realistic physical wiring workbench',
    icon: Eye,
    available: true,
  },
  {
    id: 'split',
    label: 'Dual Split View',
    shortLabel: 'Split',
    tip: 'Switch to Split dual view (workbench + ladder / SLD)',
    icon: Layers,
    available: true,
  },
  {
    id: 'ladder',
    label: 'Ladder Logic',
    shortLabel: 'Ladder',
    tip: 'Switch to Control ladder diagram',
    icon: Rows3,
    available: true,
  },
  {
    id: 'schematic',
    label: 'SLD Schematic',
    shortLabel: 'Schematic',
    tip: 'Switch to Single-line diagram (SLD)',
    icon: SlidersHorizontal,
    available: true,
  },
  {
    id: 'plc',
    label: 'PLC Program Editor',
    shortLabel: 'PLC',
    tip: 'Switch to PLC program editor',
    icon: Cpu,
    available: true,
  },
  {
    id: 'plan',
    label: 'Floor Plan',
    shortLabel: 'Plan',
    tip: 'Switch to Floor plan view',
    icon: MapIcon,
    available: true,
  },
];

export interface ViewSwitcherProps {
  viewMode: TopbarViewId;
  onViewModeChange: (mode: TopbarViewId) => void;
  compact: boolean;
  size?: 'md' | 'touch';
  options?: ViewOption[];
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  viewMode,
  onViewModeChange,
  compact,
  size = 'md',
  options = DEFAULT_VIEW_OPTIONS,
}) => {
  const availableOptions = options.filter((o) => o.available);
  const current = availableOptions.find((o) => o.id === viewMode) || availableOptions[0];

  if (compact) {
    const items: MenuEntry[] = availableOptions.map((opt) => ({
      id: opt.id,
      label: opt.label,
      icon: opt.icon,
      active: viewMode === opt.id,
      onSelect: () => onViewModeChange(opt.id),
    }));

    return (
      <MenuButton
        icon={current.icon}
        label={`View: ${current.label}`}
        text={current.shortLabel}
        items={items}
        size={size}
        showChevron
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Workspace view"
      className="flex items-center gap-0.5 bg-surface-sunken p-0.5 rounded-md shrink-0 border border-border/60"
    >
      {availableOptions.map((v) => {
        const Icon = v.icon;
        const active = viewMode === v.id;
        return (
          <Tooltip key={v.id} label={v.tip}>
            <button
              type="button"
              onClick={() => onViewModeChange(v.id)}
              aria-label={v.tip}
              aria-pressed={active}
              className={`flex items-center gap-1 px-2 h-7 rounded-sm text-xs font-medium transition motion-reduce:transition-none focus-visible:outline-none focus-visible:shadow-focus ${
                active ? 'bg-surface text-ink font-semibold shadow-1' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">{v.shortLabel}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
