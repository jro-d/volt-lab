// Fails (exit 1) when the device catalog, the DeviceType union, the renderer switch and the
// library drawer drift apart. Run by `npm run build` and available as `npm run check:catalog`.
import ts from 'typescript';
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.join(root, p);
const problems = [];
const fail = (msg) => problems.push(msg);

const parse = (file) =>
  ts.createSourceFile(file, readFileSync(rel(file), 'utf8'), ts.ScriptTarget.ES2022, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const str = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (c) => walk(c, visit));
}

// 1. DeviceType union members -------------------------------------------------------------
const unionTypes = new Set();
walk(parse('src/types/electrical.ts'), (n) => {
  if (ts.isTypeAliasDeclaration(n) && n.name.text === 'DeviceType' && ts.isUnionTypeNode(n.type)) {
    for (const m of n.type.types) {
      if (ts.isLiteralTypeNode(m) && str(m.literal)) unionTypes.add(str(m.literal));
    }
  }
});
if (unionTypes.size === 0) fail('Could not read the DeviceType union from src/types/electrical.ts');

// 2. `case '<type>':` labels in DeviceRenderer.tsx -------------------------------------------
const rendererCases = new Set();
walk(parse('src/components/devices/DeviceRenderer.tsx'), (n) => {
  if (ts.isCaseClause(n) && str(n.expression)) rendererCases.add(str(n.expression));
});

// 3. Types listed in the LIBRARY_TREE groups of ComponentDrawer.tsx (with how often each appears)
const drawerCount = new Map();
let foundTree = false;
walk(parse('src/components/layout/ComponentDrawer.tsx'), (n) => {
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'LIBRARY_TREE' && n.initializer) {
    foundTree = true;
    walk(n.initializer, (m) => {
      if (ts.isPropertyAssignment(m) && ts.isIdentifier(m.name) && m.name.text === 'types' && ts.isArrayLiteralExpression(m.initializer)) {
        for (const el of m.initializer.elements) {
          const t = str(el);
          if (t) drawerCount.set(t, (drawerCount.get(t) || 0) + 1);
        }
      }
    });
  }
});
if (!foundTree) fail('Could not find LIBRARY_TREE in src/components/layout/ComponentDrawer.tsx');

// 4. The catalog itself (needs evaluation, so bundle and import it) ------------------------
const tmp = mkdtempSync(path.join(tmpdir(), 'check-catalog-'));
let catalog = [];
let brandSource = '';
try {
  const entry = path.join(tmp, 'entry.ts');
  writeFileSync(
    entry,
    `export { COMPONENT_CATALOG } from ${JSON.stringify(rel('src/data/defaultComponents.ts').split(path.sep).join('/'))};\n` +
      `export { BRAND_PATTERN } from ${JSON.stringify(rel('src/utils/projectMigration.ts').split(path.sep).join('/'))};\n`
  );
  const out = path.join(tmp, 'entry.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
  const mod = await import(pathToFileURL(out).href);
  catalog = mod.COMPONENT_CATALOG;
  brandSource = mod.BRAND_PATTERN.source;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const hasBrand = (text) => new RegExp(brandSource, 'i').test(text);

const catalogTypes = new Map();
for (const def of catalog) {
  if (catalogTypes.has(def.type)) fail(`Catalog lists "${def.type}" more than once`);
  catalogTypes.set(def.type, def);
}

for (const t of unionTypes) if (!catalogTypes.has(t)) fail(`DeviceType "${t}" has no COMPONENT_CATALOG entry`);
for (const t of catalogTypes.keys()) {
  if (!unionTypes.has(t)) fail(`Catalog entry "${t}" is not a member of the DeviceType union`);
  if (!rendererCases.has(t)) fail(`Catalog entry "${t}" has no case in DeviceRenderer.tsx`);
  const n = drawerCount.get(t) || 0;
  if (n !== 1) fail(`Catalog entry "${t}" appears in ${n} ComponentDrawer groups (must be exactly 1)`);
}
for (const [t, n] of drawerCount) if (!catalogTypes.has(t)) fail(`ComponentDrawer lists "${t}" (${n}x) but the catalog has no such device`);

for (const def of catalog) {
  const ids = new Set();
  for (const term of def.terminals || []) {
    if (ids.has(term.id)) fail(`"${def.type}": duplicate terminal id "${term.id}"`);
    ids.add(term.id);
    for (const axis of ['relX', 'relY']) {
      const v = term[axis];
      if (typeof v !== 'number' || v < 0 || v > 1) fail(`"${def.type}": terminal "${term.id}" ${axis}=${v} is outside 0..1`);
    }
  }
  // Purely mechanical accessories (a link between two contactors) have no electrical terminals
  const MECHANICAL_ONLY = new Set(['mechanical_interlock', 'cylinder_da']);
  if ((!def.terminals || def.terminals.length === 0) && !MECHANICAL_ONLY.has(def.type)) fail(`"${def.type}": no terminals`);
  if (!def.productStandard) fail(`"${def.type}": missing productStandard`);
  if (!def.modelNumber) fail(`"${def.type}": missing modelNumber`);
  if (hasBrand(JSON.stringify(def))) fail(`"${def.type}": contains a manufacturer name (devices must be brand-neutral)`);
}

if (problems.length > 0) {
  console.error(`check-catalog: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-catalog: OK (${catalogTypes.size} devices, ${unionTypes.size} types, ${rendererCases.size} renderer cases)`);
