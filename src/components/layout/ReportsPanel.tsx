import React from 'react';
import type { ElectricalProject } from '../../types/electrical';
import { buildLoadSchedule, scheduleToCsv } from '../../core/loadSchedule';
import { buildBom, bomToCsv, DEFAULT_BOM } from '../../core/bom';
import { ISOLATION_STEPS, DEFAULT_ISOLATION, completeStep, nextStep } from '../../core/safeIsolation';
import { GRADED_LAB_IDS, exerciseProject, gradeWork, resultJson, type GradeResult, type StudentInfo } from '../../core/grading';
import { LAB_LESSONS } from '../../data/labTemplates';
import { summarizeEnergy, ledgerToCsv, DEFAULT_ENERGY, emptyLedger, type EnergyLedger } from '../../core/energy';
import { encodeShare, SHARE_WARN_LENGTH, type ShareResult } from '../../utils/shareLink';
import { numberWires, terminalStrips, terminalStripSvg, wireListCsv, DEFAULT_NUMBERING } from '../../core/wireNumbering';
import { DEMAND_FACTORS } from '../../data/standardsData';
import { Download, Printer, X } from 'lucide-react';

export interface ReportTab {
  id: string;
  label: string;
  render: (ctx: ReportContext) => React.ReactNode;
}

export interface ReportContext {
  project: ElectricalProject;
  onChange: (updater: (p: ElectricalProject) => ElectricalProject) => void;
  /** Live energy ledger (Energy tab) */
  energy?: { ledger: EnergyLedger; version: number; reset: () => void };
  isSimulating?: boolean;
  /** Number of errors the Code Inspector reports right now (graded labs) */
  inspectorErrors?: number;
}

/** Download a text file (CSV) entirely in the browser: no network. */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const th = 'px-1.5 py-1 text-left font-bold text-[9px] uppercase tracking-wider text-ink-muted border-b border-border whitespace-nowrap';
const td = 'px-1.5 py-1 text-[11px] border-b border-border/60 whitespace-nowrap';

export const LoadScheduleTab: React.FC<ReportContext> = ({ project, onChange }) => {
  const overrides = project.loadSchedule?.demandFactors ?? {};
  const schedule = React.useMemo(
    () => buildLoadSchedule(project.devices, project.wires, project.codeStandard, project.gridVoltage, overrides),
    [project.devices, project.wires, project.codeStandard, project.gridVoltage, overrides]
  );
  const types = Array.from(new Set([...Object.keys(DEMAND_FACTORS), ...schedule.rows.map((r) => r.loadType)]));
  const setFactor = (type: string, raw: string) => {
    const n = parseFloat(raw);
    onChange((p) => {
      const next = { ...(p.loadSchedule?.demandFactors ?? {}) };
      if (Number.isFinite(n) && n > 0) next[type] = n;
      else delete next[type];
      return { ...p, loadSchedule: { v: 1, demandFactors: next } };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 print:hidden">
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold flex items-center gap-1" onClick={() => downloadText('wirewise_load_schedule.csv', scheduleToCsv(schedule))}>
          <Download className="w-3 h-3" />CSV
        </button>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold flex items-center gap-1" onClick={() => window.print()}>
          <Printer className="w-3 h-3" />Print (A4)
        </button>
        {schedule.missingDemandTypes.length > 0 && (
          <span className="text-[11px] text-warning font-semibold">Set demand factors below: {schedule.missingDemandTypes.join(', ')}</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Cct', 'Description', 'Type', 'W', 'PF', 'VA', 'A', 'DF', 'Demand VA', 'Breaker', 'Conductor', 'm', 'VD %', 'Phase', 'Notes'].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((r) => (
              <tr key={r.deviceId}>
                <td className={td}>{r.circuit || '-'}</td>
                <td className={`${td} max-w-[220px] truncate`} title={r.description}>{r.description}</td>
                <td className={td}>{r.loadType}</td>
                <td className={`${td} text-right`}>{r.watts}</td>
                <td className={`${td} text-right`}>{r.pf}</td>
                <td className={`${td} text-right`}>{r.va}</td>
                <td className={`${td} text-right`}>{r.amps}</td>
                <td className={`${td} text-right`}>{r.demandFactor ?? '—'}</td>
                <td className={`${td} text-right`}>{r.demandVa ?? '—'}</td>
                <td className={td}>{r.breaker}</td>
                <td className={td}>{r.conductor}</td>
                <td className={`${td} text-right`}>{r.lengthM}</td>
                <td className={`${td} text-right ${r.vdPercent > 3 ? 'text-danger font-bold' : ''}`}>{r.vdPercent}</td>
                <td className={td}>{r.phase}</td>
                <td className={`${td} text-warning`}>{r.notes}</td>
              </tr>
            ))}
            {schedule.rows.length === 0 && <tr><td className={td} colSpan={15}>No load devices in the project.</td></tr>}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className={td} colSpan={3}>TOTAL</td>
              <td className={`${td} text-right`}>{schedule.totalWatts}</td>
              <td className={td} />
              <td className={`${td} text-right`}>{schedule.totalVa}</td>
              <td className={`${td} text-right`}>{schedule.totalAmps}</td>
              <td className={td} />
              <td className={`${td} text-right`}>{schedule.totalDemandVa ?? '—'}</td>
              <td className={td} colSpan={6} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
        <div className="rounded border border-border p-2.5 space-y-1">
          <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">Main breaker and feeder</div>
          <div>
            {schedule.suggestedMainAmps
              ? <>Suggested main breaker <b>{schedule.suggestedMainAmps} A</b> ({schedule.suggestedMainBasis === 'demand' ? 'from the demand load' : 'from the CONNECTED load: enter demand factors for a demand-based size'}), feeder <b>{schedule.suggestedFeeder ?? 'larger than the table'}</b>.</>
              : 'No loads.'}
          </div>
          {Object.keys(schedule.phaseVa).length > 0 && (
            <div>
              Phase balance (VA): {Object.entries(schedule.phaseVa).map(([p, v]) => `${p} ${v}`).join(' · ')}
              {schedule.imbalancePercent !== null && <> — highest phase {schedule.imbalancePercent} % above the average</>}
            </div>
          )}
        </div>
        <div className="rounded border border-border p-2.5 space-y-1 print:hidden">
          <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">Demand factors (you enter these)</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {types.map((type) => (
              <label key={type} className="flex items-center justify-between gap-2" title={DEMAND_FACTORS[type]?.source}>
                <span className="capitalize">{type}</span>
                <input
                  className="w-14 px-1 py-0.5 rounded border border-border bg-surface text-right font-mono"
                  type="number" min={0.05} max={1} step={0.05} placeholder="—"
                  value={overrides[type] ?? ''}
                  onChange={(e) => setFactor(type, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="text-[9px] text-ink-muted">The factors and their clauses have not been verified, so none is built in. Voltage drop is the design current over the wire resistance (75 °C table value).</div>
        </div>
      </div>
    </div>
  );
};

export const BomTab: React.FC<ReportContext> = ({ project, onChange }) => {
  const cfg = { ...DEFAULT_BOM, ...(project.bom ?? {}), prices: project.bom?.prices ?? {} };
  const bom = React.useMemo(() => buildBom(project.devices, project.wires, cfg), [project.devices, project.wires, project.bom]);
  const patch = (fn: (b: typeof cfg) => typeof cfg) => onChange((p) => ({ ...p, bom: fn({ ...DEFAULT_BOM, ...(p.bom ?? {}), prices: p.bom?.prices ?? {} }) }));
  const setPrice = (key: string, raw: string) => patch((b) => {
    const prices = { ...b.prices };
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) prices[key] = n;
    else delete prices[key];
    return { ...b, prices };
  });
  const num = (key: 'wastePct' | 'contingencyPct' | 'vatPct' | 'conduitM' | 'boxCount', raw: string) => patch((b) => ({ ...b, [key]: Math.max(0, parseFloat(raw) || 0) }));
  const field = (label: string, key: 'wastePct' | 'contingencyPct' | 'vatPct' | 'conduitM' | 'boxCount') => (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <input className="w-16 px-1 py-0.5 rounded border border-border bg-surface text-right font-mono" type="number" min={0} value={cfg[key]} onChange={(e) => num(key, e.target.value)} />
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 print:hidden">
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold flex items-center gap-1" onClick={() => downloadText('wirewise_bill_of_materials.csv', bomToCsv(bom))}><Download className="w-3 h-3" />CSV</button>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold flex items-center gap-1" onClick={() => window.print()}><Printer className="w-3 h-3" />Print (A4)</button>
        {bom.unpriced > 0 && <span className="text-[11px] text-warning font-semibold">{bom.unpriced} line{bom.unpriced === 1 ? '' : 's'} without a price: type the unit prices yourself (none are bundled)</span>}
      </div>
      <table className="w-full border-collapse">
        <thead><tr>{['Category', 'Description', 'Qty', 'Unit', `Unit price (${bom.currency})`, `Amount (${bom.currency})`].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {bom.lines.map((l) => (
            <tr key={l.key}>
              <td className={td}>{l.category}</td>
              <td className={td}>{l.description}</td>
              <td className={`${td} text-right`}>{l.quantity}</td>
              <td className={td}>{l.unit}</td>
              <td className={td}>
                <input className="w-20 px-1 py-0.5 rounded border border-border bg-surface text-right font-mono print:border-0" type="number" min={0} step="any" placeholder="—" value={cfg.prices[l.key] ?? ''} onChange={(e) => setPrice(l.key, e.target.value)} />
              </td>
              <td className={`${td} text-right`}>{l.amount ?? '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {Object.entries(bom.subtotalByCategory).map(([c, v]) => <tr key={c}><td className={td} colSpan={5}>Subtotal: {c}</td><td className={`${td} text-right`}>{v}</td></tr>)}
          <tr className="font-bold"><td className={td} colSpan={5}>Subtotal</td><td className={`${td} text-right`}>{bom.subtotal}</td></tr>
          <tr><td className={td} colSpan={5}>Contingency ({cfg.contingencyPct} %)</td><td className={`${td} text-right`}>{bom.contingency}</td></tr>
          <tr><td className={td} colSpan={5}>VAT ({cfg.vatPct} %)</td><td className={`${td} text-right`}>{bom.vat}</td></tr>
          <tr className="font-bold"><td className={td} colSpan={5}>TOTAL ({bom.currency})</td><td className={`${td} text-right`}>{bom.total}</td></tr>
        </tfoot>
      </table>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] print:hidden">
        {field('Waste %', 'wastePct')}
        {field('Contingency %', 'contingencyPct')}
        {field('VAT %', 'vatPct')}
        {field('Conduit (m)', 'conduitM')}
        {field('Boxes (pcs)', 'boxCount')}
      </div>
    </div>
  );
};

export const WiresTab: React.FC<ReportContext> = ({ project, onChange }) => {
  const cfg = { ...DEFAULT_NUMBERING, ...(project.wireNumbering ?? {}), titleBlock: { ...DEFAULT_NUMBERING.titleBlock, ...(project.wireNumbering?.titleBlock ?? {}) } };
  const strips = React.useMemo(() => terminalStrips(project.devices, project.wires), [project.devices, project.wires]);
  const save = (patch: Partial<typeof cfg>) => onChange((p) => ({ ...p, wireNumbering: { ...cfg, ...patch } }));
  const apply = () => onChange((p) => {
    const labels = numberWires(p.devices, p.wires, cfg.scheme, cfg.prefix);
    return { ...p, wires: p.wires.map((w) => ({ ...w, label: labels[w.id] ?? w.label })), wireNumbering: cfg };
  });
  const clear = () => onChange((p) => ({ ...p, wires: p.wires.map((w) => ({ ...w, label: '' })) }));
  const input = 'px-1.5 py-0.5 rounded border border-border bg-surface text-[11px]';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 print:hidden text-[11px]">
        <label className="flex flex-col gap-0.5">Scheme
          <select className={input} value={cfg.scheme} onChange={(e) => save({ scheme: e.target.value as typeof cfg.scheme })}>
            <option value="sequential">Sequential (W1, W2 ...)</option>
            <option value="from-to">From-to (KM1.t1-F2.l1)</option>
            <option value="per-circuit">Per circuit (W3.2)</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">Prefix
          <input className={`${input} w-16 font-mono`} value={cfg.prefix} onChange={(e) => save({ prefix: e.target.value })} />
        </label>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={apply}>Number all wires</button>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={clear}>Clear numbers</button>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold flex items-center gap-1" onClick={() => downloadText('wirewise_wire_list.csv', wireListCsv(project.devices, project.wires))}><Download className="w-3 h-3" />Wire list CSV</button>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold flex items-center gap-1" onClick={() => window.print()}><Printer className="w-3 h-3" />Print (A4)</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        {(['project', 'drawnBy', 'checkedBy', 'date', 'sheet'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-0.5 capitalize">{k === 'drawnBy' ? 'Drawn by' : k === 'checkedBy' ? 'Checked by' : k}
            <input className={input} value={cfg.titleBlock[k]} onChange={(e) => save({ titleBlock: { ...cfg.titleBlock, [k]: e.target.value } })} />
          </label>
        ))}
      </div>
      {strips.length === 0 && <div className="text-[11px] text-ink-muted">No terminal blocks in the project: add a terminal block to get a terminal-strip table.</div>}
      {strips.map((s) => (
        <div key={s.deviceId} className="rounded border border-border p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <b className="text-xs">Terminal strip {s.tag}</b><span className="text-[10px] text-ink-muted">{s.kind}</span>
            <div className="flex-1" />
            <button className="px-2 py-0.5 rounded border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold print:hidden" onClick={() => downloadText(`wirewise_terminal_strip_${s.tag}.svg`, terminalStripSvg(s, cfg.titleBlock, project.title), 'image/svg+xml')}>Export SVG</button>
          </div>
          <table className="w-full border-collapse">
            <thead><tr>{['Terminal', 'Incoming wire', 'From', 'Outgoing wire', 'To'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.pole}>
                  <td className={td}>{r.pole}</td>
                  <td className={td}>{r.incoming.map((e) => e.wire).join(', ') || '—'}</td>
                  <td className={td}>{r.incoming.map((e) => e.destination).join(', ') || '—'}</td>
                  <td className={td}>{r.outgoing.map((e) => e.wire).join(', ') || '—'}</td>
                  <td className={td}>{r.outgoing.map((e) => e.destination).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="text-[9px] text-ink-muted">Numbers are written into each wire's label and drawn as ferrule tags on the workbench. The single-line diagram does not show them yet.</div>
    </div>
  );
};

export const ShareTab: React.FC<ReportContext> = ({ project }) => {
  const [result, setResult] = React.useState<ShareResult | null>(null);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const make = async () => {
    setError('');
    setCopied(false);
    try {
      setResult(await encodeShare(project));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the link');
    }
  };
  const url = result ? `${window.location.origin}${window.location.pathname}${result.hash}` : '';
  return (
    <div className="space-y-3 text-[11px]">
      <p>A share link carries the whole project inside the address (compressed in the URL hash): nothing is uploaded, and whoever opens it gets an editable copy.</p>
      <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={make}>Make share link</button>
      {error && <div className="text-danger font-semibold">{error}</div>}
      {result && (
        <div className="space-y-2">
          <div>{result.length.toLocaleString()} characters ({result.method === 'deflate' ? 'deflate' : 'LZW fallback'}).</div>
          {result.tooLong && (
            <div className="text-warning font-semibold">
              This link is longer than about {SHARE_WARN_LENGTH.toLocaleString()} characters: some chat apps and browsers cut long links. Use <b>Export JSON</b> (the download button in the top bar) to send the project as a file instead.
            </div>
          )}
          <textarea readOnly className="w-full h-24 p-1.5 rounded border border-border bg-surface font-mono text-[10px]" value={url} onFocus={(e) => e.currentTarget.select()} />
          <button
            className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold"
            onClick={() => { navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false)); }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
};

export const EnergyTab: React.FC<ReportContext> = ({ project, onChange, energy, isSimulating }) => {
  const cfg = { ...DEFAULT_ENERGY, ...(project.energy ?? {}), tariff: { ...DEFAULT_ENERGY.tariff, ...(project.energy?.tariff ?? {}) } };
  const ledger = energy?.ledger ?? emptyLedger();
  const sum = summarizeEnergy(ledger, project.devices, cfg.tariff);
  const patch = (fn: (c: typeof cfg) => typeof cfg) => onChange((p) => ({ ...p, energy: fn({ ...DEFAULT_ENERGY, ...(p.energy ?? {}), tariff: { ...DEFAULT_ENERGY.tariff, ...(p.energy?.tariff ?? {}) } }) }));
  const input = 'px-1.5 py-0.5 rounded border border-border bg-surface text-[11px]';
  const tiers = cfg.tariff.tiers ?? [];
  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" checked={cfg.enabled} onChange={(e) => patch((c) => ({ ...c, enabled: e.target.checked }))} />Record energy while simulating</label>
        <label className="flex flex-col gap-0.5">Time scale
          <select className={input} value={cfg.timeScale} onChange={(e) => patch((c) => ({ ...c, timeScale: Number(e.target.value) as 1 | 60 | 3600 }))}>
            <option value={1}>1x (real time)</option>
            <option value={60}>60x (an hour per minute)</option>
            <option value={3600}>3600x (a day in 24 s)</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">Tariff ({cfg.tariff.currency}/kWh)
          <input className={`${input} w-24 font-mono`} type="number" min={0} step="any" value={cfg.tariff.perKwh || ''} placeholder="enter rate" onChange={(e) => patch((c) => ({ ...c, tariff: { ...c.tariff, perKwh: Math.max(0, parseFloat(e.target.value) || 0) } }))} />
        </label>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={() => energy?.reset()}>Reset ledger</button>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold flex items-center gap-1" onClick={() => downloadText('wirewise_energy_ledger.csv', ledgerToCsv(ledger, project.devices, cfg.tariff))}><Download className="w-3 h-3" />CSV</button>
      </div>
      {!isSimulating && <div className="text-ink-muted print:hidden">Press Simulate: the ledger fills while the simulation runs.</div>}
      {cfg.tariff.perKwh === 0 && tiers.length === 0 && <div className="text-warning font-semibold print:hidden">No tariff entered: costs show 0. Type the rate from your electricity bill (none is built in).</div>}
      <div className="rounded border border-border p-2.5 print:hidden space-y-1">
        <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">Optional tiers (progressive; the flat rate applies above the last tier)</div>
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span>up to</span>
            <input className={`${input} w-20 font-mono`} type="number" min={0} value={t.upToKwh ?? ''} placeholder="∞" onChange={(e) => patch((c) => ({ ...c, tariff: { ...c.tariff, tiers: tiers.map((x, j) => (j === i ? { ...x, upToKwh: e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0) } : x)) } }))} />
            <span>kWh at</span>
            <input className={`${input} w-20 font-mono`} type="number" min={0} step="any" value={t.perKwh} onChange={(e) => patch((c) => ({ ...c, tariff: { ...c.tariff, tiers: tiers.map((x, j) => (j === i ? { ...x, perKwh: Math.max(0, parseFloat(e.target.value) || 0) } : x)) } }))} />
            <button className="text-danger font-semibold" onClick={() => patch((c) => ({ ...c, tariff: { ...c.tariff, tiers: tiers.filter((_, j) => j !== i) } }))}>remove</button>
          </div>
        ))}
        <button className="px-2 py-0.5 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={() => patch((c) => ({ ...c, tariff: { ...c.tariff, tiers: [...tiers, { upToKwh: 200, perKwh: c.tariff.perKwh }] } }))}>Add tier</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[['Energy', `${sum.totalKwh} kWh`], ['Simulated time', `${sum.simulatedHours} h`], [`Cost so far`, `${sum.costSoFar} ${cfg.tariff.currency}`], ['Projected 30 days', sum.monthKwh === null ? '—' : `${sum.monthKwh} kWh · ${sum.monthCost} ${cfg.tariff.currency}`]].map(([k, v]) => (
          <div key={k} className="rounded border border-border p-2"><div className="text-[9px] uppercase tracking-wider text-ink-muted font-bold">{k}</div><div className="font-mono font-bold">{v}</div></div>
        ))}
      </div>
      <div className="rounded border border-border p-2.5">
        <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted mb-1">Power triangle of the installation (now)</div>
        <div className="font-mono">P {ledger.p.toFixed(0)} W · Q {ledger.q.toFixed(0)} var · S {ledger.s.toFixed(0)} VA · PF {ledger.pf.toFixed(2)} · peak {ledger.peakW.toFixed(0)} W</div>
      </div>
      <table className="w-full border-collapse">
        <thead><tr>{['Device', 'kWh', 'Share %', `Cost (${cfg.tariff.currency})`].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {sum.ranking.map((r) => <tr key={r.deviceId}><td className={td}>{r.name}</td><td className={`${td} text-right`}>{r.kwh}</td><td className={`${td} text-right`}>{r.sharePct}</td><td className={`${td} text-right`}>{r.cost}</td></tr>)}
          {sum.ranking.length === 0 && <tr><td className={td} colSpan={4}>No energy recorded yet.</td></tr>}
        </tbody>
      </table>
      <div className="text-[9px] text-ink-muted">The ledger holds the present power of each energized load for the scaled time, so a load that cycles faster than the step is averaged by the sampling. Power factor comes from the load type.</div>
    </div>
  );
};

const STUDENT_KEY = 'wirewise-student';
const readStudent = (): StudentInfo => {
  try {
    const raw = localStorage.getItem(STUDENT_KEY);
    if (raw) return { name: '', course: '', section: '', ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { name: '', course: '', section: '' };
};

export const GradedTab: React.FC<ReportContext> = ({ project, onChange, inspectorErrors = 0 }) => {
  const [student, setStudent] = React.useState<StudentInfo>(readStudent);
  const [labId, setLabId] = React.useState(project.target?.labId || GRADED_LAB_IDS[0]);
  const [showSolution, setShowSolution] = React.useState(false);
  const [result, setResult] = React.useState<GradeResult | null>(null);
  const [stamp, setStamp] = React.useState<Date | null>(null);
  const labs = LAB_LESSONS.filter((l) => GRADED_LAB_IDS.includes(l.id));
  const saveStudent = (patch: Partial<StudentInfo>) => {
    const next = { ...student, ...patch };
    setStudent(next);
    try { localStorage.setItem(STUDENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const start = () => {
    const lab = labs.find((l) => l.id === labId);
    if (!lab) return;
    if (project.wires.length > 0 && !window.confirm('Starting an exercise replaces the project on the bench. Continue?')) return;
    onChange(() => exerciseProject(lab.project, lab.id, lab.title, showSolution));
    setResult(null);
  };
  const check = () => {
    if (!project.target) return;
    setResult(gradeWork(project, project.target, inspectorErrors));
    setStamp(new Date());
  };
  const input = 'px-1.5 py-0.5 rounded border border-border bg-surface text-[11px]';
  const badge = { pass: 'text-ok', partial: 'text-warning', fail: 'text-danger' } as const;
  return (
    <div className="space-y-3 text-[11px]">
      <div className="grid grid-cols-3 gap-2">
        {(['name', 'course', 'section'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-0.5 capitalize">{k}
            <input className={input} value={student[k]} onChange={(e) => saveStudent({ [k]: e.target.value })} placeholder="kept on this device only" />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <label className="flex flex-col gap-0.5">Graded exercise
          <select className={`${input} max-w-[420px]`} value={labId} onChange={(e) => setLabId(e.target.value)}>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={showSolution} onChange={(e) => setShowSolution(e.target.checked)} />Show what is missing</label>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={start}>Start exercise</button>
        <button className="px-2 py-1 rounded bg-probe text-on-probe font-semibold disabled:opacity-40" disabled={!project.target} onClick={check}>Check my work</button>
        {result && <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold flex items-center gap-1" onClick={() => downloadText(`wirewise_result_${result.labId}.json`, resultJson(student, result, stamp ?? new Date(), project.safeIsolation), 'application/json')}><Download className="w-3 h-3" />Result JSON</button>}
        {result && <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold flex items-center gap-1" onClick={() => window.print()}><Printer className="w-3 h-3" />Print report (A4)</button>}
      </div>
      {!project.target && <div className="text-ink-muted print:hidden">Start an exercise: the devices of the lab are placed with no wiring. Wire them (and build the ladder where asked), then press Check my work.</div>}
      {project.target && <div className="font-semibold">Exercise: {project.target.title}</div>}
      {result && (
        <div className="rounded border border-border p-2.5 space-y-2">
          <div className="text-sm font-bold">Score {result.score} / {result.max} ({result.percent} %)</div>
          <ul className="space-y-1">
            {result.items.map((i) => (
              <li key={i.id} className="flex gap-2"><span className={`font-bold ${badge[i.status]}`}>{i.status === 'pass' ? '✔' : i.status === 'partial' ? '◐' : '✘'}</span><span><b>{i.label}</b> ({i.points} / {i.max}): {i.detail}</span></li>
            ))}
          </ul>
          {project.safeIsolation && project.safeIsolation.done.length > 0 && (
            <div><b>Safe isolation:</b> {ISOLATION_STEPS.filter((st) => project.safeIsolation!.done.includes(st.id)).map((st) => st.label).join(' → ')}</div>
          )}
          <div className="text-[10px] text-ink-muted">{student.name || '(name not set)'} · {student.course || '(course)'} · {student.section || '(section)'} · {(stamp ?? new Date()).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};

export const IsolationTab: React.FC<ReportContext> = ({ project, onChange, isSimulating }) => {
  const state = { ...DEFAULT_ISOLATION, ...(project.safeIsolation ?? {}) };
  const next = nextStep(state);
  const [message, setMessage] = React.useState('');
  const patch = (fn: (s: typeof state) => typeof state) => onChange((p) => ({ ...p, safeIsolation: fn({ ...DEFAULT_ISOLATION, ...(p.safeIsolation ?? {}) }) }));
  const mark = (id: (typeof ISOLATION_STEPS)[number]['id']) => {
    const r = completeStep(state, id, project.devices);
    setMessage(r.ok ? '' : r.reason || '');
    if (r.ok) patch(() => r.state);
  };
  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-0.5">Before Simulate
          <select className="px-1.5 py-0.5 rounded border border-border bg-surface" value={state.mode} onChange={(e) => patch((s) => ({ ...s, mode: e.target.value as typeof s.mode }))}>
            <option value="off">Off (no check)</option>
            <option value="prompt">Prompt (warn once)</option>
            <option value="required">Required (block until done)</option>
          </select>
        </label>
        <button className="px-2 py-1 rounded border border-border bg-surface hover:bg-surface-hover font-semibold" onClick={() => { patch((s) => ({ ...s, done: [], warned: false, log: [] })); setMessage(''); }}>Start over</button>
        {isSimulating && <span className="text-warning font-semibold">The circuit is energized: stop the simulation before isolating.</span>}
      </div>
      <ol className="space-y-1.5">
        {ISOLATION_STEPS.map((s, i) => {
          const done = state.done.includes(s.id);
          const current = next?.id === s.id;
          return (
            <li key={s.id} className={`rounded border p-2 flex items-start gap-2 ${current ? 'border-probe bg-probe-soft' : 'border-border'}`}>
              <span className="font-mono font-bold w-5">{done ? '✔' : i + 1}</span>
              <div className="flex-1">
                <div className="font-bold">{s.label}</div>
                <div className="text-ink-muted">{s.help}</div>
              </div>
              {current && <button className="px-2 py-1 rounded bg-probe text-on-probe font-semibold" onClick={() => mark(s.id)}>Mark done</button>}
            </li>
          );
        })}
        <li className={`rounded border p-2 flex items-start gap-2 ${!next ? 'border-ok' : 'border-border'}`}>
          <span className="font-mono font-bold w-5">{!next ? '▶' : 9}</span>
          <div className="flex-1"><div className="font-bold">Energize</div><div className="text-ink-muted">Press Simulate in the toolbar: allowed once the steps above are done (or always when the mode is Off).</div></div>
        </li>
      </ol>
      {message && <div className="text-danger font-semibold">{message}</div>}
      <div className="text-[9px] text-ink-muted">Isolate, Lock and tag, and Remove the lock are checked against the project (an isolating device open, a padlock on a rotary isolator). The steps are generic good practice: no regulation clause is cited, so check the procedure your site follows.</div>
    </div>
  );
};

export const BASE_TABS: ReportTab[] = [
  { id: 'load', label: 'Load schedule', render: (ctx) => <LoadScheduleTab {...ctx} /> },
  { id: 'bom', label: 'Bill of materials', render: (ctx) => <BomTab {...ctx} /> },
  { id: 'wires', label: 'Wire numbers & terminals', render: (ctx) => <WiresTab {...ctx} /> },
  { id: 'energy', label: 'Energy & billing', render: (ctx) => <EnergyTab {...ctx} /> },
  { id: 'graded', label: 'Graded lab', render: (ctx) => <GradedTab {...ctx} /> },
  { id: 'isolation', label: 'Safe isolation', render: (ctx) => <IsolationTab {...ctx} /> },
  { id: 'share', label: 'Share link', render: (ctx) => <ShareTab {...ctx} /> },
];

/** Modal with one tab per report. Every report only reads the project; none changes the solver. */
export const ReportsPanel: React.FC<{
  project: ElectricalProject;
  onChange: (updater: (p: ElectricalProject) => ElectricalProject) => void;
  onClose: () => void;
  tabs?: ReportTab[];
  energy?: ReportContext['energy'];
  isSimulating?: boolean;
  inspectorErrors?: number;
}> = ({ project, onChange, onClose, tabs = BASE_TABS, energy, isSimulating, inspectorErrors }) => {
  const [active, setActive] = React.useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === active) || tabs[0];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-transparent print:p-0" role="dialog" aria-label="Reports">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col print:max-h-none print:border-0 print:shadow-none">
        <header className="flex items-center gap-2 px-3 h-10 border-b border-border print:hidden">
          <span className="font-display font-bold uppercase tracking-wider text-xs">Reports</span>
          <div className="flex gap-1 ml-3">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActive(t.id)} className={`px-2 py-1 rounded text-[11px] font-semibold transition ${t.id === tab.id ? 'bg-probe text-on-probe' : 'hover:bg-surface-hover text-ink'}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex-1" />
          <button className="p-1 rounded hover:bg-surface-hover" onClick={onClose} aria-label="Close reports"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-3 overflow-auto print-area">
          <div className="hidden print:block mb-2">
            <div className="text-base font-bold">{project.title}</div>
            <div className="text-xs">{project.codeStandard} · {project.gridVoltage} V · {project.gridFrequency} Hz · {new Date().toLocaleDateString()}</div>
          </div>
          {tab.render({ project, onChange, energy, isSimulating, inspectorErrors })}
        </div>
      </div>
    </div>
  );
};
