import React from 'react';
import type { ElectricalDevice } from '../../types/electrical';
import { MODULE_SPECS, ModuleControl } from '../../data/moduleSpecs';

const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Inspector section for the generic device modules: renders the controls described in data/moduleSpecs.ts. */
export const ModuleInspector: React.FC<{
  device: ElectricalDevice;
  devices: ElectricalDevice[];
  apply: (patch: Record<string, any>) => void;
}> = ({ device, devices, apply }) => {
  const spec = MODULE_SPECS[device.type];
  if (!spec) return null;

  const render = (c: ModuleControl, i: number) => {
    switch (c.kind) {
      case 'number': {
        const raw = device.state[c.key];
        const value = typeof raw === 'number' ? raw : c.def;
        return (
          <div key={i}>
            <div className="flex justify-between text-[10px] font-bold text-ink-muted">
              <span>{c.label}</span>
              <span className="font-mono text-ink">{c.fmt === 'clock' ? clock(value) : `${value}${c.unit ? ' ' + c.unit : ''}`}</span>
            </div>
            <input
              type="range" min={c.min} max={c.max} step={c.step} value={value}
              onChange={(e) => apply({ [c.key]: Number(e.target.value) })}
              className="w-full accent-probe cursor-pointer h-1.5 bg-surface-sunken rounded-lg"
            />
          </div>
        );
      }
      case 'select': {
        const raw = device.state[c.key] ?? c.def;
        return (
          <label key={i} className="block text-[10px] font-bold text-ink-muted">
            {c.label}
            <select
              value={String(raw)}
              onChange={(e) => {
                const opt = c.options.find((o) => String(o.v) === e.target.value);
                apply({ [c.key]: opt ? opt.v : e.target.value });
              }}
              className="mt-0.5 w-full text-xs font-normal bg-surface border border-border rounded px-1.5 py-1 text-ink"
            >
              {c.options.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.label}</option>)}
            </select>
          </label>
        );
      }
      case 'device': {
        const options = devices.filter((d) => c.types.includes(d.type));
        return (
          <label key={i} className="block text-[10px] font-bold text-ink-muted">
            {c.label}
            <select
              value={String(device.state[c.key] || '')}
              onChange={(e) => apply({ [c.key]: e.target.value })}
              className="mt-0.5 w-full text-xs font-normal bg-surface border border-border rounded px-1.5 py-1 text-ink"
            >
              <option value="">(none)</option>
              {options.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        );
      }
      case 'toggle': {
        const on = device.state[c.key] === undefined ? !!c.def : !!device.state[c.key];
        return (
          <button
            key={i}
            onClick={() => apply({ [c.key]: !on })}
            className={`w-full py-1.5 rounded-lg border text-xs font-bold transition ${on ? 'bg-probe-soft text-probe border-probe/60' : 'bg-surface/90 hover:bg-surface-sunken text-ink border-border'}`}
          >
            {c.label}: {on ? 'yes' : 'no'}
          </button>
        );
      }
      case 'action':
        return (
          <button key={i} onClick={() => apply(c.patch)} className="w-full py-1.5 rounded-lg border border-border bg-surface/90 hover:bg-surface-sunken text-xs font-bold text-ink transition">
            {c.label}
          </button>
        );
    }
  };

  return (
    <div className="space-y-3 mt-2 pt-2 border-t border-border/80">
      <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">{spec.title}</label>
      {spec.controls.map(render)}
      {spec.hint && <span className="text-[9px] text-ink-muted block">{spec.hint}</span>}
    </div>
  );
};
