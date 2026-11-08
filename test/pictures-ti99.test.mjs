import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drawTi, tiPictureAddress } from '../dist/pictures/ti99.js';
import { readPictureFiles } from '../dist/node.js';

/** A made-up 8K ROM whose "drawing routine" at >79BE is a small TMS9900 program. */
function fakeRom(words, table = {}) {
  const rom = new Uint8Array(8192);
  words.forEach((w, i) => {
    rom[0x19be + 2 * i] = w >> 8;
    rom[0x19bf + 2 * i] = w & 0xff;
  });
  for (const [room, address] of Object.entries(table)) {
    rom[0x12 + 2 * room] = address >> 8;
    rom[0x13 + 2 * room] = address & 0xff;
  }
  return rom;
}

// Point the video chip at >2000 (patterns), write >FF eight times in a loop (DEC/JNE),
// then at >0000 (colours) write >F1: white on black. Return with B *R11.
const PROGRAM = [
  0x0200, 0x0000, 0xd800, 0x8c02, // LI R0,>0000 ; MOVB R0,@>8C02
  0x0200, 0x6000, 0xd800, 0x8c02, // LI R0,>6000 ; MOVB R0,@>8C02   (write to >2000)
  0x0202, 0x0008, //                  LI R2,8
  0x0200, 0xff00, //                  LI R0,>FF00
  0xd800, 0x8c00, //                  loop: MOVB R0,@>8C00
  0x0602, //                          DEC R2
  0x16fc, //                          JNE loop
  0x0200, 0x0000, 0xd800, 0x8c02, // LI R0,>0000 ; MOVB R0,@>8C02
  0x0200, 0x4000, 0xd800, 0x8c02, // LI R0,>4000 ; MOVB R0,@>8C02   (write to >0000)
  0x0200, 0xf100, 0xd800, 0x8c00, // LI R0,>F100 ; MOVB R0,@>8C00
  0x045b, //                          B *R11
];

test("the cartridge's drawing code runs on the emulator and the picture is read back from video memory", () => {
  const rom = fakeRom(PROGRAM, { 3: 0x8000 });
  assert.equal(tiPictureAddress(rom, 3), 0x8000);
  assert.equal(tiPictureAddress(rom, 4), 0);
  const bmp = drawTi(rom, new Uint8Array(40960), 0x8000);
  assert.equal(bmp.width, 256);
  assert.equal(bmp.height, 96);
  assert.deepEqual([...bmp.pixels.subarray(0, 8)], Array(8).fill(15), 'row 0 of cell 0: white');
  assert.equal(bmp.pixels[8], 0, 'cell 1 untouched');
  assert.equal(bmp.pixels[256], 0, 'row 1 has no colour set: transparent');
});

test('a routine that runs away is stopped, not hung', () => {
  const rom = fakeRom([0x10ff]); // JMP to itself
  assert.equal(drawTi(rom, new Uint8Array(40960), 0x8000), undefined);
});

test('sabal/node opens .rpk cartridge packs (zip) into their ROM files', () => {
  // A zip with one stored member.
  const name = Buffer.from('phm0000c.bin');
  const body = Buffer.from([1, 2, 3, 4]);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(body.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(body.length, 24);
  central.writeUInt16LE(name.length, 28);
  const cdOffset = local.length + name.length + body.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(cdOffset, 16);
  const zip = Buffer.concat([local, name, body, central, name, end]);
  const dir = mkdtempSync(join(tmpdir(), 'sabal-rpk-'));
  writeFileSync(join(dir, 'cart.rpk'), zip);
  const files = readPictureFiles(dir);
  assert.deepEqual(files.map((f) => f.name), ['cart.rpk/phm0000c.bin']);
  assert.deepEqual([...files[0].data], [1, 2, 3, 4]);
});
