import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { getDeviceTerminalPosition } from '../src/core/wireRouter.ts';

console.log('Testing WireWise 364 Features...');

// Test 1: Lab 5 (3-way switch circuit) current propagation
const lab5 = LAB_LESSONS.find(l => l.id === 'lab-lighting-2way');
if (!lab5) {
  console.error('FAIL: lab-lighting-2way not found');
  process.exit(1);
}

const solvedLab5 = solveCircuit(lab5.project.devices, lab5.project.wires, 'PEC', 230);
console.log('Lab 5 Total Watts:', solvedLab5.totalWatts);
console.log('Lab 5 Total Amps:', solvedLab5.totalAmps);

let wiresWithCurrent = 0;
let reverseCount = 0;
let forwardCount = 0;
for (const w of lab5.project.wires) {
  const current = solvedLab5.wireCurrents[w.id] || 0;
  const dir = solvedLab5.wireFlowDirections[w.id];
  console.log(`Wire ${w.id}: Current = ${current.toFixed(2)}A, Flow = ${dir}, Color = ${w.color}`);
  if (current > 0.05) wiresWithCurrent++;
  if (dir === 'reverse') reverseCount++;
  if (dir === 'forward') forwardCount++;
}

console.log(`Wires with current: ${wiresWithCurrent} / ${lab5.project.wires.length}`);
console.log(`Forward wires: ${forwardCount}, Reverse wires: ${reverseCount}`);

if (wiresWithCurrent === 0) {
  console.error('FAIL: No current flowed through 3-way circuit!');
  process.exit(1);
}

// Test 2: Lab 8 (Splice tutorial with J-Box and Wire Nuts)
const lab8 = LAB_LESSONS.find(l => l.id === 'lab-splice-tutorial');
if (!lab8) {
  console.error('FAIL: lab-splice-tutorial not found');
  process.exit(1);
}
const solvedLab8 = solveCircuit(lab8.project.devices, lab8.project.wires, 'PEC', 230);
console.log('Lab 8 Total Watts:', solvedLab8.totalWatts);
console.log('Lab 8 Total Amps:', solvedLab8.totalAmps);

// Test 3: Device Rotation on Terminal Coordinates
const testDev = {
  id: 'test_mcb',
  type: 'mcb_1p',
  x: 100,
  y: 200,
  width: 44,
  height: 96,
  rotation: 90,
  terminals: [
    { id: 'in', name: 'Line In', type: 'phase', relX: 0.5, relY: 0.08 },
    { id: 'out', name: 'Load Out', type: 'load', relX: 0.5, relY: 0.92 }
  ]
};

const topTermPos = getDeviceTerminalPosition(testDev, testDev.terminals[0]);
console.log('Rotated 90 terminal pos:', topTermPos);

if (topTermPos.dir !== 'right') {
  console.error('FAIL: Expected rotated direction to be "right", got:', topTermPos.dir);
  process.exit(1);
}

console.log('ALL FEATURE TESTS PASSED SUCCESSFULLY!');
