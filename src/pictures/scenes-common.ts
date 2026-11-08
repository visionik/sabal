// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pieces shared by the games' own pictures: skies, ground, a stone chamber in
// one-point perspective, doorways and torches.

import { PATTERNS as P, type Colour, type Painter } from './scenes.js';

export function sky(p: Painter, horizon: number): void {
  p.rect(0, 0, 160, horizon, 'sky');
  p.rect(0, horizon - 14, 160, 8, 'sky', ['lightSky', P.checker]);
  p.rect(0, horizon - 6, 160, 6, 'lightSky', ['paleSky', P.checker]);
}

export function sun(p: Painter, x: number, y: number): void {
  p.disc(x, y, 6, 'yellow');
  p.disc(x, y, 4, 'white', ['yellow', P.checker]);
}

export function sand(p: Painter, horizon: number): void {
  p.rect(0, horizon, 160, 80 - horizon, 'sand', ['darkSand', P.speck]);
}

export function rocks(p: Painter, spots: [number, number][]): void {
  for (const [x, y] of spots) {
    p.poly([[x, y], [x + 2, y - 2], [x + 5, y - 2], [x + 7, y]], 'brown');
    p.line(x + 2, y - 2, x + 5, y - 2, 'darkSand');
  }
}

export interface Room {
  /** The back wall's rectangle. */
  readonly back?: readonly [number, number, number, number];
  readonly wall?: Colour;
  readonly shade?: Colour;
  readonly floor?: Colour;
  readonly ceiling?: Colour;
  /** Stone blocks drawn on the walls. */
  readonly blocks?: boolean;
}

/** A stone chamber in one-point perspective, as the 8-bit SAGA pictures drew rooms. */
export function chamber(p: Painter, room: Room = {}): void {
  const [x0, y0, x1, y1] = room.back ?? [44, 16, 116, 54];
  const wall = room.wall ?? 'stone';
  const shade = room.shade ?? 'darkStone';
  p.poly([[0, 0], [160, 0], [x1, y0], [x0, y0]], room.ceiling ?? 'darkBrown', ['black', P.checker]);
  p.poly([[0, 80], [160, 80], [x1, y1], [x0, y1]], room.floor ?? 'darkSand', ['darkStone', P.grain]);
  p.poly([[0, 0], [x0, y0], [x0, y1], [0, 80]], wall, [shade, P.checker]);
  p.poly([[160, 0], [x1, y0], [x1, y1], [160, 80]], shade, ['darkBrown', P.checker]);
  p.rect(x0, y0, x1 - x0, y1 - y0, wall, ['lightStone', P.speck]);
  if (room.blocks !== false) {
    const rows = 6;
    const h = (y1 - y0) / rows;
    for (let r = 1; r < rows; r++) p.line(x0, y0 + r * h, x1 - 1, y0 + r * h, shade);
    for (let r = 0; r < rows; r++) {
      for (let x = x0 + (r % 2 ? 6 : 0) + 12; x < x1 - 2; x += 12) p.line(x, y0 + r * h + 1, x, y0 + (r + 1) * h - 1, shade);
    }
    for (let r = 1; r < rows; r++) {
      p.line(0, (80 * r) / rows, x0, y0 + r * h, 'darkStone');
      p.line(160, (80 * r) / rows, x1, y0 + r * h, 'darkBrown');
    }
  }
  p.path([[0, 0], [x0, y0], [x1, y0], [160, 0]], 'black');
  p.path([[0, 80], [x0, y1], [x1, y1], [160, 80]], 'darkBrown');
  p.line(x0, y0, x0, y1, 'darkBrown');
  p.line(x1, y0, x1, y1, 'darkBrown');
}

/** A dark doorway, square-topped, standing on `base`. */
export function doorway(p: Painter, x: number, base: number, w: number, h: number, frame: Colour = 'darkBrown'): void {
  p.rect(x - 1, base - h - 2, w + 2, h + 2, frame);
  p.rect(x, base - h, w, h, 'black');
}

export function torch(p: Painter, x: number, y: number): void {
  p.rect(x, y, 2, 6, 'brown');
  p.disc(x + 1, y - 2, 2, 'orange', ['yellow', P.checker], 3);
  p.dot(x + 1, y - 4, 'yellow');
}
