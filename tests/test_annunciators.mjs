import assert from 'node:assert/strict';
import { dev, wire, run, byId } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';

const clone = (x) => JSON.parse(JSON.stringify(x));

console.log('--- Annunciators ---');
{
  // 230 V AC beacon + horn, 24 V DC tower light
  const devices = [
    dev('source_3phase_440v', 'src', { lineVoltage: 440 }),
    dev('control_transformer', 'tc1'),
    dev('beacon', 'hl', { supply: 'ac230' }),
    dev('buzzer_horn', 'ha', { supply: 'ac230' }),
    dev('psu_24vdc', 'ps1'),
    dev('tower_light', 'tw', { supply: 'dc24' }),
  ];
  const wires = [
    wire('h1', 'src', 'l1', 'tc1', 'h1'), wire('h2', 'src', 'l2', 'tc1', 'h2'),
    wire('b1', 'tc1', 'x1', 'hl', 'a1'), wire('b2', 'tc1', 'x2', 'hl', 'a2'),
    wire('z1', 'tc1', 'x1', 'ha', 'a1'), wire('z2', 'tc1', 'x2', 'ha', 'a2'),
    wire('p1', 'tc1', 'x1', 'ps1', 'in_l'), wire('p2', 'tc1', 'x2', 'ps1', 'in_n'),
    wire('t1', 'ps1', 'v_pos', 'tw', 'r'), wire('t2', 'ps1', 'v_pos', 'tw', 'g'), wire('t3', 'ps1', 'v_neg', 'tw', 'com'),
  ];
  const d = run(devices, wires, 4, 0.5, { volts: 440 });
  assert.equal(byId(d, 'hl').state.active, true, 'AC beacon lit');
  assert.equal(byId(d, 'ha').state.active, true, 'AC horn sounding');
  assert.deepEqual(byId(d, 'tw').state.segments, { r: true, a: false, g: true }, 'only wired segments light');
  console.log('✓ AC beacon and horn power up; DC tower light lights only the wired segments');

  // an AC annunciator on the 24 V rail does not work (it is wired to a DC net) ... and a DC horn on AC does not sound
  byId(d, 'ha').state.supply = 'dc24';
  const d2 = run(d, wires, 3, 0.5, { volts: 440 });
  assert.equal(byId(d2, 'ha').state.active, false, 'a 24 V DC horn on the 220 V AC rail never sounds');
  console.log('✓ supply type must match the wiring');
}
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-overload-alarm');
  assert.ok(lab && lab.project.targetLadder?.length);
  const devices = clone(lab.project.devices);
  const wires = clone(lab.project.wires);
  let d = run(devices, wires, 3, 0.5, { standard: 'PEC', volts: 440 });
  assert.equal(byId(d, 'mdol_hl1').state.active, false);
  assert.equal(byId(d, 'mdol_ha1').state.active, false);
  byId(d, 'mdol_f2').state.tripped = true;
  d = run(d, wires, 3, 0.5, { standard: 'PEC', volts: 440 });
  assert.equal(byId(d, 'mdol_hl1').state.active, true, 'beacon on overload');
  assert.equal(byId(d, 'mdol_ha1').state.active, true, 'horn on overload');
  console.log('✓ overload alarm lab: silent when healthy, beacon and horn on a trip');
}
console.log('\nANNUNCIATOR TESTS PASSED');
