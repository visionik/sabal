import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { loadSpectrum } from '../dist/pictures/tape.js';
import { draw, plausible } from '../dist/pictures/bdp.js';
import { PictureLibrary, loadDatabase } from '../dist/index.js';
import { loadPictures, encodePng } from '../dist/node.js';
import { fakeMemory, tap, CHARSET, COUNT } from './pictures-fixture.mjs';

const layout = { charset: CHARSET, count: COUNT, version: 1 };
const mem = () => loadSpectrum('fake.tap', tap(CHARSET, fakeMemory()));
const adventureland = () => loadDatabase(readFileSync(new URL('../corpus/adv01.dat', import.meta.url), 'utf8'));
const library = () => new PictureLibrary([{ name: 'fake.tap', data: tap(CHARSET, fakeMemory()) }]);
const at = (room, placed = {}, dark = false) =>
  library().forGame(adventureland()).forState({ room, dark, itemLocations: Object.assign(Array(60).fill(0), placed) });

test('a .tap CODE block loads at its address; other files are ignored', () => {
  assert.equal(mem()[CHARSET + 8], 0xff);
  assert.equal(loadSpectrum('fake.txt', new Uint8Array(10)), undefined);
  assert.equal(loadSpectrum('fake.sna', new Uint8Array(10)), undefined);
});

test('a 48K .sna snapshot maps RAM from 0x4000', () => {
  const sna = new Uint8Array(27 + 0xc000);
  sna[27 + (CHARSET - 0x4000)] = 0x42;
  assert.equal(loadSpectrum('x.sna', sna)[CHARSET], 0x42);
});

test('block-drawn cells take their pen and paper colours, mirrored on request', () => {
  assert.ok(plausible(mem(), layout));
  assert.ok(!plausible(new Uint8Array(0x10000), layout));
  const bmp = draw(mem(), layout, 0);
  const px = (x, y) => bmp.pixels[y * 256 + x];
  assert.equal(px(0, 0), 10, 'solid cell, bright red pen');
  assert.equal(px(8, 0), 8, 'mirrored cell: its pixel moved right; black paper');
  assert.equal(px(15, 0), 14);
  assert.equal(px(16, 0), 0, 'outside the picture');
});

test('the library finds the game by its database, maps rooms, and shows nothing in the dark', () => {
  assert.deepEqual(library().list(), [{ game: 'adv01', platform: 'ZX Spectrum', file: 'fake.tap' }]);
  assert.equal(at(11).key, 'adv01:10');
  assert.equal(at(14).key, 'adv01:11', 'the maze rooms share one picture');
  assert.equal(at(33).key, 'adv01:27');
  assert.equal(at(11, {}, true), undefined);
  const pirate = loadDatabase(readFileSync(new URL('../corpus/adv02.dat', import.meta.url), 'utf8'));
  assert.equal(library().forGame(pirate), undefined);
  // The same pictures without Adventureland's room text aren't taken for it.
  const other = new PictureLibrary([{ name: 'other.tap', data: tap(CHARSET, fakeMemory().slice(0, -14)) }]);
  assert.equal(other.list().length, 0);
});

test('objects are drawn over their room, and messages bring up close-ups', () => {
  assert.equal(at(5).key, 'adv01:4');
  assert.equal(at(5, { 17: 5 }).key, 'adv01:4+29', 'the open door');
  assert.equal(at(21, { 43: 21 }).key, 'adv01:15+31', 'the bear, in any of its states');
  assert.equal(at(22, { 27: 22 }).key, 'adv01:16', 'an overlay only belongs to its own room');
  const game = library().forGame(adventureland());
  assert.equal(game.forMessage('A glowing Genie appears, drops somehting, then vanishes.').key, 'adv01:34');
  assert.equal(game.forMessage('OK'), undefined);
});

test('sabal/node reads a folder and writes indexed PNGs at any scale', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sabal-pictures-'));
  writeFileSync(join(dir, 'fake.tap'), tap(CHARSET, fakeMemory()));
  writeFileSync(join(dir, 'notes.txt'), 'not a tape');
  assert.equal(loadPictures(dir).list().length, 1);
  assert.equal(loadPictures(join(dir, 'missing')).list().length, 0);
  const { image } = at(11);
  assert.equal(image.scale, 4);
  const png = encodePng(image, 1.5);
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 256 * 6);
  assert.equal(png[25], 3, 'indexed colour');
  const idat = png.indexOf('IDAT');
  const raw = inflateSync(png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4)));
  assert.equal(raw[0], 0, 'filter byte');
});
