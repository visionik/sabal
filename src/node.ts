// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// `sabal/node`: conveniences for Node hosts that the portable core leaves out
// because they need the filesystem or zlib.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateRawSync } from 'node:zlib';
import { PictureLibrary, PICTURE_FILES, type PictureFile, type PictureImage } from './pictures/library.js';
import { crc32 } from './pictures/crc32.js';

/** Files bigger than this aren't tapes or disks from these games. */
const MAX_FILE = 1 << 20;

/** Read the picture files (tapes, snapshots, disk images) in a folder. A missing folder has none. */
export function readPictureFiles(dir: string): PictureFile[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((n) => PICTURE_FILES.test(n) || /\.rpk$/i.test(n)).sort();
  } catch {
    return [];
  }
  const files: PictureFile[] = [];
  for (const name of names) {
    try {
      const path = join(dir, name);
      if (statSync(path).size > MAX_FILE) continue;
      const data = readFileSync(path);
      if (/\.rpk$/i.test(name)) files.push(...unzip(data).map((f) => ({ name: `${name}/${f.name}`, data: f.data })));
      else files.push({ name, data });
    } catch {
      // An unreadable file is skipped.
    }
  }
  return files;
}

/** A picture library from the files in a folder. */
export function loadPictures(dir: string): PictureLibrary {
  return new PictureLibrary(readPictureFiles(dir));
}

/**
 * A picture as a PNG, enlarged without smoothing so the blocky originals stay
 * sharp: `scale` times its usual size (any value, such as 1.5).
 */
export function encodePng(image: PictureImage, scale = 1): Buffer {
  const factor = image.scale * scale;
  const width = Math.max(1, Math.round(image.width * factor));
  const height = Math.max(1, Math.round(image.height * factor));
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = Math.min(image.height - 1, Math.floor(y / factor)) * image.width;
    const row = y * (width + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) raw[row + 1 + x] = image.pixels[src + Math.min(image.width - 1, Math.floor(x / factor))]!;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 3, 0, 0, 0], 8); // 8-bit indexed colour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(image.palette.flat())),
    chunk('IDAT', deflateSync(raw)),
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

export { PictureLibrary } from './pictures/library.js';
export { loadNg, composeNg, decodePng, NG_DIR, type NgSource } from './ng-node.js';

/** The files in a zip archive (a TI-99/4A .rpk cartridge pack), stored or deflated. */
function unzip(zip: Buffer): PictureFile[] {
  const files: PictureFile[] = [];
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) return files;
  let p = zip.readUInt32LE(end + 16);
  for (let n = zip.readUInt16LE(end + 10); n > 0 && p + 46 <= zip.length; n--) {
    if (zip.readUInt32LE(p) !== 0x02014b50) break;
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extra = zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString('latin1', p + 46, p + 46 + nameLength);
    p += 46 + nameLength + extra;
    if (zip.readUInt32LE(local) !== 0x04034b50) continue;
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(start, start + zip.readUInt32LE(local + 18));
    try {
      if (method === 0) files.push({ name, data: body });
      else if (method === 8 && size <= MAX_FILE) files.push({ name, data: inflateRawSync(body) });
    } catch {
      // A damaged member is skipped.
    }
  }
  return files;
}
