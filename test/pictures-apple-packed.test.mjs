import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packedPicture, drawPacked } from '../dist/pictures/apple-packed.js';
import { APPLE_PALETTE } from '../dist/pictures/apple.js';

/** A made-up packed picture disk with the given room and item pictures, one sector each from track 1. */
function fakeDisk(rooms, items = {}) {
  const disk = new Uint8Array(143360);
  for (let t = 1; t <= 6; t++) disk.fill(0x80, t * 256, t * 256 + 256); // no pictures by default
  let sector = 16;
  const place = (table, n, picture, flag = 0) => {
    disk[table * 256 + n] = sector >> 4;
    disk[(table + 1) * 256 + n] = (sector & 15) | flag;
    disk[(table + 2) * 256 + n] = 1;
    disk.set(picture, sector * 256);
    sector++;
  };
  for (const [n, p] of Object.entries(rooms)) place(1, Number(n), p);
  for (const [n, [p, flag]] of Object.entries(items)) place(4, Number(n), p, flag);
  return disk;
}

// A whole room: 40 columns × 160 rows, all one run of white pairs (0 = 256 pairs per run).
const ROOM = [0, 0, 40, 160, ...Array(12).fill([0, 0, 0xff, 0xff]).flat(), 0, 128, 0xff, 0xff];
// A 1×2 item at column 3, rows 10–11: two black bytes, stored as themselves.
const ITEM = [3, 10, 4, 12, 0x80, 0x80];

test('packed pictures: tables give where each lies; runs repeat a pair of bytes', () => {
  const disk = fakeDisk({ 0: ROOM, 1: ROOM }, { 5: [ITEM, 0], 6: [ITEM, 0x80] });
  const room = packedPicture(disk, 1, 1);
  assert.deepEqual([room.x0, room.y0, room.x1, room.y1], [0, 0, 40, 160]);
  assert.equal(room.bytes.length, 6400);
  assert.ok(room.bytes.every((b) => b === 0xff));
  assert.equal(packedPicture(disk, 1, 2), undefined, 'no picture');
  assert.deepEqual([...packedPicture(disk, 4, 5).bytes], [0x80, 0x80]);
  assert.equal(packedPicture(disk, 4, 6), undefined, 'an inventory icon, not drawn in rooms');
});

test('items are drawn over the room, column by column', () => {
  const disk = fakeDisk({ 1: ROOM }, { 5: [ITEM, 0] });
  const bmp = drawPacked([packedPicture(disk, 1, 1), packedPicture(disk, 4, 5)]);
  const colour = (x, y) => APPLE_PALETTE[bmp.pixels[y * 280 + x]];
  assert.deepEqual(colour(100, 100), [255, 255, 255]);
  assert.deepEqual(colour(3 * 7 + 3, 10), [0, 0, 0], 'the item is black');
  assert.deepEqual(colour(3 * 7 + 3, 11), [0, 0, 0]);
});
