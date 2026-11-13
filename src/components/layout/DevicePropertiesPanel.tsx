import React from 'react';
import { ElectricalDevice, ElectricalWire, CodeStandard } from '../../types/electrical';
import { getWireStandards, COLOR_STANDARDS } from '../../data/standardsData';
import { 
  Sliders, 
  ShieldCheck, 
  Zap, 
  Trash2, 
  X,
  Gauge,
  RotateCcw,
  RotateCw,
  Copy
} from 'lucide-react';

interface DevicePropertiesPanelProps {
  device: ElectricalDevice | null;
  wire: ElectricalWire | null;
  standard: CodeStandard;
  onUpdateDeviceProperty: (deviceId: string, key: string, value: any) => void;
  onUpdateWireProperty: (wireId: string, updates: Partial<ElectricalWire>) => void;
  onDeleteSelected: () => void;
  onClose: () => void;
  onRotateDevice?: (device: ElectricalDevice) => void;
  onDuplicateDevice?: (device: ElectricalDevice) => void;
  /** Shift the panel right so it doesn't overlap the floating component library */
  isLibraryOpen?: boolean;
  /** Live state patch (momentary push buttons, TOR test/reset, cutaway toggle) */
  onPatchDeviceState?: (deviceId: string, patch: Record<string, any>) => void;
  devices?: ElectricalDevice[];
  onRequestRewire?: (wireId: string, moveEnd: 'from' | 'to') => void;
  onDisconnectWire?: (wireId: string) => void;
}

/** Hold-to-press helper for momentary push buttons in the inspector */
const holdProps = (
  deviceId: string,
  key: string,
  onPatch?: (deviceId: string, patch: Record<string, any>) => void
) =>
  onPatch
    ? {
        onMouseDown: () => onPatch(deviceId, { [key]: true }),
        onMouseUp: () => onPatch(deviceId, { [key]: false }),
        onMouseLeave: () => onPatch(deviceId, { [key]: false }),
      }
    : {};

export const DevicePropertiesPanel: React.FC<DevicePropertiesPanelProps> = ({
  device,
  wire,
  standard,
  onUpdateDeviceProperty,
  onUpdateWireProperty,
  onDeleteSelected,
  onClose,
  onRotateDevice,
  onDuplicateDevice,
  isLibraryOpen = false,
  onPatchDeviceState,
  devices = [],
  onRequestRewire,
  onDisconnectWire,
}) => {
  const patchState = (key: string, value: any) =>
    device && (onPatchDeviceState ? onPatchDeviceState(device.id, { [key]: value }) : onUpdateDeviceProperty(device.id, key, value));
  if (!device && !wire) return null;

  const wireStandards = getWireStandards(standard);
  const colors = COLOR_STANDARDS[standard];

  const standardBreakerAmps = [6, 10, 15, 16, 20, 25, 30, 32, 40, 50, 63, 80, 100];
  const rcdSensitivities = [10, 30, 100, 300];

  return (
    <div className={`absolute top-4 ${isLibraryOpen ? 'left-[340px]' : 'left-4'} z-20 w-80 voltlab-panel voltlab-scroll-dark bg-[#0f172a]/[0.97] border-2 border-slate-600/90 ring-1 ring-white/10 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.45)] backdrop-blur-md p-4 text-slate-100 max-h-[calc(100%-36px)] overflow-y-auto select-none animate-in fade-in slide-in-from-top-2 duration-150`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-300">
            {device ? <Sliders className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest block">
              {device ? 'DEVICE INSPECTOR' : 'CONDUCTOR INSPECTOR'}
            </span>
            <div className="text-xs font-bold text-slate-100 truncate max-w-[170px]">
              {device ? device.name : `Wire: ${wire?.wireGauge}`}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── MANUFACTURER DATASHEET CARD ── */}
      {device && (
        <div className="mb-3.5 p-2.5 rounded-xl bg-[#172235] border border-slate-700 text-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-700">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${
                device.brand === 'ROYU'
                  ? 'bg-blue-600 text-white'
                  : device.brand === 'Schneider'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-600 text-white'
              }`}>
                {device.brand || 'ROYU'}
              </span>
              <span className="text-[11px] font-bold font-mono text-slate-100">
                {device.modelNumber || (device.type.includes('mcb') ? 'ROYU RCB220' : device.type.includes('combo') ? 'ROYU RWS103' : 'GENERIC-SPEC')}
              </span>
            </div>
            {device.kaRating && (
              <span className="text-[10px] font-mono font-black text-rose-200 bg-rose-950/90 border border-rose-500/60 px-1.5 py-0.5 rounded">
                {device.kaRating} kAIC
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div>
              <span className="text-slate-400 block font-medium">Mounting:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {device.mountingType ? device.mountingType.replace('_', ' ') : 'Flush Utility Box'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Reference Code:</span>
              <span className="font-mono font-semibold text-slate-200">
                {device.pecReference || 'PEC 2017'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- CIRCUIT BREAKER PROPERTIES --- */}
      {device && (device.type.includes('mcb') || device.type.includes('service_disconnect')) && (
        <div className="space-y-3">
          {/* ROYU / IEC Breaker Profile Form Factor */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Breaker Profile & Mounting
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'royu_bolt_on', label: 'ROYU Bolt-On', sub: '10kA 240V' },
                { id: 'royu_din_rail', label: 'ROYU DIN-Rail', sub: '6kA 240V' },
                { id: 'generic_iec', label: 'Generic IEC', sub: '6kA DIN' },
              ].map(prof => {
                const active = (device.state.breakerProfile || (device.state.mccbStyle === 'industrial_black' ? 'royu_bolt_on' : 'royu_din_rail')) === prof.id;
                return (
                  <button
                    key={prof.id}
                    onClick={() => {
                      onUpdateDeviceProperty(device.id, 'breakerProfile', prof.id);
                      onUpdateDeviceProperty(device.id, 'mccbStyle', prof.id === 'royu_bolt_on' ? 'industrial_black' : 'din_rail');
                      if (prof.id === 'royu_bolt_on') {
                        onUpdateDeviceProperty(device.id, 'brand', 'ROYU');
                        onUpdateDeviceProperty(device.id, 'kaRating', 10);
                        onUpdateDeviceProperty(device.id, 'mountingType', 'bolt_on');
                        onUpdateDeviceProperty(device.id, 'modelNumber', device.type === 'mcb_2p' ? 'ROYU RCB220' : 'ROYU RCB120');
                      } else if (prof.id === 'royu_din_rail') {
                        onUpdateDeviceProperty(device.id, 'brand', 'ROYU');
                        onUpdateDeviceProperty(device.id, 'kaRating', 6);
                        onUpdateDeviceProperty(device.id, 'mountingType', 'din_rail');
                        onUpdateDeviceProperty(device.id, 'modelNumber', device.type === 'mcb_2p' ? 'ROYU RDM220' : 'ROYU RDM120');
                      } else {
                        onUpdateDeviceProperty(device.id, 'brand', 'Generic');
                        onUpdateDeviceProperty(device.id, 'kaRating', 6);
                        onUpdateDeviceProperty(device.id, 'mountingType', 'din_rail');
                      }
                    }}
                    className={`py-1 px-1 text-center rounded-lg border transition ${
                      active
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold leading-tight">{prof.label}</div>
                    <div className={`text-[8px] ${active ? 'text-rose-100' : 'text-slate-400'}`}>{prof.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Ampere Rating Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                Rated Ampere Capacity (In)
              </label>
              <span className="text-xs font-mono font-black text-rose-200 px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/60">
                {device.state.ratedAmps || 16} A
              </span>
            </div>

            {/* Quick Ampere Buttons Grid */}
            <div className="grid grid-cols-4 gap-1">
              {standardBreakerAmps.slice(0, 8).map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    device.state.ratedAmps === amps
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>

            {/* High Rating Row */}
            <div className="grid grid-cols-4 gap-1 mt-1">
              {standardBreakerAmps.slice(8).map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    device.state.ratedAmps === amps
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              PEC 240.4 & IEC 60898 standard DIN breaker frame ratings.
            </span>
          </div>

          {/* Trip Curve Selector (Type B, C, D) */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Magnetic Trip Characteristic Curve
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 border border-slate-700 p-1 rounded-lg text-xs font-bold font-mono">
              {(['B', 'C', 'D'] as const).map((curve) => (
                <button
                  key={curve}
                  onClick={() => onUpdateDeviceProperty(device.id, 'tripCurve', curve)}
                  className={`py-1 rounded-md transition ${
                    (device.state.tripCurve || 'C') === curve
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Type {curve}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
              {(device.state.tripCurve || 'C') === 'B' && 'Type B: 3–5x In (Lighting & non-inductive resistive loads)'}
              {(device.state.tripCurve || 'C') === 'C' && 'Type C: 5–10x In (General socket outlets, appliances & small motors)'}
              {(device.state.tripCurve || 'C') === 'D' && 'Type D: 10–20x In (High inrush motors & industrial transformers)'}
            </div>
          </div>
        </div>
      )}

      {/* --- RCD / ELCB PROPERTIES --- */}
      {device && device.type === 'rcd_2p' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Rated Frame Ampacity
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[25, 40, 63].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 40) === amps
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Earth Leakage Sensitivity (IΔn)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {rcdSensitivities.map((sens) => (
                <button
                  key={sens}
                  onClick={() => onUpdateDeviceProperty(device.id, 'sensitivityMa', sens)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.sensitivityMa || 30) === sens
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {sens}mA
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              30mA is mandatory for personnel shock protection (PEC 2.10.1.8 / IEC 60364-4-41).
            </span>
          </div>
        </div>
      )}

      {/* --- ROYU ENCLOSED SAFETY BREAKER (ACU DISCONNECT) --- */}
      {device && device.type === 'royu_safety_breaker_2p' && (
        <div className="space-y-3">
          {/* Front Enclosure Cover Toggle */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              NEMA 1 Enclosure Cover
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'enclosureCoverOpen', false)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  !device.state.enclosureCoverOpen
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                🔒 Closed (Front Face)
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'enclosureCoverOpen', true)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.enclosureCoverOpen
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                🔓 Open (Inspect Lugs)
              </button>
            </div>
          </div>

          {/* Ampere Rating */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Safety Breaker Rating (In)
              </label>
              <span className="text-xs font-mono font-bold text-rose-400">{device.state.ratedAmps || 30}A</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[15, 20, 30, 40].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 30) === amps
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              PEC 4.40.2.1: Disconnecting means must be within sight from air-conditioning equipment.
            </span>
          </div>
        </div>
      )}

      {/* --- ROYU WIDE-SERIES MODULAR COMBO STRAP --- */}
      {device && device.type === 'royu_modular_combo_plate' && (
        <div className="space-y-3">
          {/* Front / Rear View Toggle */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Plate View Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'front')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.viewMode !== 'rear'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                Front Faceplate
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'rear')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.viewMode === 'rear'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                🔄 Rear Wiring Strap
              </button>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              Flip to Rear View to wire common jumpers between SW, Pilot, and Outlet!
            </span>
          </div>

          {/* Slot 2 Module Option */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Slot 2 Modular Insert
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'comboSlot2', 'pilot')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.comboSlot2 !== 'switch2'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                🔴 Neon Pilot Lamp
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'comboSlot2', 'switch2')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.comboSlot2 === 'switch2'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                ⚡ 2nd 1-Way Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- UTILITY BOX PROPERTIES --- */}
      {device && device.type === 'utility_box_surface_pvc' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Box Material & Finish
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'orange_pvc')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.boxMaterial !== 'galvanized_steel'
                    ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                🟧 PVC Safety Orange
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'galvanized_steel')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.boxMaterial === 'galvanized_steel'
                    ? 'bg-slate-600 text-white border-slate-500 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                ⬜ Galvanized Steel (GI)
              </button>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              PEC 3.14.2.2: Standard 2"×4" utility box volume 230 cm³ (14.0 in³). Max 7× 2.0mm² conductors.
            </span>
          </div>
        </div>
      )}

      {/* --- DIN RAIL TRACK PROPERTIES --- */}
      {device && device.type === 'din_rail_track' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              DIN Rail Length
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { w: 160, label: '160 mm' },
                { w: 260, label: '260 mm' },
                { w: 380, label: '380 mm' },
              ].map(opt => (
                <button
                  key={opt.w}
                  onClick={() => {
                    onUpdateDeviceProperty(device.id, 'trackWidth', opt.w);
                    onUpdateDeviceProperty(device.id, 'width', opt.w);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    (device.state.trackWidth || device.width) === opt.w
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              Mounts standard 35mm modular MCBs, RCDs, and industrial terminals per IEC 60715.
            </span>
          </div>
        </div>
      )}

      {/* --- LIGHT FIXTURE PROPERTIES --- */}
      {device && device.type === 'light_bulb' && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Lamp Wattage
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[15, 40, 60, 100].map((w) => (
              <button
                key={w}
                onClick={() => onUpdateDeviceProperty(device.id, 'wattage', w)}
                className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                  (device.state.wattage || 60) === w
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700'
                }`}
              >
                {w}W
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- WATER HEATER PROPERTIES --- */}
      {device && device.type === 'appliance_water_heater' && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Heating Element Wattage
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[2500, 3500, 4500].map((w) => (
              <button
                key={w}
                onClick={() => onUpdateDeviceProperty(device.id, 'wattage', w)}
                className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                  (device.state.wattage || 3500) === w
                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700'
                }`}
              >
                {(w / 1000).toFixed(1)} kW
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- ELECTRIC FAN PROPERTIES --- */}
      {device && device.type === 'appliance_fan' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Fan Speed & Power Level
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { speed: 1, label: 'Speed 1 (40W)', watts: 40 },
                { speed: 2, label: 'Speed 2 (65W)', watts: 65 },
                { speed: 3, label: 'Speed 3 (85W)', watts: 85 },
              ].map((sp) => (
                <button
                  key={sp.speed}
                  onClick={() => {
                    onUpdateDeviceProperty(device.id, 'speed', sp.speed);
                    onUpdateDeviceProperty(device.id, 'wattage', sp.watts);
                  }}
                  className={`py-1.5 px-1 text-xs font-mono font-bold rounded-lg border transition text-center ${
                    (device.state.speed || 2) === sp.speed
                      ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-sky-950/80 p-2 rounded-lg border border-sky-500/50 text-sky-200">
            🌀 Aerodynamic blades spin automatically when circuit loop is closed and powered.
          </div>
        </div>
      )}

      {/* --- AIR CONDITIONER PROPERTIES --- */}
      {device && device.type === 'appliance_ac' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Set Temperature Display
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[16, 18, 20, 22, 24].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onUpdateDeviceProperty(device.id, 'setTemp', deg)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.setTemp || 16) === deg
                      ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {deg}°C
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Inverter Compressor Capacity
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '1.0 HP (850W)', watts: 850 },
                { label: '1.5 HP (1200W)', watts: 1200 },
                { label: '2.0 HP (1800W)', watts: 1800 },
              ].map((hp) => (
                <button
                  key={hp.watts}
                  onClick={() => onUpdateDeviceProperty(device.id, 'wattage', hp.watts)}
                  className={`py-1 text-[11px] font-mono font-bold rounded-lg border transition ${
                    (device.state.wattage || 1200) === hp.watts
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {hp.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- DUPLEX CONVENIENCE OUTLET PROPERTIES (PHILIPPINE WIDE SERIES) --- */}
      {device && (device.type === 'socket_duplex' || device.type === 'socket_schuko') && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Perspective Inspection View
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'front')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.viewMode !== 'rear'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>👁️ Front Plate</span>
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'rear')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.viewMode === 'rear'
                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>🔧 Rear Modules</span>
              </button>
            </div>
          </div>

          {/* Educational Callout on Terminal Polarity */}
          <div className="p-2.5 rounded-xl bg-amber-950/75 border border-amber-500/60 text-amber-100 text-[11px] space-y-1">
            <div className="font-bold text-amber-200 flex items-center gap-1">
              <span>🇵🇭 PEC Terminal Polarity:</span>
            </div>
            <p className="text-[10px] text-amber-200 leading-tight">
              • <strong>Brass Screws (Bottom)</strong>: Line 1 & Line 2 (Hot)<br/>
              • <strong>Silver Screws (Top)</strong>: Neutral 1 & Neutral 2<br/>
              • <strong>Green Screw (Center)</strong>: Equipment Ground (PE)<br/>
              • <strong>Red/Black Jumpers</strong>: Connects Gang 1 to Gang 2
            </p>
          </div>
        </div>
      )}

      {/* --- JUNCTION BOX PROPERTIES --- */}
      {device && (device.type.includes('junction_box')) && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Enclosure Material & Standard
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'orange_pvc')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc'
                    ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>🟠 Orange PVC</span>
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'galvanized_steel')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.boxMaterial === 'galvanized_steel' && device.type !== 'junction_box_octagonal_orange'
                    ? 'bg-slate-600 text-white border-slate-500 shadow-sm'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>⚙️ Metal Steel</span>
              </button>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              Philippine residential installations widely use 4" orange PVC octagonal boxes for conduit drops.
            </span>
          </div>
        </div>
      )}

      {/* --- 2P BREAKER HOUSING STYLE --- */}
      {device && device.type === 'mcb_2p' && (
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-700/80">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Breaker Housing Form Factor
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'mccbStyle', 'industrial_black')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.mccbStyle === 'industrial_black'
                  ? 'bg-slate-700 text-white border-sky-400 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <span>⚡ Industrial Black</span>
            </button>
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'mccbStyle', 'din_rail')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.mccbStyle !== 'industrial_black'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <span>⚪ DIN-Rail Module</span>
            </button>
          </div>
        </div>
      )}

      {/* --- PUSH BUTTON STATION CONTROLS --- */}
      {device && device.type === 'push_button_station' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Station Actuators (Click or Press)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              {...holdProps(device.id, 'startPressed', onPatchDeviceState)}
              onClick={() => !onPatchDeviceState && onUpdateDeviceProperty(device.id, 'startPressed', !device.state.startPressed)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                device.state.startPressed
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                  : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border-emerald-500/60'
              }`}
            >
              <span className="text-base font-black">I</span>
              <span className="text-[10px] uppercase">{device.state.startPressed ? 'Pressed (NO Closed)' : 'Start (NO Open)'}</span>
            </button>
            <button
              {...holdProps(device.id, 'stopPressed', onPatchDeviceState)}
              onClick={() => !onPatchDeviceState && onUpdateDeviceProperty(device.id, 'stopPressed', !device.state.stopPressed)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                device.state.stopPressed
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                  : 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border-rose-500/60'
              }`}
            >
              <span className="text-base font-black">O</span>
              <span className="text-[10px] uppercase">{device.state.stopPressed ? 'Depressed (NC Open)' : 'Stop (NC Closed)'}</span>
            </button>
          </div>
          <span className="text-[9px] text-slate-400 block">
            Hold to press — both are momentary (spring return). START 3-4 is NO, STOP 1-2 is NC.
          </span>
        </div>
      )}

      {/* --- EMERGENCY STOP CONTROLS --- */}
      {device && device.type === 'push_button_estop' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Safety Mushroom Actuator
          </label>
          <button
            onClick={() => onUpdateDeviceProperty(device.id, 'latched', !device.state.latched)}
            className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition ${
              device.state.latched
                ? 'bg-rose-600 text-white border-rose-700 shadow-md animate-pulse'
                : 'bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border-amber-500/60'
            }`}
          >
            <span>{device.state.latched ? '🛑 E-STOP LATCHED (Contacts Open)' : '✅ E-STOP ARMED (Contacts Closed)'}</span>
          </button>
          <span className="text-[9px] text-slate-400 block">
            Click to slam or twist-to-release. Latched state forcefully opens NC safety contacts.
          </span>
        </div>
      )}

      {/* --- PILOT LIGHT INDICATOR CONTROLS --- */}
      {device && device.type === 'pilot_light_indicator' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Lens Color
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${device.state.lit ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
              {device.state.lit ? '● ILLUMINATED' : '○ OFF'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'green', label: 'Green', color: '#22c55e', bg: 'bg-emerald-500' },
              { id: 'red', label: 'Red', color: '#ef4444', bg: 'bg-rose-500' },
              { id: 'amber', label: 'Amber', color: '#f59e0b', bg: 'bg-amber-500' },
              { id: 'blue', label: 'Blue', color: '#3b82f6', bg: 'bg-blue-500' },
            ].map((col) => (
              <button
                key={col.id}
                onClick={() => onUpdateDeviceProperty(device.id, 'pilotColor', col.id)}
                className={`py-1.5 px-1 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition ${
                  (device.state.pilotColor || 'green') === col.id
                    ? 'ring-2 ring-sky-400 border-sky-400 shadow-sm'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${col.bg}`}></span>
                <span className="text-[10px]">{col.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- 3-POLE MOTOR CONTACTOR CONTROLS --- */}
      {device && device.type === 'contactor_3p' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Coil Status (A1-A2)
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.coilEnergized ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
              {device.state.coilEnergized ? '⚡ ENERGIZED (PULLED IN)' : '○ DE-ENERGIZED'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Rated Motor Current (AC-3)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[9, 18, 25, 32].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 18) === amps
                      ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            {[
              { k: 'Main 1-2 / 3-4 / 5-6', on: !!device.state.coilEnergized || !!device.state.manualOverride, no: true },
              { k: 'Aux NO 13-14', on: !!device.state.coilEnergized || !!device.state.manualOverride, no: true },
              { k: 'Aux NC 21-22', on: !(device.state.coilEnergized || device.state.manualOverride), no: false },
              { k: 'Line current', on: (device.state.measuredAmps || 0) > 0, no: true, val: `${(device.state.measuredAmps || 0).toFixed(2)} A` },
            ].map((c) => (
              <div key={c.k} className={`rounded-lg border px-2 py-1 ${c.on ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200' : 'bg-slate-900/80 border-slate-700 text-slate-400'}`}>
                <div className="font-bold">{c.k}</div>
                <div>{c.val ?? (c.on ? 'CLOSED' : 'OPEN')}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tag</label>
              <input
                value={device.state.tag || ''}
                onChange={(e) => onUpdateDeviceProperty(device.id, 'tag', e.target.value.toUpperCase().slice(0, 6))}
                className="w-full h-7 px-2 text-xs font-mono font-bold rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Role</label>
              <select
                value={device.state.role || ''}
                onChange={(e) => onUpdateDeviceProperty(device.id, 'role', e.target.value || undefined)}
                className="w-full h-7 px-1.5 text-xs font-mono font-bold rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
              >
                <option value="">— (DOL)</option>
                <option value="FOR">FOR (forward)</option>
                <option value="REV">REV (reverse)</option>
                <option value="RUN">RUN</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => patchState('viewMode', device.state.viewMode === 'cutaway' ? 'front' : 'cutaway')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.viewMode === 'cutaway'
                  ? 'bg-sky-600 text-white border-sky-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
              }`}
              title="Reveal the coil, armature, return spring and moving contact bridges"
            >
              🔍 {device.state.viewMode === 'cutaway' ? 'Cutaway ON' : 'Cutaway'}
            </button>
            <button
              onClick={() => patchState('manualOverride', !device.state.manualOverride)}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.manualOverride
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
              }`}
            >
              {device.state.manualOverride ? 'Plunger Forced IN' : 'Test Plunger'}
            </button>
          </div>
          <span className="text-[9px] text-slate-400 block">
            Coil OFF: return spring holds NC 21-22 closed. Coil ON: armature pulls in — main poles &amp; NO 13-14 close and NC 21-22 opens.
          </span>
        </div>
      )}

      {/* --- THERMAL OVERLOAD RELAY (TOR) --- */}
      {device && device.type === 'thermal_overload_relay' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relay Status</label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.tripped ? 'bg-orange-950/90 text-orange-300 border border-orange-500/50 animate-pulse' : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'}`}>
              {device.state.tripped ? '⚠ TRIPPED (95-96 OPEN)' : '● READY (95-96 CLOSED)'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ampere Dial Setting (Ir)
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[4, 5, 6, 7, 8, 10].map((a) => (
                <button
                  key={a}
                  onClick={() => patchState('tripAmps', a)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.tripAmps || 6) === a ? 'bg-sky-700 text-white border-sky-800 shadow-sm' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {a}A
                </button>
              ))}
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all ${((device.state.measuredAmps || 0) / (device.state.tripAmps || 6)) > 1 ? 'bg-rose-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, ((device.state.measuredAmps || 0) / (device.state.tripAmps || 6)) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block font-mono">
              Thermal image: {(device.state.measuredAmps || 0).toFixed(2)}A of {device.state.tripAmps || 6}A setting. Set Ir to the motor nameplate FLA.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => patchState('tripped', true)}
              disabled={!!device.state.tripped}
              className="py-2 text-xs font-black rounded-xl border bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border-rose-500/60 disabled:opacity-50"
            >
              TEST (Trip)
            </button>
            <button
              onClick={() => onPatchDeviceState ? onPatchDeviceState(device.id, { tripped: false, tripReason: undefined }) : onUpdateDeviceProperty(device.id, 'tripped', false)}
              disabled={!device.state.tripped}
              className="py-2 text-xs font-black rounded-xl border bg-blue-600 hover:bg-blue-700 text-white border-blue-700 disabled:opacity-40"
            >
              R · RESET
            </button>
          </div>
          <span className="text-[9px] text-slate-400 block">
            95-96 NC is wired in series with the coil circuit; 97-98 NO lights a fault pilot lamp when tripped.
          </span>
        </div>
      )}

      {/* --- CONTROL TRANSFORMER --- */}
      {device && device.type === 'control_transformer' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secondary (X1-X2)</label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.secondaryLive ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
              {device.state.secondaryLive ? `● ${device.state.secondaryVolts || 220}V LIVE` : '○ DE-ENERGIZED'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { k: 'Primary', v: `${device.state.primaryVolts || 440}V` },
              { k: 'Secondary', v: `${device.state.secondaryVolts || 220}V` },
              { k: 'Ratio', v: `${((device.state.primaryVolts || 440) / (device.state.secondaryVolts || 220)).toFixed(1)}:1` },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-slate-700 bg-slate-900 text-slate-100 py-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase">{c.k}</div>
                <div className="text-xs font-mono font-black text-slate-100">{c.v}</div>
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">VA Rating</label>
            <div className="grid grid-cols-4 gap-1">
              {[100, 250, 500, 1000].map((va) => (
                <button
                  key={va}
                  onClick={() => onUpdateDeviceProperty(device.id, 'vaRating', va)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.vaRating || 250) === va ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {va}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[9px] text-slate-400 block">
            Connect H1-H2 across two phases (e.g. L1-L2 at 440V). X1 becomes the 220V control hot rail, X2 the control return.
          </span>
        </div>
      )}

      {/* --- 3-PHASE 440V FEEDER --- */}
      {device && device.type === 'source_3phase_440v' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <button
            onClick={() => patchState('closed', device.state.closed === false)}
            className={`w-full py-2 text-xs font-black rounded-xl border transition ${
              device.state.closed !== false ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {device.state.closed !== false ? '● MAIN ISOLATOR ON — L1 / L2 / L3 LIVE' : '○ MAIN ISOLATOR OFF'}
          </button>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { k: 'L1', c: 'bg-red-600' },
              { k: 'L2', c: 'bg-yellow-400' },
              { k: 'L3', c: 'bg-blue-600' },
            ].map((ph) => (
              <div key={ph.k} className="rounded-lg border border-slate-700 bg-slate-900 text-slate-100 py-1 flex items-center justify-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${ph.c}`} />
                <span className="text-xs font-mono font-black">{ph.k}</span>
                <span className="text-[9px] font-mono text-slate-400">{Math.round((device.state.lineVoltage || 440) / Math.sqrt(3))}V</span>
              </div>
            ))}
          </div>
          <span className="text-[9px] text-slate-400 block font-mono">
            {device.state.lineVoltage || 440}V line-to-line · {device.state.frequency || 60}Hz · sequence L1→L2→L3 (CW).
          </span>
        </div>
      )}

      {/* --- FORWARD / REVERSE / STOP STATION --- */}
      {device && device.type === 'push_button_fwd_rev' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Momentary Operators (hold to press)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'stopPressed', label: 'STOP', sub: 'NC 1-2', on: 'bg-rose-600 text-white border-rose-700', off: 'bg-rose-950/80 text-rose-200 border-rose-500/60' },
              { key: 'fwdPressed', label: 'FWD ▶', sub: 'NO 3-4', on: 'bg-emerald-600 text-white border-emerald-700', off: 'bg-emerald-950/80 text-emerald-200 border-emerald-500/60' },
              { key: 'revPressed', label: '◀ REV', sub: 'NO 5-6', on: 'bg-amber-500 text-white border-amber-600', off: 'bg-amber-950/80 text-amber-200 border-amber-500/60' },
            ].map((b) => (
              <button
                key={b.key}
                {...holdProps(device.id, b.key, onPatchDeviceState)}
                onClick={() => !onPatchDeviceState && onUpdateDeviceProperty(device.id, b.key, !device.state[b.key])}
                className={`py-2 rounded-xl border text-xs font-black flex flex-col items-center transition ${device.state[b.key] ? b.on : b.off}`}
              >
                {b.label}
                <span className="text-[9px] font-mono font-bold opacity-80">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- INDUSTRIAL AC INDUCTION MOTOR CONTROLS --- */}
      {device && (device.type === 'motor_ac_industrial' || device.type === 'motor_6lead_star_delta') && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Motor Status
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.motorFault ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50 animate-pulse' : device.state.running ? (device.state.starterMode === 'wye' ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50 animate-pulse' : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 animate-pulse') : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
              {device.state.motorFault
                ? `⚠ ${device.state.motorFault}`
                : device.state.running
                ? device.type === 'motor_6lead_star_delta'
                  ? device.state.starterMode === 'wye'
                    ? '★ WYE START (1/3 I)'
                    : device.state.starterMode === 'delta'
                    ? '▲ DELTA RUN (100%)'
                    : `⚡ ${device.state.motorDirection === 'CCW' ? '⟲ CCW' : '⟳ CW'}`
                  : `⚡ ${device.state.motorDirection === 'CCW' ? '⟲ CCW REVERSE' : '⟳ CW FORWARD'}`
                : '○ STOPPED'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Nameplate Power Rating
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(device.type === 'motor_6lead_star_delta'
                ? [
                    { hp: 5, w: 3700, label: '5 HP' },
                    { hp: 7.5, w: 5500, label: '7.5 HP' },
                    { hp: 10, w: 7500, label: '10 HP' },
                    { hp: 15, w: 11000, label: '15 HP' },
                  ]
                : [
                    { hp: 1, w: 750, label: '1 HP' },
                    { hp: 2, w: 1500, label: '2 HP' },
                    { hp: 3, w: 2200, label: '3 HP' },
                    { hp: 5, w: 3700, label: '5 HP' },
                  ]
              ).map((m) => (
                <button
                  key={m.hp}
                  onClick={() => {
                    onUpdateDeviceProperty(device.id, 'wattage', m.w);
                    onUpdateDeviceProperty(device.id, 'motorHp', m.hp);
                  }}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.wattage || (device.type === 'motor_6lead_star_delta' ? 5500 : 2200)) === m.w
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block font-mono">
              {device.type === 'motor_6lead_star_delta'
                ? `Rated: ${(device.state.wattage || 5500)} W · 6-Lead Y/Δ · line current ${(device.state.measuredAmps || 0).toFixed(2)} A. Star reduces starting current to 33%.`
                : `Rated: ${(device.state.wattage || 2200)} W · 440V 3-phase TEFC · line current ${(device.state.measuredAmps || 0).toFixed(2)} A. Swap any two of U1/V1/W1 to reverse rotation.`}
            </span>
          </div>
        </div>
      )}

      {/* --- MICRO PLC CONTROLLER CONTROLS --- */}
      {device && device.type === 'plc_micro_controller' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PLC CPU Mode
            </label>
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'plcRun', device.state.plcRun === false ? true : false)}
              className={`text-xs font-bold font-mono px-3 py-1 rounded-lg border transition ${
                device.state.plcRun !== false
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-amber-500 text-white border-amber-600 shadow-sm'
              }`}
            >
              {device.state.plcRun !== false ? 'RUN MODE' : 'STOP MODE'}
            </button>
          </div>
          <div className="bg-slate-900 text-slate-100 p-2 rounded-xl font-mono text-[10px] space-y-1">
            <div className="flex justify-between border-b border-slate-700 pb-1">
              <span className="text-slate-400">Digital Inputs:</span>
              <span className="text-cyan-400">
                I1:{device.state.plcInputs?.i1 ? '1' : '0'} I2:{device.state.plcInputs?.i2 ? '1' : '0'} I3:{device.state.plcInputs?.i3 ? '1' : '0'} I4:{device.state.plcInputs?.i4 ? '1' : '0'}
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-400">Relay Outputs:</span>
              <span className="text-amber-400">
                Q1:{device.state.plcOutputs?.q1 ? '1' : '0'} Q2:{device.state.plcOutputs?.q2 ? '1' : '0'} Q3:{device.state.plcOutputs?.q3 ? '1' : '0'} Q4:{device.state.plcOutputs?.q4 ? '1' : '0'}
              </span>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 block font-mono">
            Embedded Ladder: I1 → Coil Q1, I2 → Coil Q2.
          </span>
        </div>
      )}

      {/* --- DPDT ICE-CUBE RELAY CONTROLS --- */}
      {device && device.type === 'industrial_relay_dpdt' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Relay Coil Status (A1-A2)
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.coilEnergized ? 'bg-purple-950/90 text-purple-300 border border-purple-500/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
              {device.state.coilEnergized ? '● ENERGIZED' : '○ DE-ENERGIZED'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 block">
            8-Pin DPDT Form-C Contacts (Common 11/21, NC 12/22, NO 14/24).
          </span>
        </div>
      )}

      {/* --- WIRE PROPERTIES --- */}
      {wire && (
        <div className="space-y-3">
          {/* Wire Tag / Circuit Label */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Wire Tag / Circuit Label
            </label>
            <input
              type="text"
              value={wire.label || ''}
              maxLength={18}
              placeholder="e.g. CKT-1 L1, T1, SW-RET"
              onChange={(e) => onUpdateWireProperty(wire.id, { label: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Gauge Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Conductor Cross-Section / Gauge
            </label>
            <select
              value={wire.wireGauge}
              onChange={(e) => onUpdateWireProperty(wire.id, { wireGauge: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500"
            >
              {wireStandards.map((ws) => (
                <option key={ws.id} value={ws.name}>
                  {ws.name} (Max {ws.maxBreakerAmps}A)
                </option>
              ))}
            </select>
          </div>

          {/* Wire Color */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Insulation Color
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {[
                { color: colors.phase1, name: 'Phase 1' },
                { color: colors.phase2, name: 'Phase 2' },
                { color: colors.phase3, name: 'Phase 3' },
                { color: colors.neutral, name: 'Neutral' },
                { color: colors.earth, name: 'Earth' },
                { color: colors.switched, name: 'Switched' },
              ].map((swatch, i) => (
                <button
                  key={i}
                  onClick={() => onUpdateWireProperty(wire.id, { color: swatch.color })}
                  style={{ backgroundColor: swatch.color }}
                  className={`h-6 rounded border transition-transform ${
                    wire.color === swatch.color
                      ? 'border-sky-400 scale-110 shadow-md ring-2 ring-sky-400/40'
                      : 'border-slate-600 hover:scale-105'
                  }`}
                  title={swatch.name}
                />
              ))}
            </div>
          </div>

          {/* Wire Run Length */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="font-bold uppercase tracking-wider">Conductor Length</span>
              <span className="font-mono text-slate-100 font-bold">{wire.lengthMeters || 5} meters</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={wire.lengthMeters || 5}
              onChange={(e) => onUpdateWireProperty(wire.id, { lengthMeters: Number(e.target.value) })}
              className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Electrical Metrics for this Wire */}
          <div className="bg-[#172235] p-2.5 rounded-xl border border-slate-700 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[9px] text-slate-400 block font-sans">CURRENT</span>
              <span className="font-bold text-slate-100">{(wire.currentAmps || 0).toFixed(2)} A</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block font-sans">VOLTAGE DROP</span>
              <span className={`font-bold ${(wire.voltageDropPercent || 0) > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {(wire.voltageDropPercent || 0).toFixed(2)} %
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block font-sans">LIMIT</span>
              <span className="text-slate-400 font-bold">≤ 3.0%</span>
            </div>
          </div>

          {/* Reset Custom Draggable Waypoints */}
          {wire.waypoints && wire.waypoints.length > 0 && (
            <button
              onClick={() => onUpdateWireProperty(wire.id, { waypoints: undefined })}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition shadow-sm"
              title="Reset manual orthogonal shifts back to automatic collision-free routing"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Wire Routing to Auto</span>
            </button>
          )}

          {/* Move Endpoint / Disconnect Connected Ports */}
          {(() => {
            const fromDev = devices.find((d) => d.id === wire.fromDeviceId);
            const toDev = devices.find((d) => d.id === wire.toDeviceId);
            const fromTerm = fromDev?.terminals.find((t) => t.id === wire.fromTerminalId);
            const toTerm = toDev?.terminals.find((t) => t.id === wire.toTerminalId);
            return (
              <div className="bg-[#172235] p-2.5 rounded-xl border border-slate-700 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Endpoint Ports (Rewire Without Deleting)
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/80">
                    <span className="text-slate-300 font-mono truncate">
                      <strong className="text-sky-400">FROM:</strong> {fromDev?.name?.split(' ')[0] || 'Dev'}:{fromTerm?.label || wire.fromTerminalId}
                    </span>
                    {onRequestRewire && (
                      <button
                        onClick={() => onRequestRewire(wire.id, 'from')}
                        className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] shrink-0 transition"
                        title="Pick a new port for the FROM end"
                      >
                        ⇄ Rewire
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/80">
                    <span className="text-slate-300 font-mono truncate">
                      <strong className="text-amber-400">TO:</strong> {toDev?.name?.split(' ')[0] || 'Dev'}:{toTerm?.label || wire.toTerminalId}
                    </span>
                    {onRequestRewire && (
                      <button
                        onClick={() => onRequestRewire(wire.id, 'to')}
                        className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] shrink-0 transition"
                        title="Pick a new port for the TO end"
                      >
                        ⇄ Rewire
                      </button>
                    )}
                  </div>
                </div>
                {onDisconnectWire && (
                  <button
                    onClick={() => onDisconnectWire(wire.id)}
                    className="w-full py-1 px-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-700/70 text-rose-200 text-[11px] font-bold transition"
                  >
                    Disconnect Wire
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Footer Action Buttons (Rotate, Duplicate, Delete) */}
      <div className="pt-3 mt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
        {device && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onRotateDevice && onRotateDevice(device)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold rounded-lg transition"
              title="Rotate 90° clockwise (Shortcut: R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-300" />
              <span>Rotate</span>
            </button>
            <button
              onClick={() => onDuplicateDevice && onDuplicateDevice(device)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold rounded-lg transition"
              title="Duplicate device (Shortcut: Ctrl+C, Ctrl+V)"
            >
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Duplicate</span>
            </button>
          </div>
        )}

        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-700 transition ml-auto"
          title="Delete selected item (Shortcut: Del / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
