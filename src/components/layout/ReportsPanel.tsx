import React from 'react';
import type { ElectricalProject } from '../../types/electrical';
import { buildLoadSchedule, scheduleToCsv } from '../../core/loadSchedule';
import { buildBom, bomToCsv, DEFAULT_BOM } from '../../core/bom';
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

export const BASE_TABS: ReportTab[] = [
  { id: 'load', label: 'Load schedule', render: (ctx) => <LoadScheduleTab {...ctx} /> },
  { id: 'bom', label: 'Bill of materials', render: (ctx) => <BomTab {...ctx} /> },
  { id: 'wires', label: 'Wire numbers & terminals', render: (ctx) => <WiresTab {...ctx} /> },
  { id: 'share', label: 'Share link', render: (ctx) => <ShareTab {...ctx} /> },
];

/** Modal with one tab per report. Every report only reads the project; none changes the solver. */
export const ReportsPanel: React.FC<{
  project: ElectricalProject;
  onChange: (updater: (p: ElectricalProject) => ElectricalProject) => void;
  onClose: () => void;
  tabs?: ReportTab[];
}> = ({ project, onChange, onClose, tabs = BASE_TABS }) => {
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
          {tab.render({ project, onChange })}
        </div>
      </div>
    </div>
  );
};
