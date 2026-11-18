# WireWise — Interactive Electrical Installation & Motor Control Simulator
*WireWise (formerly VoltLab)*

**Physical Wiring Workbench • Ladder Logic • Single-Line Diagrams (SLD) • PEC 2017 & IEC 60364 Code Inspector**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)
27. **Automatic Pump Control with HOA: Float Switch, Overload, Run Lamp** — the pump fills a tank, the float switch starts and stops it with hysteresis, HAND overrides it.
28. **DOL Starter Protected by a Phase Monitor** — swap two phases and the starter refuses to run.
29. **Conveyor Stop: Inductive Sensor into a PLC Input, Relay Output to a Contactor** — 24 V DC supply, three-wire sensor, PLC and interface relay switching an AC contactor.

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
- **Process control**: float switch (high / low trip with hysteresis, NO / NC on rise), pressure switch (cut-in / cut-out), and 1-phase / 3-phase booster pumps that raise a shared tank level or line pressure (a small documented process model, not a fluid simulator).
- **Phase monitoring**: phase failure / phase sequence relay (lost phase, swapped phases, under / overvoltage release the 15-18 output).
- **24 V DC control domain**: DIN-rail 24 V supply with current-limit shutdown and automatic restart, three-wire inductive, capacitive and photoelectric sensors (PNP / NPN, NO / NC, click the sensing face to place a target), a 24 V DC PLC (8 inputs, 8 sourcing outputs, RUN / STOP, passthrough or start / stop demo program) and a 24 V DC coil option on the control relay. The DC side is solved separately from AC: wiring a 24 V net to an AC line or neutral shuts the supply down and is reported as an error; NPN sensors on PNP inputs and reversed sensor supplies show a visible fault note.
- **Loads**: lamps, TV, instant water heater, ventilation fan, 1.5 HP inverter air conditioner.

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
