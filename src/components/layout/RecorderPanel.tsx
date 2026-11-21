import React from 'react';
import { ElectricalDevice, RecorderChannel } from '../../types/electrical';
import { Recorder, signalsForDevice, toCsv } from '../../core/recorder';
import { Activity, ChevronDown, ChevronUp, Download, Eraser, Pause, Play, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';

interface RecorderPanelProps {
  recorder: Recorder;
  /** Bumped by the app on every sample so the chart redraws */
  version: number;
  channels: RecorderChannel[];
  selectedDevice: ElectricalDevice | null;
  selectedWireId: string | null;
  isSimulating: boolean;
  paused: boolean;
  onAddChannel: (channel: Omit<RecorderChannel, 'id'>) => void;
  onRemoveChannel: (id: string) => void;
  onClear: () => void;
  onTogglePause: () => void;
  onClose: () => void;
}

const COLORS = ['#38bdf8', '#f59e0b', '#22c55e', '#f43f5e', '#a78bfa', '#14b8a6', '#eab308', '#fb7185'];
const LABEL_W = 64;
const PAD_R = 10;
const AXIS_H = 20;
const DIGITAL_LANE = 30;
const ANALOG_LANE = 52;

const niceStep = (span: number) => {
  const raw = span / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
};

/**
 * Bottom-dock timing diagram recorder. Digital channels draw as step traces, analog channels as lines; the cursor
 * reads every channel at one time. Wheel zooms around the cursor, dragging pans, Fit shows everything.
 */
export const RecorderPanel: React.FC<RecorderPanelProps> = ({
  recorder,
  version,
  channels,
  selectedDevice,
  selectedWireId,
  isSimulating,
  paused,
  onAddChannel,
  onRemoveChannel,
  onClear,
  onTogglePause,
  onClose,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [view, setView] = React.useState<{ t0: number; span: number } | null>(null);
  const [cursorT, setCursorT] = React.useState<number | null>(null);
  const [pick, setPick] = React.useState('0');
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [width, setWidth] = React.useState(700);
  const drag = React.useRef<{ x: number; t0: number } | null>(null);

  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(300, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(300, el.clientWidth));
    return () => ro.disconnect();
  }, [collapsed]);

  // `version` is only a redraw trigger
  void version;
  const snap = recorder.snapshot();
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const fg = dark ? '#e8ebee' : '#1f2933';
  const muted = dark ? '#8a94a0' : '#6b7785';
  const grid = dark ? '#2a323b' : '#dde2e8';
  const bg = dark ? '#12171c' : '#ffffff';

  const tFirst = snap.times.length ? snap.times[0] : 0;
  const tLast = snap.times.length ? snap.times[snap.times.length - 1] : 0;
  const fit = { t0: tFirst, span: Math.max(10, tLast - tFirst) };
  const v = view || fit;
  const plotW = width - LABEL_W - PAD_R;
  const xOf = (t: number) => LABEL_W + ((t - v.t0) / v.span) * plotW;
  const tOf = (x: number) => v.t0 + ((x - LABEL_W) / plotW) * v.span;

  const lanes = channels.map((ch) => (ch.kind === 'digital' ? DIGITAL_LANE : ANALOG_LANE));
  const laneY: number[] = [];
  lanes.reduce((y, h, i) => {
    laneY[i] = y;
    return y + h;
  }, AXIS_H);
  const height = AXIS_H + lanes.reduce((a, b) => a + b, 0) + 4;

  const valueAt = (c: number, t: number) => {
    let best = -1;
    for (let i = 0; i < snap.times.length; i++) if (snap.times[i] <= t) best = i;
    return best >= 0 ? snap.values[c][best] : null;
  };

  const trace = (c: number) => {
    const ch = channels[c];
    const ys = laneY[c];
    const h = lanes[c];
    const vals = snap.values[c];
    const inView: number[] = [];
    for (let i = 0; i < snap.times.length; i++) {
      if (snap.times[i] >= v.t0 - v.span * 0.02 && snap.times[i] <= v.t0 + v.span * 1.02) inView.push(i);
    }
    const step = Math.max(1, Math.floor(inView.length / (plotW * 2)));
    const pts = inView.filter((_, k) => k % step === 0);
    if (!pts.length) return '';
    if (ch.kind === 'digital') {
      const hi = ys + 5;
      const lo = ys + h - 6;
      let d = `M${xOf(snap.times[pts[0]])} ${vals[pts[0]] > 0.5 ? hi : lo}`;
      for (let k = 1; k < pts.length; k++) {
        const x = xOf(snap.times[pts[k]]);
        d += `H${x}V${vals[pts[k]] > 0.5 ? hi : lo}`;
      }
      return d + `H${xOf(Math.min(v.t0 + v.span, tLast))}`;
    }
    let min = Infinity;
    let max = -Infinity;
    for (const i of pts) {
      min = Math.min(min, vals[i]);
      max = Math.max(max, vals[i]);
    }
    if (max - min < 1e-6) {
      max = min + 1;
    }
    const yOf = (val: number) => ys + h - 6 - ((val - min) / (max - min)) * (h - 12);
    return pts.map((i, k) => `${k === 0 ? 'M' : 'L'}${xOf(snap.times[i])} ${yOf(vals[i])}`).join('');
  };

  const range = (c: number) => {
    const vals = snap.values[c];
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < vals.length; i++) {
      if (snap.times[i] < v.t0 || snap.times[i] > v.t0 + v.span) continue;
      min = Math.min(min, vals[i]);
      max = Math.max(max, vals[i]);
    }
    return Number.isFinite(min) ? [min, max] : [0, 0];
  };

  const zoom = (factor: number, centerT?: number) => {
    const c = centerT ?? v.t0 + v.span / 2;
    const span = Math.min(Math.max(v.span * factor, 1), 100000);
    setView({ t0: c - ((c - v.t0) / v.span) * span, span });
  };

  const options = React.useMemo(() => {
    const list: Omit<RecorderChannel, 'id'>[] = selectedDevice ? signalsForDevice(selectedDevice) : [];
    if (selectedWireId) list.push({ label: `I wire ${selectedWireId}`, kind: 'analog', unit: 'A', source: { kind: 'current', wireId: selectedWireId } });
    return list;
  }, [selectedDevice, selectedWireId]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(snap, channels)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wirewise_recording.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'wirewise_timing_diagram.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  };

  const btn = 'p-1 rounded border border-border bg-surface hover:bg-surface-hover text-ink transition';
  const tickStep = niceStep(v.span);
  const ticks: number[] = [];
  for (let t = Math.ceil(v.t0 / tickStep) * tickStep; t <= v.t0 + v.span; t += tickStep) ticks.push(t);

  return (
    <section className="shrink-0 border-t border-border bg-surface flex flex-col z-20" aria-label="Timing diagram recorder">
      <header className="h-8 flex items-center gap-2 px-3 text-[11px] font-semibold text-ink">
        <Activity className="w-3.5 h-3.5 text-probe" />
        <span className="uppercase tracking-wider font-display">Recorder</span>
        <span className="text-ink-muted font-mono">{snap.times.length} samples · {tLast.toFixed(1)} s</span>
        {paused && <span className="text-warning font-mono">PAUSED</span>}
        <div className="flex-1" />
        {!collapsed && (
          <>
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="max-w-[220px] bg-surface border border-border rounded px-1 py-0.5 text-[11px] font-mono text-ink"
              title="Signals of the selected device (select a device on the canvas first)"
            >
              {options.length === 0 && <option value="0">Select a device or a wire…</option>}
              {options.map((o, i) => (
                <option key={`${o.label}-${i}`} value={String(i)}>{o.label}</option>
              ))}
            </select>
            <button className={btn} title="Add the chosen signal as a channel" disabled={options.length === 0} onClick={() => options[Number(pick)] && onAddChannel(options[Number(pick)])}>
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              className={`${btn} text-[10px] px-1.5`}
              title="Add every on / off signal of the selected device"
              disabled={options.length === 0}
              onClick={() => options.filter((o) => o.kind === 'digital').slice(0, 6).forEach((o) => onAddChannel(o))}
            >
              + on/off
            </button>
            <span className="w-px h-4 bg-border" />
            <button className={btn} title={paused ? 'Resume recording' : 'Pause recording'} onClick={onTogglePause}>
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button className={btn} title="Clear the recording" onClick={onClear}><Eraser className="w-3.5 h-3.5" /></button>
            <button className={btn} title="Zoom in" onClick={() => zoom(0.5, cursorT ?? undefined)}><ZoomIn className="w-3.5 h-3.5" /></button>
            <button className={btn} title="Zoom out" onClick={() => zoom(2, cursorT ?? undefined)}><ZoomOut className="w-3.5 h-3.5" /></button>
            <button className={`${btn} text-[10px] px-1.5`} title="Show the whole recording" onClick={() => setView(null)}>Fit</button>
            <button className={`${btn} text-[10px] px-1.5 flex items-center gap-1`} onClick={exportPng} title="Export PNG"><Download className="w-3 h-3" />PNG</button>
            <button className={`${btn} text-[10px] px-1.5 flex items-center gap-1`} onClick={exportCsv} title="Export CSV"><Download className="w-3 h-3" />CSV</button>
          </>
        )}
        <button className={btn} onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button className={btn} onClick={onClose} title="Hide the recorder"><X className="w-3.5 h-3.5" /></button>
      </header>

      {!collapsed && (
        <div className="flex" style={{ height: Math.min(260, Math.max(110, height + 8)) }}>
          <ul className="w-52 shrink-0 overflow-y-auto border-r border-border text-[11px] font-mono" style={{ paddingTop: AXIS_H }}>
            {channels.length === 0 && (
              <li className="px-2 py-1 text-ink-muted font-sans">
                Select a device on the canvas, pick a signal above and press +.{isSimulating ? '' : ' Press Simulate to record.'}
              </li>
            )}
            {channels.map((ch, i) => {
              const val = cursorT !== null ? valueAt(i, cursorT) : snap.values[i]?.[snap.values[i].length - 1] ?? null;
              return (
                <li key={ch.id} className="flex items-center gap-1.5 px-2" style={{ height: lanes[i] }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate flex-1 text-ink" title={ch.label}>{ch.label}</span>
                  <span className="text-ink-muted tabular-nums">
                    {val === null ? '' : ch.kind === 'digital' ? (val > 0.5 ? '1' : '0') : `${val.toFixed(2)}${ch.unit ? ' ' + ch.unit : ''}`}
                  </span>
                  <button className="text-ink-muted hover:text-danger" onClick={() => onRemoveChannel(ch.id)} title="Remove channel"><X className="w-3 h-3" /></button>
                </li>
              );
            })}
          </ul>
          <div ref={wrapRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            <svg
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg"
              width={width}
              height={height}
              style={{ display: 'block', cursor: drag.current ? 'grabbing' : 'crosshair' }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                setCursorT(x >= LABEL_W ? tOf(x) : null);
                if (drag.current) {
                  const dt = ((e.clientX - drag.current.x) / plotW) * v.span;
                  setView({ t0: drag.current.t0 - dt, span: v.span });
                }
              }}
              onMouseDown={(e) => {
                drag.current = { x: e.clientX, t0: v.t0 };
              }}
              onMouseUp={() => {
                drag.current = null;
              }}
              onMouseLeave={() => {
                drag.current = null;
                setCursorT(null);
              }}
              onWheel={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                zoom(e.deltaY > 0 ? 1.25 : 0.8, tOf(e.clientX - rect.left));
              }}
            >
              <rect width={width} height={height} fill={bg} />
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={xOf(t)} x2={xOf(t)} y1={AXIS_H - 4} y2={height} stroke={grid} strokeWidth={1} />
                  <text x={xOf(t)} y={12} fontSize={9} textAnchor="middle" fill={muted} fontFamily="monospace">{`${Math.round(t * 100) / 100}s`}</text>
                </g>
              ))}
              {channels.map((ch, i) => (
                <g key={ch.id}>
                  <line x1={LABEL_W} x2={width - PAD_R} y1={laneY[i] + lanes[i]} y2={laneY[i] + lanes[i]} stroke={grid} strokeWidth={1} />
                  <text x={4} y={laneY[i] + 12} fontSize={8} fill={muted} fontFamily="monospace">{ch.kind === 'digital' ? 'HI' : range(i)[1].toFixed(1)}</text>
                  <text x={4} y={laneY[i] + lanes[i] - 5} fontSize={8} fill={muted} fontFamily="monospace">{ch.kind === 'digital' ? 'LO' : range(i)[0].toFixed(1)}</text>
                  <path d={trace(i)} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={1.6} strokeLinejoin="round" />
                </g>
              ))}
              {cursorT !== null && (
                <g>
                  <line x1={xOf(cursorT)} x2={xOf(cursorT)} y1={AXIS_H - 4} y2={height} stroke={fg} strokeWidth={1} strokeDasharray="3 3" />
                  <text x={Math.min(xOf(cursorT) + 4, width - 50)} y={height - 4} fontSize={9} fill={fg} fontFamily="monospace">{`${cursorT.toFixed(1)} s`}</text>
                </g>
              )}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
};
