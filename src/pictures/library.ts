// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// SAGA pictures: recognise the illustrated releases of the games in files the
// host supplies (tapes, snapshots, disk images) and pick the picture for the
// player's room, its objects and some of the game's messages.
//
// The pictures are © Scott Adams / Adventure International and are not
// bundled. Like the rest of SABAL this never touches the filesystem: the host
// passes in the files' bytes. `sabal/node` adds a folder loader and PNG output.

import type { Database } from '../database.js';
import type { Snapshot } from '../session.js';
import { loadSpectrum } from './tape.js';
import { draw, plausible, SPECTRUM_PALETTE, type BdpLayout, type Bitmap } from './bdp.js';
import { ATARI_PALETTE, drawAtari, loadAtr, pictureData, pictureOffsets, type AtariDisk } from './atari.js';
import { latin1, readD64 } from './d64.js';
import { drawLines, linesAdventure, linesPicture, LINES_PALETTE, type Instruction } from './atari-lines.js';
import { APPLE_PALETTE, drawApple, parseApple, readDos33 } from './apple.js';
import { drawPacked, packedPicture, type PackedPicture } from './apple-packed.js';
import { crc32 } from './crc32.js';
import { drawTi, tiPictureAddress, TI_PALETTE } from './ti99.js';
import { Painter, SCENE_PALETTE, type SceneSet } from './scenes.js';
import { MYSTERY_FUN_HOUSE, MYSTERY_FUN_HOUSE_ITEMS } from './scenes-adv07.js';
import { PYRAMID_OF_DOOM, PYRAMID_OF_DOOM_ITEMS } from './scenes-adv08.js';
import { GHOST_TOWN, GHOST_TOWN_ITEMS } from './scenes-adv09.js';
import { GOLDEN_VOYAGE, GOLDEN_VOYAGE_ITEMS } from './scenes-adv12.js';
import { SAMPLER, SAMPLER_ITEMS } from './scenes-sampler1.js';

/** A file the host has read, such as a tape or disk image. */
export interface PictureFile {
  readonly name: string;
  readonly data: Uint8Array;
}

/** An indexed-colour picture. */
export interface PictureImage {
  readonly width: number;
  readonly height: number;
  /** One palette index per pixel, row by row. */
  readonly pixels: Uint8Array;
  readonly palette: readonly (readonly [number, number, number])[];
  /** How many times to enlarge it, in whole pixels, for its usual size. */
  readonly scale: number;
}

export interface Picture {
  /** Stable id: the same picture always has the same key. */
  readonly key: string;
  /** Where it comes from, e.g. "ZX Spectrum". */
  readonly platform: string;
  readonly image: PictureImage;
}

export type Platform = 'ZX Spectrum' | 'Atari 8-bit' | 'Commodore 64' | 'Apple II' | 'TI-99/4A' | 'SABAL';

/** The games, told apart by adventure number and room 1's text (two games share number 2, two share 14). */
const GAMES = {
  adv01: [1, 'dismal swamp'],
  adv02: [2, 'Flat in london'],
  adv03: [3, ''],
  adv04: [4, 'chapel'],
  adv05: [5, "*I'm lying in a large brass bed"],
  adv06: [6, 'one man scoutship'],
  adv07: [7, "*I'm in front of the FUN HOUSE"],
  adv08: [8, 'desert'],
  adv09: [9, 'Ghost Town'],
  adv12: [12, 'Royal palace'],
  sampler1: [65, 'dismal swamp'],
  adv14a: [14, 'bottom bunk'],
  adv10: [10, 'Beach by ocean'],
  adv11: [11, 'small metal room'],
  adv13: [13, 'field'],
  adv14b: [14, 'Yoyodyne office'],
  quest1: [2, "*I'm Bruce Banner, tied hand & foot to a chair"],
  quest2: [2, 'small deserted Office'],
} as const satisfies Record<string, readonly [number, string]>;

type GameId = keyof typeof GAMES;

/** The game a database is, if it's one we have pictures for. */
function gameOf(database: Database): GameId | undefined {
  return (Object.keys(GAMES) as GameId[]).find(
    (id) => GAMES[id][0] === database.adventureNumber && GAMES[id][1] === (database.rooms[1]?.text ?? ''),
  );
}

type Release = SpectrumRelease | AtariRelease | C64Release | AtariLinesRelease | AppleRelease | ApplePackedRelease | TiRelease | SceneRelease;

interface SpectrumRelease extends Common {
  readonly platform: 'ZX Spectrum';
  /** Room text that must appear in the file, so one game's tape is never taken for another's. */
  readonly text: string;
  readonly layout: BdpLayout;
}

interface AtariRelease extends Common {
  readonly platform: 'Atari 8-bit';
  /** The picture disk (side B). */
  readonly disk: AtariDisk;
}

interface AtariLinesRelease extends Common {
  readonly platform: 'Atari 8-bit';
  /** The adventure number at the start of the picture disk's index; pictures follow room order. */
  readonly lines: number;
}

interface C64Release extends Common {
  readonly platform: 'Commodore 64';
  /** Room text that must appear in one of the disk's files. */
  readonly text: string;
  /**
   * The start of each room picture's file name, before the 3-digit room
   * number: room 7's picture is `R007` or `R13007`, and `…000` is the dark.
   */
  readonly prefix: string;
}

interface AppleRelease extends Common {
  readonly platform: 'Apple II';
  /** The adventure number in the picture files' names: R0201 is game 2's room 1, B02019 its item 19. */
  readonly apple: number;
}

interface ApplePackedRelease extends Common {
  readonly platform: 'Apple II';
  /** CRC-32 of the picture disk's index tables (track 0, sectors 1–6), to recognise it. */
  readonly packed: number;
}

interface TiRelease extends Common {
  readonly platform: 'TI-99/4A';
  /** CRC-32 of the cartridge's 8K ROM; its GROM must hold `text`. */
  readonly rom: number;
  readonly text: string;
}

/** SABAL's own pictures, for games that never had any; always available. */
interface SceneRelease extends Common {
  readonly platform: 'SABAL';
  readonly scenes: SceneSet;
  /** Things drawn over the room while they are in it: item number → picture number. */
  readonly things: ReadonlyMap<number, number>;
}

interface Common {
  readonly game: GameId;
  /** Picture number for each room; rooms not listed have no picture. */
  readonly rooms?: Readonly<Record<number, number>>;
  /** Small pictures drawn over a room's picture while one of the items is in that room. */
  readonly overlays?: readonly Overlay[];
  /** Full-screen pictures shown when the game prints a matching message. */
  readonly closeUps?: readonly CloseUp[];
  /** The picture for a dark room, if the release has one. */
  readonly dark?: number;
}

interface Overlay {
  readonly room: number;
  /** Any of these item numbers. */
  readonly items: readonly number[];
  readonly picture: number;
}

interface CloseUp {
  readonly message: RegExp;
  readonly picture: number;
}

const range = (from: number, to: number, first: number) =>
  Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, first + i]));
const same = (rooms: number[], picture: number) => Object.fromEntries(rooms.map((r) => [r, picture]));

/**
 * Releases we can read. Room, item and message numbers are the TRS-80
 * database's. The Spectrum releases keep their own rules for which picture to
 * show, so each picture there was matched to its room, item or message by eye.
 * When the host has more than one release of a game, the first listed wins.
 */
const RELEASES: readonly Release[] = [
  { game: 'adv13', platform: 'Commodore 64', text: "*I'm on a Drawbridge", prefix: 'R13' },
  { game: 'adv14b', platform: 'Commodore 64', text: 'Yoyodyne', prefix: 'R' },
  { game: 'quest2', platform: 'Commodore 64', text: 'chem lab', prefix: 'R' },
  {
    // The room pictures come first, in their own order; matched to rooms by eye.
    game: 'quest1',
    platform: 'Atari 8-bit',
    disk: { start: 0x287, count: 69, skipSector: 360, crc: 0x3739ecd1 },
    rooms: {
      1: 4, // Bruce Banner, tied to a chair
      ...same([2, 13, 14], 1), // the dome
      ...same([3, 5, 6], 5), // tunnel going out, the WARNING sign
      ...same([4, 7, 8], 2), // field, the dome beyond
      ...same([9, 10, 11], 6), // hole: HULK UNDERGROUND!
      12: 3, // cavern
      15: 7, // small underground room
      ...same([17, 18], 8), // warp
      19: 9, // the Chief Examiner's office
      20: 10, // limbo
    },
    dark: 0,
    closeUps: [
      { message: /gas fills room/i, picture: 17 }, // GAS!
      { message: /Egg pulsates/, picture: 22 },
      { message: /Ant-Man in it/, picture: 24 }, // Ant-Man, caged
      { message: /Ant-Man controlled ants/, picture: 25 },
      { message: /Dr Strange points|Strange says/, picture: 18 },
      { message: /Hulk rampages off/, picture: 16 },
    ],
  },
  // The cartridge's own drawing code runs on an emulator; pictures are in room order.
  { game: 'adv14a', platform: 'TI-99/4A', rom: 0x8eadb535, text: "Sorry, to explore Pirate's Isle you'll need Adventure #2" },
  { game: 'adv04', platform: 'Apple II', packed: 0x453db81c },
  { game: 'adv05', platform: 'Apple II', packed: 0xc7028e6f },
  { game: 'adv02', platform: 'Atari 8-bit', lines: 2 },
  { game: 'adv06', platform: 'Atari 8-bit', lines: 6 },
  { game: 'adv02', platform: 'Apple II', apple: 2 },
  { game: 'adv06', platform: 'Apple II', apple: 6 },
  {
    // The pictures run in room order, from "It's too dark!" for room 0.
    game: 'adv13',
    platform: 'Atari 8-bit',
    disk: { start: 0x287, count: 91, skipSector: 360, crc: 0x8b877c5f },
    rooms: range(1, 32, 59),
    dark: 58,
  },
  {
    game: 'adv01',
    platform: 'ZX Spectrum',
    text: 'dismal swamp',
    layout: { charset: 0xa303, count: 41, version: 1 },
    rooms: {
      ...range(1, 11, 0),
      ...same([12, 13, 14, 15, 16, 17], 11), // the maze of pits
      ...range(18, 33, 12),
    },
    overlays: [
      { room: 5, items: [17], picture: 29 }, // the door, open
      { room: 17, items: [29], picture: 30 }, // the Persian rug
      { room: 20, items: [35], picture: 28 }, // the bricked-up window, with a hole
      { room: 21, items: [25, 39, 43], picture: 31 }, // the bear
      { room: 23, items: [27], picture: 32 }, // the sleeping dragon
    ],
    closeUps: [
      { message: /Genie appears/, picture: 34 },
      { message: /Dragon smells something|bees attack the dragon/, picture: 33 },
      { message: /Gas bladder blew up/, picture: 36 },
    ],
  },
  { game: 'adv01', platform: 'Atari 8-bit', lines: 1 },
  {
    game: 'adv03',
    platform: 'ZX Spectrum',
    text: 'twisting yellow hallway',
    layout: { charset: 0xa242, count: 44, version: 1 },
    rooms: range(2, 23, 0),
    dark: 22,
    closeUps: [
      { message: /Good morning Mr\. Phelps/, picture: 23 }, // the tape player
      { message: /FEEL THE BOMB explode|triggering\s+the bomb/, picture: 25 }, // BOOM
    ],
  },
  { game: 'adv03', platform: 'Apple II', apple: 3 },
  { game: 'adv01', platform: 'Apple II', packed: 0xd1a2b2a9 },
  { game: 'adv13', platform: 'Apple II', packed: 0x884a5e2c },
  {
    // Only the rooms whose picture is unmistakable; the rest show none.
    game: 'adv13',
    platform: 'ZX Spectrum',
    text: "*I'm on a Drawbridge",
    layout: { charset: 0x9fec, count: 38, version: 2 },
    rooms: {
      1: 0, // the field, before the castle
      3: 2, // courtyard
      5: 4, // stream of lava
      7: 5, // ball room
      8: 6, // on the chandelier
      12: 10, // dungeon cell
      15: 12, // loft above the ballroom
      16: 13, // in the moat
      17: 14, // underwater
      18: 15, // under the stairs
      19: 16, // hollow tree: LEAVE STARS HERE
      21: 18, // kitchen
      23: 19, // box
      28: 23, // entryway
      29: 24, // dragon's lair
    },
  },
  {
    // Only the rooms whose picture is unmistakable; the rest show none.
    game: 'adv10',
    platform: 'ZX Spectrum',
    text: 'Beach by ocean, a cliff towers',
    layout: { charset: 0x96f4, count: 37, version: 3 },
    rooms: {
      1: 0, // the beach with the great stone head (room 10 is on top of it)
      2: 1, // the cliff towering over the west end
      5: 5, // shallow tidepool
      6: 6, // the extinct volcano's rim
      7: 7, // the plain, with the volcano
      ...same([9, 22], 10), // metal lined tunnel
      10: 11, // on top of the head, the atoll offshore
      12: 15, // the lake
      14: 16, // on the raft
      15: 20, // the small atoll
      19: 23, // top of a palm tree
    },
  },
  {
    // Only the rooms whose picture is unmistakable; the rest show none.
    game: 'adv11',
    platform: 'ZX Spectrum',
    text: 'metal lifeboat hangar',
    layout: { charset: 0x97b5, count: 21, version: 3 },
    rooms: {
      ...same([3, 5, 6, 7, 9, 19, 21, 25], 4), // metal lined tunnel
      16: 12, // the treadmill
      23: 17, // metal dormitory
      24: 5, // lifeboat hangar, the shuttle in it
      27: 19, // porcelain machinery
    },
  },
  {
    // Only the rooms whose picture is unmistakable; the rest show none.
    game: 'quest2',
    platform: 'ZX Spectrum',
    text: "*I'm on side of a skyscraper",
    layout: { charset: 0xa27b, count: 41, version: 2 },
    rooms: {
      ...same([2, 16, 35], 0), // hall with threadbare carpeting
      ...same([6, 9, 11, 14], 1), // elevator shaft
      ...same([5, 10, 12], 2), // waiting room
      3: 8, // computer lab
      4: 6, // small office
      ...same([1, 21, 23, 36, 37, 38, 39], 5), // small deserted office
      ...same([7, 8, 25, 26, 27, 28, 29, 30, 31, 32, 33], 13), // air ducts
      13: 4, // chemical laboratory
      17: 7, // side of the skyscraper
      22: 10, // paper room
    },
  },
  // SABAL's own pictures come last, so a real release always wins.
  { game: 'adv07', platform: 'SABAL', scenes: MYSTERY_FUN_HOUSE, things: MYSTERY_FUN_HOUSE_ITEMS },
  { game: 'adv08', platform: 'SABAL', scenes: PYRAMID_OF_DOOM, things: PYRAMID_OF_DOOM_ITEMS },
  { game: 'adv09', platform: 'SABAL', scenes: GHOST_TOWN, things: GHOST_TOWN_ITEMS },
  { game: 'adv12', platform: 'SABAL', scenes: GOLDEN_VOYAGE, things: GOLDEN_VOYAGE_ITEMS },
  { game: 'sampler1', platform: 'SABAL', scenes: SAMPLER, things: SAMPLER_ITEMS },
];

/** File names worth looking at. */
export const PICTURE_FILES = /\.(tap|tzx|sna|atr|d64|dsk|do|bin)$/i;

interface Found {
  readonly release: Release;
  readonly file: string;
  /** Picture number for each room, and for the dark. */
  readonly rooms: Readonly<Record<number, number>>;
  readonly dark?: number;
  /** Pictures of items, drawn over the room while the item is in it: item number → picture number. */
  readonly items?: ReadonlyMap<number, number>;
  /** Whether rooms without a picture may share one with a room described the same way. */
  readonly byName: boolean;
  /** Draw pictures one over another. */
  readonly render: (layers: number[]) => PictureImage;
}

/** Pictures for one game, from the best release the host has. */
export class GamePictures {
  private readonly cache = new Map<string, PictureImage>();
  private readonly rooms: Readonly<Record<number, number>>;

  constructor(
    private readonly found: Found,
    database: Database,
  ) {
    this.rooms = found.byName ? shareByText(found.rooms, database.rooms.map((r) => r.text)) : found.rooms;
  }

  get platform(): Platform {
    return this.found.release.platform;
  }

  /** The file the pictures come from. */
  get file(): string {
    return this.found.file;
  }

  /** The picture for where the player is, with any objects drawn in, or undefined. */
  forState(snapshot: Snapshot): Picture | undefined {
    if (snapshot.dark) return this.found.dark === undefined ? undefined : this.picture([this.found.dark]);
    const n = this.rooms[snapshot.room];
    if (n === undefined) return undefined;
    const overlays = (this.found.release.overlays ?? [])
      .filter((o) => o.room === snapshot.room && o.items.some((i) => snapshot.itemLocations[i] === snapshot.room))
      .map((o) => o.picture);
    for (const [item, picture] of this.found.items ?? []) {
      if (snapshot.itemLocations[item] === snapshot.room) overlays.push(picture);
    }
    return this.picture([n, ...overlays]);
  }

  /** A close-up for a message the game just printed, if the release has one. */
  forMessage(text: string): Picture | undefined {
    const hit = this.found.release.closeUps?.find((c) => c.message.test(text));
    return hit ? this.picture([hit.picture]) : undefined;
  }

  private picture(layers: number[]): Picture {
    const key = `${this.found.release.game}:${layers.join('+')}`;
    let image = this.cache.get(key);
    if (!image) {
      image = this.found.render(layers);
      this.cache.set(key, image);
    }
    return { key, platform: this.found.release.platform, image };
  }
}

/** Recognise picture releases in the host's files. */
export class PictureLibrary {
  private readonly found = new Map<GameId, Found>();

  constructor(files: Iterable<PictureFile>) {
    const list = [...files];
    for (const hit of builtIn()) this.consider(hit);
    for (const hit of recogniseCartridges(list)) this.consider(hit);
    for (const file of list) {
      if (!PICTURE_FILES.test(file.name)) continue;
      let hits: Found[] = [];
      try {
        hits = recognise(file);
      } catch {
        // An odd file is skipped.
      }
      for (const hit of hits) this.consider(hit);
    }
  }

  private consider(hit: Found): void {
    const current = this.found.get(hit.release.game);
    if (!current || RELEASES.indexOf(hit.release) < RELEASES.indexOf(current.release)) this.found.set(hit.release.game, hit);
  }

  /** The games found, as corpus file names (`adv01`…), with the platform and file of each. */
  list(): { game: string; platform: Platform; file: string }[] {
    return [...this.found.values()].map((f) => ({ game: f.release.game, platform: f.release.platform, file: f.file }));
  }

  /** Pictures for the game this database is, if any of the files has them. */
  forGame(database: Database): GamePictures | undefined {
    const id = gameOf(database);
    const found = id && this.found.get(id);
    return found ? new GamePictures(found, database) : undefined;
  }
}

/** Give rooms without a picture the picture of a room with the same description. */
function shareByText(rooms: Readonly<Record<number, number>>, texts: readonly string[]): Record<number, number> {
  const shared: Record<number, number> = { ...rooms };
  texts.forEach((text, room) => {
    if (shared[room] !== undefined || !text) return;
    const twin = texts.findIndex((t, r) => t === text && rooms[r] !== undefined);
    if (twin >= 0) shared[room] = rooms[twin]!;
  });
  return shared;
}

const image = (bitmap: Bitmap, palette: PictureImage['palette'], scale: number): PictureImage => ({ ...bitmap, palette, scale });

/** The releases this file holds pictures for. */
function recognise({ name, data }: PictureFile): Found[] {
  const hits: Found[] = [];
  const mem = loadSpectrum(name, data);
  if (mem) {
    const text = latin1(mem);
    for (const release of RELEASES) {
      if (release.platform !== 'ZX Spectrum' || !text.includes(release.text) || !plausible(mem, release.layout)) continue;
      hits.push({
        release,
        file: name,
        rooms: release.rooms ?? {},
        dark: release.dark,
        byName: false,
        render: (layers) => {
          let bitmap: Bitmap | undefined;
          for (const n of layers) bitmap = draw(mem, release.layout, n, bitmap);
          return image(bitmap!, SPECTRUM_PALETTE, 4);
        },
      });
    }
  }

  const sectors = /\.atr$/i.test(name) ? loadAtr(data) : undefined;
  const adventure = sectors && linesAdventure(sectors);
  if (sectors && adventure) {
    for (const release of RELEASES) {
      if (!('lines' in release) || release.lines !== adventure) continue;
      const pictures = new Map<number, Instruction[]>();
      for (let room = 0; room < 100; room++) {
        const picture = linesPicture(sectors, room);
        if (picture?.length) pictures.set(room, picture);
      }
      if (!pictures.size) continue;
      hits.push({
        release,
        file: name,
        rooms: Object.fromEntries([...pictures.keys()].filter((r) => r > 0).map((r) => [r, r])),
        dark: pictures.has(0) ? 0 : undefined,
        byName: false,
        render: ([n]) => image(drawLines(pictures.get(n!)!), LINES_PALETTE, 3),
      });
    }
  }
  if (sectors) {
    for (const release of RELEASES) {
      if (!('disk' in release)) continue;
      const pictures = pictureData(sectors, release.disk);
      const offsets = pictures && pictureOffsets(pictures, release.disk);
      if (!pictures || offsets!.length < release.disk.count) continue;
      hits.push({
        release,
        file: name,
        rooms: release.rooms ?? {},
        dark: release.dark,
        byName: false,
        render: ([n]) => {
          // Atari pictures are drawn alone: overlays aren't supported for them yet.
          const { bitmap, colours } = drawAtari(pictures, offsets![n!]!, release.disk.old);
          return image(bitmap, colours.map((c) => ATARI_PALETTE[c]!), 3);
        },
      });
    }
  }

  if (/\.(dsk|do)$/i.test(name) && data.length === 143360) {
    const tables = crc32(data.subarray(256, 7 * 256));
    for (const release of RELEASES) {
      if (!('packed' in release) || release.packed !== tables) continue;
      const pictures = new Map<number, PackedPicture>();
      const items = new Map<number, number>();
      for (let n = 0; n < 100; n++) {
        const room = packedPicture(data, 1, n);
        if (room) pictures.set(n, room);
      }
      for (let n = 0; n < 256; n++) {
        const item = packedPicture(data, 4, n);
        if (item) {
          pictures.set(1000 + n, item);
          items.set(n, 1000 + n);
        }
      }
      // Rooms 0–79; 0 is the dark, 80 and up are close-ups.
      const rooms = [...pictures.keys()].filter((n) => n > 0 && n < 80);
      if (!rooms.length) continue;
      hits.push({
        release,
        file: name,
        rooms: Object.fromEntries(rooms.map((n) => [n, n])),
        dark: pictures.has(0) ? 0 : undefined,
        items,
        byName: false,
        render: (layers) => image(drawPacked(layers.map((n) => pictures.get(n)!)), APPLE_PALETTE, 3),
      });
    }
  }

  const disk = /\.(dsk|do)$/i.test(name) ? readDos33(data) : undefined;
  if (disk) {
    for (const release of RELEASES) {
      if (!('apple' in release)) continue;
      const nn = String(release.apple).padStart(2, '0');
      // Rooms are R<nn><rr> (00 is the dark; 80 and up are close-ups); items are B<nn><iii>.
      const pictures = new Map<number, Uint8Array>();
      const items = new Map<number, number>();
      for (const [file, body] of disk) {
        const room = new RegExp(`^R${nn}(\\d\\d)$`).exec(file);
        if (room && Number(room[1]) < 80) pictures.set(Number(room[1]), body);
        const item = new RegExp(`^B${nn}(\\d{3})$`).exec(file);
        if (item) {
          pictures.set(1000 + Number(item[1]), body);
          items.set(Number(item[1]), 1000 + Number(item[1]));
        }
      }
      const rooms = [...pictures.keys()].filter((n) => n > 0 && n < 1000);
      if (!rooms.length) continue;
      hits.push({
        release,
        file: name,
        rooms: Object.fromEntries(rooms.map((n) => [n, n])),
        dark: pictures.has(0) ? 0 : undefined,
        items,
        byName: true,
        render: (layers) => {
          let screen: Uint8Array | undefined;
          let picture: Bitmap | undefined;
          for (const n of layers) ({ bitmap: picture, bytes: screen } = drawApple(parseApple(pictures.get(n)!), screen));
          return image(picture!, APPLE_PALETTE, 3);
        },
      });
    }
  }

  const files = /\.d64$/i.test(name) ? readD64(data) : undefined;
  if (files) {
    const text = [...files.values()].map(latin1).join('\0');
    for (const release of RELEASES) {
      if (release.platform !== 'Commodore 64' || !text.includes(release.text)) continue;
      // Room pictures are R<n>; item pictures B<n> (Claymorgue: B13<n>R, with B13<n>I its inventory icon).
      const pictures = new Map<number, Uint8Array>();
      const itemPrefix = 'B' + release.prefix.slice(1);
      const items = new Map<number, number>();
      for (const [file, body] of files) {
        const room = file.startsWith(release.prefix) && /^\d{3}$/.exec(file.slice(release.prefix.length));
        if (room) pictures.set(Number(room[0]), body);
        const item = file.startsWith(itemPrefix) && /^(\d{3})R?$/.exec(file.slice(itemPrefix.length));
        if (item) {
          // Item pictures are numbered from 1000 up, apart from the rooms'.
          pictures.set(1000 + Number(item[1]), body);
          items.set(Number(item[1]), 1000 + Number(item[1]));
        }
      }
      const rooms = [...pictures.keys()].filter((n) => n > 0 && n < 1000);
      if (!rooms.length) continue;
      hits.push({
        release,
        file: name,
        rooms: Object.fromEntries(rooms.map((n) => [n, n])),
        dark: pictures.has(0) ? 0 : undefined,
        items,
        byName: true,
        render: ([n, ...overlays]) => {
          // The C64 releases use the Atari's picture format and colour numbers.
          // Items are drawn over the room in the room's colours, as the machine would.
          let { bitmap, colours } = drawAtari(pictures.get(n!)!, 0);
          for (const o of overlays) bitmap = drawAtari(pictures.get(o)!, 0, false, bitmap).bitmap;
          return image(bitmap, colours.map((c) => ATARI_PALETTE[c]!), 3);
        },
      });
    }
  }
  return hits;
}

/**
 * TI-99/4A cartridges come as two files, the ROM and the GROM (as extracted
 * from a .rpk), so they are recognised as a pair.
 */
function recogniseCartridges(files: readonly PictureFile[]): Found[] {
  const hits: Found[] = [];
  for (const release of RELEASES) {
    if (!('rom' in release)) continue;
    const rom = files.find((f) => f.data.length === 8192 && crc32(f.data) === release.rom);
    const grom = files.find((f) => f.data.length >= 24576 && f.data.length <= 0xa000 && latin1(f.data).includes(release.text));
    if (!rom || !grom) continue;
    const pictures = new Map<number, number>();
    for (let room = 0; room < 64; room++) {
      const address = tiPictureAddress(rom.data, room);
      if (address) pictures.set(room, address);
    }
    hits.push({
      release,
      file: rom.name,
      rooms: Object.fromEntries([...pictures].filter(([room]) => room > 0).map(([room]) => [room, room])),
      byName: false,
      render: ([n]) => {
        const bitmap = drawTi(rom.data, grom.data, pictures.get(n!)!);
        return image(bitmap ?? { width: 256, height: 96, pixels: new Uint8Array(256 * 96) }, TI_PALETTE, 4);
      },
    });
  }
  return hits;
}

/** SABAL's own pictures, which need no files. */
function builtIn(): Found[] {
  const hits: Found[] = [];
  for (const release of RELEASES) {
    if (!('scenes' in release)) continue;
    const { scenes, things } = release;
    hits.push({
      release,
      file: 'built in',
      rooms: scenes.rooms,
      items: things,
      byName: false,
      render: (layers) => {
        const painter = new Painter();
        for (const n of layers) scenes.pictures[n]?.(painter);
        return image(painter.bitmap(), SCENE_PALETTE, 3);
      },
    });
  }
  return hits;
}
