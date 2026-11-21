import { ModuleInspector } from './ModuleInspector';
import React from 'react';
import { ElectricalDevice, ElectricalWire, CodeStandard } from '../../types/electrical';
import { getWireStandards, COLOR_STANDARDS } from '../../data/standardsData';
import { conductorColor } from '../../styles/conductors';
import { TIMER_MODE_LABEL, TimerMode } from '../../core/behaviors/timerModes';
import { FUSE_RATINGS } from '../../core/behaviors/fuse';
import { 
  Sliders, 
  ShieldCheck, 
  Zap, 
  Trash2, 
  X,
  RotateCcw,
  RotateCw,
  Copy
} from 'lucide-react';

interface DevicePropertiesPanelProps {
  device: ElectricalDevice | null;
  wire: ElectricalWire | null;
  /** Several conductors selected: bulk colour / gauge editor */
  wires?: ElectricalWire[];
  /** Number of devices in the current multi-selection (info only) */
  groupDeviceCount?: number;
  onUpdateWiresProperty?: (wireIds: string[], updates: Partial<ElectricalWire>) => void;
  standard: CodeStandard;
  onUpdateDeviceProperty: (deviceId: string, key: string, value: any) => void;
  /** Shared tank / line-pressure state and its updater (pumps, float and pressure switches) */
  process?: { tankLevel: number; lineBar: number; drawOffLpm: number };
  onUpdateProcess?: (patch: Partial<{ tankLevel: number; lineBar: number; drawOffLpm: number }>) => void;
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
  /** Available fault current at this device's input, A (null when the short-circuit check is off or the device is not reached) */
  faultKa?: number | null;
  /** Read-only inspector mode (phone view-only breakpoint) */
  readOnly?: boolean;
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
  wires = [],
  groupDeviceCount = 0,
  onUpdateWiresProperty,
  standard,
  onUpdateDeviceProperty,
  process,
  onUpdateProcess,
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
  faultKa,
  readOnly = false,
}) => {
  const patchState = (key: string, value: any) =>
    device && (onPatchDeviceState ? onPatchDeviceState(device.id, { [key]: value }) : onUpdateDeviceProperty(device.id, key, value));
  if (!device && !wire && wires.length < 2) return null;

  const wireStandards = getWireStandards(standard);
  const colors = COLOR_STANDARDS[standard];

  const standardBreakerAmps = [6, 10, 15, 16, 20, 25, 30, 32, 40, 50, 63, 80, 100];
  const rcdSensitivities = [10, 30, 100, 300];

  return (
    <div className={`absolute top-4 ${isLibraryOpen ? 'left-[340px]' : 'left-4'} z-20 w-80 wirewise-panel wirewise-scroll-dark bg-surface border border-border rounded-lg shadow-2 backdrop-blur-md p-4 text-ink max-h-[calc(100%-36px)] overflow-y-auto select-none animate-in fade-in slide-in-from-top-2 duration-150`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-surface-sunken flex items-center justify-center text-ink-muted">
            {device ? <Sliders className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </div>
          <div>
            <span className="text-[10px] font-display font-semibold text-ink-muted uppercase tracking-[0.08em] block">
              {device ? 'DEVICE INSPECTOR' : wires.length > 1 ? 'MULTI-WIRE INSPECTOR' : 'CONDUCTOR INSPECTOR'}
            </span>
            <div className="text-xs font-bold text-ink truncate max-w-[170px]">
              {device ? device.name : wires.length > 1 ? `${wires.length} conductors selected` : `Wire: ${wire?.wireGauge}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {readOnly && (
            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-ink-muted">
              View only
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 text-ink hover:text-ink hover:bg-surface-hover rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={readOnly ? 'pointer-events-none opacity-85' : ''}>
      <fieldset disabled={readOnly} className="border-0 p-0 m-0 min-w-0">

      {/* ── STANDARD DATASHEET CARD (brand-neutral) ── */}
      {device && (
        <div className="mb-3.5 p-2.5 rounded-md bg-surface-sunken border border-border text-ink shadow-sm">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-ink text-surface whitespace-nowrap"
                title="Product standard this generic device model follows"
              >
                {device.productStandard || 'Standard'}
              </span>
              <span className="text-[11px] font-bold font-mono text-ink truncate">
                {device.modelNumber || device.name}
              </span>
            </div>
            {device.kaRating && (
              <span className="text-[10px] font-mono font-semibold text-ink-muted bg-surface px-1.5 py-0.5 rounded-sm border border-border">
                {device.kaRating} kAIC
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div>
              <span className="text-ink-muted block font-medium">Mounting:</span>
              <span className="font-semibold text-ink capitalize">
                {device.mountingType ? device.mountingType.replace('_', ' ') : 'Flush Utility Box'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block font-medium">Reference Code:</span>
              <span className="font-mono font-semibold text-ink">
                {device.pecReference || 'PEC 2017'}
              </span>
            </div>
            {faultKa != null && (
              <div className="col-span-2" title="Prospective short-circuit current at this device's input (ohmic method, resistive only)">
                <span className="text-ink-muted block font-medium">Available fault current (Ik):</span>
                <span className={`font-mono font-semibold ${device.kaRating && device.kaRating < faultKa / 1000 ? 'text-danger' : 'text-ink'}`}>
                  {(faultKa / 1000).toFixed(faultKa >= 10000 ? 1 : 2)} kA{device.kaRating ? ` vs ${device.kaRating} kAIC rating` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CIRCUIT BREAKER PROPERTIES --- */}
      {device && (device.type.includes('mcb') || device.type.includes('service_disconnect')) && (
        <div className="space-y-3">
          {/* Breaker form factor: bolt-on (UL 489) or DIN-rail (IEC 60898-1) */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Breaker Profile & Mounting
            </label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'bolt_on', label: 'Bolt-On', sub: 'UL 489 · 10kA' },
                { id: 'din_rail', label: 'DIN-Rail', sub: 'IEC 60898-1 · 6kA' },
              ].map(prof => {
                const raw = String(device.state.breakerProfile || (device.state.mccbStyle === 'industrial_black' ? 'bolt_on' : 'din_rail'));
                const active = (raw.includes('bolt') ? 'bolt_on' : 'din_rail') === prof.id;
                return (
                  <button
                    key={prof.id}
                    onClick={() => {
                      onUpdateDeviceProperty(device.id, 'breakerProfile', prof.id);
                      onUpdateDeviceProperty(device.id, 'mccbStyle', prof.id === 'bolt_on' ? 'industrial_black' : 'din_rail');
                      const poles = device.type === 'mcb_3p' ? '3P' : device.type === 'mcb_1p' ? '1P' : '2P';
                      if (prof.id === 'bolt_on') {
                        onUpdateDeviceProperty(device.id, 'productStandard', 'UL 489 / PEC 2017');
                        onUpdateDeviceProperty(device.id, 'kaRating', 10);
                        onUpdateDeviceProperty(device.id, 'mountingType', 'bolt_on');
                        onUpdateDeviceProperty(device.id, 'modelNumber', `MCB ${poles} Bolt-On`);
                      } else {
                        onUpdateDeviceProperty(device.id, 'productStandard', 'IEC 60898-1');
                        onUpdateDeviceProperty(device.id, 'kaRating', 6);
                        onUpdateDeviceProperty(device.id, 'mountingType', 'din_rail');
                        onUpdateDeviceProperty(device.id, 'modelNumber', `MCB ${poles} DIN-Rail`);
                      }
                    }}
                    className={`py-1 px-1 text-center rounded-lg border transition ${
                      active
                        ? 'bg-probe text-on-probe border-probe shadow-sm'
                        : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                    }`}
                  >
                    <div className="text-[10px] font-bold leading-tight">{prof.label}</div>
                    <div className={`text-[8px] ${active ? 'text-on-probe/80' : 'text-ink-muted'}`}>{prof.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Ampere Rating Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Rated Ampere Capacity (In)
              </label>
              <span className="text-xs font-mono font-semibold text-ink px-2 py-0.5 rounded-sm bg-surface-sunken">
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
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border hover:border-border-strong'
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
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border hover:border-border-strong'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              PEC 240.4 & IEC 60898 standard DIN breaker frame ratings.
            </span>
          </div>

          {/* Trip Curve Selector (Type B, C, D) */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Magnetic Trip Characteristic Curve
            </label>
            <div className="grid grid-cols-3 gap-1 bg-surface border border-border p-1 rounded-lg text-xs font-bold font-mono">
              {(['B', 'C', 'D'] as const).map((curve) => (
                <button
                  key={curve}
                  onClick={() => onUpdateDeviceProperty(device.id, 'tripCurve', curve)}
                  className={`py-1 rounded-md transition ${
                    (device.state.tripCurve || 'C') === curve
                      ? 'bg-surface-hover text-ink shadow-sm'
                      : 'text-ink hover:text-ink'
                  }`}
                >
                  Type {curve}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-ink-muted mt-1">
              {(device.state.tripCurve || 'C') === 'B' && 'Type B: 3–5x In (Lighting & non-inductive resistive loads)'}
              {(device.state.tripCurve || 'C') === 'C' && 'Type C: 5–10x In (General socket outlets, appliances & small motors)'}
              {(device.state.tripCurve || 'C') === 'D' && 'Type D: 10–20x In (High inrush motors & industrial transformers)'}
            </div>
          </div>
        </div>
      )}

      {/* --- RCBO 1P+N PROPERTIES --- */}
      {device && device.type === 'rcbo_1pn' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Rated Current (In)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[6, 10, 16, 20, 25, 32, 40].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 16) === amps
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Magnetic Trip Curve (IEC 60898-1)
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { c: 'B', sub: '3-5 In' },
                { c: 'C', sub: '5-10 In' },
                { c: 'D', sub: '10-20 In' },
              ].map((k) => (
                <button
                  key={k.c}
                  onClick={() => onUpdateDeviceProperty(device.id, 'tripCurve', k.c)}
                  className={`py-1 rounded-lg border text-xs font-mono font-bold flex flex-col items-center transition ${
                    (device.state.tripCurve || 'C') === k.c
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {k.c}
                  <span className="text-[9px] font-sans font-normal opacity-80">{k.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Earth Leakage Sensitivity (IΔn)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {rcdSensitivities.map((sens) => (
                <button
                  key={sens}
                  onClick={() => onUpdateDeviceProperty(device.id, 'leakageMa', sens)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.leakageMa || 30) === sens
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {sens}mA
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              One RCBO per circuit: an earth fault or overload drops only that circuit. Use the T button on the device to test the leakage trip.
            </span>
          </div>
        </div>
      )}

      {/* --- RCD / ELCB PROPERTIES --- */}
      {device && device.type === 'rcd_2p' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Rated Frame Ampacity
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[25, 40, 63].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 40) === amps
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Earth Leakage Sensitivity (IΔn)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {rcdSensitivities.map((sens) => (
                <button
                  key={sens}
                  onClick={() => onUpdateDeviceProperty(device.id, 'sensitivityMa', sens)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.sensitivityMa || 30) === sens
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {sens}mA
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              30mA is mandatory for personnel shock protection (PEC 2.10.1.8 / IEC 60364-4-41).
            </span>
          </div>
        </div>
      )}

      {/* --- ENCLOSED SAFETY BREAKER (ACU DISCONNECT) --- */}
      {device && device.type === 'safety_breaker_2p' && (
        <div className="space-y-3">
          {/* Front Enclosure Cover Toggle */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              NEMA 1 Enclosure Cover
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'enclosureCoverOpen', false)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  !device.state.enclosureCoverOpen
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                🔒 Closed (Front Face)
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'enclosureCoverOpen', true)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.enclosureCoverOpen
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                🔓 Open (Inspect Lugs)
              </button>
            </div>
          </div>

          {/* Ampere Rating */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                Safety Breaker Rating (In)
              </label>
              <span className="text-xs font-mono font-semibold text-ink">{device.state.ratedAmps || 30}A</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[15, 20, 30, 40].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 30) === amps
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {amps}A
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              PEC 4.40.2.1: Disconnecting means must be within sight from air-conditioning equipment.
            </span>
          </div>
        </div>
      )}

      {/* --- WIDE-SERIES MODULAR COMBO STRAP --- */}
      {device && device.type === 'modular_combo_plate' && (
        <div className="space-y-3">
          {/* Front / Rear View Toggle */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Plate View Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'front')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.viewMode !== 'rear'
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                Front Faceplate
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'rear')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.viewMode === 'rear'
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                🔄 Rear Wiring Strap
              </button>
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              Flip to Rear View to wire common jumpers between SW, Pilot, and Outlet!
            </span>
          </div>

          {/* Slot 2 Module Option */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Slot 2 Modular Insert
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'comboSlot2', 'pilot')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.comboSlot2 !== 'switch2'
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                🔴 Neon Pilot Lamp
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'comboSlot2', 'switch2')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.comboSlot2 === 'switch2'
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
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
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Box Material & Finish
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'orange_pvc')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.boxMaterial !== 'galvanized_steel'
                    ? 'bg-warning-fill text-ink border-warning shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                🟧 PVC Safety Orange
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'galvanized_steel')}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  device.state.boxMaterial === 'galvanized_steel'
                    ? 'bg-surface-hover text-ink border-border-strong shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                ⬜ Galvanized Steel (GI)
              </button>
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              PEC 3.14.2.2: Standard 2"×4" utility box volume 230 cm³ (14.0 in³). Max 7× 2.0mm² conductors.
            </span>
          </div>
        </div>
      )}

      {/* --- DIN RAIL TRACK PROPERTIES --- */}
      {device && device.type === 'din_rail_track' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
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
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              Mounts standard 35mm modular MCBs, RCDs, and industrial terminals per IEC 60715.
            </span>
          </div>
        </div>
      )}

      {/* --- LIGHT FIXTURE PROPERTIES --- */}
      {device && device.type === 'light_bulb' && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            Lamp Wattage
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[15, 40, 60, 100].map((w) => (
              <button
                key={w}
                onClick={() => onUpdateDeviceProperty(device.id, 'wattage', w)}
                className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                  (device.state.wattage || 60) === w
                    ? 'bg-warning-fill text-ink border-warning shadow-sm'
                    : 'bg-surface/90 text-ink border-border'
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
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            Heating Element Wattage
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[2500, 3500, 4500].map((w) => (
              <button
                key={w}
                onClick={() => onUpdateDeviceProperty(device.id, 'wattage', w)}
                className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                  (device.state.wattage || 3500) === w
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 text-ink border-border'
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
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
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
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-ink-muted bg-probe-soft/80 p-2 rounded-lg border border-probe/50 text-probe">
            🌀 Aerodynamic blades spin automatically when circuit loop is closed and powered.
          </div>
        </div>
      )}

      {/* --- AIR CONDITIONER PROPERTIES --- */}
      {device && device.type === 'appliance_ac' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Set Temperature Display
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[16, 18, 20, 22, 24].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onUpdateDeviceProperty(device.id, 'setTemp', deg)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.setTemp || 16) === deg
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {deg}°C
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
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
                      ? 'bg-probe text-on-probe border-probe shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
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
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Perspective Inspection View
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'front')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.viewMode !== 'rear'
                    ? 'bg-ok text-surface border-ok shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                <span>👁️ Front Plate</span>
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'viewMode', 'rear')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.viewMode === 'rear'
                    ? 'bg-probe text-on-probe border-probe shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                <span>🔧 Rear Modules</span>
              </button>
            </div>
          </div>

          {/* Earth-leakage fault: the plugged appliance leaks to its chassis; an RCBO upstream trips */}
          <button
            onClick={() => patchState('hasEarthFault', !device.state.hasEarthFault)}
            className={`w-full py-1.5 rounded-lg border text-xs font-bold transition ${
              device.state.hasEarthFault ? 'bg-danger-soft text-danger border-danger/60' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
            }`}
          >
            {device.state.hasEarthFault ? '⚡ Earth leakage fault ON (click to clear)' : 'Simulate earth leakage fault'}
          </button>

          {/* Educational Callout on Terminal Polarity */}
          <div className="p-2.5 rounded-md bg-warning-soft/75 border border-warning/60 text-warning text-[11px] space-y-1">
            <div className="font-bold text-warning flex items-center gap-1">
              <span>🇵🇭 PEC Terminal Polarity:</span>
            </div>
            <p className="text-[10px] text-warning leading-tight">
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
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Enclosure Material & Standard
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'orange_pvc')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.type === 'junction_box_octagonal_orange' || device.state.boxMaterial === 'orange_pvc'
                    ? 'bg-warning-fill text-ink border-warning shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                <span>🟠 Orange PVC</span>
              </button>
              <button
                onClick={() => onUpdateDeviceProperty(device.id, 'boxMaterial', 'galvanized_steel')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                  device.state.boxMaterial === 'galvanized_steel' && device.type !== 'junction_box_octagonal_orange'
                    ? 'bg-surface-hover text-ink border-border-strong shadow-sm'
                    : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                <span>⚙️ Metal Steel</span>
              </button>
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block">
              Philippine residential installations widely use 4" orange PVC octagonal boxes for conduit drops.
            </span>
          </div>
        </div>
      )}

      {/* --- 2P BREAKER HOUSING STYLE --- */}
      {device && device.type === 'mcb_2p' && (
        <div className="space-y-2 mt-2 pt-2 border-t border-border/80">
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
            Breaker Housing Form Factor
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'mccbStyle', 'industrial_black')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.mccbStyle === 'industrial_black'
                  ? 'bg-surface-hover text-ink border-probe shadow-sm'
                  : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
              }`}
            >
              <span>⚡ Industrial Black</span>
            </button>
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'mccbStyle', 'din_rail')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.mccbStyle !== 'industrial_black'
                  ? 'bg-probe text-on-probe border-probe shadow-sm'
                  : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
              }`}
            >
              <span>⚪ DIN-Rail Module</span>
            </button>
          </div>
        </div>
      )}

      {/* --- PUSH BUTTON STATION CONTROLS --- */}
      {device && device.type === 'push_button_station' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            Station Actuators (Click or Press)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              {...holdProps(device.id, 'startPressed', onPatchDeviceState)}
              onClick={() => !onPatchDeviceState && onUpdateDeviceProperty(device.id, 'startPressed', !device.state.startPressed)}
              className={`py-2 px-3 text-xs font-bold rounded-md border flex flex-col items-center justify-center gap-1 transition ${
                device.state.startPressed
                  ? 'bg-ok text-surface border-ok shadow-md ring-2 ring-ok/40'
                  : 'bg-ok-soft/80 hover:bg-ok-soft/90 text-ok border-ok/60'
              }`}
            >
              <span className="text-base font-black">I</span>
              <span className="text-[10px] uppercase">{device.state.startPressed ? 'Pressed (NO Closed)' : 'Start (NO Open)'}</span>
            </button>
            <button
              {...holdProps(device.id, 'stopPressed', onPatchDeviceState)}
              onClick={() => !onPatchDeviceState && onUpdateDeviceProperty(device.id, 'stopPressed', !device.state.stopPressed)}
              className={`py-2 px-3 text-xs font-bold rounded-md border flex flex-col items-center justify-center gap-1 transition ${
                device.state.stopPressed
                  ? 'bg-danger text-surface border-danger shadow-1'
                  : 'bg-danger-soft/80 hover:bg-danger-soft/90 text-danger border-danger/60'
              }`}
            >
              <span className="text-base font-black">O</span>
              <span className="text-[10px] uppercase">{device.state.stopPressed ? 'Depressed (NC Open)' : 'Stop (NC Closed)'}</span>
            </button>
          </div>
          <span className="text-[9px] text-ink-muted block">
            Hold to press — both are momentary (spring return). START 3-4 is NO, STOP 1-2 is NC.
          </span>
        </div>
      )}

      {/* --- EMERGENCY STOP CONTROLS --- */}
      {device && device.type === 'push_button_estop' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            Safety Mushroom Actuator
          </label>
          <button
            onClick={() => onUpdateDeviceProperty(device.id, 'latched', !device.state.latched)}
            className={`w-full py-2.5 px-3 text-xs font-bold rounded-md border flex items-center justify-center gap-2 transition ${
              device.state.latched
                ? 'bg-danger text-surface border-danger shadow-1'
                : 'bg-warning-soft/80 hover:bg-warning-soft/90 text-warning border-warning/60'
            }`}
          >
            <span>{device.state.latched ? 'E-STOP LATCHED (contacts open)' : 'E-STOP ARMED (contacts closed)'}</span>
          </button>
          <span className="text-[9px] text-ink-muted block">
            Click to slam or twist-to-release. Latched state forcefully opens NC safety contacts.
          </span>
        </div>
      )}

      {/* --- PILOT LIGHT INDICATOR CONTROLS --- */}
      {device && device.type === 'pilot_light_indicator' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              Lens Color
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${device.state.lit ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
              {device.state.lit ? '● ILLUMINATED' : '○ OFF'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'green', label: 'Green', color: '#34e27a', bg: 'bg-lamp-green-on' },
              { id: 'red', label: 'Red', color: '#ff4136', bg: 'bg-lamp-red-on' },
              { id: 'amber', label: 'Amber', color: '#ffb12b', bg: 'bg-lamp-amber-on' },
              { id: 'blue', label: 'Blue', color: '#4a93ff', bg: 'bg-lamp-blue-on' },
            ].map((col) => (
              <button
                key={col.id}
                onClick={() => onUpdateDeviceProperty(device.id, 'pilotColor', col.id)}
                className={`py-1.5 px-1 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition ${
                  (device.state.pilotColor || 'green') === col.id
                    ? 'ring-2 ring-probe border-probe shadow-sm'
                    : 'border-border hover:border-border-strong'
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
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              Coil Status (A1-A2)
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.coilEnergized ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
              {device.state.coilEnergized ? '⚡ ENERGIZED (PULLED IN)' : '○ DE-ENERGIZED'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Rated Motor Current (AC-3)
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[9, 18, 25, 32].map((amps) => (
                <button
                  key={amps}
                  onClick={() => onUpdateDeviceProperty(device.id, 'ratedAmps', amps)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.ratedAmps || 18) === amps
                      ? 'bg-surface-sunken text-ink border-border shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
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
              <div key={c.k} className={`rounded-lg border px-2 py-1 ${c.on ? 'bg-ok-soft/80 border-ok/60 text-ok' : 'bg-surface/80 border-border text-ink-muted'}`}>
                <div className="font-bold">{c.k}</div>
                <div>{c.val ?? (c.on ? 'CLOSED' : 'OPEN')}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Tag</label>
              <input
                value={device.state.tag || ''}
                onChange={(e) => onUpdateDeviceProperty(device.id, 'tag', e.target.value.toUpperCase().slice(0, 6))}
                className="w-full h-7 px-2 text-xs font-mono font-bold rounded-lg border border-border bg-surface text-ink"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Role</label>
              <select
                value={device.state.role || ''}
                onChange={(e) => onUpdateDeviceProperty(device.id, 'role', e.target.value || undefined)}
                className="w-full h-7 px-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-surface text-ink"
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
                  ? 'bg-probe text-on-probe border-probe'
                  : 'bg-surface-sunken hover:bg-surface-hover text-ink border-border-strong'
              }`}
              title="Reveal the coil, armature, return spring and moving contact bridges"
            >
              🔍 {device.state.viewMode === 'cutaway' ? 'Cutaway ON' : 'Cutaway'}
            </button>
            <button
              onClick={() => patchState('manualOverride', !device.state.manualOverride)}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                device.state.manualOverride
                  ? 'bg-warning-fill text-ink border-warning'
                  : 'bg-surface-sunken hover:bg-surface-hover text-ink border-border-strong'
              }`}
            >
              {device.state.manualOverride ? 'Plunger Forced IN' : 'Test Plunger'}
            </button>
          </div>
          <span className="text-[9px] text-ink-muted block">
            Coil OFF: return spring holds NC 21-22 closed. Coil ON: armature pulls in — main poles &amp; NO 13-14 close and NC 21-22 opens.
          </span>
        </div>
      )}

      {/* --- THERMAL OVERLOAD RELAY (TOR) --- */}
      {device && device.type === 'thermal_overload_relay' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Relay Status</label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.tripped ? 'bg-warning-soft/90 text-warning border border-warning/50 animate-pulse' : 'bg-ok-soft/90 text-ok border border-ok/50'}`}>
              {device.state.tripped ? '⚠ TRIPPED (95-96 OPEN)' : '● READY (95-96 CLOSED)'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Ampere Dial Setting (Ir)
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[4, 5, 6, 7, 8, 10].map((a) => (
                <button
                  key={a}
                  onClick={() => patchState('tripAmps', a)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.tripAmps || 6) === a ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {a}A
                </button>
              ))}
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface border border-border overflow-hidden">
              <div
                className={`h-full transition-all ${((device.state.measuredAmps || 0) / (device.state.tripAmps || 6)) > 1 ? 'bg-danger' : 'bg-warning-fill'}`}
                style={{ width: `${Math.min(100, ((device.state.measuredAmps || 0) / (device.state.tripAmps || 6)) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block font-mono">
              Thermal image: {(device.state.measuredAmps || 0).toFixed(2)}A of {device.state.tripAmps || 6}A setting. Set Ir to the motor nameplate FLA.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => patchState('tripped', true)}
              disabled={!!device.state.tripped}
              className="py-2 text-xs font-black rounded-md border bg-danger-soft/80 hover:bg-danger-soft/90 text-danger border-danger/60 disabled:opacity-50"
            >
              TEST (Trip)
            </button>
            <button
              onClick={() => onPatchDeviceState ? onPatchDeviceState(device.id, { tripped: false, tripReason: undefined }) : onUpdateDeviceProperty(device.id, 'tripped', false)}
              disabled={!device.state.tripped}
              className="py-2 text-xs font-black rounded-md border bg-probe hover:bg-probe text-on-probe border-probe disabled:opacity-40"
            >
              R · RESET
            </button>
          </div>
          <span className="text-[9px] text-ink-muted block">
            95-96 NC is wired in series with the coil circuit; 97-98 NO lights a fault pilot lamp when tripped.
          </span>
        </div>
      )}

      {/* --- CONTROL TRANSFORMER --- */}
      {device && device.type === 'control_transformer' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Secondary (X1-X2)</label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.secondaryLive ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
              {device.state.secondaryLive ? `● ${device.state.secondaryVolts || 220}V LIVE` : '○ DE-ENERGIZED'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { k: 'Primary', v: `${device.state.primaryVolts || 440}V` },
              { k: 'Secondary', v: `${device.state.secondaryVolts || 220}V` },
              { k: 'Ratio', v: `${((device.state.primaryVolts || 440) / (device.state.secondaryVolts || 220)).toFixed(1)}:1` },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-border bg-surface text-ink py-1">
                <div className="text-[9px] font-bold text-ink-muted uppercase">{c.k}</div>
                <div className="text-xs font-mono font-black text-ink">{c.v}</div>
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">VA Rating</label>
            <div className="grid grid-cols-4 gap-1">
              {[100, 250, 500, 1000].map((va) => (
                <button
                  key={va}
                  onClick={() => onUpdateDeviceProperty(device.id, 'vaRating', va)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    (device.state.vaRating || 250) === va ? 'bg-surface-sunken text-ink border-border' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {va}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[9px] text-ink-muted block">
            Connect H1-H2 across two phases (e.g. L1-L2 at 440V). X1 becomes the 220V control hot rail, X2 the control return.
          </span>
        </div>
      )}

      {/* --- 3-PHASE 440V FEEDER --- */}
      {device && device.type === 'source_3phase_440v' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <button
            onClick={() => patchState('closed', device.state.closed === false)}
            className={`w-full py-2 text-xs font-black rounded-md border transition ${
              device.state.closed !== false ? 'bg-ok text-surface border-ok' : 'bg-surface-sunken text-ink border-border'
            }`}
          >
            {device.state.closed !== false ? '● MAIN ISOLATOR ON — L1 / L2 / L3 LIVE' : '○ MAIN ISOLATOR OFF'}
          </button>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { k: 'L1', c: 'bg-cond-red' },
              { k: 'L2', c: 'bg-cond-blue' },
              { k: 'L3', c: 'bg-cond-black ring-1 ring-wire-casing' },
            ].map((ph) => (
              <div key={ph.k} className="rounded-lg border border-border bg-surface text-ink py-1 flex items-center justify-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${ph.c}`} />
                <span className="text-xs font-mono font-black">{ph.k}</span>
                <span className="text-[9px] font-mono text-ink-muted">{Math.round((device.state.lineVoltage || 440) / Math.sqrt(3))}V</span>
              </div>
            ))}
          </div>
          <span className="text-[9px] text-ink-muted block font-mono">
            {device.state.lineVoltage || 440}V line-to-line · {device.state.frequency || 60}Hz · sequence L1→L2→L3 (CW).
          </span>
        </div>
      )}

      {/* --- FORWARD / REVERSE / STOP STATION --- */}
      {device && device.type === 'push_button_fwd_rev' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            Momentary Operators (hold to press)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'stopPressed', label: 'STOP', sub: 'NC 1-2', on: 'bg-danger text-surface border-danger', off: 'bg-danger-soft/80 text-danger border-danger/60' },
              { key: 'fwdPressed', label: 'FWD ▶', sub: 'NO 3-4', on: 'bg-ok text-surface border-ok', off: 'bg-ok-soft/80 text-ok border-ok/60' },
              { key: 'revPressed', label: '◀ REV', sub: 'NO 5-6', on: 'bg-warning-fill text-ink border-warning', off: 'bg-warning-soft/80 text-warning border-warning/60' },
            ].map((b) => (
              <button
                key={b.key}
                {...holdProps(device.id, b.key, onPatchDeviceState)}
                onClick={() => !onPatchDeviceState && onUpdateDeviceProperty(device.id, b.key, !device.state[b.key])}
                className={`py-2 rounded-md border text-xs font-black flex flex-col items-center transition ${device.state[b.key] ? b.on : b.off}`}
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
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center gap-2">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              Motor Status
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.motorFault ? 'bg-danger-soft/90 text-danger border border-danger/50 animate-pulse' : device.state.running ? (device.state.starterMode === 'wye' ? 'bg-warning-soft/90 text-warning border border-warning/50 animate-pulse' : 'bg-ok-soft/90 text-ok border border-ok/50 animate-pulse') : 'bg-surface-sunken text-ink border border-border'}`}>
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
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
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
                      ? 'bg-ok text-surface border-ok shadow-sm'
                      : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted mt-1 block font-mono">
              {device.type === 'motor_6lead_star_delta'
                ? `Rated: ${(device.state.wattage || 5500)} W · 6-Lead Y/Δ · line current ${(device.state.measuredAmps || 0).toFixed(2)} A. Star reduces starting current to 33%.`
                : `Rated: ${(device.state.wattage || 2200)} W · 440V 3-phase TEFC · line current ${(device.state.measuredAmps || 0).toFixed(2)} A. Swap any two of U1/V1/W1 to reverse rotation.`}
            </span>
          </div>
        </div>
      )}

      {/* --- MICRO PLC CONTROLLER CONTROLS --- */}
      {device && device.type === 'plc_micro_controller' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              PLC CPU Mode
            </label>
            <button
              onClick={() => onUpdateDeviceProperty(device.id, 'plcRun', device.state.plcRun === false ? true : false)}
              className={`text-xs font-bold font-mono px-3 py-1 rounded-lg border transition ${
                device.state.plcRun !== false
                  ? 'bg-ok text-surface border-ok shadow-sm'
                  : 'bg-warning-fill text-ink border-warning shadow-sm'
              }`}
            >
              {device.state.plcRun !== false ? 'RUN MODE' : 'STOP MODE'}
            </button>
          </div>
          <div className="bg-surface text-ink p-2 rounded-md font-mono text-[10px] space-y-1">
            <div className="flex justify-between border-b border-border pb-1">
              <span className="text-ink-muted">Digital Inputs:</span>
              <span className="text-probe">
                I1:{device.state.plcInputs?.i1 ? '1' : '0'} I2:{device.state.plcInputs?.i2 ? '1' : '0'} I3:{device.state.plcInputs?.i3 ? '1' : '0'} I4:{device.state.plcInputs?.i4 ? '1' : '0'}
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-ink-muted">Relay Outputs:</span>
              <span className="text-warning">
                Q1:{device.state.plcOutputs?.q1 ? '1' : '0'} Q2:{device.state.plcOutputs?.q2 ? '1' : '0'} Q3:{device.state.plcOutputs?.q3 ? '1' : '0'} Q4:{device.state.plcOutputs?.q4 ? '1' : '0'}
              </span>
            </div>
          </div>
          <span className="text-[9px] text-ink-muted block font-mono">
            Embedded Ladder: I1 → Coil Q1, I2 → Coil Q2.
          </span>
        </div>
      )}

      {/* --- DPDT ICE-CUBE RELAY CONTROLS --- */}
      {device && device.type === 'industrial_relay_dpdt' && (
        <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              Relay Coil Status (A1-A2)
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.coilEnergized ? 'bg-probe-soft/90 text-probe border border-probe/50' : 'bg-surface-sunken text-ink border border-border'}`}>
              {device.state.coilEnergized ? '● ENERGIZED' : '○ DE-ENERGIZED'}
            </span>
          </div>
          <span className="text-[9px] text-ink-muted block">
            8-Pin DPDT Form-C Contacts (Common 11/21, NC 12/22, NO 14/24).
          </span>
          <div className="grid grid-cols-2 gap-1">
            {[{ v: 'ac', label: 'AC coil' }, { v: 'dc24', label: '24 V DC coil' }].map((k) => (
              <button
                key={k.v}
                onClick={() => onUpdateDeviceProperty(device.id, 'coilType', k.v)}
                className={`py-1 rounded-lg border text-xs font-mono font-bold transition ${
                  (device.state.coilType || 'ac') === k.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-ink-muted block">
            A DC coil: A1 = +24 V, A2 = 0 V. Never wire it to an AC line.
          </span>
        </div>
      )}

      {/* --- PROTECTION & METERING (batch 3.1) --- */}
      {device && (() => {
        type Opt = { v: string | number | boolean; label: string };
        const CONTROLS: Record<string, { label: string; key: string; opts: Opt[]; fallback: string | number | boolean }[]> = {
          rcd_4p: [{ label: 'Sensitivity IΔn', key: 'sensitivityMa', opts: [{ v: 30, label: '30 mA' }, { v: 100, label: '100 mA' }, { v: 300, label: '300 mA' }], fallback: 30 }],
          afdd_1pn: [{ label: 'Rated current', key: 'ratedAmps', opts: [{ v: 10, label: '10 A' }, { v: 16, label: '16 A' }, { v: 20, label: '20 A' }], fallback: 16 }],
          mccb_3p: [
            { label: 'In (frame rating)', key: 'ratedAmps', opts: [{ v: 63, label: '63 A' }, { v: 100, label: '100 A' }, { v: 160, label: '160 A' }], fallback: 100 },
            { label: 'Ir long-time dial (× In)', key: 'irFactor', opts: [{ v: 0.4, label: '0.4' }, { v: 0.6, label: '0.6' }, { v: 0.8, label: '0.8' }, { v: 1, label: '1.0' }], fallback: 1 },
            { label: 'Im magnetic dial (× Ir)', key: 'imFactor', opts: [{ v: 2, label: '2' }, { v: 5, label: '5' }, { v: 8, label: '8' }, { v: 10, label: '10' }], fallback: 5 },
            { label: 'Shunt trip coil C1-C2', key: 'shuntTrip', opts: [{ v: false, label: 'Not fitted' }, { v: true, label: 'Fitted' }], fallback: false },
            { label: 'Undervoltage release D1-D2', key: 'uvRelease', opts: [{ v: false, label: 'Not fitted' }, { v: true, label: 'Fitted' }], fallback: false },
          ],
          mpcb_3p: [{ label: 'Ir dial (motor FLA)', key: 'irAmps', opts: [{ v: 2.5, label: '2.5 A' }, { v: 4, label: '4 A' }, { v: 6.3, label: '6.3 A' }, { v: 10, label: '10 A' }, { v: 16, label: '16 A' }], fallback: 6.3 }],
          rotary_isolator_3p: [{ label: 'Padlock', key: 'locked', opts: [{ v: false, label: 'Free' }, { v: true, label: 'Locked OFF' }], fallback: false }],
          voltage_relay: [
            { label: 'Nominal voltage', key: 'nominalV', opts: [{ v: 220, label: '220 V' }, { v: 230, label: '230 V' }, { v: 440, label: '440 V' }], fallback: 220 },
            { label: 'Under-voltage threshold', key: 'underPct', opts: [{ v: 5, label: '−5 %' }, { v: 10, label: '−10 %' }, { v: 15, label: '−15 %' }, { v: 20, label: '−20 %' }], fallback: 15 },
            { label: 'Over-voltage threshold', key: 'overPct', opts: [{ v: 5, label: '+5 %' }, { v: 10, label: '+10 %' }, { v: 15, label: '+15 %' }], fallback: 10 },
            { label: 'Delay', key: 'delaySec', opts: [{ v: 0, label: '0 s' }, { v: 2, label: '2 s' }, { v: 5, label: '5 s' }], fallback: 2 },
          ],
          earth_leakage_relay: [
            { label: 'Sensitivity', key: 'sensitivityMa', opts: [{ v: 30, label: '30 mA' }, { v: 100, label: '100 mA' }, { v: 300, label: '300 mA' }, { v: 1000, label: '1 A' }], fallback: 300 },
            { label: 'Delay', key: 'delaySec', opts: [{ v: 0, label: '0 s' }, { v: 0.3, label: '0.3 s' }, { v: 1, label: '1 s' }], fallback: 0.3 },
          ],
          ptc_relay: [{ label: 'Response temperature', key: 'tripTempC', opts: [{ v: 100, label: '100 °C' }, { v: 120, label: '120 °C' }, { v: 140, label: '140 °C' }], fallback: 120 }],
          current_transformer: [{ label: 'Primary rating (secondary 5 A)', key: 'primaryA', opts: [{ v: 50, label: '50 A' }, { v: 100, label: '100 A' }, { v: 200, label: '200 A' }, { v: 400, label: '400 A' }], fallback: 100 }],
          panel_ammeter: [{ label: 'Full scale (primary)', key: 'fullScaleA', opts: [{ v: 50, label: '50 A' }, { v: 100, label: '100 A' }, { v: 200, label: '200 A' }, { v: 400, label: '400 A' }], fallback: 100 }],
          terminal_block: [{ label: 'Kind', key: 'kind', opts: [{ v: 'feedthrough', label: 'Feed-through' }, { v: 'fused', label: 'Fused' }, { v: 'pe', label: 'PE' }], fallback: 'feedthrough' }],
        };
        const controls = CONTROLS[device.type];
        const isMotor = device.type === 'motor_ac_industrial' || device.type === 'pump_booster_3p' || device.type === 'motor_6lead_star_delta';
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const motors = (devices || []).filter((d) => d.type === 'motor_ac_industrial' || d.type === 'pump_booster_3p' || d.type === 'motor_6lead_star_delta');
        const btn = (label: string, key: string, v: string | number | boolean, fb: string | number | boolean) => (
          <button
            key={String(v)}
            onClick={() => apply({ [key]: v })}
            className={`py-1 rounded-lg border text-xs font-mono font-bold transition ${(device.state[key] ?? fb) === v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'}`}
          >
            {label}
          </button>
        );
        const row = (label: string, key: string, opts: Opt[], fb: string | number | boolean) => (
          <div key={key}>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">{label}</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${opts.length}, minmax(0, 1fr))` }}>{opts.map((o) => btn(o.label, key, o.v, fb))}</div>
          </div>
        );
        const hasFaultControls = isMotor || device.category === 'load' || device.type.startsWith('appliance_') || device.type === 'socket_duplex' || device.type === 'socket_schuko';
        if (!controls && !isMotor && device.type !== 'ptc_relay' && !hasFaultControls) return null;
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            {controls && <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Settings</label>}
            {controls?.map((c) => row(c.label, c.key, c.opts, c.fallback))}
            {device.type === 'ptc_relay' && (
              <div>
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">Watches motor</div>
                <select
                  value={String(device.state.motorId || '')}
                  onChange={(e) => apply({ motorId: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs font-mono text-ink"
                >
                  <option value="">(none)</option>
                  {motors.map((m) => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                </select>
              </div>
            )}
            {isMotor && (
              <>
                {row('Shaft load', 'loadPct', [{ v: 100, label: '100 %' }, { v: 125, label: '125 %' }, { v: 150, label: '150 %' }], 100)}
                <div className="text-[10px] font-mono text-ink-muted">Winding temperature {Number(device.state.windingC) || 40} °C</div>
              </>
            )}
            {hasFaultControls && (
              <>
                {row('Earth-leakage fault', 'hasEarthFault', [{ v: false, label: 'None' }, { v: true, label: 'Leaking' }], false)}
                {row('Leakage current', 'faultMa', [{ v: 5, label: '5 mA' }, { v: 30, label: '30 mA' }, { v: 100, label: '100 mA' }, { v: 500, label: '500 mA' }], 500)}
                {row('Loose terminal (series arc)', 'looseTerminal', [{ v: false, label: 'Tight' }, { v: true, label: 'Loose' }], false)}
              </>
            )}
          </div>
        );
      })()}

      {/* --- INSULATION / EARTH CONDITION (read back by the test instruments) --- */}
      {device && (device.type === 'motor_ac_industrial' || device.type === 'motor_6lead_star_delta' || device.type === 'motor_1p' || device.type === 'pump_booster_3p' || device.type === 'ground_pit') && (() => {
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const isPit = device.type === 'ground_pit';
        const key = isPit ? 'earthResistanceOhms' : 'insulationMOhm';
        const opts = isPit
          ? [{ v: 2, label: '2 Ω' }, { v: 5, label: '5 Ω' }, { v: 25, label: '25 Ω' }, { v: 60, label: '60 Ω' }]
          : [{ v: 999, label: 'Good' }, { v: 2, label: 'Degraded' }, { v: 0.3, label: 'Damaged' }];
        const current = Number(device.state[key] ?? (isPit ? 4.8 : 999));
        return (
          <div className="space-y-2 mt-2 pt-2 border-t border-border/80">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              {isPit ? 'Electrode Resistance (what the earth tester reads)' : 'Winding Insulation (what the insulation tester reads)'}
            </label>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${opts.length}, minmax(0, 1fr))` }}>
              {opts.map((o) => (
                <button
                  key={o.v}
                  onClick={() => apply({ [key]: o.v })}
                  className={`py-1 rounded-lg border text-xs font-mono font-bold transition ${current === o.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* --- SINGLE-PHASE MOTOR + CAPACITOR --- */}
      {device && (device.type === 'motor_1p' || device.type === 'capacitor_run') && (() => {
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const choice = (label: string, key: string, options: { v: string | number | boolean; label: string }[], fallback: string | number | boolean) => (
          <div>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">{label}</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
              {options.map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => apply({ [key]: o.v })}
                  className={`py-1 rounded-lg border text-xs font-mono font-bold transition ${
                    (device.state[key] ?? fallback) === o.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
        const note = (device.state.motorFault || device.state.motorNote) as string | undefined;
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            {device.type === 'motor_1p' ? (
              <>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Single-Phase Motor</label>
                {choice('Type', 'motorKind', [{ v: 'split_phase', label: 'Split-phase' }, { v: 'capacitor_start', label: 'Cap-start' }, { v: 'psc', label: 'PSC' }], 'capacitor_start')}
                <div className="text-[10px] font-mono text-ink-muted">
                  Speed {Math.round(Number(device.state.speedPct) || 0)} % · centrifugal switch {device.state.motorKind === 'psc' ? 'none' : device.state.centrifugalOpen ? 'OPEN' : 'closed'} · {Number(device.state.measuredAmps || 0).toFixed(1)} A
                </div>
              </>
            ) : (
              <>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Motor Capacitor</label>
                {choice('Value', 'uF', [{ v: 12, label: '12 µF' }, { v: 25, label: '25 µF' }, { v: 50, label: '50 µF' }, { v: 100, label: '100 µF' }, { v: 150, label: '150 µF' }], 100)}
                {choice('Condition', 'open', [{ v: false, label: 'Good' }, { v: true, label: 'Failed open' }], false)}
              </>
            )}
            {note && <div className="text-[10px] font-bold text-danger bg-danger-soft/60 border border-danger/40 rounded-lg px-2 py-1">{note}</div>}
          </div>
        );
      })()}

      {/* --- ANNUNCIATORS: buzzer, beacon, tower light --- */}
      {device && (device.type === 'buzzer_horn' || device.type === 'beacon' || device.type === 'tower_light') && (() => {
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const choice = (label: string, key: string, options: { v: string | boolean; label: string }[], fallback: string | boolean) => (
          <div>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">{label}</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
              {options.map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => apply({ [key]: o.v })}
                  className={`py-1 rounded-lg border text-xs font-mono font-bold transition ${
                    (device.state[key] ?? fallback) === o.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Annunciator</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.active ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
                {device.state.active ? (device.type === 'buzzer_horn' ? '● SOUNDING' : '● LIT') : '○ OFF'}
              </span>
            </div>
            {choice('Supply', 'supply', [{ v: 'ac230', label: '230 V AC' }, { v: 'dc24', label: '24 V DC' }], 'ac230')}
            {device.type === 'beacon' && (
              <>
                {choice('Mode', 'mode', [{ v: 'steady', label: 'Steady' }, { v: 'flashing', label: 'Flashing' }], 'steady')}
                {choice('Colour', 'color', [{ v: 'red', label: 'Red' }, { v: 'amber', label: 'Amber' }, { v: 'green', label: 'Green' }, { v: 'blue', label: 'Blue' }], 'red')}
              </>
            )}
            {device.type === 'buzzer_horn' && choice('Sound', 'muted', [{ v: false, label: 'On' }, { v: true, label: 'Muted' }], false)}
          </div>
        );
      })()}

      {/* --- 24 V DC DOMAIN: supply, sensors, PLC --- */}
      {device && (device.type === 'psu_24vdc' || device.type === 'sensor_inductive' || device.type === 'sensor_capacitive' || device.type === 'sensor_photoelectric' || device.type === 'plc_24vdc_16io' || device.type === 'plc_24vdc_32io') && (() => {
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const choice = (label: string, key: string, options: { v: string | number | boolean; label: string }[], fallback: string | number | boolean) => (
          <div>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">{label}</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
              {options.map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => apply({ [key]: o.v })}
                  className={`py-1 rounded-lg border text-xs font-mono font-bold transition ${
                    (device.state[key] ?? fallback) === o.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
        const note = (device.state.psuFault || device.state.wiringNote || device.state.supplyNote || device.state.dcNote) as string | undefined;
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">24 V DC Control Domain</label>
            {device.type === 'psu_24vdc' && choice('Rated current', 'ratedAmps', [{ v: 2.5, label: '2.5 A' }, { v: 5, label: '5 A' }, { v: 10, label: '10 A' }], 5)}
            {device.type.startsWith('sensor_') && (
              <>
                {choice('Output', 'output', [{ v: 'PNP', label: 'PNP' }, { v: 'NPN', label: 'NPN' }], 'PNP')}
                {choice('Contact', 'contact', [{ v: 'NO', label: 'NO' }, { v: 'NC', label: 'NC' }], 'NO')}
                {choice('Target', 'detected', [{ v: false, label: 'Clear' }, { v: true, label: 'Detected' }], false)}
              </>
            )}
            {(device.type === 'plc_24vdc_16io' || device.type === 'plc_24vdc_32io') && (
              <>
                {choice('CPU', 'plcRunning', [{ v: true, label: 'RUN' }, { v: false, label: 'STOP' }], true)}
                {choice('Program', 'program', [{ v: 'passthrough', label: 'Qn = In' }, { v: 'start_stop_latch', label: 'Start/Stop' }], 'passthrough')}
                {choice('Inputs', 'inputMode', [{ v: 'sinking', label: 'Sinking (PNP)' }, { v: 'sourcing', label: 'Sourcing (NPN)' }], 'sinking')}
              </>
            )}
            {note && <div className="text-[10px] font-bold text-danger bg-danger-soft/60 border border-danger/40 rounded-lg px-2 py-1">{note}</div>}
          </div>
        );
      })()}

      {/* --- FUSE HOLDER / FUSE SWITCH DISCONNECTOR --- */}
      {device && (device.type === 'fuse_holder_1p' || device.type === 'fuse_switch_disconnector_3p') && (() => {
        const is3p = device.type === 'fuse_switch_disconnector_3p';
        const kind = (device.state.fuseKind as string) || 'gG';
        const rated = Number(device.state.ratedAmps) || (is3p ? 32 : 16);
        const links = is3p ? (['l1', 'l2', 'l3'] as const) : ([] as const);
        const blown1p = !!device.state.blown || !!device.state.tripped;
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const replaceAll = () =>
          apply(
            is3p
              ? { blown_l1: false, blown_l2: false, blown_l3: false, heat_l1: 0, heat_l2: 0, heat_l3: 0, onSec_l1: 0, onSec_l2: 0, onSec_l3: 0 }
              : { blown: false, tripped: false, closed: true, heat: 0, onSec: 0, tripReason: undefined }
          );
        const anyBlown = is3p ? links.some((p) => !!device.state[`blown_${p}`]) : blown1p;
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                {is3p ? 'Fuse Links (3P)' : 'Fuse Link'}
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${anyBlown ? 'bg-danger-soft/90 text-danger border border-danger/50 animate-pulse' : 'bg-ok-soft/90 text-ok border border-ok/50'}`}>
                {anyBlown ? '⚠ LINK BLOWN' : '● INTACT'}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Link Type</label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { v: 'gG', label: 'gG', sub: 'cable protection' },
                  { v: 'aM', label: 'aM', sub: 'motor short-circuit' },
                ].map((k) => (
                  <button
                    key={k.v}
                    onClick={() => apply({ fuseKind: k.v })}
                    className={`py-1 rounded-lg border text-xs font-mono font-bold flex flex-col items-center transition ${
                      kind === k.v ? 'bg-ok text-surface border-ok shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                    }`}
                  >
                    {k.label}
                    <span className="text-[9px] font-sans font-normal opacity-80">{k.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Rated Current</label>
              <div className="grid grid-cols-4 gap-1">
                {FUSE_RATINGS.map((a) => (
                  <button
                    key={a}
                    onClick={() => apply({ ratedAmps: a })}
                    className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                      rated === a ? 'bg-ok text-surface border-ok shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                    }`}
                  >
                    {a}A
                  </button>
                ))}
              </div>
            </div>

            {is3p && (
              <button
                onClick={() => apply({ closed: device.state.closed === false })}
                className={`w-full py-1.5 rounded-lg border text-xs font-bold transition ${
                  device.state.closed === false ? 'bg-warning-soft text-warning border-warning/60' : 'bg-ok-soft text-ok border-ok/60'
                }`}
              >
                {device.state.closed === false ? 'HANDLE OPEN (isolated): click to close' : 'HANDLE CLOSED: click to open'}
              </button>
            )}

            {is3p && (
              <div className="grid grid-cols-3 gap-1">
                {links.map((p) => {
                  const blown = !!device.state[`blown_${p}`];
                  return (
                    <div key={p} className={`rounded-md border px-1 py-1 text-center text-[10px] font-mono font-bold ${blown ? 'bg-danger-soft/80 text-danger border-danger/60' : 'bg-surface-sunken text-ink border-border'}`}>
                      {p.toUpperCase()} {blown ? 'BLOWN' : 'OK'}
                    </div>
                  );
                })}
              </div>
            )}

            {anyBlown && (
              <button
                onClick={replaceAll}
                className="w-full py-1.5 rounded-lg border border-probe/60 bg-probe-soft/80 text-probe text-xs font-bold hover:bg-probe-soft transition"
              >
                Replace fuse{is3p ? ' links' : ''}
              </button>
            )}

            <span className="text-[9px] text-ink-muted block">
              {kind === 'aM'
                ? 'aM links protect against short circuit only (no overload protection) and ride through a motor start (about 6x for 5 s).'
                : 'gG links melt on overload (1.6x in about an hour, 2.5x in about 100 s) and instantly on a short circuit. A gG link sized close to the motor current can blow on the start inrush: use aM for motors.'}{' '}
              Thermal model runs 20x faster than real time so an overload can be watched.
            </span>
          </div>
        );
      })()}

      {/* --- GENERATING SET --- */}
      {device && (device.type === 'generator_set_1p' || device.type === 'generator_set_3p') && (() => {
        const is3p = device.type === 'generator_set_3p';
        const running = !!device.state.running && !device.state.overloaded;
        const overloaded = !!device.state.overloaded;
        const requested = !!device.state.runRequested || !!device.state.remoteStart;
        const status = overloaded ? 'OVERLOAD TRIP' : running ? 'RUNNING' : requested ? 'STARTING' : 'STANDBY';
        const rated = Number(device.state.ratedKva) || (is3p ? 20 : 5);
        const kvaOptions = is3p ? [10, 20, 30, 50] : [3, 5, 8, 10];
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Generating Set</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${overloaded ? 'bg-danger-soft/90 text-danger border border-danger/50 animate-pulse' : running ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
                {status}
              </span>
            </div>
            <button
              onClick={() => patchState('runRequested', !device.state.runRequested)}
              className={`w-full py-1.5 rounded-lg border text-xs font-bold transition ${
                device.state.runRequested ? 'bg-danger-soft text-danger border-danger/60' : 'bg-ok-soft text-ok border-ok/60'
              }`}
            >
              {device.state.runRequested ? 'STOP SET' : 'START SET (3 s start delay)'}
            </button>
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Rated Output (kVA)</label>
              <div className="grid grid-cols-4 gap-1">
                {kvaOptions.map((k) => (
                  <button
                    key={k}
                    onClick={() => patchState('ratedKva', k)}
                    className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                      rated === k ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface-sunken p-2.5 rounded-md border border-border grid grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <span className="text-[9px] text-ink-muted block font-sans">LOAD</span>
                <span className="font-bold text-ink">{(Number(device.state.loadKw) || 0).toFixed(2)} kW</span>
              </div>
              <div>
                <span className="text-[9px] text-ink-muted block font-sans">VOLTAGE</span>
                <span className="font-bold text-ink">{device.state.voltage || (is3p ? 440 : 230)} V</span>
              </div>
              <div>
                <span className="text-[9px] text-ink-muted block font-sans">FREQUENCY</span>
                <span className="font-bold text-ink">{device.state.frequencyHz || 60} Hz</span>
              </div>
            </div>
            <span className="text-[9px] text-ink-muted block">
              {device.state.remoteStart
                ? 'Remote start contact is closed: the set runs until it opens.'
                : 'Wire a closed contact (for example a loss-of-mains relay NC contact) between START A and START B to start the set automatically. A load above the rating for 2 s trips the set.'}
            </span>
          </div>
        );
      })()}

      {/* --- AUTOMATIC TRANSFER SWITCH --- */}
      {device && device.type === 'ats_changeover' && (() => {
        const delay = typeof device.state.transferDelaySec === 'number' ? device.state.transferDelaySec : 0;
        const auto = device.state.autoMode !== false;
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Transfer Switch</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.source === 'generator' ? 'bg-warning-soft/90 text-warning border border-warning/50' : 'bg-ok-soft/90 text-ok border border-ok/50'}`}>
                {device.state.source === 'generator' ? 'ON GENERATOR' : 'ON GRID'}
              </span>
            </div>
            <button
              onClick={() => patchState('autoMode', !auto)}
              className={`w-full py-1.5 rounded-lg border text-xs font-bold transition ${auto ? 'bg-ok-soft text-ok border-ok/60' : 'bg-surface/90 text-ink border-border'}`}
            >
              {auto ? 'AUTO: transfers on grid loss' : 'MANUAL: click the handle on the device'}
            </button>
            <div>
              <div className="flex justify-between text-[10px] text-ink-muted mb-0.5">
                <span className="font-bold uppercase tracking-wider">Transfer Delay</span>
                <span className="font-mono text-ink font-bold">{delay === 0 ? 'instant' : `${delay} s`}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={delay}
                onChange={(e) => patchState('transferDelaySec', Number(e.target.value))}
                className="w-full accent-probe cursor-pointer h-1.5 bg-surface-sunken rounded-lg"
              />
            </div>
            <span className="text-[9px] text-ink-muted block">
              Grid dead and generator live: the load moves to the generator after the delay (the load is dead meanwhile). When the grid returns the load goes back at once. The two sources are never connected together.
            </span>
          </div>
        );
      })()}

      {/* --- FLOAT SWITCH / PRESSURE SWITCH / PUMPS (shared process model) --- */}
      {device && (device.type === 'float_switch' || device.type === 'pressure_switch') && (() => {
        const isFloat = device.type === 'float_switch';
        const proc = process || { tankLevel: 50, lineBar: 0, drawOffLpm: 10 };
        const closed = !!device.state.contactClosed;
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const slider = (label: string, value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void) => (
          <div>
            <div className="flex justify-between text-[10px] text-ink-muted mb-0.5">
              <span className="font-bold uppercase tracking-wider">{label}</span>
              <span className="font-mono text-ink font-bold">{value} {unit}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full accent-probe cursor-pointer h-1.5 bg-surface-sunken rounded-lg"
            />
          </div>
        );
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                {isFloat ? 'Level Switch' : 'Pressure Switch'}
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${closed ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
                {closed ? 'COM-NO CLOSED' : 'COM-NC CLOSED'}
              </span>
            </div>
            {isFloat ? (
              <>
                {slider('Tank Level', Math.round(proc.tankLevel), 0, 100, 1, '%', (v) => onUpdateProcess?.({ tankLevel: v }))}
                {slider('High Trip', Number(device.state.highTrip) || 70, 10, 100, 1, '%', (v) => apply({ highTrip: v }))}
                {slider('Low Trip', Number(device.state.lowTrip) || 30, 0, 90, 1, '%', (v) => apply({ lowTrip: v }))}
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { v: 'NO_on_rise', label: 'NO on rise', sub: 'closes at high level' },
                    { v: 'NC_on_rise', label: 'NC on rise', sub: 'closes at low level' },
                  ].map((k) => (
                    <button
                      key={k.v}
                      onClick={() => apply({ contactForm: k.v })}
                      className={`py-1 rounded-lg border text-xs font-mono font-bold flex flex-col items-center transition ${
                        (device.state.contactForm || 'NO_on_rise') === k.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                      }`}
                    >
                      {k.label}
                      <span className="text-[9px] font-sans font-normal opacity-80">{k.sub}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {slider('Line Pressure', Number(proc.lineBar.toFixed(2)), 0, 5, 0.1, 'bar', (v) => onUpdateProcess?.({ lineBar: v }))}
                {slider('Cut-In (pump on)', Number(device.state.cutIn) || 2, 0.5, 4.5, 0.1, 'bar', (v) => apply({ cutIn: v }))}
                {slider('Cut-Out (pump off)', Number(device.state.cutOut) || 3, 0.5, 5, 0.1, 'bar', (v) => apply({ cutOut: v }))}
              </>
            )}
            {slider('Draw-Off (consumers)', Math.round(proc.drawOffLpm), 0, 60, 1, 'L/min', (v) => onUpdateProcess?.({ drawOffLpm: v }))}
            <span className="text-[9px] text-ink-muted block">
              {isFloat
                ? 'The contacts change at the trip levels and hold in between (hysteresis). A running pump raises the shared tank level; the draw-off slider drains it. The process runs 30x faster than real time.'
                : 'com-no closes when the pressure falls to cut-in and opens at cut-out. A running pump raises the line pressure; the draw-off slider lowers it.'}
            </span>
          </div>
        );
      })()}

      {device && (device.type === 'pump_booster_1p' || device.type === 'pump_booster_3p') && (() => {
        const kwNow = Number(device.state.kw) || (device.type === 'pump_booster_3p' ? 1.5 : 0.75);
        const options = device.type === 'pump_booster_3p' ? [0.75, 1.5, 2.2, 3.7] : [0.37, 0.75, 1.1, 1.5];
        const setKw = (k: number) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, { kw: k, wattage: k * 1000 });
          else {
            onUpdateDeviceProperty(device.id, 'kw', k);
            onUpdateDeviceProperty(device.id, 'wattage', k * 1000);
          }
        };
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Booster Pump</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.pumping ? 'bg-ok-soft/90 text-ok border border-ok/50' : 'bg-surface-sunken text-ink border border-border'}`}>
                {device.state.motorFault ? `⚠ ${device.state.motorFault}` : device.state.pumping ? '● PUMPING' : '○ STOPPED'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {options.map((k) => (
                <button
                  key={k}
                  onClick={() => setKw(k)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition ${
                    kwNow === k ? 'bg-ok text-surface border-ok shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                  }`}
                >
                  {k} kW
                </button>
              ))}
            </div>
            <span className="text-[9px] text-ink-muted block">
              While pumping, the pump adds 40 L/min per kW to the shared tank and raises the line pressure.
            </span>
          </div>
        );
      })()}

      {/* --- BATCH 3.2: SOURCES AND POWER SYSTEMS (adjustable properties) --- */}
      {device && (() => {
        type Spec = { key: string; label: string; min: number; max: number; step: number; unit: string; def: number };
        const SPECS: Record<string, Spec[]> = {
          pv_string: [
            { key: 'irradiance', label: 'Irradiance', min: 0, max: 100, step: 5, unit: '%', def: 100 },
            { key: 'kwp', label: 'Peak power', min: 1, max: 6, step: 0.5, unit: 'kWp', def: 3 },
          ],
          inverter_gridtie: [{ key: 'ratedW', label: 'Rated output', min: 1000, max: 6000, step: 500, unit: 'W', def: 3000 }],
          ups_battery: [
            { key: 'capacityWh', label: 'Battery capacity', min: 50, max: 2000, step: 50, unit: 'Wh', def: 500 },
            { key: 'socPct', label: 'State of charge', min: 0, max: 100, step: 5, unit: '%', def: 100 },
          ],
          transformer_1p_pole: [
            { key: 'ratio', label: 'Turns ratio (primary : secondary)', min: 1, max: 4, step: 0.01, unit: ': 1', def: 1.91 },
            { key: 'kva', label: 'Rating', min: 1, max: 100, step: 1, unit: 'kVA', def: 25 },
            { key: 'regulationPct', label: 'Regulation at full load', min: 1, max: 8, step: 0.5, unit: '%', def: 3 },
          ],
          transformer_3p_delta_wye: [
            { key: 'ratio', label: 'Turns ratio (line : line)', min: 0.5, max: 4, step: 0.05, unit: ': 1', def: 1.1 },
            { key: 'kva', label: 'Rating', min: 10, max: 500, step: 5, unit: 'kVA', def: 75 },
            { key: 'regulationPct', label: 'Regulation at full load', min: 1, max: 8, step: 0.5, unit: '%', def: 3 },
          ],
          capacitor_bank_3p: [
            { key: 'kvarPerStep', label: 'Step size', min: 1, max: 25, step: 1, unit: 'kvar', def: 5 },
            { key: 'steps', label: 'Steps', min: 1, max: 4, step: 1, unit: '', def: 4 },
          ],
          pf_controller: [
            { key: 'targetPf', label: 'Target power factor', min: 0.8, max: 1, step: 0.01, unit: '', def: 0.95 },
            { key: 'stepDelaySec', label: 'Step delay', min: 1, max: 20, step: 1, unit: 's', def: 2 },
          ],
          reverse_power_relay: [{ key: 'delaySec', label: 'Trip delay', min: 1, max: 20, step: 1, unit: 's', def: 3 }],
          preferential_trip_relay: [
            { key: 'thresholdPct', label: 'Threshold (of kVA rating)', min: 50, max: 100, step: 1, unit: '%', def: 90 },
            { key: 'delaySec', label: 'Trip delay', min: 0.5, max: 2, step: 0.5, unit: 's', def: 0.5 },
          ],
          generator_set_1p: [{ key: 'freqOffsetHz', label: 'Frequency offset (speed)', min: -1, max: 1, step: 0.05, unit: 'Hz', def: 0 }],
          generator_set_3p: [{ key: 'freqOffsetHz', label: 'Frequency offset (speed)', min: -1, max: 1, step: 0.05, unit: 'Hz', def: 0 }],
        };
        const specs = SPECS[device.type];
        const isGen = device.type === 'generator_set_1p' || device.type === 'generator_set_3p';
        const isFeeder = device.type === 'source_3phase_440v';
        const isTransformer = device.type.startsWith('transformer_');
        if (!specs && !isFeeder) return null;
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
          else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const hint: Record<string, string> = {
          pv_string: 'Power follows the irradiance. Click the panel on the device to switch between sun and night.',
          inverter_gridtie: 'Exports only while it sees the grid on its AC terminals (anti-islanding); waits 5 s after the grid returns. The meter does the import / export accounting.',
          ups_battery: 'On loss of input the battery drives the output until it is empty. Energy runs 60x faster than real time so a discharge can be watched.',
          transformer_1p_pole: 'Secondary = primary / ratio. The loaded voltage drops by the regulation at the present load.',
          transformer_3p_delta_wye: 'Dyn11 delta-wye. Secondary line voltage = primary line voltage / ratio. The 30 degree phase shift is not modelled.',
          capacitor_bank_3p: 'Step i is switched in by its control input c_i against cn. A step needs 3 s to discharge before it can be switched in again.',
          pf_controller: 'Wire com to a control supply and k1-k4 to the bank control inputs. It adds a step while the plant lags and removes one when it is over-corrected.',
          reverse_power_relay: 'Wire the sense terminals to the generator output. Set the generator to Motoring (engine failure) to see it trip.',
          preferential_trip_relay: 'Wire the sense terminals to the generator output and the contact to a shunt trip. It latches: press RESET on the device to clear it.',
        };
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
              {isFeeder ? 'Feeder Earthing' : isGen ? 'Paralleling' : 'Adjustments'}
            </label>
            {isFeeder && (
              <div className="grid grid-cols-2 gap-1">
                {[
                  { v: 'solid', label: 'Solidly earthed', sub: 'TN: PE is the earth reference' },
                  { v: 'isolated', label: 'Isolated (IT)', sub: 'first earth fault tolerated' },
                ].map((k) => (
                  <button
                    key={k.v}
                    onClick={() => apply({ earthing: k.v })}
                    className={`py-1 rounded-lg border text-xs font-mono font-bold flex flex-col items-center transition ${
                      (device.state.earthing || 'solid') === k.v ? 'bg-probe text-on-probe border-probe shadow-sm' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                    }`}
                  >
                    {k.label}
                    <span className="text-[9px] font-sans font-normal opacity-80">{k.sub}</span>
                  </button>
                ))}
              </div>
            )}
            {(specs || []).map((sp) => {
              const raw = Number(device.state[sp.key]);
              const value = Number.isFinite(raw) && device.state[sp.key] !== undefined ? raw : sp.def;
              return (
                <div key={sp.key}>
                  <div className="flex justify-between text-[10px] text-ink-muted mb-0.5">
                    <span className="font-bold uppercase tracking-wider">{sp.label}</span>
                    <span className="font-mono text-ink font-bold">{value} {sp.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={sp.min}
                    max={sp.max}
                    step={sp.step}
                    value={value}
                    onChange={(e) => apply({ [sp.key]: Number(e.target.value) })}
                    className="w-full accent-probe cursor-pointer h-1.5 bg-surface-sunken rounded-lg"
                  />
                </div>
              );
            })}
            {isGen && (
              <button
                onClick={() => apply({ motoring: !device.state.motoring })}
                className={`w-full py-1.5 rounded-lg border text-xs font-bold transition ${
                  device.state.motoring ? 'bg-danger-soft text-danger border-danger/60' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'
                }`}
              >
                {device.state.motoring ? '⚠ MOTORING (engine failure): click to clear' : 'Simulate engine failure (motoring)'}
              </button>
            )}
            {isTransformer && (
              <div className="bg-surface-sunken p-2.5 rounded-md border border-border grid grid-cols-3 gap-2 text-xs font-mono">
                <div><span className="text-[9px] text-ink-muted block font-sans">PRIMARY</span><span className="font-bold text-ink">{device.state.primaryV || 0} V</span></div>
                <div><span className="text-[9px] text-ink-muted block font-sans">NO LOAD</span><span className="font-bold text-ink">{device.state.secondaryUnloadedV || 0} V</span></div>
                <div><span className="text-[9px] text-ink-muted block font-sans">LOADED</span><span className="font-bold text-ink">{device.state.secondaryLoadedV || 0} V</span></div>
              </div>
            )}
            {hint[device.type] && <span className="text-[9px] text-ink-muted block">{hint[device.type]}</span>}
            {isGen && <span className="text-[9px] text-ink-muted block">A frequency offset makes the set slip against another one so a synchroscope shows a rotating phase difference (slowed 4x).</span>}
          </div>
        );
      })()}

      {/* --- GENERIC DEVICE MODULES (batches 3.3 onward): controls from data/moduleSpecs.ts --- */}
      {device && (
        <ModuleInspector
          device={device}
          devices={devices || []}
          apply={(patch) => {
            if (onPatchDeviceState) onPatchDeviceState(device.id, patch);
            else Object.entries(patch).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
          }}
        />
      )}

      {/* --- TIMER RELAY (KT) --- */}
      {device && device.type === 'timer_relay' && (() => {
        const mode = (device.state.timerMode as TimerMode) || 'on_delay';
        const delay = typeof device.state.delaySec === 'number' ? device.state.delaySec : 5;
        const reset = { elapsedSec: 0, timedOut: false, oneShotDone: false };
        const apply = (patch: Record<string, any>) => {
          if (onPatchDeviceState) onPatchDeviceState(device.id, { ...patch, ...reset });
          else Object.entries({ ...patch, ...reset }).forEach(([k, v]) => onUpdateDeviceProperty(device.id, k, v));
        };
        const hints: Record<TimerMode, string> = {
          on_delay: 'Coil on: contacts transfer after the delay. Coil off: they release at once.',
          off_delay: 'Coil on: contacts transfer at once. Coil off: they release after the delay.',
          flasher: 'While the coil is on the contacts toggle every delay period. Coil off resets it.',
          one_shot: 'Coil on: contacts transfer for one delay period, then release even if the coil stays on. Re-arms when the coil drops.',
        };
        return (
          <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
            <div className="flex justify-between items-center gap-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Timer Function</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${device.state.timedOut ? 'bg-warning-soft/90 text-warning border border-warning/50' : 'bg-surface-sunken text-ink border border-border'}`}>
                {device.state.timedOut ? '15-18 CLOSED' : '15-16 CLOSED'}
              </span>
            </div>
            <select
              value={mode}
              onChange={(e) => apply({ timerMode: e.target.value })}
              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-ink font-mono focus:outline-none focus:border-probe"
            >
              {(Object.keys(TIMER_MODE_LABEL) as TimerMode[]).map((m) => (
                <option key={m} value={m}>{TIMER_MODE_LABEL[m]}</option>
              ))}
            </select>
            <div>
              <div className="flex justify-between text-[10px] text-ink-muted mb-0.5">
                <span className="font-bold uppercase tracking-wider">Delay</span>
                <span className="font-mono text-ink font-bold">{delay} s</span>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={delay}
                onChange={(e) => apply({ delaySec: Number(e.target.value) })}
                className="w-full accent-probe cursor-pointer h-1.5 bg-surface-sunken rounded-lg"
              />
            </div>
            <span className="text-[9px] text-ink-muted block">{hints[mode]}</span>
          </div>
        );
      })()}

      {/* --- BULK WIRE EDITOR (several conductors selected) --- */}
      {wires.length > 1 && (() => {
        const gauges = Array.from(new Set(wires.map((w) => w.wireGauge)));
        const colorSet = Array.from(new Set(wires.map((w) => w.color)));
        const commonGauge = gauges.length === 1 ? gauges[0] : '';
        const ids = wires.map((w) => w.id);
        const apply = (u: Partial<ElectricalWire>) => onUpdateWiresProperty?.(ids, u);
        const swatches = [
          { color: colors.phase1, name: 'Phase 1' },
          { color: colors.phase2, name: 'Phase 2' },
          { color: colors.phase3, name: 'Phase 3' },
          { color: colors.neutral, name: 'Neutral' },
          { color: colors.earth, name: 'Earth' },
          { color: colors.switched, name: 'Switched' },
        ];
        return (
          <div className="space-y-3">
            <div className="text-[11px] text-ink leading-snug">
              Changes below apply to <strong className="text-probe">all {wires.length} selected conductors</strong>
              {groupDeviceCount > 1 ? ` (${groupDeviceCount} devices are also selected)` : ''}.
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                Conductor Cross-Section / Gauge (AWG + mm²)
              </label>
              <select
                value={commonGauge}
                onChange={(e) => e.target.value && apply({ wireGauge: e.target.value })}
                className="w-full bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-ink font-mono focus:outline-none focus:border-probe"
              >
                {commonGauge === '' && <option value="">Mixed ({gauges.length} sizes) - pick one to apply to all</option>}
                {wireStandards.map((ws) => (
                  <option key={ws.id} value={ws.name}>
                    {ws.name} (Max {ws.maxBreakerAmps}A)
                  </option>
                ))}
              </select>
              {gauges.length > 1 && (
                <div className="mt-1 text-[10px] font-mono text-ink-muted leading-snug">Now: {gauges.join(' | ')}</div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                Insulation Color
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {swatches.map((swatch, i) => (
                  <button
                    key={i}
                    onClick={() => apply({ color: swatch.color })}
                    style={{ backgroundColor: conductorColor(swatch.color) }}
                    className={`h-6 rounded border transition-transform ${
                      colorSet.length === 1 && colorSet[0] === swatch.color
                        ? 'border-probe scale-110 shadow-md ring-2 ring-probe/40'
                        : 'border-border-strong hover:scale-105'
                    }`}
                    title={swatch.name}
                  />
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-[10px] text-ink-muted">
                <span className="font-bold uppercase tracking-wider">Custom</span>
                <input
                  type="color"
                  value={colorSet.length === 1 && /^#[0-9a-fA-F]{6}$/.test(colorSet[0]) ? colorSet[0] : '#444444'}
                  onChange={(e) => apply({ color: e.target.value })}
                  className="h-6 w-10 bg-transparent border border-border-strong rounded cursor-pointer"
                />
                {colorSet.length > 1 && <span className="font-mono text-ink-muted">{colorSet.length} colors now</span>}
              </label>
            </div>

            <div>
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">Selected conductors</div>
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {wires.map((w) => {
                  const a = devices.find((d) => d.id === w.fromDeviceId);
                  const b = devices.find((d) => d.id === w.toDeviceId);
                  return (
                    <div key={w.id} className="flex items-center gap-1.5 text-[10px] font-mono text-ink">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm border border-border-strong" style={{ backgroundColor: conductorColor(w.color) }} />
                      <span className="truncate">
                        {a?.name?.split(' ')[0] || 'Dev'} {'\u2192'} {b?.name?.split(' ')[0] || 'Dev'}
                      </span>
                      <span className="ml-auto text-ink-muted shrink-0">{w.wireGauge.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- WIRE PROPERTIES --- */}
      {wire && (
        <div className="space-y-3">
          {/* Wire Tag / Circuit Label */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Wire Tag / Circuit Label
            </label>
            <input
              type="text"
              value={wire.label || ''}
              maxLength={18}
              placeholder="e.g. CKT-1 L1, T1, SW-RET"
              onChange={(e) => onUpdateWireProperty(wire.id, { label: e.target.value })}
              className="w-full bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-ink font-mono placeholder:text-ink-muted focus:outline-none focus:border-probe"
            />
          </div>

          {/* Gauge Selector */}
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              Conductor Cross-Section / Gauge
            </label>
            <select
              value={wire.wireGauge}
              onChange={(e) => onUpdateWireProperty(wire.id, { wireGauge: e.target.value })}
              className="w-full bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-ink font-mono focus:outline-none focus:border-probe"
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
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
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
                  style={{ backgroundColor: conductorColor(swatch.color) }}
                  className={`h-6 rounded border transition-transform ${
                    wire.color === swatch.color
                      ? 'border-probe scale-110 shadow-md ring-2 ring-probe/40'
                      : 'border-border-strong hover:scale-105'
                  }`}
                  title={swatch.name}
                />
              ))}
            </div>
          </div>

          {/* Wire Run Length */}
          <div>
            <div className="flex justify-between text-[10px] text-ink-muted mb-0.5">
              <span className="font-bold uppercase tracking-wider">Conductor Length</span>
              <span className="font-mono text-ink font-bold">{wire.lengthMeters || 5} meters</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={wire.lengthMeters || 5}
              onChange={(e) => onUpdateWireProperty(wire.id, { lengthMeters: Number(e.target.value) })}
              className="w-full accent-probe cursor-pointer h-1.5 bg-surface-sunken rounded-lg"
            />
          </div>

          {/* Electrical Metrics for this Wire */}
          <div className="bg-surface-sunken p-2.5 rounded-md border border-border flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[9px] text-ink-muted block font-sans">CURRENT</span>
              <span className="font-bold text-ink">{(wire.currentAmps || 0).toFixed(2)} A</span>
            </div>
            <div>
              <span className="text-[9px] text-ink-muted block font-sans">VOLTAGE DROP</span>
              <span className={`font-bold ${(wire.voltageDropPercent || 0) > 3 ? 'text-danger' : 'text-ok'}`}>
                {(wire.voltageDropPercent || 0).toFixed(2)} %
              </span>
            </div>
            <div>
              <span className="text-[9px] text-ink-muted block font-sans">LIMIT</span>
              <span className="text-ink-muted font-bold">≤ 3.0%</span>
            </div>
          </div>

          {/* Reset Custom Draggable Waypoints */}
          {wire.waypoints && wire.waypoints.length > 0 && (
            <button
              onClick={() => onUpdateWireProperty(wire.id, { waypoints: undefined })}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-surface-sunken hover:bg-surface-hover border border-border-strong text-ink text-xs font-bold rounded-md transition shadow-sm"
              title="Reset manual orthogonal shifts back to automatic collision-free routing"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
              <span>Reset Wire Routing to Auto</span>
            </button>
          )}

          {/* Move Endpoint / Disconnect Connected Ports */}
          {!readOnly && (() => {
            const fromDev = devices.find((d) => d.id === wire.fromDeviceId);
            const toDev = devices.find((d) => d.id === wire.toDeviceId);
            const fromTerm = fromDev?.terminals.find((t) => t.id === wire.fromTerminalId);
            const toTerm = toDev?.terminals.find((t) => t.id === wire.toTerminalId);
            return (
              <div className="bg-surface-sunken p-2.5 rounded-md border border-border space-y-2">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  Endpoint Ports (Rewire Without Deleting)
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2 bg-surface/80 px-2 py-1 rounded-lg border border-border/80">
                    <span className="text-ink font-mono truncate">
                      <strong className="text-probe">FROM:</strong> {fromDev?.name?.split(' ')[0] || 'Dev'}:{fromTerm?.label || wire.fromTerminalId}
                    </span>
                    {onRequestRewire && (
                      <button
                        onClick={() => onRequestRewire(wire.id, 'from')}
                        className="px-2 py-0.5 rounded bg-probe hover:bg-probe text-on-probe font-bold text-[10px] shrink-0 transition"
                        title="Pick a new port for the FROM end"
                      >
                        ⇄ Rewire
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-surface/80 px-2 py-1 rounded-lg border border-border/80">
                    <span className="text-ink font-mono truncate">
                      <strong className="text-warning">TO:</strong> {toDev?.name?.split(' ')[0] || 'Dev'}:{toTerm?.label || wire.toTerminalId}
                    </span>
                    {onRequestRewire && (
                      <button
                        onClick={() => onRequestRewire(wire.id, 'to')}
                        className="px-2 py-0.5 rounded bg-probe hover:bg-probe text-on-probe font-bold text-[10px] shrink-0 transition"
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
                    className="w-full py-1 px-2.5 rounded-lg bg-danger-soft/70 hover:bg-danger-soft/80 border border-danger/70 text-danger text-[11px] font-bold transition"
                  >
                    Disconnect Wire
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      </fieldset>
      </div>

      {/* Footer Action Buttons (Rotate, Duplicate, Delete) */}
      {!readOnly && (
      <div className="pt-3 mt-3 border-t border-border/80 flex items-center justify-between gap-2">
        {device && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onRotateDevice && onRotateDevice(device)}
              className="flex items-center gap-1 px-2.5 py-1 bg-surface-sunken hover:bg-surface-hover text-ink border border-border-strong text-xs font-bold rounded-lg transition"
              title="Rotate 90° clockwise (Shortcut: R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-ink" />
              <span>Rotate</span>
            </button>
            <button
              onClick={() => onDuplicateDevice && onDuplicateDevice(device)}
              className="flex items-center gap-1 px-2.5 py-1 bg-surface-sunken hover:bg-surface-hover text-ink border border-border-strong text-xs font-bold rounded-lg transition"
              title="Duplicate device (Shortcut: Ctrl+C, Ctrl+V)"
            >
              <Copy className="w-3.5 h-3.5 text-ink" />
              <span>Duplicate</span>
            </button>
          </div>
        )}

        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-1 text-xs font-bold text-danger hover:opacity-80 transition ml-auto"
          title="Delete selected item (Shortcut: Del / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
      )}
    </div>
  );
};
