// Runs every tests/test_*.mjs. The tests import the TypeScript sources directly, and those use
// extensionless imports that Node cannot resolve on its own, so each test is bundled with esbuild first.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(path.join(tmpdir(), 'wire-tests-'));
const files = readdirSync(here).filter((f) => /^test_.*\.mjs$/.test(f)).sort();

let failed = 0;
for (const file of files) {
  const outfile = path.join(tmp, file);
  await build({ entryPoints: [path.join(here, file)], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
  console.log(`\n=== ${file} ===`);
  const run = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
  if (run.status !== 0) {
    failed++;
    console.error(`✗ ${file} failed (exit ${run.status})`);
  }
}
rmSync(tmp, { recursive: true, force: true });

console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
