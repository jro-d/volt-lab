import React from 'react';
import { ElectricalDevice, ShortCircuitSettings } from '../../types/electrical';
import { FaultLevels, checkInterruptingRatings, formatKa } from '../../core/shortCircuit';
import { Zap, X } from 'lucide-react';

interface FaultLevelsPanelProps {
  settings: ShortCircuitSettings;
  levels: FaultLevels;
  devices: ElectricalDevice[];
  onChange: (next: ShortCircuitSettings) => void;
  onSelectDevice: (id: string) => void;
  onClose: () => void;
  /** Shift right so the card does not sit under the component library */
  isLibraryOpen?: boolean;
}

const num = (v: string, fallback: number) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Floating card for the short-circuit check: source level and optional transformer, a table of every protective
 * device's interrupting rating against the fault level at its input, and the method's simplifications.
 */
export const FaultLevelsPanel: React.FC<FaultLevelsPanelProps> = ({ settings, levels, devices, onChange, onSelectDevice, onClose, isLibraryOpen }) => {
  const checks = checkInterruptingRatings(devices, levels);
  const tx = settings.transformer;
  const input = 'w-16 px-1 py-0.5 rounded border border-border bg-surface text-ink font-mono text-[11px] text-right';
  const tone = { error: 'text-danger', warning: 'text-warning', ok: 'text-ok' } as const;

  return (
    <div
      className="absolute bottom-3 z-30 w-72 rounded-md border border-border-strong bg-surface shadow-lg text-[11px] text-ink"
      style={{ left: isLibraryOpen ? 348 : 12 }}
      role="region"
      aria-label="Fault levels"
    >
      <header className="flex items-center gap-1.5 px-2.5 h-8 border-b border-border">
        <Zap className="w-3.5 h-3.5 text-probe" />
        <span className="font-bold uppercase tracking-wider text-[10px] font-display">Fault levels</span>
        <div className="flex-1" />
        <button className="p-1 rounded hover:bg-surface-hover" onClick={onClose} title="Turn the short-circuit check off">
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="p-2.5 space-y-2">
        <label className="flex items-center justify-between gap-2">
          <span>Supply short-circuit level</span>
          <span className="flex items-center gap-1">
            <input className={input} type="number" min={0.1} step={0.5} value={settings.sourceKa} onChange={(e) => onChange({ ...settings, sourceKa: num(e.target.value, settings.sourceKa) })} />
            kA
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!tx}
            onChange={(e) => onChange({ ...settings, transformer: e.target.checked ? { kva: 100, zPct: 4 } : undefined })}
          />
          <span>Supply transformer in series</span>
        </label>
        {tx && (
          <div className="flex items-center justify-between gap-2 pl-5">
            <span className="flex items-center gap-1">
              <input className={input} type="number" min={1} value={tx.kva} onChange={(e) => onChange({ ...settings, transformer: { ...tx, kva: num(e.target.value, tx.kva) } })} />
              kVA
            </span>
            <span className="flex items-center gap-1">
              <input className={input} type="number" min={0.5} step={0.5} value={tx.zPct} onChange={(e) => onChange({ ...settings, transformer: { ...tx, zPct: num(e.target.value, tx.zPct) } })} />
              Z %
            </span>
          </div>
        )}

        <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted pt-1">Interrupting rating vs fault level</div>
        {levels.supplies.length === 0 && <div className="text-ink-muted">No supply found. Use the 440 V source, or a utility meter whose line input is left unwired.</div>}
        {levels.supplies.length > 0 && checks.length === 0 && <div className="text-ink-muted">No breaker or fuse with a rating is connected to the supply.</div>}
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {checks.map((c) => {
            const dev = devices.find((d) => d.id === c.deviceId);
            return (
              <button key={c.deviceId} className="w-full flex items-center gap-2 text-left hover:bg-surface-hover rounded px-1 py-0.5" onClick={() => onSelectDevice(c.deviceId)}>
                <span className="flex-1 truncate">{dev?.name || c.deviceId}</span>
                <span className="font-mono tabular-nums text-ink-muted">{c.ratingKa} kA</span>
                <span className={`font-mono tabular-nums font-bold ${tone[c.status]}`}>{c.ikKa.toFixed(2)} kA</span>
              </button>
            );
          })}
        </div>

        <p className="text-[9px] leading-snug text-ink-muted">
          Ohmic method, resistance only (no reactance), so values run slightly high. Conductor resistance is the 75 °C table value taken back to 20 °C. Shortest path, no motor contribution; circuits behind a transformer are not calculated. Warning when the fault level is above 80 % of the rating.
        </p>
        {levels.sourceOhms > 0 && <p className="text-[9px] text-ink-muted font-mono">Source impedance {(levels.sourceOhms * 1000).toFixed(1)} mΩ at {levels.volts} V · {formatKa(levels.volts / (Math.sqrt(3) * levels.sourceOhms))} at the terminals</p>}
      </div>
    </div>
  );
};
