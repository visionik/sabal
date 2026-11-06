import { loadDatabase, createSession } from '../dist/index.js';
export const quote = s => '"' + s.replaceAll('"', '""') + '"';
export function row(verb = 7, noun = 0, codes = [], conditions = []) {
  const a = [...codes, 0, 0, 0, 0];
  return [verb * 150 + noun, ...[...conditions, 0, 0, 0, 0, 0].slice(0, 5), a[0] * 150 + a[1], a[2] * 150 + a[3]];
}
export const param = n => 20 * n;
export const cond = (c, n = 0) => 20 * n + c;
export function source(options = {}) {
  const items = options.items ?? Array.from({ length: 10 }, (_, i) => [i === 0 ? 'void' : i === 9 ? 'lamp/LAMP/' : `item${i}`, 0]);
  const rows = options.rows ?? [row()];
  const verbs = Array.from({ length: 21 }, (_, i) => `V${i}`);
  Object.assign(verbs, { 1: 'GO', 2: 'LOOK', 3: 'INVENTORY', 4: 'SCORE', 5: 'SAVE', 6: 'WAIT', 7: 'DO', 8: 'NOUN', 9: 'QUIT', 10: 'GET', 11: '*TAKE', 18: 'DROP' }, options.verbs);
  const nouns = Array.from({ length: 21 }, (_, i) => `Z${i}`);
  Object.assign(nouns, { 1: 'NORTH', 2: 'SOUTH', 3: 'EAST', 4: 'WEST', 5: 'UP', 6: 'DOWN', 7: 'KEY', 8: '*KEYS', 9: 'ROCK', 10: 'COIN', 11: 'LAMP' }, options.nouns);
  const rooms = options.rooms ?? [[0, 0, 0, 0, 0, 0, '*storage'], [0, 0, 0, 0, 0, 0, 'quiet alcove'], [0, 0, 0, 0, 0, 0, '*cavern']];
  const messages = options.messages ?? Array.from({ length: 61 }, (_, i) => `message${i}`);
  const header = [0, items.length - 1, rows.length - 1, 20, rooms.length - 1, options.limit ?? 5, 1, options.treasures ?? 5, options.width ?? 3, options.light ?? 100, messages.length - 1, options.treasureRoom ?? 2];
  return [...header, ...rows.flat(), ...verbs.flatMap((v, i) => [quote(v), quote(nouns[i])]), ...rooms.flatMap(r => [...r.slice(0, 6), quote(r[6])]), ...messages.map(quote), ...items.flatMap(([s, n]) => [quote(s), n]), ...rows.map(() => quote(options.comment ?? '')), 416, 1, 0].join('\n');
}
export const db = options => loadDatabase(source(options));
export const start = options => createSession(db(options), { random: () => 0 });
export const text = result => result.events.filter(e => e.kind === 'response').map(e => e.text).join('');
export const rooms = result => result.events.filter(e => e.kind === 'room').map(e => e.text);
export const fields = s => s.serializeSave().trim().split(/\s+/).map(Number);
