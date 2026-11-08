#!/usr/bin/env node
// Build ng/manifest.json from the pictures in ng/<game>/.
//
// usage: node tools/ng/manifest.mjs [--pictures dir] [--out file] [--list game]
//
//   --pictures  the player's original picture files (default ~/.sabal-acp/pictures)
//   --out       where to write the manifest (default ng/manifest.json)
//   --games     only these games (comma-separated)
//   --list      print the items the original draws over rooms in one game, and
//               the rooms, then stop: those are the items that need pictures
//
// Each item goes where the original release draws it: the original room is
// drawn with and without the item, and the box around the pixels that change,
// as fractions of the picture, is where the next-gen item is placed. The
// originals come from SABAL's own pictures plus the player's files in
// original-pictures-dir (default ~/.sabal-acp/pictures).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { loadDatabase } = await import(join(root, 'dist/index.js'));
const { loadPictures } = await import(join(root, 'dist/node.js'));
const SIZE = [1024, 512];
const PAD = 0.15;
const argv = process.argv.slice(2);
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const originals = loadPictures(flag('--pictures') ?? join(homedir(), '.sabal-acp', 'pictures'));
const listing = flag('--list');
if (listing) {
  const db = loadDatabase(readFileSync(join(root, 'corpus', `${listing}.dat`), 'utf8'));
  const og = originals.forGame(db);
  console.log(og ? `${listing}: originals from ${og.platform} (${og.file})` : `${listing}: no original pictures found`);
  if (og) {
    for (let item = 0; item < db.items.length; item++) {
      const rooms = [];
      for (let room = 1; room < db.rooms.length; room++) if (placement(og, db, room, item)) rooms.push(room);
      if (rooms.length) console.log(`item ${item} "${db.items[item].text.trim()}": drawn in rooms ${rooms.length === db.rooms.length - 1 ? 'all' : rooms.join(' ')}`);
    }
  }
  process.exit(0);
}
const ng = join(root, 'ng');
const games = {};
const duplicates = [];
const only = flag('--games')?.split(',');

for (const game of readdirSync(ng).filter((d) => existsSync(join(ng, d, 'prompts.json')) && (!only || only.includes(d))).sort()) {
  const files = new Set(readdirSync(join(ng, game)));
  const db = loadDatabase(readFileSync(join(root, 'corpus', `${game}.dat`), 'utf8'));
  const og = originals.forGame(db);
  // Rooms painted the same (a maze, say) share one file, so it's downloaded once.
  const rooms = {};
  const seen = new Map();
  const roomFiles = [...files].filter((n) => /^room-\d+\.png$/.test(n)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
  for (const name of roomFiles) {
    const hash = createHash('sha256').update(readFileSync(join(ng, game, name))).digest('hex');
    if (!seen.has(hash)) seen.set(hash, `${game}/${name}`);
    else duplicates.push(`${game}/${name}`);
    rooms[name.slice(5, -4)] = seen.get(hash);
  }
  const items = {};
  for (const name of files) {
    const m = /^item-(\d+)\.png$/.exec(name);
    if (!m) continue;
    const item = Number(m[1]);
    const at = {};
    if (og) {
      for (let room = 1; room < db.rooms.length; room++) {
        const box = placement(og, db, room, item);
        if (box) at[room] = box;
      }
    }
    const counts = new Map();
    for (const box of Object.values(at)) counts.set(JSON.stringify(box), (counts.get(JSON.stringify(box)) ?? 0) + 1);
    const common = [...counts].sort((a, b) => b[1] - a[1])[0];
    const fallback = common ? JSON.parse(common[0]) : [0.35, 0.45, 0.3, 0.5];
    const differs = Object.fromEntries(Object.entries(at).filter(([, b]) => JSON.stringify(b) !== JSON.stringify(fallback)));
    items[item] = { file: `${game}/${name}`, default: fallback, ...(Object.keys(differs).length ? { at: differs } : {}) };
    if (!common) console.warn(`${game} item ${item}: the original never draws it; placed in the middle`);
  }
  if (Object.keys(rooms).length === 0) continue; // not painted yet
  games[game] = { rooms, ...(Object.keys(items).length ? { items } : {}), ...(files.has('dark.png') ? { dark: `${game}/dark.png` } : {}) };
  console.log(`${game}: ${Object.keys(rooms).length} rooms, ${Object.keys(items).length} items${og ? ` (placed from ${og.platform})` : ' (no original to place items from)'}`);
}

// Every file's size and checksum, so a host can download pictures it lacks and check them.
const files = {};
for (const g of Object.values(games)) {
  for (const file of [...Object.values(g.rooms), ...Object.values(g.items ?? {}).map((i) => i.file), ...(g.dark ? [g.dark] : [])]) {
    const data = readFileSync(join(ng, file));
    files[file] = { size: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  }
}
const base = 'https://raw.githubusercontent.com/visionik/sabal/main/ng/';
if (duplicates.length) console.log(`same picture as another room (not needed in the repo): ${duplicates.join(' ')}`);
writeFileSync(flag('--out') ?? join(ng, 'manifest.json'), JSON.stringify({ size: SIZE, base, games, files }, null, 1) + '\n');

/** Where the original draws `item` in `room`: the changed pixels' box, padded, as fractions. */
function placement(og, db, room, item) {
  const none = db.items.map(() => 0);
  const base = og.forState({ room, dark: false, itemLocations: none });
  if (!base) return undefined;
  const withItem = [...none];
  withItem[item] = room;
  const drawn = og.forState({ room, dark: false, itemLocations: withItem });
  if (!drawn || drawn.key === base.key) return undefined;
  const { width: w, height: h } = base.image;
  const a = base.image.pixels, b = drawn.image.pixels, pa = base.image.palette, pb = drawn.image.palette;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ca = pa[a[i]], cb = pb[b[i]];
      if (ca[0] === cb[0] && ca[1] === cb[1] && ca[2] === cb[2]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return undefined;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const px = Math.max(0, x0 - bw * PAD), py = Math.max(0, y0 - bh * PAD);
  const r = (v) => Math.round(v * 1000) / 1000;
  return [r(px / w), r(py / h), r(Math.min(w - px, bw * (1 + 2 * PAD)) / w), r((y1 + 1 - py) / h)];
}
