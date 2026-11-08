// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pictures for Pyramid of Doom (Adventure 8), which never had any.
// Rooms are pictures 1–27; things that come and go (mummies, rats, the
// sarcophagus…) are drawn over them as pictures 100 + item number.

import { PATTERNS as P, type Colour, type Painter, type SceneSet } from './scenes.js';

// ---------------------------------------------------------------- outdoors

function sky(p: Painter, horizon: number): void {
  p.rect(0, 0, 160, horizon, 'sky');
  p.rect(0, horizon - 14, 160, 8, 'sky', ['lightSky', P.checker]);
  p.rect(0, horizon - 6, 160, 6, 'lightSky', ['paleSky', P.checker]);
}

function sun(p: Painter, x: number, y: number): void {
  p.disc(x, y, 6, 'yellow');
  p.disc(x, y, 4, 'white', ['yellow', P.checker]);
}

function sand(p: Painter, horizon: number): void {
  p.rect(0, horizon, 160, 80 - horizon, 'sand', ['darkSand', P.speck]);
}

function dune(p: Painter, points: [number, number][], light = true): void {
  p.poly(points, light ? 'lightSand' : 'darkSand', light ? ['sand', P.sparse] : ['sand', P.sparse]);
}

function pyramid(p: Painter, cx: number, base: number, half: number, height: number, entrance = false): void {
  const top = base - height;
  const right = cx + half;
  const back = cx + half + half * 0.3;
  p.poly([[cx - half, base], [cx, top], [right, base]], 'sand');
  p.poly([[cx, top], [right, base], [back, base - height * 0.12]], 'darkSand', ['brown', P.checker]);
  const courses = Math.max(2, Math.floor(height / 4));
  for (let i = 1; i < courses; i++) {
    const y = top + (i * height) / courses;
    const w = (half * (y - top)) / height;
    p.line(cx - w, y, cx + w, y, 'darkSand');
  }
  p.line(cx - half, base, cx, top, 'darkBrown');
  p.line(cx, top, back, base - height * 0.12, 'darkBrown');
  if (entrance) {
    const w = Math.max(2, half * 0.14);
    p.rect(cx - w, base - w * 1.6, 2 * w, w * 1.6, 'black');
    p.poly([[cx - w, base - w * 1.6], [cx, base - w * 2.4], [cx + w, base - w * 1.6]], 'black');
  }
}

function rocks(p: Painter, spots: [number, number][]): void {
  for (const [x, y] of spots) {
    p.poly([[x, y], [x + 2, y - 2], [x + 5, y - 2], [x + 7, y]], 'brown');
    p.line(x + 2, y - 2, x + 5, y - 2, 'darkSand');
  }
}

function desert(p: Painter, horizon = 46): void {
  sky(p, horizon);
  sand(p, horizon);
}

// ---------------------------------------------------------------- indoors

interface Room {
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
function chamber(p: Painter, room: Room = {}): void {
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
function doorway(p: Painter, x: number, base: number, w: number, h: number, frame: Colour = 'darkBrown'): void {
  p.rect(x - 1, base - h - 2, w + 2, h + 2, frame);
  p.rect(x, base - h, w, h, 'black');
}

function torch(p: Painter, x: number, y: number): void {
  p.rect(x, y, 2, 6, 'brown');
  p.disc(x + 1, y - 2, 2, 'orange', ['yellow', P.checker], 3);
  p.dot(x + 1, y - 4, 'yellow');
}

function hieroglyphs(p: Painter, x: number, y: number, w: number, h: number, ink: Colour): void {
  const marks: ((x: number, y: number) => void)[] = [
    (a, b) => p.disc(a + 2, b + 2, 2, ink, undefined, 1), // eye
    (a, b) => p.path([[a, b + 4], [a + 2, b], [a + 4, b + 4]], ink), // bird's head
    (a, b) => p.path([[a + 2, b], [a + 2, b + 4], [a, b + 2], [a + 4, b + 2]], ink), // ankh-ish
    (a, b) => p.path([[a, b + 1], [a + 4, b + 1], [a + 4, b + 4]], ink),
    (a, b) => p.path([[a, b + 4], [a + 1, b + 1], [a + 3, b + 1], [a + 4, b + 4]], ink),
    (a, b) => p.path([[a, b + 3], [a + 1, b + 2], [a + 2, b + 3], [a + 3, b + 2], [a + 4, b + 3]], ink), // water
  ];
  let k = 0;
  for (let j = y; j + 5 <= y + h; j += 7) {
    for (let i = x; i + 5 <= x + w; i += 7) marks[(k++ * 7 + (j >> 1)) % marks.length]!(i, j);
  }
}

// ---------------------------------------------------------------- rooms

const rooms: Record<number, (p: Painter) => void> = {
  // 1 desert: dunes, the pyramid far off to the south
  1: (p) => {
    desert(p);
    sun(p, 30, 12);
    pyramid(p, 112, 46, 12, 12);
    dune(p, [[0, 54], [50, 46], [96, 58], [0, 64]]);
    dune(p, [[90, 80], [130, 60], [160, 62], [160, 80]], false);
    rocks(p, [[20, 72], [62, 70]]);
  },
  // 2 desert: dunes and bleached bones
  2: (p) => {
    desert(p, 42);
    sun(p, 126, 14);
    dune(p, [[0, 50], [40, 42], [90, 52], [0, 58]]);
    dune(p, [[60, 46], [120, 40], [160, 48], [160, 54], [70, 54]]);
    dune(p, [[0, 80], [30, 64], [80, 70], [70, 80]], false);
    // a camel's skull
    p.poly([[96, 66], [110, 64], [114, 68], [108, 72], [98, 71]], 'white', ['lightGrey', P.sparse]);
    p.disc(103, 67, 1, 'black');
    p.path([[110, 64], [116, 61]], 'lightGrey');
    p.path([[118, 72], [130, 73]], 'white');
    p.path([[120, 75], [132, 74]], 'white');
  },
  // 3 desert: flat sand, scrub
  3: (p) => {
    desert(p, 44);
    sun(p, 80, 10);
    dune(p, [[0, 48], [60, 44], [110, 50], [0, 54]]);
    dune(p, [[100, 80], [140, 58], [160, 56], [160, 80]], false);
    rocks(p, [[30, 70], [72, 76], [12, 60]]);
    for (const x of [40, 54]) p.path([[x, 62], [x - 2, 58], [x, 60], [x + 1, 57], [x + 2, 61], [x + 4, 58], [x + 3, 62]], 'darkGreen');
  },
  // 4 desert next to a pyramid
  4: (p) => {
    desert(p);
    sun(p, 136, 12);
    pyramid(p, 84, 52, 48, 44, true);
    dune(p, [[0, 60], [40, 52], [70, 62], [0, 70]]);
    rocks(p, [[18, 74], [118, 70], [74, 76]]);
  },
  // 5 hole: dug down into the sand, a tiny door at the bottom
  5: (p) => {
    p.rect(0, 0, 160, 80, 'darkSand', ['brown', P.grain]);
    p.poly([[0, 0], [160, 0], [126, 22], [34, 22]], 'sky', ['lightSky', P.checker]);
    p.poly([[0, 0], [34, 22], [44, 70], [0, 80]], 'sand', ['darkSand', P.grain]);
    p.poly([[160, 0], [126, 22], [116, 70], [160, 80]], 'darkSand', ['brown', P.grain]);
    p.poly([[0, 80], [44, 70], [116, 70], [160, 80]], 'sand', ['darkSand', P.speck]);
    p.rect(34, 22, 92, 48, 'sand', ['darkSand', P.grain]);
    p.path([[0, 0], [34, 22], [126, 22], [160, 0]], 'lightSand');
    p.rect(64, 44, 32, 26, 'darkStone', ['stone', P.checker]);
    p.path([[64, 44], [96, 44], [96, 70]], 'lightStone');
  },
  // 6 rocky entrance-way
  6: (p) => {
    p.rect(0, 0, 160, 80, 'darkStone', ['stone', P.grain]);
    p.poly([[0, 0], [60, 0], [40, 30], [44, 60], [0, 80]], 'stone', ['lightStone', P.speck]);
    p.poly([[160, 0], [100, 0], [122, 26], [116, 62], [160, 80]], 'darkStone', ['darkBrown', P.checker]);
    p.poly([[0, 80], [44, 60], [116, 62], [160, 80]], 'darkSand', ['darkStone', P.grain]);
    p.poly([[60, 0], [100, 0], [122, 26], [116, 62], [44, 60], [40, 30]], 'stone', ['darkStone', P.speck]);
    doorway(p, 68, 60, 24, 28, 'darkStone');
    p.path([[40, 30], [60, 0]], 'darkBrown');
    p.path([[122, 26], [100, 0]], 'black');
    torch(p, 52, 34);
  },
  // 7 sarcophagus: inside it, stairs going down
  7: (p) => {
    p.rect(0, 0, 160, 80, 'darkBrown', ['black', P.checker]);
    p.poly([[10, 4], [150, 4], [140, 76], [20, 76]], 'brown', ['darkBrown', P.grain]);
    p.poly([[30, 14], [130, 14], [124, 70], [36, 70]], 'black');
    for (let i = 0; i < 6; i++) {
      const y = 70 - i * 8;
      const inset = 36 + i * 6;
      p.rect(inset, y - 4, 160 - 2 * inset, 4, 'stone', ['darkStone', P.checker]);
      p.line(inset, y - 4, 160 - inset, y - 4, 'lightStone');
    }
    p.path([[10, 4], [150, 4], [140, 76], [20, 76], [10, 4]], 'gold');
  },
  // 8 burial room: torches, painted walls
  8: (p) => {
    chamber(p, { wall: 'lightStone', shade: 'stone' });
    hieroglyphs(p, 50, 20, 60, 14, 'red');
    p.rect(44, 36, 72, 2, 'gold');
    torch(p, 20, 30);
    torch(p, 138, 30);
  },
  // 9 long, narrow passageway
  9: (p) => chamber(p, { back: [72, 28, 88, 46] }),
  // 10 hidden alcove: low and close
  10: (p) => {
    chamber(p, { back: [30, 20, 130, 60], wall: 'darkStone', shade: 'darkBrown' });
    p.rect(30, 20, 100, 40, 'darkStone', ['stone', P.speck]);
  },
  // 11 tall room
  11: (p) => {
    chamber(p, { back: [56, 6, 104, 62] });
    p.rect(56, 6, 48, 4, 'black', ['darkBrown', P.checker]);
  },
  // 12 dining hall
  12: (p) => {
    chamber(p, { back: [36, 18, 124, 50], wall: 'stone' });
    torch(p, 60, 24);
    torch(p, 98, 24);
    p.rect(64, 22, 32, 14, 'darkRed', ['red', P.checker]); // tapestry
    p.path([[64, 36], [66, 38], [68, 36], [70, 38], [72, 36], [74, 38], [76, 36], [78, 38], [80, 36], [82, 38], [84, 36], [86, 38], [88, 36], [90, 38], [92, 36], [94, 38], [96, 36]], 'gold');
  },
  // 13 hallway, an archway at the end
  13: (p) => {
    chamber(p, { back: [64, 22, 96, 50] });
    p.disc(80, 34, 9, 'black', undefined, 8);
    p.rect(71, 34, 18, 16, 'black');
  },
  // 14 round altar room
  14: (p) => {
    p.rect(0, 0, 160, 80, 'stone', ['darkStone', P.checker]);
    p.disc(80, 0, 90, 'darkBrown', ['black', P.checker], 18);
    for (const x of [6, 42, 80, 118, 154]) {
      const w = x === 80 ? 10 : 8;
      p.rect(x - w / 2, 14, w, 52, 'lightStone', ['stone', P.columns]);
      p.rect(x - w / 2 - 1, 12, w + 2, 3, 'lightStone');
    }
    p.disc(80, 80, 90, 'darkSand', ['darkStone', P.grain], 16);
    doorway(p, 24, 62, 10, 18);
    doorway(p, 126, 62, 10, 18);
  },
  // 15 hieroglyphics room
  15: (p) => {
    chamber(p, { wall: 'lightStone', shade: 'stone', blocks: false });
    hieroglyphs(p, 46, 18, 70, 34, 'darkBrown');
    hieroglyphs(p, 4, 14, 36, 40, 'darkRed');
    p.rect(44, 16, 72, 1, 'gold');
    p.rect(44, 53, 72, 1, 'gold');
  },
  // 16 sitting room
  16: (p) => {
    chamber(p, { wall: 'stone' });
    p.rect(14, 40, 14, 24, 'darkRed', ['red', P.checker]); // a couch on the left
    p.rect(12, 36, 4, 28, 'brown');
    torch(p, 140, 30);
  },
  // 17 sloping crawlway
  17: (p) => {
    p.rect(0, 0, 160, 80, 'darkStone', ['black', P.grain]);
    p.poly([[0, 0], [160, 0], [160, 20], [100, 38], [60, 46], [0, 36]], 'darkBrown', ['black', P.checker]);
    p.poly([[0, 80], [0, 64], [60, 52], [100, 46], [160, 40], [160, 80]], 'darkSand', ['darkStone', P.grain]);
    p.poly([[60, 46], [100, 38], [100, 46], [60, 52]], 'black');
    p.path([[0, 36], [60, 46], [100, 38], [160, 20]], 'black');
    p.path([[0, 64], [60, 52], [100, 46], [160, 40]], 'darkBrown');
  },
  // 18 Revolving cavern
  18: (p) => {
    p.rect(0, 0, 160, 80, 'darkStone', ['black', P.checker]);
    p.disc(80, 44, 76, 'stone', ['darkStone', P.grain], 40);
    p.disc(80, 50, 58, 'darkSand', ['darkStone', P.grain], 24);
    for (let a = 0; a < 12; a++) {
      const t = (a * Math.PI) / 6;
      p.line(80 + Math.cos(t) * 20, 50 + Math.sin(t) * 8, 80 + Math.cos(t) * 56, 50 + Math.sin(t) * 22, 'darkBrown');
    }
    p.disc(80, 50, 18, 'stone', ['lightStone', P.checker], 7);
    for (const [x, d] of [[30, 1], [130, -1]] as const) {
      p.path([[x, 14], [x + 8 * d, 10], [x + 14 * d, 14]], 'gold');
      p.path([[x + 14 * d, 14], [x + 11 * d, 12], [x + 11 * d, 16]], 'gold');
    }
  },
  // 19 prison cell
  19: (p) => {
    chamber(p, { back: [40, 14, 120, 56], wall: 'darkStone', shade: 'darkBrown' });
    for (let x = 0; x <= 160; x += 12) p.rect(x, 0, 3, 80, 'darkGrey', ['grey', P.columns]);
    p.rect(0, 4, 160, 3, 'darkGrey', ['grey', P.rows]);
    p.rect(0, 70, 160, 3, 'darkGrey', ['grey', P.rows]);
  },
  // 20 narrow ledge, a pool far below
  20: (p) => {
    p.rect(0, 0, 160, 80, 'black', ['darkStone', P.speck]);
    p.disc(80, 0, 16, 'darkGrey', ['black', P.checker], 6); // hole in the ceiling
    p.poly([[0, 0], [40, 0], [30, 80], [0, 80]], 'darkStone', ['stone', P.grain]);
    p.poly([[160, 0], [124, 0], [134, 80], [160, 80]], 'darkStone', ['darkBrown', P.grain]);
    p.disc(80, 74, 30, 'green', ['darkGreen', P.checker], 6);
    p.disc(80, 74, 20, 'yellow', ['green', P.checker], 3);
    p.poly([[0, 52], [70, 50], [64, 56], [0, 60]], 'stone', ['lightStone', P.speck]);
    p.path([[0, 52], [70, 50]], 'lightStone');
  },
  // 21 throne room: mural on the wall, a chain from the ceiling
  21: (p) => {
    chamber(p, { wall: 'lightStone', shade: 'stone' });
    p.rect(48, 18, 64, 14, 'sand', ['lightSand', P.checker]); // the mural
    p.rect(48, 18, 64, 1, 'gold');
    p.rect(48, 31, 64, 1, 'gold');
    p.disc(70, 25, 4, 'red', undefined, 4);
    p.disc(90, 25, 3, 'red', undefined, 3);
    hieroglyphs(p, 52, 21, 12, 8, 'darkBrown');
    hieroglyphs(p, 96, 21, 12, 8, 'darkBrown');
    p.rect(54, 62, 52, 10, 'darkRed', ['red', P.checker]); // a rug
    for (let y = 0; y < 30; y += 3) p.rect(130, y, 2, 2, 'grey'); // the chain
    p.rect(118, 52, 14, 10, 'brown', ['darkBrown', P.rows]); // the chest
    p.rect(118, 50, 14, 3, 'darkBrown');
    p.rect(124, 54, 2, 3, 'gold');
  },
  // 22 treasure room: gold walls
  22: (p) => {
    chamber(p, { wall: 'gold', shade: 'darkSand' });
    torch(p, 22, 30);
  },
  // 23 on top of a pyramid: the desert from above
  23: (p) => {
    sky(p, 40);
    sun(p, 30, 10);
    p.rect(0, 40, 160, 40, 'sand', ['darkSand', P.speck]);
    dune(p, [[0, 46], [50, 42], [100, 48], [0, 52]]);
    dune(p, [[90, 44], [130, 42], [160, 46], [160, 50], [100, 50]], false);
    p.disc(26, 48, 6, 'green', ['darkGreen', P.checker], 2); // the oasis, far off
    p.poly([[30, 80], [80, 54], [130, 80]], 'sand');
    p.poly([[80, 54], [130, 80], [160, 80], [160, 76]], 'darkSand', ['brown', P.checker]);
    for (let y = 58; y < 80; y += 4) p.line(80 - (y - 54) * 2, y, 80 + (y - 54) * 2, y, 'darkSand');
    p.path([[30, 80], [80, 54], [160, 76]], 'darkBrown');
  },
  // 24 Pool of water: an oasis
  24: (p) => {
    desert(p, 40);
    sun(p, 120, 10);
    p.disc(76, 60, 46, 'water', ['lightWater', P.rows], 10);
    p.disc(76, 60, 46, 'water', ['lightWater', P.rows], 10);
    p.recolour(30, 50, 92, 20, 'water', 'lightWater', P.sparse);
    for (const [x, h] of [[24, 34], [136, 30], [120, 22]] as const) {
      p.path([[x, 54], [x + 1, 54 - h / 2], [x - 1, 54 - h]], 'brown');
      p.path([[x + 1, 54], [x + 2, 54 - h / 2], [x, 54 - h]], 'darkBrown');
      const t = 54 - h;
      for (const [dx, dy] of [[-10, 4], [-8, -3], [8, -3], [10, 4], [0, -6]] as const) {
        p.path([[x, t], [x + dx / 2, t + dy - 2], [x + dx, t + dy]], 'darkGreen');
        p.path([[x, t + 1], [x + dx / 2, t + dy - 1], [x + dx, t + dy + 1]], 'green');
      }
    }
    p.poly([[0, 70], [30, 64], [50, 72], [0, 78]], 'green', ['darkGreen', P.checker]);
  },
  // 25 a stone passage
  25: (p) => chamber(p, { back: [66, 26, 94, 48], wall: 'darkStone', shade: 'darkBrown' }),
  // 26 dressing room: a mirror and a chest of clothes
  26: (p) => {
    chamber(p, { wall: 'stone' });
    p.rect(68, 20, 24, 28, 'gold');
    p.rect(70, 22, 20, 24, 'paleSky', ['white', P.diagonal]);
    p.rect(124, 46, 18, 16, 'brown', ['darkBrown', P.rows]);
    p.path([[124, 46], [142, 46]], 'gold');
    p.rect(18, 30, 3, 34, 'brown');
    p.rect(14, 30, 12, 2, 'brown');
    p.rect(13, 32, 4, 12, 'purple', ['white', P.sparse]);
    p.rect(23, 32, 4, 10, 'red', ['white', P.sparse]);
  },
  // 27 lot of TROUBLE!
  27: (p) => {
    p.rect(0, 0, 160, 80, 'darkRed', ['black', P.checker]);
    p.disc(80, 36, 22, 'white', ['lightGrey', P.sparse], 22);
    p.rect(68, 52, 24, 14, 'white', ['lightGrey', P.sparse]);
    p.disc(71, 36, 6, 'black', undefined, 7);
    p.disc(89, 36, 6, 'black', undefined, 7);
    p.poly([[80, 44], [76, 52], [84, 52]], 'black');
    for (let x = 70; x <= 88; x += 4) p.line(x, 58, x, 66, 'black');
    p.line(68, 58, 92, 58, 'black');
  },
};

// ---------------------------------------------------------------- things

const MUMMY_SHAPE: [number, number][] = [[72, 74], [70, 40], [74, 30], [86, 30], [90, 40], [88, 74]];

function mummy(p: Painter, eyes: Colour, arms: 'down' | 'up' | 'lying'): void {
  if (arms === 'lying') {
    p.disc(80, 66, 34, 'white', ['lightGrey', P.rows], 6);
    p.disc(110, 64, 6, 'white', ['lightGrey', P.rows], 5);
    for (let x = 50; x < 112; x += 5) p.line(x, 61, x + 3, 71, 'grey');
    p.line(107, 64, 109, 64, 'black');
    p.line(112, 64, 114, 64, 'black');
    return;
  }
  p.poly(MUMMY_SHAPE, 'white', ['lightGrey', P.rows]);
  p.path([...MUMMY_SHAPE, MUMMY_SHAPE[0]!], 'darkBrown');
  p.disc(80, 26, 7, 'white', ['lightGrey', P.rows], 7);
  for (let y = 34; y < 74; y += 5) p.line(71, y, 89, y + 3, 'grey');
  p.dot(77, 25, eyes);
  p.dot(83, 25, eyes);
  if (arms === 'up') {
    p.poly([[70, 40], [54, 30], [56, 26], [72, 36]], 'white', ['lightGrey', P.rows]);
    p.poly([[90, 40], [106, 30], [104, 26], [88, 36]], 'white', ['lightGrey', P.rows]);
  } else {
    p.poly([[70, 40], [66, 60], [70, 60], [73, 44]], 'white', ['lightGrey', P.rows]);
    p.poly([[90, 40], [94, 60], [90, 60], [87, 44]], 'white', ['lightGrey', P.rows]);
  }
}

function sarcophagus(p: Painter, open: boolean): void {
  const d = 40; // to the right of the doorway
  const at = (pts: [number, number][]) => pts.map(([x, y]) => [x + d, y] as [number, number]);
  p.poly(at([[60, 76], [56, 54], [96, 54], [92, 76]]), 'gold', ['darkSand', P.sparse]);
  p.poly(at([[56, 54], [62, 48], [102, 48], [96, 54]]), open ? 'black' : 'gold', open ? undefined : ['lightSand', P.checker]);
  p.poly(at([[96, 54], [102, 48], [100, 70], [92, 76]]), 'darkSand', ['brown', P.checker]);
  if (open) p.poly(at([[34, 52], [52, 44], [54, 72], [38, 78]]), 'gold', ['darkSand', P.sparse]);
  else {
    p.disc(80 + d, 51, 5, 'water', undefined, 2); // painted face on the lid
    p.dot(78 + d, 51, 'black');
    p.dot(82 + d, 51, 'black');
  }
  p.path(at([[60, 76], [56, 54], [96, 54], [92, 76]]), 'darkBrown');
}

function rats(p: Painter, many: boolean): void {
  const spots: [number, number][] = many ? [[30, 70], [50, 74], [96, 72], [118, 68], [74, 76], [140, 74]] : [[118, 70], [134, 74]];
  for (const [x, y] of spots) {
    p.disc(x, y, 4, 'darkGrey', ['grey', P.sparse], 2);
    p.disc(x + 4, y - 1, 2, 'darkGrey', undefined, 1);
    p.dot(x + 5, y - 2, 'red');
    p.path([[x - 4, y], [x - 7, y - 2], [x - 9, y]], 'lightStone');
  }
}

function ironStatue(p: Painter, seated: boolean, x = 80): void {
  const top = seated ? 26 : 16;
  if (seated) {
    p.rect(x - 16, 30, 32, 40, 'gold', ['darkSand', P.sparse]); // the throne
    p.rect(x - 18, 26, 36, 6, 'gold');
  }
  p.poly([[x - 6, top + 10], [x + 6, top + 10], [x + 9, top + 36], [x - 9, top + 36]], 'darkGrey', ['grey', P.checker]);
  p.disc(x, top + 5, 5, 'darkGrey', ['grey', P.checker], 6);
  p.poly([[x - 7, top - 2], [x + 7, top - 2], [x + 9, top + 8], [x - 9, top + 8]], 'grey', ['darkGrey', P.rows]); // headdress
  p.rect(x - 9, top + 36, 6, seated ? 8 : 20, 'darkGrey', ['grey', P.checker]);
  p.rect(x + 3, top + 36, 6, seated ? 8 : 20, 'darkGrey', ['grey', P.checker]);
  p.dot(x - 2, top + 5, 'red');
  p.dot(x + 2, top + 5, 'red');
}

const things: Record<number, (p: Painter) => void> = {
  // 10 wooden pole sticking from sand
  10: (p) => {
    p.rect(98, 38, 3, 30, 'brown');
    p.line(98, 38, 98, 67, 'darkBrown');
    p.disc(99, 68, 6, 'darkSand', undefined, 2);
  },
  // 14 pool of liquid
  14: (p) => p.disc(60, 70, 16, 'green', ['darkGreen', P.checker], 4),
  // 20 / 22 closed and open sarcophagus
  20: (p) => sarcophagus(p, false),
  22: (p) => sarcophagus(p, true),
  // 27 small nomad
  27: (p) => {
    p.poly([[118, 76], [122, 50], [132, 50], [136, 76]], 'white', ['lightGrey', P.sparse]);
    p.disc(127, 46, 4, 'brown');
    p.poly([[121, 44], [127, 38], [133, 44]], 'white');
  },
  // 29 fearsome mummy, 32 enraged mummy, 33 sleeping mummy
  29: (p) => mummy(p, 'red', 'down'),
  32: (p) => mummy(p, 'yellow', 'up'),
  33: (p) => mummy(p, 'black', 'lying'),
  // 47 chopping block, 48 skull, 49 box
  47: (p) => {
    p.disc(60, 62, 12, 'brown', ['darkBrown', P.rows], 4);
    p.rect(48, 62, 24, 10, 'brown', ['darkBrown', P.columns]);
    p.disc(60, 72, 12, 'darkBrown', undefined, 3);
    p.poly([[58, 52], [70, 50], [70, 58], [62, 58]], 'grey', ['lightGrey', P.checker]); // an axe in it
    p.line(70, 50, 80, 42, 'brown');
  },
  48: (p) => {
    p.disc(96, 66, 5, 'white', ['lightGrey', P.sparse]);
    p.rect(93, 69, 6, 3, 'white');
    p.dot(94, 66, 'black');
    p.dot(98, 66, 'black');
  },
  49: (p) => {
    p.rect(110, 56, 18, 14, 'sand', ['darkSand', P.rows]);
    p.poly([[110, 56], [114, 52], [132, 52], [128, 56]], 'lightSand');
    p.poly([[128, 56], [132, 52], [132, 66], [128, 70]], 'darkSand');
  },
  // 53 metal bar protruding from ceiling, 54 decapitated skeleton
  53: (p) => p.rect(78, 0, 4, 20, 'grey', ['lightGrey', P.columns]),
  54: (p) => {
    p.rect(66, 70, 4, 6, 'white');
    p.line(68, 70, 92, 72, 'white');
    for (let x = 72; x < 86; x += 3) p.line(x, 67, x, 75, 'white');
    p.line(84, 72, 100, 70, 'white');
    p.line(84, 72, 98, 76, 'white');
  },
  // 56 fireplace
  56: (p) => {
    p.rect(62, 30, 36, 24, 'darkStone', ['stone', P.checker]);
    p.rect(58, 28, 44, 4, 'lightStone');
    p.rect(68, 38, 24, 16, 'black');
  },
  // 60 table
  60: (p) => {
    p.poly([[40, 54], [120, 54], [132, 62], [28, 62]], 'brown', ['darkBrown', P.rows]);
    p.rect(30, 62, 4, 14, 'darkBrown');
    p.rect(126, 62, 4, 14, 'darkBrown');
    p.rect(48, 56, 4, 14, 'darkBrown');
    p.rect(108, 56, 4, 14, 'darkBrown');
    p.rect(60, 50, 4, 4, 'gold');
    p.disc(84, 54, 6, 'lightGrey', undefined, 1);
    p.rect(100, 50, 4, 4, 'gold');
  },
  // 63 giant oyster
  63: (p) => {
    p.disc(110, 70, 20, 'grey', ['darkGrey', P.rows], 7);
    p.disc(110, 62, 18, 'lightGrey', ['grey', P.rows], 6);
    p.path([[92, 66], [128, 66]], 'black');
  },
  // 66 blood-stained altar
  66: (p) => {
    p.rect(64, 44, 32, 18, 'lightStone', ['stone', P.speck]);
    p.rect(60, 40, 40, 5, 'white', ['lightStone', P.checker]);
    p.poly([[70, 40], [78, 40], [76, 50], [72, 47]], 'darkRed');
    p.rect(84, 40, 4, 10, 'red');
  },
  // 69 satisfied rats, 71 starving rats
  69: (p) => rats(p, false),
  71: (p) => rats(p, true),
  // 73 hissing cobra
  73: (p) => {
    p.disc(46, 72, 12, 'darkGreen', ['green', P.checker], 4);
    p.poly([[42, 70], [44, 46], [52, 46], [50, 70]], 'green', ['darkGreen', P.checker]);
    p.disc(48, 44, 7, 'green', ['darkGreen', P.checker], 5);
    p.dot(46, 43, 'red');
    p.dot(50, 43, 'red');
    p.path([[48, 48], [48, 51], [46, 53]], 'red');
  },
  // 76 dead explorer chained to the wall
  76: (p) => {
    p.path([[50, 20], [56, 30]], 'grey');
    p.path([[94, 20], [88, 30]], 'grey');
    p.poly([[64, 30], [80, 30], [78, 58], [66, 58]], 'sand', ['darkSand', P.checker]);
    p.path([[64, 30], [56, 30]], 'white');
    p.path([[80, 30], [88, 30]], 'white');
    p.disc(72, 25, 5, 'white', ['lightGrey', P.sparse]);
    p.poly([[66, 21], [78, 21], [80, 18], [64, 18]], 'darkSand'); // pith helmet
    p.dot(70, 25, 'black');
    p.dot(74, 25, 'black');
    p.rect(66, 58, 4, 14, 'white');
    p.rect(74, 58, 4, 14, 'white');
  },
  // 77 pile of rubbish
  77: (p) => p.poly([[96, 76], [104, 66], [116, 64], [126, 70], [132, 76]], 'darkSand', ['darkStone', P.grain]),
  // 78 closed portal, 79 open portal
  78: (p) => p.rect(98, 28, 18, 28, 'darkGrey', ['grey', P.rows]),
  79: (p) => p.rect(98, 28, 18, 28, 'black'),
  // 80 purple worm
  80: (p) => {
    p.disc(80, 66, 40, 'purple', ['darkRed', P.checker], 10);
    p.disc(116, 52, 12, 'purple', ['darkRed', P.checker], 12);
    p.disc(118, 54, 6, 'black');
    for (const dx of [-4, 0, 4]) p.dot(118 + dx, 48, 'white');
  },
  // 85 rope hanging from ceiling
  85: (p) => {
    for (let y = 0; y < 60; y++) p.dot(30 + (y % 4 < 2 ? 0 : 1), y, y % 3 ? 'sand' : 'darkSand');
  },
  // 86 iron statue on its throne, 94 standing, 95 advancing
  86: (p) => ironStatue(p, true),
  94: (p) => ironStatue(p, false),
  95: (p) => {
    ironStatue(p, false, 90);
    p.poly([[81, 28], [62, 36], [64, 40], [82, 32]], 'darkGrey', ['grey', P.checker]);
  },
  // 96 pile of melted iron
  96: (p) => p.disc(80, 70, 22, 'darkGrey', ['orange', P.speck], 5),
  // 92 spiral staircase
  92: (p) => {
    p.rect(76, 10, 8, 64, 'darkStone');
    for (let i = 0; i < 9; i++) {
      const y = 70 - i * 7;
      const d = i % 2 ? 1 : -1;
      p.poly([[80, y], [80 + 20 * d, y - 2], [80 + 20 * d, y + 1], [80, y + 3]], 'stone', ['lightStone', P.checker]);
    }
  },
  // 99 treasure coffer, 44 open treasure coffer
  99: (p) => {
    p.rect(64, 52, 32, 18, 'brown', ['darkBrown', P.rows]);
    p.poly([[64, 52], [68, 44], [92, 44], [96, 52]], 'brown');
    p.rect(64, 52, 32, 2, 'gold');
    p.rect(78, 54, 4, 4, 'gold');
  },
  44: (p) => {
    p.rect(64, 52, 32, 18, 'brown', ['darkBrown', P.rows]);
    p.poly([[64, 52], [96, 52], [92, 36], [68, 36]], 'darkBrown');
    p.disc(80, 52, 14, 'gold', ['yellow', P.checker], 3);
  },
  // 100 barred window, 98 open window
  100: (p) => {
    p.rect(68, 22, 24, 16, 'paleSky', ['white', P.sparse]);
    for (let x = 70; x < 92; x += 5) p.rect(x, 22, 2, 16, 'darkGrey');
  },
  98: (p) => p.rect(68, 22, 24, 16, 'paleSky', ['white', P.sparse]),
  // 58 ladder
  58: (p) => {
    p.rect(30, 20, 2, 56, 'brown');
    p.rect(42, 20, 2, 56, 'brown');
    for (let y = 24; y < 76; y += 7) p.rect(30, y, 14, 2, 'brown');
  },
};

const pictures: Record<number, (p: Painter) => void> = { ...rooms };
for (const [item, draw] of Object.entries(things)) pictures[100 + Number(item)] = draw;

export const PYRAMID_OF_DOOM: SceneSet = {
  pictures,
  rooms: Object.fromEntries(Object.keys(rooms).map((r) => [r, Number(r)])),
};

/** Item number → picture number, for the things drawn over rooms. */
export const PYRAMID_OF_DOOM_ITEMS: ReadonlyMap<number, number> = new Map(Object.keys(things).map((i) => [Number(i), 100 + Number(i)]));
