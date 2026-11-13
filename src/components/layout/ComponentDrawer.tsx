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
    types: ['switch_1gang', 'switch_3way', 'switch_4way', 'socket_duplex', 'royu_modular_combo_plate', 'socket_schuko', 'light_bulb'],
  },
  {
    id: 'panelboards',
    label: 'Panelboards & Circuit Breakers',
    children: [
      { id: 'pole1', label: '1 Pole', types: ['mcb_1p'] },
      { id: 'pole2', label: '2 Poles (Bolt-On & DIN)', types: ['mcb_2p', 'service_disconnect_2p'] },
      { id: 'pole3', label: '3 Poles', types: ['mcb_3p'] },
      { id: 'safety', label: 'RCD / Safety Breakers', types: ['rcd_2p', 'royu_safety_breaker_2p', 'spd_surge'] },
      { id: 'mounting', label: 'DIN Rails & Busbars', types: ['din_rail_track'] },
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
      { id: 'starters', label: 'Contactors & Overload Relays', types: ['contactor_3p', 'thermal_overload_relay', 'industrial_relay_dpdt'] },
      { id: 'operators', label: 'Push Buttons & Pilot Lights', types: ['push_button_station', 'push_button_fwd_rev', 'push_button_estop', 'pilot_light_indicator'] },
      { id: 'motors', label: 'Motors', types: ['motor_ac_industrial', 'motor_3phase_dol'] },
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
          : 'cursor-grab active:cursor-grabbing border-transparent hover:bg-white hover:border-rose-300 hover:shadow-md'
      }`}
      title={isLocked ? 'Stop simulation (■) to modify wiring' : 'Click or drag onto workbench canvas'}
    >
      <DeviceThumbnail type={item.type} className="w-12 h-12 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-stone-900 group-hover:text-rose-600 transition-colors truncate">
          {item.name}
        </div>
        <div className="text-[10px] text-stone-500 truncate">{item.description}</div>
        <span className="text-[9px] font-mono font-bold px-1.5 rounded bg-stone-200/80 text-stone-700">
          {item.terminals.length} terminals
        </span>
      </div>
      <div className="w-5 h-5 rounded-md bg-stone-100 group-hover:bg-rose-600 text-stone-500 group-hover:text-white flex items-center justify-center transition shrink-0">
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
          className={`w-full flex items-center justify-between gap-2 py-1.5 pr-2 rounded-lg hover:bg-stone-100/80 text-left transition ${
            depth === 0 ? 'pl-1.5 text-xs font-bold text-stone-800' : 'pl-1.5 text-[11px] font-semibold text-stone-700'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            )}
            <FolderIcon className={`w-4 h-4 shrink-0 ${depth === 0 ? 'text-amber-500' : 'text-amber-400'}`} />
            <span className="truncate">{node.label}</span>
          </span>
          <span className="text-[10px] font-mono text-stone-400 font-semibold shrink-0">{count}</span>
        </button>

        {!isCollapsed && (
          <div className="ml-3 pl-2 border-l border-stone-200 space-y-0.5">
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
    <aside className="absolute top-3 left-3 z-30 w-80 max-h-[calc(100%-36px)] rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-stone-200 flex flex-col overflow-hidden select-none text-stone-800">
      {/* Floating window title bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 bg-[#faf8f5]/90">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-900 uppercase tracking-wider font-mono">
          <Library className="w-3.5 h-3.5 text-rose-600" />
          Component Library
          <span className="text-stone-400 font-semibold normal-case">({total})</span>
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition"
          title="Hide library"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#ece6de] rounded-lg text-xs placeholder:text-stone-400 focus:outline-none focus:border-rose-500 shadow-sm"
          />
        </div>
      </div>

      {isLocked && (
        <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800">
          🔒 Grid energized — stop simulation (■) to add devices.
        </div>
      )}

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {tree.map((folder) => renderFolder(folder))}
        {total === 0 && (
          <div className="text-center text-xs text-stone-400 py-6">No devices match “{searchQuery}”.</div>
        )}
      </div>
    </aside>
  );
};
