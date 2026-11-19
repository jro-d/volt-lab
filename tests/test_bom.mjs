import assert from 'node:assert/strict';
import { dev, wire } from './helpers.mjs';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { buildBom, bomToCsv, DEFAULT_BOM, ratingLabel } from '../src/core/bom.ts';

console.log('--- Hand-checked bill ---');
{
  const devices = [
    dev('mcb_1p', 'q1', { ratedAmps: 16, tripCurve: 'C' }),
    dev('mcb_1p', 'q2', { ratedAmps: 16, tripCurve: 'C' }),
    dev('mcb_1p', 'q3', { ratedAmps: 20, tripCurve: 'C' }),
    dev('light_bulb', 'l1'),
  ];
  const wires = [
    wire('a', 'q1', 'out', 'l1', 'hot', { wireGauge: '2.5 mm²', lengthMeters: 10 }),
    wire('b', 'q2', 'out', 'l1', 'neutral', { wireGauge: '2.5 mm²', lengthMeters: 5 }),
    wire('c', 'q3', 'out', 'l1', 'hot', { wireGauge: '4.0 mm²', lengthMeters: 20 }),
  ];
  let bom = buildBom(devices, wires);
  const mcb16 = bom.lines.find((l) => l.description.includes('16 A'));
  const mcb20 = bom.lines.find((l) => l.description.includes('20 A'));
  assert.equal(mcb16.quantity, 2, 'two 16 A breakers are one line');
  assert.equal(mcb20.quantity, 1, 'the 20 A breaker is its own line');
  const cu25 = bom.lines.find((l) => l.key === 'wire:2.5 mm²');
  assert.equal(cu25.quantity, 16.5, '15 m of 2.5 mm2 plus 10 % waste');
  assert.equal(bom.lines.find((l) => l.key === 'wire:4.0 mm²').quantity, 22, '20 m plus 10 %');
  assert.equal(bom.subtotal, 0, 'nothing is priced yet');
  assert.equal(bom.unpriced, bom.lines.length, 'no price is bundled');
  assert.ok(bom.lines.every((l) => l.unitPrice === null && l.amount === null));

  // prices typed in by the user: 16 A = 100, 20 A = 120, lamp = 50, 2.5 mm2 = 20 / m, 4 mm2 = 30 / m
  const prices = { [mcb16.key]: 100, [mcb20.key]: 120, [bom.lines.find((l) => l.key.startsWith('device:light_bulb')).key]: 50, 'wire:2.5 mm²': 20, 'wire:4.0 mm²': 30 };
  bom = buildBom(devices, wires, { prices, contingencyPct: 10, vatPct: 12 });
  // 2 x 100 + 120 + 50 + 16.5 x 20 + 22 x 30 = 200 + 120 + 50 + 330 + 660 = 1360
  assert.equal(bom.subtotal, 1360);
  assert.equal(bom.subtotalByCategory['Conductors'], 990);
  assert.equal(bom.contingency, 136);
  assert.equal(bom.vat, 179.52, 'VAT on (subtotal + contingency): 1496 x 12 %');
  assert.equal(bom.total, 1675.52);
  assert.equal(bom.unpriced, 0);
  assert.equal(bom.currency, 'PHP');
  console.log('✓ grouping by rating, waste allowance, subtotals, contingency, VAT and the total');
}

console.log('\n--- Allowances and CSV ---');
{
  const devices = [dev('light_bulb', 'l1')];
  const bom = buildBom(devices, [], { conduitM: 12, boxCount: 3, prices: { 'allowance:conduit': 25, 'allowance:box': 40 }, contingencyPct: 0, vatPct: 0 });
  assert.equal(bom.lines.find((l) => l.key === 'allowance:conduit').amount, 300);
  assert.equal(bom.lines.find((l) => l.key === 'allowance:box').amount, 120);
  assert.equal(bom.total, 420);
  const csv = bomToCsv(bom);
  assert.ok(csv.startsWith('Category,Description,Qty,Unit,Unit price (PHP),Amount (PHP)'));
  assert.ok(csv.includes('TOTAL'));
  assert.equal(DEFAULT_BOM.currency, 'PHP', 'PHP is the default currency');
  assert.equal(buildBom(devices, [], {}).lines.some((l) => l.category === 'Allowances'), false, 'allowances only appear when entered');
  assert.equal(ratingLabel(dev('rcd_2p', 'r', { ratedAmps: 63, sensitivityMa: 30 })), '63 A, 30 mA');
  console.log('✓ conduit and box allowances, CSV header and total');
}

console.log('\n--- A real lab ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-1-reference');
  const p = JSON.parse(JSON.stringify(lab.project));
  const bom = buildBom(p.devices, p.wires);
  assert.ok(bom.lines.length > 10, `the master lab has many lines (${bom.lines.length})`);
  assert.equal(bom.lines.filter((l) => l.unit === 'pcs').reduce((s, l) => s + l.quantity, 0), p.devices.length, 'every device is on the bill');
  const metres = p.wires.reduce((s, w) => s + w.lengthMeters, 0);
  const billed = bom.lines.filter((l) => l.unit === 'm').reduce((s, l) => s + l.quantity, 0);
  assert.ok(Math.abs(billed - metres * 1.1) < 0.5, `conductor metres plus 10 %: ${billed} vs ${metres * 1.1}`);
  console.log('✓ every device and conductor metre is on the bill');
}

console.log('\nBOM TESTS PASSED');
