import assert from 'node:assert/strict';
import { dev, wire } from './helpers.mjs';
import { numberWires, terminalStrips, terminalStripSvg, wireListCsv, refTag, DEFAULT_NUMBERING } from '../src/core/wireNumbering.ts';
import { wireCircuits } from '../src/core/loadSchedule.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };

const devices = [
  dev('kwh_meter_1p', 'grid'),
  dev('mcb_1p', 'q1', { ratedAmps: 16, tag: 'Q1' }),
  dev('mcb_1p', 'q2', { ratedAmps: 16, tag: 'Q2' }),
  dev('light_bulb', 'l1'),
  dev('light_bulb', 'l2'),
  dev('terminal_block', 'xb', { tag: 'X1' }),
];
const wires = [
  wire('w1', 'grid', 'l_out', 'q1', 'in'),
  wire('w2', 'q1', 'out', 'l1', 'hot'),
  wire('w3', 'grid', 'l_out', 'q2', 'in'),
  wire('w4', 'q2', 'out', 'xb', 'a1'),
  wire('w5', 'xb', 'b1', 'l2', 'hot'),
  wire('w6', 'grid', 'n_out', 'l1', 'neutral', N),
];

console.log('--- Numbering schemes ---');
{
  const seq = numberWires(devices, wires, 'sequential', 'W');
  assert.deepEqual(new Set(Object.values(seq)), new Set(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']), 'every wire gets a unique sequential number');
  assert.equal(Object.keys(seq).length, wires.length);
  const again = numberWires(devices, wires, 'sequential', 'W');
  assert.deepEqual(seq, again, 'numbering is stable');
  assert.equal(numberWires(devices, wires, 'sequential', 'CBL-')['w1'].startsWith('CBL-'), true, 'the prefix is editable');

  const ft = numberWires(devices, wires, 'from-to', 'W');
  assert.equal(ft.w2, 'Q1.out-l1.hot', 'from-to uses the reference tags (a device with no tag uses its id)');
  assert.equal(refTag(devices[1]), 'Q1');

  const pc = numberWires(devices, wires, 'per-circuit', 'C');
  const circuits = wireCircuits(devices, wires);
  assert.ok(circuits.w2, 'the wire between the lamp and its breaker is on a circuit');
  assert.ok(circuits.w4 && circuits.w4 === circuits.w5, 'the wires between a load and its breaker (through a terminal block) share a circuit');
  assert.ok(pc.w2.startsWith(`C${circuits.w2}.`), `per circuit: ${pc.w2}`);
  assert.notEqual(circuits.w2, circuits.w5, 'two breakers, two circuits');
  assert.ok(pc.w1.startsWith('C0.'), 'supply-side wires are on no load path');
  assert.equal(new Set(Object.values(pc)).size, wires.length, 'labels stay unique inside a circuit');
  console.log('✓ sequential, from-to and per-circuit numbering with an editable prefix');
}

console.log('\n--- Terminal strips ---');
{
  const strips = terminalStrips(devices, wires.map((w) => ({ ...w, label: w.id.toUpperCase() })));
  assert.equal(strips.length, 1);
  const s = strips[0];
  assert.equal(s.tag, 'X1');
  const pole1 = s.rows.find((r) => r.pole === '1');
  assert.deepEqual(pole1.incoming, [{ wire: 'W4', destination: 'Q2:out' }], 'the incoming wire and where it comes from');
  assert.deepEqual(pole1.outgoing, [{ wire: 'W5', destination: 'l2:hot' }], 'the outgoing wire and where it goes');
  assert.equal(s.rows.find((r) => r.pole === '2').incoming.length, 0, 'unused poles are empty');
  const svg = terminalStripSvg(s, { ...DEFAULT_NUMBERING.titleBlock, drawnBy: 'A. Student', checkedBy: 'B. Teacher', date: '2026-11-19', sheet: '1 / 2' }, 'Demo');
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'a standalone SVG');
  assert.ok(svg.includes('A. Student') && svg.includes('B. Teacher') && svg.includes('1 / 2'), 'the title block is on the drawing');
  assert.ok(svg.includes('Q2:out'), 'the destinations are drawn');
  assert.ok(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg', '')), 'no network references');
  const bad = terminalStripSvg({ ...s, tag: '<X&1>' }, DEFAULT_NUMBERING.titleBlock, 'p');
  assert.ok(!bad.includes('<X&1>'), 'text is escaped');
  console.log('✓ terminal strip table, SVG with title block, escaped text');
}

console.log('\n--- Wire list CSV ---');
{
  const csv = wireListCsv(devices, wires.map((w) => ({ ...w, label: 'A,B' })));
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Label,From,To,Gauge,Length (m)');
  assert.equal(lines.length, wires.length + 1);
  assert.ok(lines[1].startsWith('"A,B"'), 'commas are quoted');
  console.log('✓ wire list CSV');
}

console.log('\nWIRE NUMBERING TESTS PASSED');
