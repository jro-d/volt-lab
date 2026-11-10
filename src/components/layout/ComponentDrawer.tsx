import React, { useState } from 'react';
import { CodeStandard, DeviceType, WiringMode } from '../../types/electrical';
import { COMPONENT_CATALOG } from '../../data/defaultComponents';
import { COLOR_STANDARDS, getWireStandards } from '../../data/standardsData';
import { DeviceThumbnail } from '../devices/DeviceThumbnail';
import { 
  Zap, 
  ShieldCheck, 
  ToggleRight, 
  Lightbulb, 
  Layers, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  GitBranch, 
  Cable,
  Search,
  Cpu
} from 'lucide-react';

interface ComponentDrawerProps {
  standard: CodeStandard;
  wiringMode: WiringMode;
  activeWireColor: string;
  activeWireGauge: string;
  activeWireLength: number;
  onSelectWiringMode: (mode: WiringMode) => void;
  onSelectWireColor: (color: string) => void;
  onSelectWireGauge: (gauge: string) => void;
  onSelectWireLength: (length: number) => void;
  onAddComponent: (type: DeviceType) => void;
}

export const ComponentDrawer: React.FC<ComponentDrawerProps> = ({
  standard,
  wiringMode,
  activeWireColor,
  activeWireGauge,
  activeWireLength,
  onSelectWiringMode,
  onSelectWireColor,
  onSelectWireGauge,
  onSelectWireLength,
  onAddComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    industrial: false,
    automation: false,
    splice: false,
    supply: false,
    protection: false,
    control: false,
    load: false,
  });

  const wireStandards = getWireStandards(standard);
  const colors = COLOR_STANDARDS[standard];

  const toggleSection = (sec: string) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const categories = [
    { id: 'industrial', label: 'Industrial & Motor Controls', icon: Cpu },
    { id: 'automation', label: 'PLC & Automation Logic', icon: Cpu },
    { id: 'splice', label: 'Junction Boxes & Splices', icon: GitBranch },
    { id: 'supply', label: 'Service & Metering', icon: Zap },
    { id: 'protection', label: 'Distribution & MCBs', icon: ShieldCheck },
    { id: 'busbar', label: 'Busbars & Ground Pits', icon: Layers },
    { id: 'control', label: 'Switches & Controls', icon: ToggleRight },
    { id: 'receptacle', label: 'Sockets & Outlets', icon: Layers },
    { id: 'load', label: 'Lamps & Appliances', icon: Lightbulb },
  ];

  return (
    <aside className="w-80 bg-[#faf8f5] border-r border-[#ece6de] flex flex-col h-full overflow-hidden select-none z-10 text-stone-800">
      {/* Wire Tool Settings Card (Light Mode) */}
      <div className="p-3.5 border-b border-[#ece6de] bg-white m-2.5 rounded-xl border shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Cable className="w-3.5 h-3.5 text-rose-600" />
            Conductor & Cable Tool
          </span>
          <span className="text-[10px] text-stone-500 font-mono font-bold">
            {standard} Codes
          </span>
        </div>

        {/* Cable / Multi-Wire Mode Selector */}
        <div className="mb-2.5">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
            Conductor Pairing
          </label>
          <div className="grid grid-cols-3 gap-1 bg-[#f4f0eb] p-1 rounded-lg">
            <button
              onClick={() => onSelectWiringMode('single')}
              className={`py-1 text-[11px] font-bold rounded-md transition ${
                wiringMode === 'single'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Single Conductor (Manual Line, Neutral, or Earth)"
            >
              1-Wire
            </button>
            <button
              onClick={() => onSelectWiringMode('dual_ln')}
              className={`py-1 text-[11px] font-bold rounded-md transition ${
                wiringMode === 'dual_ln'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Paired 2-Wire Cable: Feed (Live) + Return (Neutral)"
            >
              2-Wire L+N
            </button>
            <button
              onClick={() => onSelectWiringMode('triple_lnpe')}
              className={`py-1 text-[11px] font-bold rounded-md transition ${
                wiringMode === 'triple_lnpe'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="3-Wire Cable: Live + Neutral Return + Earth Ground"
            >
              3-Wire +PE
            </button>
          </div>
          <div className="text-[9px] text-stone-500 mt-1">
            {wiringMode === 'single'
              ? 'Connects a single wire of selected color.'
              : wiringMode === 'dual_ln'
              ? 'Automatically pulls paired Live (Red) & Neutral Return (Blue) wires.'
              : 'Pulls complete cable: Live (Red), Neutral Return (Blue), and Earth (Green).'}
          </div>
        </div>

        {/* Wire Color Swatches */}
        <div className="mb-2.5">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
            Conductor Color
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {[
              { color: colors.phase1, name: colors.names.phase1 },
              { color: colors.phase2, name: colors.names.phase2 },
              { color: colors.phase3, name: colors.names.phase3 },
              { color: colors.neutral, name: colors.names.neutral },
              { color: colors.earth, name: colors.names.earth },
              { color: colors.switched, name: colors.names.switched },
            ].map((swatch, i) => (
              <button
                key={i}
                onClick={() => onSelectWireColor(swatch.color)}
                style={{ backgroundColor: swatch.color }}
                className={`h-6 rounded border transition-transform ${
                  activeWireColor === swatch.color
                    ? 'border-stone-900 scale-110 shadow-md ring-2 ring-stone-900/20'
                    : 'border-stone-300 hover:scale-105'
                }`}
                title={swatch.name}
              />
            ))}
          </div>
        </div>

        {/* Wire Gauge Selector */}
        <div className="mb-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
            Conductor Gauge (Cross-Section)
          </label>
          <select
            value={activeWireGauge}
            onChange={(e) => onSelectWireGauge(e.target.value)}
            className="w-full bg-[#faf8f5] border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-500"
          >
            {wireStandards.map((ws) => (
              <option key={ws.id} value={ws.name}>
                {ws.name} (Max {ws.maxBreakerAmps}A)
              </option>
            ))}
          </select>
        </div>

        {/* Wire Length Slider */}
        <div>
          <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
            <span className="font-bold uppercase tracking-wider">Run Length</span>
            <span className="font-mono text-stone-900 font-bold">{activeWireLength} m</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={activeWireLength}
            onChange={(e) => onSelectWireLength(Number(e.target.value))}
            className="w-full accent-rose-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
          />
        </div>
      </div>

      {/* Search Filter for Catalog */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search catalog devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#ece6de] rounded-lg text-xs placeholder:text-stone-400 focus:outline-none focus:border-rose-500 shadow-sm"
          />
        </div>
      </div>

      {/* Visual Device Catalog Accordion */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-2.5">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1 font-mono">
          Visual Device Catalog
        </div>

        {categories.map((cat) => {
          const isCollapsed = !!collapsedSections[cat.id];
          const items = COMPONENT_CATALOG.filter(c => {
            const matchesCat = c.category === cat.id || (cat.id === 'busbar' && c.category === 'earthing');
            if (!matchesCat) return false;
            if (!searchQuery) return true;
            return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase());
          });

          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="border border-[#ece6de] rounded-xl overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => toggleSection(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#faf8f5] hover:bg-[#f4f0eb] text-xs font-bold text-stone-800 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <cat.icon className="w-3.5 h-3.5 text-rose-600" />
                  <span>{cat.label}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-stone-400 font-semibold">{items.length}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  )}
                </div>
              </button>

              {!isCollapsed && (
                <div className="p-2 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/voltlab-device', item.type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAddComponent(item.type)}
                      className="group flex items-center gap-2.5 p-2 rounded-xl bg-[#faf8f5]/60 hover:bg-white border border-stone-200/60 hover:border-rose-300 hover:shadow-md transition cursor-grab active:cursor-grabbing"
                      title="Click or drag onto workbench canvas"
                    >
                      {/* Visual Equipment Picture Thumbnail */}
                      <DeviceThumbnail type={item.type} className="w-14 h-14" />

                      {/* Info & Specs */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-stone-900 group-hover:text-rose-600 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-stone-500 line-clamp-2 leading-tight mt-0.5">
                          {item.description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-stone-200/80 text-stone-700">
                            {item.terminals.length} Terminals
                          </span>
                        </div>
                      </div>

                      {/* Add Button Icon */}
                      <div className="w-6 h-6 rounded-lg bg-stone-100 group-hover:bg-rose-600 text-stone-500 group-hover:text-white flex items-center justify-center transition shrink-0 shadow-sm">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
