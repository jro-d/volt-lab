import type { ElectricalDevice, RecorderChannel } from '../types/electrical';
import type { SolvedCircuit } from './circuitSolver';

/**
 * Timing diagram recorder: samples chosen signals at every simulation tick into a ring buffer.
 * Digital channels (booleans) are drawn as step traces, analog channels (numbers) as lines.
 */
export const RECORDER_CAPACITY = 20000;

/** State keys that are geometry or bookkeeping, never worth recording */
const SKIP_KEYS = new Set(['x', 'y', 'width', 'height', 'rotation', 'tag', 'viewMode', 'tripReason', 'plcInputs', 'plcOutputs', 'program']);

export interface SignalOption {
  channel: Omit<RecorderChannel, 'id'>;
}

/** Everything that can be recorded for a device: its boolean / numeric state, energized flag, terminal voltages. */
export function signalsForDevice(dev: ElectricalDevice): Omit<RecorderChannel, 'id'>[] {
  const tag = (typeof dev.state.tag === 'string' && dev.state.tag) || dev.name.split(' ')[0] || dev.id;
  const out: Omit<RecorderChannel, 'id'>[] = [
    { label: `${tag} energized`, kind: 'digital', source: { kind: 'energized', deviceId: dev.id } },
  ];
  for (const [key, value] of Object.entries(dev.state)) {
    if (SKIP_KEYS.has(key)) continue;
    if (typeof value === 'boolean') out.push({ label: `${tag} ${key}`, kind: 'digital', source: { kind: 'state', deviceId: dev.id, key } });
    else if (typeof value === 'number' && Number.isFinite(value)) out.push({ label: `${tag} ${key}`, kind: 'analog', source: { kind: 'state', deviceId: dev.id, key } });
  }
  for (const t of dev.terminals) {
    out.push({ label: `V ${tag}:${t.label || t.id}`, kind: 'analog', unit: 'V', source: { kind: 'voltage', deviceId: dev.id, terminalId: t.id } });
  }
  return out;
}

/** Current value of one channel (booleans as 0 / 1). NaN when the source no longer exists. */
export function readChannel(ch: RecorderChannel, devices: ElectricalDevice[], solved: SolvedCircuit): number {
  const s = ch.source;
  if (s.kind === 'current') return solved.wireCurrents[s.wireId] ?? 0;
  const dev = devices.find((d) => d.id === s.deviceId);
  if (!dev) return NaN;
  if (s.kind === 'energized') return solved.deviceEnergized[dev.id] ? 1 : 0;
  if (s.kind === 'voltage') return solved.nodeVoltages[`${dev.id}:${s.terminalId}`] ?? 0;
  const v = dev.state[s.key];
  if (typeof v === 'boolean') return v ? 1 : 0;
  return typeof v === 'number' ? v : 0;
}

export interface RecorderSnapshot {
  times: number[];
  /** One array per channel, same length as times */
  values: number[][];
}

/**
 * Ring buffer of samples. Times are simulation seconds since the recording started. When the buffer is full the
 * oldest sample is overwritten. A channel added mid-recording reads 0 for the samples before it existed.
 */
export class Recorder {
  readonly capacity: number;
  private times: Float64Array;
  private data: Float32Array[] = [];
  private channelIds: string[] = [];
  private start = 0;
  private length = 0;
  /** Simulation time of the next sample */
  time = 0;
  paused = false;

  constructor(capacity = RECORDER_CAPACITY) {
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
  }

  get count() {
    return this.length;
  }

  clear() {
    this.start = 0;
    this.length = 0;
    this.time = 0;
    for (const d of this.data) d.fill(0);
  }

  /** Keep the buffer columns in step with the channel list (new channels get a zeroed column). */
  syncChannels(channels: RecorderChannel[]) {
    const ids = channels.map((c) => c.id);
    if (ids.length === this.channelIds.length && ids.every((id, i) => id === this.channelIds[i])) return;
    const next: Float32Array[] = ids.map((id) => {
      const old = this.channelIds.indexOf(id);
      return old >= 0 ? this.data[old] : new Float32Array(this.capacity);
    });
    this.data = next;
    this.channelIds = ids;
  }

  /** Records one sample row at the current time, then advances time by dtSec. */
  sample(channels: RecorderChannel[], devices: ElectricalDevice[], solved: SolvedCircuit, dtSec: number) {
    this.syncChannels(channels);
    if (this.paused || channels.length === 0) return;
    const idx = (this.start + this.length) % this.capacity;
    if (this.length < this.capacity) this.length++;
    else this.start = (this.start + 1) % this.capacity;
    this.times[idx] = this.time;
    channels.forEach((ch, i) => {
      const v = readChannel(ch, devices, solved);
      this.data[i][idx] = Number.isFinite(v) ? v : 0;
    });
    this.time += dtSec;
  }

  snapshot(): RecorderSnapshot {
    const times: number[] = [];
    const values: number[][] = this.data.map(() => []);
    for (let i = 0; i < this.length; i++) {
      const idx = (this.start + i) % this.capacity;
      times.push(this.times[idx]);
      this.data.forEach((col, c) => values[c].push(col[idx]));
    }
    return { times, values };
  }
}

/** Time of the first sample of a digital channel where it is 1 (or after `after`), or null. */
export function firstRise(snap: RecorderSnapshot, channel: number, after = -Infinity): number | null {
  for (let i = 0; i < snap.times.length; i++) {
    if (snap.times[i] >= after && snap.values[channel][i] > 0.5 && (i === 0 || snap.values[channel][i - 1] <= 0.5)) return snap.times[i];
  }
  return null;
}

/** CSV with a time column and one column per channel (digital as 0 / 1). */
export function toCsv(snap: RecorderSnapshot, channels: RecorderChannel[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = ['time_s', ...channels.map((c) => esc(c.label + (c.unit ? ` (${c.unit})` : '')))].join(',');
  const rows = snap.times.map((t, i) => [t.toFixed(2), ...snap.values.map((col) => String(Math.round(col[i] * 1000) / 1000))].join(','));
  return [head, ...rows].join('\n');
}
