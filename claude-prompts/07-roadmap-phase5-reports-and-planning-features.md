# 07 — Roadmap phase 5: reports, planning, exports, offline

Read `00-start-here-and-conventions.md` first. Run after prompt 06. Branch per feature. These features read the project and produce documents or planning views; none should change solver results.

Common rules: Philippine defaults (PHP currency, PEC 2017, 60 Hz) with IEC as the alternate; every standards value you add to `standardsData.ts` that you cannot verify gets a `needsVerification: true` flag and a line in the final report; exports must work offline (no network calls); printing uses a dedicated print stylesheet, not screenshots.

## 1. Load schedule and panel schedule generator

- Read all load devices and the breaker feeding each (trace from load back to the nearest protective device and the panel it sits in; reuse the solver's connectivity graph).
- Table columns: circuit no., description, load type, watts, power factor, VA, amps at system voltage, demand factor, demand VA, breaker rating and curve, conductor gauge and length, voltage drop %, phase assignment (L1/L2/L3 for three-phase panels), notes.
- Phase balance summary and total demand with a suggested main breaker and feeder size from available gauges.
- **Demand factors are data, not code:** put them in `standardsData.ts` as a table keyed by load type with the source clause as text; leave values you cannot verify empty so the user fills them in, and show "set demand factors" in the UI when blank.
- Export CSV and a print view (A4, title block with project name, name and section fields from prompt 07 item 3).
- Test: the "Complete Residential Installation" master lab produces a schedule whose totals equal the solver's `totalWatts`.

## 2. Bill of materials with prices

- Derive the BOM from devices (by type and rating), conductors (by gauge, summing `lengthMeters`, with a waste percentage setting), and optional conduit and box allowances.
- Editable unit price table stored in the project JSON under `bom.prices` (PHP default). Totals, subtotal by category, contingency %, VAT % settings.
- Export CSV and printable view. No catalog prices are bundled; the user types them.

## 3. Graded lab mode

- Each lab can define a **target**: required devices, required connections (device-terminal pairs, order independent), required ladder (the project already has `targetLadder`), and required code-inspector result (no errors).
- A "Check my work" action compares and returns a checklist with partial credit, never revealing hidden faults or full solutions unless the lab setting `showSolution` is on.
- Student header fields: name, course, section (persisted locally and printed on the report). Do not hard-code anyone's identity.
- Report: printable A4 with the checklist, score, compliance summary, schematic snapshot (SVG from the SLD view), and timestamp. Export JSON of the result for a teacher to collect.
- Start with the six motor-control labs and the staircase lighting lab as graded examples.

## 4. Dead-test sequence and lockout/tagout

- A "Safe isolation" workflow in a side panel, optionally required before Simulate (setting: Off / Prompt / Required, default Off).
- Steps as a state machine: identify source -> isolate -> lock and tag (uses lockable devices from prompt 05: rotary isolator, knife switch) -> prove tester on a known live source -> test dead on the work circuit -> prove tester again -> proceed with tests (insulation, continuity, polarity from prompt 04) -> remove lock -> energize.
- Skipping a step in Required mode blocks Simulate with a message naming the step; in Prompt mode it warns once.
- Add the sequence to the report from item 3. Cite no regulation clause unless you are certain; otherwise describe the steps generically.

## 5. Floor-plan view (MVP only)

- New view "Plan": draw rooms as rectangles with a scale (metres), place symbols for lights, switches, sockets, panels, and appliances from a symbol palette. Each symbol is linked to a device in the project (create it or link an existing one).
- Home runs: draw straight or orthogonal lines to the panel; their lengths feed `lengthMeters` of the corresponding wires so voltage drop uses plan length.
- Out of scope for this pass: auto-routing, multiple floors, DXF/PDF import, auto-generating the workbench wiring. Say so in the UI.

## 6. Energy and billing

- Integrate kWh over simulated time using the solver's power per device; time scale control (1x, 60x, 3600x) so a day can be simulated in seconds.
- Tariff settings (PHP/kWh, optional tiers) editable and stored in the project; monthly cost estimate; per-device energy ranking; power triangle (P, Q, S, PF) on the main meter.
- Export CSV of the energy ledger.

## 7. Wire numbering and terminal-strip export

- Auto-number wires (editable prefix and scheme: from-to, sequential, per-circuit), write the label into `ElectricalWire.label`, show ferrule tags on the workbench and SLD.
- Terminal-strip diagram: for each `terminal_block`, a table and drawing of terminal number, incoming wire, outgoing wire, destination device and terminal.
- Export SVG and printable PDF-ready view with an editable title block (project, drawn by, checked by, date, sheet).

## 8. Share link and offline install

- **Share link:** compress the project JSON (use the built-in `CompressionStream` where available, with a small dependency-free fallback) and put it in the URL hash. Warn when the link exceeds about 8,000 characters and offer "Export JSON" instead. Importing a link goes through the same migration code as file import.
- **Installable offline app:** add a web manifest and a service worker (use `vite-plugin-pwa` if it fits the existing config; keep `build:standalone` working). Cache the app shell; no project data leaves the device. Verify the `base` path from the rename prompt so the service worker scope is correct on GitHub Pages.

## Acceptance

- Build and tests green; solver results unchanged against the baseline; all new exports open offline.
- Each feature has a short README section and a spreadsheet status update.
- The final report lists every value flagged `needsVerification`, every simplification, and anything the user must test by hand (print layouts on A4, the PWA install on a phone).
