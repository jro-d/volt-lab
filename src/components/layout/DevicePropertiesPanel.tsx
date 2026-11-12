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
}

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
}) => {
  if (!device && !wire) return null;

  const wireStandards = getWireStandards(standard);
  const colors = COLOR_STANDARDS[standard];

  const standardBreakerAmps = [6, 10, 15, 16, 20, 25, 30, 32, 40, 50, 63, 80, 100];
  const rcdSensitivities = [10, 30, 100, 300];

  return (
    <div className={`absolute top-4 ${isLibraryOpen ? 'left-[340px]' : 'left-4'} z-20 w-80 bg-white/95 border border-stone-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md p-4 text-stone-800 select-none animate-in fade-in slide-in-from-top-2 duration-150`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600">
            {device ? <Sliders className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-rose-600 uppercase tracking-widest block">
              {device ? 'DEVICE INSPECTOR' : 'CONDUCTOR INSPECTOR'}
            </span>
            <div className="text-xs font-bold text-stone-900 truncate max-w-[170px]">
              {device ? device.name : `Wire: ${wire?.wireGauge}`}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* --- CIRCUIT BREAKER PROPERTIES --- */}
      {device && (device.type.includes('mcb') || device.type.includes('service_disconnect')) && (
        <div className="space-y-3">
          {/* Ampere Rating Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-rose-600" />
                Rated Ampere Capacity (In)
              </label>
              <span className="text-xs font-mono font-black text-rose-600 px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200 hover:border-stone-300'
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
            <span className="text-[9px] text-stone-400 mt-1 block">
              PEC 240.4 & IEC 60898 standard DIN breaker frame ratings.
            </span>
          </div>

          {/* Trip Curve Selector (Type B, C, D) */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Magnetic Trip Characteristic Curve
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#f4f0eb] p-1 rounded-lg text-xs font-bold font-mono">
              {(['B', 'C', 'D'] as const).map((curve) => (
                <button
                  key={curve}
                  onClick={() => onUpdateDeviceProperty(device.id, 'tripCurve', curve)}
                  className={`py-1 rounded-md transition ${
                    (device.state.tripCurve || 'C') === curve
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Type {curve}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-stone-500 mt-1">
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
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {sens}mA
                </button>
              ))}
            </div>
            <span className="text-[9px] text-stone-500 mt-1 block">
              30mA is mandatory for personnel shock protection (PEC 2.10.1.8 / IEC 60364-4-41).
            </span>
          </div>
        </div>
      )}

      {/* --- LIGHT FIXTURE PROPERTIES --- */}
      {device && device.type === 'light_bulb' && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
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
                    : 'bg-[#faf8f5] text-stone-700 border-stone-200'
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
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
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
                    : 'bg-[#faf8f5] text-stone-700 border-stone-200'
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
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-stone-500 bg-sky-50/70 p-2 rounded-lg border border-sky-100">
            🌀 Aerodynamic blades spin automatically when circuit loop is closed and powered.
          </div>
        </div>
      )}

      {/* --- AIR CONDITIONER PROPERTIES --- */}
      {device && device.type === 'appliance_ac' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {deg}°C
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
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
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
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
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Perspective Inspection View
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'front')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.viewMode !== 'rear'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                }`}
              >
                <span>👁️ Front Plate</span>
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'rear')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.viewMode === 'rear'
                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                    : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                }`}
              >
                <span>🔧 Rear Modules</span>
              </button>
            </div>
          </div>

          {/* Educational Callout on Terminal Polarity */}
          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-950 text-[11px] space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <span>🇵🇭 PEC Terminal Polarity:</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-tight">
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
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Enclosure Material & Standard
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'orange_pvc')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc'
                    ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
                    : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                }`}
              >
                <span>🟠 Orange PVC</span>
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'galvanized_steel')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.boxMaterial === 'galvanized_steel' && device.type !== 'junction_box_octagonal_orange'
                    ? 'bg-stone-700 text-white border-stone-800 shadow-sm'
                    : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                }`}
              >
                <span>⚙️ Metal Steel</span>
              </button>
            </div>
            <span className="text-[9px] text-stone-500 mt-1 block">
              Philippine residential installations widely use 4" orange PVC octagonal boxes for conduit drops.
            </span>
          </div>
        </div>
      )}

      {/* --- 2P BREAKER HOUSING STYLE --- */}
      {device && device.type === 'mcb_2p' && (
        <div className="space-y-2 mt-2 pt-2 border-t border-stone-100">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
            Breaker Housing Form Factor
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'mccbStyle', 'industrial_black')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.mccbStyle === 'industrial_black'
                  ? 'bg-stone-900 text-white border-black shadow-sm'
                  : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
              }`}
            >
              <span>⚡ Industrial Black</span>
            </button>
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'mccbStyle', 'din_rail')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.mccbStyle !== 'industrial_black'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
              }`}
            >
              <span>⚪ DIN-Rail Module</span>
            </button>
          </div>
        </div>
      )}

      {/* --- PUSH BUTTON STATION CONTROLS --- */}
      {device && device.type === 'push_button_station' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
            Station Actuators (Click or Press)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'startPressed', !device.state.startPressed)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                device.state.startPressed
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <span className="text-base font-black">I</span>
              <span className="text-[10px] uppercase">{device.state.startPressed ? 'Pressed (NO Closed)' : 'Start (NO Open)'}</span>
            </button>
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'stopPressed', !device.state.stopPressed)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                device.state.stopPressed
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              <span className="text-base font-black">O</span>
              <span className="text-[10px] uppercase">{device.state.stopPressed ? 'Depressed (NC Open)' : 'Stop (NC Closed)'}</span>
            </button>
          </div>
          <span className="text-[9px] text-stone-400 block">
            Green Start is Momentary Normally Open (NO). Red Stop is Normally Closed (NC).
          </span>
        </div>
      )}

      {/* --- EMERGENCY STOP CONTROLS --- */}
      {device && device.type === 'push_button_estop' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
            Safety Mushroom Actuator
          </label>
          <button
            onClick={() => onUpdateDeviceProperty(device.id, 'latched', !device.state.latched)}
            className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition ${
              device.state.latched
                ? 'bg-rose-600 text-white border-rose-700 shadow-md animate-pulse'
                : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border-yellow-300'
            }`}
          >
            <span>{device.state.latched ? '🛑 E-STOP LATCHED (Contacts Open)' : '✅ E-STOP ARMED (Contacts Closed)'}</span>
          </button>
          <span className="text-[9px] text-stone-400 block">
            Click to slam or twist-to-release. Latched state forcefully opens NC safety contacts.
          </span>
        </div>
      )}

      {/* --- PILOT LIGHT INDICATOR CONTROLS --- */}
      {device && device.type === 'pilot_light_indicator' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Lens Color
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${device.state.lit ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
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
                    ? 'ring-2 ring-stone-800 border-stone-800 shadow-sm'
                    : 'border-stone-200 hover:border-stone-300'
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
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Coil Status (A1-A2)
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.coilEnergized ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
              {device.state.coilEnergized ? '⚡ ENERGIZED (PULLED IN)' : '○ DE-ENERGIZED'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Rated Motor Current (AC-3)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[9, 12, 18, 25].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 18) === amps
                      ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onUpdateDeviceProperty(device.id, 'manualOverride', !device.state.manualOverride)}
            className={`w-full py-1.5 px-3 text-xs font-bold rounded-lg border transition ${
              device.state.manualOverride
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
          >
            {device.state.manualOverride ? 'Manual Plunger Pressed' : 'Push Armature Plunger Manually'}
          </button>
        </div>
      )}

      {/* --- INDUSTRIAL AC INDUCTION MOTOR CONTROLS --- */}
      {device && device.type === 'motor_ac_industrial' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Motor Status
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.running ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-stone-100 text-stone-500'}`}>
              {device.state.running ? '⚡ SPINNING (1750 RPM)' : '○ STOPPED'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Nameplate Power Rating
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { hp: 1, w: 750, label: '1 HP' },
                { hp: 2, w: 1500, label: '2 HP' },
                { hp: 3, w: 2200, label: '3 HP' },
                { hp: 5, w: 3700, label: '5 HP' },
              ].map((m) => (
                <button
                  key={m.hp}
                  onClick={() => onUpdateDeviceProperty(device.id, 'wattage', m.w)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.wattage || 2200) === m.w
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-[#faf8f5] hover:bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-stone-400 mt-1 block font-mono">
              Rated: {(device.state.wattage || 2200)} Watts / 230-460V 3-Phase TEFC.
            </span>
          </div>
        </div>
      )}

      {/* --- MICRO PLC CONTROLLER CONTROLS --- */}
      {device && device.type === 'plc_micro_controller' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
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
          <span className="text-[9px] text-stone-400 block font-mono">
            Embedded Ladder: I1 → Coil Q1, I2 → Coil Q2.
          </span>
        </div>
      )}

      {/* --- DPDT ICE-CUBE RELAY CONTROLS --- */}
      {device && device.type === 'industrial_relay_dpdt' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Relay Coil Status (A1-A2)
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.coilEnergized ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-500'}`}>
              {device.state.coilEnergized ? '● ENERGIZED' : '○ DE-ENERGIZED'}
            </span>
          </div>
          <span className="text-[9px] text-stone-400 block">
            8-Pin DPDT Form-C Contacts (Common 11/21, NC 12/22, NO 14/24).
          </span>
        </div>
      )}

      {/* --- WIRE PROPERTIES --- */}
      {wire && (
        <div className="space-y-3">
          {/* Gauge Selector */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Conductor Cross-Section / Gauge
            </label>
            <select
              value={wire.wireGauge}
              onChange={(e) => onUpdateWireProperty(wire.id, { wireGauge: e.target.value })}
              className="w-full bg-[#faf8f5] border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-500"
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
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
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
                      ? 'border-stone-900 scale-110 shadow-md ring-2 ring-stone-900/20'
                      : 'border-stone-300 hover:scale-105'
                  }`}
                  title={swatch.name}
                />
              ))}
            </div>
          </div>

          {/* Wire Run Length */}
          <div>
            <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
              <span className="font-bold uppercase tracking-wider">Conductor Length</span>
              <span className="font-mono text-stone-900 font-bold">{wire.lengthMeters || 5} meters</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={wire.lengthMeters || 5}
              onChange={(e) => onUpdateWireProperty(wire.id, { lengthMeters: Number(e.target.value) })}
              className="w-full accent-rose-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
            />
          </div>

          {/* Electrical Metrics for this Wire */}
          <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-stone-100 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[9px] text-stone-400 block font-sans">CURRENT</span>
              <span className="font-bold text-stone-900">{(wire.currentAmps || 0).toFixed(2)} A</span>
            </div>
            <div>
              <span className="text-[9px] text-stone-400 block font-sans">VOLTAGE DROP</span>
              <span className={`font-bold ${(wire.voltageDropPercent || 0) > 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {(wire.voltageDropPercent || 0).toFixed(2)} %
              </span>
            </div>
            <div>
              <span className="text-[9px] text-stone-400 block font-sans">LIMIT</span>
              <span className="text-stone-500 font-bold">≤ 3.0%</span>
            </div>
          </div>

          {/* Reset Custom Draggable Waypoints */}
          {wire.waypoints && wire.waypoints.length > 0 && (
            <button
              onClick={() => onUpdateWireProperty(wire.id, { waypoints: undefined })}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl transition shadow-sm"
              title="Reset manual orthogonal shifts back to automatic collision-free routing"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>Reset Wire Routing to Auto</span>
            </button>
          )}
        </div>
      )}

      {/* Footer Action Buttons (Rotate, Duplicate, Delete) */}
      <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        {device && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onRotateDevice && onRotateDevice(device)}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg transition"
              title="Rotate 90° clockwise (Shortcut: R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-stone-600" />
              <span>Rotate</span>
            </button>
            <button
              onClick={() => onDuplicateDevice && onDuplicateDevice(device)}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg transition"
              title="Duplicate device (Shortcut: Ctrl+C, Ctrl+V)"
            >
              <Copy className="w-3.5 h-3.5 text-stone-600" />
              <span>Duplicate</span>
            </button>
          </div>
        )}

        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition ml-auto"
          title="Delete selected item (Shortcut: Del / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
