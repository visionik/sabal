import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDatabase, PictureLibrary } from '../dist/index.js';
import { Painter, SCENE_PALETTE, PATTERNS } from '../dist/pictures/scenes.js';

const pyramid = loadDatabase(readFileSync(new URL('../corpus/adv08.dat', import.meta.url), 'utf8'));
const start = pyramid.items.map((i) => i.initialLocation);

test('Pyramid of Doom has SABAL\'s own pictures, with no files at all', () => {
  const library = new PictureLibrary([]);
  assert.ok(library.list().some((g) => g.game === 'adv08' && g.platform === 'SABAL' && g.file === 'built in'));
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

const corpus = (name) => loadDatabase(readFileSync(new URL(`../corpus/${name}.dat`, import.meta.url), 'utf8'));

test('every game that never had pictures has SABAL\'s own, for every room it can show', () => {
  const library = new PictureLibrary([]);
  assert.deepEqual(library.list().map((g) => g.game).sort(), ['adv07', 'adv08', 'adv09', 'adv12', 'sampler1']);
  for (const [name, minimum] of [['adv07', 35], ['adv09', 38], ['adv12', 34], ['sampler1', 17]]) {
    const db = corpus(name);
    const game = library.forGame(db);
    assert.ok(game, name);
    const locations = db.items.map((i) => i.initialLocation);
    let drawn = 0;
    for (let room = 1; room < db.rooms.length; room++) {
      const picture = game.forState({ room, dark: false, itemLocations: locations });
      if (!picture) continue;
      drawn++;
      assert.ok(picture.image.pixels.every((c) => c < SCENE_PALETTE.length), `${name} room ${room}`);
      assert.ok(new Set(picture.image.pixels).size >= 3, `${name} room ${room} is more than a fill`);
    }
    assert.ok(drawn >= minimum, `${name}: ${drawn} rooms`);
  }
});

test('games with a real release, and games we have no pictures for, are not given SABAL\'s', () => {
  const library = new PictureLibrary([]);
  assert.equal(library.forGame(corpus('adv01')), undefined, 'Adventureland needs its own files');
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
