import type { ElectricalDevice, ElectricalWire, BomSettings } from '../types/electrical';

/**
 * Bill of materials. Devices are grouped by type and rating, conductors by gauge (their lengths summed with a
 * waste allowance), plus optional conduit and box allowances typed in by the user. No prices are bundled: the user
 * types a unit price for every line (PHP by default) and the totals are worked out here.
 */

export const DEFAULT_BOM: BomSettings = { v: 1, prices: {}, wastePct: 10, contingencyPct: 5, vatPct: 12, conduitM: 0, boxCount: 0, currency: 'PHP' };

export interface BomLine {
  /** Key of the price in `prices` */
  key: string;
  category: string;
  description: string;
  quantity: number;
  unit: 'pcs' | 'm';
  unitPrice: number | null;
  amount: number | null;
}

export interface Bom {
  lines: BomLine[];
  subtotalByCategory: Record<string, number>;
  subtotal: number;
  contingency: number;
  vat: number;
  total: number;
  /** Lines that still have no price */
  unpriced: number;
  currency: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Rating text that distinguishes two devices of the same type (a 16 A and a 20 A breaker are different lines). */
export function ratingLabel(dev: ElectricalDevice): string {
  const s = dev.state;
  const parts: string[] = [];
  if (typeof s.ratedAmps === 'number') parts.push(`${s.ratedAmps} A`);
  if (typeof s.tripCurve === 'string' && s.tripCurve && ['mcb_1p', 'mcb_2p', 'mcb_3p', 'service_disconnect_2p', 'safety_breaker_2p', 'rcbo_1pn'].includes(dev.type)) parts.push(`curve ${s.tripCurve}`);
  if (typeof s.sensitivityMa === 'number') parts.push(`${s.sensitivityMa} mA`);
  else if (typeof s.leakageMa === 'number' && dev.type === 'rcbo_1pn') parts.push(`${s.leakageMa} mA`);
  if (typeof s.wattage === 'number' && dev.category === 'load') parts.push(`${s.wattage} W`);
  if (typeof s.tripAmps === 'number' && dev.type === 'thermal_overload_relay') parts.push(`${s.tripAmps} A dial`);
  return parts.join(', ');
}

export function buildBom(
  devices: ElectricalDevice[],
  wires: ElectricalWire[],
  settings: Partial<BomSettings> = {}
): Bom {
  const cfg: BomSettings = { ...DEFAULT_BOM, ...settings, prices: settings.prices ?? {} };
  const lines: BomLine[] = [];
  const price = (key: string) => (typeof cfg.prices[key] === 'number' && cfg.prices[key] >= 0 ? cfg.prices[key] : null);
  const add = (key: string, category: string, description: string, quantity: number, unit: 'pcs' | 'm') => {
    const unitPrice = price(key);
    lines.push({ key, category, description, quantity, unit, unitPrice, amount: unitPrice === null ? null : round2(unitPrice * quantity) });
  };

  // devices by type and rating
  const groups = new Map<string, { category: string; name: string; qty: number }>();
  for (const d of devices) {
    const rating = ratingLabel(d);
    const key = `device:${d.type}${rating ? `|${rating}` : ''}`;
    const g = groups.get(key) ?? { category: d.category, name: `${d.modelNumber || d.name}${rating ? ` (${rating})` : ''}`, qty: 0 };
    g.qty += 1;
    groups.set(key, g);
  }
  for (const [key, g] of [...groups].sort((a, b) => a[1].category.localeCompare(b[1].category) || a[1].name.localeCompare(b[1].name))) {
    add(key, `Devices: ${g.category}`, g.name, g.qty, 'pcs');
  }

  // conductors by gauge: summed length plus the waste allowance
  const byGauge = new Map<string, number>();
  for (const w of wires) byGauge.set(w.wireGauge, (byGauge.get(w.wireGauge) || 0) + (w.lengthMeters || 0));
  for (const [gauge, metres] of [...byGauge].sort((a, b) => a[0].localeCompare(b[0]))) {
    add(`wire:${gauge}`, 'Conductors', `Conductor ${gauge} (+${cfg.wastePct} % waste)`, round2(metres * (1 + cfg.wastePct / 100)), 'm');
  }

  // optional allowances typed in by the user
  if (cfg.conduitM > 0) add('allowance:conduit', 'Allowances', 'Conduit allowance', cfg.conduitM, 'm');
  if (cfg.boxCount > 0) add('allowance:box', 'Allowances', 'Box allowance', cfg.boxCount, 'pcs');

  const subtotalByCategory: Record<string, number> = {};
  for (const l of lines) if (l.amount !== null) subtotalByCategory[l.category] = round2((subtotalByCategory[l.category] || 0) + l.amount);
  const subtotal = round2(Object.values(subtotalByCategory).reduce((s, v) => s + v, 0));
  const contingency = round2(subtotal * (cfg.contingencyPct / 100));
  const vat = round2((subtotal + contingency) * (cfg.vatPct / 100));
  return {
    lines,
    subtotalByCategory,
    subtotal,
    contingency,
    vat,
    total: round2(subtotal + contingency + vat),
    unpriced: lines.filter((l) => l.unitPrice === null).length,
    currency: cfg.currency,
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function bomToCsv(bom: Bom): string {
  const out = [['Category', 'Description', 'Qty', 'Unit', `Unit price (${bom.currency})`, `Amount (${bom.currency})`].join(',')];
  for (const l of bom.lines) out.push([l.category, l.description, l.quantity, l.unit, l.unitPrice ?? '', l.amount ?? ''].map(csvCell).join(','));
  out.push('');
  for (const [cat, v] of Object.entries(bom.subtotalByCategory)) out.push(['Subtotal', cat, '', '', '', v].map(csvCell).join(','));
  out.push(['Subtotal', 'All', '', '', '', bom.subtotal].map(csvCell).join(','));
  out.push(['Contingency', '', '', '', '', bom.contingency].map(csvCell).join(','));
  out.push(['VAT', '', '', '', '', bom.vat].map(csvCell).join(','));
  out.push(['TOTAL', '', '', '', '', bom.total].map(csvCell).join(','));
  return out.join('\r\n');
}
