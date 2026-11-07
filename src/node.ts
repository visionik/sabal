// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// `sabal/node`: conveniences for Node hosts that the portable core leaves out
// because they need the filesystem or zlib.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { PictureLibrary, PICTURE_FILES, type PictureFile, type PictureImage } from './pictures/library.js';
import { crc32 } from './pictures/crc32.js';

/** Files bigger than this aren't tapes or disks from these games. */
const MAX_FILE = 1 << 20;

/** Read the picture files (tapes, snapshots, disk images) in a folder. A missing folder has none. */
export function readPictureFiles(dir: string): PictureFile[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((n) => PICTURE_FILES.test(n)).sort();
  } catch {
    return [];
  }
  const files: PictureFile[] = [];
  for (const name of names) {
    try {
      const path = join(dir, name);
      if (statSync(path).size <= MAX_FILE) files.push({ name, data: readFileSync(path) });
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
