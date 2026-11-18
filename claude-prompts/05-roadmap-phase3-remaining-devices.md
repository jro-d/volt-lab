# 05 — Roadmap phase 3: all remaining devices, in batches

Read `00-start-here-and-conventions.md` first. Run after prompt 04 is merged. Branch per batch: `feat/devices-batch-3-N`. One batch per Claude Code session; each ends with build, `check:catalog`, tests, and a README/spreadsheet update.

## How to keep this from becoming sprawl

The list below is about 85 items. Do **not** create 85 renderers. Apply these merges (decided already; do not re-ask):

| Cluster | Implement as |
|---|---|
| Lamps: LED, fluorescent with ballast/starter, CFL, halogen | `light_bulb` + property `lampType` (wattage, power factor, inrush, flicker note on the fluorescent starter) |
| Appliances: range, refrigerator, washing machine, rice cooker, microwave, EV charger | `appliance_generic` + `applianceKind` presets (wattage, PF, cycling behaviour); keep existing TV, water heater, fan, AC as they are |
| Outlets: aircon, range, weatherproof, universal | `socket_duplex` / `socket_schuko` + `outletType` / `ratedAmps` |
| Operators: illuminated push button, key selector, 2-position selector, foot switch, pendant | variants of `push_button_station` and `selector_hoa` via `operatorKind` (keep one new renderer per distinct silhouette only) |
| Start methods: autotransformer, primary resistor, part-winding | one `starter_reduced_voltage` device with `method` and a method-specific terminal set |
| Terminal blocks and distribution block | one `terminal_block` with `kind: 'feedthrough' | 'fused' | 'pe'` and a `poles` count |
| PV chain | four separate devices (string, DC isolator, grid-tie inverter, net meter), they genuinely differ |

For every device: follow the 12-point checklist; keep `check:catalog` green; reuse `tripCurves.ts` (prompt 03) for anything with an inverse-time characteristic; no manufacturer names; do not fabricate code clauses.

## Batch 3.1 — Protection and metering

| Device | Key behaviour to model |
|---|---|
| RCCB 4P (`rcd_4p`) | leakage trip on three-phase + N; 30/100/300 mA, selectable; test button |
| GFCI receptacle | line/load terminals; TEST/RESET; downstream sockets on LOAD are protected; PEC GFCI rule must accept it |
| AFDD / AFCI | trips on series arcing: a `looseTerminal` property on any device raises arc events; AFDD trips on them, MCB does not |
| MCCB 3P adjustable | `Ir` thermal dial (0.4-1.0 x In), `Im` magnetic dial (2-10 x Ir), uses `tripCurves`; optional shunt trip coil |
| MPCB | combined thermal-magnetic motor starter protector; replaces MCB + overload in a DOL lab |
| Fused knife switch, rotary isolator (lockable) | isolating devices; lock icon blocks closing (used later by lockout/tagout) |
| Under/over-voltage relay, earth-leakage relay + core-balance CT | adjustable thresholds and delay; contact output |
| Shunt trip / undervoltage release | accessory that trips a breaker from a control signal |
| PTC thermistor relay | motor winding temperature input from `IndustrialMotorDevice` heating model; add a simple motor temperature rise model if none exists |
| CT + ammeter, voltmeter + selector switch | CT ratio property, **open secondary warning** when the CT secondary is open while primary carries current |
| Terminal blocks, distribution block | bond groups via `spliceGroup`; visual wire-numbering ferrules |

## Batch 3.2 — Sources and power systems

| Device | Key behaviour |
|---|---|
| Manual transfer switch | break-before-make, mechanical interlock |
| UPS / battery + charger | battery state of charge, autonomy time; static transfer on loss of input |
| PV string, DC isolator, grid-tie inverter, net meter | needs the DC domain from prompt 04; inverter anti-islanding (shuts down when the grid is lost); net meter shows import/export kWh |
| Distribution transformers: 1P pole type, 3P delta-wye | turns ratio, vector group label, secondary derived from primary; unloaded and loaded voltage |
| Capacitor bank + PF controller + capacitor-duty contactor | step switching to hit a target power factor; power triangle uses existing `panel_meter` data |
| Shore connection box with phase-sequence indicator | marine; wrong sequence lamp |
| Ground-detection lamps / insulation monitor | ungrounded 440 V system: first earth fault shows on the lamps without tripping |
| Synchroscope + sync lamps, reverse-power relay | needs two generators from prompt 03; show phase angle difference; close permissive when in sync |
| Preferential trip relay | sheds non-essential feeders at generator overload |

## Batch 3.3 — Control and timing

| Device | Key behaviour |
|---|---|
| Star-delta timer with transition pause | star time, pause ~50-100 ms, then delta; outputs `star`, `delta` |
| Counter relay | counts coil pulses to a preset, output latches, reset coil |
| Latching / impulse relay | each pulse toggles; multi-point lighting lab |
| Staircase timer | timed light, re-triggerable |
| 24-hour time switch | on/off schedule against a simulated clock with a speed control |
| Alternating relay | duplex pump lead/lag each start |
| Solid-state relay | AC output, no contact bounce, small leakage current through the output when "off" (teachable) |
| Operators (see merge table) | illuminated PB lamp tied to its own coil terminals |
| Add-on auxiliary contact block, mechanical interlock | extends a contactor's contacts; interlock blocks both coils from closing |
| Safety relay, two-hand station | dual-channel, monitored start; two-hand needs both pressed within 0.5 s |
| Door interlock switch, pull-cord switch | NC safety contacts, latching pull-cord |

## Batch 3.4 — Sensors and field devices

Electrode level relay, thermostat, temperature controller + thermocouple (setpoint, hysteresis, relay output), reed switch (needs a movable target: add a `position` slider), photocell, PIR occupancy sensor (timer), flow switch, zero-speed switch (reads motor speed), solenoid valve (coil + `open` state), smoke detector + manual pull station + fire alarm bell (a simple conventional alarm loop: detector or pull station closes the loop -> panel relay -> bell).

## Batch 3.5 — Motors, starters, drives

Soft starter (ramped voltage, bypass contactor at end of ramp, inrush plot), reduced-voltage starter (see merge table), Dahlander two-speed motor (low/high contactor logic, mutual interlock), wound-rotor motor + rotor resistors (stepped acceleration with timers), DC shunt motor + starter (field and armature; field loss -> overspeed warning), brake motor and DC injection braking module, VFD accessories (speed potentiometer wired to the existing `vfd_drive`, braking resistor, line reactor), submersible pump, air compressor (uses the pressure switch from prompt 04), hoist and conveyor section (limit switches stop travel; the load position is a slider-driven property).

## Batch 3.6 — Residential and commercial loads

Implement via the merge table. Add the dedicated-circuit and demand notes that already exist for the AC (PEC Art. 4.40 text in the project) as a pattern: one code-note per appliance only where you are certain of the rule. Emergency light and exit sign: **unswitched** supply rule (flag a wall switch in their feed). Ceiling fan with speed regulator: regulator is a series device; doorbell with transformer: 230 V -> 8-24 V secondary with a push button. Power strip: the "octopus overload" lab drives a 16 A cord past its rating and shows the cord/overload warning. EV charger: dedicated circuit, 7 kW (230 V) and a GFCI/RCD requirement note you are sure of, otherwise leave it as info.

## Batch 3.7 — Automation

Larger PLC with 24 V DC I/O (16 in / 16 out) once prompt 06 gives the PLC a program editor, so **do this batch after prompt 06**; analog I/O module (4-20 mA, 0-10 V, scaling shown), HMI panel (soft buttons and lamps bound to PLC addresses), smart relay with function blocks (small LOGO-style editor reusing the PLC program model), 5/2 solenoid valve and double-acting cylinder with reed switches (end positions feed back to sensors; needs the process model idea from prompt 04: keep it as a simple position state machine).

## Per-batch acceptance

- Build, `check:catalog`, tests green; baseline labs unchanged.
- Each device: catalog, renderer, drawer, solver, code rule (if any), inspector, SLD symbol, gallery, one lab or a shared lab for the batch, one test.
- README and spreadsheet rows updated. Final report states which behaviours were simplified and which code clauses still need the user's verification.
