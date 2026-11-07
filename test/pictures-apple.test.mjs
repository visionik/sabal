import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readDos33, parseApple, drawApple, APPLE_PALETTE } from '../dist/pictures/apple.js';
import { PictureLibrary, loadDatabase } from '../dist/index.js';

/** A made-up DOS 3.3 disk: binary files, each in one data sector, catalogued at track 17. */
function fakeDisk(files) {
  const disk = new Uint8Array(143360);
  const sector = (t, s) => (t * 16 + s) * 256;
  disk[sector(17, 0) + 1] = 17; // catalog at T17 S15
  disk[sector(17, 0) + 2] = 15;
  disk[sector(17, 0) + 3] = 3; // DOS 3.3
  files.forEach(([name, body], i) => {
    const list = sector(18, i); // track/sector list
    const data = sector(19, i);
    disk.set([19, i], list + 0x0c);
    disk.set([0x00, 0x70, body.length & 0xff, body.length >> 8, ...body], data);
    const entry = sector(17, 15) + 0x0b + i * 35;
    disk.set([18, i, 0x04, ...[...name.padEnd(30)].map((c) => c.charCodeAt(0) | 0x80)], entry);
  });
  return disk;
}

// Black line around a box (HCOLOR 4), then fill it with colour 80 (solid black patterns 0/0).
const BOX = [0x24, 0x80, 10, 10, 0xa0, 40, 10, 0xa0, 40, 30, 0xa0, 10, 30, 0xa0, 10, 10, 0x60, 80, 0xe0, 20, 20, 0x00];

test('DOS 3.3 binary files are read by name, without their address and length', () => {
  const files = readDos33(fakeDisk([['R0201', BOX], ['B02019', [0x00]]]));
  assert.deepEqual([...files.keys()], ['R0201', 'B02019']);
  assert.deepEqual([...files.get('R0201')], BOX);
  assert.equal(readDos33(new Uint8Array(143360)), undefined, 'no DOS 3.3 catalog');
});

test('instructions are 1, 2 or 3 bytes; the low opcode bit is x bit 8', () => {
  const ops = parseApple(Uint8Array.from([0x24, 0x60, 7, 0x81, 0x16, 0x20, 0x41, 0x00, 0x99]));
  assert.deepEqual(ops, [[0x24, 0, 0], [0x60, 7, 0], [0x81, 0x116, 0x20], [0x41, 0, 0]]);
});

test('the screen starts white; fills stay inside black lines', () => {
  const { bitmap } = drawApple(parseApple(Uint8Array.from(BOX)));
  const colour = (x, y) => APPLE_PALETTE[bitmap.pixels[y * 280 + x]];
  assert.deepEqual(colour(100, 100), [255, 255, 255], 'outside: white');
  assert.deepEqual(colour(25, 20), [0, 0, 0], 'inside the box: filled black');
  assert.equal(APPLE_PALETTE.length, 64);
});

test('an Apple disk is recognised by its picture files; items are drawn over the room', () => {
  const disk = fakeDisk([['R0200', BOX], ['R0201', BOX], ['B02019', [0x24, 0x80, 100, 50, 0xa0, 120, 50, 0x00]]]);
  const library = new PictureLibrary([{ name: 'pirate.dsk', data: disk }]);
  assert.deepEqual(library.list(), [{ game: 'adv02', platform: 'Apple II', file: 'pirate.dsk' }]);
  const pirate = library.forGame(loadDatabase(readFileSync(new URL('../corpus/adv02.dat', import.meta.url), 'utf8')));
  const locations = Array(70).fill(0);
  assert.equal(pirate.forState({ room: 1, dark: false, itemLocations: locations }).key, 'adv02:1');
  assert.equal(pirate.forState({ room: 1, dark: true, itemLocations: locations }).key, 'adv02:0');
  locations[19] = 1;
  const withItem = pirate.forState({ room: 1, dark: false, itemLocations: locations });
  assert.equal(withItem.key, 'adv02:1+1019');
  assert.equal(withItem.image.scale, 3);
});
