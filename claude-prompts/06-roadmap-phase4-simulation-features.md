# 06 — Roadmap phase 4: simulation-heavy features

Read `00-start-here-and-conventions.md` first. Run after prompt 04 (it can run in parallel with prompt 05 only if you use separate branches and merge carefully). Branch per feature: `feat/<feature-slug>`. Do features in the order listed; each is independent after the first.

Common rules: no change to existing lab results; new UI follows the existing design tokens (`tokens.css`); everything optional is off by default so the app looks the same for users who ignore it; serialise new project data under a versioned field so older saves still load.

## 1. Troubleshooting mode (fault injection)

**Goal:** a teacher or the app injects hidden faults into a working circuit, and the student finds them using the DMM, clamp meter and the test instruments.

Data model (add to `ElectricalProject`, optional): `faults?: InjectedFault[]` with `{ id, deviceId, kind, params, revealed: boolean }`. Fault kinds, each implemented as a small transform applied inside the solver before solving:
- `open_coil` (contactor/relay/timer coil open), `welded_contact` (a contact stuck closed), `contact_open` (stuck open), `loose_neutral` (high resistance on a neutral terminal), `open_wire` (a wire disconnected electrically but drawn normally), `high_resistance_joint` (adds `ohms` to a wire; causes voltage drop and heating), `earth_fault_to_frame`, `overload_setting_wrong` (overload dial far too low or high), `blown_fuse`, `swapped_phases`.
UI:
- A "Troubleshoot" toggle in the top bar. When on, injected faults are hidden (no coloured hints, no code-inspector message that gives the cause away; the Code Inspector HUD shows only symptoms).
- A fault panel for the author: add/remove faults on selected devices, set difficulty presets (Easy: one fault with obvious symptom; Medium: one fault, symptom downstream; Hard: two faults, one masking the other), and "Seed from lab" to generate a random fault set with a seed number so a teacher can give the same fault to a class.
- Student actions: place a "Suspect" marker on a device, use "Reveal" (costs hints), "Submit diagnosis" (pick device + fault kind). Score: correct, attempts, hints, time. Show the result and the explanation text for the fault.
- Each lab can ship a default fault list in its data; start with the DOL starter, forward/reverse starter and the staircase lighting lab.
Deliver: the fault model, solver transforms, UI, 5 pre-made troubleshooting scenarios, tests that each fault produces the expected symptom (for example `open_coil` on KM1: START pressed, motor does not run, 220 V across the open coil).

## 2. Timing diagram recorder

**Goal:** plot states against time for sequence labs (Y-Δ changeover, interlocked reversing, timers).
- Add a `Recorder` panel (bottom dock, collapsible). The user clicks devices or terminals to add **channels**: a coil, a contact, a motor running state, a lamp, a voltage at a terminal, a current. Digital channels draw as step traces, analog as lines.
- Sampling: at each simulation tick while Simulate is running; ring buffer of 20,000 samples; time axis in seconds with the existing simulation speed. Pause/resume, cursor with value read-out, zoom and pan.
- Export PNG and CSV (time, channel columns).
- Prefill: for the Y-Δ lab, preset channels KM1, KMY, KMD, KT1 contact, motor running.
- Tests: recorded channel for a timer with `delaySec = 5` shows the transition within one tick of 5 s.

## 3. PLC program editor

**Goal:** real PLC logic instead of the fixed demo behaviour on the PLC device.
- New view tab "PLC". Reuse the ladder data model in `types/ladder.ts` as the base, extended (do not break existing control ladders): contacts NO, NC, positive edge, negative edge; coils output, set, reset, negated; timers TON, TOF, TP; counters CTU, CTD; compare (EQ, GT, LT) and MOV/ADD on memory words; memory bits `M0.0-M0.7`, words `MW0-MW7`.
- Scan engine: `src/core/plcEngine.ts`, cyclic scan (read inputs, solve rungs top to bottom, write outputs) at a configurable scan time. Inputs I come from the wired terminals of the PLC device as solved by the circuit solver; outputs Q drive the PLC's output relays/transistors back into the circuit.
- Editor: palette, drag onto rungs, tag editing, cut/copy/paste rungs, undo, symbolic names for addresses, a "Monitor" mode showing live values and power flow, force I/O (clearly marked).
- Validation: duplicate output coils, unused addresses, unconnected rung ends.
- Ship 6 presets: Start/Stop latch, TON delayed start, traffic light, conveyor counter, two-motor sequence, tank level.
- Link: `plc_micro_controller` and the 24 V PLC from prompt 04 gain `program` stored in the device state; keep the `passthrough` and `start_stop_latch` values working for old labs.
- After this lands, tell the user that Batch 3.7 in prompt 05 (larger PLC, smart relay, HMI) can proceed.

## 4. Time-current curves

**Goal:** coordination plots for breakers, fuses and overload relays.
- A "Curves" panel using `src/core/tripCurves.ts` (single source of truth, created in prompt 03). Select devices in a chain, draw their minimum/maximum bands on a log-log chart (current multiple vs time), mark the **operating point** from the solver, and highlight overlaps (non-selective coordination) in red.
- Include motor starting current and the cable damage curve for the selected conductor (document the formula in a comment; if you are not certain of a constant, put it in `standardsData.ts` flagged `needsVerification`).
- Export PNG. Add one lab: "Fuse and MCB coordination for a motor feeder".

## 5. Short-circuit check

**Goal:** show the prospective fault current at each point and compare it with device `kaRating`.
- Add project settings: source short-circuit level (kA) or source impedance, transformer kVA and impedance if present, default 10 kA at the service entrance.
- Compute with the simple ohmic method: source + conductor resistance and reactance per metre from `standardsData.ts` conductor data (add reactance values only if you are certain; otherwise resistive only and say so in the UI). Report Ik at every device input along the traced paths.
- Code Inspector rule: any protective device with `kaRating` below the available Ik is an **error**; within 20% is a warning.
- Show the numbers in the inspector datasheet card and as a small badge on each device in a "Fault levels" overlay toggle.
- Tests: known single-conductor case with hand-calculated expected Ik within 2%.

## Acceptance for each feature

- Build and tests green; baseline labs unchanged; the feature is off or hidden until used.
- A short section added to the README; the spreadsheet Features tab statuses updated.
- Final report lists every simplification (for example "ohmic only, no reactance") so the user can mention it in the project write-up.
