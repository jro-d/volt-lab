import React, { useEffect, useMemo, useState } from 'react';
import type { ElectricalProject, FaultKind, InjectedFault } from '../../types/electrical';
import {
  FAULT_LABEL, FaultDifficulty, faultContactPairs, faultExplanation, faultKindsFor, generateFaults,
} from '../../core/faults';
import {
  DiagState, REVEAL_HINT_COST, diagnosisScore, hintText, newDiagState, submitDiagnosis,
} from '../../core/troubleshootSession';
import { TroubleshootScenario, resolveScenarioFaults, scenariosFor } from '../../data/troubleshootScenarios';

interface Props {
  project: ElectricalProject;
  selectedDeviceId: string | null;
  diag: DiagState;
  onDiag: (next: DiagState) => void;
  scenario: TroubleshootScenario | null;
  onScenario: (s: TroubleshootScenario | null) => void;
  onFaults: (faults: InjectedFault[]) => void;
  onFlashDevice: (id: string) => void;
  onClose: () => void;
}

const btn = 'px-2 py-1 rounded-md border text-[11px] font-semibold transition';
const idle = 'bg-surface border-border text-ink hover:bg-surface-hover';
const active = 'bg-probe text-on-probe border-probe';

/**
 * Troubleshooting mode panel. Student tab: symptom, suspects, hints, diagnosis and score. Author tab (shows the
 * faults, so a student should not open it): add / remove faults, difficulty presets, seeded generation, scenarios.
 */
export const TroubleshootPanel: React.FC<Props> = ({ project, selectedDeviceId, diag, onDiag, scenario, onScenario, onFaults, onFlashDevice, onClose }) => {
  const [tab, setTab] = useState<'student' | 'author'>('student');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pickDevice, setPickDevice] = useState('');
  const [pickKind, setPickKind] = useState<FaultKind>('open_coil');
  const [seed, setSeed] = useState(1);
  const [now, setNow] = useState(Date.now());
  const faults = project.faults ?? [];
  const complete = faults.length > 0 && faults.every((f) => diag.found.includes(f.id));

  useEffect(() => {
    if (diag.startedAt === null || complete) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [diag.startedAt, complete]);
  const seconds = diag.startedAt === null ? 0 : Math.floor((now - diag.startedAt) / 1000);
  const startIfNeeded = (d: DiagState): DiagState => (d.startedAt === null ? { ...d, startedAt: Date.now() } : d);

  const scenarios = useMemo(() => scenariosFor(project.id), [project.id]);
  const loadScenario = (s: TroubleshootScenario) => {
    const resolved = resolveScenarioFaults(s, project);
    onFaults(resolved);
    onScenario(s);
    onDiag({ ...newDiagState(), startedAt: Date.now() });
    setMessage(null);
  };

  const nextFault = faults.find((f) => !diag.found.includes(f.id));
  const hint = () => {
    const level = diag.hints + 1;
    onDiag(startIfNeeded({ ...diag, hints: level }));
    setMessage({ ok: true, text: hintText(Math.min(3, level), nextFault, project.devices) });
  };
  const reveal = () => {
    onFaults(faults.map((f) => ({ ...f, revealed: true })));
    onDiag(startIfNeeded({ ...diag, hints: diag.hints + REVEAL_HINT_COST, revealedAll: true }));
    setMessage({ ok: true, text: `Revealed (${REVEAL_HINT_COST} hints used): ${faults.map((f) => `${FAULT_LABEL[f.kind]} at ${project.devices.find((d) => d.id === f.deviceId)?.name || f.deviceId}`).join('; ')}` });
  };
  const submit = () => {
    if (!pickDevice) {
      setMessage({ ok: false, text: 'Pick the device first.' });
      return;
    }
    const r = submitDiagnosis(startIfNeeded(diag), faults, project.wires, pickDevice, pickKind);
    onDiag(r.state);
    if (r.correct && r.fault) {
      setMessage({ ok: true, text: `Correct. ${faultExplanation(r.fault, project.devices)}${r.complete ? ' All faults found.' : ' There is another fault.'}` });
    } else {
      setMessage({ ok: false, text: 'Not it. That device and fault kind do not match any fault in the circuit.' });
    }
  };
  const toggleSuspect = () => {
    if (!selectedDeviceId) return;
    const has = diag.suspects.includes(selectedDeviceId);
    onDiag({ ...diag, suspects: has ? diag.suspects.filter((s) => s !== selectedDeviceId) : [...diag.suspects, selectedDeviceId] });
  };

  // ── Author tab state ──
  const selected = project.devices.find((d) => d.id === selectedDeviceId) || null;
  const [authorKind, setAuthorKind] = useState<FaultKind>('open_wire');
  const [wireA, setWireA] = useState('');
  const [wireB, setWireB] = useState('');
  const [pairIdx, setPairIdx] = useState(0);
  const [ohms, setOhms] = useState(3);
  const [dial, setDial] = useState(1);
  const kinds = selected ? faultKindsFor(selected) : [];
  const touching = selected ? project.wires.filter((w) => w.fromDeviceId === selected.id || w.toDeviceId === selected.id) : [];
  const pairs = selected ? faultContactPairs(selected) : [];
  const wireLabel = (id: string) => {
    const w = project.wires.find((x) => x.id === id);
    return w ? `${w.fromDeviceId}:${w.fromTerminalId} → ${w.toDeviceId}:${w.toTerminalId}` : id;
  };
  const addFault = () => {
    if (!selected) return;
    const kind = kinds.includes(authorKind) ? authorKind : kinds[0];
    const params: Record<string, any> = {};
    if (kind === 'welded_contact' || kind === 'contact_open') params.pair = pairs[pairIdx]?.pair ?? pairs[0]?.pair;
    if (kind === 'open_wire') params.wireId = wireA || touching[0]?.id;
    if (kind === 'high_resistance_joint') { params.wireId = wireA || touching[0]?.id; params.ohms = ohms; }
    if (kind === 'overload_setting_wrong') params.dialAmps = dial;
    if (kind === 'loose_neutral') params.terminalId = selected.terminals.find((t) => t.type === 'neutral')?.id;
    if (kind === 'swapped_phases') { params.wireA = wireA || touching[0]?.id; params.wireB = wireB || touching[1]?.id; }
    onFaults([...faults, { id: `fault_${Date.now().toString(36)}`, deviceId: selected.id, kind, params, revealed: false }]);
  };
  const preset = (d: FaultDifficulty) => {
    onFaults(generateFaults(project.devices, project.wires, d, seed));
    onScenario(null);
    onDiag(newDiagState());
  };

  return (
    <div className="absolute bottom-14 left-4 z-30 w-[22rem] max-h-[70%] overflow-y-auto rounded-xl border-2 border-warning/70 bg-surface/95 shadow-2 backdrop-blur-md text-ink">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-bold tracking-widest uppercase text-warning">Troubleshooting</span>
        <div className="flex items-center gap-1">
          {(['student', 'author'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`${btn} ${tab === t ? active : idle}`}>{t === 'student' ? 'Student' : 'Author'}</button>
          ))}
          <button onClick={onClose} className={`${btn} ${idle}`} title="Leave troubleshooting mode">✕</button>
        </div>
      </div>

      {tab === 'student' ? (
        <div className="p-3 space-y-2.5 text-xs">
          <div className="rounded-lg bg-surface-sunken border border-border px-2.5 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">Symptom</div>
            {faults.length === 0 ? (
              <span className="text-ink-muted">No faults yet. Load a scenario below, or open the Author tab.</span>
            ) : (
              <span>{scenario?.symptom || 'Something is wrong with this circuit. Use the DMM, the clamp meter and the test instruments to find it. The code inspector shows symptoms only.'}</span>
            )}
          </div>
          {scenarios.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">Scenarios for this circuit</div>
              <div className="space-y-1">
                {scenarios.map((s) => (
                  <button key={s.id} onClick={() => loadScenario(s)} className={`${btn} ${scenario?.id === s.id ? active : idle} w-full text-left`}>
                    {s.title} <span className="opacity-70">({s.difficulty})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {faults.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={toggleSuspect} disabled={!selectedDeviceId} className={`${btn} ${idle} disabled:opacity-40`}>
                  {selectedDeviceId && diag.suspects.includes(selectedDeviceId) ? 'Clear suspect' : 'Mark selected as suspect'}
                </button>
                <button onClick={hint} className={`${btn} ${idle}`}>Hint</button>
                <button onClick={reveal} className={`${btn} ${idle}`} title={`Shows the faults and costs ${REVEAL_HINT_COST} hints`}>Reveal</button>
              </div>
              {diag.suspects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {diag.suspects.map((id) => (
                    <button key={id} onClick={() => onFlashDevice(id)} className={`${btn} ${idle}`}>🔍 {project.devices.find((d) => d.id === id)?.name?.split(' ')[0] || id}</button>
                  ))}
                </div>
              )}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">Submit diagnosis</div>
                <div className="flex gap-1">
                  <select value={pickDevice} onChange={(e) => setPickDevice(e.target.value)} className="flex-1 min-w-0 bg-surface border border-border rounded-md px-1.5 py-1 text-[11px]">
                    <option value="">Device…</option>
                    {project.devices.map((d) => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
                  </select>
                  <select value={pickKind} onChange={(e) => setPickKind(e.target.value as FaultKind)} className="flex-1 min-w-0 bg-surface border border-border rounded-md px-1.5 py-1 text-[11px]">
                    {(Object.keys(FAULT_LABEL) as FaultKind[]).map((k) => <option key={k} value={k}>{FAULT_LABEL[k]}</option>)}
                  </select>
                  <button onClick={submit} className={`${btn} ${active}`}>Submit</button>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] text-ink-muted">
                <span>Found {diag.found.length}/{faults.length}</span>
                <span>Wrong {diag.wrong}</span>
                <span>Hints {diag.hints}</span>
                <span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
              </div>
              {complete && (
                <div className="rounded-lg bg-ok-soft/80 border border-ok/50 px-2.5 py-2 font-semibold text-ok">
                  Solved. Score {diagnosisScore(diag, seconds)}/100 ({diag.wrong} wrong, {diag.hints} hints, {Math.floor(seconds / 60)} min{diag.revealedAll ? ', fault revealed' : ''}).
                </div>
              )}
              {complete && faults.map((f) => <div key={f.id} className="text-[11px] text-ink-muted">{faultExplanation(f, project.devices)}</div>)}
            </>
          )}
          {message && <div className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${message.ok ? 'bg-ok-soft/70 border-ok/40 text-ink' : 'bg-danger-soft/70 border-danger/40 text-danger'}`}>{message.text}</div>}
        </div>
      ) : (
        <div className="p-3 space-y-2.5 text-xs">
          <div className="text-[10px] text-danger font-semibold">Author view: this tab shows the faults. Students should not open it.</div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">Seed from this circuit</div>
            <div className="flex items-center gap-1 flex-wrap">
              {(['easy', 'medium', 'hard'] as const).map((d) => <button key={d} onClick={() => preset(d)} className={`${btn} ${idle} capitalize`}>{d}</button>)}
              <label className="flex items-center gap-1 text-[11px] text-ink-muted ml-1">
                Seed
                <input type="number" value={seed} onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="w-16 bg-surface border border-border rounded-md px-1 py-0.5 text-[11px] font-mono" />
              </label>
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">Same seed, same fault: give the number to the whole class. Easy: one obvious fault. Medium: one fault with a downstream symptom. Hard: two faults, the first can hide the second.</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Add a fault to the selected device</div>
            {!selected ? (
              <div className="text-ink-muted">Select a device on the canvas first.</div>
            ) : (
              <>
                <div className="text-[11px] font-mono">{selected.name || selected.id}</div>
                <select value={kinds.includes(authorKind) ? authorKind : kinds[0]} onChange={(e) => setAuthorKind(e.target.value as FaultKind)} className="w-full bg-surface border border-border rounded-md px-1.5 py-1 text-[11px]">
                  {kinds.map((k) => <option key={k} value={k}>{FAULT_LABEL[k]}</option>)}
                </select>
                {(authorKind === 'welded_contact' || authorKind === 'contact_open') && pairs.length > 0 && (
                  <select value={pairIdx} onChange={(e) => setPairIdx(Number(e.target.value))} className="w-full bg-surface border border-border rounded-md px-1.5 py-1 text-[11px]">
                    {pairs.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
                  </select>
                )}
                {(authorKind === 'open_wire' || authorKind === 'high_resistance_joint' || authorKind === 'swapped_phases') && (
                  <select value={wireA} onChange={(e) => setWireA(e.target.value)} className="w-full bg-surface border border-border rounded-md px-1.5 py-1 text-[11px]">
                    <option value="">Wire…</option>
                    {touching.map((w) => <option key={w.id} value={w.id}>{wireLabel(w.id)}</option>)}
                  </select>
                )}
                {authorKind === 'swapped_phases' && (
                  <select value={wireB} onChange={(e) => setWireB(e.target.value)} className="w-full bg-surface border border-border rounded-md px-1.5 py-1 text-[11px]">
                    <option value="">Swap with wire…</option>
                    {touching.filter((w) => w.id !== wireA).map((w) => <option key={w.id} value={w.id}>{wireLabel(w.id)}</option>)}
                  </select>
                )}
                {authorKind === 'high_resistance_joint' && (
                  <label className="flex items-center gap-1 text-[11px]">Ohms <input type="number" min={0.5} step={0.5} value={ohms} onChange={(e) => setOhms(Number(e.target.value) || 1)} className="w-16 bg-surface border border-border rounded-md px-1 py-0.5 font-mono" /></label>
                )}
                {authorKind === 'overload_setting_wrong' && (
                  <label className="flex items-center gap-1 text-[11px]">Dial (A) <input type="number" min={0.5} step={0.5} value={dial} onChange={(e) => setDial(Number(e.target.value) || 1)} className="w-16 bg-surface border border-border rounded-md px-1 py-0.5 font-mono" /></label>
                )}
                <button onClick={addFault} className={`${btn} ${active}`}>Add fault</button>
              </>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Faults in this project ({faults.length})</div>
            {faults.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1">
                <span className="text-[11px]">{FAULT_LABEL[f.kind]} · {project.devices.find((d) => d.id === f.deviceId)?.name || f.deviceId}</span>
                <button onClick={() => onFaults(faults.filter((x) => x.id !== f.id))} className={`${btn} ${idle}`}>Remove</button>
              </div>
            ))}
            {faults.length > 0 && <button onClick={() => { onFaults([]); onScenario(null); onDiag(newDiagState()); }} className={`${btn} ${idle}`}>Clear all</button>}
          </div>
        </div>
      )}
    </div>
  );
};
