import assert from 'node:assert/strict';
import { readEmbeddedProject, EMBEDDED_PROJECT_ID, LEGACY_EMBEDDED_PROJECT_ID } from '../src/utils/embeddedProject.ts';
import { readSavedTheme, saveTheme, THEME_KEY, LEGACY_THEME_KEY } from '../src/utils/themeStorage.ts';
import { migrateLegacyProject } from '../src/utils/projectMigration.ts';

console.log('--- VoltLab -> WireWise compatibility ---');

const project = { title: 'T', devices: [], wires: [] };
const fakeDoc = (id, text) => ({ getElementById: (x) => (x === id ? { textContent: text } : null) });

assert.equal(EMBEDDED_PROJECT_ID, 'wirewise-embedded-project');
assert.equal(LEGACY_EMBEDDED_PROJECT_ID, 'voltlab-embedded-project');
assert.deepEqual(readEmbeddedProject(fakeDoc(EMBEDDED_PROJECT_ID, JSON.stringify(project))), project);
console.log('✓ embedded project with the new marker opens');
assert.deepEqual(readEmbeddedProject(fakeDoc(LEGACY_EMBEDDED_PROJECT_ID, JSON.stringify(project))), project);
console.log('✓ embedded project with the old marker opens');
assert.equal(readEmbeddedProject(fakeDoc('other', '{}')), null);
assert.equal(readEmbeddedProject(fakeDoc(EMBEDDED_PROJECT_ID, '{not json')), null);
console.log('✓ missing or malformed embedded data -> null');

// An imported project JSON that carries no app marker at all still migrates (JSON export has no marker)
const migrated = migrateLegacyProject(project.devices, project.wires);
assert.deepEqual(migrated, { devices: [], wires: [] });
console.log('✓ project JSON from before the rename imports');

const memStore = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), _m: m };
};
const old = memStore({ [LEGACY_THEME_KEY]: 'dark' });
assert.equal(readSavedTheme(old), 'dark');
assert.equal(old.getItem(THEME_KEY), 'dark');
assert.equal(old.getItem(LEGACY_THEME_KEY), null);
console.log('✓ theme saved under the old key is honoured, copied to the new key, old key removed');

const both = memStore({ [THEME_KEY]: 'light', [LEGACY_THEME_KEY]: 'dark' });
assert.equal(readSavedTheme(both), 'light');
console.log('✓ new key wins over the old key');

const fresh = memStore();
saveTheme(fresh, 'dark');
assert.equal(fresh.getItem(THEME_KEY), 'dark');
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
assert.equal(readSavedTheme(throwing), null);
saveTheme(throwing, 'dark');
console.log('✓ unavailable storage is tolerated');
console.log('RENAME COMPAT TESTS PASSED');
