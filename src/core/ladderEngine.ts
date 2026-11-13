import { ElectricalDevice, ElectricalWire } from '../types/electrical';
import { LadderElement, LadderElementKind, LadderNode, LadderRung } from '../types/ladder';

/**
 * Physical ⇄ Ladder engine.
 *
 *  1. Every control device is broken into two-terminal "elements" (NO / NC contacts, coils, lamps).
 *  2. Wires + always-bonded device internals are merged into electrical nets (union-find).
 *  3. All simple paths L1 (control hot) → L2 (control return) that pass through exactly one load
 *     become a rung; the paths of a rung are factored into a series-parallel tree for drawing.
 */

export interface PhysicalElement {
  key: string; // `${deviceId}:${contactKey}`
  deviceId: string;
  contactKey: string;
  kind: LadderElementKind;
  tag: string;
  sub: string;
  a: string; // terminal node key
  b: string;
  closed: boolean; // conducting right now (contacts) / energized (loads)
  isLoad: boolean;
}

export interface PhysicalRung {
  id: string;
  load: PhysicalElement;
  /** Contacts between L1 and the load, per path */
  prePaths: PhysicalElement[][];
  /** Contacts between the load and L2, per path (e.g. NEMA overload contacts after the coil) */
  postPaths: PhysicalElement[][];
  pre: LadderNode;
  post: LadderNode;
}

export interface PhysicalLadder {
  rails: { l1Node: string | null; l2Node: string | null; source: string };
  rungs: PhysicalRung[];
  elements: PhysicalElement[];
}

const tk = (d: string, t: string) => `${d}:${t}`;

/** Two-terminal control elements a device contributes to the ladder */
export function getControlElements(dev: ElectricalDevice): PhysicalElement[] {
  const s = dev.state;
  const out: PhysicalElement[] = [];
  const add = (
    contactKey: string,
    kind: LadderElementKind,
    tag: string,
    sub: string,
    a: string,
    b: string,
    closed: boolean
  ) =>
    out.push({
      key: tk(dev.id, contactKey),
      deviceId: dev.id,
      contactKey,
      kind,
      tag,
      sub,
      a: tk(dev.id, a),
      b: tk(dev.id, b),
      closed,
      isLoad: kind === 'COIL' || kind === 'LAMP',
    });

  switch (dev.type) {
    case 'push_button_station':
      add('stop', 'NC', 'STOP', '1-2', 'stop_1', 'stop_2', !s.stopPressed);
      add('start', 'NO', 'START', '3-4', 'start_3', 'start_4', !!s.startPressed);
      break;
    case 'push_button_fwd_rev':
      add('stop', 'NC', 'STOP', '1-2', 'stop_1', 'stop_2', !s.stopPressed);
      add('fwd', 'NO', 'FWD', '3-4', 'fwd_3', 'fwd_4', !!s.fwdPressed);
      add('rev', 'NO', 'REV', '5-6', 'rev_5', 'rev_6', !!s.revPressed);
      break;
    case 'push_button_estop':
      add('estop', 'NC', 'E-STOP', '11-12', 'nc_11', 'nc_12', !(s.latched || s.estopActive));
      break;
    case 'contactor_3p': {
      const pulled = !!(s.coilEnergized || s.manualOverride);
      const tag = s.tag || 'KM';
      const cTag = s.role || tag;
      add('aux_no', 'NO', cTag, '13-14', 'no_13', 'no_14', pulled);
      add('aux_nc', 'NC', cTag, '21-22', 'nc_21', 'nc_22', !pulled);
      add('pole1', 'NO', tag, '1-2', 'l1', 't1', pulled);
      add('pole2', 'NO', tag, '3-4', 'l2', 't2', pulled);
      add('pole3', 'NO', tag, '5-6', 'l3', 't3', pulled);
      add('coil', 'COIL', s.role ? `${tag}/${s.role}` : tag, 'A1-A2', 'a1', 'a2', !!s.coilEnergized);
      break;
    }
    case 'thermal_overload_relay':
      add('trip_nc', 'NC', 'OLR', '95-96', 'nc_95', 'nc_96', !s.tripped);
      add('alarm_no', 'NO', 'OLR', '97-98', 'no_97', 'no_98', !!s.tripped);
      break;
    case 'industrial_relay_dpdt': {
      const on = !!(s.coilEnergized || s.manualTest);
      const tag = s.tag || 'KA1';
      add('no_1', 'NO', tag, '11-14', 'com_1', 'no_1', on);
      add('nc_1', 'NC', tag, '11-12', 'com_1', 'nc_1', !on);
      add('no_2', 'NO', tag, '21-24', 'com_2', 'no_2', on);
      add('nc_2', 'NC', tag, '21-22', 'com_2', 'nc_2', !on);
      add('coil', 'COIL', tag, 'A1-A2', 'a1', 'a2', !!s.coilEnergized);
      break;
    }
    case 'switch_1gang':
      add('sw', 'NO', s.tag || 'SW', 'L-1', 'l_in', 'sw_out', !!s.closed);
      break;
    case 'timer_relay': {
      const timedOut = !!s.timedOut;
      const tag = s.tag || 'KT1';
      add('timer_nc', 'NC', tag, '15-16', 'com_15', 'nc_16', !timedOut);
      add('timer_no', 'NO', tag, '15-18', 'com_15', 'no_18', timedOut);
      add('coil', 'COIL', `${tag} (${s.delaySec ?? 5}s)`, 'A1-A2', 'a1', 'a2', !!s.energized);
      break;
    }
    case 'pilot_light_indicator': {
      const colour = (s.pilotColor || 'green').toUpperCase();
      add('lamp', 'LAMP', s.tag || `PL_${colour === 'RED' ? 'FAULT' : colour === 'GREEN' ? 'RUN' : colour}`, colour, 'x1', 'x2', !!s.lit);
      break;
    }
  }
  return out;
}

/** Union-find nets over wires + always-bonded device internals */
function buildNets(devices: ElectricalDevice[], wires: ElectricalWire[]) {
  const parent = new Map<string, string>();
  const find = (a: string): string => {
    let r = a;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    // path compression
    let c = a;
    while (parent.has(c) && parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    if (!parent.has(r)) parent.set(r, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const w of wires) union(tk(w.fromDeviceId, w.fromTerminalId), tk(w.toDeviceId, w.toTerminalId));
  for (const d of devices) {
    const all = (ids: string[]) => {
      for (let i = 1; i < ids.length; i++) union(tk(d.id, ids[0]), tk(d.id, ids[i]));
    };
    if (d.category === 'busbar' || d.type === 'splice_wire_nut' || d.type === 'wago_connector_3p') {
      all(d.terminals.map(t => t.id));
    } else if (d.type.includes('junction_box') || d.type === 'utility_box_surface_pvc') {
      const groups: Record<string, string[]> = {};
      for (const t of d.terminals) if (t.spliceGroup) (groups[t.spliceGroup] ||= []).push(t.id);
      Object.values(groups).forEach(all);
    } else if (d.type === 'thermal_overload_relay') {
      all(['l1', 't1']);
      all(['l2', 't2']);
      all(['l3', 't3']);
    }
  }
  return find;
}

/** Factor a set of element sequences into a series-parallel tree */
export function buildSeriesParallel<T extends { key: string }>(
  seqs: T[][],
  toNode: (el: T) => LadderNode
): LadderNode {
  const uniq: T[][] = [];
  const seen = new Set<string>();
  for (const s of seqs) {
    const k = s.map(e => e.key).join('>');
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(s);
    }
  }
  if (uniq.length === 0) return { kind: 'series', items: [] };
  if (uniq.length === 1) return { kind: 'series', items: uniq[0].map(toNode) };

  const minLen = Math.min(...uniq.map(s => s.length));
  let p = 0;
  while (p < minLen && uniq.every(s => s[p].key === uniq[0][p].key)) p++;
  let q = 0;
  while (
    q < minLen - p &&
    uniq.every(s => s[s.length - 1 - q].key === uniq[0][uniq[0].length - 1 - q].key)
  )
    q++;

  const prefix = uniq[0].slice(0, p);
  const suffix = uniq[0].slice(uniq[0].length - q);
  const middles = uniq.map(s => s.slice(p, s.length - q));

  // Group middles by their first element (an empty middle is a plain bypass wire)
  const groups = new Map<string, T[][]>();
  for (const m of middles) {
    const g = m.length === 0 ? '__wire__' : m[0].key;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(m);
  }
  const branches: LadderNode[] = [];
  for (const [g, ms] of groups) {
    if (g === '__wire__') {
      branches.push({ kind: 'series', items: [] });
      continue;
    }
    const first = ms[0][0];
    const rests = ms.map(m => m.slice(1));
    const restNode = buildSeriesParallel(rests, toNode);
    branches.push({ kind: 'series', items: [toNode(first), restNode] });
  }

  const items: LadderNode[] = [...prefix.map(toNode)];
  items.push(branches.length === 1 ? branches[0] : { kind: 'parallel', items: branches });
  items.push(...suffix.map(toNode));
  return { kind: 'series', items };
}

export const physicalToLadderElement = (p: PhysicalElement): LadderElement => ({
  id: p.key,
  kind: p.kind,
  tag: p.tag,
  sub: p.sub,
  deviceId: p.deviceId,
  contactKey: p.contactKey,
});

/** Parse the physical control circuit into ladder rungs */
export function parsePhysicalLadder(devices: ElectricalDevice[], wires: ElectricalWire[]): PhysicalLadder {
  const find = buildNets(devices, wires);
  const elements = devices.flatMap(getControlElements);
  disambiguateTags(elements, devices);

  // Rails: control transformer secondary first, else the first protective device output
  let l1Node: string | null = null;
  let l2Node: string | null = null;
  let source = 'none';
  const xfmr = devices.find(d => d.type === 'control_transformer');
  if (xfmr) {
    l1Node = tk(xfmr.id, 'x1');
    l2Node = tk(xfmr.id, 'x2');
    source = `${xfmr.state.tag || 'TC1'} X1 / X2 (${xfmr.state.secondaryVolts || 220}V)`;
  } else {
    const feeders: [string, string, string][] = [
      ['mcb_2p', 'out_1', 'out_2'],
      ['service_disconnect_2p', 'out_l', 'out_n'],
      ['royu_safety_breaker_2p', 'out_l', 'out_n'],
      ['rcd_2p', 'out_l', 'out_n'],
      ['kwh_meter_1p', 'l_out', 'n_out'],
    ];
    for (const [type, l, n] of feeders) {
      const d = devices.find(dd => dd.type === type);
      if (d) {
        l1Node = tk(d.id, l);
        l2Node = tk(d.id, n);
        source = `${d.name} (L / N)`;
        break;
      }
    }
  }

  const rungs: PhysicalRung[] = [];
  if (!l1Node || !l2Node) return { rails: { l1Node, l2Node, source }, rungs, elements };

  const L1 = find(l1Node);
  const L2 = find(l2Node);
  if (L1 === L2) return { rails: { l1Node, l2Node, source }, rungs, elements };

  // Adjacency: net → elements
  const byNet = new Map<string, { el: PhysicalElement; other: string }[]>();
  for (const el of elements) {
    const na = find(el.a);
    const nb = find(el.b);
    if (na === nb) continue;
    if (!byNet.has(na)) byNet.set(na, []);
    if (!byNet.has(nb)) byNet.set(nb, []);
    byNet.get(na)!.push({ el, other: nb });
    byNet.get(nb)!.push({ el, other: na });
  }

  const pathsByLoad = new Map<string, { load: PhysicalElement; pre: PhysicalElement[]; post: PhysicalElement[] }[]>();
  let budget = 400;
  const visitedNets = new Set<string>([L1]);
  const stack: PhysicalElement[] = [];
  const dfs = (net: string, loads: number) => {
    if (budget <= 0) return;
    for (const { el, other } of byNet.get(net) || []) {
      if (stack.includes(el)) continue;
      const nl = loads + (el.isLoad ? 1 : 0);
      if (nl > 1) continue;
      if (other === L2) {
        if (nl === 1) {
          const path = [...stack, el];
          const li = path.findIndex(e => e.isLoad);
          const load = path[li];
          if (!pathsByLoad.has(load.key)) pathsByLoad.set(load.key, []);
          pathsByLoad.get(load.key)!.push({ load, pre: path.slice(0, li), post: path.slice(li + 1) });
          budget--;
        }
        continue;
      }
      if (visitedNets.has(other) || other === L1) continue;
      visitedNets.add(other);
      stack.push(el);
      dfs(other, nl);
      stack.pop();
      visitedNets.delete(other);
    }
  };
  dfs(L1, 0);

  const toNode = (p: PhysicalElement): LadderNode => ({ kind: 'el', el: physicalToLadderElement(p) });
  for (const [key, ps] of pathsByLoad) {
    rungs.push({
      id: `phys_${key}`,
      load: ps[0].load,
      prePaths: ps.map(p => p.pre),
      postPaths: ps.map(p => p.post),
      pre: buildSeriesParallel(ps.map(p => p.pre), toNode),
      post: buildSeriesParallel(ps.map(p => p.post), toNode),
    });
  }

  // Coils first (in device order), then lamps
  const order = new Map(devices.map((d, i) => [d.id, i]));
  rungs.sort((a, b) => {
    const ka = a.load.kind === 'COIL' ? 0 : 1;
    const kb = b.load.kind === 'COIL' ? 0 : 1;
    return ka - kb || (order.get(a.load.deviceId)! - order.get(b.load.deviceId)!);
  });

  return { rails: { l1Node, l2Node, source }, rungs, elements };
}

/** Suffix duplicated button tags (two START buttons → START·S1, START·S2) */
function disambiguateTags(elements: PhysicalElement[], devices: ElectricalDevice[]) {
  const groups = new Map<string, PhysicalElement[]>();
  for (const e of elements) {
    const k = `${e.tag}|${e.sub}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  for (const list of groups.values()) {
    const devIds = new Set(list.map(e => e.deviceId));
    if (devIds.size < 2) continue;
    let n = 0;
    for (const e of list) {
      const d = devices.find(dd => dd.id === e.deviceId);
      n++;
      e.tag = `${e.tag}·${d?.state.tag && d.state.tag !== e.tag ? d.state.tag : n}`;
    }
  }
}

// ───────────────────────── Student rung model helpers ─────────────────────────

export function rungToNode(rung: LadderRung): LadderNode {
  return {
    kind: 'series',
    items: rung.blocks.map(b =>
      b.branches.length === 1
        ? { kind: 'series', items: b.branches[0].map(el => ({ kind: 'el', el }) as LadderNode) }
        : {
            kind: 'parallel',
            items: b.branches.map(br => ({ kind: 'series', items: br.map(el => ({ kind: 'el', el }) as LadderNode) }) as LadderNode),
          }
    ),
  };
}

/** Convert a general series-parallel tree to the block model (one level of parallelism) */
export function nodeToBlocks(node: LadderNode, idPrefix: string): LadderRung['blocks'] {
  const flat = (n: LadderNode): LadderElement[] =>
    n.kind === 'el' ? [n.el] : n.items.flatMap(flat);
  const blocks: LadderRung['blocks'] = [];
  let i = 0;
  const visit = (n: LadderNode) => {
    if (n.kind === 'el') blocks.push({ id: `${idPrefix}_b${i++}`, branches: [[{ ...n.el, id: `${n.el.id}_${i}` }]] });
    else if (n.kind === 'series') n.items.forEach(visit);
    else blocks.push({ id: `${idPrefix}_b${i++}`, branches: n.items.map(c => flat(c).map(el => ({ ...el, id: `${el.id}_${i}` }))) });
  };
  visit(node);
  return blocks;
}

/** Enumerate all series paths through a block-model rung */
export function rungPaths(rung: LadderRung): LadderElement[][] {
  let paths: LadderElement[][] = [[]];
  for (const b of rung.blocks) {
    const next: LadderElement[][] = [];
    for (const p of paths) for (const br of b.branches) next.push([...p, ...br]);
    paths = next;
  }
  return paths;
}

export const elementRef = (el: LadderElement) =>
  el.deviceId && el.contactKey ? `${el.deviceId}:${el.contactKey}` : `tag:${el.tag}:${el.sub}:${el.kind}`;

/** Build a ready-made student ladder from the physical wiring */
export function physicalToRungs(phys: PhysicalLadder): LadderRung[] {
  return phys.rungs.map((r, idx) => ({
    id: `rung_${Date.now()}_${idx}`,
    blocks: [
      ...nodeToBlocks(r.pre, `r${idx}pre`),
      ...nodeToBlocks(r.post, `r${idx}post`),
    ],
    output: { ...physicalToLadderElement(r.load), id: `${r.load.key}_out_${idx}` },
  }));
}

// ───────────────────────── Verification ─────────────────────────

export interface VerifyMessage {
  level: 'ok' | 'error' | 'warn';
  rung?: number;
  text: string;
}

export function verifyLadderAgainstPhysical(
  studentRungs: LadderRung[],
  phys: PhysicalLadder,
  devices: ElectricalDevice[],
  wires: ElectricalWire[] = []
): VerifyMessage[] {
  const msgs: VerifyMessage[] = [];
  const devById = new Map(devices.map(d => [d.id, d]));
  const label = (el: { tag: string; sub: string }) => `${el.tag} (${el.sub})`;

  if (phys.rails.l1Node === null) {
    msgs.push({ level: 'error', text: 'No control supply found — add a 440V/220V control transformer (X1 / X2) or a 2P feeder breaker.' });
  }
  const rungs = studentRungs.filter(r => r.blocks.length > 0 || r.output);
  if (rungs.length === 0) {
    msgs.push({ level: 'warn', text: 'Your ladder is empty — add rungs with the symbol toolbar (or Auto-build from the wiring) first.' });
    return msgs;
  }

  const matchedPhys = new Set<string>();
  rungs.forEach((rung, i) => {
    const n = i + 1;
    if (!rung.output) {
      msgs.push({ level: 'error', rung: n, text: `Rung ${n} has no output — every rung must end in a coil ( ) or pilot lamp (*).` });
      return;
    }
    const outRef = elementRef(rung.output);
    const pr = phys.rungs.find(r => r.load.key === outRef);
    const outName = label(rung.output);
    if (!rung.output.deviceId) {
      msgs.push({ level: 'error', rung: n, text: `Rung ${n}: output ${outName} is not linked to a device on the workbench.` });
      return;
    }
    if (!pr) {
      msgs.push({
        level: 'error',
        rung: n,
        text: `Rung ${n}: ${outName} has no complete physical circuit from X1 to X2 — check the wiring to its terminals.`,
      });
      return;
    }
    matchedPhys.add(pr.id);

    const sPaths = rungPaths(rung).map(p => p.map(elementRef).sort().join('+'));
    const pPaths = pr.prePaths.map((pre, k) => [...pre, ...pr.postPaths[k]].map(e => e.key).sort().join('+'));
    const sSet = new Set(sPaths);
    const pSet = new Set(pPaths);
    const sEls = new Map<string, LadderElement>();
    rungPaths(rung).flat().forEach(e => sEls.set(elementRef(e), e));
    const pEls = new Map<string, PhysicalElement>();
    [...pr.prePaths.flat(), ...pr.postPaths.flat()].forEach(e => pEls.set(e.key, e));

    let problems = 0;
    // Contacts the student drew but the wiring lacks
    for (const [ref, el] of sEls) {
      if (pEls.has(ref)) continue;
      problems++;
      const outDev = rung.output.deviceId;
      if (el.contactKey === 'aux_no' && el.deviceId === outDev) {
        const block = rung.blocks.find(b => b.branches.some(br => br.some(e => elementRef(e) === ref)));
        const siblings = block?.branches.flat().filter(e => elementRef(e) !== ref).map(e => e.tag) || [];
        msgs.push({
          level: 'error',
          rung: n,
          text: `Rung ${n}: Missing ${el.tag} 13-14 Seal-In across ${siblings.length ? siblings.join(' / ') : 'the Start'} button — the coil will drop out when the button is released.`,
        });
      } else if (el.contactKey === 'aux_nc') {
        msgs.push({
          level: 'error',
          rung: n,
          text: `Rung ${n}: Missing ${el.tag} 21-22 NC Electrical Interlock before ${rung.output.tag} ${rung.output.kind === 'COIL' ? 'coil' : 'lamp'} — both contactors could close together (phase-to-phase short)!`,
        });
      } else if (el.contactKey === 'trip_nc') {
        msgs.push({ level: 'error', rung: n, text: `Rung ${n}: Missing OLR 95-96 trip contact in series with ${rung.output.tag} — the motor is not overload protected.` });
      } else if (el.contactKey === 'stop' || el.contactKey === 'estop') {
        msgs.push({ level: 'error', rung: n, text: `Rung ${n}: Missing ${label(el)} in series — the ${rung.output.tag} circuit cannot be stopped.` });
      } else if (!el.deviceId) {
        msgs.push({ level: 'warn', rung: n, text: `Rung ${n}: ${label(el)} is a generic symbol — link it to a workbench device to verify it.` });
      } else {
        msgs.push({ level: 'error', rung: n, text: `Rung ${n}: ${label(el)} is in your ladder but not wired in the physical ${rung.output.tag} circuit.` });
      }
    }
    // Contacts wired physically but not drawn
    for (const [ref, el] of pEls) {
      if (sEls.has(ref)) continue;
      problems++;
      msgs.push({ level: 'warn', rung: n, text: `Rung ${n}: Physical wiring has ${label(el)} in the ${rung.output.tag} circuit, but your ladder does not show it.` });
    }
    // Same contacts, different arrangement
    if (problems === 0) {
      const same = sSet.size === pSet.size && [...sSet].every(p => pSet.has(p));
      if (same) {
        msgs.push({ level: 'ok', rung: n, text: `Rung ${n}: ${rung.output.tag} matches the physical wiring.` });
      } else {
        const sealSeries = [...sEls.values()].some(
          e => e.contactKey === 'aux_no' && e.deviceId === rung.output!.deviceId &&
            pr.prePaths.every(pp => pp.some(x => x.key === elementRef(e)))
        );
        msgs.push({
          level: 'error',
          rung: n,
          text: sealSeries
            ? `Rung ${n}: ${rung.output.tag} 13-14 is wired in SERIES with the Start button instead of in parallel — the motor can never start.`
            : `Rung ${n}: ${rung.output.tag} has the right contacts but a different series/parallel arrangement than the wiring.`,
        });
      }
    }
  });

  for (const pr of phys.rungs) {
    if (!matchedPhys.has(pr.id)) {
      msgs.push({ level: 'warn', text: `Physical rung for ${label(pr.load)} exists on the workbench but is not drawn in your ladder.` });
    }
  }

  // Safety lint: conflicting contactor pairs (sharing load terminals or FOR/REV/STAR/DELTA roles) must be cross-interlocked
  const loadTargets = (devId: string) => {
    const keys = new Set<string>();
    for (const w of wires) {
      if (w.fromDeviceId === devId && ['t1', 't2', 't3'].includes(w.fromTerminalId)) keys.add(`${w.toDeviceId}:${w.toTerminalId}`);
      if (w.toDeviceId === devId && ['t1', 't2', 't3'].includes(w.toTerminalId)) keys.add(`${w.fromDeviceId}:${w.fromTerminalId}`);
    }
    return keys;
  };
  const contactorRungs = phys.rungs.filter(r => r.load.kind === 'COIL' && devById.get(r.load.deviceId)?.type === 'contactor_3p');
  if (contactorRungs.length >= 2) {
    for (const r of contactorRungs) {
      const rDev = devById.get(r.load.deviceId);
      const rTargets = wires.length > 0 ? loadTargets(r.load.deviceId) : null;
      const conflicts = contactorRungs.filter(o => {
        if (o === r) return false;
        if (rTargets && rTargets.size > 0) {
          const oTargets = loadTargets(o.load.deviceId);
          return [...oTargets].some(k => rTargets.has(k));
        }
        return rDev?.state.role !== 'MAIN' && devById.get(o.load.deviceId)?.state.role !== 'MAIN';
      });
      if (conflicts.length === 0) continue;
      const hasInterlock = r.prePaths
        .map((pre, k) => [...pre, ...(r.postPaths[k] || [])])
        .every(p => p.some(e => e.contactKey === 'aux_nc' && conflicts.some(o => o.load.deviceId === e.deviceId)));
      if (!hasInterlock) {
        msgs.push({
          level: 'warn',
          text: `Safety: physical ${r.load.tag} coil circuit has no NC 21-22 interlock from the conflicting contactor (${conflicts.map(c => c.load.tag).join('/')}).`,
        });
      }
    }
  }
  return msgs;
}

// ───────────────────────── Live evaluation ─────────────────────────

export interface ElementLiveState {
  powered: boolean; // voltage present on the input side
  passes: boolean; // conducting
  closed: boolean;
}

/** Walk a ladder tree propagating power left→right using the element closed-states */
export function evaluateLadder(
  node: LadderNode,
  inPowered: boolean,
  isClosed: (el: LadderElement) => boolean,
  out: Record<string, ElementLiveState>
): boolean {
  if (node.kind === 'el') {
    const closed = isClosed(node.el);
    const passes = inPowered && closed;
    out[node.el.id] = { powered: inPowered, passes, closed };
    return passes;
  }
  if (node.kind === 'series') {
    let p = inPowered;
    for (const c of node.items) p = evaluateLadder(c, p, isClosed, out);
    return p;
  }
  let any = false;
  for (const c of node.items) any = evaluateLadder(c, inPowered, isClosed, out) || any;
  return any;
}

/** Grid size of a ladder tree in cells */
export function measure(node: LadderNode): { w: number; h: number } {
  if (node.kind === 'el') return { w: 1, h: 1 };
  if (node.kind === 'series') {
    if (node.items.length === 0) return { w: 0, h: 1 };
    const ms = node.items.map(measure);
    return { w: ms.reduce((a, m) => a + m.w, 0), h: Math.max(...ms.map(m => m.h)) };
  }
  const ms = node.items.map(measure);
  return { w: Math.max(1, ...ms.map(m => m.w)), h: ms.reduce((a, m) => a + m.h, 0) };
}
