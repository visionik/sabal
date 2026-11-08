// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pictures for Ghost Town (Adventure 9), which never had any.
// Rooms are pictures 1–38; things that come and go (the ghosts, the horse,
// the safe, the open grave…) are drawn over them as pictures 100 + item number.

import { PATTERNS as P, type Colour, type Painter, type SceneSet } from './scenes.js';
import { chamber, rocks, sky, sun } from './scenes-common.js';

// ---------------------------------------------------------------- lettering

/** A 3×5 pixel font, enough for the town's signs. */
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111',
  V: '101101101101010', W: '101101111111101', Y: '101101010010010', $: '011110010011110', ' ': '000000000000000',
};

function text(p: Painter, x: number, y: number, s: string, c: Colour): void {
  [...s].forEach((ch, k) => {
    const g = FONT[ch] ?? FONT[' ']!;
    for (let i = 0; i < 15; i++) if (g[i] === '1') p.dot(x + k * 4 + (i % 3), y + Math.floor(i / 3), c);
  });
}

/** A painted board with a word on it, centred on `cx`. */
function sign(p: Painter, cx: number, y: number, s: string, board: Colour = 'lightSand', ink: Colour = 'darkBrown'): void {
  const w = s.length * 4 + 3;
  p.rect(cx - w / 2, y, w, 9, board);
  p.path([[cx - w / 2, y], [cx + w / 2, y], [cx + w / 2, y + 9], [cx - w / 2, y + 9], [cx - w / 2, y]], ink);
  text(p, cx - w / 2 + 2, y + 2, s, ink);
}

// ---------------------------------------------------------------- outdoors

/** An evening sky, red above and gold at the horizon. */
function dusk(p: Painter, horizon: number): void {
  p.rect(0, 0, 160, horizon, 'orange');
  p.rect(0, 0, 160, 12, 'red', ['darkRed', P.checker]);
  p.rect(0, 12, 160, 8, 'red', ['orange', P.checker]);
  p.rect(0, horizon - 12, 160, 6, 'orange', ['yellow', P.checker]);
  p.rect(0, horizon - 6, 160, 6, 'yellow', ['lightSand', P.checker]);
}

function dirt(p: Painter, horizon: number): void {
  p.rect(0, horizon, 160, 80 - horizon, 'darkSand', ['brown', P.speck]);
}

function mountains(p: Painter, horizon: number, far: Colour = 'purple'): void {
  p.poly([[0, horizon], [0, horizon - 8], [18, horizon - 16], [34, horizon - 9], [52, horizon - 20], [76, horizon - 8], [96, horizon - 14], [118, horizon - 6], [140, horizon - 18], [160, horizon - 10], [160, horizon]], far, ['navy', P.checker]);
  for (const [x, h] of [[18, 16], [52, 20], [140, 18]] as const) p.poly([[x - 4, horizon - h + 4], [x, horizon - h], [x + 4, horizon - h + 4]], 'white');
}

function cactus(p: Painter, x: number, base: number, h: number): void {
  p.rect(x - 2, base - h, 4, h, 'green', ['darkGreen', P.columns]);
  p.rect(x - 7, base - h * 0.6, 5, 3, 'green');
  p.rect(x - 7, base - h * 0.85, 3, h * 0.25, 'green', ['darkGreen', P.columns]);
  p.rect(x + 2, base - h * 0.5, 5, 3, 'green');
  p.rect(x + 5, base - h * 0.75, 3, h * 0.25, 'green', ['darkGreen', P.columns]);
}

function tumbleweed(p: Painter, x: number, y: number): void {
  p.disc(x, y, 6, 'brown', ['darkSand', P.checker], 4);
  p.line(x - 5, y - 2, x + 5, y + 2, 'darkBrown');
  p.line(x - 3, y + 3, x + 3, y - 3, 'darkBrown');
  p.line(x - 5, y + 1, x + 4, y - 3, 'darkBrown');
}

/** A road running away to the horizon. */
function road(p: Painter, horizon: number, cx = 80): void {
  p.poly([[cx - 40, 80], [cx + 40, 80], [cx + 3, horizon], [cx - 3, horizon]], 'sand', ['darkSand', P.sparse]);
  p.line(cx - 40, 80, cx - 3, horizon, 'brown');
  p.line(cx + 40, 80, cx + 3, horizon, 'brown');
}

/** A false-fronted wooden building on the street; returns its door's middle. */
function building(p: Painter, x: number, top: number, w: number, base: number, wood: Colour, name: string, door: 'plain' | 'swing' | 'barn' = 'plain'): void {
  p.rect(x, top, w, base - top, wood, ['darkBrown', (X) => (X - x) % 4 === 0]);
  p.path([[x, base], [x, top], [x + w, top], [x + w, base]], 'darkBrown');
  sign(p, x + w / 2, top + 3, name);
  const h = base - top;
  if (door === 'barn') {
    p.rect(x + w / 2 - 9, base - h * 0.55, 18, h * 0.55, 'darkBrown', ['brown', P.columns]);
    p.line(x + w / 2 - 9, base - h * 0.55, x + w / 2 + 9, base, 'lightSand');
    p.line(x + w / 2 + 9, base - h * 0.55, x + w / 2 - 9, base, 'lightSand');
  } else {
    p.rect(x + w / 2 - 4, base - 14, 8, 14, 'black');
    if (door === 'swing') {
      p.rect(x + w / 2 - 4, base - 11, 3, 6, 'brown');
      p.rect(x + w / 2 + 1, base - 11, 3, 6, 'brown');
    }
  }
  for (const wx of [x + 3, x + w - 10]) {
    if (door === 'barn') continue;
    p.rect(wx, base - 15, 7, 7, 'black');
    p.rect(wx + 1, base - 14, 3, 3, 'darkGrey');
    p.line(wx, base - 8, wx + 7, base - 8, 'lightSand');
  }
  p.rect(x - 2, base, w + 4, 3, 'brown', ['darkBrown', P.rows]); // boardwalk
}

/** Town street, looking along it: `left`/`right` buildings nearest the viewer. */
function street(p: Painter, draw: (p: Painter) => void): void {
  dusk(p, 46);
  mountains(p, 46);
  dirt(p, 46);
  road(p, 46);
  draw(p);
}

// ---------------------------------------------------------------- indoors

/** A wooden room: plank walls, board floor. */
function wooden(p: Painter, back: readonly [number, number, number, number] = [44, 16, 116, 54], wall: Colour = 'brown'): void {
  chamber(p, { back, wall, shade: 'darkBrown', floor: 'darkSand', ceiling: 'darkBrown', blocks: false });
  const [x0, y0, x1, y1] = back;
  p.rect(x0, y0, x1 - x0, y1 - y0, wall, ['darkBrown', P.sparse]);
  for (let x = x0 + 6; x < x1; x += 6) p.line(x, y0 + 1, x, y1 - 1, 'darkBrown');
  for (let i = 1; i < 8; i++) {
    p.line((i * x0) / 8, (i * y0) / 8, (i * x0) / 8, 80 - (i * (80 - y1)) / 8, 'darkBrown');
    p.line(160 - (i * (160 - x1)) / 8, (i * y0) / 8, 160 - (i * (160 - x1)) / 8, 80 - (i * (80 - y1)) / 8, 'black');
  }
  for (let i = 1; i < 6; i++) p.line(x0 - (x0 * i) / 6, y1 + ((80 - y1) * i) / 6, x1 + ((160 - x1) * i) / 6, y1 + ((80 - y1) * i) / 6, 'brown');
}

function window(p: Painter, x: number, y: number, w: number, h: number, outside: Colour = 'orange'): void {
  p.rect(x - 1, y - 1, w + 2, h + 2, 'darkBrown');
  p.rect(x, y, w, h, outside, ['yellow', P.checker]);
  p.line(x + w / 2, y, x + w / 2, y + h, 'darkBrown');
  p.line(x, y + h / 2, x + w, y + h / 2, 'darkBrown');
}

function lamp(p: Painter, x: number, y: number): void {
  p.line(x, 0, x, y, 'darkGrey');
  p.poly([[x - 4, y + 5], [x - 2, y], [x + 2, y], [x + 4, y + 5]], 'yellow', ['white', P.checker]);
}

function counter(p: Painter, x0: number, x1: number, top: number): void {
  p.rect(x0, top, x1 - x0, 80 - top, 'brown', ['darkBrown', P.columns]);
  p.rect(x0 - 2, top - 3, x1 - x0 + 4, 4, 'darkBrown', ['brown', P.rows]);
}

function shelves(p: Painter, x: number, y: number, w: number, h: number, goods: Colour[]): void {
  p.rect(x, y, w, h, 'darkBrown');
  for (let j = y + 2; j + 6 < y + h; j += 8) {
    for (let i = x + 2, k = 0; i + 4 < x + w; i += 6, k++) p.rect(i, j, 4, 5, goods[(k + j) % goods.length]!);
    p.line(x, j + 6, x + w - 1, j + 6, 'brown');
  }
}

/** Old timbers holding up a mine tunnel. */
function mine(p: Painter, back: readonly [number, number, number, number] = [58, 24, 102, 52]): void {
  chamber(p, { back, wall: 'darkStone', shade: 'darkBrown', floor: 'darkStone', ceiling: 'black', blocks: false });
  p.recolour(0, 0, 160, 80, 'darkStone', 'stone', P.speck);
  p.rect(back[0], back[1], back[2] - back[0], back[3] - back[1], 'black');
  for (const t of [0, 0.5]) {
    const x0 = back[0] * t;
    const y0 = back[1] * t;
    const x1 = 160 - (160 - back[2]) * t;
    const y1 = 80 - (80 - back[3]) * t;
    const beam = Math.max(2, 6 * (1 - t));
    p.rect(x0 + 4, y0 + beam, beam, y1 - y0 - beam, 'brown', ['darkBrown', P.columns]);
    p.rect(x1 - 4 - beam, y0 + beam, beam, y1 - y0 - beam, 'brown', ['darkBrown', P.columns]);
    p.rect(x0 + 2, y0 + 2, x1 - x0 - 4, beam, 'brown', ['darkBrown', P.rows]);
  }
}

function ladder(p: Painter, x: number, top: number, bottom: number): void {
  p.rect(x, top, 2, bottom - top, 'brown');
  p.rect(x + 10, top, 2, bottom - top, 'brown');
  for (let y = top + 3; y < bottom; y += 6) p.rect(x, y, 12, 2, 'sand');
}

function hay(p: Painter, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, 'yellow', ['sand', P.grain]);
  p.line(x, y + h / 2, x + w, y + h / 2, 'darkSand');
  p.path([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], 'darkSand');
}

function canyon(p: Painter, rock: Colour, shade: Colour): void {
  p.rect(0, 0, 160, 80, 'sky', ['lightSky', P.checker]);
  p.rect(0, 0, 160, 10, 'sky');
  p.poly([[0, 0], [50, 0], [56, 20], [48, 38], [60, 60], [40, 80], [0, 80]], rock, [shade, P.rows]);
  p.poly([[160, 0], [108, 0], [100, 24], [112, 40], [96, 62], [120, 80], [160, 80]], shade, ['darkBrown', P.rows]);
  p.poly([[40, 80], [60, 60], [70, 52], [92, 52], [96, 62], [120, 80]], 'darkSand', ['brown', P.speck]);
}

// ---------------------------------------------------------------- rooms

const rooms: Record<number, (p: Painter) => void> = {
  // 1 Ghost Town: the barbershop and the jail
  1: (p) =>
    street(p, (p) => {
      building(p, 2, 16, 42, 58, 'brown', 'BARBER');
      for (let y = 40; y < 58; y += 3) p.rect(46, y, 3, 2, y % 2 ? 'red' : 'white'); // striped pole
      p.disc(47, 39, 2, 'white');
      building(p, 108, 20, 48, 58, 'darkStone', 'JAIL');
      p.recolour(108, 20, 48, 38, 'darkStone', 'stone', P.speck);
      for (let x = 112; x < 118; x += 2) p.line(x, 43, x, 49, 'grey');
      for (let x = 145; x < 151; x += 2) p.line(x, 43, x, 49, 'grey');
      tumbleweed(p, 70, 68);
    }),
  // 2 Ghost Town: the saloon and the dry goods store
  2: (p) =>
    street(p, (p) => {
      building(p, 0, 12, 50, 58, 'darkSand', 'SALOON', 'swing');
      p.rect(0, 30, 50, 2, 'darkBrown'); // balcony
      for (let x = 2; x < 50; x += 4) p.line(x, 26, x, 30, 'darkBrown');
      building(p, 106, 18, 54, 58, 'brown', 'DRY GOODS');
      p.rect(130, 60, 6, 6, 'darkBrown', ['brown', P.rows]); // a barrel on the walk
    }),
  // 3 Ghost Town: the telegraph office and the hotel
  3: (p) =>
    street(p, (p) => {
      building(p, 0, 18, 46, 58, 'darkSand', 'TELEGRAPH');
      p.rect(52, 6, 2, 52, 'darkBrown'); // telegraph pole
      p.rect(48, 8, 10, 2, 'darkBrown');
      p.path([[0, 14], [26, 12], [52, 9]], 'black');
      p.path([[58, 9], [100, 30], [160, 40]], 'black');
      building(p, 104, 8, 56, 58, 'brown', 'HOTEL');
      p.rect(104, 30, 56, 2, 'darkBrown');
      for (const x of [110, 132, 148]) p.rect(x, 20, 6, 7, 'black');
    }),
  // 4 Ghost Town: the stable at the west end of town
  4: (p) =>
    street(p, (p) => {
      building(p, 96, 14, 62, 60, 'red', 'STABLE', 'barn');
      p.poly([[96, 14], [127, 4], [158, 14]], 'darkRed', ['red', P.checker]);
      p.rect(121, 9, 12, 5, 'black');
      for (let x = 2; x < 60; x += 14) p.rect(x, 56, 2, 10, 'brown'); // hitching rail
      p.rect(0, 58, 60, 2, 'brown');
      cactus(p, 28, 52, 12);
      tumbleweed(p, 70, 62);
    }),
  // 5 stable
  5: (p) => {
    wooden(p, [40, 14, 120, 54], 'red');
    for (const x of [64, 96]) p.rect(x, 30, 3, 24, 'brown'); // stall posts
    p.rect(40, 34, 80, 3, 'brown');
    hay(p, 6, 54, 24, 10);
    hay(p, 12, 44, 18, 10);
    p.disc(140, 20, 5, 'grey', undefined, 5); // a horse collar
    p.disc(140, 20, 3, 'darkBrown', undefined, 3);
    p.rect(64, 10, 32, 2, 'darkBrown'); // a loft beam
  },
  // 6 road out of town
  6: (p) => {
    sky(p, 44);
    sun(p, 30, 12);
    mountains(p, 44, 'lightSky');
    dirt(p, 44);
    road(p, 44, 100);
    for (const [x, w, h] of [[136, 8, 8], [146, 10, 10], [154, 6, 7]] as const) p.rect(x, 44 - h, w, h, 'brown'); // town far off east
    cactus(p, 30, 64, 20);
    rocks(p, [[54, 72], [10, 70]]);
  },
  // 7 fork in the road
  7: (p) => {
    sky(p, 44);
    mountains(p, 44, 'lightSky');
    dirt(p, 44);
    p.poly([[50, 80], [110, 80], [86, 56], [74, 56]], 'sand', ['darkSand', P.sparse]);
    p.poly([[74, 56], [86, 56], [30, 44], [24, 44]], 'sand', ['darkSand', P.sparse]);
    p.poly([[74, 56], [86, 56], [136, 44], [130, 44]], 'sand', ['darkSand', P.sparse]);
    p.rect(110, 34, 2, 30, 'brown'); // signpost
    p.poly([[96, 36], [120, 36], [124, 39], [120, 42], [96, 42]], 'lightSand');
    p.poly([[96, 45], [100, 42], [124, 42], [124, 48], [100, 48]], 'lightSand');
    text(p, 100, 37, 'N', 'darkBrown');
    text(p, 108, 43, 'S', 'darkBrown');
    cactus(p, 20, 70, 18);
  },
  // 8 ridge above a narrow ravine, mountains in the distance
  8: (p) => {
    sky(p, 36);
    mountains(p, 36);
    p.rect(0, 36, 160, 44, 'darkSand', ['brown', P.speck]);
    p.poly([[60, 36], [100, 36], [92, 80], [70, 80]], 'black', ['darkBrown', P.speck]); // the ravine
    p.poly([[60, 36], [70, 80], [62, 80], [56, 40]], 'brown', ['darkBrown', P.checker]);
    p.poly([[0, 66], [60, 56], [70, 80], [0, 80]], 'sand', ['darkSand', P.grain]);
    p.path([[0, 66], [60, 56], [70, 80]], 'darkBrown');
  },
  // 9 large field
  9: (p) => {
    sky(p, 40);
    sun(p, 130, 10);
    mountains(p, 40, 'lightSky');
    p.rect(0, 40, 160, 40, 'green', ['darkGreen', P.grain]);
    p.recolour(0, 40, 160, 40, 'green', 'yellow', P.speck);
    for (let x = 4; x < 160; x += 20) {
      p.rect(x, 52, 2, 12, 'brown');
    }
    p.rect(0, 54, 160, 1, 'brown');
    p.rect(0, 58, 160, 1, 'brown');
  },
  // 10 ravine
  10: (p) => {
    canyon(p, 'brown', 'darkBrown');
    p.recolour(0, 0, 160, 80, 'brown', 'red', P.sparse);
    rocks(p, [[64, 70], [96, 74]]);
    p.path([[60, 4], [56, 20]], 'darkGreen'); // a rope of scrub on the wall
  },
  // 11 saloon
  11: (p) => {
    wooden(p, [36, 14, 124, 52]);
    p.rect(60, 18, 40, 16, 'darkBrown'); // where the mirror hangs
    counter(p, 0, 34, 50);
    p.rect(2, 20, 30, 2, 'darkBrown');
    for (let x = 4; x < 30; x += 5) p.rect(x, 15, 2, 5, x % 2 ? 'green' : 'darkRed'); // bottles
    lamp(p, 80, 6);
    for (const x of [48, 112]) {
      p.rect(x - 7, 60, 14, 3, 'darkBrown'); // tables
      p.rect(x - 1, 63, 2, 10, 'darkBrown');
    }
  },
  // 12 hidden office
  12: (p) => {
    wooden(p, [30, 18, 130, 58], 'darkBrown');
    p.rect(54, 44, 52, 4, 'brown', ['darkBrown', P.rows]); // desk
    p.rect(56, 48, 6, 18, 'darkBrown');
    p.rect(98, 48, 6, 18, 'darkBrown');
    p.rect(62, 28, 36, 12, 'lightSand', ['sand', P.sparse]); // a map on the wall
    p.path([[66, 32], [74, 30], [82, 36], [92, 32]], 'red');
    lamp(p, 80, 10);
  },
  // 13 Jail
  13: (p) => {
    wooden(p, [40, 16, 120, 54], 'darkSand');
    p.rect(52, 22, 16, 18, 'lightSand'); // wanted poster
    text(p, 54, 24, 'WANT', 'darkBrown');
    p.disc(60, 34, 4, 'darkBrown', undefined, 4);
    p.rect(86, 22, 24, 32, 'darkGrey', ['grey', P.rows]); // cell door
    p.rect(0, 52, 34, 4, 'brown'); // sheriff's desk
    p.rect(2, 56, 4, 20, 'darkBrown');
    p.rect(28, 56, 4, 20, 'darkBrown');
    for (let x = 122; x < 144; x += 6) p.line(x, 26, x, 30, 'grey'); // keys on hooks
  },
  // 14 cell
  14: (p) => {
    p.rect(0, 0, 160, 80, 'stone', ['darkStone', P.sparse]);
    for (let y = 8; y < 58; y += 8) p.line(0, y, 160, y, 'darkStone');
    p.poly([[0, 80], [24, 58], [136, 58], [160, 80]], 'darkSand', ['darkStone', P.grain]);
    p.rect(62, 14, 20, 12, 'sky'); // a barred window
    for (let x = 64; x < 82; x += 4) p.rect(x, 14, 2, 12, 'black');
    p.rect(98, 50, 48, 6, 'brown', ['darkBrown', P.rows]); // a cot
    p.rect(98, 56, 3, 10, 'darkBrown');
    p.rect(143, 56, 3, 10, 'darkBrown');
    p.rect(98, 47, 14, 4, 'lightGrey');
    for (let x = 0; x <= 160; x += 14) p.rect(x, 0, 3, 80, 'darkGrey', ['grey', P.columns]);
  },
  // 15 Dry Goods store
  15: (p) => {
    wooden(p, [36, 12, 124, 50]);
    shelves(p, 40, 14, 80, 30, ['red', 'gold', 'sky', 'white', 'green', 'lightSand']);
    counter(p, 44, 116, 58);
    p.rect(54, 52, 10, 3, 'darkGrey'); // scales
    p.disc(59, 51, 3, 'gold', undefined, 1);
    p.rect(4, 54, 12, 16, 'brown', ['darkBrown', P.rows]); // a barrel
    p.rect(140, 50, 14, 20, 'lightSand', ['sand', P.rows]); // sacks
  },
  // 16 Barbershop
  16: (p) => {
    wooden(p, [40, 14, 120, 54], 'lightSand');
    p.rect(56, 18, 48, 16, 'lightGrey', ['paleSky', P.diagonal]); // big mirror
    p.path([[56, 18], [104, 18], [104, 34], [56, 34], [56, 18]], 'gold');
    // the barber's chair
    p.rect(66, 46, 28, 8, 'darkRed', ['red', P.checker]);
    p.rect(70, 30, 20, 16, 'darkRed', ['red', P.checker]);
    p.rect(78, 54, 4, 12, 'grey');
    p.rect(70, 66, 20, 3, 'grey');
    for (let y = 20; y < 60; y += 4) p.rect(10, y, 4, 2, 'red'); // striped pole inside the window
    p.rect(9, 18, 6, 44, 'white', ['red', (x, y) => (x + y) % 6 < 2]);
  },
  // 17 road east of town, Boot Hill ahead
  17: (p) => {
    dusk(p, 46);
    dirt(p, 46);
    road(p, 46, 60);
    p.disc(124, 50, 40, 'darkSand', ['brown', P.checker], 14); // Boot Hill
    for (const x of [108, 120, 134]) {
      p.rect(x, 30, 1, 8, 'darkBrown');
      p.rect(x - 2, 32, 5, 1, 'darkBrown');
    }
    cactus(p, 20, 66, 20);
  },
  // 18 ridge above a ravine
  18: (p) => {
    dusk(p, 40);
    mountains(p, 40);
    p.rect(0, 40, 160, 40, 'brown', ['darkBrown', P.speck]);
    p.poly([[40, 40], [130, 40], [110, 80], [60, 80]], 'black', ['darkBrown', P.speck]);
    p.poly([[100, 80], [120, 56], [160, 50], [160, 80]], 'darkSand', ['brown', P.grain]);
    p.path([[100, 80], [120, 56], [160, 50]], 'darkBrown');
    p.path([[0, 50], [40, 40]], 'darkSand');
  },
  // 19 stall
  19: (p) => {
    wooden(p, [30, 14, 130, 56]);
    hay(p, 34, 48, 30, 10);
    p.rect(36, 30, 24, 8, 'darkBrown'); // feed trough
    p.rect(38, 32, 20, 4, 'yellow', ['sand', P.grain]);
    p.rect(0, 50, 30, 4, 'brown'); // the stall gate
    p.rect(0, 60, 30, 4, 'brown');
  },
  // 20 Boot Hill
  20: (p) => {
    dusk(p, 50);
    p.disc(80, 92, 110, 'darkSand', ['brown', P.speck], 52);
    p.recolour(0, 40, 160, 40, 'darkSand', 'darkGreen', P.sparse);
    for (const [x, y, s] of [[30, 54, 1], [58, 48, 0.8], [96, 46, 0.8], [124, 52, 1], [76, 64, 1.4]] as const) {
      p.rect(x, y - 14 * s, 2 * s, 16 * s, 'brown');
      p.rect(x - 4 * s, y - 10 * s, 10 * s, 2 * s, 'brown');
      p.rect(x - 6 * s, y + 2 * s, 14 * s, 2, 'darkBrown');
    }
    p.rect(108, 60, 12, 14, 'grey', ['lightGrey', P.speck]); // a headstone
    p.disc(114, 60, 6, 'grey', undefined, 3);
    text(p, 109, 62, 'RIP', 'darkGrey');
    p.rect(150, 20, 2, 40, 'darkBrown'); // a dead tree
    p.path([[151, 30], [140, 22]], 'darkBrown');
    p.path([[151, 36], [158, 28]], 'darkBrown');
  },
  // 21 Mine, near the way up to the ravine
  21: (p) => {
    mine(p);
    p.rect(60, 0, 40, 12, 'sky', ['lightSky', P.checker]); // daylight above
    ladder(p, 74, 0, 24);
  },
  // 22 Mine
  22: (p) => {
    mine(p, [64, 26, 96, 50]);
    ladder(p, 18, 6, 72);
    p.rect(110, 62, 30, 8, 'darkGrey', ['grey', P.sparse]); // an ore cart
    p.disc(116, 71, 3, 'black');
    p.disc(134, 71, 3, 'black');
    p.path([[0, 76], [64, 50]], 'grey'); // rails
    p.path([[30, 80], [70, 50]], 'grey');
  },
  // 23 Mine, the end of the tunnel
  23: (p) => {
    mine(p, [40, 16, 120, 58]);
    p.rect(40, 16, 80, 42, 'darkStone', ['stone', P.grain]);
    p.path([[44, 24], [60, 30], [78, 26], [96, 34], [116, 30]], 'lightGrey'); // a silver vein
    p.path([[48, 40], [70, 44], [90, 40], [112, 48]], 'white');
    p.poly([[60, 58], [70, 50], [86, 52], [96, 58]], 'darkStone', ['stone', P.checker]); // rubble
  },
  // 24 Telegraph office
  24: (p) => {
    wooden(p, [40, 14, 120, 54], 'darkSand');
    counter(p, 0, 60, 56);
    p.rect(4, 49, 14, 4, 'darkGrey'); // the key on the counter
    p.rect(10, 46, 2, 4, 'grey');
    p.rect(26, 48, 20, 5, 'lightSand'); // telegram forms
    window(p, 60, 20, 18, 14);
    p.rect(92, 18, 20, 8, 'lightSand');
    text(p, 94, 20, 'WIRE', 'darkBrown');
    p.path([[40, 20], [52, 22], [60, 20]], 'black');
  },
  // 25 on the back of 'Ole Paint
  25: (p) => {
    wooden(p, [30, 10, 130, 46]);
    hay(p, 34, 34, 30, 12);
    // the horse's neck and head going away from the viewer
    p.poly([[52, 80], [70, 44], [90, 44], [108, 80]], 'brown');
    p.poly([[52, 80], [64, 56], [72, 66], [66, 80]], 'white'); // a white patch
    p.poly([[96, 54], [104, 70], [92, 74]], 'white');
    p.poly([[70, 46], [74, 32], [86, 32], [90, 46]], 'brown');
    p.poly([[76, 32], [84, 32], [82, 46], [78, 46]], 'white'); // the blaze
    p.poly([[71, 34], [71, 24], [76, 32]], 'brown'); // ears
    p.poly([[89, 34], [89, 24], [84, 32]], 'brown');
    p.rect(77, 46, 6, 34, 'darkBrown', ['black', P.checker]); // mane
    p.path([[52, 80], [70, 44], [70, 46], [74, 32], [71, 24], [76, 32], [84, 32], [89, 24], [86, 32], [90, 46], [90, 44], [108, 80]], 'black');
    p.rect(0, 74, 160, 6, 'darkRed', ['red', P.checker]); // saddle blanket edge
  },
  // 26 warm bed
  26: (p) => {
    p.rect(0, 0, 160, 80, 'navy', ['black', P.checker]);
    window(p, 60, 10, 36, 26, 'navy');
    p.disc(70, 18, 4, 'yellow'); // the moon
    p.poly([[0, 52], [160, 46], [160, 80], [0, 80]], 'darkRed', ['red', (x, y) => ((x >> 2) + (y >> 2)) % 2 === 0]); // the quilt
    p.disc(28, 52, 18, 'white', ['lightGrey', P.sparse], 7); // pillow
    p.rect(0, 40, 6, 40, 'brown'); // bedpost
    p.disc(3, 38, 4, 'gold');
  },
  // 27 hotel room
  27: (p) => {
    wooden(p, [40, 16, 120, 54], 'darkRed');
    p.recolour(0, 0, 160, 80, 'darkRed', 'red', (x, y) => x % 6 === 0 && y % 6 === 3); // wallpaper
    window(p, 70, 22, 20, 16);
    p.rect(0, 50, 50, 10, 'white', ['lightGrey', P.sparse]); // bed
    p.rect(0, 46, 4, 30, 'brown');
    p.rect(46, 46, 4, 30, 'brown');
    p.rect(0, 60, 50, 6, 'darkRed', ['red', P.checker]);
    p.rect(124, 46, 18, 20, 'brown', ['darkBrown', P.rows]); // washstand
    p.disc(133, 45, 6, 'white', undefined, 2);
  },
  // 28 lobby
  28: (p) => {
    wooden(p, [40, 14, 120, 54], 'darkRed');
    p.recolour(0, 0, 160, 80, 'darkRed', 'red', (x, y) => x % 6 === 0 && y % 6 === 3);
    for (let i = 0; i < 7; i++) p.rect(124 + i * 4, 70 - i * 9, 36 - i * 4, 3, 'brown'); // stairs going up
    p.rect(48, 18, 24, 14, 'darkBrown'); // pigeon-holes for keys
    for (let x = 50; x < 70; x += 4) for (let y = 20; y < 30; y += 4) p.rect(x, y, 3, 3, 'black');
    lamp(p, 92, 8);
    p.rect(8, 56, 20, 6, 'darkGreen', ['green', P.checker]); // a settee
    p.rect(8, 50, 20, 6, 'darkGreen');
  },
  // 29 inside a grave
  29: (p) => {
    p.rect(0, 0, 160, 80, 'brown', ['darkBrown', P.grain]);
    p.poly([[0, 0], [160, 0], [120, 18], [40, 18]], 'red', ['orange', P.checker]); // sky above
    p.poly([[0, 0], [40, 18], [40, 66], [0, 80]], 'darkBrown', ['brown', P.grain]);
    p.poly([[160, 0], [120, 18], [120, 66], [160, 80]], 'darkBrown', ['black', P.grain]);
    p.poly([[0, 80], [40, 66], [120, 66], [160, 80]], 'darkSand', ['brown', P.grain]);
    p.path([[0, 0], [40, 18], [120, 18], [160, 0]], 'darkSand');
    p.rect(60, 54, 40, 12, 'darkBrown', ['brown', P.rows]); // a coffin lid
  },
  // 30 flat on my back in a manure pile: the stable roof above
  30: (p) => {
    p.rect(0, 0, 160, 80, 'darkRed', ['red', P.checker]);
    for (let x = 0; x < 160; x += 20) p.rect(x, 0, 6, 80, 'darkBrown', ['brown', P.columns]); // rafters
    p.rect(60, 20, 40, 20, 'sky', ['lightSky', P.checker]); // a hole in the roof
    p.poly([[0, 80], [0, 56], [20, 62], [40, 58], [60, 68], [80, 62], [100, 70], [120, 60], [140, 64], [160, 56], [160, 80]], 'darkBrown', ['brown', P.grain]);
    for (const x of [30, 90, 130]) p.path([[x, 54], [x + 2, 50], [x, 46], [x + 2, 42]], 'lightGrey'); // the smell
  },
  // 31 storeroom
  31: (p) => {
    wooden(p, [40, 18, 120, 54]);
    for (const [x, y] of [[48, 34], [62, 34], [54, 22]] as const) {
      p.rect(x, y, 12, 12, 'sand', ['darkSand', P.rows]); // crates
      p.line(x, y, x + 12, y + 12, 'darkSand');
    }
    p.rect(96, 40, 20, 14, 'lightSand', ['sand', P.rows]); // sacks
  },
  // 32 mountain trail
  32: (p) => {
    sky(p, 30);
    mountains(p, 30);
    p.poly([[0, 30], [60, 30], [90, 50], [160, 40], [160, 80], [0, 80]], 'brown', ['darkBrown', P.speck]);
    p.poly([[30, 80], [70, 80], [96, 46], [90, 44]], 'sand', ['darkSand', P.sparse]); // the trail
    p.poly([[0, 30], [40, 30], [20, 80], [0, 80]], 'darkStone', ['stone', P.grain]);
    for (const x of [130, 146]) {
      p.poly([[x - 6, 52], [x, 36], [x + 6, 52]], 'darkGreen', ['green', P.checker]); // pines
      p.rect(x - 1, 52, 2, 4, 'darkBrown');
    }
  },
  // 33 line shack
  33: (p) => {
    wooden(p, [36, 16, 124, 56], 'darkSand');
    p.recolour(0, 0, 160, 80, 'darkSand', 'brown', P.grain);
    p.rect(60, 46, 40, 4, 'brown'); // a table
    p.rect(62, 50, 3, 16, 'darkBrown');
    p.rect(95, 50, 3, 16, 'darkBrown');
    p.rect(74, 41, 12, 5, 'darkGrey'); // a telegraph sounder
    p.path([[86, 42], [124, 24]], 'black'); // its wire out of the wall
    window(p, 46, 22, 14, 12, 'sky');
    p.rect(124, 30, 2, 22, 'darkGrey'); // stove pipe
    p.rect(118, 50, 14, 14, 'black', ['darkGrey', P.checker]);
  },
  // 34 root cellar
  34: (p) => {
    p.rect(0, 0, 160, 80, 'darkBrown', ['brown', P.grain]);
    p.poly([[0, 80], [30, 60], [130, 60], [160, 80]], 'brown', ['darkBrown', P.grain]);
    shelves(p, 34, 16, 92, 36, ['red', 'orange', 'green', 'yellow']);
    ladder(p, 8, 0, 72);
    p.rect(132, 0, 18, 6, 'sand'); // light through the trapdoor
  },
  // 35 behind the hotel counter
  35: (p) => {
    wooden(p, [40, 14, 120, 54], 'darkRed');
    p.recolour(0, 0, 160, 80, 'darkRed', 'red', (x, y) => x % 6 === 0 && y % 6 === 3);
    p.rect(54, 20, 52, 14, 'lightSand');
    text(p, 56, 22, 'RING FOR', 'darkBrown');
    text(p, 58, 28, 'SERVICE', 'darkBrown');
    p.rect(0, 62, 160, 18, 'brown', ['darkBrown', P.rows]); // the counter, from behind
    p.rect(0, 60, 160, 3, 'darkBrown');
    p.disc(124, 59, 4, 'gold', undefined, 3); // the bell
    p.rect(123, 54, 2, 3, 'gold');
  },
  // 36 hidden canyon
  36: (p) => {
    canyon(p, 'red', 'darkRed');
    p.disc(78, 58, 14, 'green', ['darkGreen', P.checker], 4);
    p.rect(68, 52, 2, 8, 'darkGreen');
  },
  // 37 inside the teepee
  37: (p) => {
    p.rect(0, 0, 160, 80, 'lightSand', ['sand', P.grain]);
    for (let x = -80; x <= 240; x += 20) p.line(80, 0, x, 80, 'brown'); // the poles
    p.poly([[70, 0], [90, 0], [84, 10], [76, 10]], 'sky'); // the smoke hole
    for (const y of [32, 36, 40]) p.recolour(0, y, 160, 2, 'lightSand', y === 36 ? 'sky' : 'red', () => true); // painted bands
    p.poly([[0, 80], [0, 66], [160, 66], [160, 80]], 'darkSand', ['brown', P.grain]);
    p.disc(80, 66, 12, 'darkGrey', ['grey', P.checker], 4); // the fire ring
    p.poly([[74, 64], [80, 52], [86, 64]], 'orange', ['yellow', P.checker]);
    p.rect(20, 62, 22, 6, 'darkBrown', ['brown', P.rows]); // a buffalo robe
  },
  // 38 lot of trouble!
  38: (p) => {
    dusk(p, 60);
    p.rect(0, 60, 160, 20, 'darkSand', ['brown', P.speck]);
    p.rect(50, 0, 6, 60, 'darkBrown'); // the gallows
    p.rect(50, 4, 70, 5, 'darkBrown');
    p.line(56, 16, 66, 9, 'darkBrown');
    p.line(110, 9, 110, 30, 'sand');
    p.disc(110, 34, 4, 'sand', undefined, 5);
    p.disc(110, 34, 2, 'orange', undefined, 3);
    p.rect(36, 56, 90, 6, 'brown', ['darkBrown', P.rows]); // platform
    p.rect(40, 62, 3, 14, 'darkBrown');
    p.rect(118, 62, 3, 14, 'darkBrown');
  },
};

// ---------------------------------------------------------------- things

function ghost(p: Painter, x: number, y: number, h: number): void {
  p.poly([[x - 8, y + h], [x - 6, y + 8], [x, y], [x + 6, y + 8], [x + 8, y + h], [x + 4, y + h - 4], [x, y + h], [x - 4, y + h - 4]], 'white', ['paleSky', P.checker]);
  p.dot(x - 2, y + 6, 'black');
  p.dot(x + 2, y + 6, 'black');
  p.line(x - 1, y + 10, x + 1, y + 10, 'black');
}

function mirror(p: Painter, glass: (p: Painter) => void): void {
  p.rect(62, 19, 36, 14, 'paleSky', ['white', P.diagonal]);
  glass(p);
  p.path([[61, 18], [98, 18], [98, 33], [61, 33], [61, 18]], 'gold');
}

function safe(p: Painter, open: boolean): void {
  p.rect(126, 36, 26, 28, 'darkGrey', ['grey', P.sparse]);
  p.path([[126, 36], [152, 36], [152, 64], [126, 64], [126, 36]], 'black');
  if (open) {
    p.rect(129, 39, 20, 22, 'black');
    p.poly([[126, 36], [112, 32], [112, 68], [126, 64]], 'grey', ['darkGrey', P.checker]); // the door blown open
    for (const [x, y] of [[132, 30], [138, 24], [130, 18]] as const) p.disc(x, y, 4, 'lightGrey', ['grey', P.checker], 3); // smoke
  } else {
    p.disc(139, 48, 4, 'lightGrey', undefined, 4);
    p.dot(139, 45, 'black');
    p.rect(146, 46, 3, 6, 'gold');
  }
}

function keg(p: Painter, x: number, label: string): void {
  p.disc(x + 8, 70, 9, 'brown', ['darkBrown', P.columns], 3);
  p.rect(x, 54, 17, 16, 'brown', ['darkBrown', P.columns]);
  p.disc(x + 8, 54, 9, 'sand', undefined, 3);
  p.rect(x, 58, 17, 1, 'darkGrey');
  p.rect(x, 66, 17, 1, 'darkGrey');
  text(p, x + 3, 61, label, 'black');
}

const things: Record<number, (p: Painter) => void> = {
  // 5 the stall's gate, 6 the manure pile
  5: (p) => {
    p.rect(66, 34, 30, 3, 'darkBrown');
    p.rect(66, 42, 30, 3, 'darkBrown');
  },
  6: (p) => p.poly([[100, 76], [110, 66], [122, 62], [136, 66], [146, 76]], 'darkBrown', ['brown', P.grain]),
  // 13 the entrance to a mine
  13: (p) => {
    p.rect(68, 44, 22, 18, 'black');
    p.rect(66, 42, 26, 3, 'brown');
    p.rect(66, 44, 3, 18, 'brown');
    p.rect(89, 44, 3, 18, 'brown');
  },
  // 15 mirror, 17 broken mirror, 39 taped up mirror
  15: (p) => mirror(p, () => {}),
  17: (p) =>
    mirror(p, (p) => {
      p.rect(62, 19, 36, 14, 'black');
      p.path([[62, 19], [74, 26], [70, 33]], 'paleSky');
      p.path([[98, 21], [86, 26], [94, 33]], 'paleSky');
    }),
  39: (p) =>
    mirror(p, (p) => {
      p.path([[62, 19], [80, 26], [72, 33]], 'grey');
      p.line(64, 22, 96, 30, 'lightSand');
      p.line(64, 30, 96, 22, 'lightSand');
    }),
  // 16 'ole Paint, the pinto horse
  16: (p) => {
    p.disc(100, 52, 22, 'white', ['brown', (x, y) => ((x >> 3) + (y >> 2)) % 3 === 0], 11);
    p.poly([[118, 46], [128, 26], [136, 28], [128, 50]], 'white', ['brown', (x) => x > 130]); // neck
    p.poly([[126, 26], [142, 30], [144, 36], [130, 34]], 'brown'); // head
    p.dot(132, 29, 'black');
    p.poly([[128, 22], [130, 26], [127, 26]], 'brown');
    for (const x of [84, 92, 108, 116]) p.rect(x, 60, 3, 16, 'white', ['brown', P.rows]);
    p.path([[78, 48], [72, 58], [74, 64]], 'darkBrown'); // tail
    p.path([[82, 42], [98, 40], [118, 44]], 'darkBrown');
  },
  // 18 hole in the wall, 58 hole kicked in the wall
  18: (p) => p.disc(28, 44, 7, 'black', undefined, 9),
  58: (p) => {
    p.poly([[18, 36], [30, 32], [36, 44], [30, 56], [18, 54]], 'black');
    p.disc(28, 68, 3, 'darkBrown', undefined, 2); // the hoof print
  },
  // 22 large bell
  22: (p) => {
    p.line(136, 0, 136, 10, 'darkGrey');
    p.poly([[130, 22], [132, 12], [140, 12], [142, 22]], 'gold', ['yellow', P.checker]);
    p.rect(129, 22, 14, 2, 'gold');
    p.disc(136, 25, 2, 'darkBrown');
  },
  // 23 wraithlike figure at a ghostly piano, 24 the piano
  24: (p) => {
    p.rect(120, 40, 36, 26, 'darkBrown', ['brown', P.rows]);
    p.rect(118, 48, 40, 4, 'white', ['black', (x) => x % 3 === 0]);
    p.rect(122, 66, 3, 10, 'darkBrown');
    p.rect(152, 66, 3, 10, 'darkBrown');
  },
  23: (p) => {
    ghost(p, 136, 22, 32);
    p.rect(120, 40, 36, 26, 'grey', ['paleSky', P.checker]);
    p.rect(118, 48, 40, 4, 'white', ['grey', (x) => x % 3 === 0]);
  },
  // 29 open door, 31 locked door
  31: (p) => {
    p.rect(86, 22, 24, 32, 'darkGrey', ['grey', P.rows]);
    p.rect(104, 36, 3, 4, 'gold');
  },
  29: (p) => {
    p.rect(86, 22, 24, 32, 'black');
    p.poly([[86, 22], [76, 18], [76, 58], [86, 54]], 'darkGrey', ['grey', P.rows]);
  },
  // 43 bed
  43: (p) => {
    p.rect(98, 56, 50, 10, 'white', ['lightGrey', P.sparse]);
    p.rect(98, 50, 3, 26, 'brown');
    p.rect(145, 50, 3, 26, 'brown');
    p.rect(110, 60, 38, 6, 'darkRed', ['red', P.checker]);
  },
  // 45 rattlesnake
  45: (p) => {
    p.disc(40, 70, 10, 'sand', ['brown', (x, y) => (x + y) % 4 < 2], 4);
    p.poly([[44, 68], [48, 56], [54, 56], [50, 68]], 'sand', ['brown', P.checker]);
    p.disc(53, 54, 4, 'sand', ['brown', P.checker], 3);
    p.dot(54, 53, 'black');
    p.path([[57, 55], [60, 56], [59, 58]], 'red');
    p.path([[30, 70], [26, 66], [27, 62]], 'lightSand'); // the rattle
    p.path([[30, 74], [50, 74]], 'darkBrown');
  },
  // 46 open grave
  46: (p) => {
    p.poly([[60, 74], [70, 66], [104, 66], [96, 74]], 'black');
    p.poly([[100, 64], [108, 56], [118, 58], [122, 66]], 'darkSand', ['brown', P.grain]);
  },
  // 48 purple worm, 49 purple slime
  48: (p) => {
    p.disc(80, 68, 34, 'purple', ['darkRed', P.checker], 8);
    p.disc(112, 52, 10, 'purple', ['darkRed', P.checker], 10);
    p.disc(114, 54, 5, 'black');
    for (const dx of [-4, 0, 4]) p.dot(114 + dx, 48, 'white');
  },
  49: (p) => p.poly([[50, 66], [62, 60], [96, 62], [114, 66], [100, 72], [60, 72]], 'purple', ['darkRed', P.sparse]),
  // 54 large safe, 64 smoking open safe
  54: (p) => safe(p, false),
  64: (p) => safe(p, true),
  // 59 keg of nails, 60 empty keg, 61 keg of gunpowder
  59: (p) => keg(p, 124, 'N'),
  60: (p) => keg(p, 124, ' '),
  61: (p) => keg(p, 124, 'P'),
  // 65 the line shack, up the trail
  65: (p) => {
    p.rect(100, 34, 24, 14, 'brown', ['darkBrown', P.columns]);
    p.poly([[98, 34], [112, 26], [126, 34]], 'darkBrown');
    p.rect(108, 40, 6, 8, 'black');
    p.rect(118, 26, 2, 6, 'darkGrey');
    p.path([[126, 30], [150, 18], [160, 16]], 'black');
  },
  // 67 hole in the floor
  67: (p) => p.poly([[96, 70], [108, 64], [130, 64], [140, 70], [124, 76], [102, 76]], 'black'),
  // 69 the hotel counter
  69: (p) => {
    counter(p, 44, 116, 58);
    p.disc(104, 55, 3, 'gold', undefined, 2);
  },
  // 70 ghostly square dance
  70: (p) => {
    for (const [x, y] of [[54, 36], [72, 32], [90, 34], [108, 38]] as const) ghost(p, x, y, 26);
  },
  // 74 teepee
  74: (p) => {
    p.poly([[96, 62], [112, 22], [128, 62]], 'lightSand', ['sand', P.grain]);
    p.path([[110, 16], [112, 22], [116, 14]], 'brown');
    p.poly([[108, 62], [112, 50], [116, 62]], 'black');
    p.rect(98, 40, 28, 2, 'red');
    p.path([[96, 62], [112, 22], [128, 62]], 'darkBrown');
  },
  // 75 Indian ghost
  75: (p) => {
    ghost(p, 120, 24, 36);
    p.poly([[116, 22], [118, 12], [120, 22]], 'paleSky'); // a feather
  },
};

const pictures: Record<number, (p: Painter) => void> = { ...rooms };
for (const [item, draw] of Object.entries(things)) pictures[100 + Number(item)] = draw;

export const GHOST_TOWN: SceneSet = {
  pictures,
  rooms: Object.fromEntries(Object.keys(rooms).map((r) => [r, Number(r)])),
};

/** Item number → picture number, for the things drawn over rooms. */
export const GHOST_TOWN_ITEMS: ReadonlyMap<number, number> = new Map(Object.keys(things).map((i) => [Number(i), 100 + Number(i)]));
