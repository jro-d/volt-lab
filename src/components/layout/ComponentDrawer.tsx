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
    label: 'Residential Wiring Devices (PEC)',
    types: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'dimmer_switch', 'switch_3way', 'switch_4way', 'socket_duplex', 'modular_combo_plate', 'socket_schuko', 'gfci_receptacle', 'light_bulb'],
  },
  {
    id: 'panelboards',
    label: 'Panelboards & Circuit Breakers',
    children: [
      { id: 'pole1', label: '1 Pole', types: ['mcb_1p'] },
      { id: 'pole2', label: '2 Poles (Bolt-On & DIN)', types: ['mcb_2p', 'service_disconnect_2p', 'ats_changeover'] },
      { id: 'pole3', label: '3 Poles', types: ['mcb_3p', 'mccb_3p', 'mpcb_3p', 'rotary_isolator_3p'] },
      { id: 'fuses', label: 'Fuses & Fuse Switches', types: ['fuse_holder_1p', 'fuse_switch_disconnector_3p'] },
      { id: 'safety', label: 'RCD / Safety Breakers', types: ['rcd_2p', 'rcd_4p', 'rcbo_1pn', 'afdd_1pn', 'safety_breaker_2p', 'spd_surge'] },
      { id: 'relays', label: 'Protection Relays & Instrument Transformers', types: ['voltage_relay', 'earth_leakage_relay', 'core_balance_ct', 'ptc_relay', 'current_transformer', 'panel_ammeter', 'voltmeter_selector'] },
      { id: 'terminals', label: 'Terminal & Distribution Blocks', types: ['terminal_block', 'distribution_block'] },
      { id: 'mounting', label: 'Panelboards, DIN Rails & Meters', types: ['din_rail_track', 'panel_meter'] },
    ],
  },
  {
    id: 'conduits',
    label: 'Conduits, Utility & Junction Boxes',
    types: ['utility_box_surface_pvc', 'junction_box_octagonal_orange', 'junction_box_4way', 'splice_wire_nut', 'lever_connector_3p'],
  },
  {
    id: 'industrial',
    label: 'Marine & Industrial Motor Control',
    children: [
      { id: 'supply3p', label: '3-Phase Supply & Control Power', types: ['source_3phase_440v', 'control_transformer'] },
      { id: 'starters', label: 'Contactors, Timers & Overload Relays', types: ['contactor_3p', 'thermal_overload_relay', 'industrial_relay_dpdt', 'timer_relay', 'phase_monitor_relay'] },
      { id: 'operators', label: 'Push Buttons, Selectors & Pilot Lights', types: ['push_button_station', 'push_button_fwd_rev', 'push_button_estop', 'selector_hoa', 'limit_switch', 'float_switch', 'pressure_switch', 'pilot_light_indicator', 'buzzer_horn', 'beacon', 'tower_light'] },
      { id: 'motors', label: 'Motors & Drives (VFD)', types: ['motor_ac_industrial', 'motor_6lead_star_delta', 'pump_booster_3p', 'vfd_drive', 'motor_1p', 'capacitor_run'] },
    ],
  },
  { id: 'automation', label: 'PLC & Automation', types: ['plc_micro_controller', 'plc_24vdc_16io', 'psu_24vdc', 'sensor_inductive', 'sensor_capacitive', 'sensor_photoelectric'] },
  {
    id: 'service',
    label: 'Service Entrance & Grounding',
    types: ['kwh_meter_1p', 'kwh_meter_3p', 'generator_set_1p', 'generator_set_3p', 'earth_busbar', 'neutral_busbar', 'ground_pit'],
  },
  {
    id: 'power',
    label: 'Sources & Power Systems',
    children: [
      { id: 'standby', label: 'Standby, UPS & Solar', types: ['ups_battery', 'transfer_switch_manual', 'pv_string', 'dc_isolator', 'inverter_gridtie', 'net_meter'] },
      { id: 'transformers', label: 'Transformers & Power Factor', types: ['transformer_1p_pole', 'transformer_3p_delta_wye', 'capacitor_bank_3p', 'pf_controller'] },
      { id: 'marine_power', label: 'Marine Switchboard & Paralleling', types: ['shore_connection_box', 'ground_detection_lamps', 'synchroscope', 'reverse_power_relay', 'preferential_trip_relay'] },
    ],
  },
  {
    id: 'control_timing',
    label: 'Control & Timing Modules',
    children: [
      { id: 'timers', label: 'Timers, Counters & Latching', types: ['star_delta_timer', 'counter_relay', 'impulse_relay', 'staircase_timer', 'time_switch_24h', 'alternating_relay', 'ssr_1p'] },
      { id: 'operators', label: 'Operators & Contact Blocks', types: ['operator_pilot', 'aux_contact_block', 'mechanical_interlock'] },
      { id: 'safety', label: 'Safety Devices', types: ['safety_relay', 'two_hand_station', 'door_interlock_switch', 'pull_cord_switch'] },
    ],
  },
  {
    id: 'field_sensors',
    label: 'Sensors & Field Devices',
    children: [
      { id: 'process_sensors', label: 'Level, Temperature, Flow & Speed', types: ['electrode_level_relay', 'thermostat', 'thermocouple_k', 'temp_controller', 'flow_switch', 'zero_speed_switch', 'solenoid_valve'] },
      { id: 'presence_sensors', label: 'Position, Light & Presence', types: ['reed_switch', 'photocell_switch', 'pir_sensor'] },
      { id: 'fire_alarm', label: 'Fire Alarm', types: ['smoke_detector', 'manual_call_point', 'fire_alarm_panel'] },
    ],
  },
  {
    id: 'drives_starters',
    label: 'Starters, Motors & Drives',
    children: [
      { id: 'starters', label: 'Soft & Reduced-Voltage Starters', types: ['soft_starter', 'starter_reduced_voltage'] },
      { id: 'special_motors', label: 'Special Motors & Braking', types: ['motor_dahlander', 'motor_wound_rotor', 'rotor_resistor_bank', 'motor_dc_shunt', 'motor_brake', 'dc_injection_brake'] },
      { id: 'vfd_accessories', label: 'VFD Accessories', types: ['speed_potentiometer', 'braking_resistor', 'line_reactor'] },
      { id: 'driven_loads', label: 'Pumps, Compressor & Hoist', types: ['pump_submersible_3p', 'air_compressor_3p', 'hoist_conveyor'] },
    ],
  },
  {
    id: 'appliances',
    label: 'Appliances & Loads',
    types: ['appliance_tv', 'appliance_water_heater', 'appliance_fan', 'appliance_ac', 'pump_booster_1p'],
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
        e.dataTransfer.setData('application/wirewise-device', item.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onAddComponent(item.type)}
      className={`group flex items-center gap-2.5 p-1.5 rounded-md border transition ${
        isLocked
          ? 'opacity-50 cursor-not-allowed border-transparent'
          : 'cursor-grab active:cursor-grabbing border-transparent bg-surface hover:bg-surface-hover hover:border-border'
      }`}
      title={isLocked ? 'Stop simulation (■) to modify wiring' : 'Click or drag onto workbench canvas'}
    >
      <div className="w-12 h-12 shrink-0 rounded-md bg-surface-sunken border border-border-strong/80 flex items-center justify-center overflow-hidden p-0.5">
        <DeviceThumbnail type={item.type} className="w-11 h-11" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-ink transition-colors truncate">
          {item.name}
        </div>
        <div className="text-[10px] text-ink-muted truncate">{item.description}</div>
        <span className="inline-block mt-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-ink">
          {item.terminals.length} terminals
        </span>
      </div>
      <div className="w-5 h-5 rounded-md bg-surface-sunken border border-border-strong group-hover:bg-probe group-hover:border-probe text-ink group-hover:text-on-probe flex items-center justify-center transition shrink-0">
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
          className={`w-full flex items-center justify-between gap-2 py-1.5 pr-2 rounded-lg hover:bg-surface-hover text-left transition ${
            depth === 0 ? 'pl-1.5 text-xs font-bold text-ink' : 'pl-1.5 text-[11px] font-semibold text-ink'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            )}
            <FolderIcon className={`w-4 h-4 shrink-0 ${depth === 0 ? 'text-warning' : 'text-warning'}`} />
            <span className="truncate">{node.label}</span>
          </span>
          <span className="text-[10px] font-mono text-ink bg-surface-sunken border border-border px-1.5 rounded font-semibold shrink-0">{count}</span>
        </button>

        {!isCollapsed && (
          <div className="ml-3 pl-2 border-l border-border/80 space-y-1">
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
    <aside className="wirewise-panel wirewise-scroll-dark absolute top-3 left-3 z-30 w-80 max-h-[calc(100%-36px)] rounded-lg bg-surface backdrop-blur-md shadow-2 border-2 border-border-strong/90 ring-1 ring-white/10 flex flex-col overflow-hidden select-none text-ink">
      {/* Floating window title bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-surface-sunken">
        <span className="flex items-center gap-2 text-[11px] font-bold text-ink uppercase tracking-wider font-mono">
          
          <Library className="w-3.5 h-3.5 text-ink-muted" />
          Component Library
          <span className="text-ink bg-surface-sunken border border-border-strong px-1.5 py-0.5 rounded text-[10px] font-semibold normal-case">{total}</span>
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-ink hover:text-ink hover:bg-surface-hover transition"
          title="Hide library"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-2 border-b border-border bg-surface">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search library (MCB, RCD, PLC...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-probe shadow-inner"
          />
        </div>
      </div>

      {isLocked && (
        <div className="mx-3 mt-2 mb-1 px-2.5 py-1.5 rounded-lg bg-warning-soft/80 border border-warning/60 text-[10px] font-semibold text-warning">
          🔒 Grid energized — stop simulation (■) to add devices.
        </div>
      )}

      {/* Folder tree */}
      <div className="wirewise-scroll-dark flex-1 overflow-y-auto px-2 py-2 pb-3 space-y-1">
        {tree.map((folder) => renderFolder(folder))}
        {total === 0 && (
          <div className="text-center text-xs text-ink-muted py-6">No devices match “{searchQuery}”.</div>
        )}
      </div>
    </aside>
  );
};
