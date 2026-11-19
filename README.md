# WireWise — Interactive Electrical Installation & Motor Control Simulator
*WireWise (formerly VoltLab)*

**Physical Wiring Workbench • Ladder Logic • Single-Line Diagrams (SLD) • PEC 2017 & IEC 60364 Code Inspector**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)

---

## ⚡ Overview
**WireWise** is a browser-based electrical installation workbench, circuit solver and motor-control trainer for electrical engineering students, electricians and automation technicians. It connects what you wire by hand to the diagrams you study: every conductor you route on the workbench is solved live, audited against the Philippine Electrical Code or IEC 60364, and redrawn as a ladder diagram and a single-line diagram.

Place distribution and control equipment, route conductors with clean 90° paths, operate switches and momentary push buttons, then press **▶ Simulate** to energize the grid and watch breakers trip on short circuits and overloads, RCDs trip on 30 mA leakage, contactors seal in, and three-phase motors spin forward or reverse.

### Brand-neutral standard devices
Every device in WireWise is a **generic model of a standard device**, not a particular manufacturer's product. Each one is described by the product standard it follows (for example *IEC 60898-1* miniature breakers, *IEC 60947-4-1* contactors and overload relays, *IEC 60669-1* wall switches) and a generic catalogue designation, shown in the device inspector's datasheet card. Projects saved by older versions that used branded device types or model numbers are upgraded automatically when imported.

---

## 🚀 Key Capabilities

### 1. Four synchronized views
Switch views from the ribbon: **Realistic | Dual View | Ladder Logic | SLD Schematic**.
- **Realistic workbench**: front-elevation vector drawings of each device (screw terminals, DIN clips, levers, trip flags, nameplates, enclosures) in one consistent device language, with **light and dark themes** (saved per browser).
- **Ladder Logic**: the wired control circuit parsed into a live two-rail ladder diagram (see §4).
- **SLD / Engineering Schematic**: the physical wiring redrawn with IEC 60617 / IEEE symbols, with pan and cursor-anchored zoom.
- **Dual View**: the workbench beside the live ladder or the SLD; hovering a ladder symbol glows the matching device.

### 2. Dual code compliance engines (PEC vs. IEC)
- **🇵🇭 Philippine Electrical Code (PEC 2017)**: 60 Hz; 230 V single-phase, 220 V / 440 V three-phase; AWG with metric mm² (14 AWG / 2.0 mm², 12 AWG / 3.5 mm², 10 AWG / 5.5 mm², 8 AWG / 8.0 mm²); PEC colour scheme; overcurrent rules per PEC Table 3.10.2.6 and 2.40.1.4(D).
- **🌐 IEC 60364**: 50 Hz; 230 V / 400 V; metric conductors (1.5 – 10 mm²); Brown L1, Black L2, Grey L3, Blue N, Green/Yellow PE.
- Switching standards keeps a 440 V three-phase project at its feeder voltage.

### 3. Device library
- **Service entrance & grounding**: digital kWh meter (1-phase and **3-phase**, energy per phase over simulated time), 1-phase and 3-phase **generating sets** (start / stop, 3 s start delay, remote-start input, overload trip), 2P service disconnect, ground pit and earth rod, earth and neutral busbars, surge protective device (Type 2).
- **Panelboards & breakers**: 1P / 2P / 3P MCBs with two form factors — **Bolt-On (UL 489 style)** and **DIN-Rail (IEC 60898-1)** — 30 mA RCD, **RCBO 1P+N** (breaker + 30 mA RCD in one device), **fuse holder 1P** and **3-pole fuse switch disconnector** (gG / aM links, replaceable), 2P enclosed safety breaker (ACU disconnect), automatic transfer switch with a transfer delay, DIN rail, digital panel meter.
- **Residential wiring devices (PEC)**: 1-gang / 2-gang / 3-gang switches, 3-way and 4-way switches, rotary dimmer, duplex and Schuko receptacles, wide-series combo plate (switch + pilot + outlet) with front / rear wiring view.
- **Boxes & splices**: PVC utility box, octagonal junction boxes, 4-way junction box, twist-on wire nut, lever-clamp splice connector.
- **Motor control**: 440 V three-phase feeder, 440/220 V control transformer, 3-pole AC-3 contactor (13-14 NO and 21-22 NC auxiliaries, **X-ray cutaway**), Class 10 thermal overload relay (dial, TEST, RESET, 95-96 / 97-98), timer relay (on-delay, off-delay, flasher and one-shot), DPDT control relay, Start/Stop, FWD/REV/STOP and E-stop stations, HOA selector, roller limit switch, 22 mm pilot lights.
- **Motors & drives**: TEFC 3-phase induction motor with CW / CCW rotation badge, 6-lead Wye-Delta motor, VFD, micro PLC (4 inputs, 4 relay outputs).
- **Protection & metering (batch 3.1)**: RCCB 4P (30 / 100 / 300 mA, test button), GFCI receptacle (LINE / LOAD, TEST / RESET), AFDD (trips on a loose terminal that an ordinary MCB cannot see), adjustable MCCB 3P (Ir 0.4-1.0 × In, Im 2-10 × Ir, optional shunt trip and undervoltage release, thermal element on the `tripCurves` table), MPCB (class 10 overload plus fixed magnetic, replaces MCB + overload relay), lockable rotary isolator (a padlock blocks closing), under/over-voltage relay (thresholds and delay), earth-leakage relay with core-balance CT, PTC thermistor relay (reads a simple motor winding-temperature model), measuring CT with panel ammeter (open-secondary warning), voltmeter with phase selector, terminal block (feed-through / fused / PE, 4 poles) and a power distribution block. The existing fuse switch disconnector serves as the fused knife switch. Any device can be given an earth-leakage fault current and a loose terminal in the inspector.
- **Process control**: float switch (high / low trip with hysteresis, NO / NC on rise), pressure switch (cut-in / cut-out), and 1-phase / 3-phase booster pumps that raise a shared tank level or line pressure (a small documented process model, not a fluid simulator).
- **Phase monitoring**: phase failure / phase sequence relay (lost phase, swapped phases, under / overvoltage release the 15-18 output).
- **24 V DC control domain**: DIN-rail 24 V supply with current-limit shutdown and automatic restart, three-wire inductive, capacitive and photoelectric sensors (PNP / NPN, NO / NC, click the sensing face to place a target), a 24 V DC PLC (8 inputs, 8 sourcing outputs, RUN / STOP, passthrough or start / stop demo program) and a 24 V DC coil option on the control relay. The DC side is solved separately from AC: wiring a 24 V net to an AC line or neutral shuts the supply down and is reported as an error; NPN sensors on PNP inputs and reversed sensor supplies show a visible fault note.
- **Annunciation**: panel buzzer / horn (audible, mutable), signal beacon (steady or flashing, selectable colour) and a three-segment red / amber / green tower light; each runs from 24 V DC or 230 V AC.
- **Single-phase motors**: one motor with split-phase, capacitor-start and PSC variants (main U1-U2 and start winding Z1-Z2, visible centrifugal switch that opens at 75 % speed, reversal by swapping the start winding leads) and a separate motor capacitor wired in series with the start winding. A missing or open capacitor leaves the motor humming (no start capacitor), a wrong value is flagged with a high running current.
- **Sources & power systems (batch 3.2)**: manual transfer switch (I-0-II, break-before-make), UPS with battery and charger (state of charge, autonomy, static transfer), PV string + DC isolator + grid-tie inverter (anti-islanding, 5 s reconnect) + net meter (import / export kWh), 1-phase pole and 3-phase delta-wye distribution transformers (turns ratio, vector group label, loaded and unloaded voltage), capacitor bank (4 steps, capacitor-duty contactors built in, 3 s discharge lock) with a power factor controller, shore connection box with phase-sequence lamps, ground detection lamps for an isolated (IT) 440 V feeder, synchroscope with sync lamps, reverse-power relay and preferential trip relay.
- **Control & timing (batch 3.3)**: star-delta timer with a transition pause, counter relay (preset, latching output, reset coil), latching (impulse) relay, re-triggerable staircase timer, 24-hour time switch with a simulated clock and speed control, alternating relay for duplex pumps, solid-state relay, a control operator (illuminated push button, key selector, 2-position selector, foot switch with guard, pendant) with its lamp on its own terminals, auxiliary contact block, mechanical interlock between two contactors, dual-channel safety relay with monitored start, two-hand station, door interlock switch and latching pull-cord switch.
- **Sensors & field devices (batch 3.4)**: electrode level relay (min / max probes on the shared tank, fill or drain), thermostat and a type K thermocouple with a temperature controller (setpoint, hysteresis, sensor-break fail-safe; each sensor warms with a heater you link to it), reed switch with a magnet-position slider, photocell dusk switch with hysteresis, PIR occupancy sensor with hold time and daylight lock, flow switch, zero-speed switch (coast-down estimate from the motor you name), 2/2 solenoid valve (coil and manual override), conventional fire alarm loop (smoke detectors and manual call points in parallel on a panel with latched alarm, bell output, relay, silence and reset). The existing buzzer / horn serves as the alarm bell.
- **Starters, motors & drives (batch 3.5)**: soft starter (ramped voltage, end-of-ramp contact, limited inrush), reduced-voltage starter (autotransformer, primary resistor or part winding), Dahlander two-speed motor (low / high set, star point, interlock fault), wound-rotor motor with a three-stage rotor resistor bank, 24 V DC shunt motor with a timed starter and a field-loss overspeed warning, brake motor (spring brake released by its own coil), DC injection braking module, VFD speed potentiometer / braking resistor / line reactor, submersible pump, air compressor (raises the shared line pressure, pair it with the pressure switch) and a hoist / conveyor section with top and bottom limit contacts and a load-position slider.
- **Residential & commercial loads (batch 3.6)**: the lamp gets a `lampType` (incandescent, LED, fluorescent with ballast and starter, CFL, halogen) that sets watts and power factor (current = W / (V x pf)); one appliance device with kind presets (range, refrigerator, washing machine, rice cooker, microwave, 7 kW EV charger) whose power cycles over time; outlet types (universal, air-conditioner, range, weatherproof) on the duplex and Schuko receptacles; emergency luminaire and exit sign with a battery (the Code Inspector flags a wall switch in their feed); ceiling-fan speed regulator; doorbell set (230 V to 12 V transformer, push button on the secondary, chime); power strip with a cord that heats and burns out when overloaded.
- **Automation (batch 3.7)**: 5/2 double-solenoid pneumatic valve and a double-acting cylinder (the reed switch can be mounted on either end of the stroke), analog I/O module (4-20 mA / 0-10 V inputs with scaling and wire-break fault, 4-20 mA output) and an HMI panel whose four soft buttons are extra PLC inputs (I0.4-I0.7) and whose lamps show PLC bits. The Micro PLC and its program editor (function blocks TON / TOF / TP, counters, comparators, MOV, ADD) serve as the smart relay.
- **Loads**: lamps, TV, instant water heater, ventilation fan, 1.5 HP inverter air conditioner.

#### Sources and power systems: what is simplified
- **PV / net meter**: the solver follows power from the grid to the loads only. The inverter never drives the AC net: it exports while it sees the grid, and the net meter works out import and export from the site load minus the inverter output. A grid loss therefore leaves the site dead (anti-islanding).
- **Transformers**: the secondary voltage is the primary voltage divided by the turns ratio. The 30° phase shift of the vector group is a label only, and motor current still uses the feeder line voltage.
- **Power factor**: kvar comes from the energized inductive loads (typical or set power factor) and the capacitor steps in service; there is no harmonic or voltage-rise model. The capacitor-duty contactors are built into the bank.
- **IT system**: a first earth fault on one line is tolerated when the feeder is set to Isolated; earth faults on two lines are a short circuit. Insulation monitoring is shown as lamps only.
- **Paralleling**: the phase difference between two sets slips at 360° × frequency difference, slowed 4×. The synchroscope gives a permissive contact; closing out of sync is not simulated as a clash. Reverse power is raised by the generator's Motoring switch.
- **UPS / meters / fuses**: simulated time runs 60× faster than real time for the battery and the net meter register.

#### Control and timing: what is simplified
- **One-step latency**: the control modules decide their contacts in the simulation tick, so contacts follow their coil one 0.5 s step later (the same as the timer relay). A pulse must last at least one step to be seen; a counter pulse shorter than that can be missed.
- **Star-delta pause**: the 50-100 ms transition pause is modelled as one 0.5 s step.
- **Solid-state relay**: the leakage current through the output when off is shown but not solved; the off output is open.
- **Safety relay**: channel discrepancy is "one channel made and the other open for more than a step". Cross-short and test-pulse monitoring are not modelled; S11 / S21 simply carry the supply.
- **Two-hand station**: the 0.5 s window uses the real-time stamps of the two presses made on the device.
- **Time switch**: one schedule per day with a manual override; the clock only runs while the switch is powered (no power reserve).
- **Mechanical interlock**: the first contactor in the project that pulls in wins; the other stays out while the first is in.

#### Sensors and field devices: what is simplified
- **Thermal model**: a first-order lag (temperature moves towards the ambient and rises while the linked heater is energized). It is a teaching loop, not a heat-transfer model; there is no sensor lag separate from the plant.
- **Level, pressure and flow** come from the single shared process model: one tank, one line, one draw-off. Probes and the flow switch read it but cannot change it, and the solenoid valve does not drive it.
- **Fire alarm**: a bare conventional loop with no end-of-line resistor, so open-circuit and short-circuit loop faults are not monitored; one zone; the bell is the standard buzzer.
- **PIR / photocell**: movement is a toggle and the light level a slider; there is no detection area or dead time.
- **Zero speed**: the coast-down is a linear estimate over the coast time; 3-phase motors have no measured speed in the solver.

#### Starters, motors and drives: what is simplified
- **Starting current** is shown and used for the breaker inrush check only: a soft starter limits it to the set multiple (default 3 x FLA instead of 6 x), a reduced-voltage starter to 6 x tap squared (autotransformer), 6 x (1 - drop) (primary resistor) or 3 x (part winding), assuming closed transition. The running current of the motor in the solver is unchanged.
- **Speed** is a first-order estimate kept in each new motor (ramps and coast-down), not a torque-speed model. The wound-rotor speed per stage (35 / 55 / 80 / 98 %) and the hoist travel rate are set numbers.
- **Dahlander**: high speed needs the low-speed leads joined; supply on both sets at once is reported as an interlock fault rather than solved as a short circuit.
- **DC shunt motor**: only on the 24 V DC domain; the supply current limit does not include it. Field loss runs away to 250 % speed.
- **DC injection brake**: it times the braking and shortens the stop seen by a linked zero-speed switch; the DC output to the windings is a marker, not solved.
- **VFD accessories**: the speed potentiometer is a link (the drive frequency follows the knob), the analog wiring is not solved; the braking resistor and line reactor are passive (no regenerative energy or harmonic model).
- **Compressor / submersible pump** use the shared process (one tank, one line); the compressor raises line pressure only.

#### Residential and commercial loads: what is simplified
- **Cycles** (range 40 s on / 20 s off, refrigerator 30 / 30, washing machine fill-heat-wash-spin, rice cooker cook then 60 W keep-warm) are fixed teaching cycles on the simulated clock, not thermostat models. Power factor changes the current drawn, not the real power counted.
- **Lamp inrush and the fluorescent starter flicker** are shown as notes; the solver uses the steady current.
- **Outlet types** change the rating shown on the device only. Dedicated-circuit, weatherproof and EV-charger leakage rules are not enforced because the clauses are for you to confirm in your copy of the code.
- **Emergency light**: a battery with a 1-3 h autonomy that runs 60 x faster than real time; the switched-feed rule has its clause marked "to be verified".
- **Power strip**: the cord heat is a simple model (rises with the square of the overload) and the strip does not try to trip the upstream breaker, which is the point of the lab.
- **Doorbell**: the 12 V loop is sensed by continuity between B1 and B2; the 12 V side is not solved as a separate voltage.

#### Automation: what is simplified
- **Not done: the 16-in / 16-out 24 V PLC.** The 24 V DC PLC keeps its 8 inputs and 8 outputs; a larger variant needs the 24 V solver paths made size-aware and is left for a follow-up.
- **No separate smart-relay device**: the Micro PLC with the ladder editor is the smart relay (the same program model, function blocks and monitor); no LOGO-style function-block diagram editor was written.
- **Analog signals** are sliders on the module: the wiring of the 4-20 mA / 0-10 V loops is not solved, and the PLC program engine has no analog inputs, so the module cannot feed a PLC program yet.
- **HMI** soft buttons toggle (latching) and map onto PLC inputs I0.4-I0.7 (addresses can be rebound); lamps read PLC bits. The Micro PLC has only I0.0-I0.3 wired, so use the 24 V PLC with the HMI.
- **Pneumatics**: the valve and cylinder are a position state machine (stroke time, end stops); there is no air supply, pressure or force model, and the cylinder has no electrical terminals.

#### Test instruments
Click **DMM** in the toolbar and pick an instrument in its panel: **DMM / clamp** (volts between two terminals, amps on a wire), **Megger** (insulation resistance at 250 / 500 / 1000 V between two terminals or a terminal and PE; refuses on an energized circuit; reads the `insulation` condition set on a motor in the inspector), **Earth** (electrode resistance of a ground pit), **Rotation** (click the three phases in turn: CW or CCW) and **Continuity** (de-energized only; beeps on a closed path, contacts shown at rest).

### Timing diagram recorder
Click **📈 Recorder** in the status bar (hidden until you open it). Select a device on the canvas, pick one of its signals (coil, contact, running / lit state, an energized flag, a terminal voltage, or a wire current when a wire is selected) and press **+**. Every simulation step (0.5 s of simulated time) is sampled into a 20,000-sample ring buffer: on / off signals draw as step traces, numbers as lines. The cursor reads every channel, the wheel zooms, dragging pans, **Fit** shows everything, and you can pause, clear, and export **PNG** or **CSV**. Channels are saved with the project, and the Wye-Delta lab opens with KM1, KMY, KMD, the KT1 contact and the motor running state already set up. The time resolution is one simulation step, so a transition is placed within 0.5 s of when it really happened.

### PLC program editor
The **PLC** tab edits and runs real ladder logic on the Micro PLC and the 24 V DC PLC. Drag contacts (NO, NC, positive / negative edge, compare = / > <), coils (output, negated, set, reset) and boxes (TON, TOF, TP, CTU, CTD, MOV, ADD) from the palette onto rungs, or select a rung and click an item; drop a contact on another to put it in parallel. Addresses are `I0.0-I0.7`, `Q0.0-Q0.7`, memory bits `M0.0-M0.7`, words `MW0-MW7`, timers `T0-T7` and counters `C0-C7`, with symbolic names. Copy, cut, paste and reorder rungs, undo, and load one of six presets (start / stop latch, TON delayed start, traffic light, conveyor counter, two-motor sequence, tank level). The editor flags duplicate output coils, unconnected rung ends, empty branches, unused symbols and addresses that are read but never written.

**Monitor** mode shows the live scan: energized rungs and contacts in green, timer and counter values, memory, and the input and output bits. Click an input or output to **force** it (shown in red with a FORCED badge; release all forces when you are done). While the simulation runs, the program is scanned several times per 0.5 s step (step length / scan time, 10-500 ms); inputs are the ones the circuit solver read from the wired terminals at the last solve, and the outputs drive the PLC output terminals on the next solve, so a program reacts one simulation step after its inputs change. PLCs without a program keep the fixed `passthrough` and `start_stop_latch` demo behaviours. There is no analog I/O or retentive memory: memory is cleared when the simulation stops.

### Time-current curves
The **Curves** button in the status bar opens a coordination plot (current against time, both logarithmic). Select a breaker, fuse, fuse switch, MCCB or overload relay on the canvas and press **+ Device**, upstream device first; each is drawn as a band between its fastest and slowest operating time. Where an upstream and a downstream device may both operate (the downstream device's slowest time is not faster than the upstream device's fastest) the region is shaded red and the panel lists the current above which the pair is no longer selective. Select a motor to add its starting envelope (6 x full-load current for 5 s), and a wire to add the cable damage limit `t = (k x S / I)^2`. While the simulation runs, each device shows the live current from the solver as a dot on its curve. The plot exports to PNG, and the chain is saved with the project. The "Fuse and MCB Coordination for a Motor Feeder" lab opens with it preconfigured.

The curves come from the same table the simulator uses to trip devices. The band is the nominal curve moved by a fixed current tolerance (MCB 25 %, fuses and overload relay 10 %, MCCB 15 %); it is a teaching approximation, not a manufacturer's certified minimum / maximum curve. The cable constant `k = 115` (copper, PVC) is flagged "needs verification" against your copy of the code, and the adiabatic formula only holds for fault durations up to about 5 s.

### Reports: load schedule
The **Reports** button in the status bar opens a document panel (one tab per report; every report only reads the project and never changes a simulation result). The **Load schedule** lists every load device with its circuit number, load type, watts, power factor, VA, amps at the system voltage, demand factor and demand VA, the breaker (rating and curve) that feeds it, the conductor gauge, the wire length between the load and that breaker, the voltage drop, the phase on a three-phase panel and notes (for example "breaker above the limit of the conductor"). Loads are traced back through their wires, switches, junction boxes and splices to the nearest protective device. It totals the connected and demand load, shows the phase balance, and suggests a main breaker and feeder gauge from a table of standard sizes. Export CSV, or Print on A4 (a print stylesheet shows only the report).

**Demand factors are data, not code.** None is built in (every value in `DEMAND_FACTORS` in `standardsData.ts` is empty and flagged `needsVerification`); type your own in the panel, by load type, from your copy of the code. While any is empty the panel says "set demand factors" and sizes the main breaker from the connected load. Voltage drop is the design current over the 75 °C table resistance (single-phase loop, or the three-phase formula). Loads that depend on the simulation state (a socket's plugged load) count only when the plugged load is switched on in the project.

### Reports: bill of materials
The **Bill of materials** tab lists every device grouped by type and rating (a 16 A and a 20 A breaker are separate lines), every conductor gauge with its total length plus a waste percentage, and optional conduit and box allowances you enter. **No prices are bundled**: type a unit price on each line (the default currency is PHP) and the tab works out the amounts, the subtotal per category, the contingency %, the VAT % (applied after the contingency) and the total. Prices and settings are saved with the project (`bom`). Export CSV or print on A4.

### Reports: wire numbering and terminal strips
The **Wire numbers & terminals** tab numbers every wire with an editable prefix and one of three schemes: sequential (`W1`, `W2` ...), from-to (`KM1.t1-F2.l1`, from the device tags) or per circuit (`W3.2`, the circuit number from the load schedule; wires on no load path are `W0.n`). The numbers are written into each wire's label and drawn as ferrule tags on the workbench, and can still be edited by hand. For every terminal block the tab gives a table (terminal, incoming wire and where it comes from, outgoing wire and where it goes), and **Export SVG** writes a standalone drawing of the strip with an editable title block (project, drawn by, checked by, date, sheet) that prints from the browser (A4). Also exports a wire list CSV. Everything works offline. The single-line diagram does not show the wire numbers yet.

### Share link and offline install
**Share link** (Reports, Share link tab): the whole project is compressed (deflate through the browser's built-in `CompressionStream`, with a small dependency-free LZW fallback) into the address after `#share=`. Nothing is uploaded; whoever opens the link gets an editable copy that goes through the same migration code as a file import, so older projects still open. Links longer than about 8,000 characters are flagged with a warning to use **Export JSON** instead, because some apps cut long links. A broken or truncated link shows a message and does not change the open project.

**Offline install**: a web manifest and a small service worker (`public/sw.js`) cache the app shell and every same-origin file it loads, so the app opens with no network once visited; no project data leaves the device and the worker never sends anything. Relative `start_url`, `scope` and `base: './'` keep the worker scope right under a GitHub Pages sub-path. The Google fonts load from the network when online and fall back to system fonts offline. The single-file build (`build:standalone`) is unchanged and needs no worker. To check by hand: serve the production build over https (or localhost), open it once, go offline and reload; on a phone use "Add to Home screen". The manifest uses an SVG icon, so a PNG 192 / 512 pair may be needed for the install prompt on some Android versions.

### Reports: energy and billing
The **Energy & billing** tab integrates the power of every energized load over simulated time while the simulation runs (tick the box to record). A **time scale** of 1x, 60x or 3600x makes an hour pass in a minute or a day in 24 seconds: the ledger holds the present power for the scaled time, so it shows the energy of the present operating point rather than a replay of every device's own timers. It keeps a per-device energy ranking, prices it with a **tariff you type in** (rate per kWh in PHP by default, plus optional progressive tiers; no rate is built in, so costs read 0 until you enter one), projects 30 days at the average rate so far, and shows the **power triangle** (P, Q, S and power factor) of the whole installation from each load's power factor. Export the ledger as CSV. The meter registers already on the kWh meters are unchanged.

### Graded lab mode
The **Graded lab** tab turns seven labs (six motor-control labs and the staircase / impulse lighting lab) into exercises. **Start exercise** places the lab's devices with no wiring and no ladder and stores a target made from the reference lab: the required devices, the required connections (device-terminal pairs, order independent, and a connection counts when both terminals end up on the same net, however you route it), whether the control ladder must match the wiring, and whether the Code Inspector must show no errors. **Check my work** returns a checklist with partial credit (devices 20, connections 50, ladder 15, inspector 15 points, scaled to the items the lab has). The inspector item earns nothing on an empty project. By default the checklist only counts ("17 of 30 connections"); tick **Show what is missing** before starting to have it name the missing devices and connections, so hidden solutions are not revealed by accident.

The student name, course and section are typed in the tab and kept only in this browser (nothing is hard-coded). The result can be printed as an A4 report (checklist, score, timestamp, header) or exported as a small JSON file for a teacher to collect: it holds the header, the score and the checklist, never the solution. Not done: a schematic snapshot (SVG from the single-line diagram view) on the report, and an exercise mode for labs other than the seven above.

### Safe isolation (dead test and lock-out / tag-out)
The **Safe isolation** tab in Reports is a step-by-step workflow: identify the source, isolate, lock and tag, prove the tester on a known live source, test dead on the work circuit, prove the tester again, do the dead tests (insulation, continuity, polarity), remove the lock, then energize. The steps must be done in order. **Isolate**, **Lock and tag** and **Remove the lock** are checked against the project (an isolating device really open, a padlock on an open rotary isolator, the padlock really gone), so the sequence cannot be ticked without doing the job. A setting decides what Simulate does: **Off** (default, no check), **Prompt** (the first press names the next step and warns once; pressing Simulate again goes through) or **Required** (Simulate is blocked with a message naming the step until every step is done). The finished steps appear on the graded lab result. The step descriptions are generic good practice and cite no regulation clause; check the procedure your site follows.

### Short-circuit check (fault levels)
The **Fault levels** button in the status bar turns on a short-circuit check (off by default, and off in every lab). A small card sets the supply short-circuit level (default 10 kA) and, optionally, a supply transformer in series (kVA and impedance %). The simulator then traces the shortest conductor path from the supply (the 440 V source, or a utility meter whose line input is left unwired) to every device and shows the prospective fault current (Ik) as a small badge on each device, in the inspector's datasheet card, and in a table of every breaker and fuse's interrupting rating (`kaRating`) against the fault level at its input. The Code Inspector adds an **error** when a rating is below the available fault current and a **warning** when the fault current is above 80 % of the rating; the clause reference is left as "to be verified".

The method is the simple ohmic one: `Ik = U / (sqrt(3) x (Zs + R))` for a three-phase supply and `Ik = U / (Zs + 2R)` for a single-phase one, where `Zs` comes from the source level (plus the transformer, `Z% x U^2 / kVA`) and `R` is the conductor resistance along the path. Simplifications: resistance only (the conductor data has no reactance values, so results run slightly high, which is the safe side for a rating check); the 75 °C table resistance is taken back to 20 °C with the copper coefficient 0.00393 per °C (highest fault current); the shortest path is used and parallel paths are not combined; no motor contribution; the source level is taken at the supply terminals; and circuits behind a control transformer are not calculated.

### Troubleshooting mode
Click **🔧 Troubleshoot** in the status bar (bottom right). Faults injected into the circuit are hidden: the code inspector shows symptoms only and trip reasons are replaced by "Protective device operated". The student finds the fault with the DMM, clamp meter and test instruments, can mark suspects, ask for progressive hints or **Reveal** (costs 3 hints), and **Submit diagnosis** (device + fault kind) for a score out of 100 (minus 10 per wrong attempt, 15 per hint, 2 per minute). The **Author** tab (it shows the faults) adds or removes faults on the selected device, generates **Easy / Medium / Hard** fault sets from a seed number so a whole class gets the same fault, and the five ready-made scenarios (DOL starter ×3, forward / reverse starter, staircase lighting with two faults) load from the Student tab. Fault kinds: open coil, welded contact, contact stuck open, loose neutral, open wire, high-resistance joint, earth fault to frame, overload dial set wrong, blown fuse, swapped phases. Faults are stored with the project (`faults`, `faultsVersion`) and apply only while the mode is on, so every existing lab behaves as before.

### 4. Marine & industrial motor control trainer
- **Phase tracking**: the solver follows L1 / L2 / L3 through breakers, contactors and overload relays. U1-V1-W1 = L1-L2-L3 spins the motor **clockwise (FORWARD)**; swapping two lines spins it **counter-clockwise (REVERSE)**. A missing line shows a **single-phasing** fault.
- **Control transformer**: H1-H2 across two phases; X1 is the 220 V control hot, X2 the control return.
- **Phase-to-phase shorts**: closing FOR and REV together bolts L1 to L3 — an arc flash fires at the contactor and the upstream 3-pole MCB trips.
- **Overload protection**: the thermal overload relay trips when motor current exceeds its dial setting.
- **Ladder Logic view**:
  - **Live Sync** — rungs built from your wiring, energized paths in green, blocking contacts in red; hold START / STOP / FWD / REV symbols to operate the circuit.
  - **Lab Target** — the active lab's reference ladder, live-highlighted.
  - **Rung Builder** — draw rungs with `| |`, `|/|`, `||`, `( )` and `(*)` linked to workbench devices, then **Verify Against Physical Wiring** for diagnostics such as *"Missing KM1 13-14 Seal-In across START"*.

### 5. Real-time circuit solver & fault physics
- Node-voltage and branch-current solution across all devices and conductors, including cascaded control logic (push button → PLC input → relay output → contactor coil → motor).
- **Magnetic trip** on phase-to-neutral, phase-to-earth and phase-to-phase shorts, with arc-flash sparks and synthesized audio.
- **Thermal trip** when a breaker's own conducted current exceeds its rating.
- **RCD / RCBO earth-leakage protection** on differential current ≥ 30 mA; an RCBO trips only its own circuit.
- **Fuses** melt along gG / aM time-current curves (thermal overload) and instantly on a short circuit; a blown link stays open until replaced. aM links ride through a motor start, a gG link close to the motor current can blow on it.
- **Standby power**: a generating set starts on a button or a remote-start contact, and an ATS moves the load after its transfer delay and back when the grid returns.
- Wye-Delta changeover timing, motor inrush, open-neutral effects.
- **Digital multimeter & clamp meter (DMM)**: probe two terminals for volts, click a wire for amps.

### 6. CAD-style editing
- **Orthogonal wiring**: click a terminal, then another, to route a clean 90° conductor. Drag the handle on a selected wire's middle segments to reshape it; **Reset to Auto** restores automatic routing.
- **Wires stay square when devices move**: a hand-routed wire lengthens or shortens to keep its 90° bends instead of turning diagonal.
- **Selection**: click to select, **drag on empty canvas** to box-select devices and wires, **Shift / Ctrl-click** to add or remove, **Ctrl+A** to select everything. Selected devices move together; **Align H / Align V** line them up.
- **Inspector on double-click**: double-click a device or wire to open its properties, so a single click never gets in the way of dragging.
- **Bulk wire editing**: select several wires, double-click one, and set **insulation colour** and **gauge (AWG + mm²)** for all of them in one undo step.
- Rotate (`R`), duplicate, copy / paste, lock position, grid snap (10 / 5 px / off), undo / redo, wire tags, rewire or disconnect a wire end without deleting it.
- **Fit to view** (`F`) and 1:1 zoom; a lab auto-fits when it loads.

### 7. Live code compliance & hazard engine
- **Switched neutral** (PEC 4.4.1.2 / 4.10.10.2): flags a switch on the neutral that leaves a lamp shell live at 230 V.
- **Ungrounded metal chassis** (PEC 2.50.6.13) on heaters, ACs and motors.
- **Reversed polarity** on receptacles.
- **Motor circuits**: motor without an overload relay, overload relay 95-96 not wired into the control circuit, reversing contactors without an electrical interlock, motor frame not grounded.
- **Voltage drop** (≤ 3 % branch, ≤ 5 % feeder) with a conductor length slider, and **conduit fill** against the 40 % limit.

---

## 📚 Example Wirings & Learning Labs
Open **Examples** in the ribbon. WireWise starts on a blank canvas; each lab loads de-energized in Edit Mode — press **▶ Simulate** to energize it.

### Motor control (440 V / 220 V)
1. **⚓ Marine / Industrial DOL Motor Starter** — 440 V feeder → 3P MCB → contactor KM1 → thermal overload F2 → motor, with a 440/220 V control transformer, OLR 95-96 → STOP → START + 13-14 seal-in, and RUN / FAULT pilots.
2. **🔄 Forward-Reverse Starter with Electrical Interlocking** — FOR / REV contactors with T1/T3 phase reversal, 21-22 NC cross-interlocks, overload relay and FWD / REV / STOP station.
3. **Wye-Delta (Y-Δ) Reduced-Voltage Starter** — 6-lead 7.5 HP motor, line / star / delta contactors, 5 s on-delay timer changeover and interlocks.
4. **DOL Motor Starter with 3-Wire Seal-In Control** — Start NO, Stop NC, auxiliary 13-14 seal-in and running pilot.
5. **Industrial Control Relay: Run / Standby Annunciation** — DPDT Form-C relay swapping red and green pilot lamps.
6. **Micro PLC Automated Motor Controller** — inputs I1 (Start) and I2 (E-Stop) driving relay output Q1.

### Residential (PEC)
7. **🇵🇭 Residential Branch Circuit: ACU Safety Breaker & Modular Switch-Outlet Combo**
8. **Socket Outlet with GFCI / RCD Shock Protection** (PEC 2.10.1.8)
9. **Socket Outlet WITHOUT GFCI** — ungrounded shock-hazard demonstration
10. **Single Lamp Lighting Circuit (1-Way Switch)**
11. **Wiring Mistake: Switched Neutral Electrocution Hazard**
12. **Staircase 2-Way Switching (Two 3-Way Switches)**
13. **Multi-Location Switching (Two 3-Ways + One 4-Way)**
14. **Multiple Ceiling Lamps in Parallel**
15. **Splice Tutorial: Junction Box & Wire Nut Branching**
16. **Outlet Wiring: Pigtail Splice System (System A)**
17. **Outlet Wiring: Daisy-Chain System (System B)**
18. **Air Conditioner (1.5 HP Inverter) Dedicated Circuit** (PEC Art. 4.40)
19. **Electric Ventilation Fan with Wall Switch Control**
20. **Complete Residential Installation (Master Reference)** — kWh meter, main disconnect, earth pit, 30 mA RCD, SPD, branch breakers, junction box, lamp, fan, outlet + TV, water heater and ACU with safety disconnect.

### Timers, fuses, RCBO and standby power
21. **Ventilation Fan with Off-Delay Run-On** — timer relay in off-delay mode keeps the fan running after the switch is turned off.
22. **Flasher Alarm Lamp** — timer relay in flasher mode toggles the lamp every delay period.
23. **Branch Circuit Protected by a gG Fuse** — overload melts the link along the gG curve, a short circuit melts it instantly; replace it with a larger link.
24. **Fuse Blown on One Phase of a DOL Starter (Single-Phasing)** — fuse switch disconnector with a blown L3 link leaves the motor on two phases.
25. **Two Sockets on Separate RCBOs** — an earth fault on one socket trips only its own RCBO.
26. **Standby Generator and ATS: Simulate a Utility Outage** — loss-of-mains relay starts the generator, the ATS transfers after its delay and returns when the grid is back.

### Process control, protection relays, 24 V DC, motors and instruments
27. **Automatic Pump Control with HOA: Float Switch, Overload, Run Lamp** — the pump fills a tank, the float switch starts and stops it with hysteresis, HAND overrides it.
28. **DOL Starter Protected by a Phase Monitor** — swap two phases and the starter refuses to run.
29. **Conveyor Stop: Inductive Sensor into a PLC Input, Relay Output to a Contactor** — 24 V DC supply, three-wire sensor, PLC and interface relay switching an AC contactor.
30. **Overload Alarm: Thermal Overload Contact Drives a Beacon and Horn** — the overload relay 97-98 contact starts a flashing beacon and a horn.
31. **Capacitor-Start Motor: Wiring the Starting Capacitor and Reversing Rotation** — start winding, 100 µF capacitor and centrifugal switch on a 0.37 kW single-phase motor.
32. **Dead-Testing a 3-Phase Motor Circuit Before Energizing** — continuity, insulation (a damaged motor winding), earth electrode and phase rotation tests.
33. **Motor Feeder: Adjustable MCCB, Earth-Leakage Relay with Shunt Trip, CT Ammeter and Voltmeter** — core-balance CT, KE1 relay driving the MCCB shunt coil, measuring CT and a selector voltmeter.
34. **AFDD and GFCI: Loose Terminal Arcing and Ground-Fault Protection Downstream** — arc detection, GFCI face and LOAD terminals.
35. **DOL Starter with a Lockable Isolator, an MPCB and a PTC Thermistor Relay** — no overload relay: MPCB class 10 element and winding-temperature protection.

### Sources and power systems
36. **Standby Supply Chain: Manual Transfer Switch, Generator and UPS** — utility outage ridden through on the UPS battery, handle I → 0 → II onto the generator (break-before-make).
37. **Grid-Tied PV with Net Metering and Anti-Islanding** — PV string, DC isolator, grid-tie inverter and net meter; lose the grid and the inverter shuts down in full sun.
38. **Power Factor Correction: Controller, Capacitor Bank and Step Switching** — the controller switches capacitor steps to the target power factor and backs out when over-corrected.
39. **Marine Switchboard: Shore Connection, Ground Detection and a Delta-Wye Transformer** — ungrounded (IT) 440 V: the first earth fault shows on the lamps and nothing trips.
40. **Generator Paralleling: Synchroscope, Sync Permissive and Reverse Power** — trim the incoming set, close on sync, reverse-power relay trips a motoring set.
41. **Generator Overload: Preferential Trip Sheds the Non-Essential Feeder** — the relay opens the galley feeder through its shunt trip before the set trips.

### Control and timing modules
42. **Star-Delta Transition Timer: Star, Pause, Delta** — a dedicated timer module sequences two contactor coils with a break between them.
43. **Staircase Timer and Impulse Relay Lighting** — re-triggerable staircase light and multi-point hall light.
44. **Dual-Channel Safety Circuit: E-Stop, Guard Door and Safety Relay** — monitored start, channel discrepancy fault, no restart on door close.
45. **Part Counter, Duplex Pump Alternation and a 24-Hour Time Switch** — batch counter with reset, lead pump flips every start, yard light on a schedule.

### Sensors and field devices
46. **Tank Level Control with an Electrode Level Relay** — probes at 30 % and 70 % start and stop a filling pump with hysteresis between them.
47. **Thermostat and Thermocouple Temperature Control** — a room thermostat and an oven controller on a type K thermocouple, sensor break fails safe.
48. **Conventional Fire Alarm Loop and Photocell / PIR Security Light** — latched alarm with silence and reset; a yard light that needs dark and movement.

### Starters, motors and drives
49. **Soft Starter: Ramped Start and Reduced Inrush** — voltage ramp, end-of-ramp contact, breaker inrush limited to 3 x FLA.
50. **Wound-Rotor Motor with a Stepped Rotor Resistor Bank** — speed climbs as each resistor stage is shorted; open rotor gives no torque.
51. **Air Compressor with a Pressure Switch** — cut-in starts the compressor through a contactor, cut-out stops it.

### Residential and commercial loads
52. **Kitchen Circuit: Cycling Appliances and Lamp Types** — refrigerator, rice cooker, microwave, range, LED and fluorescent lamps on one feeder.
53. **The Octopus Overload: A Power Strip with a 10 A Cord** — the cord burns out before the 32 A breaker acts.
54. **Emergency Lighting, Exit Sign, Doorbell and a Fan Regulator** — battery backup, 12 V bell loop, fan speed steps and the switched-feed warning.

### Automation
55. **Double-Acting Cylinder: 5/2 Valve and Reed Switch End Feedback** — double solenoid memory, blocked valve and end-position lamps from reed switches.

---

## ⌨️ Keyboard & Mouse

| Action | Shortcut |
| --- | --- |
| Box-select devices and wires | Drag on empty canvas |
| Add / remove from selection | Shift-click or Ctrl-click |
| Select all | Ctrl+A |
| Open the inspector | Double-click a device or wire |
| Clear selection / cancel wiring | Esc |
| Delete selection | Del / Backspace |
| Rotate device | R |
| Fit drawing to view | F |
| Undo / Redo | Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) |
| Copy / Paste device | Ctrl+C / Ctrl+V |
| Pan | Space+drag, middle or right drag, Alt+drag |
| Zoom | Mouse wheel |

---

## 💾 Saving & Sharing
- **Export / Import** — save the project as JSON and reopen it later (older saves are upgraded automatically).
- **Save HTML** — downloads a single self-contained offline HTML file that opens straight to your wiring.
- **`WireWise-Standalone.html`** — the whole app as one offline file, built with `npm run build:standalone`.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm

### Run locally
```bash
git clone https://github.com/jro-d/wirewise.git
cd wirewise
npm install
npm run dev
```
Open the URL Vite prints (default **`http://localhost:5173/`**).

### Build
```bash
npm run build              # type-check + production build into dist/
npm run build:standalone   # also writes WireWise-Standalone.html (single offline file)
npm run check:catalog      # catalog / DeviceType / renderer / library consistency (also runs inside both builds)
npm test                   # smoke tests in tests/ (solver, labs, devices, migration)
```
Pushes to `main` are built and deployed to GitHub Pages by the included GitHub Actions workflow. A development-only device gallery is available at `/?gallery`.

---

## 📁 Project Structure
```text
wirewise/
├── index.html
├── WireWise-Standalone.html      <-- single-file offline build
├── scripts/                     <-- standalone HTML builder, catalog consistency check
├── tests/                       <-- smoke tests (npm test)
└── src/
    ├── App.tsx                  <-- root layout & state coordinator
    ├── types/                   <-- electrical, ladder & code types
    ├── core/                    <-- circuit solver, wire router, ladder engine, code rules, schematic, trip curves
    │   └── behaviors/           <-- per-device hooks (timer modes, fuses, RCBO, generators, ATS, 3P meter)
    ├── data/                    <-- PEC/IEC standards, device catalogue, labs
    ├── styles/                  <-- design tokens (light/dark) & conductor colours
    ├── components/
    │   ├── devices/             <-- interactive SVG devices + shared drawing kit
    │   ├── canvas/              <-- WiringCanvas, LadderCanvas, SchematicCanvas, WireRenderer
    │   └── layout/              <-- ribbon, library, inspector, code HUD, lab selector, status bar
    ├── utils/                   <-- audio, device state, legacy-project migration
    └── dev/                     <-- device gallery (dev only)
```

---

## 👤 Author
Developed by **John Ray O. Dalida** (EE – 2022102981), Mapúa University — Instructor: Engr. Nathaniel Sedilla.

## 📄 License
Open-source under the [MIT License](LICENSE).
