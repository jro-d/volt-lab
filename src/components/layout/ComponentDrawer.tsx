import React, { useMemo, useState } from 'react';
import { DeviceType } from '../../types/electrical';
import { COMPONENT_CATALOG, ComponentDefinition } from '../../data/defaultComponents';
import { DeviceThumbnail } from '../devices/DeviceThumbnail';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Search,
  X,
  Library,
} from 'lucide-react';

interface ComponentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddComponent: (type: DeviceType) => void;
  /** When true (grid energized) adding devices is locked */
  isLocked?: boolean;
}

interface FolderNode {
  id: string;
  label: string;
  /** device types that live directly in this folder */
  types?: DeviceType[];
  children?: FolderNode[];
}

/**
 * EduVolt-style hierarchical library tree. Any catalog device that is not claimed by a folder
 * below is surfaced in a trailing "Other Devices" folder so nothing is ever hidden.
 */
const LIBRARY_TREE: FolderNode[] = [
  {
    id: 'residential',
    label: 'ROYU & PH Residential Devices',
    types: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'dimmer_switch', 'switch_3way', 'switch_4way', 'socket_duplex', 'royu_modular_combo_plate', 'socket_schuko', 'light_bulb'],
  },
  {
    id: 'panelboards',
    label: 'Panelboards & Circuit Breakers',
    children: [
      { id: 'pole1', label: '1 Pole', types: ['mcb_1p'] },
      { id: 'pole2', label: '2 Poles (Bolt-On & DIN)', types: ['mcb_2p', 'service_disconnect_2p', 'ats_changeover'] },
      { id: 'pole3', label: '3 Poles', types: ['mcb_3p'] },
      { id: 'safety', label: 'RCD / Safety Breakers', types: ['rcd_2p', 'royu_safety_breaker_2p', 'spd_surge'] },
      { id: 'mounting', label: 'Panelboards, DIN Rails & Meters', types: ['panelboard_frame', 'din_rail_track', 'panel_meter'] },
    ],
  },
  {
    id: 'conduits',
    label: 'Conduits, Utility & Junction Boxes',
    types: ['utility_box_surface_pvc', 'junction_box_octagonal_orange', 'junction_box', 'junction_box_4way', 'splice_wire_nut', 'wago_connector_3p'],
  },
  {
    id: 'industrial',
    label: 'Marine & Industrial Motor Control',
    children: [
      { id: 'supply3p', label: '3-Phase Supply & Control Power', types: ['source_3phase_440v', 'control_transformer'] },
      { id: 'starters', label: 'Contactors, Timers & Overload Relays', types: ['contactor_3p', 'thermal_overload_relay', 'industrial_relay_dpdt', 'timer_relay'] },
      { id: 'operators', label: 'Push Buttons, Selectors & Pilot Lights', types: ['push_button_station', 'push_button_fwd_rev', 'push_button_estop', 'selector_hoa', 'limit_switch', 'pilot_light_indicator'] },
      { id: 'motors', label: 'Motors & Drives (VFD)', types: ['motor_ac_industrial', 'motor_3phase_dol', 'vfd_drive'] },
    ],
  },
  { id: 'automation', label: 'PLC & Automation', types: ['plc_micro_controller'] },
  {
    id: 'service',
    label: 'Service Entrance & Grounding',
    types: ['kwh_meter_1p', 'kwh_meter_3p', 'earth_busbar', 'neutral_busbar', 'ground_pit'],
  },
  {
    id: 'appliances',
    label: 'Appliances & Loads',
    types: ['appliance_tv', 'appliance_water_heater', 'appliance_fan', 'appliance_ac'],
  },
];

const collectTypes = (node: FolderNode): DeviceType[] => [
  ...(node.types || []),
  ...(node.children || []).flatMap(collectTypes),
];

export const ComponentDrawer: React.FC<ComponentDrawerProps> = ({
  isOpen,
  onClose,
  onAddComponent,
  isLocked = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = searchQuery.trim().toLowerCase();

  // Build the tree including an "Other Devices" safety-net folder for unclaimed catalog entries
  const tree = useMemo<FolderNode[]>(() => {
    const claimed = new Set(LIBRARY_TREE.flatMap(collectTypes));
    const orphans = COMPONENT_CATALOG.filter((c) => !claimed.has(c.type)).map((c) => c.type);
    return orphans.length > 0
      ? [...LIBRARY_TREE, { id: 'other', label: 'Other Devices', types: orphans }]
      : LIBRARY_TREE;
  }, []);

  const catalogByType = useMemo(() => {
    const map = new Map<DeviceType, ComponentDefinition>();
    COMPONENT_CATALOG.forEach((c) => map.set(c.type, c));
    return map;
  }, []);

  const matchesQuery = (def: ComponentDefinition) =>
    !query || def.name.toLowerCase().includes(query) || def.description.toLowerCase().includes(query);

  const itemsFor = (types: DeviceType[] = []) =>
    types
      .map((t) => catalogByType.get(t))
      .filter((d): d is ComponentDefinition => !!d && matchesQuery(d));

  const countIn = (node: FolderNode): number =>
    itemsFor(node.types).length + (node.children || []).reduce((n, c) => n + countIn(c), 0);

  const toggleFolder = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderItem = (item: ComponentDefinition) => (
    <div
      key={item.type}
      draggable={!isLocked}
      onDragStart={(e) => {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/voltlab-device', item.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onAddComponent(item.type)}
      className={`group flex items-center gap-2.5 p-1.5 rounded-xl border transition ${
        isLocked
          ? 'opacity-50 cursor-not-allowed border-transparent'
          : 'cursor-grab active:cursor-grabbing border-slate-800 bg-[#152033]/90 hover:bg-slate-800 hover:border-sky-400/70 hover:shadow-[0_4px_14px_rgba(56,189,248,0.18)]'
      }`}
      title={isLocked ? 'Stop simulation (■) to modify wiring' : 'Click or drag onto workbench canvas'}
    >
      <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 border border-slate-500/80 shadow-inner flex items-center justify-center overflow-hidden p-0.5">
        <DeviceThumbnail type={item.type} className="w-11 h-11" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition-colors truncate">
          {item.name}
        </div>
        <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
        <span className="inline-block mt-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
          {item.terminals.length} terminals
        </span>
      </div>
      <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-600 group-hover:bg-sky-500 group-hover:border-sky-400 text-slate-300 group-hover:text-slate-950 flex items-center justify-center transition shrink-0">
        <Plus className="w-3 h-3" />
      </div>
    </div>
  );

  const renderFolder = (node: FolderNode, depth = 0): React.ReactNode => {
    const count = countIn(node);
    if (count === 0) return null;

    // Searching force-expands every folder that has a hit
    const isCollapsed = query ? false : !!collapsed[node.id];
    const FolderIcon = isCollapsed ? Folder : FolderOpen;

    return (
      <div key={node.id}>
        <button
          onClick={() => toggleFolder(node.id)}
          className={`w-full flex items-center justify-between gap-2 py-1.5 pr-2 rounded-lg hover:bg-slate-800/80 text-left transition ${
            depth === 0 ? 'pl-1.5 text-xs font-bold text-slate-100' : 'pl-1.5 text-[11px] font-semibold text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <FolderIcon className={`w-4 h-4 shrink-0 ${depth === 0 ? 'text-amber-400' : 'text-amber-300'}`} />
            <span className="truncate">{node.label}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-300 bg-slate-800 border border-slate-700 px-1.5 rounded font-semibold shrink-0">{count}</span>
        </button>

        {!isCollapsed && (
          <div className="ml-3 pl-2 border-l border-slate-700/80 space-y-1">
            {(node.children || []).map((child) => renderFolder(child, depth + 1))}
            {itemsFor(node.types).map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const total = tree.reduce((n, f) => n + countIn(f), 0);

  return (
    <aside className="voltlab-panel voltlab-scroll-dark absolute top-3 left-3 z-30 w-80 max-h-[calc(100%-36px)] rounded-2xl bg-[#0f172a]/[0.97] backdrop-blur-md shadow-[0_20px_50px_rgba(15,23,42,0.45)] border-2 border-slate-600/90 ring-1 ring-white/10 flex flex-col overflow-hidden select-none text-slate-100">
      {/* Floating window title bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-700 bg-[#162033]">
        <span className="flex items-center gap-2 text-[11px] font-bold text-slate-100 uppercase tracking-wider font-mono">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
          <Library className="w-3.5 h-3.5 text-rose-400" />
          Component Library
          <span className="text-slate-200 bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold normal-case">{total}</span>
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="Hide library"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-800 bg-[#0f172a]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search library (MCB, ROYU, PLC...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 shadow-inner"
          />
        </div>
      </div>

      {isLocked && (
        <div className="mx-3 mt-2 mb-1 px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/60 text-[10px] font-semibold text-amber-200">
          🔒 Grid energized — stop simulation (■) to add devices.
        </div>
      )}

      {/* Folder tree */}
      <div className="voltlab-scroll-dark flex-1 overflow-y-auto px-2 py-2 pb-3 space-y-1">
        {tree.map((folder) => renderFolder(folder))}
        {total === 0 && (
          <div className="text-center text-xs text-slate-400 py-6">No devices match “{searchQuery}”.</div>
        )}
      </div>
    </aside>
  );
};
