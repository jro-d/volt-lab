# 00 — Start here: run order and project conventions

Give this file to Claude Code **together with** whichever numbered prompt you are running. Every other prompt in this folder assumes you have read it.

## Run order (one prompt per Claude Code session, one git branch per prompt)

| Order | File | Why it goes here |
|---|---|---|
| 1 | `01-removals-and-cleanup.md` | Removes the buggy wire-mode feature, redundant devices and dead code first, so new work does not build on them |
| 2 | `02-rename-to-wirewise.md` | Fewer files to touch once the cleanup is done; do it before new code adds more "VoltLab" strings |
| 3 | `03-roadmap-phase1-foundation-and-first-devices.md` | Safety net (catalog consistency check) plus the first devices |
| 4 | `04-roadmap-phase2-priority-devices.md` | Rest of the high-priority devices (sensors, DC, pumps, instruments) |
| 5 | `05-roadmap-phase3-remaining-devices.md` | Everything else in the component list, in batches |
| 6 | `06-roadmap-phase4-simulation-features.md` | Troubleshooting mode, timing diagrams, PLC editor, curves, short-circuit check |
| 7 | `07-roadmap-phase5-reports-and-planning-features.md` | Load schedule, BOM, graded labs, dead-test, floor plan, billing, exports, PWA |

The full component and feature list lives in the spreadsheet "VoltLab Device & Feature Roadmap" (Components / Features / Catalog Fixes tabs): https://claude.ai/artifact/5fXfxwGJH4gc7HWb1SP9mL . Claude Code cannot read it, so each prompt repeats what it needs. Update statuses in the sheet as you finish things.

## Project facts (verified from the code, November 2026)

- Stack: React 19, TypeScript 5.7, Vite 6, Tailwind 3. No test framework. `npm run build` = `tsc && vite build`.
- Entry: `src/main.tsx` -> `src/App.tsx` (about 1,400 lines, root state and handlers).
- Core logic in `src/core/`: `circuitSolver.ts` (about 1,240 lines, all device behaviour lives here as `dev.type === ...` branches), `codeCompliance.ts` (PEC 2017 / IEC 60364 rules), `ladderEngine.ts`, `schematicGenerator.ts`, `wireRouter.ts`.
- Data in `src/data/`: `defaultComponents.ts` (`COMPONENT_CATALOG`, `createDeviceFromCatalog`), `labTemplates.ts`, `motorControlLabs.ts`, `standardsData.ts`.
- UI: `src/components/devices/*Device.tsx` (SVG devices built from primitives in `kit.tsx`), `DeviceRenderer.tsx` (type -> component switch), `layout/ComponentDrawer.tsx` (library groups), `layout/DevicePropertiesPanel.tsx` (inspector, about 1,500 lines), `canvas/WiringCanvas.tsx`, `LadderCanvas.tsx`, `SchematicCanvas.tsx`.
- Types: `src/types/electrical.ts` (`DeviceType` union, `ElectricalDevice`, `ElectricalWire`, `ElectricalProject`), `ladder.ts`, `simulation.ts`.
- `docs/`, `scratch/`, `.claude/` are git-ignored. `scratch/test_*.mjs` are smoke tests run with node against the TypeScript sources.
- Saved projects: JSON export/import and "Save HTML". Older saves are upgraded by `src/utils/projectMigration.ts`. **Never break loading of old saves.**

## Rules that apply to every prompt

1. **Verify before trusting.** Line numbers and counts in these prompts come from a read-through and may be stale. `grep` first, then edit.
2. **Work on a branch** named in the prompt. Commit after each numbered step with a clear message. Do not push. Do not rewrite git history.
3. **Baseline first.** Before changing anything run `npm ci`, `npm run build`, and every `scratch/test_*.mjs`; record the results. After each step the build and tests must be at least as green as the baseline.
4. **Brand-neutral devices only.** Every device is a generic model of a standard device. Set `productStandard` (for example `IEC 60269-1`) and a generic `modelNumber`. No manufacturer names anywhere.
5. **Do not invent code citations.** Fill `pecReference` / rule text only with PEC 2017 or IEC 60364 clauses you are certain of. Otherwise leave it undefined and list it under "needs the user to verify" in your final report.
6. **Ask before big design forks.** If a prompt says "propose, then confirm", use AskUserQuestion once with 2-3 options. Do not ask about things the prompt already decides.
7. **No scope creep.** Do not refactor unrelated code, reformat files, or rename things not listed.
8. **Final report** (at most 25 lines): what changed, files added and removed, anything skipped and why, anything the user must verify by hand.

## Terminal and naming conventions for new devices

- Terminal ids: lowercase snake_case. Protection devices follow the RCD pattern `in_l`, `in_n`, `out_l`, `out_n`, `pe`. Multi-pole devices use `in_1 ... out_1 ...` like `mcb_2p` / `mcb_3p`. Contactors and relays keep IEC labels: coil `a1`/`a2`, NO `13`/`14`, NC `21`/`22`, three-pole power `1/L1 ... 6/T3`.
- `label` on a terminal is what is drawn; `name` is the long description shown on hover.
- `TerminalType` values already available: `phase`, `phase2`, `phase3`, `neutral`, `earth`, `switched`, `load`, `common`, `traveler`, `splice`, `coil`, `no`, `nc`, `input`, `output`. Add a new `TerminalType` or `phaseLabel` only if none fits, and update `schematicGenerator.ts` for it.
- Device `state` is a loose bag (`[key: string]: any`). Put every new runtime field in `defaultProperties` in the catalog so it has a default.
- Prefer **one device type with a variant property** over many near-identical types (for example `lampType`, `outletType`, `timerMode`, `applianceKind`). Fewer renderers, fewer solver branches, less to maintain.

## The device-addition checklist (every new device must touch all of these)

1. `src/types/electrical.ts`: add to the `DeviceType` union (and `DeviceCategory` if new).
2. `src/data/defaultComponents.ts`: add a `COMPONENT_CATALOG` entry: `type`, `category`, `name`, `productStandard`, `modelNumber`, `description`, `width`/`height`, `defaultProperties`, `terminals` (relX/relY are 0..1).
3. `src/components/devices/<Name>Device.tsx`: SVG component using `kit.tsx` primitives; register it in the `DeviceRenderer.tsx` switch. Match the visual language of the nearest existing device (open its file and copy the structure).
4. `src/components/layout/ComponentDrawer.tsx`: put the type in the right group. The drawer logs "orphans" (catalog types in no group); there must be none.
5. `src/core/circuitSolver.ts`: behaviour: energized state, load or trip logic, current tracing, wire-flow effects. Mirror how the nearest existing device is handled.
6. `src/core/codeCompliance.ts`: any rule the device triggers or satisfies (for example "RCBO counts as RCD protection for sockets").
7. `src/components/layout/DevicePropertiesPanel.tsx`: inspector controls and datasheet card.
8. `src/core/schematicGenerator.ts` + `SchematicCanvas.tsx`: IEC 60617 / IEEE symbol. `ladderEngine.ts` if the device has contacts or coils that belong in a ladder.
9. `src/dev/DeviceGallery.tsx`: it should list the new device (dev only: `/?gallery`).
10. One lab in `labTemplates.ts` or `motorControlLabs.ts` that uses it, with a reference ladder if it is control logic.
11. A smoke test in `scratch/` (or `tests/` after prompt 01) that solves the lab and asserts the key behaviour.
12. README "Device library" section and the roadmap spreadsheet status.

When a prompt says "follow the checklist", it means all twelve.
