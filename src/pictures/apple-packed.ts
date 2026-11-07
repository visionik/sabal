// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// SAGA pictures from the later Apple II releases (Adventureland 2.2, Voodoo
// Castle, The Count, Claymorgue), stored packed straight on the picture disk
// rather than as files. Undocumented; worked out from the disks.
//
// Track 0 holds tables, indexed by picture number: sectors 1–3 give each room
// picture's last track, last sector (low 4 bits) and length in sectors;
// sectors 4–6 do the same for item pictures, by item number. 0x80 means none.
//
// A picture starts with its rectangle in byte columns and rows (x0, y0, x1,
// y1; a whole room is 0, 0, 40, 160), then the hi-res bytes column by column,
// top to bottom. A 0 byte starts a run: a count (0 = 256) and two bytes
// repeated that many times; any other byte stands for itself.

import { APPLE_HEIGHT, drawApple } from './apple.js';
import type { Bitmap } from './bdp.js';

export interface PackedPicture {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly bytes: Uint8Array;
}

/**
 * Room (`table` 1) or item (`table` 4) picture `n`, or undefined if there's none.
 * Items whose last-sector byte has its top bit set are inventory icons, placed
 * for the inventory screen; only the others (an open door, a coffin) belong in
 * a room, so the icons are left out.
 */
export function packedPicture(disk: Uint8Array, table: 1 | 4, n: number): PackedPicture | undefined {
  if (disk.length !== 143360 || n < 0 || n > 255) return undefined;
  if (table === 4 && disk[5 * 256 + n]! & 0x80) return undefined;
  const track = disk[table * 256 + n]!;
  const last = disk[(table + 1) * 256 + n]! & 0x0f;
  const size = disk[(table + 2) * 256 + n]!;
  if (track === 0x80 || !size || track >= 35) return undefined;
  const start = (track * 16 + last - size + 1) * 256;
  if (start < 256 || start >= disk.length) return undefined;
  const [x0, y0, x1, y1] = [disk[start]!, disk[start + 1]!, disk[start + 2]!, disk[start + 3]!];
  if (x1 <= x0 || y1 <= y0 || x1 > 40 || y1 > 192) return undefined;
  const bytes = new Uint8Array((x1 - x0) * (y1 - y0));
  let p = start + 4;
  for (let i = 0; i < bytes.length; ) {
    if (p >= disk.length) return undefined;
    const b = disk[p++]!;
    if (b !== 0) {
      bytes[i++] = b;
      continue;
    }
    const count = disk[p]! || 256;
    const [a, c] = [disk[p + 1]!, disk[p + 2]!];
    p += 3;
    for (let k = 0; k < count && i < bytes.length; k++) {
      bytes[i++] = a;
      if (i < bytes.length) bytes[i++] = c;
    }
  }
  return { x0, y0, x1, y1, bytes };
}

/** Draw pictures one over another (a room, then its items) and colour them. */
export function drawPacked(pictures: readonly PackedPicture[]): Bitmap {
  const screen = new Uint8Array(40 * APPLE_HEIGHT);
  for (const { x0, y0, y1, bytes } of pictures) {
    const rows = y1 - y0;
    for (let i = 0; i < bytes.length; i++) {
      const x = x0 + Math.floor(i / rows);
      const y = y0 + (i % rows);
      if (y < APPLE_HEIGHT) screen[y * 40 + x] = bytes[i]!;
    }
  }
  return drawApple([], screen).bitmap;
}
