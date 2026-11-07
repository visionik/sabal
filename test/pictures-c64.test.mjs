import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readD64 } from '../dist/pictures/d64.js';
import { PictureLibrary } from '../dist/index.js';
import { loadDatabase } from '../dist/index.js';

const sectorsIn = (t) => (t <= 17 ? 21 : t <= 24 ? 19 : t <= 30 ? 18 : 17);
const offset = (t, s) => { let n = 0; for (let i = 1; i < t; i++) n += sectorsIn(i); return (n + s) * 256; };

/** A made-up .d64: one-sector PRG files (load address 0x5000) listed in track 18's directory. */
function fakeD64(files) {
  const disk = new Uint8Array(174848);
  files.forEach(([name, body], i) => {
    const at = offset(1, i);
    disk[at] = 0; // last sector of the file
    disk[at + 1] = 1 + 2 + body.length; // index of its last byte
    disk.set([0x00, 0x50, ...body], at + 2);
    const entry = offset(18, 1) + i * 32;
    disk[entry + 2] = 0x82; // PRG, closed
    disk[entry + 3] = 1;
    disk[entry + 4] = i;
    disk.set([...name.padEnd(16, '\xa0')].map((c) => c.charCodeAt(0)), entry + 5);
  });
  return disk;
}

// An Atari-format picture: 2 columns wide, 2 rows high, one repeat run.
const PICTURE = [16, 0, 3, 0, 1, 1, 0x0e, 0x46, 0x84, 0x00, 0x80, 0b01101100, 0b00000011, 0, 0, 0];

test('.d64 files are read by name, without their load address', () => {
  const files = readD64(fakeD64([['R001', PICTURE], ['DATA', [...Buffer.from('chem lab')]]]));
  assert.deepEqual([...files.keys()], ['R001', 'DATA']);
  assert.deepEqual([...files.get('R001')], PICTURE);
  assert.equal(readD64(new Uint8Array(1000)), undefined);
});

test('C64 pictures are named by room, and rooms described alike share one', () => {
  const disk = fakeD64([['R002', PICTURE], ['R006', PICTURE], ['DATA', [...Buffer.from('chem lab')]]]);
  const library = new PictureLibrary([{ name: 'spider.d64', data: disk }]);
  assert.deepEqual(library.list(), [{ game: 'quest2', platform: 'Commodore 64', file: 'spider.d64' }]);
  const spider = library.forGame(loadDatabase(readFileSync(new URL('../corpus/quest2.dat', import.meta.url), 'utf8')));
  assert.equal(spider.platform, 'Commodore 64');
  const room = (r) => spider.forState({ room: r, dark: false, itemLocations: [] })?.key;
  assert.equal(room(6), 'quest2:6');
  assert.equal(room(9), 'quest2:6', 'room 9 is another elevator shaft');
  assert.equal(room(3), undefined);
  assert.equal(spider.forState({ room: 2, dark: true, itemLocations: [] }), undefined, 'no R000, no dark picture');
  const { image } = spider.forState({ room: 6, dark: false, itemLocations: [] });
  assert.equal(image.width, 280);
  assert.equal(image.scale, 3);
  assert.equal(image.palette.length, 4);
  const adventureland = loadDatabase(readFileSync(new URL('../corpus/adv01.dat', import.meta.url), 'utf8'));
  assert.equal(library.forGame(adventureland), undefined);
});

test('C64 item pictures are drawn over the room while the item is there', () => {
  const disk = fakeD64([['R006', PICTURE], ['B031', PICTURE], ['B13005I', PICTURE], ['DATA', [...Buffer.from('chem lab')]]]);
  const spider = new PictureLibrary([{ name: 'spider.d64', data: disk }]).forGame(
    loadDatabase(readFileSync(new URL('../corpus/quest2.dat', import.meta.url), 'utf8')),
  );
  const locations = Array(73).fill(0);
  assert.equal(spider.forState({ room: 6, dark: false, itemLocations: locations }).key, 'quest2:6');
  locations[31] = 6; // Doctor Octopus is here
  assert.equal(spider.forState({ room: 6, dark: false, itemLocations: locations }).key, 'quest2:6+1031');
  locations[31] = 255; // carried items aren't drawn in the room
  assert.equal(spider.forState({ room: 6, dark: false, itemLocations: locations }).key, 'quest2:6');
});
