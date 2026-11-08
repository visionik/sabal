import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { loadDatabase, NgLibrary } from '../dist/index.js';
import { composeNg, decodePng, loadNg, NG_DIR } from '../dist/node.js';
import { crc32 } from '../dist/pictures/crc32.js';

/** A PNG of colour type 2 (RGB) or 6 (RGBA) from rows of pixels. */
function png(width, height, type, pixel) {
  const channels = type === 6 ? 4 : 3;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw.set(pixel(x, y).slice(0, channels), y * (width * channels + 1) + 1 + x * channels);
  }
  const chunk = (kind, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length);
    head.write(kind, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])));
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, type, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const pyramid = loadDatabase(readFileSync(new URL('../corpus/adv08.dat', import.meta.url), 'utf8'));
const MANIFEST = {
  size: [8, 4],
  games: {
    adv08: {
      rooms: { 8: 'adv08/room-8.png' },
      items: { 29: { file: 'adv08/item-29.png', default: [0.5, 0, 0.5, 1], at: { 9: [0, 0, 0.25, 0.5] } } },
    },
  },
};

test('the core lists the layers of a next-gen picture: the room, then items where the original drew them', () => {
  const game = new NgLibrary(MANIFEST).forGame(pyramid);
  const locations = [];
  locations[29] = 8;
  const p = game.forState({ room: 8, dark: false, itemLocations: locations });
  assert.equal(p.key, 'ng:adv08:8+29');
  assert.deepEqual(p.layers, [{ file: 'adv08/room-8.png' }, { file: 'adv08/item-29.png', box: [0.5, 0, 0.5, 1] }]);
  assert.equal(game.forState({ room: 8, dark: false, itemLocations: [] }).key, 'ng:adv08:8');
  assert.equal(game.forState({ room: 2, dark: false, itemLocations: [] }), undefined, 'no picture for this room');
  assert.equal(game.forState({ room: 8, dark: true, itemLocations: [] }), undefined, 'none for the dark');
  const adventureland = loadDatabase(readFileSync(new URL('../corpus/adv01.dat', import.meta.url), 'utf8'));
  assert.equal(new NgLibrary(MANIFEST).forGame(adventureland), undefined);
});

test('sabal/node composes the room and its items into one PNG, at any scale', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sabal-ng-'));
  mkdirSync(join(dir, 'adv08'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(MANIFEST));
  const room = png(8, 4, 2, () => [0, 0, 255]); // blue
  writeFileSync(join(dir, 'adv08/room-8.png'), room);
  // A 2x2 item: red on the left, transparent on the right.
  writeFileSync(join(dir, 'adv08/item-29.png'), png(2, 2, 6, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 255, 0, 0])));
  const source = loadNg(dir);
  const game = source.library.forGame(pyramid);
  const plain = game.forState({ room: 8, dark: false, itemLocations: [] });
  assert.equal(composeNg(plain, source.read), source.read('adv08/room-8.png'), 'a room alone is passed through');
  const locations = [];
  locations[29] = 8;
  const out = decodePng(composeNg(game.forState({ room: 8, dark: false, itemLocations: locations }), source.read));
  assert.equal(out.width, 8);
  const at = (x, y) => [...out.data.subarray((y * 8 + x) * 4, (y * 8 + x) * 4 + 3)];
  // The item fits its box (the right half, 4x4) keeping its square shape, standing on the bottom.
  assert.deepEqual(at(0, 0), [0, 0, 255], 'room shows outside the box');
  assert.deepEqual(at(4, 3), [255, 0, 0], "item's opaque half");
  assert.deepEqual(at(7, 3), [0, 0, 255], "room shows through the item's transparent half");
  assert.equal(decodePng(composeNg(plain, source.read, 0.5)).width, 4);
  assert.throws(() => source.read('../secret'), /bad picture file/);
  assert.equal(loadNg(join(dir, 'missing')), undefined);
});

test('the next-gen pictures that ship with SABAL are all listed and readable', () => {
  const source = loadNg(NG_DIR);
  assert.ok(source, 'ng/manifest.json ships');
  for (const [game, g] of Object.entries(source.library.manifest.games)) {
    for (const file of [...Object.values(g.rooms), ...Object.values(g.items ?? {}).map((i) => i.file)]) {
      const image = decodePng(source.read(file));
      if (file.includes('/room-')) assert.deepEqual([image.width, image.height], source.library.manifest.size, `${game} ${file}`);
      else assert.ok(image.width > 0 && image.width <= 512 && image.height <= 512, `${game} ${file}`);
    }
  }
});

test('pictures that aren\'t on disk are downloaded on first use into the cache, and checked', async () => {
  const { createHash } = await import('node:crypto');
  const dir = mkdtempSync(join(tmpdir(), 'sabal-ng-'));
  const cache = mkdtempSync(join(tmpdir(), 'sabal-ng-cache-'));
  const room = png(8, 4, 2, () => [0, 0, 255]);
  const item = png(2, 2, 6, () => [255, 0, 0, 255]);
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const manifest = {
    ...MANIFEST,
    base: 'https://pictures.example/ng/',
    files: {
      'adv08/room-8.png': { size: room.length, sha256: sha(room) },
      'adv08/item-29.png': { size: item.length, sha256: sha(item) },
    },
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  const served = { 'https://pictures.example/ng/adv08/room-8.png': room, 'https://pictures.example/ng/adv08/item-29.png': item };
  const asked = [];
  const fetch = async (url) => {
    asked.push(url);
    const body = served[url];
    return body ? new Response(body) : new Response('', { status: 404 });
  };
  const source = loadNg({ dir, cache, fetch });
  assert.equal(source.ready('adv08'), false);
  assert.deepEqual(source.missing('adv08'), { files: ['adv08/room-8.png', 'adv08/item-29.png'], bytes: room.length + item.length });
  assert.throws(() => source.read('adv08/room-8.png'), /hasn't been downloaded/);
  const progress = [];
  assert.equal(await source.download('adv08', (done, total) => progress.push(`${done}/${total}`)), 2);
  assert.deepEqual(progress.sort(), ['1/2', '2/2']);
  assert.ok(source.ready('adv08'));
  assert.deepEqual(source.read('adv08/room-8.png'), room);
  assert.equal(await source.download('adv08'), 0, 'nothing more to fetch');
  assert.equal(asked.length, 2);
  // A later run finds them in the cache without downloading.
  assert.ok(loadNg({ dir, cache, fetch }).ready('adv08'));

  // A file that doesn't match its checksum is refused and not kept.
  const cache2 = mkdtempSync(join(tmpdir(), 'sabal-ng-cache-'));
  served['https://pictures.example/ng/adv08/item-29.png'] = room;
  await assert.rejects(loadNg({ dir, cache: cache2, fetch }).download('adv08'), /didn't match its checksum/);
  assert.equal(loadNg({ dir, cache: cache2, fetch }).missing('adv08').files.includes('adv08/item-29.png'), true);
  // Without a cache folder there's nowhere to put them.
  await assert.rejects(loadNg({ dir, fetch }).download('adv08'), /no cache folder/);
});
