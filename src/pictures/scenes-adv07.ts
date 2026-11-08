// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pictures for Mystery Fun House (Adventure 7), which never had any.
// Rooms are pictures 1–35; things that come and go (the mermaid, the water,
// the calliope, ladders, doors…) are drawn over them as pictures 100 + item number.

import { PATTERNS as P, type Colour, type Painter, type SceneSet } from './scenes.js';
import { chamber, doorway, torch } from './scenes-common.js';

// ---------------------------------------------------------------- pieces

/** The park after dark: navy sky, stars, a purple glow low down. */
function night(p: Painter, horizon: number): void {
  p.rect(0, 0, 160, horizon, 'navy', ['black', P.checker]);
  p.rect(0, horizon - 10, 160, 10, 'navy', ['purple', P.checker]);
  p.rect(0, horizon - 4, 160, 4, 'purple', ['navy', P.sparse]);
  for (const [x, y] of [[8, 4], [30, 12], [52, 3], [74, 9], [98, 5], [120, 14], [142, 6], [154, 18], [18, 22], [64, 18]] as const) {
    p.dot(x, y, 'white');
  }
}

/** A row of light bulbs. */
function bulbs(p: Painter, x1: number, x2: number, y: number, step = 4): void {
  for (let x = x1; x <= x2; x += step) {
    p.dot(x, y, 'yellow');
    p.dot(x + 1, y, 'white');
  }
}

/** Red and white carnival stripes, vertical. */
function stripes(p: Painter, x: number, y: number, w: number, h: number, a: Colour = 'red', b: Colour = 'white'): void {
  for (let i = 0; i < w; i += 6) p.rect(x + i, y, Math.min(3, w - i), h, a);
  for (let i = 3; i < w; i += 6) p.rect(x + i, y, Math.min(3, w - i), h, b);
}

/** A painted fun-house room: bright walls instead of stone. */
function funRoom(p: Painter, wall: Colour, shade: Colour, back: readonly [number, number, number, number] = [44, 16, 116, 54]): void {
  chamber(p, { back, wall, shade, floor: 'brown', ceiling: 'navy', blocks: false });
  const [x0, y0, x1, y1] = back;
  p.rect(x0, y0, x1 - x0, y1 - y0, wall, [shade, P.sparse]);
  p.line(x0, y1 - 1, x1 - 1, y1 - 1, 'darkBrown');
  // floorboards
  for (let i = 1; i < 6; i++) p.line(x0 + ((x1 - x0) * i) / 6, y1, (160 * i) / 6, 80, 'darkBrown');
}

/** A carousel horse, facing right, on its pole. */
function horse(p: Painter, x: number, y: number, body: Colour = 'white', saddle: Colour = 'red'): void {
  p.rect(x + 7, y - 26, 2, 40, 'gold');
  p.disc(x + 8, y, 10, body, undefined, 5);
  p.poly([[x + 14, y - 3], [x + 20, y - 12], [x + 24, y - 11], [x + 19, y + 1]], body);
  p.poly([[x + 20, y - 12], [x + 28, y - 9], [x + 27, y - 6], [x + 22, y - 7]], body);
  p.dot(x + 23, y - 10, 'black');
  p.path([[x + 18, y - 12], [x + 14, y - 6], [x + 12, y - 4]], 'darkBrown'); // mane
  p.line(x + 2, y + 3, x - 2, y + 11, body);
  p.line(x + 4, y + 3, x + 2, y + 12, body);
  p.line(x + 13, y + 3, x + 17, y + 11, body);
  p.line(x + 11, y + 3, x + 12, y + 12, body);
  p.path([[x - 2, y - 2], [x - 6, y + 4]], 'darkBrown'); // tail
  p.rect(x + 4, y - 6, 7, 3, saddle);
  p.path([[x - 2, y - 5], [x + 18, y - 5]], 'darkGrey');
}

/** A carousel seen from the floor: canopy, horses, the centre column. */
function carousel(p: Painter, top: number): void {
  p.poly([[16, top + 14], [80, top], [144, top + 14]], 'red', ['white', P.columns]);
  p.rect(16, top + 14, 128, 4, 'gold', ['yellow', P.checker]);
  bulbs(p, 18, 140, top + 16);
  p.disc(80, top + 1, 3, 'gold');
  p.rect(74, top + 18, 12, 38, 'darkRed', ['red', P.checker]);
  p.rect(74, top + 22, 12, 6, 'gold');
  p.disc(80, top + 58, 64, 'brown', ['darkBrown', P.rows], 6);
  horse(p, 26, top + 42, 'white', 'red');
  horse(p, 104, top + 40, 'lightSand', 'purple');
}

/** A heavy steel door, closed, with a keyhole. */
function steelDoor(p: Painter, x: number, base: number, w: number, h: number): void {
  p.rect(x - 1, base - h - 1, w + 2, h + 1, 'black');
  p.rect(x, base - h, w, h, 'grey', ['lightGrey', P.rows]);
  for (const y of [base - h + 3, base - 4]) {
    p.dot(x + 2, y, 'darkGrey');
    p.dot(x + w - 3, y, 'darkGrey');
  }
  p.rect(x + w - 6, base - h / 2 - 2, 3, 4, 'gold');
  p.dot(x + w - 5, base - h / 2, 'black');
}

/** A round tunnel, seen down its length. */
function tunnel(p: Painter, wall: Colour, shade: Colour, depth: number): void {
  p.rect(0, 0, 160, 80, shade, ['black', P.checker]);
  for (let i = 0; i < depth; i++) {
    const r = 78 - i * (66 / depth);
    p.disc(80, 40, r, 'black', undefined, r * 0.55);
    p.disc(80, 40, r - 1.5, i % 2 ? wall : shade, [i % 2 ? shade : wall, P.speck], r * 0.55 - 1);
  }
  p.disc(80, 40, 10, 'black', undefined, 6);
}

/** A twisting hedge-and-board maze passage with gusts of air. */
function gusts(p: Painter, spots: readonly (readonly [number, number])[]): void {
  for (const [x, y] of spots) {
    p.path([[x, y], [x + 6, y - 1], [x + 10, y + 1], [x + 14, y]], 'paleSky');
    p.path([[x + 3, y + 3], [x + 9, y + 2], [x + 13, y + 4]], 'white');
  }
}

// ---------------------------------------------------------------- rooms

const SMALL_ROOM = 8;
const MAZE = 29;

const rooms: Record<number, (p: Painter) => void> = {
  // 1 in front of the FUN HOUSE: a clown's-face entrance under the night sky
  1: (p) => {
    night(p, 52);
    p.rect(0, 52, 160, 28, 'darkGrey', ['grey', P.speck]);
    p.rect(14, 10, 132, 46, 'purple', ['darkRed', P.checker]);
    stripes(p, 14, 10, 132, 6, 'red', 'yellow');
    bulbs(p, 14, 144, 17);
    p.rect(29, 19, 70, 10, 'black');
    // F U N  H O U S E in block letters
    const letters: [number, number, number, number][][] = [
      [[32, 21, 1, 7], [32, 21, 5, 1], [32, 24, 4, 1]], // F
      [[39, 21, 1, 7], [43, 21, 1, 7], [39, 27, 5, 1]], // U
      [[47, 21, 1, 7], [51, 21, 1, 7], [47, 21, 5, 1]], // N
      [[60, 21, 1, 7], [64, 21, 1, 7], [60, 24, 5, 1]], // H
      [[68, 21, 1, 7], [72, 21, 1, 7], [68, 21, 5, 1], [68, 27, 5, 1]], // O
      [[76, 21, 1, 7], [80, 21, 1, 7], [76, 27, 5, 1]], // U
      [[84, 21, 5, 1], [84, 21, 1, 4], [84, 24, 5, 1], [88, 24, 1, 4], [84, 27, 5, 1]], // S
      [[92, 21, 1, 7], [92, 21, 5, 1], [92, 24, 4, 1], [92, 27, 5, 1]], // E
    ];
    for (const letter of letters) for (const [x, y, w, h] of letter) p.rect(x, y, w, h, 'yellow');
    // the clown's face round the door
    p.disc(80, 44, 20, 'white', ['lightGrey', P.sparse], 12);
    p.disc(70, 38, 3, 'navy');
    p.disc(90, 38, 3, 'navy');
    p.disc(80, 43, 3, 'red');
    p.poly([[66, 47], [94, 47], [88, 56], [72, 56]], 'black');
    p.path([[66, 47], [72, 56], [88, 56], [94, 47]], 'red');
    stripes(p, 14, 30, 12, 26, 'red', 'white');
    stripes(p, 134, 30, 12, 26, 'red', 'white');
  },
  // 2 Magical Mirror Room: wavy mirrors all round
  2: (p) => {
    funRoom(p, 'purple', 'darkRed');
    for (const [x, w] of [[48, 18], [71, 18], [94, 18]] as const) {
      p.rect(x - 1, 19, w + 2, 33, 'gold');
      p.rect(x, 20, w, 31, 'paleSky', ['white', P.diagonal]);
      for (let y = 22; y < 50; y += 4) p.path([[x + 2, y], [x + 6, y + 1], [x + 10, y], [x + 14, y + 1]], 'lightSky');
    }
    // a stretched reflection in the middle mirror
    p.disc(80, 26, 3, 'sand', undefined, 4);
    p.rect(78, 30, 5, 18, 'sand');
    p.poly([[4, 10], [36, 20], [36, 58], [4, 72]], 'paleSky', ['white', P.diagonal]);
    p.path([[4, 10], [36, 20], [36, 58], [4, 72], [4, 10]], 'gold');
    p.poly([[156, 10], [124, 20], [124, 58], [156, 72]], 'paleSky', ['lightSky', P.diagonal]);
    p.path([[156, 10], [124, 20], [124, 58], [156, 72], [156, 10]], 'gold');
  },
  // 3 a small landing at the top of the slide; stairs up
  3: (p) => {
    funRoom(p, 'lightSky', 'sky');
    doorway(p, 52, 54, 16, 26);
    for (let i = 0; i < 6; i++) p.rect(98 + i * 2, 50 - i * 5, 16 - i * 2, 5, 'brown', ['darkBrown', P.rows]); // stairs up
    p.path([[98, 50], [108, 22]], 'darkBrown');
  },
  // 4 beside a LARGE tank
  4: (p) => {
    funRoom(p, 'lightStone', 'stone', [30, 12, 130, 58]);
    p.rect(40, 16, 80, 40, 'darkGrey');
    p.rect(42, 18, 76, 36, 'water', ['lightWater', P.rows]);
    p.recolour(42, 18, 76, 36, 'water', 'navy', P.speck);
    for (const [x, y] of [[60, 30], [64, 24], [98, 40], [101, 33]] as const) p.disc(x, y, 1, 'paleSky');
    p.path([[44, 50], [48, 44], [52, 50]], 'green');
    p.path([[110, 52], [113, 42], [116, 52]], 'green');
    for (let y = 18; y < 54; y += 9) {
      p.dot(41, y, 'lightGrey');
      p.dot(118, y, 'lightGrey');
    }
    // ladder up the side
    p.rect(134, 8, 2, 66, 'grey');
    p.rect(146, 6, 2, 72, 'grey');
    for (let y = 12; y < 74; y += 7) p.line(134, y, 147, y, 'grey');
  },
  // 5 windowed tank: inside it, the glass wall ahead
  5: (p) => {
    p.rect(0, 0, 160, 80, 'lightGrey', ['grey', P.speck]);
    p.rect(0, 0, 160, 6, 'darkGrey');
    p.rect(30, 18, 100, 34, 'darkGrey');
    p.rect(32, 20, 96, 30, 'paleSky', ['white', P.diagonal]); // the window out
    p.rect(0, 72, 160, 8, 'sand', ['darkSand', P.speck]);
    p.path([[10, 72], [12, 60], [14, 72]], 'green');
    p.path([[146, 72], [148, 58], [151, 72]], 'green');
  },
  // 6 hidden laboratory
  6: (p) => {
    funRoom(p, 'white', 'lightGrey');
    p.rect(44, 16, 72, 38, 'lightGrey', ['white', P.sparse]);
    p.rect(50, 22, 30, 3, 'darkGrey'); // shelf
    for (const [x, c] of [[52, 'green'], [60, 'red'], [68, 'purple'], [75, 'yellow']] as const) {
      p.rect(x, 18, 3, 4, c);
      p.dot(x + 1, 17, 'lightGrey');
    }
    p.rect(88, 20, 22, 14, 'darkGrey'); // a screen of dials
    p.rect(90, 22, 18, 10, 'black');
    p.path([[90, 28], [94, 24], [98, 30], [102, 25], [107, 27]], 'green');
    p.poly([[16, 50], [60, 50], [64, 56], [12, 56]], 'darkGrey', ['grey', P.rows]); // a bench
    p.rect(14, 56, 3, 18, 'darkGrey');
    p.rect(58, 56, 3, 16, 'darkGrey');
    p.poly([[30, 49], [34, 49], [37, 42], [27, 42]], 'green', ['white', P.sparse]);
    p.rect(30, 38, 4, 4, 'lightGrey');
    p.disc(46, 46, 3, 'red');
    p.rect(45, 40, 2, 4, 'lightGrey');
  },
  // 7 Merry-Go-Round, riding a wooden horse: the world blurs past
  7: (p) => {
    p.rect(0, 0, 160, 80, 'purple', ['navy', P.checker]);
    for (let y = 6; y < 64; y += 5) p.line(0, y, 160, y + 2, y % 10 ? 'red' : 'yellow');
    p.poly([[0, 0], [160, 0], [160, 8], [0, 8]], 'red', ['white', P.columns]);
    bulbs(p, 2, 156, 9);
    // the horse's head and mane in front of me
    p.poly([[40, 80], [56, 56], [76, 46], [96, 48], [106, 60], [96, 64], [84, 60], [70, 80]], 'white', ['lightGrey', P.sparse]);
    p.path([[56, 56], [76, 46], [96, 48], [106, 60], [96, 64]], 'black');
    p.poly([[48, 70], [58, 56], [66, 54], [56, 72]], 'darkBrown');
    p.disc(90, 52, 2, 'black');
    p.rect(64, 60, 18, 3, 'red');
  },
  // 8, 23, 24 small room
  8: (p) => {
    funRoom(p, 'sand', 'darkSand');
    p.rect(44, 30, 72, 4, 'red', ['yellow', P.checker]);
  },
  // 9 sloping hallway: everything leans
  9: (p) => {
    p.rect(0, 0, 160, 80, 'purple', ['darkRed', P.checker]);
    p.poly([[0, 0], [160, 0], [100, 30], [62, 22]], 'navy', ['black', P.checker]);
    p.poly([[0, 80], [160, 80], [100, 46], [62, 40]], 'brown', ['darkBrown', P.rows]);
    p.poly([[0, 0], [62, 22], [62, 40], [0, 80]], 'red', ['darkRed', P.checker]);
    p.poly([[160, 0], [100, 30], [100, 46], [160, 80]], 'darkRed', ['purple', P.checker]);
    p.poly([[62, 22], [100, 30], [100, 46], [62, 40]], 'black');
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      p.line(t * 62, t * 22, 160 - t * 60, t * 30, 'yellow');
    }
    stripes(p, 4, 30, 30, 4, 'yellow', 'red');
  },
  // 10 room with a low ceiling
  10: (p) => {
    funRoom(p, 'darkSand', 'brown', [20, 30, 140, 58]);
    p.poly([[0, 0], [160, 0], [140, 30], [20, 30]], 'darkBrown', ['black', P.rows]);
    for (let x = 30; x < 140; x += 16) p.line(x, 30, x - (80 - x) * 0.4, 0, 'black');
  },
  // 11 large rolling barrel room
  11: (p) => {
    tunnel(p, 'brown', 'darkBrown', 6);
    for (let a = 0; a < 16; a++) {
      const t = (a * Math.PI) / 8 + 0.2;
      p.line(80 + Math.cos(t) * 14, 40 + Math.sin(t) * 9, 80 + Math.cos(t) * 90, 40 + Math.sin(t) * 50, 'darkBrown');
    }
    for (let a = 0; a < 16; a++) {
      const t = (a * Math.PI) / 8 + 0.2;
      p.line(80 + Math.cos(t) * 14, 40 + Math.sin(t) * 9, 80 + Math.cos(t) * 90, 40 + Math.sin(t) * 50, 'black');
    }
    for (const r of [30, 58]) {
      p.disc(80, 40, r, 'gold', undefined, r * 0.55);
      p.disc(80, 40, r - 2, 'brown', ['darkBrown', P.speck], r * 0.55 - 1.5);
    }
    for (let a = 0; a < 16; a++) {
      const t = (a * Math.PI) / 8 + 0.2;
      p.line(80 + Math.cos(t) * 14, 40 + Math.sin(t) * 9, 80 + Math.cos(t) * 56, 40 + Math.sin(t) * 31, 'black');
    }
    p.disc(80, 40, 12, 'black', undefined, 7);
  },
  // 12 store room
  12: (p) => {
    funRoom(p, 'darkSand', 'brown');
    for (const y of [24, 36, 48]) {
      p.rect(46, y, 68, 2, 'darkBrown');
      for (let x = 48; x < 112; x += 9) p.rect(x, y - 6, 6, 6, (x + y) % 3 ? 'sand' : 'lightSand', ['darkSand', P.rows]);
    }
    p.rect(16, 52, 18, 14, 'brown', ['darkBrown', P.rows]); // crate
    p.path([[16, 52], [34, 66]], 'darkBrown');
    p.path([[34, 52], [16, 66]], 'darkBrown');
  },
  // 13 Manhole: down a shaft, the night sky through the hole above
  13: (p) => {
    p.rect(0, 0, 160, 80, 'darkGrey', ['black', P.grain]);
    p.disc(80, 14, 30, 'grey', ['darkGrey', P.checker], 12);
    p.disc(80, 14, 24, 'navy', ['black', P.checker], 9);
    p.dot(70, 10, 'white');
    p.dot(90, 14, 'white');
    p.dot(80, 7, 'white');
    for (let y = 30; y < 80; y += 7) {
      p.rect(64, y, 32, 2, 'grey');
      p.dot(64, y + 2, 'darkGrey');
      p.dot(95, y + 2, 'darkGrey');
    }
    p.poly([[0, 0], [30, 0], [44, 80], [0, 80]], 'darkGrey', ['grey', P.speck]);
    p.poly([[160, 0], [130, 0], [116, 80], [160, 80]], 'black', ['darkGrey', P.speck]);
    p.rect(130, 56, 30, 24, 'black'); // the way into the sewer
  },
  // 14 shooting gallery: ducks on a rail, a counter
  14: (p) => {
    funRoom(p, 'navy', 'black', [24, 10, 136, 50]);
    p.rect(24, 10, 112, 40, 'sky', ['navy', P.checker]);
    p.rect(24, 10, 112, 4, 'red', ['white', P.columns]);
    for (const [y, dir] of [[24, 1], [38, -1]] as const) {
      p.rect(24, y + 6, 112, 2, 'gold');
      for (let x = 30; x < 132; x += 16) {
        p.disc(x + 4, y + 2, 5, 'yellow', undefined, 3);
        p.disc(x + 4 + dir * 4, y - 2, 2, 'yellow');
        p.dot(x + 4 + dir * 4, y - 3, 'black');
        p.dot(x + 4 + dir * 6, y - 2, 'orange');
      }
    }
    p.poly([[0, 58], [160, 58], [160, 66], [0, 66]], 'red', ['white', P.columns]);
    p.rect(0, 56, 160, 3, 'gold');
  },
  // 15 ledge over a deep pit
  15: (p) => {
    p.rect(0, 0, 160, 80, 'black', ['darkGrey', P.speck]);
    p.poly([[0, 0], [36, 0], [44, 80], [0, 80]], 'darkGrey', ['grey', P.grain]);
    p.poly([[160, 0], [124, 0], [118, 80], [160, 80]], 'darkGrey', ['black', P.grain]);
    p.disc(80, 70, 30, 'black', undefined, 10);
    p.poly([[0, 46], [110, 46], [104, 54], [0, 56]], 'brown', ['darkBrown', P.rows]);
    p.path([[0, 46], [110, 46]], 'sand');
    doorway(p, 4, 46, 14, 24);
  },
  // 16 Pit: the bottom, with a big warm pipe
  16: (p) => {
    p.rect(0, 0, 160, 80, 'darkGrey', ['black', P.grain]);
    p.disc(80, 0, 40, 'black', undefined, 10);
    p.poly([[0, 64], [160, 64], [160, 80], [0, 80]], 'darkSand', ['darkStone', P.grain]);
    p.rect(0, 26, 160, 10, 'orange', ['darkRed', P.rows]); // the pipe
    p.line(0, 26, 160, 26, 'yellow');
    p.line(0, 35, 160, 35, 'darkRed');
    for (const x of [30, 130]) p.rect(x, 24, 4, 14, 'darkRed');
    for (const [x, y] of [[50, 20], [56, 16], [110, 20], [116, 15]] as const) p.path([[x, y], [x + 2, y - 3], [x, y - 6]], 'lightGrey');
  },
  // 17 Observation chamber
  17: (p) => {
    funRoom(p, 'darkGrey', 'black');
    p.rect(44, 16, 72, 38, 'darkGrey', ['grey', P.speck]);
    p.rect(20, 52, 10, 20, 'darkGrey');
    p.rect(16, 48, 18, 5, 'grey'); // a stool
  },
  // 18 on a Merry-Go-Round
  18: (p) => {
    p.rect(0, 0, 160, 80, 'navy', ['purple', P.checker]);
    carousel(p, 4);
  },
  // 19 Windy hall
  19: (p) => {
    funRoom(p, 'lightSky', 'sky', [56, 22, 104, 48]);
    for (let i = 0; i < 6; i++) p.disc(24 + i * 22, 74, 3, 'darkGrey', undefined, 1); // vents in the floor
    gusts(p, [[20, 40], [60, 54], [100, 62], [120, 34], [36, 20]]);
  },
  // 20 rickety staircase
  20: (p) => {
    p.rect(0, 0, 160, 80, 'darkBrown', ['black', P.checker]);
    for (let i = 0; i < 9; i++) {
      const y = 76 - i * 8;
      const x = 30 + i * 9;
      p.rect(x, y, 40, 3, 'sand', ['lightSand', P.sparse]);
      p.rect(x, y + 3, 40, 5, 'brown', ['darkBrown', P.checker]);
      if (i % 3 === 1) p.line(x + 10, y, x + 18, y + 2, 'black'); // a cracked tread
    }
    p.path([[24, 70], [96, 2]], 'brown');
    for (let x = 30; x < 96; x += 10) p.line(x, 70 - (x - 24) * 0.94, x, 76 - (x - 24) * 0.94 + 6, 'brown');
    p.line(30, 80, 102, 8, 'sand');
  },
  // 21 large room with a tall ceiling
  21: (p) => {
    funRoom(p, 'purple', 'darkRed', [36, 6, 124, 50]);
    for (let x = 40; x < 122; x += 12) p.line(x, 6, x, 50, 'darkRed');
    stripes(p, 36, 6, 88, 4, 'red', 'yellow');
  },
  // 22 on top of the ride: the canopy, the catwalk overhead
  22: (p) => {
    p.rect(0, 0, 160, 80, 'darkBrown', ['black', P.checker]);
    p.rect(0, 6, 160, 4, 'darkGrey', ['grey', P.columns]); // the catwalk
    for (let x = 4; x < 160; x += 14) p.line(x, 0, x, 6, 'grey');
    p.poly([[0, 80], [80, 30], [160, 80]], 'red');
    for (let i = 0; i < 12; i++) p.line(80, 30, i * 14 + 2, 80, i % 2 ? 'white' : 'red');
    for (let i = 0; i < 12; i += 2) p.poly([[80, 30], [i * 14 + 2, 80], [i * 14 + 16, 80]], 'white', ['lightGrey', P.sparse]);
    p.disc(80, 28, 5, 'gold');
    p.rect(79, 18, 2, 8, 'gold');
  },
  // 25 large room
  25: (p) => {
    funRoom(p, 'lightStone', 'stone', [30, 14, 130, 52]);
    p.rect(30, 14, 100, 4, 'darkRed');
  },
  // 26 Parking lot: the Fun House glowing beyond
  26: (p) => {
    night(p, 40);
    p.rect(0, 40, 160, 40, 'darkGrey', ['black', P.speck]);
    for (let x = 6; x < 160; x += 22) p.line(x, 80, x + 10, 42, 'lightGrey');
    // the Fun House far off, lit up
    p.rect(14, 22, 60, 18, 'purple', ['darkRed', P.checker]);
    stripes(p, 14, 20, 60, 3, 'red', 'yellow');
    bulbs(p, 14, 72, 24, 3);
    p.disc(44, 34, 6, 'white', undefined, 5);
    p.rect(42, 34, 4, 6, 'black');
    // a parked car
    p.poly([[96, 68], [100, 58], [126, 56], [134, 60], [148, 62], [150, 70]], 'red', ['darkRed', P.rows]);
    p.poly([[104, 59], [122, 57], [126, 61], [104, 62]], 'paleSky');
    p.disc(106, 70, 4, 'black');
    p.disc(140, 70, 4, 'black');
  },
  // 27 on a Trampoline: up in the air
  27: (p) => {
    funRoom(p, 'sand', 'darkSand');
    p.rect(44, 30, 72, 4, 'red', ['yellow', P.checker]);
    p.disc(80, 74, 50, 'black', ['darkGrey', P.checker], 6);
    p.disc(80, 74, 46, 'sky', ['navy', P.checker], 4);
    for (const x of [40, 60, 100, 120]) p.path([[x - 4, 64], [x - 8, 56], [x - 4, 48]], 'white'); // whoosh
  },
  // 28 Sewer system
  28: (p) => {
    tunnel(p, 'darkGrey', 'black', 5);
    p.poly([[0, 80], [64, 46], [96, 46], [160, 80]], 'darkGreen', ['green', P.rows]);
    p.recolour(0, 46, 160, 34, 'darkGreen', 'water', P.speck);
    p.poly([[0, 80], [0, 66], [60, 46], [64, 46]], 'darkGrey', ['grey', P.grain]); // a walkway
  },
  // 29–32 windy maze
  29: (p) => {
    p.rect(0, 0, 160, 80, 'darkBrown', ['black', P.checker]);
    p.poly([[0, 80], [160, 80], [100, 50], [60, 50]], 'brown', ['darkBrown', P.rows]);
    p.poly([[0, 0], [60, 20], [60, 50], [0, 80]], 'red', ['purple', P.checker]);
    p.poly([[160, 0], [100, 20], [100, 50], [160, 80]], 'yellow', ['orange', P.checker]);
    p.poly([[60, 20], [84, 20], [84, 50], [60, 50]], 'lightSky', ['sky', P.checker]);
    p.rect(84, 20, 16, 30, 'black');
    p.poly([[30, 10], [44, 15], [44, 58], [30, 64]], 'black'); // a turning on the left
    gusts(p, [[66, 60], [10, 44], [110, 30], [118, 64]]);
  },
  // 33 catwalk, high over the ride
  33: (p) => {
    p.rect(0, 0, 160, 80, 'black', ['darkBrown', P.speck]);
    p.disc(80, 92, 70, 'red', ['white', P.columns], 30); // the canopy far below
    p.poly([[0, 52], [160, 40], [160, 48], [0, 62]], 'darkGrey', ['grey', P.columns]);
    for (let x = 0; x <= 160; x += 16) p.line(x, 52 - x * 0.075 - 18, x, 52 - x * 0.075, 'grey');
    p.line(0, 34, 160, 22, 'grey');
    p.line(0, 52, 160, 40, 'lightGrey');
    doorway(p, 136, 42, 18, 30, 'darkGrey');
  },
  // 34 long tunnel
  34: (p) => {
    tunnel(p, 'stone', 'darkStone', 9);
    torch(p, 26, 34);
  },
  // 35 Lot of TROUBLE!: a clown's grinning face
  35: (p) => {
    p.rect(0, 0, 160, 80, 'darkRed', ['black', P.checker]);
    p.disc(80, 42, 30, 'white', ['lightGrey', P.sparse], 30);
    p.disc(50, 22, 12, 'orange', ['red', P.checker], 12); // hair
    p.disc(110, 22, 12, 'orange', ['red', P.checker], 12);
    for (const x of [68, 92]) {
      p.line(x - 5, 29, x + 5, 39, 'black');
      p.line(x + 5, 29, x - 5, 39, 'black');
      p.line(x - 4, 29, x + 6, 39, 'black');
      p.line(x + 6, 29, x - 4, 39, 'black');
    }
    p.disc(80, 46, 5, 'red');
    p.poly([[60, 54], [100, 54], [92, 64], [68, 64]], 'red');
    p.poly([[64, 55], [96, 55], [90, 61], [70, 61]], 'black');
    p.poly([[70, 2], [80, -16], [90, 2]], 'yellow');
  },
};

// ---------------------------------------------------------------- things

const things: Record<number, (p: Painter) => void> = {
  // 0 closed drain, the tank full of water
  0: (p) => {
    p.rect(0, 6, 160, 66, 'water', ['lightWater', P.rows]);
    p.recolour(0, 6, 160, 66, 'water', 'navy', P.speck);
    p.rect(32, 20, 96, 30, 'lightWater', ['paleSky', P.diagonal]);
    for (const [x, y] of [[20, 50], [24, 40], [140, 30], [136, 22]] as const) p.disc(x, y, 1, 'paleSky');
    p.disc(80, 76, 8, 'darkGrey', undefined, 2);
  },
  // 38 open drain
  38: (p) => p.disc(80, 76, 8, 'black', ['darkGrey', P.checker], 2),
  // 5 slippery slide, 52 bottom of slide
  5: (p) => {
    p.poly([[72, 58], [94, 58], [76, 80], [44, 80]], 'yellow', ['orange', P.rows]);
    p.path([[72, 58], [44, 80]], 'red');
    p.path([[94, 58], [76, 80]], 'red');
    p.rect(124, 26, 12, 8, 'white');
    p.line(126, 29, 133, 29, 'red');
  },
  52: (p) => {
    p.poly([[0, 20], [20, 20], [40, 64], [20, 68]], 'yellow', ['orange', P.rows]);
    p.path([[0, 20], [20, 68]], 'red');
  },
  // 7 skeleton, 44 pile of bones
  7: (p) => {
    p.disc(124, 40, 4, 'white');
    p.dot(123, 40, 'black');
    p.dot(125, 40, 'black');
    p.line(124, 44, 124, 58, 'white');
    for (let y = 46; y < 54; y += 2) p.line(120, y, 128, y, 'white');
    p.path([[124, 46], [116, 52], [114, 60]], 'white');
    p.path([[124, 46], [132, 52], [134, 60]], 'white');
    p.path([[124, 58], [120, 70]], 'white');
    p.path([[124, 58], [128, 70]], 'white');
  },
  44: (p) => {
    p.poly([[110, 72], [118, 66], [130, 66], [138, 72]], 'white', ['lightGrey', P.checker]);
    p.disc(124, 64, 3, 'white');
  },
  // 12 strange knobs on the wall: yellow, green, blue
  12: (p) => {
    p.rect(60, 38, 40, 10, 'darkGrey');
    p.disc(68, 43, 3, 'yellow');
    p.disc(80, 43, 3, 'green');
    p.disc(92, 43, 3, 'sky');
  },
  // 11 red knob in the wall
  11: (p) => {
    p.disc(132, 34, 3, 'red');
    p.dot(131, 33, 'white');
  },
  // 14 ladder going down
  14: (p) => {
    p.rect(90, 40, 2, 40, 'lightGrey');
    p.rect(100, 40, 2, 40, 'lightGrey');
    for (let y = 44; y < 80; y += 5) p.line(90, y, 101, y, 'lightGrey');
  },
  // 18 small trampoline, 27 mermaid
  18: (p) => {
    p.disc(80, 66, 30, 'darkGrey', undefined, 6);
    p.disc(80, 65, 26, 'black', ['navy', P.checker], 4);
    for (const x of [56, 104]) p.rect(x, 68, 2, 8, 'darkGrey');
  },
  27: (p) => {
    p.poly([[56, 40], [66, 32], [76, 34], [92, 42], [100, 36], [104, 46], [92, 46], [76, 42], [62, 44]], 'green', ['darkGreen', P.checker]);
    p.disc(52, 34, 5, 'lightSand');
    p.disc(48, 30, 6, 'orange', ['red', P.checker], 4); // snarled hair
    p.poly([[54, 36], [64, 34], [62, 42], [54, 42]], 'lightSand');
    p.dot(53, 34, 'black');
  },
  // 22 ticket counter, 21 sign
  22: (p) => {
    p.rect(110, 46, 34, 22, 'red', ['white', P.columns]);
    p.rect(108, 30, 38, 16, 'black');
    p.rect(112, 32, 30, 12, 'lightSky', ['paleSky', P.checker]);
    p.disc(127, 38, 3, 'lightSand'); // the ticket lady
    p.disc(127, 35, 3, 'orange', undefined, 2);
    p.rect(106, 28, 42, 3, 'gold');
  },
  21: (p) => {
    p.rect(20, 58, 2, 18, 'brown');
    p.rect(10, 50, 24, 10, 'white');
    for (let x = 12; x < 32; x += 3) p.dot(x, 53, 'black');
    for (let x = 12; x < 30; x += 3) p.dot(x, 56, 'black');
  },
  // 31 LOUD steam calliope, 29 quiet calliope
  31: (p) => {
    p.rect(16, 40, 34, 30, 'red', ['gold', P.sparse]);
    p.path([[16, 40], [50, 40], [50, 70], [16, 70], [16, 40]], 'gold');
    for (let i = 0; i < 6; i++) p.rect(18 + i * 5, 22 + (i % 3) * 4, 3, 18 - (i % 3) * 4, 'gold');
    for (const [x, y] of [[20, 16], [30, 12], [42, 18]] as const) p.disc(x, y, 3, 'white', ['lightGrey', P.checker]);
    for (const [x, y] of [[54, 30], [56, 42]] as const) p.path([[x, y], [x + 4, y - 2], [x + 6, y + 1]], 'yellow'); // noise
  },
  29: (p) => {
    p.rect(16, 40, 34, 30, 'red', ['gold', P.sparse]);
    p.path([[16, 40], [50, 40], [50, 70], [16, 70], [16, 40]], 'gold');
    for (let i = 0; i < 6; i++) p.rect(18 + i * 5, 22 + (i % 3) * 4, 3, 18 - (i % 3) * 4, 'gold');
  },
  // 32 merry-go-round (seen across the big room)
  32: (p) => {
    p.poly([[64, 36], [104, 26], [144, 36]], 'red', ['white', P.columns]);
    p.rect(64, 36, 80, 3, 'gold');
    bulbs(p, 66, 142, 37, 5);
    p.rect(102, 39, 4, 24, 'darkRed');
    p.disc(104, 66, 42, 'brown', ['darkBrown', P.rows], 4);
    horse(p, 74, 54, 'white', 'red');
    horse(p, 116, 54, 'lightSand', 'purple');
  },
  // 41 wooden horse (the one to ride, on the merry-go-round)
  41: (p) => {
    p.disc(80, 70, 12, 'black', undefined, 2);
    horse(p, 70, 62, 'gold', 'red');
  },
  // 48 fortune telling machine
  48: (p) => {
    p.rect(104, 30, 26, 42, 'purple', ['darkRed', P.checker]);
    p.path([[104, 30], [130, 30], [130, 72], [104, 72], [104, 30]], 'gold');
    p.rect(108, 34, 18, 16, 'black');
    p.disc(117, 42, 4, 'lightSand'); // the fortune teller
    p.disc(117, 38, 5, 'red', undefined, 2);
    p.disc(117, 49, 4, 'lightSky', ['white', P.checker], 2); // crystal ball
    p.rect(114, 56, 6, 2, 'gold'); // coin slot
  },
  // 49 rope hanging down, 1 rope hanging from ceiling
  49: (p) => {
    for (let y = 46; y < 80; y++) p.dot(60 + (y % 4 < 2 ? 0 : 1), y, y % 3 ? 'sand' : 'darkSand');
  },
  1: (p) => {
    for (let y = 0; y < 66; y++) p.dot(130 + (y % 4 < 2 ? 0 : 1), y, y % 3 ? 'sand' : 'darkSand');
  },
  // 53 dead tree, 55 broken branch
  53: (p) => {
    p.rect(82, 30, 5, 34, 'brown');
    p.path([[84, 36], [72, 22], [68, 24]], 'brown');
    p.path([[85, 32], [96, 18], [102, 16]], 'brown');
    p.path([[96, 18], [94, 10]], 'brown');
    p.path([[84, 44], [94, 40]], 'brown');
  },
  55: (p) => {
    p.rect(82, 30, 5, 34, 'brown');
    p.path([[85, 32], [96, 18], [102, 16]], 'brown');
  },
  // 51 rusty closed grating, 45 loose grate, 60 broken grate, 26 dark manhole
  51: (p) => {
    p.disc(70, 70, 14, 'darkRed', ['brown', P.checker], 4);
    for (let x = 60; x <= 80; x += 4) p.line(x, 67, x, 73, 'black');
  },
  45: (p) => {
    p.disc(70, 70, 14, 'black', undefined, 4);
    p.poly([[76, 66], [92, 64], [92, 70], [76, 72]], 'darkRed', ['brown', P.checker]);
  },
  60: (p) => {
    p.disc(70, 70, 14, 'black', undefined, 4);
    p.path([[62, 72], [70, 68], [74, 74]], 'darkRed');
  },
  26: (p) => p.disc(70, 70, 14, 'black', undefined, 4),
  // 63 window, gun mounted and pointing in
  63: (p) => {
    p.rect(132, 18, 24, 18, 'paleSky', ['white', P.sparse]);
    p.path([[132, 18], [156, 18], [156, 36], [132, 36], [132, 18]], 'darkBrown');
    p.rect(124, 26, 22, 3, 'darkGrey');
    p.rect(142, 26, 8, 6, 'brown');
  },
  // 65 clay pigeons
  65: (p) => {
    for (const [x, y] of [[54, 60], [66, 62], [78, 60], [90, 63], [102, 60]] as const) {
      p.disc(x, y, 4, 'orange', undefined, 2);
      p.line(x - 3, y, x + 3, y, 'darkRed');
    }
  },
  // 10 open flood door, 13 closed flood door
  10: (p) => p.rect(118, 30, 18, 30, 'black', ['darkGrey', P.sparse]),
  13: (p) => steelDoor(p, 118, 60, 18, 30),
  // 43 large grate welded over hole, 42 dark hole
  42: (p) => p.disc(34, 30, 12, 'black', undefined, 9),
  43: (p) => {
    p.disc(34, 30, 12, 'black', undefined, 9);
    for (let x = 24; x <= 44; x += 4) p.line(x, 22, x, 38, 'grey');
    for (let y = 24; y <= 36; y += 4) p.line(23, y, 45, y, 'grey');
  },
  // 33 valve on a large warm pipe, 34 handle on the valve, 35 handle with no valve
  33: (p) => {
    p.rect(78, 14, 4, 12, 'darkRed');
    p.disc(80, 14, 5, 'gold', undefined, 2);
  },
  34: (p) => {
    p.rect(78, 14, 4, 12, 'darkRed');
    p.disc(80, 12, 9, 'red', undefined, 3);
    p.disc(80, 12, 5, 'darkRed', undefined, 1);
  },
  35: (p) => {
    p.disc(124, 72, 7, 'red', undefined, 2);
    p.disc(124, 72, 3, 'darkRed', undefined, 1);
  },
  // 71 one-way mirror: the mirror room seen through it
  71: (p) => {
    p.rect(50, 20, 60, 30, 'paleSky', ['lightSky', P.diagonal]);
    p.path([[50, 20], [110, 20], [110, 50], [50, 50], [50, 20]], 'gold');
    for (const x of [60, 80, 100]) p.rect(x - 3, 26, 6, 18, 'purple', ['white', P.sparse]);
  },
  // 2 strange mirror (the middle one shimmers)
  2: (p) => {
    p.rect(71, 20, 18, 31, 'lightSky', ['paleSky', P.checker]);
    p.disc(80, 34, 5, 'white', ['yellow', P.checker], 8);
  },
  // 16 open door with small shelves beyond, 70 open door in glass
  16: (p) => {
    p.rect(64, 26, 32, 28, 'black');
    for (const y of [32, 40, 48]) p.rect(66, y, 28, 1, 'brown');
  },
  70: (p) => {
    p.rect(40, 20, 80, 30, 'darkGrey');
    p.rect(72, 22, 16, 28, 'black');
  },
  // locked doors: 6 (laboratory), 8 (store room), 15 (pit), 20 (catwalk), 72 (observation chamber)
  6: (p) => steelDoor(p, 66, 54, 28, 34),
  8: (p) => steelDoor(p, 14, 70, 16, 40),
  15: (p) => steelDoor(p, 66, 64, 28, 30),
  20: (p) => steelDoor(p, 136, 42, 18, 30),
  72: (p) => steelDoor(p, 128, 64, 16, 32),
  // 61 pole coming out of the horse's back
  61: (p) => {
    p.rect(98, 0, 4, 54, 'gold', ['yellow', P.columns]);
    p.line(98, 0, 98, 53, 'darkSand');
  },
  // 62 window in the tank (already part of the tank; a glint)
  62: (p) => {
    p.line(48, 22, 58, 32, 'white');
    p.line(52, 22, 60, 30, 'paleSky');
  },
  // 19 wrench
  19: (p) => {
    p.rect(110, 70, 16, 3, 'grey');
    p.poly([[124, 68], [130, 68], [130, 75], [124, 75]], 'grey');
    p.rect(126, 70, 4, 3, 'brown');
  },
};

const pictures: Record<number, (p: Painter) => void> = { ...rooms };
for (const [item, draw] of Object.entries(things)) pictures[100 + Number(item)] = draw;

const roomMap: Record<number, number> = Object.fromEntries(Object.keys(rooms).map((r) => [r, Number(r)]));
for (const r of [23, 24]) roomMap[r] = SMALL_ROOM;
for (const r of [30, 31, 32]) roomMap[r] = MAZE;

export const MYSTERY_FUN_HOUSE: SceneSet = { pictures, rooms: roomMap };

/** Item number → picture number, for the things drawn over rooms. */
export const MYSTERY_FUN_HOUSE_ITEMS: ReadonlyMap<number, number> = new Map(Object.keys(things).map((i) => [Number(i), 100 + Number(i)]));
