import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist-standalone');
const indexHtmlPath = path.join(distDir, 'index.html');
const outputPath = path.join(rootDir, 'VoltLab-Standalone.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error(`Expected build output at ${indexHtmlPath}`);
  process.exit(1);
}

let html = fs.readFileSync(indexHtmlPath, 'utf8');
const styleBlocks = [];
const scriptBlocks = [];

html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi, (_m, href) => {
  const assetPath = path.resolve(distDir, href.replace(/^\.\//, ''));
  if (fs.existsSync(assetPath)) {
    styleBlocks.push(fs.readFileSync(assetPath, 'utf8'));
    return '';
  }
  return _m;
});

html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (_m, src) => {
  const assetPath = path.resolve(distDir, src.replace(/^\.\//, ''));
  if (fs.existsSync(assetPath)) {
    const rawJs = fs.readFileSync(assetPath, 'utf8');
    scriptBlocks.push(rawJs.replace(/<\/(script)/gi, '<\\/$1'));
    return '';
  }
  return _m;
});

if (styleBlocks.length > 0) {
  html = html.replace(/<\/head>/i, () => `  <style>\n${styleBlocks.join('\n')}\n  </style>\n</head>`);
}

if (scriptBlocks.length > 0) {
  html = html.replace(/<\/body>/i, () => `  <script>\n${scriptBlocks.join('\n')}\n  </script>\n</body>`);
}

fs.writeFileSync(outputPath, html, 'utf8');
fs.rmSync(distDir, { recursive: true, force: true });

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`Generated standalone offline app: ${outputPath} (${kb} KB)`);
