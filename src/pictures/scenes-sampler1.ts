// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pictures for the Mini-Adventure Sampler (Adventure 65), which never had any.
// Rooms are pictures 1–33 (the "." rooms can't be reached and have none);
// things that come and go are drawn over them as pictures 100 + item number.

import { PATTERNS as P, type Colour, type Painter, type SceneSet } from './scenes.js';
import { chamber, rocks, sky, sun } from './scenes-common.js';

// ---------------------------------------------------------------- outdoors

function grass(p: Painter, horizon: number): void {
  p.rect(0, horizon, 160, 80 - horizon, 'green', ['darkGreen', P.speck]);
}

/** Murky swamp water from `top` down, with reeds. */
function swampWater(p: Painter, top: number): void {
  p.rect(0, top, 160, 80 - top, 'darkGreen', ['navy', P.checker]);
  p.recolour(0, top, 160, 80 - top, 'darkGreen', 'green', P.sparse);
  for (let y = top + 4; y < 80; y += 6) {
    for (let x = (y * 7) % 23; x < 160; x += 23) p.line(x, y, x + 6, y, 'darkGrey');
  }
}

function reeds(p: Painter, spots: [number, number][]): void {
  for (const [x, y] of spots) {
    for (const d of [-2, 0, 2]) p.line(x + d, y, x + d * 2, y - 10 - Math.abs(d), 'darkGreen');
    p.rect(x - 1, y - 12, 2, 4, 'brown');
  }
}

/** A tree with a trunk and a dithered round crown. */
function tree(p: Painter, x: number, base: number, h: number, crown: number, dark = false): void {
  p.rect(x - 2, base - h, 4, h, 'brown', ['darkBrown', P.columns]);
  p.disc(x, base - h, crown, dark ? 'darkGreen' : 'green', [dark ? 'black' : 'darkGreen', P.checker], crown * 0.8);
}

/** A cypress: tall, thin, dark, with a swollen base. */
function cypress(p: Painter, x: number, base: number): void {
  p.poly([[x - 7, base], [x - 3, base - 12], [x - 2, 6], [x + 2, 6], [x + 3, base - 12], [x + 7, base]], 'brown', ['darkBrown', P.columns]);
  for (let y = 4; y < base - 14; y += 6) {
    const w = 6 + ((y * 3) % 5);
    p.disc(x, y, w, 'darkGreen', ['green', P.sparse], 3);
  }
  p.path([[x - 7, base], [x - 3, base - 12], [x - 2, 6]], 'black');
}

function signpost(p: Painter, x: number, base: number, w = 18): void {
  p.rect(x - 1, base - 16, 2, 16, 'brown');
  p.rect(x - w / 2, base - 22, w, 8, 'lightSand', ['sand', P.sparse]);
  p.path([[x - w / 2, base - 22], [x + w / 2, base - 22], [x + w / 2, base - 14], [x - w / 2, base - 14], [x - w / 2, base - 22]], 'darkBrown');
  for (let i = x - w / 2 + 2; i < x + w / 2 - 2; i += 3) p.dot(i, base - 18, 'darkBrown');
}

function cloud(p: Painter, x: number, y: number, w: number): void {
  p.disc(x, y, w, 'white', ['paleSky', P.sparse], 3);
  p.disc(x - w / 2, y + 1, w / 2, 'white', undefined, 2);
  p.disc(x + w / 2, y - 1, w / 2, 'white', undefined, 3);
}

function lake(p: Painter, top: number, bottom = 80): void {
  p.rect(0, top, 160, bottom - top, 'water', ['lightWater', P.rows]);
  p.recolour(0, top, 160, bottom - top, 'lightWater', 'white', P.speck);
}

// ---------------------------------------------------------------- underground

function earth(p: Painter): void {
  p.rect(0, 0, 160, 80, 'brown', ['darkBrown', P.grain]);
}

function roots(p: Painter, spots: [number, number, number][]): void {
  for (const [x, y, d] of spots) {
    p.path([[x, y], [x + d * 4, y + 6], [x + d * 3, y + 12], [x + d * 8, y + 18]], 'lightSand');
    p.path([[x + d * 4, y + 6], [x + d * 10, y + 8]], 'sand');
  }
}

// ---------------------------------------------------------------- rooms

const rooms: Record<number, (p: Painter) => void> = {
  // 1 dismal swamp: grey sky, mist, murky water, reeds and a mud bank
  1: (p) => {
    p.rect(0, 0, 160, 40, 'grey', ['lightGrey', P.checker]);
    p.rect(0, 24, 160, 16, 'grey', ['darkGrey', P.sparse]);
    for (const [x, h] of [[70, 22], [96, 18], [140, 26], [118, 14]] as const) {
      p.path([[x, 40], [x, 40 - h], [x - 4, 36 - h]], 'darkGrey');
      p.line(x, 40 - h + 6, x + 4, 36 - h + 4, 'darkGrey');
    }
    swampWater(p, 40);
    p.poly([[48, 80], [56, 66], [100, 64], [120, 80]], 'darkBrown', ['brown', P.grain]); // mud bank
    reeds(p, [[8, 62], [130, 58], [150, 70], [62, 50]]);
  },
  // 2 top of a tall cypress tree
  2: (p) => {
    sky(p, 80);
    cloud(p, 30, 14, 10);
    cloud(p, 120, 24, 8);
    p.poly([[70, 80], [74, 0], [86, 0], [90, 80]], 'brown', ['darkBrown', P.columns]);
    p.poly([[0, 52], [74, 40], [76, 46], [0, 60]], 'brown', ['darkBrown', P.rows]);
    p.poly([[160, 30], [86, 22], [86, 28], [160, 38]], 'brown', ['darkBrown', P.rows]);
    for (const [x, y] of [[10, 54], [30, 50], [130, 30], [150, 32], [110, 26], [50, 46]] as const) {
      p.disc(x, y - 4, 10, 'darkGreen', ['green', P.sparse], 5);
    }
    p.disc(80, 70, 30, 'darkGreen', ['green', P.sparse], 10);
  },
  // 3 damp hollow stump: round wooden walls, light from above
  3: (p) => {
    p.rect(0, 0, 160, 80, 'darkBrown', ['black', P.checker]);
    p.disc(80, 40, 74, 'brown', ['darkBrown', P.columns], 44);
    p.disc(80, 6, 30, 'paleSky', ['white', P.checker], 6); // the opening overhead
    p.disc(80, 72, 50, 'darkSand', ['darkBrown', P.grain], 10);
    p.disc(80, 76, 14, 'black', undefined, 4); // the hole down
    for (let x = 14; x < 150; x += 10) p.line(x, 18, x + (x - 80) / 10, 62, 'darkBrown');
    signpost(p, 40, 70, 22);
  },
  // 4 root chamber under the stump
  4: (p) => {
    earth(p);
    p.disc(80, 0, 70, 'darkBrown', ['black', P.checker], 22);
    p.disc(80, 0, 14, 'brown', ['darkSand', P.checker], 6); // stump's hole above
    roots(p, [[40, 10, -1], [56, 14, -1], [104, 14, 1], [120, 10, 1], [80, 18, 1]]);
    p.disc(80, 74, 70, 'darkSand', ['brown', P.grain], 12);
    p.disc(126, 64, 12, 'black', ['darkBrown', P.sparse], 7); // the dark hole
    p.disc(126, 64, 9, 'black', undefined, 5);
  },
  // 5 semi-dark hole by the root chamber
  5: (p) => {
    earth(p);
    p.disc(80, 40, 72, 'darkBrown', ['black', P.checker], 40);
    p.disc(80, 40, 56, 'black', ['darkBrown', P.sparse], 32);
    p.disc(80, 76, 50, 'brown', ['darkBrown', P.grain], 8);
    roots(p, [[30, 6, 1], [130, 6, -1]]);
    p.rect(66, 30, 28, 40, 'darkStone', ['darkGrey', P.checker]); // a stone frame for the door
  },
  // 6 long down sloping hall
  6: (p) => {
    chamber(p, { back: [70, 40, 90, 56], wall: 'darkStone', shade: 'darkBrown', ceiling: 'darkStone' });
    p.rect(70, 40, 20, 16, 'black');
    for (const t of [0.2, 0.45, 0.65, 0.82]) {
      const y = 80 - (80 - 56) * t;
      p.line(70 * t, y, 160 - 70 * t, y, 'darkBrown');
    }
    p.disc(80, 52, 3, 'darkGrey', undefined, 2);
  },
  // 10 on the shore of a lake
  10: (p) => {
    sky(p, 34);
    cloud(p, 40, 10, 9);
    cloud(p, 128, 16, 7);
    p.poly([[0, 34], [30, 26], [60, 34]], 'darkGreen');
    p.poly([[110, 34], [140, 24], [160, 30], [160, 34]], 'darkGreen');
    lake(p, 34, 60);
    p.poly([[0, 80], [0, 60], [60, 58], [110, 62], [160, 60], [160, 80]], 'sand', ['darkSand', P.speck]);
    p.path([[0, 60], [60, 58], [110, 62], [160, 60]], 'lightSand');
    rocks(p, [[20, 74], [90, 76]]);
    signpost(p, 136, 76);
  },
  // 11 forest
  11: (p) => {
    p.rect(0, 0, 160, 80, 'darkGreen', ['black', P.checker]);
    p.rect(0, 56, 160, 24, 'darkGreen', ['brown', P.grain]);
    for (const [x, w] of [[10, 6], [40, 8], [74, 5], [102, 9], [136, 7], [154, 4]] as const) {
      p.rect(x - w / 2, 0, w, 64, 'brown', ['darkBrown', P.columns]);
      p.line(x - w / 2, 0, x - w / 2, 64, 'darkBrown');
    }
    for (const [x, y] of [[20, 8], [60, 4], [90, 12], [124, 6], [150, 14]] as const) p.disc(x, y, 16, 'green', ['darkGreen', P.checker], 8);
    for (const x of [26, 88, 120]) p.path([[x, 70], [x + 2, 66], [x + 4, 70], [x + 6, 66], [x + 8, 70]], 'green');
  },
  // 23 sunny meadow
  23: (p) => {
    sky(p, 38);
    sun(p, 26, 10);
    cloud(p, 110, 12, 10);
    tree(p, 150, 40, 10, 12, true);
    p.poly([[0, 38], [40, 32], [100, 38]], 'green', ['darkGreen', P.sparse]);
    grass(p, 38);
    for (const [x, y, c] of [[20, 60, 'yellow'], [44, 70, 'red'], [70, 56, 'white'], [30, 76, 'yellow'], [96, 72, 'red'], [12, 48, 'white']] as const) {
      p.dot(x, y, c);
      p.dot(x + 1, y, c);
      p.dot(x, y + 1, 'darkGreen');
    }
    signpost(p, 52, 54);
  },
  // 24 real trouble: the fellow with the pitchfork and the pointed tail
  24: (p) => {
    p.rect(0, 0, 160, 80, 'darkRed', ['black', P.checker]);
    p.rect(0, 62, 160, 18, 'red', ['orange', P.speck]);
    for (let x = 4; x < 160; x += 14) p.poly([[x, 64], [x + 4, 50 - (x % 3) * 4], [x + 8, 64]], 'orange', ['yellow', P.checker]);
    p.poly([[70, 72], [72, 34], [88, 34], [90, 72]], 'red', ['darkRed', P.sparse]); // body
    p.disc(80, 26, 8, 'red', undefined, 9);
    p.poly([[73, 20], [70, 10], [76, 18]], 'darkRed'); // horns
    p.poly([[87, 20], [90, 10], [84, 18]], 'darkRed');
    p.dot(77, 25, 'yellow');
    p.dot(83, 25, 'yellow');
    p.path([[76, 31], [80, 33], [84, 31]], 'black');
    p.path([[88, 66], [100, 70], [104, 62], [102, 58]], 'darkRed'); // tail
    p.poly([[102, 56], [106, 60], [100, 60]], 'darkRed');
    p.line(56, 10, 60, 74, 'darkGrey'); // pitchfork
    p.path([[52, 10], [52, 4]], 'grey');
    p.path([[56, 10], [56, 2]], 'grey');
    p.path([[60, 10], [60, 4]], 'grey');
    p.line(52, 10, 60, 10, 'grey');
    p.line(72, 40, 58, 44, 'red');
  },
  // 25 hidden grove
  25: (p) => {
    p.rect(0, 0, 160, 80, 'darkGreen', ['black', P.sparse]);
    p.disc(80, 20, 60, 'green', ['darkGreen', P.checker], 26);
    p.rect(0, 56, 160, 24, 'green', ['darkGreen', P.speck]);
    tree(p, 22, 66, 30, 20, true);
    tree(p, 140, 66, 34, 18, true);
    p.rect(76, 30, 8, 36, 'brown', ['darkBrown', P.columns]); // the fruit tree
    p.disc(80, 26, 22, 'green', ['darkGreen', P.sparse], 14);
    signpost(p, 112, 74);
  },
  // 26 quick-sand bog
  26: (p) => {
    p.rect(0, 0, 160, 34, 'grey', ['lightGrey', P.checker]);
    tree(p, 20, 36, 14, 12, true);
    tree(p, 140, 36, 18, 10, true);
    p.rect(0, 34, 160, 46, 'darkSand', ['brown', P.grain]);
    p.disc(80, 60, 60, 'sand', ['darkSand', P.checker], 16);
    for (const [x, y] of [[60, 56], [94, 64], [80, 52], [110, 58]] as const) p.disc(x, y, 3, 'lightSand', ['sand', P.checker], 1);
    reeds(p, [[10, 66], [150, 70]]);
  },
  // 28 top of an oak: a meadow to the east, a lake beyond
  28: (p) => {
    sky(p, 36);
    sun(p, 140, 8);
    p.rect(0, 36, 160, 8, 'water', ['lightWater', P.rows]);
    p.rect(0, 44, 160, 14, 'green', ['darkGreen', P.sparse]);
    p.rect(0, 58, 160, 22, 'darkGreen', ['green', P.sparse]);
    p.poly([[0, 80], [0, 66], [96, 70], [100, 74], [60, 80]], 'brown', ['darkBrown', P.rows]); // the branch we sit on
    p.path([[0, 66], [96, 70], [100, 74]], 'black');
    p.poly([[40, 72], [52, 58], [56, 60], [46, 74]], 'brown', ['darkBrown', P.rows]);
    for (const [x, y] of [[6, 4], [20, 12], [4, 22], [54, 56], [104, 70], [150, 76], [130, 80]] as const) {
      p.disc(x, y, 12, 'darkGreen', ['green', P.checker], 7);
    }
  },
  // 29 edge of a BOTTOMLESS hole, with an advertisement
  29: (p) => {
    sky(p, 30);
    cloud(p, 30, 10, 8);
    grass(p, 30);
    p.disc(80, 58, 52, 'darkBrown', ['brown', P.grain], 16);
    p.disc(80, 60, 44, 'black', ['darkBrown', P.sparse], 12);
    p.disc(80, 62, 36, 'black', undefined, 9);
    p.rect(112, 6, 40, 20, 'white', ['lightGrey', P.sparse]); // billboard
    p.rect(114, 8, 36, 16, 'yellow', ['white', P.sparse]);
    for (let x = 117; x < 148; x += 4) p.dot(x, 12, 'red');
    for (let x = 117; x < 140; x += 3) p.dot(x, 18, 'darkRed');
    p.rect(118, 26, 2, 10, 'brown');
    p.rect(144, 26, 2, 10, 'brown');
  },
  // 30 ledge just below the rim of the hole
  30: (p) => {
    p.rect(0, 0, 160, 80, 'black', ['darkBrown', P.speck]);
    p.rect(0, 0, 160, 10, 'sky', ['lightSky', P.checker]);
    p.poly([[0, 10], [160, 10], [150, 18], [10, 18]], 'green', ['darkGreen', P.checker]);
    p.poly([[0, 18], [10, 18], [20, 80], [0, 80]], 'brown', ['darkBrown', P.grain]);
    p.poly([[160, 18], [150, 18], [140, 80], [160, 80]], 'darkBrown', ['black', P.grain]);
    p.poly([[0, 46], [90, 42], [80, 50], [0, 54]], 'stone', ['darkStone', P.speck]);
    p.path([[0, 46], [90, 42]], 'lightStone');
    p.disc(80, 80, 50, 'black', undefined, 18);
  },
  // 32 endless corridor
  32: (p) => {
    chamber(p, { back: [74, 34, 86, 46], wall: 'darkStone', shade: 'darkBrown', blocks: false });
    p.rect(74, 34, 12, 12, 'black');
    for (const t of [0.15, 0.4, 0.62, 0.8]) {
      const x0 = 74 * t;
      const y0 = 34 * t;
      const x1 = 160 - (160 - 86) * t;
      const y1 = 80 - (80 - 46) * t;
      const w = Math.max(1, Math.round(4 * (1 - t)));
      p.rect(x0, y0, w, y1 - y0, 'stone');
      p.rect(x1 - w, y0, w, y1 - y0, 'darkStone');
      p.rect(x0, y0, x1 - x0, w, 'stone');
    }
  },
  // 33 large misty room, unreadable letters over the exits
  33: (p) => {
    p.rect(0, 0, 160, 80, 'purple', ['navy', P.checker]);
    p.rect(0, 50, 160, 30, 'lightGrey', ['grey', P.checker]);
    p.rect(0, 40, 160, 12, 'purple', ['lightGrey', P.checker]);
    for (const x of [14, 62, 110]) {
      p.rect(x, 22, 36, 32, 'black');
      p.disc(x + 18, 22, 18, 'black', undefined, 8);
      for (let i = x + 4; i < x + 34; i += 6) p.path([[i, 8], [i + 2, 4], [i + 4, 8]], 'gold');
    }
    p.recolour(0, 44, 160, 36, 'black', 'grey', P.sparse);
  },
};

// ---------------------------------------------------------------- things

function outline(p: Painter, pts: [number, number][], c: Colour): void {
  p.path([...pts, pts[0]!], c);
}

const things: Record<number, (p: Painter) => void> = {
  // 2 pot of rubies
  2: (p) => {
    p.poly([[36, 76], [32, 64], [52, 64], [48, 76]], 'darkGrey', ['grey', P.rows]);
    outline(p, [[36, 76], [32, 64], [52, 64], [48, 76]], 'black');
    for (const [x, y] of [[36, 62], [41, 60], [46, 62], [44, 58], [39, 58]] as const) p.disc(x, y, 2, 'red', ['white', P.sparse]);
  },
  // 3 spider web with writing on it
  3: (p) => {
    const cx = 124;
    const cy = 52;
    for (let a = 0; a < 8; a++) {
      const t = (a * Math.PI) / 4;
      p.line(cx, cy, cx + Math.cos(t) * 16, cy + Math.sin(t) * 12, 'white');
    }
    for (const r of [5, 10, 15]) {
      for (let a = 0; a < 8; a++) {
        const t1 = (a * Math.PI) / 4;
        const t2 = ((a + 1) * Math.PI) / 4;
        p.line(cx + Math.cos(t1) * r, cy + Math.sin(t1) * r * 0.75, cx + Math.cos(t2) * r, cy + Math.sin(t2) * r * 0.75, 'lightGrey');
      }
    }
    p.disc(cx + 4, cy - 3, 2, 'black');
  },
  // 4 hollow stump and the felled tree
  4: (p) => {
    p.rect(22, 50, 16, 16, 'brown', ['darkBrown', P.columns]);
    p.disc(30, 50, 8, 'darkSand', ['brown', P.checker], 2);
    p.disc(30, 50, 4, 'black', undefined, 1);
    p.poly([[40, 70], [120, 58], [122, 64], [42, 76]], 'brown', ['darkBrown', P.rows]);
    p.path([[40, 70], [120, 58]], 'darkBrown');
  },
  // 5 cypress tree
  5: (p) => cypress(p, 30, 62),
  // 7 evil smelling mud
  7: (p) => {
    p.disc(84, 72, 19, 'black', undefined, 5);
    p.disc(84, 72, 18, 'darkGreen', ['black', P.checker], 4);
    for (const [x, y] of [[78, 71], [88, 73], [94, 70]] as const) p.disc(x, y, 1, 'lightGrey');
    for (const [x, y] of [[76, 66], [86, 64], [94, 66]] as const) p.path([[x, y], [x + 1, y - 3], [x, y - 6], [x + 1, y - 9]], 'purple');
  },
  // 8 fish (in the lake)
  8: (p) => {
    for (const [x, y] of [[50, 46], [96, 52]] as const) {
      p.disc(x, y, 5, 'orange', ['yellow', P.sparse], 2);
      p.poly([[x - 5, y], [x - 9, y - 3], [x - 9, y + 3]], 'orange');
      p.dot(x + 3, y - 1, 'black');
    }
  },
  // 55 dead fish
  55: (p) => {
    p.disc(70, 72, 5, 'lightGrey', ['grey', P.sparse], 2);
    p.poly([[65, 72], [61, 69], [61, 75]], 'grey');
    p.path([[72, 71], [74, 73]], 'black');
    p.path([[74, 71], [72, 73]], 'black');
  },
  // 11 rusty axe
  11: (p) => {
    p.line(100, 74, 116, 64, 'brown');
    p.line(100, 75, 116, 65, 'darkBrown');
    p.poly([[113, 60], [120, 62], [119, 69], [114, 67]], 'orange', ['darkRed', P.checker]);
    outline(p, [[113, 60], [120, 62], [119, 69], [114, 67]], 'black');
  },
  // 14 ring of skeleton keys
  14: (p) => {
    p.disc(110, 40, 4, 'gold', undefined, 4);
    p.disc(110, 40, 2, 'darkBrown', ['brown', P.checker], 2);
    for (const [dx, dy] of [[-4, 6], [0, 8], [4, 6]] as const) {
      p.line(110 + dx / 2, 43, 110 + dx, 44 + dy, 'gold');
      p.dot(110 + dx + 1, 44 + dy, 'gold');
    }
  },
  // 16 locked door, 17 open door with a hallway beyond
  16: (p) => {
    p.rect(68, 32, 24, 38, 'brown', ['darkBrown', P.columns]);
    p.rect(68, 42, 24, 2, 'darkGrey');
    p.rect(68, 60, 24, 2, 'darkGrey');
    p.rect(86, 48, 4, 6, 'darkGrey', ['gold', P.checker]);
  },
  17: (p) => {
    p.rect(68, 32, 24, 38, 'black');
    p.poly([[72, 36], [88, 36], [84, 50], [76, 50]], 'darkStone', ['darkGrey', P.checker]);
    p.poly([[68, 32], [62, 36], [62, 74], [68, 70]], 'brown', ['darkBrown', P.columns]);
  },
  // 18 swamp gas
  18: (p) => {
    for (const [x, y, r] of [[110, 30, 12], [130, 24, 9], [94, 22, 7]] as const) {
      p.disc(x, y, r, 'green', ['grey', P.checker], r * 0.45);
      p.path([[x - r, y], [x - r / 2, y - 2], [x, y], [x + r / 2, y - 2], [x + r, y]], 'yellow');
    }
  },
  // 22 patches of oily slime
  22: (p) => {
    for (const [x, y] of [[20, 50], [130, 46], [150, 56]] as const) {
      p.disc(x, y, 7, 'purple', ['water', P.checker], 2);
      p.dot(x - 2, y, 'yellow');
    }
  },
  // 42 chiggers
  42: (p) => {
    for (const [x, y] of [[70, 74], [74, 72], [78, 75], [83, 73], [88, 76], [76, 77]] as const) {
      p.dot(x, y, 'red');
      p.dot(x + 1, y, 'darkRed');
    }
  },
  // 27 large sleeping dragon, in the meadow
  27: (p) => {
    p.disc(112, 64, 31, 'black', undefined, 12);
    p.disc(112, 64, 30, 'orange', ['red', P.checker], 11); // body
    p.disc(112, 70, 24, 'yellow', ['orange', P.checker], 4); // belly
    p.poly([[86, 66], [64, 72], [62, 77], [90, 72]], 'orange', ['red', P.checker]); // tail
    p.path([[86, 66], [64, 72], [62, 77], [90, 72]], 'black');
    p.disc(140, 64, 11, 'black', undefined, 8);
    p.disc(140, 64, 10, 'orange', ['red', P.checker], 7); // head
    p.poly([[146, 66], [155, 66], [155, 71], [146, 71]], 'orange');
    p.path([[146, 66], [155, 66], [155, 71], [146, 71]], 'black');
    p.path([[136, 61], [140, 62]], 'black'); // closed eye
    for (let x = 90; x < 134; x += 7) {
      p.poly([[x, 55], [x + 3, 46], [x + 6, 55]], 'darkGreen', ['green', P.checker]); // spines
      p.path([[x, 55], [x + 3, 46], [x + 6, 55]], 'black');
    }
    p.path([[156, 64], [158, 60], [156, 57], [158, 53]], 'white'); // smoke from the nostrils
    p.path([[106, 62], [114, 58], [120, 64]], 'darkRed'); // a folded wing
  },
  // 28 flint and steel
  28: (p) => {
    p.poly([[100, 50], [106, 48], [108, 52], [102, 54]], 'grey', ['darkGrey', P.checker]);
    p.rect(110, 50, 8, 2, 'lightGrey');
    p.dot(109, 49, 'yellow');
  },
  // 46 jeweled fruit, on the grove's tree
  46: (p) => {
    for (const [x, y, c] of [[72, 30, 'red'], [86, 24, 'purple'], [80, 34, 'gold']] as const) {
      p.disc(x, y, 3, c, ['white', P.sparse]);
      p.dot(x - 1, y - 1, 'white');
    }
  },
  // 47 small statue of a blue ox
  47: (p) => {
    p.rect(64, 64, 34, 6, 'lightStone', ['stone', P.rows]); // plinth
    p.disc(80, 54, 12, 'water', ['navy', P.checker], 6);
    p.disc(94, 50, 5, 'water', ['navy', P.checker], 4);
    p.path([[92, 45], [90, 41]], 'white');
    p.path([[97, 45], [99, 41]], 'white');
    for (const x of [70, 76, 84, 90]) p.rect(x, 58, 2, 6, 'navy');
    p.dot(95, 49, 'white');
  },
};

const pictures: Record<number, (p: Painter) => void> = { ...rooms };
for (const [item, draw] of Object.entries(things)) pictures[100 + Number(item)] = draw;

export const SAMPLER: SceneSet = {
  pictures,
  rooms: Object.fromEntries(Object.keys(rooms).map((r) => [r, Number(r)])),
};

/** Item number → picture number, for the things drawn over rooms. */
export const SAMPLER_ITEMS: ReadonlyMap<number, number> = new Map(Object.keys(things).map((i) => [Number(i), 100 + Number(i)]));
