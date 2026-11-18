# 04 — Roadmap phase 2: the rest of the priority devices

Read `00-start-here-and-conventions.md` first. Run after prompt 03 is merged. Branch: `feat/roadmap-phase2`. Follow the 12-point checklist for each device and keep `npm run check:catalog` green.

Do the work in the order below. Commit after each numbered item.

## 1. Level and pressure control (pump HOA lab)

Devices:
- `float_switch` (IEC 60947-5-1 style): properties `level` (0-100 slider acts as the tank level for this device), `highTrip` (70), `lowTrip` (30), `contactForm: 'NO_on_rise' | 'NC_on_rise'`. Terminals `com`, `no`, `nc`. Contacts change at the trip levels with hysteresis.
- `pressure_switch`: properties `pressure` (bar slider), `cutIn`, `cutOut`, hysteresis band; terminals `com`, `no`, `nc`.
- `pump_booster_1p` and `pump_booster_3p`: use the existing `motor_ac_industrial` renderer style; properties `kw`, `pumping: boolean`. A running pump **raises** a linked tank level or pressure at a rate and the load drains it, so the loop closes without the student toggling sliders. Implement this as a tiny process model: one shared `process` object per project (`tankLevel`, `lineBar`) updated each tick from pump state and a `drawOffLpm` slider on a new small "Tank" accessory or on the inspector of the float switch. Keep it explicit and documented; do not build a general fluid simulator.
- Lab: "Automatic pump control with HOA: float switch, overload, run lamp" (uses `selector_hoa`, `contactor_3p`, `thermal_overload_relay`, `control_transformer`). Provide a reference ladder.

## 2. Phase-failure / phase-sequence relay

Type `phase_monitor_relay` (IEC 60255 style). Terminals `l1`, `l2`, `l3` (sense), `a1`/`a2` (supply), `15`/`16`/`18` (changeover output). Behaviour: output contact energizes only when all three phases are present, sequence is L1-L2-L3, and voltage is within `±underOverPct` (default 10%) of nominal. The solver already tracks phase identity and single-phasing for motors (`nodePhases`, `motorFault`); reuse it. Faults it must catch: lost phase, swapped phases, undervoltage. Lab: "DOL starter protected by a phase monitor: swap two phases and watch the starter refuse to run". Add to the motor-circuit code check: a note (info level, not error) if a motor has no phase protection.

## 3. 24 V DC and 3-wire sensors

This touches the solver's core, so **propose, then confirm** (AskUserQuestion, options below), then implement.

Design question: the solver labels node potentials `'live' | 'neutral'` with phase identities. DC needs two new potentials, e.g. `'dc_pos'` and `'dc_neg'`. Read `circuitSolver.ts` fully and propose a design in at most one page: how DC nets are seeded, how mixed AC/DC wiring is detected as a fault (AC and DC nets must never connect; show a clear error), and how DC loads are traced. Offer two options: (a) add DC potentials alongside AC, (b) model DC only inside a "control power domain" device (power supply + sensors + PLC I/O) with no cross-wiring to AC nets. Recommend (b) as simpler unless you find a reason not to.

Devices:
- `psu_24vdc` (IEC 61204 style): input `in_l`, `in_n`, `pe`; output `v_pos`, `v_neg`; `ratedAmps` (2.5, 5, 10); current-limit shutdown with a recovery after a few simulated seconds.
- `sensor_inductive`, `sensor_capacitive`, `sensor_photoelectric` (IEC 60947-5-2): three-wire `brown (+24V)`, `blue (0V)`, `black (signal)`; property `output: 'PNP' | 'NPN'`, `contact: 'NO' | 'NC'`, `detected` (click-to-toggle on the face to simulate a target), `rangeMm`. Wrong wiring (reversed supply, NPN into a PNP input) must produce a visible fault note instead of silently working.
- Upgrade `plc_micro_controller` or add `plc_24vdc_16io`: 24 V DC supply and sourcing/sinking inputs I0.0-I0.7, transistor outputs Q0.0-Q0.7, a `RUN/STOP` toggle. Do not write the PLC program editor here (prompt 06); give it a fixed demo behaviour via a property `program: 'passthrough' | 'start_stop_latch'` for the lab.
- Lab: "Conveyor stop: inductive sensor into PLC input, relay output to a contactor".

## 4. Annunciation

`buzzer_horn` (24 V DC or 230 V AC, property `supply`), `beacon` (steady / flashing property, colour property), `tower_light` (three stacked segments red/amber/green, each its own terminals). They are loads: lit or sounding when powered. Reuse `soundFx.ts` for the buzzer (muted by the existing sound toggle). Lab: "Overload alarm: thermal overload NC contact drives a beacon and horn".

## 5. Single-phase motors

Types `motor_1p_split_phase`, `motor_1p_capacitor_start`, `motor_1p_psc` as **one** renderer with `motorKind` property if the visuals are close (recommended; one type `motor_1p` with `motorKind: 'split_phase' | 'capacitor_start' | 'psc'`). Terminals: main `u1`/`u2`, auxiliary `z1`/`z2`, `pe`, plus an external run capacitor device `capacitor_run` (µF property, voltage rating) wired by the student. Behaviour: start winding is engaged until 75% speed (centrifugal switch for split_phase and capacitor_start; the switch is a visible element). Faults to model and flag: capacitor missing or open -> motor hums and does not start (`motorFault: 'no start capacitor'`); wrong capacitor value -> high current. Reversal by swapping the auxiliary winding leads. Lab: "Capacitor-start motor: wiring the starting capacitor and reversing rotation".

## 6. Test instruments (extends the existing DMM)

First find how the digital multimeter and clamp meter work now (`grep -rn "DMM\|probe" src`). Add instruments **as tools, not as workbench devices**, following the same interaction model:
- Insulation resistance tester (megger): choose 250 / 500 / 1000 V; click two terminals or a terminal and PE with the circuit de-energized; result in MΩ from the wire/device model (default high; the lab "damaged insulation" sets a device property `insulationMOhm`). Refuse and warn if the circuit is energized.
- Earth resistance tester: reads a `ground_pit` device; value comes from the ground pit's `earthOhms` property (add it if missing; default 5 Ω; add a code rule: warn above the limit used elsewhere in the project, or cite none if you cannot verify it).
- Phase rotation meter: click L1, L2, L3 sources in turn; shows CW / CCW.
- Continuity buzzer: de-energized only; beeps on a closed path using the existing connectivity graph.
Provide a "Test instruments" panel next to the DMM. Add one lab: "Dead-testing a 3-phase motor circuit before energizing". Do **not** build the formal dead-test sequence or lockout/tagout gate here; that is prompt 07.

## Acceptance

- `npm run check:catalog`, build and tests pass; old labs unchanged against baseline.
- Each item has a lab and a test. DC and AC nets cannot be silently mixed.
- README device-library and instruments sections updated. Final report lists spreadsheet rows to mark Done: Float switch, Pressure switch, Pressure/booster pump, Phase-failure relay, 24 V DC supply, Inductive/Capacitive/Photoelectric sensors, Buzzer, Beacon, Tower light, Split-phase / Capacitor-start / PSC motors, Insulation tester, Earth tester, Phase rotation meter, Continuity tester.
