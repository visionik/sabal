// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Bot Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Load uncompressed Scott Adams database text into a frozen Database.
// Typed errors used by the loader and the session are defined here too.
// lookup maps a typed word to its vocabulary parent index.

export class SabalError extends Error {
  constructor(message: string) { super(message); this.name = new.target.name; }
}
export class DatabaseError extends SabalError {}
export class SaveError extends SabalError {}
export class InvalidIndexError extends SabalError {}
export class MissingArgumentError extends SabalError {}
export class SessionStateError extends SabalError {}

export interface Header {
  readonly unused: number;
  readonly highestItem: number;
  readonly highestAction: number;
  readonly highestVocabulary: number;
  readonly highestRoom: number;
  readonly carryingLimit: number;
  readonly startingRoom: number;
  readonly treasureCount: number;
  readonly wordLength: number;
  readonly lightTime: number;
  readonly highestMessage: number;
  readonly treasureRoom: number;
}
export interface ActionRow {
  readonly selector: number;
  readonly conditions: readonly number[];
  readonly packedActions: readonly number[];
  readonly actions: readonly number[];
}
export interface Room { readonly exits: readonly number[]; readonly text: string }
export interface Item { readonly text: string; readonly automaticWord: string | null; readonly initialLocation: number }
export interface Vocabulary { readonly verbs: readonly string[]; readonly nouns: readonly string[] }
export interface Database {
  readonly header: Header;
  readonly actions: readonly ActionRow[];
  readonly vocabulary: Vocabulary;
  readonly rooms: readonly Room[];
  readonly messages: readonly string[];
  readonly items: readonly Item[];
  readonly comments: readonly string[];
  readonly version: number;
  readonly adventureNumber: number;
}
export const byte = (n: number): number => ((n % 256) + 256) % 256;
const ushort = (n: number): number => ((n % 65536) + 65536) % 65536;
const short = (n: number): number => ((n + 32768) % 65536 + 65536) % 65536 - 32768;
export const fold = (s: string): string => s.replace(/[a-z]/g, c => c.toUpperCase());

// Scanner for the whitespace-separated integers and quoted strings in a database.
class Reader {
  private position = 0;
  constructor(private text: string) {}
  private whitespace(): void { while (/[ \t\r\n]/.test(this.text[this.position] ?? '') && this.position < this.text.length) this.position++; }
  integer(): number {
    this.whitespace();
    const match = /^[+-]?\d+(?=[ \t\r\n"]|$)/.exec(this.text.slice(this.position));
    if (!match) throw new DatabaseError('Invalid integer in database.');
    this.position += match[0].length;
    const n = Number(match[0]);
    if (!Number.isSafeInteger(n)) throw new DatabaseError('Integer outside safe range.');
    return n;
  }
  string(): string {
    this.whitespace();
    if (this.text[this.position++] !== '"') throw new DatabaseError('Initial quote expected.\n');
    let result = '';
    while (this.position < this.text.length) {
      const c = this.text[this.position++];
      if (c === '"') {
        if (this.text[this.position] === '"') { result += '"'; this.position++; }
        else return result.replace(/`/g, '"');
      } else result += c;
    }
    throw new DatabaseError('EOF in string.\n');
  }
}
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) frozen(v);
    Object.freeze(value);
  }
  return value;
}
/** Parse the uncompressed text format. Trailing data after metadata is ignored. */
export function loadDatabase(text: string): Database {
  const r = new Reader(text);
  let h: number[];
  try {
    h = Array.from({ length: 12 }, () => r.integer());
    if (h.some(n => n < -32768 || n > 32767) || [1, 2, 3, 4, 10].some(i => h[i] < 0)
      || h[5] < 0 || h[7] < 0 || h[8] < 1 || h[6] < 0 || h[6] > h[4] || h[11] < 0 || h[11] > h[4]) throw new Error();
  } catch { throw new DatabaseError('Invalid database(bad header).\n'); }
  const header: Header = { unused: h[0], highestItem: h[1], highestAction: h[2], highestVocabulary: h[3], highestRoom: h[4], carryingLimit: h[5], startingRoom: h[6], treasureCount: h[7], wordLength: h[8], lightTime: h[9], highestMessage: h[10], treasureRoom: h[11] };
  // One action row per index through highestAction. Eight words: a selector,
  // five condition words, and two packed action words. Each packed word holds
  // two action codes as the quotient and remainder of 150.
  const actions = Array.from({ length: h[2] + 1 }, (_, i): ActionRow => {
    let values: number[];
    try { values = Array.from({ length: 8 }, () => ushort(r.integer())); }
    catch { throw new DatabaseError(`Bad action line (${i})\n`); }
    const packedActions = values.slice(6);
    const codes = packedActions.flatMap(n => [Math.floor(n / 150), n % 150]);
    for (const code of codes) {
      const message = code >= 102 ? code - 50 : code >= 1 && code <= 51 ? code : null;
      if (message !== null && message > h[10]) throw new InvalidIndexError(`Invalid message index: ${message}`);
    }
    return { selector: values[0], conditions: values.slice(1, 6), packedActions, actions: codes };
  });
  const verbs: string[] = [], nouns: string[] = [];
  for (let i = 0; i <= h[3]; i++) { verbs.push(r.string()); nouns.push(r.string()); }
  for (const words of [verbs, nouns]) {
    let parent = -1;
    for (let i = 1; i < words.length; i++) {
      if (!words[i].startsWith('*')) parent = i;
      else if (parent < 0) throw new DatabaseError('Vocabulary synonym has no parent.');
    }
  }
  const rooms = Array.from({ length: h[4] + 1 }, (): Room => {
    const exits = Array.from({ length: 6 }, () => short(r.integer()));
    if (exits.some(n => n < 0 || n > h[4])) throw new InvalidIndexError('Invalid room exit.');
    return { exits, text: r.string() };
  });
  const messages = Array.from({ length: h[10] + 1 }, () => r.string());
  const items = Array.from({ length: h[1] + 1 }, (): Item => {
    const raw = r.string(), initialLocation = byte(r.integer());
    const slash = raw.indexOf('/');
    if (slash < 0) return { text: raw, automaticWord: null, initialLocation };
    const suffix = raw.slice(slash);
    if (suffix === '//' || suffix === '/*') return { text: raw, automaticWord: suffix, initialLocation };
    return { text: raw.slice(0, slash), automaticWord: raw.slice(slash + 1).split('/')[0], initialLocation };
  });
  const comments = Array.from({ length: h[2] + 1 }, () => r.string());
  const version = r.integer(), adventureNumber = r.integer();
  return frozen({ header, actions, vocabulary: { verbs, nouns }, rooms, messages, items, comments, version, adventureNumber });
}

export function lookup(database: Database, word: string, vocabulary: readonly string[]): number {
  let parent = -1;
  const key = fold(word.slice(0, database.header.wordLength));
  for (let i = 1; i < vocabulary.length; i++) {
    const synonym = vocabulary[i].startsWith('*');
    if (!synonym) parent = i;
    const spelling = synonym ? vocabulary[i].slice(1) : vocabulary[i];
    if (fold(spelling.slice(0, database.header.wordLength)) === key) return parent;
  }
  return -1;
}
