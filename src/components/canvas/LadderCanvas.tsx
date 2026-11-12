import React, { useMemo, useState } from 'react';
import { ElectricalDevice, ElectricalWire } from '../../types/electrical';
import { LadderElement, LadderElementKind, LadderNode, LadderRung } from '../../types/ladder';
import { SolvedCircuit } from '../../core/circuitSolver';
import {
  PhysicalLadder,
  getControlElements,
  measure,
  parsePhysicalLadder,
  physicalToLadderElement,
  physicalToRungs,
  rungToNode,
  verifyLadderAgainstPhysical,
  VerifyMessage,
} from '../../core/ladderEngine';
import { momentaryPress } from '../devices/DeviceTerminals';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Wand2,
  ClipboardCheck,
  Target,
  PenTool,
  Radio,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type LadderMode = 'live' | 'target' | 'builder';

interface LadderCanvasProps {
  devices: ElectricalDevice[];
  wires: ElectricalWire[];
  solved: SolvedCircuit;
  isSimulating: boolean;
  ladder?: LadderRung[];
  targetLadder?: LadderRung[];
  onUpdateLadder: (rungs: LadderRung[]) => void;
  selectedDeviceId: string | null;
  onSelectDevice: (id: string | null) => void;
  onPatchDeviceState: (deviceId: string, patch: Record<string, any>) => void;
  onHoverDevice?: (id: string | null) => void;
  compact?: boolean;
  /** Extra controls rendered at the right of the toolbar (e.g. Dual View pane switch) */
  headerRight?: React.ReactNode;
}

// Grid geometry
const CW = 80; // cell width
const RH = 64; // row height
const RAIL_L = 70;
const TOP = 64;

const COLORS = {
  idle: '#475569',
  live: '#16a34a',
  blocked: '#dc2626',
  rail: '#0f172a',
};

interface DrawCtx {
  parts: React.ReactNode[];
  x0: number;
  yTop: number;
  isClosed: (el: LadderElement) => boolean;
  selectedElId?: string | null;
  selectedDeviceId?: string | null;
  onElMouseDown: (el: LadderElement, e: React.MouseEvent) => void;
  onElHover: (el: LadderElement | null) => void;
  keyPrefix: string;
  energized: boolean; // rails live
}

const cellX = (ctx: DrawCtx, col: number) => ctx.x0 + col * CW;
const rowY = (ctx: DrawCtx, row: number) => ctx.yTop + row * RH + RH / 2;

function wire(ctx: DrawCtx, key: string, x1: number, y1: number, x2: number, y2: number, on: boolean) {
  ctx.parts.push(
    <line
      key={key}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={on ? COLORS.live : COLORS.idle}
      strokeWidth={on ? 3 : 2}
      strokeLinecap="round"
    />
  );
}

/** Draw a single ladder symbol in a cell */
function drawElement(ctx: DrawCtx, el: LadderElement, col: number, row: number, powered: boolean, keyId: string): boolean {
  const x = cellX(ctx, col);
  const cx = x + CW / 2;
  const cy = rowY(ctx, row);
  const closed = ctx.isClosed(el);
  const passes = powered && closed;
  const isSel = ctx.selectedElId === el.id;
  const linkedSel = !!el.deviceId && ctx.selectedDeviceId === el.deviceId;
  const symColor = passes ? COLORS.live : powered && !closed ? COLORS.blocked : COLORS.idle;

  wire(ctx, `${keyId}-l`, x, cy, cx - 9, cy, powered);
  wire(ctx, `${keyId}-r`, cx + 9, cy, x + CW, cy, passes);

  ctx.parts.push(
    <g
      key={`${keyId}-sym`}
      className="cursor-pointer"
      onMouseDown={(e) => ctx.onElMouseDown(el, e)}
      onMouseEnter={() => ctx.onElHover(el)}
      onMouseLeave={() => ctx.onElHover(null)}
    >
      <rect
        x={x + 6}
        y={cy - 26}
        width={CW - 12}
        height={52}
        rx={8}
        fill={isSel ? 'rgba(14,165,233,0.12)' : linkedSel ? 'rgba(245,158,11,0.12)' : 'transparent'}
        stroke={isSel ? '#0ea5e9' : linkedSel ? '#f59e0b' : 'transparent'}
        strokeWidth={1.4}
        strokeDasharray={isSel ? '0' : '3 2'}
      />
      {passes && <rect x={cx - 11} y={cy - 12} width={22} height={24} rx={4} fill="#22c55e" opacity={0.14} />}
      {/* contact plates */}
      <line x1={cx - 9} y1={cy - 11} x2={cx - 9} y2={cy + 11} stroke={symColor} strokeWidth={2.6} />
      <line x1={cx + 9} y1={cy - 11} x2={cx + 9} y2={cy + 11} stroke={symColor} strokeWidth={2.6} />
      {el.kind === 'NC' && (
        <line x1={cx - 13} y1={cy + 12} x2={cx + 13} y2={cy - 12} stroke={symColor} strokeWidth={2} />
      )}
      {/* actual contact position marker */}
      <circle cx={cx} cy={cy} r={2.6} fill={closed ? COLORS.live : '#ffffff'} stroke={symColor} strokeWidth={1} />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize={10} fontWeight={800} fill="#0f172a" fontFamily="ui-sans-serif, system-ui">
        {el.tag}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#64748b" fontFamily="ui-monospace, monospace">
        {el.sub}
        {!el.deviceId ? ' ?' : ''}
      </text>
    </g>
  );
  return passes;
}

/** Recursively draw a series-parallel tree, returning the downstream power state */
function drawNode(ctx: DrawCtx, node: LadderNode, col: number, row: number, powered: boolean, keyId: string): boolean {
  if (node.kind === 'el') return drawElement(ctx, node.el, col, row, powered, keyId);
  if (node.kind === 'series') {
    let p = powered;
    let c = col;
    node.items.forEach((child, i) => {
      p = drawNode(ctx, child, c, row, p, `${keyId}.${i}`);
      c += measure(child).w;
    });
    return p;
  }
  const { w } = measure(node);
  let r = row;
  let any = false;
  let lastRow = row;
  node.items.forEach((child, i) => {
    const m = measure(child);
    const out = drawNode(ctx, child, col, r, powered, `${keyId}|${i}`);
    if (m.w < w) wire(ctx, `${keyId}|${i}-fill`, cellX(ctx, col + m.w), rowY(ctx, r), cellX(ctx, col + w), rowY(ctx, r), out);
    any = any || out;
    lastRow = r;
    r += m.h;
  });
  wire(ctx, `${keyId}-vl`, cellX(ctx, col), rowY(ctx, row), cellX(ctx, col), rowY(ctx, lastRow), powered);
  wire(ctx, `${keyId}-vr`, cellX(ctx, col + w), rowY(ctx, row), cellX(ctx, col + w), rowY(ctx, lastRow), any);
  // junction dots
  [row, lastRow].forEach((rr, k) => {
    ctx.parts.push(<circle key={`${keyId}-jl${k}`} cx={cellX(ctx, col)} cy={rowY(ctx, rr)} r={2.8} fill={powered ? COLORS.live : COLORS.idle} />);
    ctx.parts.push(<circle key={`${keyId}-jr${k}`} cx={cellX(ctx, col + w)} cy={rowY(ctx, rr)} r={2.8} fill={any ? COLORS.live : COLORS.idle} />);
  });
  return any;
}

function drawOutput(
  ctx: DrawCtx,
  el: LadderElement | null,
  col: number,
  row: number,
  powered: boolean,
  energized: boolean,
  lampColor: string,
  keyId: string
) {
  const x = cellX(ctx, col);
  const cx = x + CW / 2;
  const cy = rowY(ctx, row);
  if (!el) {
    ctx.parts.push(
      <g key={`${keyId}-empty`}>
        <circle cx={cx} cy={cy} r={13} fill="none" stroke="#cbd5e1" strokeWidth={1.6} strokeDasharray="3 3" />
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={700}>
          OUT?
        </text>
      </g>
    );
    wire(ctx, `${keyId}-l`, x, cy, cx - 13, cy, powered);
    wire(ctx, `${keyId}-r`, cx + 13, cy, x + CW, cy, false);
    return;
  }
  const isSel = ctx.selectedElId === el.id;
  const linkedSel = !!el.deviceId && ctx.selectedDeviceId === el.deviceId;
  const col2 = energized ? COLORS.live : powered ? COLORS.blocked : COLORS.idle;
  wire(ctx, `${keyId}-l`, x, cy, cx - 13, cy, powered);
  wire(ctx, `${keyId}-r`, cx + 13, cy, x + CW, cy, energized);
  ctx.parts.push(
    <g
      key={`${keyId}-out`}
      className="cursor-pointer"
      onMouseDown={(e) => ctx.onElMouseDown(el, e)}
      onMouseEnter={() => ctx.onElHover(el)}
      onMouseLeave={() => ctx.onElHover(null)}
    >
      <rect
        x={x + 6}
        y={cy - 26}
        width={CW - 12}
        height={52}
        rx={8}
        fill={isSel ? 'rgba(14,165,233,0.12)' : linkedSel ? 'rgba(245,158,11,0.12)' : 'transparent'}
        stroke={isSel ? '#0ea5e9' : linkedSel ? '#f59e0b' : 'transparent'}
        strokeWidth={1.4}
        strokeDasharray={isSel ? '0' : '3 2'}
      />
      {el.kind === 'COIL' ? (
        <>
          {energized && <circle cx={cx} cy={cy} r={16} fill="#22c55e" opacity={0.18} className="animate-pulse" />}
          <path d={`M ${cx - 6} ${cy - 12} A 12 12 0 0 0 ${cx - 6} ${cy + 12}`} fill="none" stroke={col2} strokeWidth={2.6} />
          <path d={`M ${cx + 6} ${cy - 12} A 12 12 0 0 1 ${cx + 6} ${cy + 12}`} fill="none" stroke={col2} strokeWidth={2.6} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={12} fill={energized ? lampColor : '#ffffff'} stroke={col2} strokeWidth={2.4} />
          {energized && <circle cx={cx} cy={cy} r={18} fill={lampColor} opacity={0.25} className="animate-pulse" />}
          <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke={col2} strokeWidth={1.6} />
          <line x1={cx - 8} y1={cy + 8} x2={cx + 8} y2={cy - 8} stroke={col2} strokeWidth={1.6} />
        </>
      )}
      <text x={cx} y={cy - 17} textAnchor="middle" fontSize={10} fontWeight={900} fill="#0f172a" fontFamily="ui-sans-serif, system-ui">
        {el.tag}
      </text>
      <text x={cx} y={cy + 25} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#64748b" fontFamily="ui-monospace, monospace">
        {el.sub}
      </text>
    </g>
  );
}

const LAMP_COLORS: Record<string, string> = {
  GREEN: '#22c55e',
  RED: '#ef4444',
  AMBER: '#f59e0b',
  BLUE: '#3b82f6',
};

const GENERIC: Record<LadderElementKind, { tag: string; sub: string }[]> = {
  NO: [
    { tag: 'START', sub: '3-4' },
    { tag: 'FWD', sub: '3-4' },
    { tag: 'REV', sub: '5-6' },
    { tag: 'KM1', sub: '13-14' },
    { tag: 'KM2', sub: '13-14' },
    { tag: 'OLR', sub: '97-98' },
  ],
  NC: [
    { tag: 'STOP', sub: '1-2' },
    { tag: 'OLR', sub: '95-96' },
    { tag: 'KM1', sub: '21-22' },
    { tag: 'KM2', sub: '21-22' },
    { tag: 'E-STOP', sub: '11-12' },
  ],
  COIL: [
    { tag: 'KM1', sub: 'A1-A2' },
    { tag: 'KM2', sub: 'A1-A2' },
    { tag: 'KA1', sub: 'A1-A2' },
  ],
  LAMP: [
    { tag: 'PL_RUN', sub: 'GREEN' },
    { tag: 'PL_FAULT', sub: 'RED' },
  ],
};

const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

interface RungView {
  key: string;
  label: string;
  pre: LadderNode;
  post: LadderNode;
  output: LadderElement | null;
  rungId?: string; // builder rung id
}

export const LadderCanvas: React.FC<LadderCanvasProps> = ({
  devices,
  wires,
  solved,
  isSimulating,
  ladder,
  targetLadder,
  onUpdateLadder,
  selectedDeviceId,
  onSelectDevice,
  onPatchDeviceState,
  onHoverDevice,
  compact = false,
  headerRight,
}) => {
  const [mode, setMode] = useState<LadderMode>(targetLadder && targetLadder.length > 0 ? 'target' : 'live');
  const [zoom, setZoom] = useState(compact ? 0.85 : 1);
  const [selRungId, setSelRungId] = useState<string | null>(null);
  const [selElId, setSelElId] = useState<string | null>(null);
  const [armed, setArmed] = useState<LadderElementKind>('NO');
  const [optionKey, setOptionKey] = useState<string>('');
  const [branchMode, setBranchMode] = useState(false);
  const [verify, setVerify] = useState<VerifyMessage[] | null>(null);

  const phys: PhysicalLadder = useMemo(() => parsePhysicalLadder(devices, wires), [devices, wires]);
  const elementByKey = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getControlElements>[number]>();
    phys.elements.forEach((e) => m.set(e.key, e));
    return m;
  }, [phys]);

  const railsLive =
    isSimulating && !!phys.rails.l1Node && solved.nodePotentials[phys.rails.l1Node] === 'live';

  const isClosed = (el: LadderElement) => {
    if (el.deviceId && el.contactKey) {
      const pe = elementByKey.get(`${el.deviceId}:${el.contactKey}`);
      if (pe) return pe.closed;
    }
    return el.kind === 'NC';
  };
  const loadEnergized = (el: LadderElement | null, preOut: boolean) => {
    if (!el) return false;
    if (el.deviceId && el.contactKey) {
      const pe = elementByKey.get(`${el.deviceId}:${el.contactKey}`);
      if (pe) return isSimulating && pe.closed;
    }
    return preOut;
  };

  const builderRungs: LadderRung[] = ladder && ladder.length > 0 ? ladder : [];

  const views: RungView[] = useMemo(() => {
    if (mode === 'live') {
      return phys.rungs.map((r) => ({
        key: r.id,
        label: r.load.tag,
        pre: r.pre,
        post: r.post,
        output: physicalToLadderElement(r.load),
      }));
    }
    const src = mode === 'target' ? targetLadder || [] : builderRungs;
    return src.map((r) => ({
      key: r.id,
      label: r.output?.tag || '—',
      pre: rungToNode(r),
      post: { kind: 'series', items: [] } as LadderNode,
      output: r.output,
      rungId: r.id,
    }));
  }, [mode, phys, targetLadder, builderRungs]);

  // ── Builder operations ──
  const commit = (rungs: LadderRung[]) => {
    onUpdateLadder(rungs);
    setVerify(null);
  };
  const ensureRungs = () => (builderRungs.length > 0 ? builderRungs : []);
  const addRung = () => {
    const r: LadderRung = { id: `rung_${uid()}`, blocks: [], output: null };
    commit([...ensureRungs(), r]);
    setSelRungId(r.id);
    setSelElId(null);
  };

  const pickOptions = useMemo(() => {
    const physOpts = phys.elements
      .filter((e) => e.kind === armed && !e.contactKey.startsWith('pole'))
      .map((e) => {
        const dev = devices.find((d) => d.id === e.deviceId);
        return { key: e.key, label: `${e.tag} · ${e.sub} — ${dev?.name || 'device'}`, el: physicalToLadderElement(e) };
      });
    const genOpts = GENERIC[armed].map((g) => ({
      key: `gen:${g.tag}:${g.sub}`,
      label: `${g.tag} · ${g.sub} (generic, unlinked)`,
      el: { id: '', kind: armed, tag: g.tag, sub: g.sub } as LadderElement,
    }));
    return [...physOpts, ...genOpts];
  }, [phys, armed, devices]);

  const currentOption = pickOptions.find((o) => o.key === optionKey) || pickOptions[0];

  const locate = (rungs: LadderRung[], elId: string | null) => {
    if (!elId) return null;
    for (let ri = 0; ri < rungs.length; ri++) {
      const r = rungs[ri];
      if (r.output?.id === elId) return { ri, output: true as const };
      for (let bi = 0; bi < r.blocks.length; bi++) {
        const b = r.blocks[bi];
        for (let k = 0; k < b.branches.length; k++) {
          const idx = b.branches[k].findIndex((e) => e.id === elId);
          if (idx >= 0) return { ri, bi, k, idx, output: false as const };
        }
      }
    }
    return null;
  };

  const insert = () => {
    if (!currentOption) return;
    let rungs = ensureRungs().map((r) => ({ ...r, blocks: r.blocks.map((b) => ({ ...b, branches: b.branches.map((br) => [...br]) })) }));
    if (rungs.length === 0) {
      rungs = [{ id: `rung_${uid()}`, blocks: [], output: null }];
    }
    const el: LadderElement = { ...currentOption.el, kind: armed, id: `el_${uid()}` };
    const loc = locate(rungs, selElId);
    let ri = loc ? loc.ri : rungs.findIndex((r) => r.id === selRungId);
    if (ri < 0) ri = rungs.length - 1;
    const rung = rungs[ri];

    if (armed === 'COIL' || armed === 'LAMP') {
      rung.output = el;
    } else if (branchMode && loc && !loc.output) {
      rung.blocks[loc.bi].branches.push([el]);
      setBranchMode(false);
    } else if (branchMode && rung.blocks.length > 0) {
      rung.blocks[rung.blocks.length - 1].branches.push([el]);
      setBranchMode(false);
    } else if (loc && !loc.output) {
      // after the selected contact (or after the whole parallel group it belongs to)
      rung.blocks.splice(loc.bi + 1, 0, { id: `blk_${uid()}`, branches: [[el]] });
    } else {
      rung.blocks.push({ id: `blk_${uid()}`, branches: [[el]] });
    }
    setSelRungId(rung.id);
    setSelElId(el.id);
    commit(rungs);
  };

  const deleteSelected = () => {
    const rungs = ensureRungs().map((r) => ({ ...r, blocks: r.blocks.map((b) => ({ ...b, branches: b.branches.map((br) => [...br]) })) }));
    const loc = locate(rungs, selElId);
    if (!loc) {
      if (selRungId) {
        commit(rungs.filter((r) => r.id !== selRungId));
        setSelRungId(null);
      }
      return;
    }
    const rung = rungs[loc.ri];
    if (loc.output) rung.output = null;
    else {
      const b = rung.blocks[loc.bi];
      b.branches[loc.k].splice(loc.idx, 1);
      b.branches = b.branches.filter((br) => br.length > 0);
      if (b.branches.length === 0) rung.blocks.splice(loc.bi, 1);
    }
    setSelElId(null);
    commit(rungs);
  };

  const autoBuild = () => {
    const rungs = physicalToRungs(phys);
    commit(rungs);
    setMode('builder');
  };
  const copyTarget = () => {
    if (!targetLadder) return;
    commit(JSON.parse(JSON.stringify(targetLadder)));
    setMode('builder');
  };
  const runVerify = () => setVerify(verifyLadderAgainstPhysical(builderRungs, phys, devices));

  // ── Element interaction ──
  const ACTUATE: Record<string, string> = { start: 'startPressed', stop: 'stopPressed', fwd: 'fwdPressed', rev: 'revPressed' };
  const onElMouseDown = (el: LadderElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (el.deviceId) onSelectDevice(el.deviceId);
    if (mode === 'builder') {
      setSelElId(el.id);
      const loc = locate(builderRungs, el.id);
      if (loc) setSelRungId(builderRungs[loc.ri].id);
      return;
    }
    if (!el.deviceId || !el.contactKey || !isSimulating) return;
    const dev = devices.find((d) => d.id === el.deviceId);
    if (!dev) return;
    const momentary = ACTUATE[el.contactKey];
    if (momentary) {
      momentaryPress(e, dev.id, momentary, onPatchDeviceState);
    } else if (el.contactKey === 'estop') {
      onPatchDeviceState(dev.id, { latched: !dev.state.latched });
    } else if (el.contactKey === 'trip_nc' || el.contactKey === 'alarm_no') {
      onPatchDeviceState(
        dev.id,
        dev.state.tripped ? { tripped: false, tripReason: undefined } : { tripped: true, tripReason: 'TOR TEST trip (from ladder)' }
      );
    } else if (el.contactKey === 'sw') {
      onPatchDeviceState(dev.id, { closed: !dev.state.closed });
    }
  };
  const onElHover = (el: LadderElement | null) => onHoverDevice?.(el?.deviceId || null);

  // ── Layout ──
  const preWidths = views.map((v) => measure(v.pre).w);
  const postWidths = views.map((v) => measure(v.post).w);
  const coilCol = Math.max(3, ...preWidths) ;
  const maxPost = Math.max(0, ...postWidths);
  const totalCols = coilCol + 1 + maxPost;
  const x0 = RAIL_L + 18;
  const railR = x0 + totalCols * CW + 18;
  const rungHeights = views.map((v) => Math.max(measure(v.pre).h, measure(v.post).h, 1));
  const svgH = TOP + rungHeights.reduce((a, h) => a + h * RH + 18, 0) + 70;
  const svgW = railR + 130;

  // Cross references: coil device → rung numbers where its contacts appear
  const xref = (deviceId: string | undefined, self: number) => {
    if (!deviceId) return '';
    const hits: string[] = [];
    views.forEach((v, i) => {
      const walk = (n: LadderNode): LadderElement[] => (n.kind === 'el' ? [n.el] : n.items.flatMap(walk));
      [...walk(v.pre), ...walk(v.post)].forEach((e) => {
        if (e.deviceId === deviceId && e.kind !== 'COIL') hits.push(`${e.kind === 'NC' ? '⊘' : '○'}${e.sub}→${i + 1}`);
      });
      void self;
    });
    return hits.join('  ');
  };

  const parts: React.ReactNode[] = [];
  let yCursor = TOP;
  views.forEach((v, i) => {
    const h = rungHeights[i];
    const ctx: DrawCtx = {
      parts,
      x0,
      yTop: yCursor,
      isClosed,
      selectedElId: selElId,
      selectedDeviceId,
      onElMouseDown,
      onElHover,
      keyPrefix: v.key,
      energized: railsLive,
    };
    const cy = rowY(ctx, 0);
    const isSelRung = mode === 'builder' && v.rungId === selRungId;
    parts.push(
      <g key={`${v.key}-bg`}>
        <rect
          x={RAIL_L + 2}
          y={yCursor + 2}
          width={railR - RAIL_L - 4}
          height={h * RH - 4}
          rx={10}
          fill={isSelRung ? 'rgba(14,165,233,0.06)' : i % 2 ? 'rgba(15,23,42,0.015)' : 'transparent'}
          stroke={isSelRung ? '#7dd3fc' : 'transparent'}
          onMouseDown={() => {
            if (mode === 'builder' && v.rungId) {
              setSelRungId(v.rungId);
              setSelElId(null);
            }
          }}
        />
        <text x={RAIL_L - 28} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#94a3b8" fontFamily="ui-monospace, monospace">
          {String(i + 1).padStart(2, '0')}
        </text>
      </g>
    );
    // L1 rail stub
    wire(ctx, `${v.key}-in`, RAIL_L, cy, x0, cy, railsLive);
    const preOut = drawNode(ctx, v.pre, 0, 0, railsLive, `${v.key}-pre`);
    const preW = measure(v.pre).w;
    wire(ctx, `${v.key}-fill`, cellX(ctx, preW), cy, cellX(ctx, coilCol), cy, preOut);
    const energized = loadEnergized(v.output, preOut) && railsLive;
    const lampColor = LAMP_COLORS[(v.output?.sub || '').toUpperCase()] || '#22c55e';
    drawOutput(ctx, v.output, coilCol, 0, preOut, energized, lampColor, `${v.key}-out`);
    const postOut = drawNode(ctx, v.post, coilCol + 1, 0, energized, `${v.key}-post`);
    const postW = measure(v.post).w;
    wire(ctx, `${v.key}-tail`, cellX(ctx, coilCol + 1 + postW), cy, railR, cy, postW > 0 ? postOut : energized);
    // cross reference
    const xr = xref(v.output?.deviceId, i);
    if (xr && v.output?.kind === 'COIL') {
      parts.push(
        <text key={`${v.key}-xr`} x={railR + 10} y={cy + 4} fontSize={8.5} fontWeight={700} fill="#64748b" fontFamily="ui-monospace, monospace">
          {xr}
        </text>
      );
    }
    yCursor += h * RH + 18;
  });

  const totalRailBottom = Math.max(yCursor - 10, TOP + 80);
  const xfmr = devices.find((d) => d.type === 'control_transformer');
  const railVoltLabel = xfmr ? `${xfmr.state.secondaryVolts || 220}V (X1)` : 'Line (L)';
  const verifySummary = verify
    ? {
        ok: verify.filter((m) => m.level === 'ok').length,
        err: verify.filter((m) => m.level === 'error').length,
        warn: verify.filter((m) => m.level === 'warn').length,
      }
    : null;

  const modeBtn = ({ id, icon, label, disabled, title }: { id: LadderMode; icon: React.ReactNode; label: string; disabled?: boolean; title: string }) => (
    <button
      key={id}
      disabled={disabled}
      title={title}
      onClick={() => setMode(id)}
      className={`flex items-center gap-1 px-2.5 h-7 rounded-md text-[11px] font-bold transition ${
        mode === id ? 'bg-slate-900 text-white shadow-sm' : disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const symBtn = ({ kind, glyph, title }: { kind: LadderElementKind; glyph: string; title: string }) => (
    <button
      key={kind}
      title={title}
      onClick={() => {
        setArmed(kind);
        setOptionKey('');
      }}
      className={`h-7 min-w-[38px] px-2 rounded-md font-mono text-xs font-black border transition ${
        armed === kind ? 'bg-sky-600 text-white border-sky-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
    >
      {glyph}
    </button>
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-[#fbfaf7] overflow-hidden select-none">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur px-3 py-2 flex flex-wrap items-center gap-2 z-10">
        <div className="flex items-center gap-1.5 mr-1">
          <Activity className="w-4 h-4 text-emerald-600" />
          <div className="leading-tight">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">Control Ladder Diagram</div>
            <div className="text-[10px] font-mono text-slate-500 truncate max-w-[220px]" title={phys.rails.source}>
              Rails: {phys.rails.source}
            </div>
          </div>
        </div>
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          {modeBtn({ id: 'live', icon: <Radio className="w-3 h-3" />, label: 'Live Sync', title: 'Auto-parsed from the physical workbench wiring' })}
          {modeBtn({
            id: 'target',
            icon: <Target className="w-3 h-3" />,
            label: 'Lab Target',
            disabled: !targetLadder || targetLadder.length === 0,
            title: "The active lab's reference control ladder",
          })}
          {modeBtn({ id: 'builder', icon: <PenTool className="w-3 h-3" />, label: 'Rung Builder', title: 'Draw your own ladder and verify it against the wiring' })}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span
            className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full border ${
              railsLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {railsLive ? '● CONTROL ENERGIZED' : isSimulating ? '○ CONTROL DEAD' : '○ EDIT MODE'}
          </span>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {headerRight}
        </div>

        {mode === 'builder' && (
          <div className="w-full flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
            <button onClick={addRung} className="h-7 px-2 rounded-md text-[11px] font-bold bg-white border border-slate-200 hover:border-slate-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Rung
            </button>
            <div className="w-px h-5 bg-slate-200" />
            {symBtn({kind: "NO", glyph: "| |", title: "Normally Open contact (Start PB, Aux 13-14, TOR 97-98)",})}
            {symBtn({kind: "NC", glyph: "|/|", title: "Normally Closed contact (Stop PB, TOR 95-96, Interlock 21-22, E-Stop)",})}
            <button
              title="Parallel seal-in / latching branch: the next contact is placed in parallel with the selected one"
              onClick={() => setBranchMode((b) => !b)}
              className={`h-7 min-w-[38px] px-2 rounded-md font-mono text-xs font-black border transition ${
                branchMode ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              ||
            </button>
            {symBtn({kind: "COIL", glyph: "( )", title: "Contactor / relay coil (KM1 / FOR, KM2 / REV, KA1)",})}
            {symBtn({kind: "LAMP", glyph: "(*)", title: "Pilot indicator lamp (PL_RUN, PL_FAULT)",})}
            <select
              value={currentOption?.key || ''}
              onChange={(e) => setOptionKey(e.target.value)}
              className="h-7 text-[11px] font-mono rounded-md border border-slate-200 bg-white px-1.5 max-w-[260px]"
            >
              {pickOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={insert}
              className="h-7 px-2.5 rounded-md text-[11px] font-bold bg-sky-600 text-white border border-sky-700 hover:bg-sky-700"
              title={branchMode ? 'Insert as a parallel branch around the selected contact' : 'Insert after the selected contact (or set the rung output)'}
            >
              {branchMode ? 'Insert ∥' : 'Insert'}
            </button>
            <button onClick={deleteSelected} className="h-7 px-2 rounded-md text-[11px] font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1" title="Delete the selected symbol (or the selected rung)">
              <Trash2 className="w-3 h-3" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button onClick={autoBuild} className="h-7 px-2 rounded-md text-[11px] font-bold bg-white border border-slate-200 hover:border-slate-300 flex items-center gap-1" title="Replace your ladder with one parsed from the physical wiring">
              <Wand2 className="w-3 h-3" /> From wiring
            </button>
            {targetLadder && targetLadder.length > 0 && (
              <button onClick={copyTarget} className="h-7 px-2 rounded-md text-[11px] font-bold bg-white border border-slate-200 hover:border-slate-300 flex items-center gap-1" title="Start from the lab's target ladder">
                <Target className="w-3 h-3" /> From target
              </button>
            )}
            <button
              onClick={runVerify}
              className="h-7 px-2.5 rounded-md text-[11px] font-black bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> Verify Against Physical Wiring
            </button>
          </div>
        )}
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-auto" onMouseDown={() => mode === 'builder' && setSelElId(null)}>
        {views.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="max-w-sm text-center bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800 mb-1">
                {mode === 'builder' ? 'Start your ladder' : 'No control rungs found'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {mode === 'builder'
                  ? 'Add a rung, pick a symbol and a device contact, then Insert. Or build it automatically from the wiring.'
                  : 'Wire a control circuit from the transformer X1 (220V hot) through contacts to a contactor coil A1-A2 and back to X2 — it appears here automatically.'}
              </p>
              {mode === 'builder' && (
                <div className="flex justify-center gap-2 mt-3">
                  <button onClick={addRung} className="h-8 px-3 rounded-lg text-xs font-bold bg-sky-600 text-white">+ Add rung</button>
                  <button onClick={autoBuild} className="h-8 px-3 rounded-lg text-xs font-bold bg-white border border-slate-200">From wiring</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <svg width={svgW * zoom} height={svgH * zoom} viewBox={`0 0 ${svgW} ${svgH}`} className="block">
            <defs>
              <pattern id="ladderGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill="#e2e8f0" />
              </pattern>
            </defs>
            <rect x={0} y={0} width={svgW} height={svgH} fill="url(#ladderGrid)" />
            {/* Rails */}
            <line x1={RAIL_L} y1={TOP - 22} x2={RAIL_L} y2={totalRailBottom} stroke={railsLive ? '#dc2626' : COLORS.rail} strokeWidth={4} strokeLinecap="round" />
            <line x1={railR} y1={TOP - 22} x2={railR} y2={totalRailBottom} stroke={railsLive ? '#2563eb' : COLORS.rail} strokeWidth={4} strokeLinecap="round" />
            <text x={RAIL_L - 6} y={TOP - 30} textAnchor="start" fontSize={11} fontWeight={900} fill={railsLive ? '#dc2626' : '#0f172a'} fontFamily="ui-sans-serif, system-ui">
              L1 · {railVoltLabel} Control Hot
            </text>
            <text x={railR + 6} y={TOP - 30} textAnchor="end" fontSize={11} fontWeight={900} fill={railsLive ? '#2563eb' : '#0f172a'} fontFamily="ui-sans-serif, system-ui">
              L2 · Control Return
            </text>
            {parts}
          </svg>
        )}
      </div>

      {/* Legend / verification results */}
      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-2 max-h-[38%] overflow-auto">
        {verify ? (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">Wiring Verification</span>
              {verifySummary && (
                <span className="text-[10px] font-mono text-slate-500">
                  {verifySummary.ok} match · {verifySummary.err} error · {verifySummary.warn} warning
                </span>
              )}
              <button onClick={() => setVerify(null)} className="ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-700">
                close
              </button>
            </div>
            <ul className="space-y-1">
              {verify.map((m, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-1.5 text-[11px] leading-snug rounded-lg px-2 py-1 border ${
                    m.level === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : m.level === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {m.level === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" /> : m.level === 'error' ? <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />}
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-4 h-[3px] bg-emerald-600 rounded" /> energized path / closed contact</span>
            <span className="flex items-center gap-1"><span className="w-4 h-[3px] bg-rose-600 rounded" /> voltage blocked by open contact</span>
            <span className="flex items-center gap-1"><span className="w-4 h-[2px] bg-slate-500 rounded" /> de-energized</span>
            <span>
              {mode === 'builder'
                ? 'Click a symbol to select it · || then Insert adds a parallel seal-in branch'
                : isSimulating
                ? 'Hold START / STOP / FWD / REV symbols to press · click OLR to TEST / RESET'
                : 'Press ▶ Simulate to energize, then operate the circuit from here'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
