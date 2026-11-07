// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// A play session over an immutable database. It parses commands, runs the
// turn loop, and yields events. Execution suspends when the host must store
// a save or wait two seconds.

import { type Database, type ActionRow, byte, fold, lookup, SabalError, SaveError, InvalidIndexError, MissingArgumentError, SessionStateError } from './database.js';

export type Status = 'need-command' | 'need-save-identifier' | 'need-wait' | 'terminated';
export type Event =
  | { readonly kind: 'room' | 'response' | 'command-prompt' | 'save-prompt' | 'diagnostic'; readonly text: string }
  | { readonly kind: 'clear-response' | 'terminated' }
  | { readonly kind: 'wait'; readonly milliseconds: 2000 };
export interface StepResult { readonly events: readonly Event[]; readonly status: Status }
export interface Options {
  readonly restoreText?: string;
  /** Supplies unsigned results of a native left shift by six, BEFORE modulo 100.
   * Values must be nonnegative safe integers divisible by four. */
  readonly random?: () => number;
}
/** Where things are: see {@link Session.snapshot}. */
export interface Snapshot {
  /** The player's room number. */
  readonly room: number;
  /** True when the room is dark and the player has no light. */
  readonly dark: boolean;
  /** Each item's room, by item number; 255 means the player is carrying it, 0 that it is nowhere. */
  readonly itemLocations: readonly number[];
}
type Flow<T = void> = Generator<Event, T, void>;
const directions = ['North', 'South', 'East', 'West', 'Up', 'Down'];
const prompt = '\nTell me what to do ? ';

/** Mutable play state and private resumable execution. Database data is never mutated. */
export class Session {
  readonly initialResult: StepResult;
  private currentRoom: number;
  private locations: number[];
  private flags = 0;
  private counter = 0;
  private counters = Array<number>(16).fill(0);
  private savedRoom = 0;
  private roomRegisters = Array<number>(16).fill(0);
  private light: number;
  private noun = '';
  private redraw = false;
  private ended = false;
  private input = '';
  private flow: Flow;
  private currentStatus: Status = 'need-command';
  private random: () => number;

  constructor(private readonly database: Database, options: Options = {}) {
    this.currentRoom = database.header.startingRoom;
    this.locations = database.items.map(i => i.initialLocation);
    this.light = database.header.lightTime;
    // An entropy-backed default, not a seed-to-sequence compatibility promise.
    this.random = options.random ?? (() => ((Math.floor(Math.random() * 0x80000000) << 6) >>> 0));
    if (options.restoreText !== undefined) this.restore(options.restoreText);
    this.flow = this.play();
    this.initialResult = this.advance();
  }
  get status(): Status { return this.currentStatus; }
  /**
   * Where the player and the items are right now, for hosts that draw pictures or maps.
   * Read-only: a copy taken at the moment you ask.
   */
  get snapshot(): Snapshot {
    return Object.freeze({ room: this.currentRoom, dark: this.dark(), itemLocations: Object.freeze([...this.locations]) });
  }
  submitCommand(input: string): StepResult {
    this.require('need-command');
    if (/[^\x20-\x7e\t\r\n]/.test(input)) throw new SessionStateError('Only printable ASCII input and token whitespace are supported.');
    this.input = input;
    return this.advance();
  }
  provideSaveIdentifier(id: string, ok = true): StepResult {
    this.require('need-save-identifier');
    if (typeof id !== 'string') throw new SessionStateError('A save identifier is required.');
    return this.advance([{ kind: 'response', text: '\n' }, { kind: 'response', text: ok ? 'Saved.\n' : 'Unable to create save file.\n' }]);
  }
  notifyWaitComplete(): StepResult { this.require('need-wait'); return this.advance(); }
  private require(status: Status): void {
    if (this.currentStatus !== status) throw new SessionStateError(`Expected ${status}; session is ${this.currentStatus}.`);
  }
  // Run until a command prompt, a save prompt, a wait, or termination.
  // A save prompt or a wait leaves the generator suspended at that action.
  private advance(events: Event[] = []): StepResult {
    for (;;) {
      const next = this.flow.next();
      if (next.done) { this.currentStatus = 'terminated'; break; }
      events.push(next.value);
      const kind = next.value.kind;
      if (kind === 'command-prompt') { this.currentStatus = 'need-command'; break; }
      if (kind === 'save-prompt') { this.currentStatus = 'need-save-identifier'; break; }
      if (kind === 'wait') { this.currentStatus = 'need-wait'; break; }
      if (kind === 'terminated') { this.currentStatus = 'terminated'; break; }
    }
    return Object.freeze({ events: Object.freeze(events.map(e => Object.freeze(e))), status: this.currentStatus });
  }
  private response(text: string): Event { return { kind: 'response', text }; }
  private index(n: number, length: number, kind: string): number {
    if (!Number.isInteger(n) || n < 0 || n >= length) throw new InvalidIndexError(`Invalid ${kind} index: ${n}`);
    return n;
  }
  private location(i: number): number { return this.locations[this.index(i, this.locations.length, 'item')]; }
  private moveItem(i: number, room: number): void { this.locations[this.index(i, this.locations.length, 'item')] = byte(room); }
  private flag(f: number): boolean { this.index(f, 32, 'flag'); return (this.flags & (1 << f)) !== 0; }
  private setFlag(f: number, on: boolean): void { this.index(f, 32, 'flag'); this.flags = on ? this.flags | (1 << f) : this.flags & ~(1 << f); }
  private carried(): number { return this.locations.filter(n => n === 255).length; }
  private nearby(): boolean { return this.locations[9] === 255 || this.locations[9] === this.currentRoom; }
  private dark(): boolean { return this.flag(15) && !this.nearby(); }
  private roomEvent(): Event {
    if (this.dark()) return { kind: 'room', text: "I can't see. It is too dark!\n" };
    const room = this.database.rooms[this.index(this.currentRoom, this.database.rooms.length, 'room')];
    let text = room.text.startsWith('*') ? room.text.slice(1) + '\n' : `I'm in a ${room.text}\n`;
    const exits = room.exits.flatMap((exit, i) => exit !== 0 ? [directions[i]] : []);
    text += '\nObvious exits: ' + (exits.join(', ') || 'none') + '.\n';
    const items = this.database.items.filter((_, i) => this.locations[i] === this.currentRoom);
    if (items.length) text += '\nI can also see: ' + items.map(i => i.text).join(' - ');
    return { kind: 'room', text: text + '\n' };
  }
  private *checkpoint(): Flow { if (this.redraw) { yield this.roomEvent(); this.redraw = false; } }
  private *terminate(): Flow { this.ended = true; this.redraw = false; yield { kind: 'terminated' }; }
  private *gameOver(): Flow { yield this.response('The game is now over.\n'); yield* this.terminate(); }
  // Turn loop: an opening look, then deferred look, automatic actions,
  // deferred look, and a command prompt. Later looks run only when redraw is set.
  private *play(): Flow {
    yield this.roomEvent();
    while (!this.ended) {
      yield* this.checkpoint();
      yield* this.automatic();
      if (this.ended) return;
      yield* this.checkpoint();
      let verb = -1, noun = -1;
      // Parser. Empty input or an unknown verb asks again and does not advance.
      // A direction noun is verb 1. Other words are looked up as verb and noun.
      for (;;) {
        yield { kind: 'command-prompt', text: prompt };
        const fields = this.input.match(/[^ \t\r\n]{1,9}/g) ?? [];
        let first = fields[0] ?? '';
        const second = fields[1] ?? '';
        if (!first) continue;
        if (!second && first.length === 1) first = ({ N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST', U: 'UP', D: 'DOWN', I: 'INVENTORY' } as Record<string, string>)[fold(first)] ?? first;
        const direction = lookup(this.database, first, this.database.vocabulary.nouns);
        if (direction >= 1 && direction <= 6) { verb = 1; noun = direction; }
        else { verb = lookup(this.database, first, this.database.vocabulary.verbs); noun = lookup(this.database, second, this.database.vocabulary.nouns); }
        if (verb === -1) { yield this.response("You use word(s) I don't know! "); continue; }
        this.noun = second;
        break;
      }
      if (verb === 1 && noun === -1) yield this.response('Give me a direction too.');
      else if (verb === 1 && noun >= 1 && noun <= 6) yield* this.movement(noun);
      else yield* this.search(verb, noun, true);
      if (this.ended) return;
      yield* this.updateLight();
    }
  }
  private *movement(noun: number): Flow {
    const dark = this.dark();
    if (dark) yield this.response('Dangerous to move in the dark! ');
    const room = this.database.rooms[this.index(this.currentRoom, this.database.rooms.length, 'room')];
    const exit = room.exits[noun - 1];
    if (exit !== 0) { this.currentRoom = exit; yield this.roomEvent(); }
    else if (dark) { yield this.response('I fell down and broke my neck. '); yield* this.terminate(); }
    else yield this.response("I can't go in that direction. ");
  }
  private chance(threshold: number): boolean {
    const draw = this.random();
    if (!Number.isSafeInteger(draw) || draw < 0 || draw % 4 !== 0) throw new SabalError('Random source must return an unsigned shift result divisible by four.');
    return draw % 100 < threshold;
  }
  private conditions(row: ActionRow): number[] | null {
    const args: number[] = [];
    // Condition codes 0 to 19. Code 0 only stores a parameter for later actions.
    for (const word of row.conditions) {
      const code = word % 20, p = Math.floor(word / 20);
      if (code === 0) { args.push(p); continue; }
      let success: boolean;
      switch (code) {
        case 1: success = this.location(p) === 255; break;
        case 2: success = this.location(p) === this.currentRoom; break;
        case 3: success = this.location(p) === 255 || this.location(p) === this.currentRoom; break;
        case 4: this.index(p, this.database.rooms.length, 'room'); success = this.currentRoom === p; break;
        case 5: success = this.location(p) !== this.currentRoom; break;
        case 6: success = this.location(p) !== 255; break;
        case 7: this.index(p, this.database.rooms.length, 'room'); success = this.currentRoom !== p; break;
        case 8: success = this.flag(p); break;
        case 9: success = !this.flag(p); break;
        case 10: success = this.carried() > 0; break;
        case 11: success = this.carried() === 0; break;
        case 12: success = this.location(p) !== 255 && this.location(p) !== this.currentRoom; break;
        case 13: success = this.location(p) !== 0; break;
        case 14: success = this.location(p) === 0; break;
        case 15: success = this.counter <= p; break;
        case 16: success = this.counter > p; break;
        case 17: success = this.location(p) === this.database.items[p].initialLocation; break;
        case 18: success = this.location(p) !== this.database.items[p].initialLocation; break;
        case 19: success = this.counter === p; break;
        default: throw new SabalError('Invalid condition.');
      }
      if (!success) return null;
    }
    return args;
  }
  private *automatic(): Flow {
    let continuation = false;
    for (const row of this.database.actions) {
      if (row.selector !== 0) continuation = false;
      if (Math.floor(row.selector / 150) !== 0) continue;
      const chance = this.chance(row.selector % 150);
      if (!chance && !continuation) continue;
      const args = this.conditions(row);
      if (args === null) continue;
      const continues = yield* this.actions(row, args);
      continuation ||= continues;
      if (this.ended) return;
    }
  }
  private *search(verb: number, noun: number, fallback: boolean): Flow {
    let matched = false;
    for (let i = 0; i < this.database.actions.length; i++) {
      const row = this.database.actions[i];
      if (Math.floor(row.selector / 150) !== verb || (row.selector % 150 !== 0 && row.selector % 150 !== noun)) continue;
      matched = true;
      const args = this.conditions(row);
      if (args === null) continue;
      const continuation = yield* this.actions(row, args);
      if (this.ended) return;
      if (continuation) {
        for (i++; i < this.database.actions.length && this.database.actions[i].selector === 0; i++) {
          const next = this.database.actions[i];
          this.chance(0);
          const params = this.conditions(next);
          if (params !== null) yield* this.actions(next, params);
          if (this.ended) return;
        }
      }
      return;
    }
    if (!fallback) return;
    if (verb === 10 || verb === 18) { yield* this.generic(verb); return; }
    yield this.response(matched ? "I can't do that yet. " : "I don't understand your command. ");
  }
  private *generic(verb: number): Flow {
    const get = verb === 10;
    if (fold(this.noun) === 'ALL') { yield* this.bulk(get); return; }
    const noun = lookup(this.database, this.noun, this.database.vocabulary.nouns);
    if (noun === -1) { yield this.response('What ? '); return; }
    if (get && this.carried() === this.database.header.carryingLimit) { yield this.response("I've too much to carry. "); return; }
    const spelling = noun < 0 ? this.noun : this.database.vocabulary.nouns[noun];
    const width = this.database.header.wordLength;
    const i = this.database.items.findIndex((item, i) => this.locations[i] === (get ? this.currentRoom : 255)
      && item.automaticWord !== null && fold(item.automaticWord.slice(0, width)) === fold(spelling.slice(0, width)));
    if (i === -1) { yield this.response(get ? "It's beyond my power to do that. " : "It's beyond my power to do that.\n"); return; }
    this.moveItem(i, get ? 255 : this.currentRoom); this.redraw = true;
    yield this.response('O.K. ');
  }
  private *bulk(get: boolean): Flow {
    if (get && this.dark()) { yield this.response('It is dark.\n'); return; }
    let transferred = false;
    for (let i = 0; i < this.database.items.length; i++) {
      const item = this.database.items[i];
      if (this.locations[i] !== (get ? this.currentRoom : 255) || item.automaticWord === null || item.automaticWord.startsWith('*')) continue;
      const noun = lookup(this.database, item.automaticWord, this.database.vocabulary.nouns);
      yield* this.search(get ? 10 : 18, noun, false);
      if (this.ended) return;
      if (get && this.carried() === this.database.header.carryingLimit) { yield this.response("I've too much to carry. "); return; }
      this.moveItem(i, get ? 255 : this.currentRoom); this.redraw = true; transferred = true;
      yield this.response(`${item.text}: O.K.\n`);
    }
    if (!transferred) yield this.response(get ? 'Nothing taken.' : 'Nothing dropped.\n');
  }
  private *actions(row: ActionRow, args: number[]): Flow<boolean> {
    let position = 0, continuation = false;
    const arg = (): number => {
      if (position >= args.length) throw new MissingArgumentError('Missing action argument.');
      return args[position++];
    };
    const roomArg = (): number => this.index(arg(), this.database.rooms.length, 'room');
    // Action codes. 1 to 51 and 102 and above print messages. 0 is a no-op.
    // 71 suspends for a save identifier. 88 suspends for a two-second wait.
    // 90 to 101, and any other unused code, yield a diagnostic.
    for (const code of row.actions) {
      if (code >= 1 && code <= 51 || code >= 102) {
        const index = code >= 102 ? code - 50 : code;
        yield this.response(this.database.messages[this.index(index, this.database.messages.length, 'message')] + '\n');
        continue;
      }
      let i: number, j: number, old: number, n: number;
      switch (code) {
        case 0: break;
        case 52:
          if (this.carried() === this.database.header.carryingLimit) { yield this.response("I've too much to carry! "); break; }
          i = arg(); if (this.location(i) === this.currentRoom) this.redraw = true; this.moveItem(i, 255); break;
        case 53: this.moveItem(arg(), this.currentRoom); this.redraw = true; break;
        case 54: this.currentRoom = roomArg(); this.redraw = true; break;
        case 55: case 59:
          i = arg(); if (this.location(i) === this.currentRoom) this.redraw = true; this.moveItem(i, 0); break;
        case 56: this.setFlag(15, true); break;
        case 57: this.setFlag(15, false); break;
        case 58: this.setFlag(arg(), true); break;
        case 60: this.setFlag(arg(), false); break;
        case 61:
          yield this.response('I am dead.\n'); this.setFlag(15, false); this.currentRoom = this.database.header.highestRoom; yield this.roomEvent(); break;
        case 62: i = arg(); this.moveItem(i, arg()); this.redraw = true; break;
        case 63: yield* this.gameOver(); return continuation;
        case 64: case 76: yield this.roomEvent(); break;
        case 65: {
          const target = this.database.header.treasureCount;
          if (target === 0) throw new SabalError('Cannot score with zero declared treasures.');
          n = this.database.items.filter((item, index) => item.text.startsWith('*') && this.locations[index] === this.database.header.treasureRoom).length;
          yield this.response(`I've stored ${n}  treasures.  On a scale of 0 to 100, that rates ${Math.floor(n * 100 / target)} .\n`);
          if (n === target) { yield this.response('Well done.\n'); yield* this.gameOver(); return continuation; }
          break;
        }
        case 66: {
          const items = this.database.items.filter((_, index) => this.locations[index] === 255);
          yield this.response("I'm carrying:\n" + (items.map(item => item.text).join(' - ') || 'Nothing') + '.\n'); break;
        }
        case 67: this.setFlag(0, true); break;
        case 68: this.setFlag(0, false); break;
        case 69:
          this.light = this.database.header.lightTime; if (this.location(9) === this.currentRoom) this.redraw = true; this.moveItem(9, 255); this.setFlag(16, false); break;
        case 70: yield { kind: 'clear-response' }; break;
        case 71: yield { kind: 'save-prompt', text: 'Filename: ' }; break;
        case 72:
          i = arg(); j = arg(); old = this.location(i); n = this.location(j);
          if (old === this.currentRoom || n === this.currentRoom) this.redraw = true;
          this.moveItem(i, n); this.moveItem(j, old); break;
        case 73: continuation = true; break;
        case 74: i = arg(); if (this.location(i) === this.currentRoom) this.redraw = true; this.moveItem(i, 255); break;
        case 75:
          i = arg(); j = arg(); if (this.location(i) === this.currentRoom || this.location(j) === this.currentRoom) this.redraw = true;
          this.moveItem(i, this.location(j)); break;
        case 77: if (this.counter >= 0) this.counter--; break;
        case 78: yield this.response(`${this.counter} `); break;
        case 79: this.counter = arg(); break;
        case 80: [this.currentRoom, this.savedRoom] = [this.savedRoom, this.currentRoom]; this.redraw = true; break;
        case 81:
          n = this.index(arg(), 16, 'counter register'); [this.counter, this.counters[n]] = [this.counters[n], this.counter]; break;
        case 82: this.counter += arg(); break;
        case 83: this.counter = Math.max(-1, this.counter - arg()); break;
        case 84: yield this.response(this.noun); break;
        case 85: yield this.response(this.noun + '\n'); break;
        case 86: yield this.response('\n'); break;
        case 87:
          n = this.index(arg(), 16, 'room register'); [this.currentRoom, this.roomRegisters[n]] = [this.roomRegisters[n], this.currentRoom]; this.redraw = true; break;
        case 88: yield { kind: 'wait', milliseconds: 2000 }; break;
        case 89: arg(); break;
        default: yield { kind: 'diagnostic', text: `Unknown action ${code} [Param begins ${args[position] ?? 0} ${args[position + 1] ?? 0}]\n` };
      }
    }
    return continuation;
  }
  private *updateLight(): Flow {
    if (this.locations[9] === undefined || this.locations[9] === 0 || this.light === -1) return;
    this.light--;
    if (this.light < 1) { this.setFlag(16, true); if (this.nearby()) yield this.response('Your light has run out. '); }
    else if (this.light < 25 && this.light % 5 === 0 && this.nearby()) yield this.response('Your light is growing dim. ');
  }
  serializeSave(): string {
    const lines = this.counters.map((counter, i) => `${counter} ${this.roomRegisters[i]}`);
    lines.push(`${this.flags | 0} ${this.flag(15) ? 1 : 0} ${this.currentRoom} ${this.counter} ${this.savedRoom} ${this.light}`);
    lines.push(...this.locations.map(String));
    return lines.join('\n') + '\n';
  }
  private restore(text: string): void {
    const fields = text.trim().split(/[ \t\r\n]+/);
    const count = 38 + this.locations.length;
    if (fields.length < count || fields.slice(0, count).some(s => !/^[+-]?\d+$/.test(s))) throw new SaveError('Invalid or truncated save.');
    // Native long widths vary. Keep all required flag bits even when the host's
    // decimal long is wider than JavaScript's exact Number integer range.
    const values = fields.slice(0, count).map((field, i) => i === 32 ? Number(BigInt.asIntN(32, BigInt(field))) : Number(field));
    if (values.some(n => !Number.isSafeInteger(n))) throw new SaveError('Save integer outside safe range.');
    this.index(values[34], this.database.rooms.length, 'room');
    for (let i = 0; i < 16; i++) { this.counters[i] = values[2 * i]; this.roomRegisters[i] = values[2 * i + 1]; }
    this.flags = values[32] | 0;
    if (values[33] !== 0) this.setFlag(15, true);
    [this.currentRoom, this.counter, this.savedRoom, this.light] = values.slice(34, 38);
    this.locations = values.slice(38).map(byte);
  }
}
export function createSession(database: Database, options?: Options): Session { return new Session(database, options); }
