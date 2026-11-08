// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pictures for The Golden Voyage (Adventure 12), which never had any.
// Rooms are pictures 1–37 (8, 26 and 31 are hidden store rooms the player
// never sees, so they have none); things that come and go (the king, the
// cyclops, the statue, the shores seen from the ship…) are drawn over them
// as pictures 100 + item number.

import { PATTERNS as P, type Colour, type Painter, type SceneSet } from './scenes.js';
import { chamber, rocks, sky, sun, torch } from './scenes-common.js';

// ---------------------------------------------------------------- pieces

function sea(p: Painter, horizon: number, bottom = 80): void {
  p.rect(0, horizon, 160, bottom - horizon, 'water', ['lightWater', P.rows]);
  p.recolour(0, horizon, 160, bottom - horizon, 'lightWater', 'water', P.speck);
  p.line(0, horizon, 159, horizon, 'navy');
}

function dome(p: Painter, x: number, base: number, r: number, c: Colour = 'white'): void {
  p.rect(x - r, base - r, 2 * r, r, 'lightStone', ['white', P.sparse]);
  p.disc(x, base - r, r, c, c === 'gold' ? ['yellow', P.checker] : ['lightGrey', P.sparse], r * 0.9);
  p.line(x, base - r * 1.9 - 4, x, base - r * 1.9, 'gold');
  p.dot(x, base - r * 1.9 - 5, 'gold');
}

function minaret(p: Painter, x: number, base: number, h: number): void {
  p.rect(x - 2, base - h, 5, h, 'lightStone', ['white', P.columns]);
  p.rect(x - 3, base - h + 6, 7, 2, 'stone');
  p.disc(x + 0.5, base - h, 3, 'gold', undefined, 3);
  p.line(x, base - h - 6, x, base - h - 3, 'gold');
}

/** A pointed (onion) arch opening. */
function arch(p: Painter, x: number, base: number, w: number, h: number, c: Colour = 'black'): void {
  p.rect(x, base - h + w / 2, w, h - w / 2, c);
  p.disc(x + w / 2, base - h + w / 2, w / 2, c);
  p.poly([[x + w / 2 - 2, base - h + 2], [x + w / 2, base - h - 2], [x + w / 2 + 2, base - h + 2]], c);
}

function palm(p: Painter, x: number, base: number, h: number, lean = 1): void {
  p.path([[x, base], [x + lean, base - h / 2], [x + 2 * lean, base - h]], 'brown');
  p.path([[x + 1, base], [x + 1 + lean, base - h / 2], [x + 1 + 2 * lean, base - h]], 'darkBrown');
  const tx = x + 2 * lean;
  const t = base - h;
  for (const [dx, dy] of [[-12, 5], [-9, -3], [9, -3], [12, 5], [0, -6], [-5, 7], [6, 7]] as const) {
    p.path([[tx, t], [tx + dx / 2, t + dy - 2], [tx + dx, t + dy]], 'darkGreen');
    p.path([[tx, t + 1], [tx + dx / 2, t + dy - 1], [tx + dx, t + dy + 1]], 'green');
  }
}

/** A sailing ship side on: hull, mast, a square sail. */
function ship(p: Painter, x: number, water: number, size: number): void {
  const s = size;
  p.poly([[x - 3 * s, water - 2 * s], [x + 3 * s, water - 2 * s], [x + 2.4 * s, water], [x - 2.2 * s, water]], 'brown', ['darkBrown', P.rows]);
  p.rect(x - 3 * s, water - 2.3 * s, 6 * s, 0.4 * s + 1, 'gold');
  p.rect(x - 0.2 * s, water - 7 * s, Math.max(1, 0.3 * s), 5 * s, 'darkBrown');
  p.poly([[x - 2 * s, water - 6.5 * s], [x + 2 * s, water - 6.5 * s], [x + 2.2 * s, water - 3 * s], [x - 1.8 * s, water - 3 * s]], 'white', ['lightGrey', P.sparse]);
  p.poly([[x + 2.8 * s, water - 2.2 * s], [x + 0.3 * s, water - 6 * s], [x + 0.3 * s, water - 2.4 * s]], 'lightSand');
  p.poly([[x - 0.2 * s, water - 7 * s], [x + 1.2 * s, water - 7.6 * s], [x - 0.2 * s, water - 8 * s]], 'red');
}

function jungle(p: Painter, variant: number): void {
  p.rect(0, 0, 160, 80, 'darkGreen', ['black', P.checker]);
  for (let i = 0; i < 14; i++) {
    const x = ((i * 37 + variant * 23) % 170) - 5;
    const w = 4 + ((i * 3 + variant) % 4);
    p.rect(x, 0, w, 80, 'brown', ['darkBrown', P.columns]);
  }
  for (let i = 0; i < 26; i++) {
    const h = Math.imul(i + 1 + variant * 31, 2654435761) >>> 0;
    const cx = (h % 176) - 8;
    const cy = ((h >>> 8) % 66) + 2;
    const r = 7 + ((h >>> 16) % 7);
    p.disc(cx, cy, r, 'darkGreen', undefined, r * 0.6);
    p.disc(cx - 1, cy - 1, r - 2, 'green', ['darkGreen', P.checker], r * 0.6 - 1);
  }
  p.rect(0, 66, 160, 14, 'darkGreen', ['green', P.grain]);
  for (let x = 4; x < 160; x += 9) p.path([[x, 80], [x + 2, 70], [x + 3, 80], [x + 6, 72], [x + 5, 80]], 'green');
  for (let i = 0; i < 4; i++) {
    const x = 20 + ((i * 47 + variant * 19) % 120);
    p.path([[x, 0], [x + 3, 20], [x - 2, 40], [x + 2, 56]], 'darkGreen'); // vines
  }
}

function island(p: Painter, horizon: number): void {
  sky(p, horizon);
  sea(p, horizon);
  p.disc(80, 84, 110, 'sand', ['lightSand', P.sparse], 28);
}

function caveRoom(p: Painter, wall: Colour, shade: Colour): void {
  p.rect(0, 0, 160, 80, 'black');
  p.poly([[34, 18], [60, 12], [96, 16], [126, 12], [128, 56], [100, 60], [60, 58], [32, 56]], shade, ['black', P.checker]); // the far dark
  p.poly([[0, 0], [160, 0], [126, 12], [110, 18], [96, 16], [76, 20], [60, 12], [46, 18], [34, 18]], wall, [shade, P.grain]);
  p.poly([[0, 0], [34, 18], [28, 30], [36, 44], [32, 56], [0, 80]], wall, [shade, P.grain]);
  p.poly([[160, 0], [126, 12], [132, 26], [124, 40], [128, 56], [160, 80]], shade, ['black', P.grain]);
  p.poly([[0, 80], [32, 56], [60, 58], [100, 60], [128, 56], [160, 80]], 'darkStone', ['darkBrown', P.grain]);
  p.path([[0, 0], [34, 18], [28, 30], [36, 44], [32, 56], [0, 80]], 'black');
  p.path([[160, 0], [126, 12], [132, 26], [124, 40], [128, 56], [160, 80]], 'black');
  for (const [x, l] of [[44, 10], [70, 7], [88, 12], [112, 9], [20, 8], [140, 10]] as const) {
    const top = x < 34 || x > 126 ? 2 : 16;
    p.poly([[x - 3, top], [x + 3, top], [x, top + l]], wall, [shade, P.checker]); // stalactites
  }
}

function templeColumns(p: Painter, wall: Colour): void {
  for (const x of [8, 34, 126, 152]) {
    p.rect(x - 4, 10, 8, 62, wall, ['white', P.columns]);
    p.rect(x - 6, 8, 12, 3, 'gold');
    p.rect(x - 6, 70, 12, 3, 'gold');
  }
}

function deck(p: Painter): void {
  p.poly([[0, 80], [0, 56], [160, 56], [160, 80]], 'brown', ['darkBrown', P.rows]);
  for (let x = -40; x < 200; x += 16) p.line(80 + (x - 80) * 0.3, 56, x, 80, 'darkBrown');
  p.rect(0, 50, 160, 6, 'darkBrown', ['brown', P.columns]); // the rail
  p.rect(0, 49, 160, 2, 'gold');
}

// ---------------------------------------------------------------- rooms

const rooms: Record<number, (p: Painter) => void> = {
  // 1 Royal palace: arches, carpets, the throne
  1: (p) => {
    chamber(p, { back: [36, 14, 124, 54], wall: 'lightStone', shade: 'stone', floor: 'darkRed', ceiling: 'navy', blocks: false });
    p.recolour(0, 54, 160, 26, 'darkStone', 'red', P.checker);
    for (const x of [44, 104]) arch(p, x, 54, 12, 28, 'navy');
    p.rect(66, 30, 28, 24, 'gold', ['yellow', P.sparse]); // throne
    p.disc(80, 30, 14, 'gold', ['yellow', P.sparse], 10);
    p.rect(70, 36, 20, 14, 'darkRed', ['red', P.checker]);
    p.rect(64, 50, 32, 4, 'gold');
    p.poly([[56, 80], [104, 80], [92, 54], [68, 54]], 'purple', ['darkRed', P.diagonal]); // carpet
    p.path([[56, 80], [68, 54]], 'gold');
    p.path([[104, 80], [92, 54]], 'gold');
    p.rect(0, 0, 160, 3, 'gold', ['yellow', P.checker]);
  },
  // 2 Persian city: the street up to the palace
  2: (p) => {
    sky(p, 50);
    sun(p, 20, 12);
    p.rect(30, 26, 100, 30, 'lightStone', ['white', P.speck]); // palace wall
    dome(p, 80, 26, 12, 'gold');
    dome(p, 46, 26, 8);
    dome(p, 114, 26, 8);
    minaret(p, 24, 50, 34);
    minaret(p, 136, 50, 34);
    arch(p, 72, 56, 16, 22, 'darkBrown');
    p.rect(30, 26, 100, 2, 'gold');
    p.poly([[0, 56], [160, 56], [160, 80], [0, 80]], 'sand', ['darkSand', P.speck]);
    p.poly([[56, 80], [104, 80], [88, 56], [72, 56]], 'lightStone', ['stone', P.checker]);
    p.rect(0, 40, 18, 22, 'sand', ['lightSand', P.sparse]); // houses at the sides
    p.rect(142, 38, 18, 24, 'sand', ['lightSand', P.sparse]);
    p.rect(6, 48, 5, 7, 'black');
    p.rect(148, 46, 5, 8, 'black');
  },
  // 3 Persian city: the market square
  3: (p) => {
    sky(p, 40);
    dome(p, 30, 34, 10);
    minaret(p, 52, 40, 30);
    dome(p, 120, 34, 12);
    minaret(p, 146, 40, 26);
    p.rect(0, 30, 160, 12, 'lightSand', ['sand', P.sparse]);
    p.poly([[0, 42], [160, 42], [160, 80], [0, 80]], 'sand', ['darkSand', P.speck]);
    const stall = (x: number, w: number, a: Colour, b: Colour) => {
      p.rect(x, 50, w, 16, 'brown', ['darkBrown', P.rows]);
      p.poly([[x - 3, 50], [x + w / 2, 40], [x + w + 3, 50]], a, [b, P.columns]);
      p.rect(x + 2, 46, w - 4, 4, 'black');
      p.rect(x + 3, 48, 3, 2, 'gold');
      p.rect(x + w - 7, 48, 3, 2, 'orange');
      p.line(x - 3, 50, x + w + 3, 50, 'darkBrown');
    };
    stall(8, 30, 'red', 'white');
    stall(64, 32, 'water', 'white');
    stall(118, 30, 'purple', 'gold');
    for (const [x, y] of [[48, 70], [104, 72]] as const) {
      p.disc(x, y, 5, 'orange', ['darkBrown', P.checker], 4); // pots
      p.rect(x - 2, y - 6, 4, 2, 'orange');
    }
  },
  // 4 Persian city: a narrow street of houses
  4: (p) => {
    sky(p, 60);
    minaret(p, 80, 44, 36);
    p.poly([[0, 0], [52, 18], [52, 64], [0, 80]], 'sand', ['lightSand', P.sparse]);
    p.poly([[160, 0], [108, 18], [108, 64], [160, 80]], 'darkSand', ['sand', P.checker]);
    p.rect(52, 30, 56, 34, 'lightSand', ['sand', P.sparse]);
    dome(p, 68, 30, 7);
    dome(p, 96, 30, 6);
    arch(p, 74, 64, 12, 18, 'darkBrown');
    p.poly([[0, 80], [52, 64], [108, 64], [160, 80]], 'lightStone', ['stone', P.checker]);
    for (const [x, y] of [[14, 30], [30, 36]] as const) arch(p, x, y + 14, 8, 14, 'black');
    for (const [x, y] of [[130, 30], [146, 26]] as const) arch(p, x, y + 14, 8, 14, 'black');
    p.rect(20, 52, 20, 3, 'red', ['white', P.columns]); // awning
    p.path([[52, 18], [52, 64]], 'darkSand');
    p.path([[108, 18], [108, 64]], 'darkBrown');
  },
  // 5 Persian bay: a quay, the open sea
  5: (p) => {
    sky(p, 40);
    sun(p, 130, 12);
    p.rect(0, 34, 44, 6, 'lightSand'); // the city behind, on the left
    dome(p, 14, 34, 6);
    minaret(p, 30, 40, 20);
    sea(p, 40);
    p.poly([[0, 56], [70, 56], [90, 80], [0, 80]], 'lightStone', ['stone', P.checker]); // quay
    p.rect(0, 54, 72, 3, 'stone');
    for (let x = 10; x < 70; x += 16) p.rect(x, 50, 4, 6, 'darkBrown');
    p.path([[0, 56], [70, 56], [90, 80]], 'darkStone');
  },
  // 6 on a large ship: the deck, the mast and sail
  6: (p) => {
    sky(p, 50);
    sea(p, 50);
    deck(p);
    p.rect(78, 0, 5, 56, 'darkBrown', ['brown', P.columns]);
    p.poly([[30, 4], [130, 4], [134, 40], [26, 40]], 'white', ['lightGrey', P.sparse]);
    p.path([[30, 4], [130, 4], [134, 40], [26, 40], [30, 4]], 'lightGrey');
    p.rect(26, 2, 108, 2, 'darkBrown');
    p.path([[0, 20], [26, 40]], 'darkBrown'); // rigging
    p.path([[160, 20], [134, 40]], 'darkBrown');
    p.rect(122, 60, 20, 14, 'darkBrown'); // the cabin hatch
    p.rect(124, 62, 16, 10, 'black');
  },
  // 7 sandy beach, the jungle behind
  7: (p) => {
    sky(p, 36);
    sea(p, 36, 50);
    p.poly([[0, 50], [160, 44], [160, 80], [0, 80]], 'sand', ['lightSand', P.speck]);
    p.poly([[0, 52], [160, 46], [160, 48], [0, 54]], 'white', ['lightWater', P.checker]); // surf
    p.poly([[96, 80], [110, 30], [160, 22], [160, 80]], 'darkGreen', ['green', P.checker]);
    palm(p, 112, 52, 30, -1);
    palm(p, 140, 48, 34, 1);
    rocks(p, [[20, 70], [56, 76]]);
  },
  // 9 dense jungle
  9: (p) => jungle(p, 0),
  // 10 dense jungle (another part)
  10: (p) => jungle(p, 3),
  // 11 damp cave with a strange fountain
  11: (p) => {
    caveRoom(p, 'darkStone', 'darkBrown');
    p.disc(80, 66, 22, 'grey', ['lightGrey', P.checker], 6);
    p.disc(80, 64, 16, 'purple', ['paleSky', P.checker], 3);
    p.rect(78, 44, 4, 18, 'grey');
    p.disc(80, 42, 6, 'purple', ['paleSky', P.checker], 3);
    p.path([[76, 42], [70, 52], [68, 60]], 'paleSky');
    p.path([[84, 42], [90, 52], [92, 60]], 'paleSky');
  },
  // 12 crow's-nest: high above the sea
  12: (p) => {
    sky(p, 54);
    sea(p, 54);
    p.rect(0, 62, 160, 18, 'brown', ['darkBrown', P.columns]); // the nest's rim
    p.rect(0, 60, 160, 3, 'darkBrown');
    p.rect(76, 0, 8, 62, 'darkBrown', ['brown', P.columns]); // top of the mast
    p.path([[80, 0], [0, 50]], 'darkBrown');
    p.path([[80, 0], [160, 50]], 'darkBrown');
    p.poly([[84, 2], [100, 6], [84, 10]], 'red');
  },
  // 13 small island: a lonely beach
  13: (p) => {
    island(p, 40);
    sun(p, 30, 12);
    palm(p, 120, 62, 30, 1);
    rocks(p, [[40, 70], [86, 74]]);
  },
  // 14 small island: the hut, the mountain
  14: (p) => {
    sky(p, 40);
    sea(p, 40);
    p.poly([[86, 44], [120, 6], [158, 44]], 'darkGreen', ['green', P.checker]); // mountain
    p.poly([[110, 16], [120, 6], [130, 16], [124, 14], [118, 18]], 'grey');
    p.disc(80, 84, 110, 'sand', ['lightSand', P.sparse], 36);
    p.poly([[30, 48], [56, 30], [82, 48]], 'lightSand', ['darkSand', P.diagonal]); // hut
    p.rect(36, 48, 40, 18, 'darkSand', ['brown', P.columns]);
    p.rect(50, 54, 12, 12, 'black');
    p.path([[30, 48], [56, 30], [82, 48]], 'brown');
    palm(p, 14, 66, 30, 1);
  },
  // 15 inside the grass hut
  15: (p) => {
    p.rect(0, 0, 160, 80, 'darkSand', ['brown', P.columns]);
    p.poly([[0, 0], [160, 0], [120, 20], [40, 20]], 'lightSand', ['darkSand', P.diagonal]);
    for (let x = 0; x <= 160; x += 10) p.line(80, -10, x, 22, 'brown');
    p.rect(40, 20, 80, 36, 'sand', ['darkSand', P.columns]);
    p.poly([[0, 80], [40, 56], [120, 56], [160, 80]], 'darkSand', ['brown', P.grain]);
    p.rect(98, 28, 14, 14, 'paleSky', ['white', P.sparse]); // window
    p.path([[0, 0], [40, 20], [40, 56], [0, 80]], 'brown');
    p.path([[160, 0], [120, 20], [120, 56], [160, 80]], 'brown');
  },
  // 16 dark cavern
  16: (p) => {
    caveRoom(p, 'darkGrey', 'black');
    p.disc(40, 70, 14, 'darkGrey', ['black', P.checker], 5);
  },
  // 17 on a mountain: the island far below
  17: (p) => {
    sky(p, 46);
    sun(p, 130, 10);
    sea(p, 46);
    p.disc(40, 52, 26, 'sand', ['darkGreen', P.checker], 4); // islands below
    p.disc(120, 56, 14, 'sand', ['darkGreen', P.checker], 3);
    p.poly([[0, 80], [10, 62], [40, 56], [80, 50], [120, 58], [150, 64], [160, 80]], 'grey', ['darkGrey', P.grain]);
    p.path([[10, 62], [40, 56], [80, 50], [120, 58], [150, 64]], 'lightGrey');
  },
  // 18 small island: palms and a dug patch
  18: (p) => {
    island(p, 44);
    palm(p, 30, 64, 32, 1);
    palm(p, 50, 62, 26, -1);
    p.disc(110, 66, 10, 'darkSand', ['brown', P.checker], 3);
  },
  // 19 rocky strand, the grassy plain behind
  19: (p) => {
    sky(p, 30);
    sea(p, 30, 46);
    p.poly([[0, 46], [160, 40], [160, 80], [0, 80]], 'grey', ['darkGrey', P.grain]);
    rocks(p, [[10, 56], [30, 74], [130, 76], [100, 64]]);
    p.poly([[0, 50], [24, 44], [40, 52], [0, 58]], 'darkGrey', ['grey', P.checker]);
    // the long staircase, climbing up the cliff
    p.poly([[64, 80], [96, 80], [90, 30], [70, 30]], 'lightStone', ['stone', P.rows]);
    for (let y = 34; y < 80; y += 4) p.line(70 - (y - 30) * 0.12, y, 90 + (y - 30) * 0.12, y, 'stone');
    p.path([[64, 80], [70, 30]], 'darkStone');
    p.path([[96, 80], [90, 30]], 'darkStone');
  },
  // 20 on a long staircase
  20: (p) => {
    sky(p, 80);
    for (let i = 0; i < 10; i++) {
      const y = 80 - i * 8;
      const inset = 10 + i * 6;
      p.rect(inset, y - 8, 160 - 2 * inset, 8, 'lightStone', ['stone', P.speck]);
      p.line(inset, y - 8, 160 - inset, y - 8, 'white');
      p.line(inset, y - 1, 160 - inset, y - 1, 'darkStone');
    }
    p.poly([[0, 80], [10, 80], [70, 0], [60, 0]], 'grey', ['darkGrey', P.checker]);
    p.poly([[160, 80], [150, 80], [90, 0], [100, 0]], 'grey', ['darkGrey', P.checker]);
  },
  // 21 sacred temple: the top of the stairs
  21: (p) => {
    chamber(p, { back: [44, 14, 116, 56], wall: 'lightStone', shade: 'stone', ceiling: 'darkRed', blocks: false });
    templeColumns(p, 'lightStone');
    arch(p, 66, 56, 28, 34, 'black');
    p.poly([[66, 80], [94, 80], [90, 62], [70, 62]], 'darkStone', ['stone', P.rows]); // stairs down
    for (let y = 64; y < 80; y += 4) p.line(70 - (y - 62) * 0.2, y, 90 + (y - 62) * 0.2, y, 'black');
  },
  // 22 sacred temple: the altar
  22: (p) => {
    chamber(p, { back: [44, 14, 116, 56], wall: 'lightStone', shade: 'stone', ceiling: 'darkRed', blocks: false });
    templeColumns(p, 'lightStone');
    p.disc(80, 26, 10, 'gold', ['yellow', P.checker], 10); // sun disc
    p.rect(60, 42, 40, 16, 'white', ['lightStone', P.checker]);
    p.rect(56, 40, 48, 4, 'gold');
    torch(p, 58, 32);
    torch(p, 100, 32);
  },
  // 23 hidden chamber
  23: (p) => chamber(p, { wall: 'darkStone', shade: 'darkBrown' }),
  // 24 hidden chamber, further in
  24: (p) => {
    chamber(p, { back: [56, 20, 104, 50], wall: 'darkStone', shade: 'darkBrown' });
    torch(p, 24, 28);
  },
  // 25 sacred temple: the inner shrine
  25: (p) => {
    chamber(p, { back: [44, 14, 116, 56], wall: 'gold', shade: 'darkSand', ceiling: 'darkRed', blocks: false });
    templeColumns(p, 'lightSand');
    p.rect(48, 18, 64, 20, 'darkRed', ['red', P.checker]); // a curtain
    p.path([[48, 38], [56, 34], [64, 38], [72, 34], [80, 38], [88, 34], [96, 38], [104, 34], [112, 38]], 'gold');
  },
  // 27 musty hallway
  27: (p) => {
    chamber(p, { back: [70, 26, 90, 48], wall: 'darkStone', shade: 'darkBrown', floor: 'darkStone' });
    p.recolour(0, 0, 160, 80, 'darkStone', 'green', P.sparse); // mould
  },
  // 28 small cabin
  28: (p) => {
    chamber(p, { back: [40, 16, 120, 56], wall: 'brown', shade: 'darkBrown', floor: 'brown', ceiling: 'darkBrown', blocks: false });
    p.rect(40, 16, 80, 40, 'brown', ['darkBrown', P.rows]);
    for (let y = 22; y < 56; y += 6) p.line(40, y, 119, y, 'darkBrown');
    p.disc(80, 32, 7, 'gold'); // porthole
    p.disc(80, 32, 5, 'water', ['lightWater', P.rows]);
    p.rect(8, 0, 2, 70, 'darkBrown'); // ladder up
    p.rect(22, 0, 2, 66, 'darkBrown');
    for (let y = 4; y < 66; y += 8) p.rect(8, y, 16, 2, 'brown');
    p.rect(118, 16, 2, 10, 'darkBrown'); // lantern
    p.disc(119, 30, 3, 'yellow', ['orange', P.checker], 4);
  },
  // 29 a cozy cot: looking up from the bed
  29: (p) => {
    p.rect(0, 0, 160, 80, 'brown', ['darkBrown', P.rows]);
    for (let x = 0; x < 160; x += 16) p.line(x, 0, x, 50, 'darkBrown');
    p.disc(110, 22, 8, 'gold');
    p.disc(110, 22, 6, 'navy', ['white', P.speck]); // night through the porthole
    p.rect(0, 50, 160, 30, 'white', ['lightGrey', P.diagonal]); // blanket
    p.disc(40, 52, 22, 'white', ['lightGrey', P.sparse], 8); // pillow
    p.rect(0, 74, 160, 6, 'red', ['darkRed', P.checker]);
  },
  // 30 damp grotto
  30: (p) => {
    caveRoom(p, 'darkStone', 'darkBrown');
    p.recolour(0, 0, 160, 80, 'darkBrown', 'water', P.sparse);
  },
  // 32 grassy plain
  32: (p) => {
    sky(p, 42);
    sun(p, 30, 10);
    p.poly([[0, 42], [50, 34], [110, 38], [160, 32], [160, 44], [0, 44]], 'darkGreen', ['green', P.checker]); // far hills
    p.rect(0, 44, 160, 36, 'green', ['darkGreen', P.grain]);
    for (let x = 2; x < 160; x += 7) p.path([[x, 78], [x + 1, 70], [x + 3, 78]], 'darkGreen');
    for (let x = 6; x < 160; x += 13) p.path([[x, 60], [x + 1, 56], [x + 2, 60]], 'darkGreen');
  },
  // 33 deep pit: looking up at the sky
  33: (p) => {
    p.rect(0, 0, 160, 80, 'darkStone', ['black', P.grain]);
    p.disc(80, 10, 36, 'sky', ['lightSky', P.checker], 10);
    p.poly([[0, 0], [40, 18], [36, 80], [0, 80]], 'darkBrown', ['darkStone', P.checker]);
    p.poly([[160, 0], [120, 18], [124, 80], [160, 80]], 'darkBrown', ['black', P.checker]);
    p.poly([[0, 80], [36, 66], [124, 66], [160, 80]], 'darkSand', ['darkStone', P.grain]);
    rocks(p, [[60, 74], [92, 72]]);
  },
  // 34 deep pit: the bottom, a cave mouth
  34: (p) => {
    p.rect(0, 0, 160, 80, 'darkStone', ['darkBrown', P.grain]);
    p.poly([[0, 0], [160, 0], [140, 10], [20, 10]], 'sky', ['lightSky', P.checker]);
    p.poly([[0, 80], [24, 60], [136, 60], [160, 80]], 'darkSand', ['darkStone', P.grain]);
    rocks(p, [[30, 74], [126, 70]]);
  },
  // 35 enormous cave
  35: (p) => {
    caveRoom(p, 'stone', 'darkStone');
    p.poly([[100, 62], [104, 30], [110, 62]], 'stone', ['lightStone', P.checker]); // a stalagmite
  },
  // 36 enormous cave: the magnificent fountain
  36: (p) => {
    caveRoom(p, 'stone', 'darkStone');
    p.disc(80, 66, 34, 'gold', ['yellow', P.checker], 8);
    p.disc(80, 64, 28, 'lightWater', ['white', P.checker], 5);
    p.rect(76, 30, 8, 32, 'gold', ['yellow', P.columns]);
    p.disc(80, 30, 12, 'gold', ['yellow', P.checker], 4);
    for (const d of [-1, 1]) {
      p.path([[80 + 6 * d, 26], [80 + 16 * d, 20], [80 + 24 * d, 30], [80 + 28 * d, 56]], 'white');
      p.path([[80 + 5 * d, 28], [80 + 14 * d, 23], [80 + 21 * d, 32], [80 + 24 * d, 56]], 'lightWater');
    }
    p.path([[80, 26], [80, 14], [78, 10]], 'white');
  },
  // 37 LOT OF TROUBLE!
  37: (p) => {
    p.rect(0, 0, 160, 80, 'darkRed', ['black', P.checker]);
    p.poly([[34, 70], [126, 70], [120, 76], [40, 76]], 'darkBrown');
    p.poly([[60, 70], [80, 18], [86, 20], [70, 70]], 'lightGrey', ['white', P.columns]); // a scimitar
    p.poly([[80, 18], [74, 10], [86, 20]], 'lightGrey');
    p.rect(62, 66, 18, 4, 'gold');
    p.rect(66, 70, 6, 8, 'brown');
    p.disc(110, 50, 14, 'white', ['lightGrey', P.sparse], 13); // a skull
    p.rect(102, 60, 16, 8, 'white', ['lightGrey', P.sparse]);
    p.disc(105, 50, 4, 'black', undefined, 4);
    p.disc(115, 50, 4, 'black', undefined, 4);
    for (let x = 103; x <= 117; x += 3) p.line(x, 63, x, 68, 'black');
  },
};

// ---------------------------------------------------------------- things

function person(p: Painter, x: number, base: number, robe: Colour, trim: Colour, turban: Colour, h = 30): void {
  const top = base - h;
  p.poly([[x - 5, top + 8], [x + 5, top + 8], [x + 8, base], [x - 8, base]], robe, [trim, P.sparse]);
  p.path([[x - 5, top + 8], [x - 8, base], [x + 8, base], [x + 5, top + 8]], 'black');
  p.rect(x - 1, top + 8, 2, h - 8, trim);
  p.disc(x, top + 5, 3, 'brown', undefined, 3);
  p.disc(x, top + 1, 4, turban, undefined, 2);
  p.dot(x, top - 1, 'red');
  p.dot(x - 1, top + 5, 'black');
  p.dot(x + 1, top + 5, 'black');
}

function king(p: Painter, young: boolean): void {
  // on the throne in the palace
  p.poly([[72, 54], [88, 54], [90, 36], [70, 36]], 'purple', ['red', P.sparse]);
  p.path([[72, 54], [70, 36], [90, 36], [88, 54]], 'black');
  p.disc(80, 31, 5, young ? 'brown' : 'lightStone', undefined, 5);
  p.poly([[75, 26], [77, 22], [80, 25], [83, 22], [85, 26]], 'gold'); // crown
  if (!young) p.poly([[77, 34], [83, 34], [80, 42]], 'white'); // a long white beard
  p.dot(78, 30, 'black');
  p.dot(82, 30, 'black');
}

function guard(p: Painter, x: number): void {
  person(p, x, 72, 'red', 'darkRed', 'white', 34);
  p.line(x + 9, 30, x + 9, 72, 'brown'); // spear
  p.poly([[x + 7, 30], [x + 9, 24], [x + 11, 30]], 'lightGrey');
}

function cyclops(p: Painter, blind: boolean): void {
  p.poly([[96, 76], [100, 40], [132, 40], [136, 76]], 'darkSand', ['brown', P.checker]);
  p.path([[96, 76], [100, 40], [132, 40], [136, 76]], 'black');
  p.rect(98, 56, 36, 6, 'darkBrown'); // loincloth belt
  p.disc(116, 28, 13, 'darkSand', ['brown', P.sparse], 12);
  p.path([[103, 28], [116, 16], [129, 28]], 'black');
  if (blind) {
    p.line(110, 24, 122, 30, 'darkRed');
    p.line(110, 30, 122, 24, 'darkRed');
  } else {
    p.disc(116, 26, 5, 'white', undefined, 4);
    p.disc(116, 26, 2, 'red', undefined, 2);
  }
  p.path([[110, 36], [116, 34], [122, 36]], 'black');
  p.poly([[100, 44], [86, 60], [90, 62], [102, 50]], 'darkSand', ['brown', P.checker]); // an arm, reaching
  p.poly([[132, 44], [146, 64], [142, 66], [130, 50]], 'darkSand', ['brown', P.checker]);
}

function statue(p: Painter, x: number, alive: boolean): void {
  p.poly([[x - 7, 74], [x - 5, 34], [x + 5, 34], [x + 7, 74]], alive ? 'lightStone' : 'grey', ['stone', P.checker]);
  p.path([[x - 7, 74], [x - 5, 34], [x + 5, 34], [x + 7, 74]], 'black');
  p.disc(x, 28, 5, alive ? 'lightStone' : 'grey', ['stone', P.checker], 6);
  p.poly([[x - 5, 24], [x, 18], [x + 5, 24]], 'gold'); // headdress
  p.dot(x - 2, 28, alive ? 'red' : 'black');
  p.dot(x + 2, 28, alive ? 'red' : 'black');
  if (alive) {
    p.poly([[x + 5, 38], [x + 18, 30], [x + 18, 34], [x + 6, 42]], 'lightStone');
    p.line(x + 18, 32, x + 30, 8, 'lightGrey'); // sword raised
    p.line(x + 19, 32, x + 31, 8, 'white');
  } else {
    p.poly([[x - 5, 40], [x - 10, 56], [x - 7, 56], [x - 3, 44]], 'grey');
    p.line(x - 9, 56, x - 9, 76, 'lightGrey'); // sword held down
  }
}

const things: Record<number, (p: Painter) => void> = {
  // 1 palace guards
  1: (p) => {
    guard(p, 20);
    guard(p, 140);
  },
  // 2 aged king, 52 youthful king
  2: (p) => king(p, false),
  52: (p) => king(p, true),
  // 57 crowd of mourners
  57: (p) => {
    for (const [x, c] of [[50, 'darkGrey'], [64, 'black'], [96, 'darkGrey'], [110, 'black'], [80, 'darkGrey']] as const) person(p, x, 80, c, 'grey', 'darkGrey', 26);
  },
  // 4 large ship, at anchor in the bay
  4: (p) => ship(p, 118, 52, 5),
  // 28, 29, 30 a merchant
  28: (p) => person(p, 40, 76, 'water', 'lightWater', 'white'),
  29: (p) => person(p, 100, 78, 'green', 'gold', 'red'),
  30: (p) => person(p, 40, 62, 'purple', 'gold', 'white', 24),
  // 13 man (stung by scorpions), 36 dead man
  13: (p) => {
    p.poly([[40, 72], [76, 70], [78, 76], [40, 78]], 'white', ['lightGrey', P.sparse]);
    p.path([[40, 72], [76, 70], [78, 76], [40, 78], [40, 72]], 'black');
    p.disc(82, 72, 4, 'brown');
    p.disc(82, 69, 4, 'white', undefined, 2);
  },
  36: (p) => {
    p.poly([[40, 74], [76, 74], [76, 78], [40, 78]], 'grey', ['darkGrey', P.sparse]);
    p.disc(82, 75, 4, 'grey');
  },
  // 55 scorpions
  55: (p) => {
    for (const [x, y] of [[100, 72], [116, 76], [128, 70]] as const) {
      p.disc(x, y, 4, 'black', undefined, 2);
      p.path([[x + 3, y], [x + 6, y - 3], [x + 5, y - 6], [x + 3, y - 5]], 'black');
      p.path([[x - 4, y - 2], [x - 6, y - 3]], 'black');
      p.path([[x - 4, y + 2], [x - 6, y + 3]], 'black');
    }
  },
  // 8 skeleton
  8: (p) => {
    p.disc(56, 70, 4, 'white');
    p.dot(55, 70, 'black');
    p.line(60, 71, 84, 72, 'white');
    for (let x = 64; x < 76; x += 3) p.line(x, 67, x, 75, 'white');
    p.line(84, 72, 96, 68, 'white');
    p.line(84, 72, 96, 76, 'white');
  },
  // 25 stone goddess, 62 animated statue
  25: (p) => statue(p, 120, false),
  62: (p) => statue(p, 120, true),
  // 45 cyclops, 69 blind cyclops; 46 the cave in the pit
  45: (p) => cyclops(p, false),
  69: (p) => cyclops(p, true),
  46: (p) => {
    p.disc(48, 50, 22, 'black', undefined, 18);
    p.rect(26, 50, 44, 12, 'black');
  },
  // 17 cave mouth in the jungle
  17: (p) => {
    p.disc(80, 56, 26, 'darkGrey', ['grey', P.grain], 22);
    p.disc(80, 60, 16, 'black', undefined, 14);
    p.rect(64, 60, 32, 12, 'black');
  },
  // 41 ornate chest, 51 open chest
  41: (p) => {
    p.rect(62, 54, 36, 18, 'darkRed', ['red', P.checker]);
    p.poly([[62, 54], [66, 46], [94, 46], [98, 54]], 'red');
    p.rect(62, 54, 36, 2, 'gold');
    p.rect(62, 62, 36, 2, 'gold');
    p.rect(78, 56, 4, 4, 'gold');
  },
  51: (p) => {
    p.rect(62, 54, 36, 18, 'darkRed', ['red', P.checker]);
    p.poly([[62, 54], [98, 54], [94, 38], [66, 38]], 'darkRed');
    p.rect(62, 54, 36, 2, 'gold');
    p.disc(80, 54, 12, 'black', undefined, 3);
  },
  // 40 stone block
  40: (p) => {
    p.rect(64, 50, 32, 22, 'stone', ['lightStone', P.speck]);
    p.poly([[64, 50], [70, 44], [102, 44], [96, 50]], 'lightStone');
    p.poly([[96, 50], [102, 44], [102, 66], [96, 72]], 'darkStone');
  },
  // 38, 49 pile of rubble
  38: (p) => p.poly([[50, 78], [60, 64], [80, 58], [100, 62], [114, 78]], 'stone', ['darkStone', P.grain]),
  49: (p) => p.poly([[50, 78], [60, 64], [80, 58], [100, 62], [114, 78]], 'stone', ['darkStone', P.grain]),
  // 70 stalagmite, 44 deep pit (in the grotto)
  70: (p) => {
    p.poly([[116, 74], [124, 26], [132, 74]], 'stone', ['lightStone', P.checker]);
    p.path([[116, 74], [124, 26], [132, 74]], 'darkBrown');
  },
  44: (p) => {
    p.disc(64, 70, 28, 'black', undefined, 7);
    p.path([[36, 70], [64, 63], [92, 70]], 'stone');
  },
  // 72 rope tied to stalagmite, 74 rope leading down into the pit
  72: (p) => p.path([[124, 62], [100, 66], [70, 70]], 'sand'),
  74: (p) => p.path([[124, 62], [100, 66], [70, 70]], 'sand'),
  // 75 rope leading out of the pit
  75: (p) => {
    for (let y = 0; y < 70; y++) p.dot(84 + (y % 4 < 2 ? 0 : 1), y, y % 3 ? 'sand' : 'darkSand');
  },
  // 67 the ship is anchored: the anchor chain over the rail
  67: (p) => {
    for (let y = 48; y < 64; y += 2) p.rect(12, y, 2, 2, 'grey');
  },
  // shores seen from the ship, on the horizon at the left: 64 rocky strand, 65 sandy beach, 66 small island, 78 Persian city
  64: (p) => p.poly([[0, 50], [8, 42], [20, 44], [30, 38], [44, 50]], 'grey', ['darkGrey', P.checker]),
  65: (p) => {
    p.poly([[0, 50], [0, 44], [40, 46], [50, 50]], 'sand');
    p.poly([[0, 44], [14, 36], [30, 46]], 'darkGreen', ['green', P.checker]);
  },
  66: (p) => {
    p.disc(22, 50, 18, 'sand', undefined, 3);
    p.poly([[10, 48], [22, 38], [34, 48]], 'darkGreen', ['green', P.checker]);
  },
  78: (p) => {
    p.rect(0, 44, 40, 6, 'lightSand');
    dome(p, 12, 44, 5);
    minaret(p, 28, 50, 16);
  },
  // 9 lit torch / 56 torch on the floor
  56: (p) => p.rect(40, 70, 12, 2, 'brown'),
  // 11 strange fountain is part of room 11; 10 old box in the hut
  10: (p) => {
    p.rect(30, 58, 20, 14, 'brown', ['darkBrown', P.rows]);
    p.path([[30, 58], [50, 58]], 'darkBrown');
  },
  // 42 cot
  42: (p) => {
    p.poly([[70, 62], [140, 62], [150, 72], [60, 72]], 'white', ['lightGrey', P.sparse]);
    p.rect(60, 72, 90, 4, 'brown');
    p.rect(62, 76, 3, 4, 'darkBrown');
    p.rect(145, 76, 3, 4, 'darkBrown');
  },
  // 59 altar is part of room 22; 26 white globe, 54 broken globe
  26: (p) => p.disc(80, 37, 4, 'white', ['paleSky', P.checker]),
  54: (p) => {
    p.disc(76, 56, 2, 'white');
    p.disc(84, 57, 2, 'white');
    p.dot(80, 56, 'paleSky');
  },
};

const pictures: Record<number, (p: Painter) => void> = { ...rooms };
for (const [item, draw] of Object.entries(things)) pictures[100 + Number(item)] = draw;

export const GOLDEN_VOYAGE: SceneSet = {
  pictures,
  rooms: Object.fromEntries(Object.keys(rooms).map((r) => [r, Number(r)])),
};

/** Item number → picture number, for the things drawn over rooms. */
export const GOLDEN_VOYAGE_ITEMS: ReadonlyMap<number, number> = new Map(Object.keys(things).map((i) => [Number(i), 100 + Number(i)]));
