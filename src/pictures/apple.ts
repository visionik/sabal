// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// SAGA pictures from the Apple II releases: line drawings with pattern fills
// and brush strokes on the hi-res screen, one file per room (R0201 is game 2,
// room 1) and per item (B02019 is game 2, item 19) on a DOS 3.3 disk.
//
// Nothing documents this format; it was worked out from the pictures and from
// the game's own drawing package (M3), which leans on the Applesoft ROM:
//
//   001ccccc        line colour c (HCOLOR)
//   010nnnnn        brush n for the next strokes
//   011xxxxx p      fill colour p (a pair of row patterns)
//   100xxxxX x y    move to (X·256 + x, y)
//   101xxxxX x y    draw a line to there
//   110xxxxX x y    paint the brush, in the fill colour, at that point
//   111xxxxX x y    fill the white area at that point with the fill colour
//   000xxxxx        end
//
// The screen starts white. Colour on the Apple comes from how lit pixels are
// spaced along a row, so the picture is drawn as bits and coloured afterwards.

import type { Bitmap } from './bdp.js';

export const APPLE_WIDTH = 280;
/** Where the colour signal starts, chosen so that alternate lit pixels show the familiar hi-res colours. */
const HUE = 5.52;
export const APPLE_HEIGHT = 160;

/**
 * The colours a composite monitor shows: the hi-res row is a stream of 560
 * dots, and the colour at a pixel comes from the 4 dots around it (one cycle
 * of the colour signal). Index = the 4 dots × 4 phases of the cycle.
 */
export const APPLE_PALETTE: readonly (readonly [number, number, number])[] = Array.from({ length: 64 }, (_, i) => {
  const dots = i >> 2;
  const phase = i & 3;
  let y = 0;
  let u = 0;
  let v = 0;
  for (let k = 0; k < 4; k++) {
    const on = (dots >> k) & 1;
    const angle = ((phase + k) * Math.PI) / 2 + HUE;
    y += on / 4;
    u += (on * Math.cos(angle)) / 2;
    v += (on * Math.sin(angle)) / 2;
  }
  const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255)));
  return [byte(y + 0.956 * u + 0.621 * v), byte(y - 0.272 * u - 0.647 * v), byte(y - 1.106 * u + 1.703 * v)] as const;
});
/** The files on a 140K DOS 3.3 disk image (.dsk, DOS sector order), by name, without their 4-byte header. */
export function readDos33(data: Uint8Array): Map<string, Uint8Array> | undefined {
  if (data.length !== 143360) return undefined;
  const sector = (t: number, s: number) => data.subarray((t * 16 + s) * 256, (t * 16 + s) * 256 + 256);
  const valid = (t: number, s: number) => t < 35 && s < 16;
  const vtoc = sector(17, 0);
  if (vtoc[3] !== 3) return undefined; // DOS 3.3
  const files = new Map<string, Uint8Array>();
  const seen = new Set<string>();
  let [t, s] = [vtoc[1]!, vtoc[2]!];
  while (t && valid(t, s) && !seen.has(`${t}/${s}`)) {
    seen.add(`${t}/${s}`);
    const catalog = sector(t, s);
    for (let e = 0; e < 7; e++) {
      const entry = catalog.subarray(0x0b + e * 35, 0x0b + (e + 1) * 35);
      if (entry[0] === 0 || entry[0] === 0xff || (entry[2]! & 0x7f) !== 0x04) continue; // binary files only
      const name = String.fromCharCode(...entry.subarray(3, 33).map((c) => c & 0x7f)).trimEnd();
      const parts: Uint8Array[] = [];
      let [lt, ls] = [entry[0]!, entry[1]!];
      for (let guard = 0; lt && valid(lt, ls) && guard < 40; guard++) {
        const list = sector(lt, ls);
        for (let k = 0x0c; k < 256; k += 2) if (list[k] || list[k + 1]) parts.push(sector(list[k]!, list[k + 1]!));
        [lt, ls] = [list[1]!, list[2]!];
      }
      const body = new Uint8Array(parts.length * 256);
      parts.forEach((p, i) => body.set(p, i * 256));
      const length = body[2]! | (body[3]! << 8);
      if (body.length >= 4 + length) files.set(name, body.subarray(4, 4 + length));
    }
    [t, s] = [catalog[1]!, catalog[2]!];
  }
  return files.size ? files : undefined;
}

// Applesoft's HCOLOR bytes, and the fill patterns: each colour number picks a
// pattern for even rows and one for odd rows; each pattern is four bytes, one
// per byte column mod 4. Both tables are copied from the game's M3 package.
const HCOLOR = [0x00, 0x2a, 0x55, 0x7f, 0x80, 0xaa, 0xd5, 0xff];
const PATTERNS = [
  '00000000', '552a552a', '2a552a55', '7f7f7f7f', '80808080', 'd5aad5aa', 'aad5aad5', 'ffffffff',
  '33664c19', 'b3e6cc99', '4c193366', 'cc99b3e6', '11224408', '91a2c488', '44081122', 'c48891a2',
  '22440811', 'a2c48891', '08112244', '8891a2c4', 'c9a49289', '24124924', '776e5d3b', 'f7eeddbb',
  '5d3b776e', 'ddbbf7ee', '6e5d3b77', 'eeddbbf7', '3b776e5d', 'bbf7eedd',
].map((hex) => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16))));
const COLOURS = [
  3, 7, 22, 7, 26, 29, 28, 23, 8, 11, 0, 27, 0, 4, 3, 27, 3, 6, 26, 6, 0, 6, 0, 17, 2, 6, 28, 19, 16, 19, 16, 7,
  2, 27, 2, 7, 2, 23, 2, 9, 26, 4, 16, 4, 2, 5, 18, 23, 26, 7, 3, 23, 22, 25, 3, 5, 3, 13, 26, 13, 26, 5, 16, 5,
  0, 13, 0, 23, 8, 5, 22, 5, 1, 5, 22, 11, 1, 7, 1, 23, 1, 9, 1, 4, 22, 4, 12, 15, 1, 27, 1, 17, 12, 23, 12, 4,
  22, 19, 1, 6, 22, 6, 12, 17, 7, 7, 4, 4, 7, 27, 27, 29, 7, 17, 6, 7, 23, 6, 6, 27, 6, 6, 4, 6, 17, 19, 4, 17,
  23, 7, 23, 11, 23, 25, 5, 7, 23, 5, 7, 13, 5, 5, 5, 13, 13, 15, 4, 13, 23, 4, 5, 27, 5, 6, 3, 3, 22, 3, 3, 12,
  0, 0, 8, 26, 2, 22, 26, 28, 3, 16, 2, 3, 2, 26, 2, 2, 18, 28, 0, 26, 18, 26, 16, 18, 0, 16, 3, 26, 22, 26, 22, 18,
  1, 2, 22, 24, 1, 3, 1, 26, 1, 22, 1, 1, 1, 0, 22, 0, 22, 12, 22, 14, 12, 14,
];
/** Brush shapes: 8 of 32 bytes, four 7×8 blocks (top left, top right, bottom left, bottom right). */
const BRUSHES = Uint8Array.from(
  (
    '00000000000000000000000000000001000000000000000000000000000000000000000000000040000000000000000140000000000000000100000000000000' +
    '00000000000040600000000000000103604000000000000003010000000000000000000000607070000000000003070770706000000000000707030000000000' +
    '0000006078787c7c000000030f0f1f1f7c7c7878600000001f1f0f0f0300000000607c7e7e7e7f7f00031f3f3f3f7f7f7f7f7e7e7e7c60007f7f3f3f3f1f0300' +
    '0000000040082000000000000004000928001000000000000005000100000000002008244012686000040114002b0327624822280010400017092215000a0000'
  )
    .match(/../g)!
    .map((b) => parseInt(b, 16)),
);

export type AppleInstruction = readonly [op: number, x: number, y: number];

export function parseApple(bytes: Uint8Array): AppleInstruction[] {
  const out: AppleInstruction[] = [];
  for (let p = 0; p < bytes.length; ) {
    const op = bytes[p]!;
    const kind = op & 0xe0;
    if (kind === 0) break;
    if (kind >= 0x80) {
      if (p + 2 >= bytes.length) break;
      out.push([op, bytes[p + 1]! | ((op & 1) << 8), bytes[p + 2]!]);
      p += 3;
    } else if (kind === 0x60) {
      out.push([op, bytes[p + 1] ?? 0, 0]);
      p += 2;
    } else {
      out.push([op, 0, 0]);
      p += 1;
    }
  }
  return out;
}

/** The hi-res screen: 40 bytes per row, 7 pixels each (bit 0 leftmost), bit 7 picks the colour pair. */
class Screen {
  readonly bytes = new Uint8Array(40 * APPLE_HEIGHT).fill(0xff);
  bit(x: number, y: number): boolean {
    if (x < 0 || x >= APPLE_WIDTH || y < 0 || y >= APPLE_HEIGHT) return false;
    return (this.bytes[y * 40 + Math.floor(x / 7)]! >> (x % 7)) & 1 ? true : false;
  }
  /** Set pixel (x, y) to the matching bit of `pattern`, and its byte's colour pair to the pattern's. */
  paint(x: number, y: number, pattern: number): void {
    if (x < 0 || x >= APPLE_WIDTH || y < 0 || y >= APPLE_HEIGHT) return;
    const i = y * 40 + Math.floor(x / 7);
    const mask = 1 << (x % 7);
    this.bytes[i] = (this.bytes[i]! & ~mask & 0x7f) | (pattern & mask) | (pattern & 0x80);
  }
}

export function drawApple(instructions: readonly AppleInstruction[], base?: Uint8Array): { bitmap: Bitmap; bytes: Uint8Array } {
  const screen = new Screen();
  if (base) screen.bytes.set(base);
  let hcolor = 4;
  let colour = 0;
  let brush = 5;
  let x = 0;
  let y = 0;

  const lineByte = (px: number) => {
    let b = HCOLOR[hcolor]!;
    // On odd byte columns the colour patterns swap phase, as Applesoft does.
    if (Math.floor(px / 7) % 2 && (b & 0x7f) !== 0 && (b & 0x7f) !== 0x7f) b ^= 0x7f;
    return b;
  };
  /** The fill pattern's byte for (px, py): even and odd rows differ, columns cycle through four bytes. */
  const fillByte = (px: number, py: number) => PATTERNS[COLOURS[colour * 2 + (py & 1)] ?? 0]![Math.floor(px / 7) & 3]!;

  const line = (x1: number, y1: number) => {
    let [x0, y0] = [x, y];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      screen.paint(x0, y0, lineByte(x0));
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  // A pixel can be filled if it and the one to its right are both lit (white).
  const open = (px: number, py: number) => screen.bit(px, py) && screen.bit(px + 1, py);
  const fill = (sx: number, sy: number) => {
    if (!open(sx, sy)) return;
    let row = sy;
    while (row > 0 && open(sx, row - 1)) row--;
    let px = sx;
    for (let guard = 0; guard < APPLE_HEIGHT; guard++) {
      while (px > 0 && open(px - 1, row)) px--;
      const start = px;
      while (px < APPLE_WIDTH && open(px, row)) {
        screen.paint(px, row, fillByte(px, row));
        px++;
      }
      const end = px;
      if (++row >= APPLE_HEIGHT) return;
      px = start;
      while (px < end && !open(px, row)) px++;
      if (px >= end) return;
    }
  };

  const paintBrush = (bx: number, by: number) => {
    const shape = BRUSHES.subarray((brush & 7) * 32, (brush & 7) * 32 + 32);
    for (let block = 0; block < 4; block++) {
      const ox = block & 1 ? 7 : 0;
      const oy = block & 2 ? 8 : 0;
      for (let r = 0; r < 8; r++) {
        const bits = shape[block * 8 + r]!;
        for (let b = 0; b < 7; b++) {
          if (bits & (1 << b)) screen.paint(bx + ox + b, by + oy + r, fillByte(bx + ox + b, by + oy + r));
        }
      }
    }
  };

  for (const [op, px, py] of instructions) {
    switch (op & 0xe0) {
      case 0x20:
        hcolor = op & 7;
        break;
      case 0x40:
        brush = op & 0x0f;
        break;
      case 0x60:
        colour = px;
        break;
      case 0x80:
        [x, y] = [px, py];
        break;
      case 0xa0:
        line(px, py);
        [x, y] = [px, py];
        break;
      case 0xc0:
        paintBrush(px, py);
        break;
      case 0xe0:
        fill(px, py);
        break;
    }
  }
  return { bitmap: colourise(screen), bytes: screen.bytes };
}

/** Turn bits into colours the way a colour monitor shows them. */
function colourise(screen: Screen): Bitmap {
  const W = APPLE_WIDTH;
  const pixels = new Uint8Array(W * APPLE_HEIGHT);
  const dots = new Uint8Array(2 * W + 4);
  for (let y = 0; y < APPLE_HEIGHT; y++) {
    dots.fill(0);
    for (let x = 0; x < W; x++) {
      if (!screen.bit(x, y)) continue;
      const shift = screen.bytes[y * 40 + Math.floor(x / 7)]! & 0x80 ? 1 : 0; // the colour bit delays the byte by a dot
      dots[2 * x + shift + 1] = 1;
      dots[2 * x + shift + 2] = 1;
    }
    for (let x = 0; x < W; x++) {
      const at = 2 * x; // the window dots[at .. at+3] is centred on pixel x
      const window = dots[at]! | (dots[at + 1]! << 1) | (dots[at + 2]! << 2) | (dots[at + 3]! << 3);
      pixels[y * W + x] = (window << 2) | (at & 3);
    }
  }
  return { width: W, height: APPLE_HEIGHT, pixels };
}
