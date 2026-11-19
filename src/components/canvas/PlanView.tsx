import React from 'react';
import type { ElectricalProject, FloorPlan, PlanSymbol } from '../../types/electrical';
import { createDeviceFromCatalog } from '../../data/defaultComponents';
import {
  DEFAULT_PLAN, SYMBOL_SPECS, applyRunLengths, benchPosition, linkableDevices, planBounds, planRuns, specFor, type SymbolKind,
} from '../../core/floorPlan';

type Tool = 'select' | 'room' | SymbolKind | 'run_straight' | 'run_orthogonal';

const PX = 40; // pixels per metre on screen
const SNAP = 0.1;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

interface PlanViewProps {
  project: ElectricalProject;
  onChange: (updater: (p: ElectricalProject) => ElectricalProject) => void;
}

/**
 * Floor-plan view (MVP). Draw rooms, place symbols and link each to a device (create one or pick an existing one),
 * then draw home runs between symbols: their lengths are applied to the wires between the linked devices, so the
 * voltage drop uses the plan length. One floor only: no auto-routing, no DXF / PDF import, and the workbench wiring
 * is not generated from the plan.
 */
export const PlanView: React.FC<PlanViewProps> = ({ project, onChange }) => {
  const plan: FloorPlan = project.plan ?? DEFAULT_PLAN;
  const [tool, setTool] = React.useState<Tool>('select');
  const [selected, setSelected] = React.useState<{ type: 'room' | 'symbol' | 'run'; id: string } | null>(null);
  const [runStart, setRunStart] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [moving, setMoving] = React.useState<{ id: string; dx: number; dy: number } | null>(null);
  const [notice, setNotice] = React.useState('');
  const svgRef = React.useRef<SVGSVGElement>(null);
  const bounds = planBounds(plan);
  const reports = React.useMemo(() => planRuns(plan, project.wires), [plan, project.wires]);

  const update = (fn: (p: FloorPlan) => FloorPlan) => onChange((prev) => ({ ...prev, plan: fn(prev.plan ?? DEFAULT_PLAN) }));
  const point = (e: React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: snap((e.clientX - r.left) / PX), y: snap((e.clientY - r.top) / PX) };
  };

  const onDown = (e: React.MouseEvent) => {
    const p = point(e);
    if (tool === 'room') setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    else if (tool !== 'select' && !tool.startsWith('run')) {
      const spec = specFor(tool as SymbolKind);
      const count = plan.symbols.filter((s) => s.kind === spec.kind).length + 1;
      const sym: PlanSymbol = { id: uid('sym'), kind: spec.kind, x: p.x, y: p.y, label: `${spec.label} ${count}` };
      update((pl) => ({ ...pl, symbols: [...pl.symbols, sym] }));
      setSelected({ type: 'symbol', id: sym.id });
    } else if (tool === 'select') setSelected(null);
  };
  const onMove = (e: React.MouseEvent) => {
    const p = point(e);
    if (drag) setDrag({ ...drag, x1: p.x, y1: p.y });
    if (moving) setMoving({ ...moving, dx: p.x, dy: p.y });
  };
  const onUp = () => {
    if (drag) {
      const x = Math.min(drag.x0, drag.x1);
      const y = Math.min(drag.y0, drag.y1);
      const w = Math.abs(drag.x1 - drag.x0);
      const h = Math.abs(drag.y1 - drag.y0);
      setDrag(null);
      if (w >= 0.5 && h >= 0.5) {
        const room = { id: uid('room'), name: `Room ${plan.rooms.length + 1}`, x, y, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
        update((pl) => ({ ...pl, rooms: [...pl.rooms, room] }));
        setSelected({ type: 'room', id: room.id });
      }
    }
    if (moving) {
      update((pl) => ({ ...pl, symbols: pl.symbols.map((s) => (s.id === moving.id ? { ...s, x: moving.dx, y: moving.dy } : s)) }));
      setMoving(null);
    }
  };

  const clickSymbol = (e: React.MouseEvent, s: PlanSymbol) => {
    e.stopPropagation();
    if (tool.startsWith('run')) {
      if (!runStart) {
        setRunStart(s.id);
        setNotice('Now click the symbol at the other end (usually the panel).');
      } else if (runStart !== s.id) {
        const mode = tool === 'run_straight' ? 'straight' : 'orthogonal';
        update((pl) => ({ ...pl, runs: [...pl.runs, { id: uid('run'), fromSymbolId: runStart, toSymbolId: s.id, mode }] }));
        setRunStart(null);
        setNotice('Home run added. Link both symbols to devices, then apply the lengths.');
      }
    } else {
      setSelected({ type: 'symbol', id: s.id });
      if (tool === 'select') setMoving({ id: s.id, dx: s.x, dy: s.y });
    }
  };

  const selSymbol = selected?.type === 'symbol' ? plan.symbols.find((s) => s.id === selected.id) : undefined;
  const selRoom = selected?.type === 'room' ? plan.rooms.find((r) => r.id === selected.id) : undefined;
  const selRun = selected?.type === 'run' ? plan.runs.find((r) => r.id === selected.id) : undefined;

  const createDevice = (s: PlanSymbol) => {
    const spec = specFor(s.kind);
    onChange((prev) => {
      const id = `dev_${spec.types[0]}_${Date.now().toString(36)}`;
      const pos = benchPosition(prev.devices.length);
      const dev = createDeviceFromCatalog(spec.types[0], pos.x, pos.y, id);
      dev.name = `${s.label} (${dev.name})`;
      const pl = prev.plan ?? DEFAULT_PLAN;
      return { ...prev, devices: [...prev.devices, dev], plan: { ...pl, symbols: pl.symbols.map((x) => (x.id === s.id ? { ...x, deviceId: id } : x)) } };
    });
    setNotice('Device created on the workbench (wire it there). The plan length applies once wires join it to the other linked device.');
  };
  const linkDevice = (s: PlanSymbol, deviceId: string) => update((pl) => ({ ...pl, symbols: pl.symbols.map((x) => (x.id === s.id ? { ...x, deviceId: deviceId || undefined } : x)) }));
  const apply = () => {
    const r = applyRunLengths(plan, project.wires);
    setNotice(r.changed > 0 ? `${r.changed} wire length${r.changed === 1 ? '' : 's'} set from the plan.` : 'No wire changed: link both ends of a run to devices that are wired to each other.');
    if (r.changed > 0) onChange((prev) => ({ ...prev, wires: applyRunLengths(prev.plan ?? DEFAULT_PLAN, prev.wires).wires }));
  };
  const remove = () => {
    if (!selected) return;
    update((pl) => {
      if (selected.type === 'room') return { ...pl, rooms: pl.rooms.filter((r) => r.id !== selected.id) };
      if (selected.type === 'run') return { ...pl, runs: pl.runs.filter((r) => r.id !== selected.id) };
      return { ...pl, symbols: pl.symbols.filter((s) => s.id !== selected.id), runs: pl.runs.filter((r) => r.fromSymbolId !== selected.id && r.toSymbolId !== selected.id) };
    });
    setSelected(null);
  };

  const symPos = (s: PlanSymbol) => (moving && moving.id === s.id ? { x: moving.dx, y: moving.dy } : { x: s.x, y: s.y });
  const byId = new Map(plan.symbols.map((s) => [s.id, s]));
  const btn = (active: boolean) => `px-2 py-1 rounded border text-[11px] font-semibold transition ${active ? 'bg-probe text-on-probe border-probe' : 'bg-surface border-border text-ink hover:bg-surface-hover'}`;
  const input = 'px-1.5 py-0.5 rounded border border-border bg-surface text-[11px]';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-sunken" aria-label="Floor plan">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border bg-surface">
        <button className={btn(tool === 'select')} onClick={() => { setTool('select'); setRunStart(null); }}>Select / move</button>
        <button className={btn(tool === 'room')} onClick={() => { setTool('room'); setRunStart(null); }}>Room</button>
        {SYMBOL_SPECS.map((s) => <button key={s.kind} className={btn(tool === s.kind)} onClick={() => { setTool(s.kind); setRunStart(null); }}>{s.glyph} {s.label}</button>)}
        <button className={btn(tool === 'run_straight')} onClick={() => { setTool('run_straight'); setRunStart(null); }}>Run (straight)</button>
        <button className={btn(tool === 'run_orthogonal')} onClick={() => { setTool('run_orthogonal'); setRunStart(null); }}>Run (along walls)</button>
        <div className="flex-1" />
        <button className={btn(false)} onClick={apply} title="Set the length of the wires between linked devices from the home runs">Apply run lengths to wires</button>
        <button className={btn(false)} onClick={remove} disabled={!selected}>Delete</button>
      </div>
      <div className="px-3 py-1 text-[10px] text-ink-muted border-b border-border">
        One floor, 1 m grid. Draw rooms (drag), place symbols (click), link each symbol to a device, draw home runs between symbols, then apply the lengths. Not in this version: auto-routing, several floors, DXF / PDF import, and generating the workbench wiring from the plan. {notice && <b className="text-ink">{notice}</b>}
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-auto p-3">
          <svg
            ref={svgRef}
            width={bounds.w * PX}
            height={bounds.h * PX}
            className="bg-surface border border-border cursor-crosshair"
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
          >
            <defs>
              <pattern id="plan-grid" width={PX} height={PX} patternUnits="userSpaceOnUse"><path d={`M${PX} 0H0V${PX}`} fill="none" stroke="var(--border)" strokeWidth={0.5} /></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#plan-grid)" />
            {plan.rooms.map((r) => (
              <g key={r.id} onMouseDown={(e) => { if (tool === 'select') { e.stopPropagation(); setSelected({ type: 'room', id: r.id }); } }}>
                <rect x={r.x * PX} y={r.y * PX} width={r.w * PX} height={r.h * PX} fill="var(--surface-sunken)" fillOpacity={0.5} stroke={selected?.id === r.id ? 'var(--probe)' : 'var(--ink)'} strokeWidth={selected?.id === r.id ? 2.5 : 1.5} />
                <text x={r.x * PX + 6} y={r.y * PX + 14} fontSize={11} fontWeight={700} fill="var(--ink)">{r.name}</text>
                <text x={r.x * PX + 6} y={r.y * PX + 27} fontSize={9} fill="var(--ink-muted)">{r.w} x {r.h} m ({Math.round(r.w * r.h * 10) / 10} m²)</text>
              </g>
            ))}
            {drag && <rect x={Math.min(drag.x0, drag.x1) * PX} y={Math.min(drag.y0, drag.y1) * PX} width={Math.abs(drag.x1 - drag.x0) * PX} height={Math.abs(drag.y1 - drag.y0) * PX} fill="none" stroke="var(--probe)" strokeDasharray="5 3" />}
            {plan.runs.map((run) => {
              const a = byId.get(run.fromSymbolId);
              const b = byId.get(run.toSymbolId);
              if (!a || !b) return null;
              const pa = symPos(a);
              const pb = symPos(b);
              const rep = reports.find((x) => x.runId === run.id);
              const d = run.mode === 'orthogonal' ? `M${pa.x * PX} ${pa.y * PX}H${pb.x * PX}V${pb.y * PX}` : `M${pa.x * PX} ${pa.y * PX}L${pb.x * PX} ${pb.y * PX}`;
              const sel = selected?.id === run.id;
              return (
                <g key={run.id} onMouseDown={(e) => { e.stopPropagation(); setSelected({ type: 'run', id: run.id }); }}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={10} />
                  <path d={d} fill="none" stroke={rep?.linked ? 'var(--ok)' : 'var(--warning)'} strokeWidth={sel ? 3 : 2} strokeDasharray={rep?.linked ? undefined : '5 3'} />
                  <text x={(pa.x + pb.x) * PX / 2 + 4} y={(pa.y + pb.y) * PX / 2 - 4} fontSize={10} fontWeight={700} fill="var(--ink)">{rep?.lengthM} m</text>
                </g>
              );
            })}
            {plan.symbols.map((s) => {
              const p = symPos(s);
              const spec = specFor(s.kind);
              const sel = selected?.id === s.id || runStart === s.id;
              return (
                <g key={s.id} onMouseDown={(e) => clickSymbol(e, s)} className="cursor-pointer">
                  <circle cx={p.x * PX} cy={p.y * PX} r={13} fill={s.deviceId ? 'var(--surface)' : 'var(--surface-sunken)'} stroke={sel ? 'var(--probe)' : s.deviceId ? 'var(--ok)' : 'var(--warning)'} strokeWidth={sel ? 3 : 2} />
                  <text x={p.x * PX} y={p.y * PX + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">{spec.glyph}</text>
                  <text x={p.x * PX} y={p.y * PX + 25} textAnchor="middle" fontSize={9} fill="var(--ink-muted)">{s.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <aside className="w-64 shrink-0 border-l border-border bg-surface p-3 space-y-3 text-[11px] overflow-y-auto">
          {!selected && <div className="text-ink-muted">Select a room, symbol or home run. Orange outline: a symbol with no device linked yet.</div>}
          {selRoom && (
            <>
              <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">Room</div>
              <label className="flex flex-col gap-0.5">Name<input className={input} value={selRoom.name} onChange={(e) => update((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === selRoom.id ? { ...r, name: e.target.value } : r)) }))} /></label>
              <div className="grid grid-cols-2 gap-2">
                {(['w', 'h'] as const).map((k) => (
                  <label key={k} className="flex flex-col gap-0.5">{k === 'w' ? 'Width (m)' : 'Depth (m)'}
                    <input className={input} type="number" min={0.5} step={0.1} value={selRoom[k]} onChange={(e) => update((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === selRoom.id ? { ...r, [k]: Math.max(0.5, parseFloat(e.target.value) || 0.5) } : r)) }))} />
                  </label>
                ))}
              </div>
            </>
          )}
          {selSymbol && (
            <>
              <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">{specFor(selSymbol.kind).label} symbol</div>
              <label className="flex flex-col gap-0.5">Label<input className={input} value={selSymbol.label} onChange={(e) => update((pl) => ({ ...pl, symbols: pl.symbols.map((s) => (s.id === selSymbol.id ? { ...s, label: e.target.value } : s)) }))} /></label>
              <label className="flex flex-col gap-0.5">Linked device
                <select className={input} value={selSymbol.deviceId ?? ''} onChange={(e) => linkDevice(selSymbol, e.target.value)}>
                  <option value="">(none)</option>
                  {linkableDevices(plan, project.devices, selSymbol).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  {selSymbol.deviceId && !linkableDevices(plan, project.devices, selSymbol).some((d) => d.id === selSymbol.deviceId) && <option value={selSymbol.deviceId}>{project.devices.find((d) => d.id === selSymbol.deviceId)?.name ?? selSymbol.deviceId}</option>}
                </select>
              </label>
              {!selSymbol.deviceId && <button className={btn(false)} onClick={() => createDevice(selSymbol)}>Create a device for this symbol</button>}
              <div className="text-ink-muted">At {selSymbol.x.toFixed(1)} m, {selSymbol.y.toFixed(1)} m</div>
            </>
          )}
          {selRun && (
            <>
              <div className="font-bold uppercase tracking-wider text-[9px] text-ink-muted">Home run</div>
              {(() => {
                const rep = reports.find((r) => r.runId === selRun.id);
                return (
                  <>
                    <div className="font-mono font-bold text-sm">{rep?.lengthM} m</div>
                    <div>{rep?.linked ? `Covers ${rep.wireIds.length} wire${rep.wireIds.length === 1 ? '' : 's'} between the linked devices.` : 'Link both end symbols to devices to use this length.'}</div>
                  </>
                );
              })()}
              <label className="flex flex-col gap-0.5">Path
                <select className={input} value={selRun.mode} onChange={(e) => update((pl) => ({ ...pl, runs: pl.runs.map((r) => (r.id === selRun.id ? { ...r, mode: e.target.value as 'straight' | 'orthogonal' } : r)) }))}>
                  <option value="straight">Straight line</option>
                  <option value="orthogonal">Along the walls (|dx| + |dy|)</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">Drop / allowance (m)
                <input className={input} type="number" min={0} step={0.1} value={selRun.dropM ?? 0} onChange={(e) => update((pl) => ({ ...pl, runs: pl.runs.map((r) => (r.id === selRun.id ? { ...r, dropM: Math.max(0, parseFloat(e.target.value) || 0) } : r)) }))} />
              </label>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
