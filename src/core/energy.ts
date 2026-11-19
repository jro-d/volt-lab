import type { ElectricalDevice, EnergySettings } from '../types/electrical';
import type { SolvedCircuit } from './circuitSolver';
import { loadSpec } from './loadSchedule';

/**
 * Energy and billing. Integrates the present power of every energized load over simulated time (the time scale
 * lets a day pass in seconds: the power is the present operating point held for the scaled time), keeps a
 * per-device ledger, prices it with a tariff typed in by the user and works out the power triangle of the whole
 * installation. It only reads the solver result.
 */

export const DEFAULT_ENERGY: EnergySettings = {
  v: 1,
  enabled: false,
  timeScale: 60,
  tariff: { currency: 'PHP', perKwh: 0, tiers: [] },
};

export interface EnergyLedger {
  /** Simulated seconds accumulated */
  seconds: number;
  byDevice: Record<string, number>;
  totalWh: number;
  peakW: number;
  /** Power triangle at the last step */
  p: number;
  q: number;
  s: number;
  pf: number;
}

export const emptyLedger = (): EnergyLedger => ({ seconds: 0, byDevice: {}, totalWh: 0, peakW: 0, p: 0, q: 0, s: 0, pf: 1 });

/** Real and reactive power (W, var) of one device at this instant: zero unless it is a load and energized. */
export function devicePower(dev: ElectricalDevice, solved: Pick<SolvedCircuit, 'deviceEnergized'>): { p: number; q: number } {
  const spec = loadSpec(dev);
  if (!spec || !solved.deviceEnergized[dev.id]) return { p: 0, q: 0 };
  const p = dev.type === 'appliance_generic' ? (typeof dev.state.wattsNow === 'number' ? dev.state.wattsNow : spec.watts) : spec.watts;
  if (p <= 0) return { p: 0, q: 0 };
  const s = p / spec.pf;
  return { p, q: Math.sqrt(Math.max(0, s * s - p * p)) };
}

/** Adds `dtRealSec x timeScale` seconds of the present power to the ledger (returns a new ledger). */
export function accumulateEnergy(
  ledger: EnergyLedger,
  devices: ElectricalDevice[],
  solved: Pick<SolvedCircuit, 'deviceEnergized'>,
  dtRealSec: number,
  timeScale: number
): EnergyLedger {
  const simDt = dtRealSec * Math.max(1, timeScale);
  const byDevice = { ...ledger.byDevice };
  let p = 0;
  let q = 0;
  for (const d of devices) {
    const pw = devicePower(d, solved);
    if (pw.p <= 0) continue;
    byDevice[d.id] = (byDevice[d.id] || 0) + (pw.p * simDt) / 3600;
    p += pw.p;
    q += pw.q;
  }
  const s = Math.sqrt(p * p + q * q);
  return {
    seconds: ledger.seconds + simDt,
    byDevice,
    totalWh: Object.values(byDevice).reduce((sum, v) => sum + v, 0),
    peakW: Math.max(ledger.peakW, p),
    p,
    q,
    s,
    pf: s > 0 ? p / s : 1,
  };
}

/** Cost of `kwh` with a tariff: progressive tiers if given, otherwise the flat rate. */
export function costForKwh(kwh: number, tariff: EnergySettings['tariff']): number {
  if (kwh <= 0) return 0;
  const tiers = (tariff.tiers ?? []).filter((t) => t.perKwh >= 0);
  if (tiers.length === 0) return kwh * tariff.perKwh;
  let remaining = kwh;
  let lower = 0;
  let cost = 0;
  for (const t of tiers) {
    const cap = t.upToKwh === null ? Infinity : t.upToKwh;
    const inTier = Math.min(remaining, Math.max(0, cap - lower));
    cost += inTier * t.perKwh;
    remaining -= inTier;
    lower = Math.max(lower, cap);
    if (remaining <= 0) return cost;
  }
  return cost + remaining * tariff.perKwh; // above the last tier: the flat rate
}

export interface EnergySummary {
  totalKwh: number;
  simulatedHours: number;
  /** Projected 30-day energy at the average rate seen so far, kWh (null before any energy is recorded) */
  monthKwh: number | null;
  monthCost: number | null;
  costSoFar: number;
  ranking: { deviceId: string; name: string; kwh: number; sharePct: number; cost: number }[];
}

export function summarizeEnergy(ledger: EnergyLedger, devices: ElectricalDevice[], tariff: EnergySettings['tariff']): EnergySummary {
  const totalKwh = ledger.totalWh / 1000;
  const hours = ledger.seconds / 3600;
  const monthKwh = hours > 0 && totalKwh > 0 ? (totalKwh / hours) * 24 * 30 : null;
  const names = new Map(devices.map((d) => [d.id, d.name || d.id]));
  const ranking = Object.entries(ledger.byDevice)
    .map(([id, wh]) => ({
      deviceId: id,
      name: names.get(id) ?? id,
      kwh: Math.round((wh / 1000) * 10000) / 10000,
      sharePct: ledger.totalWh > 0 ? Math.round((wh / ledger.totalWh) * 1000) / 10 : 0,
      cost: Math.round(costForKwh(wh / 1000, tariff) * 100) / 100,
    }))
    .sort((a, b) => b.kwh - a.kwh);
  return {
    totalKwh: Math.round(totalKwh * 10000) / 10000,
    simulatedHours: Math.round(hours * 100) / 100,
    monthKwh: monthKwh === null ? null : Math.round(monthKwh * 10) / 10,
    monthCost: monthKwh === null ? null : Math.round(costForKwh(monthKwh, tariff) * 100) / 100,
    costSoFar: Math.round(costForKwh(totalKwh, tariff) * 100) / 100,
    ranking,
  };
}

export function ledgerToCsv(ledger: EnergyLedger, devices: ElectricalDevice[], tariff: EnergySettings['tariff']): string {
  const sum = summarizeEnergy(ledger, devices, tariff);
  const cell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['Device id', 'Device', 'Energy (kWh)', 'Share (%)', `Cost (${tariff.currency})`].join(',')];
  for (const r of sum.ranking) rows.push([r.deviceId, r.name, r.kwh, r.sharePct, r.cost].map(cell).join(','));
  rows.push(['', 'TOTAL', sum.totalKwh, 100, sum.costSoFar].map(cell).join(','));
  rows.push(['', `Simulated hours: ${sum.simulatedHours}`, '', '', ''].map(cell).join(','));
  rows.push(['', `Peak power (W): ${Math.round(ledger.peakW)}`, '', '', ''].map(cell).join(','));
  if (sum.monthKwh !== null) rows.push(['', `Projected 30 days (kWh): ${sum.monthKwh}`, '', '', sum.monthCost ?? ''].map(cell).join(','));
  return rows.join('\r\n');
}
