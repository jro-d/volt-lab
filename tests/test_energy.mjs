import assert from 'node:assert/strict';
import { dev, wire, solve } from './helpers.mjs';
import { accumulateEnergy, emptyLedger, costForKwh, summarizeEnergy, ledgerToCsv, devicePower, DEFAULT_ENERGY } from '../src/core/energy.ts';

const N = { color: '#0f172a', conductorRole: 'return_neutral' };

const grid = dev('kwh_meter_1p', 'grid');
const heater = dev('appliance_water_heater', 'wh', { wattage: 1000 });
const lamp = dev('light_bulb', 'lamp', { wattage: 100, pf: 0.5 });
const wires = [
  wire('a', 'grid', 'l_out', 'wh', 'line'), wire('b', 'grid', 'n_out', 'wh', 'neutral', N),
  wire('c', 'grid', 'l_out', 'lamp', 'hot'), wire('d', 'grid', 'n_out', 'lamp', 'neutral', N),
];
const devices = [grid, heater, lamp];
const solved = solve(devices, wires);

console.log('--- Integration over simulated time ---');
{
  assert.deepEqual(devicePower(heater, solved), { p: 1000, q: 0 });
  const lp = devicePower(lamp, solved);
  assert.equal(lp.p, 100);
  assert.ok(Math.abs(lp.q - Math.sqrt(200 * 200 - 100 * 100)) < 1e-6, 'Q = sqrt(S^2 - P^2) with S = P / pf');
  assert.deepEqual(devicePower(heater, { deviceEnergized: {} }), { p: 0, q: 0 }, 'an off load takes nothing');
  assert.deepEqual(devicePower(grid, solved), { p: 0, q: 0 }, 'a meter is not a load');

  // one real hour at 1x: 1000 W heater -> 1 kWh, 100 W lamp -> 0.1 kWh
  let l = emptyLedger();
  for (let i = 0; i < 7200; i++) l = accumulateEnergy(l, devices, solved, 0.5, 1);
  assert.ok(Math.abs(l.byDevice.wh - 1000) < 0.01, `heater Wh ${l.byDevice.wh}`);
  assert.ok(Math.abs(l.byDevice.lamp - 100) < 0.01);
  assert.ok(Math.abs(l.totalWh - 1100) < 0.01);
  assert.equal(l.seconds, 3600);
  // 3600x: a day in 24 real seconds -> 24 kWh for the heater
  let day = emptyLedger();
  for (let i = 0; i < 48; i++) day = accumulateEnergy(day, devices, solved, 0.5, 3600);
  assert.ok(Math.abs(day.byDevice.wh - 24000) < 0.1, `a simulated day: ${day.byDevice.wh} Wh`);
  assert.equal(day.seconds, 86400);
  // power triangle of the whole installation
  assert.equal(day.p, 1100);
  assert.ok(Math.abs(day.s - Math.sqrt(1100 * 1100 + (Math.sqrt(200 * 200 - 100 * 100)) ** 2)) < 0.01);
  assert.ok(day.pf < 1 && day.pf > 0.9, `plant power factor ${day.pf}`);
  assert.equal(day.peakW, 1100);
  console.log('✓ kWh over real and scaled time, per-device ledger and the power triangle');
}

console.log('\n--- Tariff and cost ---');
{
  const flat = { currency: 'PHP', perKwh: 10, tiers: [] };
  assert.equal(costForKwh(25, flat), 250);
  assert.equal(costForKwh(0, flat), 0);
  // progressive: first 20 kWh at 8, next 30 at 10, above at the flat rate 12
  const tiered = { currency: 'PHP', perKwh: 12, tiers: [{ upToKwh: 20, perKwh: 8 }, { upToKwh: 50, perKwh: 10 }] };
  assert.equal(costForKwh(15, tiered), 120);
  assert.equal(costForKwh(40, tiered), 20 * 8 + 20 * 10);
  assert.equal(costForKwh(60, tiered), 20 * 8 + 30 * 10 + 10 * 12);
  assert.equal(DEFAULT_ENERGY.tariff.perKwh, 0, 'no tariff rate is bundled');
  console.log('✓ flat and progressive tariffs');
}

console.log('\n--- Summary, ranking and ledger CSV ---');
{
  let l = emptyLedger();
  for (let i = 0; i < 48; i++) l = accumulateEnergy(l, devices, solved, 0.5, 3600); // one day
  const tariff = { currency: 'PHP', perKwh: 10, tiers: [] };
  const s = summarizeEnergy(l, devices, tariff);
  assert.equal(s.simulatedHours, 24);
  assert.ok(Math.abs(s.totalKwh - 26.4) < 0.01, `26.4 kWh a day (${s.totalKwh})`);
  assert.equal(s.ranking[0].deviceId, 'wh', 'the heater is the biggest consumer');
  assert.ok(Math.abs(s.ranking[0].sharePct - 90.9) < 0.1);
  assert.equal(s.costSoFar, 264);
  assert.ok(Math.abs(s.monthKwh - 26.4 * 30) < 0.5, 'projected 30 days at the same rate');
  assert.equal(s.monthCost, 7920);
  const csv = ledgerToCsv(l, devices, tariff);
  assert.ok(csv.startsWith('Device id,Device,Energy (kWh),Share (%),Cost (PHP)'));
  assert.ok(csv.includes('TOTAL') && csv.includes('Projected 30 days'));
  assert.equal(summarizeEnergy(emptyLedger(), devices, tariff).monthKwh, null, 'no projection before any energy');
  console.log('✓ per-device ranking, shares, cost, 30-day projection and CSV');
}

console.log('\nENERGY TESTS PASSED');
