import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LAB_LESSONS } from '../src/data/labTemplates.ts';
import { migrateLegacyProject } from '../src/utils/projectMigration.ts';
import { encodeShare, decodeShare, isShareHash, lzwCompress, lzwDecompress, SHARE_PREFIX, SHARE_WARN_LENGTH } from '../src/utils/shareLink.ts';

// the tests run from the project folder (npm test); they are bundled elsewhere, so import.meta.url is not usable
const root = pathToFileURL(process.cwd() + '/');
const clone = (x) => JSON.parse(JSON.stringify(x));

console.log('--- LZW fallback ---');
{
  const text = new TextEncoder().encode('{"a":"hello hello hello hello","b":[1,2,3,1,2,3,1,2,3]}'.repeat(40));
  const packed = lzwCompress(text);
  assert.ok(packed.length < text.length, 'repetitive text shrinks');
  assert.deepEqual(Array.from(lzwDecompress(packed)), Array.from(text), 'round trip');
  assert.equal(lzwDecompress(lzwCompress(new Uint8Array(0))).length, 0, 'empty input');
  const bin = Uint8Array.from({ length: 600 }, (_, i) => (i * 37) % 256);
  assert.deepEqual(Array.from(lzwDecompress(lzwCompress(bin))), Array.from(bin), 'arbitrary bytes');
  assert.throws(() => lzwDecompress(new Uint8Array([1, 2, 3])), /Corrupt/);
  console.log('✓ the dependency-free fallback round-trips and rejects garbage');
}

console.log('\n--- Share links ---');
{
  const lab = LAB_LESSONS.find((l) => l.id === 'lab-1-reference');
  const project = clone(lab.project);
  for (const force of [false, true]) {
    const r = await encodeShare(project, force);
    assert.ok(r.hash.startsWith(SHARE_PREFIX), 'starts with #share=');
    assert.equal(r.method, force ? 'lzw' : 'deflate');
    assert.ok(/^#share=[dl][A-Za-z0-9_-]+$/.test(r.hash), 'URL-safe characters only');
    assert.ok(isShareHash(r.hash));
    const back = await decodeShare(r.hash);
    assert.deepEqual(back, project, `${r.method}: the decoded project equals the original`);
    assert.ok(r.length < JSON.stringify(project).length, 'the link is smaller than the raw JSON');
    assert.equal(r.tooLong, r.length > SHARE_WARN_LENGTH);
  }
  // goes through the same migration as a file import
  const decoded = await decodeShare((await encodeShare(project)).hash);
  const migrated = migrateLegacyProject(decoded.devices, decoded.wires);
  assert.equal(migrated.devices.length, project.devices.length, 'migration keeps every device');
  assert.equal(migrated.wires.length, project.wires.length);

  // small projects stay short, big ones are flagged
  const tiny = await encodeShare({ devices: [], wires: [], title: 'x' });
  assert.equal(tiny.tooLong, false);
  const huge = await encodeShare({ devices: Array.from({ length: 4000 }, (_, i) => ({ id: `d${i}`, v: Math.sin(i) * 1e6 })), wires: [] });
  assert.equal(huge.tooLong, true, 'a very large project is flagged so the user exports JSON instead');
  console.log(`✓ both methods round-trip the master lab (${(await encodeShare(project)).length} characters); the size warning works`);
}

console.log('\n--- Bad links ---');
{
  await assert.rejects(() => decodeShare('#share=xabc'), /Not a WireWise share link/);
  await assert.rejects(() => decodeShare('#share=l@@@@'), /Corrupt/);
  await assert.rejects(() => decodeShare('#share=dAAAA'), /Corrupt/);
  const r = await encodeShare({ a: 1 }, true);
  await assert.rejects(() => decodeShare(r.hash.slice(0, -3) + 'zz'), /Corrupt|Unexpected|JSON/);
  assert.equal(isShareHash('#share='), false);
  assert.equal(isShareHash('#other'), false);
  console.log('✓ wrong prefix, corrupt payloads and truncated links are rejected with a message');
}

console.log('\n--- Offline install files ---');
{
  const manifest = JSON.parse(readFileSync(new URL('public/manifest.webmanifest', root), 'utf8'));
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) assert.ok(manifest[k], `manifest.${k}`);
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url.startsWith('.') && manifest.scope.startsWith('.'), 'relative start_url and scope work under a GitHub Pages sub-path');
  assert.ok(manifest.icons.every((i) => readFileSync(new URL(`public/${i.src}`, root), 'utf8').length > 10), 'icon files exist');
  const sw = readFileSync(new URL('public/sw.js', root), 'utf8');
  assert.ok(sw.includes("addEventListener('fetch'") && sw.includes('caches.open'), 'the worker caches fetches');
  assert.ok(sw.includes('url.origin !== self.location.origin'), 'cross-origin requests are left alone');
  assert.ok(!/method:\s*['"]POST/i.test(sw) && !sw.includes('sendBeacon'), 'the worker sends no data anywhere');
  const vite = readFileSync(new URL('vite.config.ts', root), 'utf8');
  assert.match(vite, /base:\s*'\.\/'/, "base './' keeps the service worker scope right on GitHub Pages");
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.ok(html.includes('rel="manifest"') && html.includes('theme-color'));
  console.log('✓ manifest, relative scope, worker caching and no outgoing data');
}

console.log('\nSHARE LINK TESTS PASSED');
