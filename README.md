# VoltLab — Interactive Electrical Installation & Automation Simulator
**Physical Wiring Workbench • Single-Line Diagrams (SLD) • PEC 2017 & IEC 60364 Code Inspector**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)

---

## ⚡ Overview
**VoltLab** is an interactive, browser-based electrical installation modeler, circuit solver, and industrial automation simulator designed for electrical engineering students, licensed electricians, and automation technicians. It bridges the gap between theoretical single-line diagrams and hands-on physical electrical wiring.

Users can place realistic electrical distribution equipment, route physical conductors with 90° orthogonal Manhattan paths, test switches and momentary pushbuttons, and trigger real-time physics simulations with magnetic short-circuit trips, thermal overcurrent, and 30mA residual current (GFCI/RCD) protection.

---

## 🚀 Key Capabilities

### 1. Dual-View Synchronization (Physical & Schematic)
- **Photorealistic Vector Workbench**: Detailed front-elevation vector equipment with realistic screw terminals, copper windings, DIN-rail clips, busbars, conduit boxes, and ground inspection pits.
- **Single-Line Diagram (SLD) / Engineering Schematic**: Automatically synchronizes physical wiring into standard IEC 60617 / IEEE electrical symbols with real-time Manhattan routing, pan, and cursor-anchored zoom controls.
- **Split Dual-View**: View physical distribution equipment and the theoretical single-line schematic side-by-side in real time.

### 2. Dual Code Compliance Engines (PEC vs. IEC)
- **🇵🇭 Philippine Electrical Code (PEC 2017) / NEC**:
  - 60 Hz grid frequency, 230V single-phase / 220V & 440V three-phase systems.
  - Conductor sizing in AWG and dual metric mm² (14 AWG / 2.0 mm², 12 AWG / 3.5 mm², 10 AWG / 5.5 mm², 8 AWG / 8.0 mm²).
  - Standard wire color schemes (Black/Red Phase, White Neutral, Green Ground).
  - Overcurrent protection rules per PEC Table 3.10.2.6 & PEC 2.40.1.4(D).
- **🌐 International Electrotechnical Commission (IEC 60364)**:
  - 50 Hz grid frequency, 230V single-phase / 400V three-phase systems.
  - Conductor sizing in metric mm² (1.5 mm², 2.5 mm², 4.0 mm², 6.0 mm², 10.0 mm²).
  - Standard European wire colors (Brown L1, Black L2, Grey L3, Blue Neutral N, Green/Yellow PE).

### 3. Industrial Controls & Motor Automation
- **3-Pole Power Contactor**: AC-3 rated magnetic contactor with 3 power poles ($L_1-T_1, L_2-T_2, L_3-T_3$), auxiliary NO contact ($13-14$) for seal-in circuits, $230\text{V}$ AC coil terminals ($A_1-A_2$), and moving mechanical armature plunger.
- **Dual Start-Stop Push Button Station**: IP65 enclosure with green momentary flush START button (Normally Open, terminals 3-4) and red flush STOP button (Normally Closed, terminals 1-2).
- **Emergency Stop Mushroom Button**: 40mm red twist-to-release safety actuator with NC safety contacts.
- **Industrial DPDT Control Relay**: 8-pin ice-cube relay with Form-C contacts (Common 11/21, NC 12/22, NO 14/24), coil indicator LED, and manual test button.
- **Micro PLC (Programmable Logic Controller)**: DIN-rail micro PLC featuring 4 digital inputs ($I_1..I_4$), 4 isolated relay outputs ($Q_1..Q_4$), real-time status LCD screen, and RUN/STOP CPU switch.
- **3-Phase AC Induction Motor**: High-torque motor with cast-iron stator cooling fins, conduit terminal box, and spinning keyed drive shaft.
- **22mm Panel Pilot Indicator Lights**: Multi-color panel lamps (Green Running, Red Standby, Amber Fault, Blue Info) with jeweled fresnel lens bloom.

### 3b. ⚓ Marine & Industrial Motor Control Trainer (Phase 3)
- **440V 60Hz 3-Phase Feeder**: L1 / L2 / L3 / PE supply block with phase-presence lamps, rotary main isolator and phase-sequence indicator. The solver tracks each line's identity through breakers, contactors and overload relays.
- **Motor Rotation by Phase Sequence**: U1-V1-W1 = L1-L2-L3 spins the motor **CW (FORWARD)**; swapping any two lines spins it **CCW (REVERSE)** with a live direction badge on the shaft. One missing line shows a **single-phasing** fault.
- **Upgraded 3-Pole Contactor (LC1D / 3RT style)**: 1NO + 1NC auxiliary block (13-14 seal-in, 21-22 interlock) and a **🔍 X-ray cutaway** revealing the A1-A2 coil, laminated armature, return springs and copper contact bridges that pull down when energized.
- **Thermal Overload Relay (3RU / LRD style)**: pass-through main poles, 95-96 NC trip and 97-98 NO alarm contacts, rotary ampere dial, TEST slider and RESET button. Trips automatically when motor current exceeds the dial setting.
- **440V / 220V Control Transformer**: H1-H2 primary across two phases; X1 becomes the 220V control hot, X2 the control return.
- **Forward / Reverse / Stop Station** and momentary (hold-to-press) push buttons.
- **Phase-to-Phase Short Detection**: closing FOR and REV together bolts L1 to L3 — the solver fires a phase-to-phase arc flash at the contactor and trips the upstream 3-pole MCB.

### 3c. Control Ladder Diagram (Ladder Logic view)
- **Live Sync**: the wired control circuit between X1 and X2 is parsed into NEMA / IEC 2-rail ladder rungs (series contacts, parallel seal-in branches, coils and pilot lamps) with energized paths in green and blocking contacts in red. Hold START / STOP / FWD / REV symbols to operate the circuit; click OLR to TEST / RESET.
- **Lab Target**: the active lab's reference ladder, live-highlighted.
- **Rung Builder**: draw rungs with `| |`, `|/|`, `||`, `( )` and `(*)` symbols linked to workbench devices, then **Verify Against Physical Wiring** to get diagnostics such as *"Missing KM1 13-14 Seal-In across START"* or *"Missing REV 21-22 NC Electrical Interlock before KM1/FOR coil"*.
- **Dual View** shows the physical workbench beside the live ladder (or SLD); hovering a ladder symbol glows the matching device.

### 4. Real-Time Circuit Solver & Fault Physics
- **Kirchhoff Nodal Engine**: Solves node voltages and branch currents dynamically across all connected devices and conductors.
- **Multi-Stage Dynamic Evaluation**: Simulates cascading logic loops (e.g., Push Button $\to$ PLC Input $\to$ PLC Relay Output $\to$ Contactor Coil $\to$ Motor).
- **Magnetic Instantaneous Trip**: Dead shorts (Phase-to-Neutral or Phase-to-Earth) instantly trip the closest upstream circuit breaker with visual arc flash sparks and procedural audio discharges.
- **Thermal Overload Trip**: Evaluates continuous branch load current against breaker ampacity (e.g., 25A continuous load on a 16A breaker) and trips the breaker with diagnostic messaging.
- **RCD Earth Leakage Protection**: Continuously computes differential current $|I_{\text{phase}} - I_{\text{neutral}}|$. Leakage $\ge 30\,\text{mA}$ trips the RCD within milliseconds.
- **Procedural Web Audio Engine**: Realistic synthesized audio for wall switch clicks, breaker snaps, and electrical arcing without external audio files.

### 5. Smart Orthogonal Wire Routing & Free Dragging
- Click a source terminal and destination terminal to automatically route clean 90-degree orthogonal wires with terminal lead-out drop clearance under devices.
- **Interactive Wire Dragging**: Click any wire segment to select it; grab the floating handle to slide vertical segments left/right or horizontal segments up/down freely with 5px grid snapping.
- **Reset to Auto**: Instantly restore custom shifted paths back to automatic collision-free routing from the Inspector panel.
- **Device Rotation & Terminal Preservation**: Rotate devices 90° (`R` shortcut) while connected wires automatically track rotated pin positions.

### 6. Live Code Compliance & Fatal Electrocution Hazard Engine
- **Fatal Shock Hazard Alerts**: Detects deadly wiring practices such as **Switched Neutral** (PEC 4.4.1.2 / 4.10.10.2) where turning a wall switch OFF leaves the lamp holder screw shell live at 230V during bulb replacement.
- **Ungrounded Metal Chassis Detection** (PEC 2.50.6.13): Flags high-power loads (Water Heaters, ACs, Motors) energized without an Equipment Grounding Conductor (EGC).
- **Reversed Polarity Detector** (PEC 2.0.1.10): Alerts when Line and Neutral are inverted on receptacles.
- **% Voltage Drop Calculator**: Displays branch voltage drop with conductor length adjustment slider ($V_d \le 3\%$ branch limit, $\le 5\%$ feeder limit).
- **Conduit Fill % Meter**: Computes total wire volume inside 3/4" EMT/PVC conduits against the 40% maximum code limit.

---

## 📚 Interactive Curriculum Labs

VoltLab opens to a clean, blank canvas by default and features an **"Example Wirings"** curriculum library accessible from the top navigation bar:

### Sockets & GFCI
1. **Socket Outlet with GFCI / RCD Shock Protection (PEC 2.10.1.8)**: 2P MCB $\to$ 30mA RCD $\to$ Duplex Outlet with full Green Equipment Grounding Conductor (EGC).
2. **Socket Outlet WITHOUT GFCI (Ungrounded Shock Hazard)**: 2-Wire ungrounded circuit demonstrating PEC compliance audit alerts.
3. **Outlet Wiring: Daisy-Chain System (System B)**: Terminal screw feed-through showing downstream neutral interruption risks.

### Lighting & Switches
4. **Single Lamp Lighting Circuit (1-Way Switch)**: Standard switch drop with continuous neutral return.
5. **Wiring Mistake: Switched Neutral Electrocution Hazard (PEC 4.4.1.2)**: Switch mistakenly on neutral; demonstrates why the bulb illuminates yet creates a lethal 230V touch hazard at the screw base when off.
6. **Staircase 2-Way Switching (Two 3-Way Switches)**: Controlling a lamp independently from downstairs and upstairs via dual traveler conductors.
7. **Multi-Location Switching (Two 3-Ways + One 4-Way Intermediate)**: Controlling a corridor luminaire from 3 separate locations.
8. **Multiple Ceiling Lamps in Parallel**: 3 lamps receiving equal 230V potential from a single master switch.

### Splice Tutorials
9. **Splice Tutorial: Junction Box & Wire Nut Branching**: Demonstrates how to use an octagonal PVC junction box and twist-on wire nuts to split a feeder run safely into multiple branches (Electric Fan + Wall Outlet).
10. **Outlet Wiring: Pigtail Splice System (System A - PEC Compliant)**: Continuous feeder cable with wire nut T-tap drops so downstream devices do not depend on upstream receptacle screws (PEC 3.0.1.13(B)).

### Industrial & Motor Controls
11. **DOL Motor Starter (Contactor + 3-Wire Seal-In Control)**: Start NO, Stop NC, aux NO $13-14$ seal-in loop, 3 HP motor, and green running pilot.
12. **Industrial Control Relay: Run / Standby Annunciation**: DPDT Form-C relay swapping between Red Standby (NC 12) and Green Running (NO 14) lamps.
13. **Micro PLC Automated Machine Starter**: PLC reading pushbuttons on digital input $I_1$ and driving relay output $Q_1$ to pull in the motor contactor.
14. **⚓ Marine / Industrial DOL Motor Starter (440V/220V)**: 440V feeder $	o$ 3P MCB $	o$ contactor $	o$ thermal overload relay $	o$ 3-phase motor, with a 2P control MCB, 440/220V control transformer, OLR 95-96 $	o$ STOP $	o$ START + 13-14 latch $	o$ A1-A2, and RUN / FAULT pilots.
15. **🔄 Forward-Reverse Motor Starter with Electrical Interlocking**: FOR / REV contactors with T1/T3 phase reversal, 21-22 NC cross-interlocks, overload relay and FWD / REV / STOP station.

### Appliances & Interactive Loads
14. **Electric Ventilation Fan Circuit**: Switch-controlled fan with smooth 60fps aerodynamic blade rotation animation.
15. **Air Conditioner (1.5 HP Inverter) Dedicated Circuit (PEC 4.40)**: High-load compressor branch circuit with glowing "16°C COOL" digital LED readout and motorized airflow louvers.

### Full System
16. **Complete Residential Installation (VoltLab Master Reference)**: Digital kWh meter, main disconnect, dual earth pits, 30mA RCD, SPD, 3 branch breakers, junction box, switch, lamp, socket, and TV.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+) and npm

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/jro-d/volt-lab.git
cd volt-lab

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### Production Build
```bash
npm run build
```
Creates an optimized standalone production build in `dist/`, ready for deployment on GitHub Pages, Vercel, Netlify, or any static host.

---

## 📁 Directory Structure
```text
volt-lab/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── LICENSE                             <-- MIT License
└── src/
    ├── main.tsx                        <-- React entry mount
    ├── App.tsx                         <-- Root layout & state coordinator
    ├── index.css                       <-- Tailwind & current animation keyframes
    ├── types/                          <-- Electrical, Code & Simulation types
    ├── core/                           <-- Circuit solver, wire router, code rules & schematic
    ├── data/                           <-- PEC/IEC standards, component catalog & labs
    ├── components/
    │   ├── devices/                    <-- Photorealistic vector SVG interactive devices
    │   ├── canvas/                     <-- WiringCanvas, SchematicCanvas & WireRenderer
    │   └── layout/                     <-- TopNavBar, ComponentDrawer, CodeInspectorHUD, LabModal
    └── utils/                          <-- Procedural Web Audio engine & JSON export
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
