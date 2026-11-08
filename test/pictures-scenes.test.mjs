import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDatabase, PictureLibrary } from '../dist/index.js';
import { Painter, SCENE_PALETTE, PATTERNS } from '../dist/pictures/scenes.js';

const pyramid = loadDatabase(readFileSync(new URL('../corpus/adv08.dat', import.meta.url), 'utf8'));
const start = pyramid.items.map((i) => i.initialLocation);

test('Pyramid of Doom has SABAL\'s own pictures, with no files at all', () => {
  const library = new PictureLibrary([]);
  assert.deepEqual(library.list(), [{ game: 'adv08', platform: 'SABAL', file: 'built in' }]);
  const game = library.forGame(pyramid);
  for (let room = 1; room < pyramid.rooms.length; room++) {
    const picture = game.forState({ room, dark: false, itemLocations: start });
    assert.ok(picture, `room ${room}`);
    assert.equal(picture.image.width, 160);
    assert.equal(picture.image.height, 80);
    assert.ok(picture.image.pixels.every((c) => c < SCENE_PALETTE.length));
    assert.ok(new Set(picture.image.pixels).size >= 3, `room ${room} is more than a fill`);
  }
  assert.equal(game.forState({ room: 8, dark: true, itemLocations: start }), undefined);
});

test('things in a room are drawn over it, and change with the game', () => {
  const game = new PictureLibrary([]).forGame(pyramid);
  const at = (room, items) => game.forState({ room, dark: false, itemLocations: Object.assign([...start], items) });
  const fearsome = at(8, {});
  assert.equal(fearsome.key, 'adv08:8+129');
  const sleeping = at(8, { 29: 0, 33: 8 });
  assert.equal(sleeping.key, 'adv08:8+133');
  assert.notDeepEqual(fearsome.image.pixels, sleeping.image.pixels);
  assert.equal(at(8, { 29: 0 }).key, 'adv08:8');
});

test('a real release wins over SABAL\'s own pictures, and games without either get none', () => {
  const ghostTown = loadDatabase(readFileSync(new URL('../corpus/adv09.dat', import.meta.url), 'utf8'));
  assert.equal(new PictureLibrary([]).forGame(ghostTown), undefined);
});

test('the painter fills shapes with textures and clips at the edges', () => {
  const p = new Painter();
  p.rect(-10, -10, 20, 20, 'white', ['black', PATTERNS.checker]);
  p.disc(159, 79, 5, 'red');
  p.line(0, 79, 159, 0, 'gold');
  const at = (x, y) => SCENE_PALETTE[p.pixels[y * 160 + x]];
  assert.deepEqual(at(0, 0), SCENE_PALETTE[0]); // checker: black at even x+y
  assert.notDeepEqual(at(1, 0), SCENE_PALETTE[0]);
  assert.deepEqual(at(159, 79), at(158, 79));
  assert.deepEqual(at(20, 20), SCENE_PALETTE[0]);
});
