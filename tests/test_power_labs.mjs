import assert from 'node:assert/strict';
import { run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { solveCircuit } from '../src/core/circuitSolver.ts';
import { analyzeCodeCompliance } from '../src/core/codeCompliance.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));
const lab = (id) => {
  const l = LAB_LESSONS.find((x) => x.id === id);
  assert.ok(l, `lab ${id} exists`);
  return clone(l.project);
};
const go = (p, steps, opts) => {
  p.devices = run(p.devices, p.wires, steps, 0.5, { volts: p.gridVoltage, ...opts });
  return p;
};

console.log('--- Lab: standby supply chain ---');
{
  const p = lab('lab-power-standby-chain');
  const lamps = () => ['lamp1', 'lamp2'].every((id) => byId(p.devices, id).state.lit);
  go(p, 4);
  assert.equal(lamps(), true, 'lamps on from the utility');
  assert.equal(byId(p.devices, 'ups').state.onBattery, false);

  byId(p.devices, 'mains').state.closed = false; // utility lost
  go(p, 6);
  assert.equal(byId(p.devices, 'ups').state.onBattery, true, 'UPS rides through the outage');
  assert.equal(lamps(), true, 'critical lamps stay on');
  const soc = byId(p.devices, 'ups').state.socPct;
  assert.ok(soc < 100);

  byId(p.devices, 'gen').state.runRequested = true; // start the generator
  go(p, 8);
  assert.equal(byId(p.devices, 'gen').state.running, true);
  byId(p.devices, 'mts').state.position = 'off'; // break before make
  go(p, 2);
  assert.equal(byId(p.devices, 'ups').state.onBattery, true, 'at 0 the UPS carries the load alone');
  byId(p.devices, 'mts').state.position = 'generator';
  go(p, 8);
  assert.equal(byId(p.devices, 'ups').state.onBattery, false, 'on the generator the UPS is back on line');
  assert.ok(byId(p.devices, 'ups').state.inputLive);
  assert.equal(lamps(), true);
  console.log(`✓ outage ridden through on battery (${soc} %), 0 position carried by the UPS, generator takes over via II`);
}

console.log('\n--- Lab: PV with net metering ---');
{
  const p = lab('lab-pv-net-metering');
  go(p, 12);
  assert.equal(byId(p.devices, 'inv').state.status, 'EXPORTING');
  assert.ok(byId(p.devices, 'net').state.exportW > 1000, 'surplus exported');
  byId(p.devices, 'pv').state.irradiance = 30;
  go(p, 4);
  assert.ok(byId(p.devices, 'net').state.importW > 0, 'import when the PV is below the load');
  byId(p.devices, 'pv').state.irradiance = 100;
  byId(p.devices, 'mains').state.closed = false;
  go(p, 4);
  assert.equal(byId(p.devices, 'inv').state.status, 'ANTI-ISLANDING: GRID LOST');
  assert.equal(!!byId(p.devices, 'wh').state.powered, false);
  console.log('✓ export in full sun, import when cloudy, anti-islanding on grid loss');
}

console.log('\n--- Lab: power factor correction ---');
{
  const p = lab('lab-power-factor-correction');
  go(p, 16);
  const c = byId(p.devices, 'pfc').state;
  assert.ok(c.stepsCmd >= 1 && c.pf >= 0.95, `PF ${c.pf} with ${c.stepsCmd} step(s)`);
  assert.equal(byId(p.devices, 'bank').state.stepsOn, c.stepsCmd);
  console.log(`✓ lagging plant corrected to ${c.pf} with ${c.stepsCmd} step(s)`);
}

console.log('\n--- Lab: marine IT system with shore box ---');
{
  const p = lab('lab-marine-it-shore');
  const lampsOf = () => ['lamp1', 'lamp2', 'lamp3'].map((k) => byId(p.devices, 'gd').state[k]);
  go(p, 3);
  assert.equal(byId(p.devices, 'box').state.seqOk, true);
  assert.deepEqual(lampsOf(), ['dim', 'dim', 'dim']);
  assert.equal(!!byId(p.devices, 'pump').state.running, true, 'the pump runs from the transformer secondary');
  assert.equal(byId(p.devices, 't1').state.secondaryUnloadedV, 220);

  byId(p.devices, 'f1').state.closed = true;
  go(p, 2);
  assert.deepEqual(lampsOf(), ['dark', 'bright', 'bright']);
  assert.equal(byId(p.devices, 'gd').state.faultPhase, 'L1');
  const sol = solveCircuit(p.devices, p.wires, 'PEC', 440);
  assert.equal(sol.sparks.length, 0, 'the first earth fault does not short-circuit the IT system');
  assert.equal(!!byId(p.devices, 'pump').state.running, true, 'the pump keeps running on the first fault');

  byId(p.devices, 'f2').state.closed = true;
  const sol2 = solveCircuit(p.devices, p.wires, 'PEC', 440);
  assert.ok(sol2.sparks.length > 0, 'two earthed lines are a short circuit');
  console.log('✓ healthy lamps even; first earth fault: L1 lamp out, nothing trips, pump runs; second fault: short circuit');

  // Swap two shore wires: the sequence lamp goes red
  const q = lab('lab-marine-it-shore');
  for (const w of q.wires) {
    if (w.fromDeviceId === 'shore' && w.toDeviceId === 'box' && w.toTerminalId === 'in_l2') w.toTerminalId = 'in_l3';
    else if (w.fromDeviceId === 'shore' && w.toDeviceId === 'box' && w.toTerminalId === 'in_l3') w.toTerminalId = 'in_l2';
  }
  go(q, 3);
  assert.equal(byId(q.devices, 'box').state.seqFault, 'WRONG SEQUENCE');
  console.log('✓ swapped shore wires: WRONG SEQUENCE');
}

console.log('\n--- Lab: generator paralleling ---');
{
  const p = lab('lab-generator-sync');
  const ok = () => !!byId(p.devices, 'ok').state.lit;
  for (const id of ['ga', 'gb']) byId(p.devices, id).state.runRequested = true;
  go(p, 10);
  let sy = byId(p.devices, 'sy').state;
  assert.equal(sy.status === 'INCOMING FAST', true, `G2 fast: ${sy.status}`);
  assert.equal(ok(), false, 'no permissive while slipping');

  byId(p.devices, 'gb').state.freqOffsetHz = 0.05; // trim G2 speed
  let sawSync = false;
  for (let i = 0; i < 260 && !sawSync; i++) {
    go(p, 1);
    sawSync = byId(p.devices, 'sy').state.inSync;
  }
  assert.equal(sawSync, true, 'the needle passes through the sync window');
  go(p, 0);
  assert.equal(byId(p.devices, 'sy').state.inSync, true);
  console.log('✓ the needle slips while G2 is fast, then reaches the sync window after trimming the speed');

  // Close the breaker, then G2 starts motoring: the reverse power relay trips
  byId(p.devices, 'qb').state.closed = true;
  byId(p.devices, 'gb').state.motoring = true;
  go(p, 10);
  assert.equal(byId(p.devices, 'rp').state.tripped, true, 'reverse power relay trips after the delay');
  assert.equal(!!byId(p.devices, 'rev').state.lit, true, 'REVERSE POWER lamp lit');
  console.log('✓ paralleled set motoring: reverse power relay trips');
}

console.log('\n--- Lab: preferential trip ---');
{
  const p = lab('lab-preferential-trip');
  byId(p.devices, 'gen').state.runRequested = true;
  go(p, 18);
  assert.equal(byId(p.devices, 'pt').state.tripped, true);
  assert.equal(byId(p.devices, 'q2').state.tripped, true, 'non-essential feeder shed');
  assert.equal(!!byId(p.devices, 'gen').state.overloaded, false);
  assert.equal(!!byId(p.devices, 'm1').state.running, true, 'essential load keeps running');
  assert.equal(!!byId(p.devices, 'm2').state.running, false);

  const bare = lab('lab-preferential-trip');
  bare.devices = bare.devices.filter((d) => d.id !== 'pt');
  bare.wires = bare.wires.filter((w) => w.fromDeviceId !== 'pt' && w.toDeviceId !== 'pt');
  byId(bare.devices, 'gen').state.runRequested = true;
  go(bare, 18);
  assert.equal(byId(bare.devices, 'gen').state.overloaded, true, 'without the relay the set trips and both loads are lost');
  console.log('✓ relay sheds the feeder before the set trips; without it the set trips on overload');
}

console.log('\n--- Compliance of the new labs ---');
for (const id of ['lab-power-standby-chain', 'lab-pv-net-metering', 'lab-power-factor-correction', 'lab-marine-it-shore', 'lab-generator-sync', 'lab-preferential-trip']) {
  const p = lab(id);
  const sol = solveCircuit(p.devices, p.wires, p.codeStandard, p.gridVoltage);
  const errors = analyzeCodeCompliance(p.devices, p.wires, sol, p.codeStandard, p.gridVoltage).violations.filter((v) => v.severity === 'error');
  assert.equal(errors.length, 0, `${id}: ${errors.map((e) => e.title).join('; ')}`);
}
console.log('✓ no compliance errors in the batch 3.2 labs');
console.log('POWER LABS TESTS PASSED');
