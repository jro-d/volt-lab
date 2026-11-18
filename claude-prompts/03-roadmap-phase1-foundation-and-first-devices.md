# 03 — Roadmap phase 1: safety net and first devices (the start)

Read `00-start-here-and-conventions.md` first. Run after prompts 01 and 02. Branch: `feat/roadmap-phase1`.

This is only the **start** of the roadmap: a consistency check, the catalog gaps, and the first five device changes. The rest is in prompts 04 and 05, the features in 06 and 07. Do not start those here.

## Part A — Foundation

### A1. Catalog consistency check (do this first)
Three device types (`kwh_meter_3p`, `socket_schuko`, and the old `junction_box`) were declared in `DeviceType` but missing from the catalog, and nothing caught it. Add `scripts/check-catalog.mjs` and `"check:catalog"` in `package.json`. It must fail (non-zero exit, readable message) when any of these differ:
- every member of the `DeviceType` union has a `COMPONENT_CATALOG` entry, and every entry has a union member;
- every catalog type has a `case` in `DeviceRenderer.tsx`;
- every catalog type appears in exactly one `ComponentDrawer.tsx` group;
- every terminal id inside a device is unique, and `relX`/`relY` are within 0..1;
- every catalog entry has `productStandard`, a `modelNumber`, and no manufacturer names (reuse the `BRAND_PATTERN` from `projectMigration.ts`).
Use the TypeScript compiler API (`typescript` is already a devDependency) rather than regex. Run it from `npm run build` before `tsc`.

### A2. Close the two real gaps
- `kwh_meter_3p`: 3-phase digital kWh meter, terminals L1/L2/L3/N in and out, per-phase energy and total, reuse `KwhMeterDevice.tsx` layout. Solver: sums each phase's traced current x voltage into kWh over simulated time the same way the 1-phase meter does.
- `socket_schuko`: the renderer case already exists. Add the catalog entry (IEC 60884-1 style, 16 A, L/N/PE with side earth clips), drawer group (receptacles), a code-compliance entry reusing the socket rules (RCD protection, polarity is not applicable because Schuko is reversible, so the reversed-polarity rule must **not** fire for it).

### A3. Shared trip-curve module
Create `src/core/tripCurves.ts` exporting `timeToTrip(kind, ratedAmps, currentMultiple)` for `mcb_B`, `mcb_C`, `mcb_D`, `fuse_gG`, `fuse_aM` and `overload_class10`. Use simple piecewise log-log tables with a comment giving the standard each is modelled on (IEC 60898-1, IEC 60269-1/-2, IEC 60947-4-1). First **read how `mcb_*` thermal and magnetic trips are done in `circuitSolver.ts` today** and refactor only the MCB to call this module if it is behaviour-identical (prove it with a test that compares old and new results at 1.13x, 1.45x, 2x, 5x, 10x); otherwise leave the MCB alone and use the module for new devices only. This module is reused later by the time-current curve feature (prompt 06).

### A4. Optional (propose, then confirm): behaviour registry
`circuitSolver.ts` is one 1,240-line file of `if (dev.type === ...)` branches. Read it fully, then propose in 10 lines whether a small registry (`src/core/behaviors/`, one file per new device implementing hooks such as `energize`, `trip`, `loadCurrent`) can be hooked in at the existing branch points **for new devices only** without touching existing ones. If the user agrees, build it and use it for Part B; if not, add branches in place. Do not migrate existing devices in this pass.

## Part B — First devices

For each: follow the 12-point checklist in the conventions file. Terminal tables use the naming convention there.

### B1. Timer relay modes (one device, not three)
Extend the existing `timer_relay` instead of adding new types. New property `timerMode`: `'on_delay'` (current behaviour, default so existing labs are unchanged), `'off_delay'`, `'flasher'`, `'one_shot'` (pulse). Terminals unchanged: coil `a1`/`a2`, common `15`, NC `16`, NO `18` (pneumatic-style, coil-only).
- on_delay: coil on -> after `delaySec` the contacts transfer; coil off -> back immediately.
- off_delay: coil on -> contacts transfer immediately; coil off -> contacts return after `delaySec`.
- flasher: while the coil is on, contacts toggle every `delaySec`; coil off -> reset.
- one_shot: coil on -> contacts transfer for `delaySec`, then return even if the coil stays on; re-arms when the coil drops.
Find where the existing timer is ticked (`grep -n "elapsedSec\|timedOut"` in `App.tsx` and the solver) and extend it. Inspector: a mode dropdown and the delay slider; rename the label from "On-Delay Timer Relay (KT1)" to "Timer Relay (KT1)" and show the mode on the face. Ladder: show the mode in the contact sub-label. Labs: (1) "Ventilation fan with off-delay run-on" (pilot lamp as the fan indicator is acceptable), (2) "Flasher alarm lamp". Tests assert contact state at t = 0, delay-0.1, delay+0.1 for each mode.

### B2. Fuses
Create `fuse_holder_1p` and `fuse_switch_disconnector_3p`.
- `fuse_holder_1p` (IEC 60269-1): DIN holder with a replaceable link. Terminals `in_l`, `out_l`. Properties: `fuseKind: 'gG' | 'aM'`, `ratedAmps` (6, 10, 16, 20, 25, 32, 40, 63), `blown: false`, `breakingKaRating: 50`. Behaviour: accumulate heat using `tripCurves.timeToTrip`; blow when the integrated fraction reaches 1 or on a short circuit (instant); a blown fuse is open until the user clicks "Replace fuse". Show a visible indicator window (red when blown). aM links must **not** blow on motor starting inrush within the model's start duration; note this in the datasheet.
- `fuse_switch_disconnector_3p` (IEC 60947-3): three links + one manual handle. Terminals `1/L1 2/T1 3/L2 4/T2 5/L3 6/T3`. Open handle isolates; each link blows independently; one blown link must produce the existing single-phasing fault on a downstream motor.
- Code rules: generalise the existing "overcurrent device vs conductor ampacity" rule so fuses count as overcurrent protection exactly like MCBs; add a rule that a fuse holder or disconnector on a neutral conductor in a PEC/IEC TN system is flagged (do not cite a clause unless certain).
- Labs: "Branch circuit protected by a gG fuse: overload then short circuit" and "Fuse blown on one phase of a DOL starter (single-phasing)".

### B3. RCBO 1P+N
Type `rcbo_1pn` (IEC 61009-1): combined MCB + 30 mA RCD. Terminals `in_l`, `in_n`, `out_l`, `out_n`, `pe` (pass-through reference only, as on `rcd_2p`). Properties: `ratedAmps`, `tripCurve` B/C/D, `leakageMa` 30. Behaviour: overload and magnetic trip as `mcb_1p` **and** earth-leakage trip as `rcd_2p`; reuse both code paths by extracting shared helpers if that is cleaner, without changing the old devices' behaviour. Test button works. Code rules: anywhere the code accepts an `rcd_2p` as socket protection (PEC 2.10.1.8 rule already in the project) must also accept `rcbo_1pn`. Lab: "Two sockets on separate RCBOs: a fault on one does not drop the other".

### B4. Generator sets and ATS integration
Types `generator_set_1p` and `generator_set_3p`. Properties: `running` (start/stop button on the face, with a 3 s simulated start delay), `ratedKva`, `voltage`, `frequencyHz` (60 PEC / 50 IEC from project), `loadKw` (read-only, solver-derived), `overloaded`. Terminals: 1P `l_out`, `n_out`, `pe`; 3P `l1_out`, `l2_out`, `l3_out`, `n_out`, `pe`. Optional control inputs `start_a`/`start_b` (remote start contact closes = run) so an ATS can start it.
- Solver: when `running`, the generator seeds live/neutral (or three-phase) potentials like the grid source does. Find how `source_3phase_440v` and the 1-phase supply are seeded and mirror it. If load exceeds `ratedKva`, trip the set (`overloaded`) after a short delay.
- ATS (`ats_changeover`): it already has normal and generator inputs. Read its current solver logic and ensure: normal live -> load on normal; normal dead and generator live -> transfer after `transferDelaySec`; never both closed; retransfer when normal returns. If any of that is missing, add it.
- Lab: "Standby generator and ATS: simulate a utility outage" with a toggle for the normal supply.

### B5. Update the roadmap bookkeeping
Update the README device-library section for everything added, and list in the final report which spreadsheet rows to mark Done: Off-delay timer, Multifunction/flasher timer, Cartridge/HRC fuse and holder, Fuse-switch disconnector, RCBO, Generator set (1P and 3P), 3-phase kWh meter, Schuko socket.

## Acceptance

- `npm run check:catalog`, `npm run build` and all tests pass.
- Every new device appears in the drawer, renders in all three views (workbench, ladder where relevant, SLD), simulates, and is covered by a lab and a test.
- Old labs behave exactly as before (compare against the baseline results).
- Final report lists clauses left blank for the user to verify.

## Out of scope

Float/pressure switches, DC supply, sensors, pumps, instruments (prompt 04); everything in 05-07.
