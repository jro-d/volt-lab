# 01 — Removals and cleanup

Read `00-start-here-and-conventions.md` first. Branch: `chore/cleanup-before-roadmap`.

## Goal

Remove features and code the project does not need, and fix the bug that the 2-Wire / 3-Wire + PE mode causes, **before** new devices are added. Nothing else.

## Step 0 — Baseline

1. `git status` must be clean (stop and tell the user if not). Create the branch.
2. `npm ci`, `npm run build`, then run each file in `scratch/` with node. Save the output; you will compare at the end.
3. Check the Node version. The scratch tests import `.ts` files directly, which needs Node 22.6+ with type stripping, or `tsx`. Note how they run.

## Step 1 — Remove the conductor "wiring mode" (2-Wire L+N / 3-Wire +PE)

### Why
`handleConnectWire` in `src/App.tsx` auto-adds a neutral (and earth) wire by picking the first terminal where `t.type === 'neutral' || t.id.includes('n')`. The `includes('n')` test matches ids like `in`, `line`, `in_l`, `no_13`, `nc_95`. Checked against the catalog: 28 of 50 devices pick a terminal that is not a neutral. Example: MCB 1P `out` wired to a duplex socket `line` in 2-Wire mode also creates a "neutral" wire from MCB `in` to socket `line`, bypassing the breaker. The earth pick is correct but the feature only helps single-phase circuits and hides the wiring the student is meant to do.

### Do
- `src/types/electrical.ts`: delete `WiringMode`.
- `src/App.tsx`: delete the `wiringMode` state, the `mode` parameter and both `dual_ln` / `triple_lnpe` blocks of `handleConnectWire`, the `bundle_` id generation, and the props passed to `ConductorToolDock` and to both `WiringCanvas` usages (realistic view and dual view).
- `src/components/layout/ConductorToolDock.tsx`: delete `MODE_LABEL`, the three-button pairing control, the mode label in the collapsed summary, and the two props. Check the dock layout still looks balanced.
- `src/components/canvas/WiringCanvas.tsx`: delete the `wiringMode` prop and the extra argument to `onConnectWire`; update the `onConnectWire` type.
- Keep `cableBundleId?` on `ElectricalWire` as an optional field marked `@deprecated` (old saves may contain it). Nothing should generate it any more.
- **Fix `conductorRole`.** Every new wire is currently saved with `conductorRole: 'feed_live'`, even neutral and earth ones. The solver (`wireFlowDirections`, about line 937) and `codeCompliance.ts` (about line 168, switched-neutral check) read this field. Add a small pure helper, for example `inferConductorRole(fromTerminal, toTerminal)` in `src/core/` : either end `earth` -> `earth_ground`; else either end `neutral` -> `return_neutral`; else either end `switched` -> `switched_live`; else either end `traveler` -> `traveler`; else `feed_live`. Use it in `handleConnectWire`. Do not change wire colour logic.

### Check
- `grep -rniE "WiringMode|wiringMode|dual_ln|triple_lnpe|MODE_LABEL"` returns nothing.
- Add a smoke test: wiring MCB `out` to a socket `line` creates exactly one wire with role `feed_live`; wiring a neutral terminal to a neutral terminal gives `return_neutral`; earth gives `earth_ground`.
- Old project JSON that contains `cableBundleId` still loads.

## Step 2 — Remove `motor_3phase_dol` ("3-Phase Induction Motor & Starter")

### Why
Old simplified model. It treats L2/L3 as "live or neutral", has no phase-sequence or single-phasing detection, and its built-in start/stop undercuts the starter labs. No lab uses it. `motor_ac_industrial` (U1/V1/W1/PE, rotation direction, single-phasing) replaces it.

### Do
Find every reference: `grep -rn "motor_3phase_dol\|MotorStarterDevice"`. Expect: `types/electrical.ts`, `defaultComponents.ts`, `DeviceRenderer.tsx`, `MotorStarterDevice.tsx` (delete the file), `ComponentDrawer.tsx` (motors group), `circuitSolver.ts` (about 4 branches, including the `startKey` ternary), `codeCompliance.ts`, `schematicGenerator.ts` if present, `DevicePropertiesPanel.tsx`, `DeviceGallery.tsx`.

**Migration (important).** `projectMigration.ts` currently only receives devices. Extend it to a `migrateLegacyProject(devices, wires)` (keep `migrateLegacyDevices` working) that:
- maps `motor_3phase_dol` -> `motor_ac_industrial`, keeping `id`, `x`, `y`, `rotation`, `state.wattage`; rebuilds terminals and size from the catalog default; resets `state.running`;
- remaps wire endpoints on converted devices: `l1 -> u1`, `l2 -> v1`, `l3 -> w1`, `pe -> pe`;
- is called from **every** load path (find all callers of `migrateLegacyDevices`: JSON import, Save-HTML open, any autosave restore).
Add a smoke test with a hand-made legacy project.

## Step 3 — Remove the generic `junction_box`

It is declared in the types, drawer, renderer and solver but has no catalog entry, so the library never shows it. Remove it from `DeviceType`, `DeviceRenderer.tsx`, `ComponentDrawer.tsx` (line about 56), and the solver branch (about line 218; keep the octagonal and 4-way boxes). Add `junction_box: 'junction_box_octagonal_orange'` to `LEGACY_TYPES`, after checking the two devices' terminal ids match; if they do not, remap as in Step 2.

## Step 4 — `panelboard_frame` (decision gate)

It has only a neutral and an earth bus terminal, duplicating `neutral_busbar` and `earth_busbar`, and no lab or solver code uses it. **Ask the user once** (AskUserQuestion): remove it, or keep it for a future real enclosure that holds breakers. If remove: delete it everywhere, and in migration convert it to a `neutral_busbar` + `earth_busbar` pair, remapping `n_bus` and `pe_bus` wires; if that cannot be done cleanly, drop the device and its wires and show a one-time notice "Removed unsupported device". If keep: do nothing.

## Step 5 — Dead code

Found by `tsc --noUnusedLocals --noUnusedParameters` and `knip`. Delete, then rebuild:

- `src/components/devices/DeviceTerminals.tsx`: unused exports `DeviceTerminals` and `SvgPill` (keep `momentaryPress`; `stopCanvas` is used inside the file, so just un-export it). If the file ends up only exporting `momentaryPress`, leave it.
- `src/components/devices/kit.tsx`: unused `Vents`.
- `src/types/simulation.ts`: delete `SimulationNode`, `CircuitBranch`, `SimulationState`; keep `SparkEvent`.
- Unused exports to un-export or delete after confirming no use: `motorLineAmps` (used inside its file, so just un-export), `buildSeriesParallel`, `nodeToBlocks`, `rungPaths`, `elementRef`, `evaluateLadder` in `ladderEngine.ts` (all used internally, so un-export), `simplifyPath` and `reanchorWaypoints` in `wireRouter.ts` (check; delete if truly unused), `PEC_WIRE_STANDARDS` / `IEC_WIRE_STANDARDS` (un-export), `conductorToken`, and the unused exported types `ViewMode`, `DeviceTerminalsProps`, `DeviceComponentProps`, `TerminalHighlightContextValue`, `TerminalHandlers`, `ElementLiveState`, `SchematicEdge`, `CadStatus` (un-export or delete).
- Unused locals and imports: in `App.tsx` `LAB_LESSONS`, `resetTransientState`, and the import declaration whose names are all unused; in `WiringCanvas.tsx` the `activeWireGauge` prop and the variable `pt`; `Mono` in `PushButtonStationDevice.tsx`; `Face` in `SpdDevice.tsx`; `Sparkles` in `CodeInspectorHUD.tsx`; `Gauge` in `DevicePropertiesPanel.tsx`; `dy` in `wireRouter.ts`; `ElectricalDevice` and `ElectricalWire` imports in `labTemplates.ts`.
- `npm uninstall clsx tailwind-merge` (grep first to confirm there is no `cn()` helper or other use).
- `tsconfig.json`: set `noUnusedLocals` and `noUnusedParameters` to `true`; fix whatever remains by deleting the code or prefixing an intentionally unused parameter with `_`.

## Step 6 — Build artifact out of git

`VoltLab-Standalone.html` (about 780 KB) is committed, so every rebuild bloats history. `git rm --cached VoltLab-Standalone.html`, add it to `.gitignore`, and make sure `npm run build:standalone` still writes it. Do not touch `.github/workflows/deploy.yml` and do not rewrite history; mention in the report that old blobs stay in history. (The rename prompt changes the file name later.)

## Step 7 (optional, do it unless the user objects) — Make the smoke tests real

Move `scratch/test_*.mjs` to `tests/`, remove `scratch/` from nothing else (leave `.gitignore`'s `scratch/` line), add `"test": "node tests/run-all.mjs"` or equivalent (use `tsx` as a devDependency if Node cannot run them natively). Make failing assertions exit non-zero. Do not change what they test except where Steps 1-3 require it.

## Final verification

1. `npm run build` passes; every test passes or is unchanged from baseline.
2. `npm run dev`: open every lab from the lab selector, press Simulate, confirm no console errors and the same energized/tripped results as baseline for the labs that existed.
3. Open the library drawer: no orphan types, no missing devices.
4. Load an old project JSON (one containing `motor_3phase_dol` and `cableBundleId` wires) and confirm it opens.
5. Final report as in the conventions file.

## Out of scope

Renaming the project, adding devices or features, refactoring `circuitSolver.ts`, touching `deploy.yml`.
