import React from 'react';
import { CodeStandard, ElectricalDevice, ElectricalWire } from '../../types/electrical';
import type { SolvedCircuit } from '../../core/circuitSolver';
import {
  T_MAX, T_MIN, bandAt, cableDamageTime, cableLimitSpec, curveForDevice, findOverlap, motorStartSpec, nominalTime, operatingAmps, plotRange,
  type DeviceCurveSpec,
} from '../../core/curves';
import { ChevronDown, ChevronUp, Download, Plus, Spline, X, ArrowUp, ArrowDown } from 'lucide-react';

interface CurvesPanelProps {
  devices: ElectricalDevice[];
  wires: ElectricalWire[];
  solved: SolvedCircuit;
  standard: CodeStandard;
  isSimulating: boolean;
  selectedDeviceId: string | null;
  selectedWireId: string | null;
  curves: { v: 1; chain: string[]; wireId?: string; motorId?: string } | undefined;
  onChange: (next: { v: 1; chain: string[]; wireId?: string; motorId?: string }) => void;
  onClose: () => void;
}

const COLORS = ['#38bdf8', '#f59e0b', '#22c55e', '#a78bfa', '#14b8a6', '#fb7185'];
const W = 720;
const H = 300;
const ML = 46;
const MB = 24;
const MT = 8;
const MR = 12;

const fmtA = (a: number) => (a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : a >= 10 ? a.toFixed(0) : a.toFixed(1));
const fmtT = (t: number) => (t >= 1 ? `${t}` : t >= 0.01 ? `${t}` : `${t}`);

/**
 * Time-current coordination plot (log-log, amps against seconds). Pick the devices of a chain, upstream first: each
 * is drawn as a band between its fastest and slowest operating time; where an upstream and a downstream device
 * overlap (not selective) the region is shaded red. The solver's present current is marked on each device, the
 * motor start and the cable damage limit can be added, and the plot exports to PNG.
 */
export const CurvesPanel: React.FC<CurvesPanelProps> = ({
  devices, wires, solved, standard, isSimulating, selectedDeviceId, selectedWireId, curves, onChange, onClose,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const state = curves || { v: 1 as const, chain: [] };

  const specs: DeviceCurveSpec[] = state.chain
    .map((id) => devices.find((d) => d.id === id))
    .map((d) => (d ? curveForDevice(d) : null))
    .filter((s): s is DeviceCurveSpec => !!s);
  const motor = devices.find((d) => d.id === state.motorId);
  const motorSpec = motor ? motorStartSpec(motor, 440) : null;
  const wire = wires.find((w) => w.id === state.wireId);
  const cable = wire ? cableLimitSpec(wire, standard) : null;

  const [xLo, xHi] = plotRange(specs, [motorSpec?.startAmps ?? 0, cable ? cable.k * cable.area : 0]);
  const x = (a: number) => ML + ((Math.log10(a) - Math.log10(xLo)) / (Math.log10(xHi) - Math.log10(xLo))) * (W - ML - MR);
  const y = (t: number) => MT + ((Math.log10(T_MAX) - Math.log10(Math.min(T_MAX, Math.max(T_MIN, t)))) / (Math.log10(T_MAX) - Math.log10(T_MIN))) * (H - MT - MB);

  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const fg = dark ? '#e8ebee' : '#1f2933';
  const muted = dark ? '#8a94a0' : '#6b7785';
  const gridC = dark ? '#2a323b' : '#dde2e8';
  const bg = dark ? '#12171c' : '#ffffff';

  const samples = React.useMemo(() => {
    const out: number[] = [];
    const n = 300;
    for (let i = 0; i < n; i++) out.push(xLo * Math.pow(xHi / xLo, i / (n - 1)));
    return out;
  }, [xLo, xHi]);

  const bandPath = (spec: DeviceCurveSpec) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (const a of samples) {
      const b = bandAt(spec, a);
      if (!b) continue;
      top.push(`${x(a)} ${y(b.tMax)}`);
      bottom.push(`${x(a)} ${y(b.tMin)}`);
    }
    if (top.length < 2) return '';
    return `M${top.join('L')}L${bottom.reverse().join('L')}Z`;
  };

  const overlaps = specs.slice(0, -1).map((up, i) => findOverlap(up, specs[i + 1], xLo, xHi));

  const cablePath = () => {
    if (!cable) return '';
    const pts: string[] = [];
    for (const a of samples) {
      const t = cableDamageTime(cable, a);
      if (t > 5 || t < T_MIN) continue;
      pts.push(`${pts.length ? 'L' : 'M'}${x(a)} ${y(t)}`);
    }
    return pts.join('');
  };

  const addDevice = (id: string | null) => {
    const dev = devices.find((d) => d.id === id);
    if (!dev) return;
    if (curveForDevice(dev)) {
      if (!state.chain.includes(dev.id)) onChange({ ...state, chain: [...state.chain, dev.id] });
    } else if (dev.type === 'motor_ac_industrial' || dev.type === 'pump_booster_3p' || dev.type === 'motor_6lead_star_delta') {
      onChange({ ...state, motorId: dev.id });
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= state.chain.length) return;
    const chain = [...state.chain];
    [chain[i], chain[j]] = [chain[j], chain[i]];
    onChange({ ...state, chain });
  };

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'wirewise_time_current_curves.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  };

  const btn = 'p-1 rounded border border-border bg-surface hover:bg-surface-hover text-ink transition disabled:opacity-40';
  const decadesX: number[] = [];
  for (let d = Math.ceil(Math.log10(xLo)); d <= Math.floor(Math.log10(xHi)); d++) decadesX.push(Math.pow(10, d));
  const decadesY: number[] = [];
  for (let d = Math.log10(T_MIN); d <= Math.log10(T_MAX); d++) decadesY.push(Math.pow(10, d));
  const selectedDev = devices.find((d) => d.id === selectedDeviceId) || null;
  const canAddSelected = !!selectedDev && (!!curveForDevice(selectedDev) || ['motor_ac_industrial', 'pump_booster_3p', 'motor_6lead_star_delta'].includes(selectedDev.type));

  return (
    <section className="shrink-0 border-t border-border bg-surface flex flex-col z-20" aria-label="Time-current curves">
      <header className="h-8 flex items-center gap-2 px-3 text-[11px] font-semibold text-ink">
        <Spline className="w-3.5 h-3.5 text-probe" />
        <span className="uppercase tracking-wider font-display">Curves</span>
        <span className="text-ink-muted font-mono">{specs.length} device{specs.length === 1 ? '' : 's'}{motorSpec ? ' + motor' : ''}{cable ? ' + cable' : ''}</span>
        <div className="flex-1" />
        {!collapsed && (
          <>
            <button className={`${btn} text-[10px] px-1.5 flex items-center gap-1`} disabled={!canAddSelected} onClick={() => addDevice(selectedDeviceId)} title="Add the selected breaker, fuse or overload relay to the chain (a motor adds its starting envelope)">
              <Plus className="w-3 h-3" />Device
            </button>
            <button className={`${btn} text-[10px] px-1.5 flex items-center gap-1`} disabled={!selectedWireId} onClick={() => selectedWireId && onChange({ ...state, wireId: selectedWireId })} title="Plot the cable damage limit of the selected wire">
              <Plus className="w-3 h-3" />Cable
            </button>
            <button className={`${btn} text-[10px] px-1.5 flex items-center gap-1`} onClick={exportPng}><Download className="w-3 h-3" />PNG</button>
          </>
        )}
        <button className={btn} onClick={() => setCollapsed((c) => !c)}>{collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>
        <button className={btn} onClick={onClose} title="Hide the curves panel"><X className="w-3.5 h-3.5" /></button>
      </header>
      {!collapsed && (
        <div className="flex gap-3 px-3 pb-3 overflow-x-auto" style={{ maxHeight: 340 }}>
          <div className="w-60 shrink-0 text-[11px] space-y-2 overflow-y-auto">
            <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">Chain (upstream first)</div>
            {specs.length === 0 && <div className="text-ink-muted">Select a breaker, fuse or overload relay on the canvas and press + Device. Add the upstream device first.</div>}
            {specs.map((s, i) => {
              const dev = devices.find((d) => d.id === s.deviceId)!;
              const amps = operatingAmps(dev, wires, solved.wireCurrents);
              const t = isSimulating && amps > 0 ? nominalTime(s, amps) : null;
              return (
                <div key={s.deviceId} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 min-w-0 truncate font-mono" title={dev.name}>{s.label}</span>
                  <span className="text-ink-muted font-mono tabular-nums">{isSimulating ? `${amps.toFixed(1)} A${t !== null ? (Number.isFinite(t) ? ` · trips ${t < 1 ? t.toFixed(2) : t.toFixed(0)} s` : ' · no trip') : ''}` : ''}</span>
                  <button className="text-ink-muted hover:text-ink" onClick={() => move(i, -1)}><ArrowUp className="w-3 h-3" /></button>
                  <button className="text-ink-muted hover:text-ink" onClick={() => move(i, 1)}><ArrowDown className="w-3 h-3" /></button>
                  <button className="text-ink-muted hover:text-danger" onClick={() => onChange({ ...state, chain: state.chain.filter((id) => id !== s.deviceId) })}><X className="w-3 h-3" /></button>
                </div>
              );
            })}
            {motorSpec && (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-warning-fill" />
                <span className="flex-1 truncate">{motorSpec.label} start {motorSpec.startAmps.toFixed(0)} A × {motorSpec.startSec} s</span>
                <button className="text-ink-muted hover:text-danger" onClick={() => onChange({ ...state, motorId: undefined })}><X className="w-3 h-3" /></button>
              </div>
            )}
            {cable && (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-danger" />
                <span className="flex-1 truncate" title="Adiabatic limit t = (k·S / I)²">{cable.label} {cable.area} mm²</span>
                <button className="text-ink-muted hover:text-danger" onClick={() => onChange({ ...state, wireId: undefined })}><X className="w-3 h-3" /></button>
              </div>
            )}
            {cable?.kNeedsVerification && <div className="text-[9px] text-warning leading-snug">Cable limit uses k = {cable.k} (PVC, copper): flagged for verification against your copy of the code.</div>}
            {overlaps.length > 0 && <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted pt-1">Selectivity</div>}
            {overlaps.map((o) => {
              const up = specs.find((s) => s.deviceId === o.upstreamId)!;
              const down = specs.find((s) => s.deviceId === o.downstreamId)!;
              return (
                <div key={`${o.upstreamId}-${o.downstreamId}`} className={o.ranges.length ? 'text-danger' : 'text-ok'}>
                  {up.label} / {down.label}:{' '}
                  {o.ranges.length ? `selective up to ${fmtA(o.selectiveUpTo!)} A, both may trip above` : 'selective over the whole range'}
                </div>
              );
            })}
          </div>

          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" width={W} height={H} className="shrink-0 rounded border border-border">
            <rect width={W} height={H} fill={bg} />
            {decadesX.map((d) => (
              <g key={`x${d}`}>
                <line x1={x(d)} x2={x(d)} y1={MT} y2={H - MB} stroke={gridC} />
                <text x={x(d)} y={H - 8} fontSize={9} fill={muted} textAnchor="middle" fontFamily="monospace">{fmtA(d)}</text>
              </g>
            ))}
            {decadesY.map((d) => (
              <g key={`y${d}`}>
                <line x1={ML} x2={W - MR} y1={y(d)} y2={y(d)} stroke={gridC} />
                <text x={ML - 4} y={y(d) + 3} fontSize={9} fill={muted} textAnchor="end" fontFamily="monospace">{fmtT(d)}</text>
              </g>
            ))}
            <text x={ML + (W - ML - MR) / 2} y={H - 0} fontSize={9} fill={muted} textAnchor="middle">current (A)</text>
            <text x={10} y={H / 2} fontSize={9} fill={muted} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>time (s)</text>

            {cable && <path d={cablePath()} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" />}

            {specs.map((s, i) => (
              <path key={s.deviceId} d={bandPath(s)} fill={COLORS[i % COLORS.length]} fillOpacity={0.22} stroke={COLORS[i % COLORS.length]} strokeWidth={1.4} />
            ))}

            {/* non-selective regions: red band over the overlap range */}
            {overlaps.map((o) =>
              o.ranges.map(([a, b], i) => (
                <rect key={`${o.upstreamId}${i}`} x={x(a)} y={MT} width={Math.max(2, x(b) - x(a))} height={H - MT - MB} fill="#ef4444" fillOpacity={0.12} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={0.8} />
              ))
            )}

            {motorSpec && (
              <g>
                <rect x={x(motorSpec.startAmps) - 3} y={y(motorSpec.startSec)} width={6} height={y(0.01) - y(motorSpec.startSec)} fill="#f59e0b" fillOpacity={0.8} />
                <line x1={x(motorSpec.fla)} x2={x(motorSpec.fla)} y1={MT} y2={H - MB} stroke="#f59e0b" strokeDasharray="2 3" />
                <text x={x(motorSpec.fla) + 3} y={MT + 10} fontSize={8} fill="#f59e0b">FLA</text>
                <text x={x(motorSpec.startAmps) + 6} y={y(motorSpec.startSec) + 8} fontSize={8} fill="#f59e0b">start</text>
              </g>
            )}

            {/* operating points from the solver */}
            {isSimulating && specs.map((s, i) => {
              const dev = devices.find((d) => d.id === s.deviceId);
              if (!dev) return null;
              const amps = operatingAmps(dev, wires, solved.wireCurrents);
              if (amps < xLo || amps > xHi) return null;
              const t = nominalTime(s, amps);
              return (
                <g key={`op${s.deviceId}`}>
                  <line x1={x(amps)} x2={x(amps)} y1={MT} y2={H - MB} stroke={COLORS[i % COLORS.length]} strokeDasharray="4 3" />
                  {Number.isFinite(t) && <circle cx={x(amps)} cy={y(t)} r={3.5} fill={COLORS[i % COLORS.length]} stroke={fg} strokeWidth={1} />}
                </g>
              );
            })}
            {specs.map((s, i) => (
              <text key={`lg${s.deviceId}`} x={ML + 6} y={MT + 12 + i * 11} fontSize={9} fill={COLORS[i % COLORS.length]} fontFamily="monospace">■ {s.label}</text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
};
