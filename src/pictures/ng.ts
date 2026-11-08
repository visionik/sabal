// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Next-gen pictures: new, high-resolution paintings for every game, inspired
// by the originals. Each room is a PNG; each item that the originals draw over
// a room is a PNG with a transparent background, placed where the original drew
// it. A manifest (ng/manifest.json) lists them. The core only says which files
// make up the picture and where each goes; `sabal/node` composes them into one
// PNG, and a browser can simply stack them.

import type { Database } from '../database.js';
import type { Snapshot } from '../session.js';
import { gameOf } from './library.js';

/** A place in the room picture, as fractions of its width and height: x, y, width, height. */
export type Box = readonly [number, number, number, number];

export interface NgItem {
  readonly file: string;
  /** Where the item goes in each room the original draws it in. */
  readonly at?: Readonly<Record<string, Box>>;
  /** Where it goes in any other room. */
  readonly default?: Box;
}

export interface NgGame {
  /** Room number → picture file. */
  readonly rooms: Readonly<Record<string, string>>;
  /** Item number → its picture, drawn over the room while the item is there. */
  readonly items?: Readonly<Record<string, NgItem>>;
  /** The picture for the dark, if there is one. */
  readonly dark?: string;
}

export interface NgManifest {
  /** Width and height of a room picture, in pixels. */
  readonly size: readonly [number, number];
  /** Where the pictures can be downloaded from: a file's URL is its path resolved against this. */
  readonly base?: string;
  /** Each file's size and SHA-256, to check downloads. */
  readonly files?: Readonly<Record<string, { readonly size: number; readonly sha256: string }>>;
  readonly games: Readonly<Record<string, NgGame>>;
}

/** One file of a next-gen picture: the room, or an item placed in `box`. */
export interface NgLayer {
  readonly file: string;
  readonly box?: Box;
}

export interface NgPicture {
  /** Stable id: the same picture always has the same key. */
  readonly key: string;
  /** The room first, then the items over it. */
  readonly layers: readonly NgLayer[];
}

/** Next-gen pictures for one game. */
export class NgGamePictures {
  constructor(
    private readonly id: string,
    private readonly game: NgGame,
  ) {}

  /** The picture for where the player is, with the items there drawn in, or undefined. */
  forState(snapshot: Snapshot): NgPicture | undefined {
    if (snapshot.dark) return this.game.dark ? { key: `ng:${this.id}:dark`, layers: [{ file: this.game.dark }] } : undefined;
    const room = this.game.rooms[snapshot.room];
    if (!room) return undefined;
    const layers: NgLayer[] = [{ file: room }];
    const shown: string[] = [];
    for (const [item, ng] of Object.entries(this.game.items ?? {})) {
      if (snapshot.itemLocations[Number(item)] !== snapshot.room) continue;
      const box = ng.at?.[snapshot.room] ?? ng.default;
      if (!box) continue;
      layers.push({ file: ng.file, box });
      shown.push(item);
    }
    return { key: `ng:${this.id}:${snapshot.room}${shown.map((i) => `+${i}`).join('')}`, layers };
  }
}

/** The next-gen pictures in a manifest. */
export class NgLibrary {
  constructor(readonly manifest: NgManifest) {}

  /** Games that have next-gen pictures. */
  list(): string[] {
    return Object.keys(this.manifest.games);
  }

  /** Pictures for the game this database is, if there are any. */
  forGame(database: Database): NgGamePictures | undefined {
    const id = gameOf(database);
    const game = id && this.manifest.games[id];
    return game ? new NgGamePictures(id, game) : undefined;
  }
}
