/**
 * Share link: the project JSON compressed into the URL hash (`#share=<method><payload>`), so a project can be sent as a
 * link with no server. Method `d` is deflate-raw through the built-in CompressionStream; method `l` is a small
 * dependency-free LZW fallback for browsers without it. The payload is base64url. Nothing leaves the device.
 */

export const SHARE_PREFIX = '#share=';
/** Above this many characters some apps cut links: offer "Export JSON" instead. */
export const SHARE_WARN_LENGTH = 8000;

const b64 = {
  encode(bytes: Uint8Array): string {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(text: string): Uint8Array {
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

// ── LZW fallback (16-bit codes, dictionary capped at 65535 entries) ──────────────────────────
export function lzwCompress(input: Uint8Array): Uint8Array {
  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
  let next = 256;
  let w = '';
  const codes: number[] = [];
  for (const byte of input) {
    const c = String.fromCharCode(byte);
    const wc = w + c;
    if (dict.has(wc)) w = wc;
    else {
      codes.push(dict.get(w)!);
      if (next < 65535) dict.set(wc, next++);
      w = c;
    }
  }
  if (w !== '') codes.push(dict.get(w)!);
  const out = new Uint8Array(codes.length * 2);
  codes.forEach((code, i) => {
    out[i * 2] = code >> 8;
    out[i * 2 + 1] = code & 255;
  });
  return out;
}

export function lzwDecompress(data: Uint8Array): Uint8Array {
  if (data.length % 2 !== 0) throw new Error('Corrupt share link');
  const codes: number[] = [];
  for (let i = 0; i < data.length; i += 2) codes.push((data[i] << 8) | data[i + 1]);
  if (codes.length === 0) return new Uint8Array(0);
  const dict: string[] = [];
  for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);
  let w = dict[codes[0]];
  if (w === undefined) throw new Error('Corrupt share link');
  let result = w;
  for (let i = 1; i < codes.length; i++) {
    const k = codes[i];
    let entry: string;
    if (dict[k] !== undefined) entry = dict[k];
    else if (k === dict.length) entry = w + w[0];
    else throw new Error('Corrupt share link');
    result += entry;
    if (dict.length < 65535) dict.push(w + entry[0]);
    w = entry;
  }
  const out = new Uint8Array(result.length);
  for (let i = 0; i < result.length; i++) out[i] = result.charCodeAt(i);
  return out;
}

// ── deflate-raw through the Compression Streams API ──────────────────────────────────────────
async function streamBytes(input: Uint8Array, stream: { writable: WritableStream; readable: ReadableStream }): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // a corrupt payload makes the stream error: the reader below reports it, so these promises are ignored
  writer.write(input as unknown as BufferSource).catch(() => undefined);
  writer.close().catch(() => undefined);
  const buf = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buf);
}

export const hasCompressionStream = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export interface ShareResult {
  hash: string;
  length: number;
  method: 'deflate' | 'lzw';
  tooLong: boolean;
}

/** Encode a project (any JSON value) into a share hash. `forceFallback` skips the Compression Streams API. */
export async function encodeShare(project: unknown, forceFallback = false): Promise<ShareResult> {
  const bytes = new TextEncoder().encode(JSON.stringify(project));
  let method: 'deflate' | 'lzw' = 'lzw';
  let payload: Uint8Array;
  if (!forceFallback && hasCompressionStream()) {
    method = 'deflate';
    payload = await streamBytes(bytes, new CompressionStream('deflate-raw'));
  } else {
    payload = lzwCompress(bytes);
  }
  const hash = `${SHARE_PREFIX}${method === 'deflate' ? 'd' : 'l'}${b64.encode(payload)}`;
  return { hash, length: hash.length, method, tooLong: hash.length > SHARE_WARN_LENGTH };
}

/** Decode a share hash (with or without the `#share=` prefix) back into the project value. Throws on a bad link. */
export async function decodeShare(hash: string): Promise<unknown> {
  const body = hash.startsWith(SHARE_PREFIX) ? hash.slice(SHARE_PREFIX.length) : hash;
  const method = body[0];
  if ((method !== 'd' && method !== 'l') || body.length < 2) throw new Error('Not a WireWise share link');
  let bytes: Uint8Array;
  try {
    bytes = b64.decode(body.slice(1));
  } catch {
    throw new Error('Corrupt share link');
  }
  let raw: Uint8Array;
  if (method === 'd') {
    if (!hasCompressionStream()) throw new Error('This browser cannot open a deflate link: ask for an Export JSON file instead');
    try {
      raw = await streamBytes(bytes, new DecompressionStream('deflate-raw'));
    } catch {
      throw new Error('Corrupt share link');
    }
  } else raw = lzwDecompress(bytes);
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new Error('Corrupt share link');
  }
}

export const isShareHash = (hash: string) => hash.startsWith(SHARE_PREFIX) && hash.length > SHARE_PREFIX.length + 1;
