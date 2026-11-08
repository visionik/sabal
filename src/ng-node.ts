// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Next-gen pictures for Node hosts: read the ng/ folder that ships with SABAL
// and compose a picture's layers (the room, then items with transparent
// backgrounds) into one PNG.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { NgLibrary, type Box, type NgManifest, type NgPicture } from './pictures/ng.js';
import { crc32 } from './pictures/crc32.js';

/** The ng/ folder that ships with SABAL (the manifest, and any pictures beside it). */
export const NG_DIR = fileURLToPath(new URL('../ng/', import.meta.url));

/** Next-gen pictures: the manifest, and the PNGs it names, on disk or downloaded on first use. */
export interface NgSource {
  readonly library: NgLibrary;
  /** Whether every picture for a game is here, so `read` won't fail for it. */
  ready(game: string): boolean;
  /** The files a game still needs, and their total size in bytes when the manifest knows it. */
  missing(game: string): { files: string[]; bytes: number };
  /**
   * Download a game's missing pictures into the cache folder, checking each
   * against the manifest's hash. Resolves to the number of files fetched.
   */
  download(game: string, progress?: (done: number, total: number) => void): Promise<number>;
  /** The bytes of a file the manifest names; throws if it isn't here yet. */
  read(file: string): Buffer;
}

export interface NgOptions {
  /** Where manifest.json is, and pictures that come with it (default: the package's ng/ folder). */
  readonly dir?: string;
  /** Where downloaded pictures are kept; without one, nothing is downloaded. */
  readonly cache?: string;
  /** Fetch, for tests (default: the global one). */
  readonly fetch?: typeof fetch;
}

/** Load the next-gen pictures; undefined when there's no manifest. */
export function loadNg(options: NgOptions | string = {}): NgSource | undefined {
  const { dir = NG_DIR, cache, fetch: get = globalThis.fetch } = typeof options === 'string' ? { dir: options } : options;
  let manifest: NgManifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as NgManifest;
  } catch {
    return undefined;
  }
  const library = new NgLibrary(manifest);
  const memory = new Map<string, Buffer>();
  const check = (file: string) => {
    if (file.includes('..') || isAbsolute(file)) throw new Error(`bad picture file ${file}`);
  };
  // A file is usable from the ng/ folder as is, or from the cache when its hash matches.
  const find = (file: string): string | undefined => {
    check(file);
    if (existsSync(join(dir, file))) return join(dir, file);
    if (cache && existsSync(join(cache, file))) return join(cache, file);
    return undefined;
  };
  const filesOf = (game: string): string[] => {
    const g = manifest.games[game];
    if (!g) return [];
    return [...new Set([...Object.values(g.rooms), ...Object.values(g.items ?? {}).map((i) => i.file), ...(g.dark ? [g.dark] : [])])];
  };
  const missing = (game: string) => {
    const files = filesOf(game).filter((f) => !find(f));
    return { files, bytes: files.reduce((n, f) => n + (manifest.files?.[f]?.size ?? 0), 0) };
  };
  return {
    library,
    ready: (game) => missing(game).files.length === 0,
    missing,
    async download(game, progress) {
      const { files } = missing(game);
      if (files.length === 0) return 0;
      if (!cache) throw new Error('no cache folder to download next-gen pictures into');
      if (!manifest.base) throw new Error('the manifest says nowhere to download pictures from');
      let done = 0;
      const queue = [...files];
      const worker = async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          const response = await get(new URL(file, manifest.base).toString());
          if (!response.ok) throw new Error(`couldn't download ${file}: HTTP ${response.status}`);
          const data = Buffer.from(await response.arrayBuffer());
          const want = manifest.files?.[file]?.sha256;
          if (want && createHash('sha256').update(data).digest('hex') !== want) throw new Error(`${file} didn't match its checksum`);
          const path = join(cache, file);
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(`${path}.part`, data);
          renameSync(`${path}.part`, path);
          progress?.(++done, files.length);
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, files.length) }, worker));
      return files.length;
    },
    read(file) {
      let data = memory.get(file);
      if (!data) {
        const path = find(file);
        if (!path) throw new Error(`${file} hasn't been downloaded`);
        data = readFileSync(path);
        memory.set(file, data);
      }
      return data;
    },
  };
}

/** A decoded picture: RGBA, row by row. */
export interface Rgba {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/**
 * One PNG of a next-gen picture at `scale` times its usual size: the room with
 * each item sized to its box (keeping its shape, standing on the middle of the
 * box's bottom edge) and blended over it.
 */
export function composeNg(picture: NgPicture, read: (file: string) => Buffer, scale = 1): Buffer {
  const [room, ...items] = picture.layers;
  if (!room) throw new Error('a picture needs a room');
  if (items.length === 0 && scale === 1) return read(room.file);
  const canvas = decodePng(read(room.file));
  for (const item of items) blend(canvas, decodePng(read(item.file)), item.box ?? [0, 0, 1, 1]);
  const out = scale === 1 ? canvas : resize(canvas, Math.max(1, Math.round(canvas.width * scale)), Math.max(1, Math.round(canvas.height * scale)));
  return encodeRgb(out);
}

function blend(canvas: Rgba, item: Rgba, [bx, by, bw, bh]: Box): void {
  const boxW = bw * canvas.width;
  const boxH = bh * canvas.height;
  // The box is where the original drew the item, often a different shape from
  // the painting: match its area rather than squeezing inside it, but don't
  // grow far past its width or height, or above the top of the picture.
  const fit = Math.min(
    Math.sqrt((boxW * boxH) / (item.width * item.height)),
    (boxW * 1.5) / item.width,
    (boxH * 2.5) / item.height,
    ((by + bh) * canvas.height) / item.height,
  );
  const w = Math.max(1, Math.round(item.width * fit));
  const h = Math.max(1, Math.round(item.height * fit));
  const sized = resize(item, w, h);
  const left = Math.round(bx * canvas.width + (boxW - w) / 2);
  const top = Math.round((by + bh) * canvas.height - h);
  const c = canvas.data as Uint8Array;
  for (let y = 0; y < h; y++) {
    const cy = top + y;
    if (cy < 0 || cy >= canvas.height) continue;
    for (let x = 0; x < w; x++) {
      const cx = left + x;
      if (cx < 0 || cx >= canvas.width) continue;
      const s = (y * w + x) * 4;
      const a = sized.data[s + 3]! / 255;
      if (a === 0) continue;
      const d = (cy * canvas.width + cx) * 4;
      for (let k = 0; k < 3; k++) c[d + k] = Math.round(sized.data[s + k]! * a + c[d + k]! * (1 - a));
      c[d + 3] = 255;
    }
  }
}

/** Resample with an area average when shrinking and bilinear filtering when enlarging; alpha-aware. */
export function resize(src: Rgba, width: number, height: number): Rgba {
  if (width === src.width && height === src.height) return src;
  const out = new Uint8Array(width * height * 4);
  const sx = src.width / width;
  const sy = src.height / height;
  const px = (x: number, y: number) => (Math.min(src.height - 1, Math.max(0, y)) * src.width + Math.min(src.width - 1, Math.max(0, x))) * 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const acc = [0, 0, 0, 0, 0];
      if (sx > 1 || sy > 1) {
        const x0 = Math.floor(x * sx);
        const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
        const y0 = Math.floor(y * sy);
        const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
        for (let j = y0; j < y1; j++) {
          for (let i = x0; i < x1; i++) add(acc, src.data, px(i, j), 1);
        }
      } else {
        const fx = (x + 0.5) * sx - 0.5;
        const fy = (y + 0.5) * sy - 0.5;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = fx - ix;
        const ty = fy - iy;
        add(acc, src.data, px(ix, iy), (1 - tx) * (1 - ty));
        add(acc, src.data, px(ix + 1, iy), tx * (1 - ty));
        add(acc, src.data, px(ix, iy + 1), (1 - tx) * ty);
        add(acc, src.data, px(ix + 1, iy + 1), tx * ty);
      }
      const o = (y * width + x) * 4;
      const alpha = acc[3]!;
      out[o + 3] = Math.round(alpha / acc[4]!);
      if (alpha > 0) for (let k = 0; k < 3; k++) out[o + k] = Math.round(acc[k]! / alpha);
    }
  }
  return { width, height, data: out };
}

// Colour is summed premultiplied by alpha, so transparent pixels don't darken
// edges; acc holds r, g, b, alpha and the total weight.
function add(acc: number[], data: Uint8Array, at: number, w: number): void {
  const a = data[at + 3]! * w;
  acc[0]! += data[at]! * a;
  acc[1]! += data[at + 1]! * a;
  acc[2]! += data[at + 2]! * a;
  acc[3]! += a;
  acc[4]! += w;
}

/** Decode a PNG: 8-bit greyscale, RGB, palette (with transparency) or RGBA, not interlaced. */
export function decodePng(png: Uint8Array): Rgba {
  const view = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
  if (view.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let at = 8;
  let width = 0;
  let height = 0;
  let type = 0;
  let palette: Buffer | undefined;
  let alpha: Buffer | undefined;
  const idat: Buffer[] = [];
  while (at < view.length) {
    const length = view.readUInt32BE(at);
    const kind = view.toString('latin1', at + 4, at + 8);
    const data = view.subarray(at + 8, at + 8 + length);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('only 8-bit, non-interlaced PNGs');
      type = data[9]!;
    } else if (kind === 'PLTE') palette = data;
    else if (kind === 'tRNS') alpha = data;
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    at += 12 + length;
  }
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (!channels) throw new Error(`unsupported PNG colour type ${type}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = new Uint8Array(stride * height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = rows.subarray(y * stride, (y + 1) * stride);
    line.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels]! : 0;
      const b = prev[x]!;
      const c = x >= channels ? prev[x - channels]! : 0;
      if (filter === 1) line[x] = (line[x]! + a) & 255;
      else if (filter === 2) line[x] = (line[x]! + b) & 255;
      else if (filter === 3) line[x] = (line[x]! + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[x] = (line[x]! + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    prev = line;
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (type === 3) {
      const p = rows[i]!;
      data[o] = palette?.[p * 3] ?? 0;
      data[o + 1] = palette?.[p * 3 + 1] ?? 0;
      data[o + 2] = palette?.[p * 3 + 2] ?? 0;
      data[o + 3] = alpha && p < alpha.length ? alpha[p]! : 255;
    } else if (type === 0 || type === 4) {
      const v = rows[i * channels]!;
      data[o] = data[o + 1] = data[o + 2] = v;
      data[o + 3] = type === 4 ? rows[i * 2 + 1]! : 255;
    } else {
      data[o] = rows[i * channels]!;
      data[o + 1] = rows[i * channels + 1]!;
      data[o + 2] = rows[i * channels + 2]!;
      data[o + 3] = type === 6 ? rows[i * 4 + 3]! : 255;
    }
  }
  return { width, height, data };
}

/** Encode as a truecolour PNG (the alpha is dropped: a composed picture is opaque). */
export function encodeRgb(image: Rgba): Buffer {
  const stride = image.width * 3;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y++) {
    const row = y * (stride + 1);
    raw[row] = 1; // filter: sub, which suits paintings
    for (let x = 0; x < image.width; x++) {
      const s = (y * image.width + x) * 4;
      for (let k = 0; k < 3; k++) {
        const left = x > 0 ? image.data[s - 4 + k]! : 0;
        raw[row + 1 + x * 3 + k] = (image.data[s + k]! - left) & 255;
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
