import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';

console.log('--- Testing All Labs & Industrial Automation Features ---');

// 1. Verify all 9 labs solve without crash
console.log(`Found ${LAB_LESSONS.length} lab lessons.`);
for (const lab of LAB_LESSONS) {
  const solved = solveCircuit(lab.project.devices, lab.project.wires, lab.project.codeStandard || 'PEC', lab.project.gridVoltage || 230);
  console.log(`✓ Lab [${lab.id}] (${lab.title}): Total Watts = ${solved.totalWatts}W, Active Nodes = ${Object.keys(solved.nodePotentials).length}`);
}

// 2. Test DOL Motor Starter with Seal-In Circuit
console.log('\n--- Testing DOL Motor Starter ---');
const dolLab = LAB_LESSONS.find(l => l.id === 'lab-dol-starter');
if (!dolLab) throw new Error('DOL lab not found');

// Initial state (Start button not pressed)
const initSolved = solveCircuit(dolLab.project.devices, dolLab.project.wires, 'PEC', 230);
const motorDevInit = dolLab.project.devices.find(d => d.type === 'motor_ac_industrial');
const contactorInit = dolLab.project.devices.find(d => d.type === 'contactor_3p');
console.log('Initial Motor Running:', motorDevInit.state.running, 'Contactor Coil Energized:', contactorInit.state.coilEnergized);

// Press Start Button
const startStation = dolLab.project.devices.find(d => d.type === 'push_button_station');
startStation.state.startPressed = true;
const runningSolved = solveCircuit(dolLab.project.devices, dolLab.project.wires, 'PEC', 230);
const motorDevRunning = dolLab.project.devices.find(d => d.type === 'motor_ac_industrial');
const contactorRunning = dolLab.project.devices.find(d => d.type === 'contactor_3p');
const pilotRunning = dolLab.project.devices.find(d => d.type === 'pilot_light_indicator');

console.log('After Start Pressed:');
console.log('  Contactor Coil Energized:', contactorRunning.state.coilEnergized);
console.log('  Contactor Contacts Closed:', contactorRunning.state.closed);
console.log('  Motor Running:', motorDevRunning.state.running);
console.log('  Pilot Lit:', pilotRunning.state.lit);
console.log('  Total Circuit Watts:', runningSolved.totalWatts);

if (!motorDevRunning.state.running) {
  throw new Error('FAIL: Motor should be running when Start is pressed!');
}
if (!pilotRunning.state.lit) {
  throw new Error('FAIL: Pilot should be lit when Motor is running!');
}

// Trip E-Stop
const estopDev = dolLab.project.devices.find(d => d.type === 'push_button_estop');
estopDev.state.latched = true;
const stoppedSolved = solveCircuit(dolLab.project.devices, dolLab.project.wires, 'PEC', 230);
console.log('After E-Stop Latched:');
console.log('  Contactor Coil Energized:', contactorRunning.state.coilEnergized);
console.log('  Motor Running:', motorDevRunning.state.running);
if (motorDevRunning.state.running) {
  throw new Error('FAIL: Motor should STOP when E-Stop is latched!');
}

// 3. Test Relay Changeover Signaling
console.log('\n--- Testing Relay Run / Standby Changeover ---');
const relayLab = LAB_LESSONS.find(l => l.id === 'lab-relay-signaling');
const swDev = relayLab.project.devices.find(d => d.type === 'switch_1gang');
const greenPl = relayLab.project.devices.find(d => d.id === 'pl_green_run');
const redPl = relayLab.project.devices.find(d => d.id === 'pl_red_standby');

// Switch is OFF: Red Standby should be LIT, Green should be OFF
swDev.state.closed = false;
solveCircuit(relayLab.project.devices, relayLab.project.wires, 'PEC', 230);
console.log('Switch OFF: Red Pilot Lit =', redPl.state.lit, ', Green Pilot Lit =', greenPl.state.lit);
if (!redPl.state.lit || greenPl.state.lit) {
  throw new Error('FAIL: Standby Red should be LIT and Green OFF when switch is open');
}

// Switch is ON: Green Running should be LIT, Red should be OFF
swDev.state.closed = true;
solveCircuit(relayLab.project.devices, relayLab.project.wires, 'PEC', 230);
console.log('Switch ON: Red Pilot Lit =', redPl.state.lit, ', Green Pilot Lit =', greenPl.state.lit);
if (!greenPl.state.lit || redPl.state.lit) {
  throw new Error('FAIL: Green should be LIT and Red OFF when switch is closed');
}

// 4. Test Micro PLC Automation Logic
console.log('\n--- Testing Micro PLC Machine Controller ---');
const plcLab = LAB_LESSONS.find(l => l.id === 'lab-plc-automation');
const plcDev = plcLab.project.devices.find(d => d.type === 'plc_micro_controller');
const plcPb = plcLab.project.devices.find(d => d.type === 'push_button_station');
const plcContactor = plcLab.project.devices.find(d => d.type === 'contactor_3p');
const plcMotor = plcLab.project.devices.find(d => d.type === 'motor_ac_industrial');
const plcPilot = plcLab.project.devices.find(d => d.type === 'pilot_light_indicator');

// Initial state (Start not pressed)
solveCircuit(plcLab.project.devices, plcLab.project.wires, 'PEC', 230);
console.log('PLC Initial: I1 =', plcDev.state.plcInputs?.i1, ', Q1 =', plcDev.state.plcOutputs?.q1, ', Motor Running =', plcMotor.state.running);

// Press Start on PLC Station
plcPb.state.startPressed = true;
const plcSolved = solveCircuit(plcLab.project.devices, plcLab.project.wires, 'PEC', 230);
console.log('PLC Start Pressed: I1 =', plcDev.state.plcInputs?.i1, ', Q1 =', plcDev.state.plcOutputs?.q1, ', Contactor Closed =', plcContactor.state.closed, ', Motor Running =', plcMotor.state.running, ', Pilot Lit =', plcPilot.state.lit);

if (!plcDev.state.plcOutputs?.q1) throw new Error('FAIL: PLC Output Q1 should be energized when I1 is high');
if (!plcContactor.state.closed) throw new Error('FAIL: Contactor should pull in when Q1 closes');
if (!plcMotor.state.running) throw new Error('FAIL: Motor should run when contactor closes');
if (!plcPilot.state.lit) throw new Error('FAIL: Pilot should light up when motor runs');

console.log('\nALL INDUSTRIAL & AUTOMATION TESTS PASSED PERFECTLY!');
