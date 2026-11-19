import type { ElectricalDevice, ElectricalWire, WireNumberingSettings } from '../types/electrical';
import { wireCircuits } from './loadSchedule';

/**
 * Wire numbering and terminal-strip documents. The numbers are written into `ElectricalWire.label` (the user can
 * edit them afterwards); the terminal-strip tables and the SVG drawing only read the project.
 */

export const DEFAULT_NUMBERING: WireNumberingSettings = {
  v: 1,
  scheme: 'sequential',
  prefix: 'W',
  titleBlock: { project: '', drawnBy: '', checkedBy: '', date: '', sheet: '1 / 1' },
};

export type NumberingScheme = WireNumberingSettings['scheme'];

/** Reference designation of a device: its tag, else the first word of its name, else its id. */
export function refTag(dev: ElectricalDevice): string {
  if (typeof dev.state.tag === 'string' && dev.state.tag) return dev.state.tag;
  const first = (dev.name || '').split(/\s+/)[0];
  return /^[A-Za-z]{1,4}\d{1,3}$/.test(first) ? first : dev.id;
}

/** New labels by wire id for the chosen scheme. Wires are taken in a stable order (device, terminal). */
export function numberWires(devices: ElectricalDevice[], wires: ElectricalWire[], scheme: NumberingScheme, prefix: string): Record<string, string> {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const tag = (id: string) => (byId.has(id) ? refTag(byId.get(id)!) : id);
  const ordered = [...wires].sort((a, b) =>
    (a.fromDeviceId + a.fromTerminalId + a.toDeviceId + a.toTerminalId).localeCompare(b.fromDeviceId + b.fromTerminalId + b.toDeviceId + b.toTerminalId));
  const out: Record<string, string> = {};
  if (scheme === 'sequential') {
    ordered.forEach((w, i) => { out[w.id] = `${prefix}${i + 1}`; });
  } else if (scheme === 'from-to') {
    for (const w of ordered) out[w.id] = `${tag(w.fromDeviceId)}.${w.fromTerminalId}-${tag(w.toDeviceId)}.${w.toTerminalId}`;
  } else {
    // per circuit: <prefix><circuit>.<n>; wires that are on no load path get <prefix>0.<n>
    const circuits = wireCircuits(devices, wires);
    const counters: Record<number, number> = {};
    for (const w of ordered) {
      const c = circuits[w.id] ?? 0;
      counters[c] = (counters[c] || 0) + 1;
      out[w.id] = `${prefix}${c}.${counters[c]}`;
    }
  }
  return out;
}

export interface StripEnd {
  /** Wire label (or id) */
  wire: string;
  destination: string;
}

export interface StripRow {
  pole: string;
  incoming: StripEnd[];
  outgoing: StripEnd[];
}

export interface TerminalStrip {
  deviceId: string;
  tag: string;
  kind: string;
  rows: StripRow[];
}

/** One strip per terminal block / distribution block: for each pole the wires on its top (incoming) and bottom (outgoing) side. */
export function terminalStrips(devices: ElectricalDevice[], wires: ElectricalWire[]): TerminalStrip[] {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const strips: TerminalStrip[] = [];
  for (const dev of devices) {
    if (dev.type !== 'terminal_block' && dev.type !== 'distribution_block') continue;
    const ends = (terminalId: string): StripEnd[] => {
      const out: StripEnd[] = [];
      for (const w of wires) {
        let other: [string, string] | null = null;
        if (w.fromDeviceId === dev.id && w.fromTerminalId === terminalId) other = [w.toDeviceId, w.toTerminalId];
        else if (w.toDeviceId === dev.id && w.toTerminalId === terminalId) other = [w.fromDeviceId, w.fromTerminalId];
        if (!other) continue;
        const od = byId.get(other[0]);
        out.push({ wire: w.label || w.id, destination: `${od ? refTag(od) : other[0]}:${other[1]}` });
      }
      return out;
    };
    const rows: StripRow[] = [];
    const poles = new Set<string>();
    for (const t of dev.terminals) poles.add(t.id.replace(/^[a-z]+/i, '') || t.id);
    for (const pole of [...poles].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))) {
      const top = dev.terminals.find((t) => t.relY < 0.5 && t.id.replace(/^[a-z]+/i, '') === pole);
      const bottom = dev.terminals.find((t) => t.relY >= 0.5 && t.id.replace(/^[a-z]+/i, '') === pole);
      rows.push({ pole, incoming: top ? ends(top.id) : [], outgoing: bottom ? ends(bottom.id) : [] });
    }
    strips.push({ deviceId: dev.id, tag: refTag(dev), kind: String(dev.state.kind || dev.type), rows });
  }
  return strips;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Standalone SVG of a terminal strip with its title block (works offline, prints to PDF from the browser). */
export function terminalStripSvg(strip: TerminalStrip, title: WireNumberingSettings['titleBlock'], projectTitle: string): string {
  const colW = 120;
  const rowH = 54;
  const left = 70;
  const W = Math.max(480, left + strip.rows.length * colW + 20);
  const H = 120 + rowH * 2 + 90;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="monospace" font-size="10">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
  parts.push(`<text x="10" y="18" font-size="13" font-weight="bold">Terminal strip ${esc(strip.tag)} (${esc(strip.kind)})</text>`);
  parts.push(`<text x="10" y="64" font-weight="bold">INCOMING</text><text x="10" y="170" font-weight="bold">OUTGOING</text>`);
  strip.rows.forEach((r, i) => {
    const x = left + i * colW;
    parts.push(`<rect x="${x}" y="80" width="${colW - 16}" height="36" fill="#e5e7eb" stroke="#111"/>`);
    parts.push(`<text x="${x + (colW - 16) / 2}" y="103" text-anchor="middle" font-size="13" font-weight="bold">${esc(r.pole)}</text>`);
    r.incoming.forEach((e, k) => parts.push(`<text x="${x}" y="${72 - k * 11}" font-size="9">${esc(e.wire)} &#8592; ${esc(e.destination)}</text>`));
    r.outgoing.forEach((e, k) => parts.push(`<text x="${x}" y="${132 + k * 11}" font-size="9">${esc(e.wire)} &#8594; ${esc(e.destination)}</text>`));
  });
  const ty = H - 78;
  parts.push(`<rect x="10" y="${ty}" width="${W - 20}" height="68" fill="none" stroke="#111"/>`);
  parts.push(`<line x1="${W / 2}" y1="${ty}" x2="${W / 2}" y2="${ty + 68}" stroke="#111"/><line x1="10" y1="${ty + 34}" x2="${W - 10}" y2="${ty + 34}" stroke="#111"/>`);
  parts.push(`<text x="16" y="${ty + 14}">Project: ${esc(title.project || projectTitle)}</text><text x="${W / 2 + 6}" y="${ty + 14}">Sheet: ${esc(title.sheet)}</text>`);
  parts.push(`<text x="16" y="${ty + 28}">Strip: ${esc(strip.tag)}</text><text x="${W / 2 + 6}" y="${ty + 28}">Date: ${esc(title.date)}</text>`);
  parts.push(`<text x="16" y="${ty + 52}">Drawn by: ${esc(title.drawnBy)}</text><text x="${W / 2 + 6}" y="${ty + 52}">Checked by: ${esc(title.checkedBy)}</text>`);
  parts.push('</svg>');
  return parts.join('');
}

/** CSV of every wire: label, from, to, gauge, length. */
export function wireListCsv(devices: ElectricalDevice[], wires: ElectricalWire[]): string {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const tag = (id: string) => (byId.has(id) ? refTag(byId.get(id)!) : id);
  const cell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['Label', 'From', 'To', 'Gauge', 'Length (m)'].join(',')];
  for (const w of wires) rows.push([w.label || '', `${tag(w.fromDeviceId)}:${w.fromTerminalId}`, `${tag(w.toDeviceId)}:${w.toTerminalId}`, w.wireGauge, w.lengthMeters].map(cell).join(','));
  return rows.join('\r\n');
}
