import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'build-icons');
fs.mkdirSync(outDir, { recursive: true });

// WireWise "Check Tile" mark, matching public/icon.svg and brand/logo.svg
// (viewBox 0 0 64 64). Shapes are sampled in that 64-unit space.
const BG = [0xb4, 0x50, 0x1c];
const FG = [0xff, 0xff, 0xff];
const AMBER = [0xf0, 0xb1, 0x1a];
const CHECK = [[13, 33], [26, 46], [51, 19]];
const TERMINALS = [[13, 33], [51, 19]];
const PIVOT = [26, 46];

function inRoundedRect(x, y) {
  const r = 15;
  if (x < 0 || y < 0 || x > 64 || y > 64) return false;
  if (x >= r && x <= 64 - r) return true;
  if (y >= r && y <= 64 - r) return true;
  const cx = x < r ? r : 64 - r;
  const cy = y < r ? r : 64 - r;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distToSegment(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

// Paint order follows the SVG: check stroke, terminal circles (fill + ring), pivot dot.
function colorAt(x, y) {
  if (Math.hypot(x - PIVOT[0], y - PIVOT[1]) <= 3.6) return AMBER;
  for (const [cx, cy] of TERMINALS) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 6) return d >= 3 ? FG : BG;
  }
  for (let i = 0; i < CHECK.length - 1; i++) {
    if (distToSegment(x, y, CHECK[i], CHECK[i + 1]) <= 2.75) return FG;
  }
  return BG;
}

// CRC32 for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderPng(size) {
  const samples = 6; // 6x6 supersampling for crisp anti-aliased edges
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const scale = 64 / size;

  for (let py = 0; py < size; py++) {
    const rowOff = py * stride;
    raw[rowOff] = 0; // filter None
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) * scale;
          const y = (py + (sy + 0.5) / samples) * scale;
          if (!inRoundedRect(x, y)) continue;
          const col = colorAt(x, y);
          r += col[0];
          g += col[1];
          b += col[2];
          a += 255;
        }
      }
      const total = samples * samples;
      const off = rowOff + 1 + px * 4;
      if (a > 0) {
        const hits = a / 255;
        raw[off] = Math.round(r / hits);
        raw[off + 1] = Math.round(g / hits);
        raw[off + 2] = Math.round(b / hits);
        raw[off + 3] = Math.round(a / total);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildIco(sizes) {
  const pngs = sizes.map((s) => ({ size: s, buf: renderPng(s) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, buf } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

const png256 = renderPng(256);
const ico = buildIco([16, 24, 32, 48, 64, 128, 256]);

fs.writeFileSync(path.join(outDir, 'icon.png'), png256);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
fs.copyFileSync(path.join(outDir, 'icon.png'), path.join(rootDir, 'site', 'icon-256.png'));
console.log(`Generated site/icon-256.png, build-icons/icon.png (${png256.length} B) and build-icons/icon.ico (${ico.length} B)`);
