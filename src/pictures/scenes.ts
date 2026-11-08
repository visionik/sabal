// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// New pictures for the games that never had any, in the style of the 8-bit
// SAGA releases: a 160×80 picture, few colours, dithered skies and shading,
// speckled ground. They are SABAL's own, drawn with the small painter below,
// so they ship with the library and need no files from the player.

import type { Bitmap } from './bdp.js';

export const SCENE_WIDTH = 160;
export const SCENE_HEIGHT = 80;

/** The scene palette: Atari-like colours, by name. */
const COLOURS = {
  black: [0, 0, 0],
  white: [236, 236, 236],
  grey: [150, 150, 150],
  darkGrey: [88, 88, 88],
  lightGrey: [196, 196, 196],
  sky: [84, 85, 237],
  lightSky: [125, 118, 252],
  paleSky: [176, 176, 255],
  navy: [36, 36, 140],
  sand: [212, 193, 84],
  lightSand: [236, 214, 128],
  darkSand: [170, 140, 60],
  brown: [120, 80, 40],
  darkBrown: [72, 44, 20],
  stone: [168, 148, 112],
  darkStone: [112, 96, 70],
  lightStone: [204, 186, 148],
  red: [190, 70, 60],
  darkRed: [120, 30, 26],
  orange: [230, 140, 60],
  yellow: [252, 232, 120],
  green: [60, 160, 60],
  darkGreen: [28, 96, 36],
  water: [40, 110, 200],
  lightWater: [100, 170, 240],
  purple: [140, 70, 170],
  gold: [236, 190, 40],
} as const satisfies Record<string, readonly [number, number, number]>;

export type Colour = keyof typeof COLOURS;
const NAMES = Object.keys(COLOURS) as Colour[];
export const SCENE_PALETTE: readonly (readonly [number, number, number])[] = NAMES.map((n) => COLOURS[n]);
const INDEX = Object.fromEntries(NAMES.map((n, i) => [n, i])) as Record<Colour, number>;

/** Where a second colour shows through a fill. */
export type Pattern = (x: number, y: number) => boolean;

const hash = (x: number, y: number) => {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return (h ^ (h >>> 15)) % 100;
};

export const PATTERNS = {
  checker: (x, y) => (x + y) % 2 === 0,
  sparse: (x, y) => x % 4 === 0 && y % 2 === 0,
  rows: (_x, y) => y % 2 === 0,
  columns: (x) => x % 2 === 0,
  /** About one pixel in eight, scattered. */
  speck: (x, y) => hash(x, y) < 12,
  /** About one in three, scattered. */
  grain: (x, y) => hash(x, y) < 33,
  diagonal: (x, y) => (x + y) % 4 === 0,
} as const satisfies Record<string, Pattern>;

/** A second colour through a pattern. */
export type Texture = readonly [Colour, Pattern];

type Point = readonly [number, number];

/** Draws one scene. Coordinates are pixels; fills take a colour and an optional texture. */
export class Painter {
  readonly pixels = new Uint8Array(SCENE_WIDTH * SCENE_HEIGHT);

  dot(x: number, y: number, c: Colour): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < SCENE_WIDTH && y >= 0 && y < SCENE_HEIGHT) this.pixels[y * SCENE_WIDTH + x] = INDEX[c];
  }

  private paint(x: number, y: number, c: Colour, t?: Texture): void {
    this.dot(x, y, t && t[1](x, y) ? t[0] : c);
  }

  /** A filled polygon. */
  poly(points: readonly Point[], c: Colour, t?: Texture): void {
    const ys = points.map((p) => p[1]);
    const top = Math.max(0, Math.floor(Math.min(...ys)));
    const bottom = Math.min(SCENE_HEIGHT - 1, Math.ceil(Math.max(...ys)));
    for (let y = top; y <= bottom; y++) {
      const mid = y + 0.5;
      const xs: number[] = [];
      points.forEach(([x1, y1], i) => {
        const [x2, y2] = points[(i + 1) % points.length]!;
        if ((y1 <= mid && mid < y2) || (y2 <= mid && mid < y1)) xs.push(x1 + ((mid - y1) * (x2 - x1)) / (y2 - y1));
      });
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]!); x < Math.round(xs[i + 1]!); x++) this.paint(x, y, c, t);
      }
    }
  }

  rect(x: number, y: number, w: number, h: number, c: Colour, t?: Texture): void {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c, t);
  }

  /** A filled ellipse; `ry` defaults to `rx`. */
  disc(cx: number, cy: number, rx: number, c: Colour, t?: Texture, ry = rx): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.01);
        const dy = (y + 0.5 - cy) / (ry + 0.01);
        if (dx * dx + dy * dy <= 1) this.paint(x, y, c, t);
      }
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, c: Colour): void {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this.dot(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, c);
  }

  /** Lines joining the points in turn. */
  path(points: readonly Point[], c: Colour): void {
    for (let i = 0; i + 1 < points.length; i++) this.line(...points[i]!, ...points[i + 1]!, c);
  }

  /** Recolour pixels of one colour inside a rectangle (to texture what is already there). */
  recolour(x: number, y: number, w: number, h: number, from: Colour, to: Colour, where: Pattern): void {
    for (let j = Math.max(0, y); j < Math.min(SCENE_HEIGHT, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(SCENE_WIDTH, x + w); i++) {
        if (this.pixels[j * SCENE_WIDTH + i] === INDEX[from] && where(i, j)) this.pixels[j * SCENE_WIDTH + i] = INDEX[to];
      }
    }
  }

  bitmap(): Bitmap {
    return { width: SCENE_WIDTH, height: SCENE_HEIGHT, pixels: this.pixels };
  }
}

/** A game's scenes: one function per picture number, and which picture each room shows. */
export interface SceneSet {
  readonly pictures: Readonly<Record<number, (p: Painter) => void>>;
  readonly rooms: Readonly<Record<number, number>>;
}

export function drawScene(scene: (p: Painter) => void): Bitmap {
  const p = new Painter();
  scene(p);
  return p.bitmap();
}
