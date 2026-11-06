// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Engine tests for loading, commands, movement, saves, waits, and actions.
// Invented games come from fixture.mjs. Corpus files are only loaded and started.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadDatabase, createSession, DatabaseError, SaveError, InvalidIndexError, MissingArgumentError, SessionStateError } from '../dist/index.js';
import { source, db, start, row, param, cond, text, rooms, fields } from './fixture.mjs';

for (const file of readdirSync(new URL('../corpus/', import.meta.url))) {
  test(`corpus ${file} loads, freezes and starts`, () => {
    const database = loadDatabase(readFileSync(new URL('../corpus/' + file, import.meta.url), 'utf8'));
    assert.ok(Object.isFrozen(database));
    assert.ok(Object.isFrozen(database.actions[0].conditions));
    for (const draw of [0, 96]) {
      const s = createSession(database, { random: () => draw });
      assert.equal(s.initialResult.events[0].kind, 'room');
      assert.equal(s.initialResult.status, 'need-command');
      assert.equal(s.initialResult.events.at(-1).text, '\nTell me what to do ? ');
    }
  });
}

test('header has twelve fields, inclusive zero records, metadata and unused integer', () => {
  const d = db({ items: [['void', -257]], comment: 'comment`"' });
  assert.equal(d.items.length, 1); assert.equal(d.items[0].initialLocation, 255);
  assert.equal(d.header.unused, 0); assert.equal(d.version, 416); assert.equal(d.adventureNumber, 1);
  assert.equal(d.comments[0], 'comment""');
  assert.throws(() => { d.items[0].initialLocation = 1; }, TypeError);
});
test('loader quote grammar, multiline strings, doubled quotes and backticks, not escapes', () => {
  const d = db({ messages: ['one\n"two"`\\n'] });
  assert.equal(d.messages[0], 'one\n"two""\\n');
});
test('loader exact typed diagnostics', () => {
  for (const bad of ['', '0 1 2', source().replace(/^0/, 'oops'), source().replace(/^0\n9/, '0\n-1')]) {
    assert.throws(() => loadDatabase(bad), e => e instanceof DatabaseError && e.message === 'Invalid database(bad header).\n');
  }
  const header = source().split('\n').slice(0, 12).join(' ');
  assert.throws(() => loadDatabase(header + ' nope'), { message: 'Bad action line (0)\n' });
  const action = row().join(' ');
  assert.throws(() => loadDatabase(header + ' ' + action + ' noquote'), { message: 'Initial quote expected.\n' });
  assert.throws(() => loadDatabase(header + ' ' + action + ' "unterminated'), { message: 'EOF in string.\n' });
  assert.throws(() => db({ rows: [row(7, 0, [149])], messages: ['zero'] }), InvalidIndexError);
  assert.throws(() => db({ nouns: { 1: '*NORTH' } }), DatabaseError);
});
const itemCases = [
  ['small key/KEY/', 'small key', 'KEY'], ['small key/KEY', 'small key', 'KEY'],
  ['small key/', 'small key', ''], ['small key', 'small key', null],
  ['small key/KEY/extra', 'small key', 'KEY'], ['label//', 'label//', '//'],
  ['label/*', 'label/*', '/*'], ['//x', '', ''], ['/*x', '', '*x'], ['*gold coin/GOLD/', '*gold coin', 'GOLD']
];
for (const [raw, displayed, automatic] of itemCases) test(`item string ${raw}`, () => {
  const item = db({ items: [[raw, 256]] }).items[0];
  assert.equal(item.text, displayed); assert.equal(item.automaticWord, automatic); assert.equal(item.initialLocation, 0);
});
test('initial look exact, leading room star, and prompt retry', () => {
  const s = start();
  assert.deepEqual(rooms(s.initialResult), ["I'm in a quiet alcove\n\nObvious exits: none.\n\n"]);
  for (const command of ['', '  \t', 'xyz']) {
    const result = s.submitCommand(command);
    assert.equal(result.events.at(-1).kind, 'command-prompt');
    assert.equal(text(result), command === 'xyz' ? "You use word(s) I don't know! " : '');
  }
});
test('bounded scanner retains original second field and ignores subsequent input', () => {
  const s = start({ rows: [row(7, 0, [85])], verbs: { 7: 'SUPERCALI' } });
  assert.equal(text(s.submitCommand('SUPERCALIFRAGILISTIC ignored')), 'FRAGILIST\n');
  const a = start({ rows: [row(8, 0, [84, 86])] });
  assert.equal(text(a.submitCommand('noun KeYs junk')), 'KeYs\n');
});
test('vocabulary prefix length, synonyms, index zero and short words', () => {
  const s = start({ rows: [row(7, 7, [1])], verbs: { 0: 'ZERO' } });
  assert.equal(text(s.submitCommand('do keys')), 'message1\n');
  assert.equal(text(s.submitCommand('do k')), "I don't understand your command. ");
  assert.equal(text(s.submitCommand('zero')), "You use word(s) I don't know! ");
  assert.equal(text(s.submitCommand('do keyyyyy')), 'message1\n');
});
test('missing noun is looked up as empty, noun wildcard accepts unknown', () => {
  const s = start({ rows: [row(7, 12, [1]), row(8, 0, [85])], nouns: { 12: '' } });
  assert.equal(text(s.submitCommand('do')), 'message1\n');
  assert.equal(text(s.submitCommand('noun strange')), 'strange\n');
});
test('letter I expands only with empty second field and remains vocabulary driven', () => {
  const s = start({ rows: [row(3, 0, [66])] });
  assert.equal(text(s.submitCommand('i')), "I'm carrying:\nNothing.\n");
  assert.equal(text(s.submitCommand('i key')), "You use word(s) I don't know! ");
  assert.equal(text(s.submitCommand('l')), "You use word(s) I don't know! ");
});
test('direction recognition precedes verb lookup, bypasses scripts and remembers second field', () => {
  const s = start({ rows: [row(1, 1, [63]), row(8, 0, [85])], rooms: [[0,0,0,0,0,0,'zero'], [2,0,0,0,0,0,'quiet alcove'], [0,0,0,0,0,0,'*cavern']] });
  assert.equal(rooms(s.submitCommand('NORTH KEY'))[0], 'cavern\n\nObvious exits: none.\n\n');
  assert.equal(s.status, 'need-command');
  assert.equal(text(s.submitCommand('go')), 'Give me a direction too.');
  assert.equal(text(s.submitCommand('s')), "I can't go in that direction. ");
  assert.equal(text(s.submitCommand('N KEY')), "You use word(s) I don't know! ");
});
test('single get/drop maps synonyms, uses first matching item, exact failures', () => {
  const s = start({ items: [['void',0], ['small key/KEY/',1], ['other key/KEY/',1]] });
  assert.equal(text(s.submitCommand('take keys')), 'O.K. ');
  assert.equal(fields(s)[39], 255); assert.equal(fields(s)[40], 1);
  assert.equal(text(s.submitCommand('drop keys')), 'O.K. ');
  assert.equal(text(s.submitCommand('drop rock')), "It's beyond my power to do that.\n");
  assert.equal(text(s.submitCommand('get rock')), "It's beyond my power to do that. ");
  assert.equal(text(s.submitCommand('get xyz')), 'What ? ');
});
test('generic capacity uses equality; hidden carried objects count', () => {
  const s = start({ limit: 1, items: [['internal',255], ['key/KEY/',1]] });
  assert.equal(text(s.submitCommand('get key')), "I've too much to carry. ");
  const over = start({ limit: 1, items: [['internal',255], ['other',255], ['key/KEY/',1]] });
  assert.equal(text(over.submitCommand('get key')), 'O.K. ');
});
test('scripted get success disables fallback, failed predicates do not', () => {
  const items = [['key/KEY/',1]];
  const s = start({ items, rows: [row(10, 7, [], [cond(8,0)])] });
  assert.equal(text(s.submitCommand('get key')), 'O.K. ');
  const noOp = start({ items, rows: [row(10, 7)] });
  assert.equal(text(noOp.submitCommand('get key')), ''); assert.equal(fields(noOp)[38], 1);
});
test('ALL forces transfer after nested handler, retains noun, skips * words and no word', () => {
  const s = start({ rows: [row(10, 7, [85, 55], [param(0)])], items: [['key/KEY/',1], ['rock/ROCK/',1], ['hidden/*KEY/',1], ['fixed',1]] });
  assert.equal(text(s.submitCommand('get aLl')), 'aLl\nkey: O.K.\nrock: O.K.\n');
  assert.deepEqual(fields(s).slice(38), [255,255,1,1]);
  assert.equal(text(s.submitCommand('drop ALL')), 'key: O.K.\nrock: O.K.\n');
});
test('ALL empty outputs, full spelling and post-handler capacity exit', () => {
  const s = start();
  assert.equal(text(s.submitCommand('get all')), 'Nothing taken.');
  assert.equal(text(s.submitCommand('drop all')), 'Nothing dropped.\n');
  assert.equal(text(s.submitCommand('get alls')), 'What ? ');
  const full = start({ limit: 1, items: [['key/KEY/',1]], rows: [row(10, 7, [74], [param(0)])] });
  assert.equal(text(full.submitCommand('get all')), "I've too much to carry. ");
});
test('nested ALL can suspend or terminate without forced transfer', () => {
  const s = start({ items: [['key/KEY/',1]], rows: [row(10,7,[71,88,63])] });
  assert.equal(s.submitCommand('get all').status, 'need-save-identifier');
  assert.equal(s.provideSaveIdentifier('id').status, 'need-wait');
  const result = s.notifyWaitComplete();
  assert.equal(result.status, 'terminated'); assert.equal(text(result), 'The game is now over.\n'); assert.equal(fields(s)[38], 1);
});
test('player continuation draws, persists across failed and no-op zero rows, stops at nonzero', () => {
  let draws = 0;
  const s = createSession(db({ rows: [row(7,0,[73,1]), row(0,0,[2],[cond(8,0)]), row(0,0,[3]), row(0,0,[4]), row(0,100,[5]), row(0,0,[6])] }), { random: () => { draws++; return 96; } });
  assert.equal(text(s.initialResult), 'message5\n'); assert.equal(draws, 5);
  const result = s.submitCommand('do');
  assert.equal(text(result), 'message1\nmessage3\nmessage4\nmessage5\n'); assert.equal(draws, 13);
});
test('automatic pass considers entire table and draw sites even impossible conditions', () => {
  const draws = [96,0,96,0]; let used = 0;
  const s = createSession(db({ rows: [row(0,100,[1]), row(7), row(0,1,[2]), row(0,0,[3],[cond(8,0)]), row(0,100,[4])] }), { random: () => draws[used++] });
  assert.equal(text(s.initialResult), 'message1\nmessage2\nmessage4\n'); assert.equal(used, 4);
});
test('automatic continuation overrides chance zero but still draws', () => {
  let draws = 0;
  const s = createSession(db({ rows: [row(0,100,[73,1]), row(0,0,[2]), row(0,0,[3])] }), { random: () => { draws++; return 96; } });
  assert.equal(text(s.initialResult), 'message1\nmessage2\nmessage3\n'); assert.equal(draws,3);
});
test('automatic termination discards pending redraw, stops scan and prompt', () => {
  const s = start({ rows: [row(0,100,[54,63],[param(2)]), row(0,100,[1])] });
  assert.equal(s.status, 'terminated'); assert.equal(text(s.initialResult), 'The game is now over.\n');
  assert.equal(rooms(s.initialResult).length, 1);
  assert.throws(() => s.submitCommand('do'), SessionStateError);
});
test('matching failure vs unknown search vs successful no-op', () => {
  const s = start({ rows: [row(7,0,[],[cond(8,0)]), row(8)] });
  assert.equal(text(s.submitCommand('do')), "I can't do that yet. ");
  assert.equal(text(s.submitCommand('look')), "I don't understand your command. ");
  assert.equal(text(s.submitCommand('noun')), '');
});
test('messages use same low index and upper index minus fifty', () => {
  const s = start({ rows: [row(7,0,[1,51,102,110])] });
  assert.equal(text(s.submitCommand('do')), 'message1\nmessage51\nmessage52\nmessage60\n');
});
test('unknown action diagnoses without consuming arguments and continues', () => {
  const s = start({ rows: [row(7,0,[90,79,78],[param(7),param(21)])] });
  const result = s.submitCommand('do');
  assert.equal(result.events[0].kind, 'diagnostic');
  assert.equal(result.events[0].text, 'Unknown action 90 [Param begins 7 21]\n');
  assert.equal(text(result), '7 ');
});
test('action 52 failure consumes no argument and does not cancel later actions', () => {
  const s = start({ limit: 1, items: [['carried',255]], rows: [row(7,0,[52,79,78],[param(7),param(21)])] });
  assert.equal(text(s.submitCommand('do')), "I've too much to carry! 7 ");
});
test('actions consume only arguments, invalid indices and missing args throw typed errors', () => {
  const s = start({ rows: [row(7,0,[62],[param(7),param(21)])] });
  s.submitCommand('do'); assert.equal(fields(s)[45],21);
  const missing = start({ rows: [row(7,0,[79],Array(5).fill(cond(9,0)))] });
  assert.throws(() => missing.submitCommand('do'), MissingArgumentError);
  const invalid = start({ rows: [row(7,0,[58],[param(32)])] });
  assert.throws(() => invalid.submitCommand('do'), InvalidIndexError);
});
test('counter decrement, floor, arithmetic, assignment and exchange', () => {
  const s = start({ rows: [row(7,0,[77,78,77,78]), row(8,0,[79,82,83,78],[param(7),param(21),param(30)]), row(2,0,[79,81,78],[param(9),param(15)]), row(3,0,[81,78],[param(15)])] });
  assert.equal(text(s.submitCommand('do')), '-1 -1 ');
  assert.equal(text(s.submitCommand('noun')), '-1 ');
  assert.equal(text(s.submitCommand('look')), '0 ');
  assert.equal(text(s.submitCommand('inventory')), '9 ');
});
test('room registers and saved room are separate exchanges', () => {
  const s = start({ rows: [row(7,0,[80]), row(8,0,[87],[param(15)])] });
  s.submitCommand('do'); assert.equal(fields(s)[36],1); assert.equal(fields(s)[34],0);
  s.submitCommand('noun'); assert.equal(fields(s)[31],0); assert.equal(fields(s)[34],0);
  s.submitCommand('do'); assert.equal(fields(s)[34],1);
});
test('item move, exchange, copy, byte conversion and removal actions', () => {
  const s = start({ items: [['a',1],['b',255]], rows: [row(7,0,[72,75],[param(0),param(1),param(1),param(0)]), row(8,0,[62],[param(0),param(256)]), row(2,0,[53,59],[param(0),param(1)])] });
  s.submitCommand('do'); assert.deepEqual(fields(s).slice(38), [255,255]);
  s.submitCommand('noun'); assert.equal(fields(s)[38],0);
  s.submitCommand('look'); assert.deepEqual(fields(s).slice(38),[1,0]);
});
test('inventory includes all carried objects in index order with exact punctuation', () => {
  const s = start({ items: [['hidden',255],['*gold/GOLD/',255],['ordinary',255]], rows: [row(3,0,[66])] });
  assert.equal(text(s.submitCommand('i')), "I'm carrying:\nhidden - *gold - ordinary.\n");
});
test('score stored vs carried and exact victory text', () => {
  const s = start({ treasures: 6, items: [['*a',2],['*b',2],['*c',2],['*d',255],['not treasure',2]], rows: [row(4,0,[65])] });
  assert.equal(text(s.submitCommand('score')), "I've stored 3  treasures.  On a scale of 0 to 100, that rates 50 .\n");
  const win = start({ treasures: 1, items: [['*coin',2]], rows: [row(4,0,[65,1])] });
  const result = win.submitCommand('score');
  assert.equal(text(result), "I've stored 1  treasures.  On a scale of 0 to 100, that rates 100 .\nWell done.\nThe game is now over.\n"); assert.equal(result.status,'terminated');
});
test('score zero denominator is safely rejected', () => {
  const s = start({ treasures:0, rows:[row(4,0,[65])] });
  assert.throws(() => s.submitCommand('score'), /zero declared treasures/);
});
test('pending redraw has pre-automatic and post-automatic checkpoints, immediate look does not clear it', () => {
  const s = start({ rows: [row(7,0,[54,64],[param(2)]), row(0,100,[54],[param(1)])] });
  const result = s.submitCommand('do');
  assert.equal(rooms(result).length,3);
  assert.ok(rooms(result)[0].startsWith('cavern\n'));
  assert.ok(rooms(result)[1].startsWith('cavern\n'));
  assert.ok(rooms(result)[2].startsWith("I'm in a quiet alcove\n"));
});
test('darkness does not request redraw; dark look, ALL and fatal movement exact', () => {
  const s = start({ rows: [row(7,0,[56]),row(2,0,[64])] });
  assert.deepEqual(rooms(s.submitCommand('do')), []);
  assert.deepEqual(rooms(s.submitCommand('look')), ["I can't see. It is too dark!\n"]);
  assert.equal(text(s.submitCommand('get all')), 'It is dark.\n');
  const result = s.submitCommand('n');
  assert.equal(text(result), 'Dangerous to move in the dark! I fell down and broke my neck. ');
  assert.equal(result.status,'terminated'); assert.equal(fields(s)[34],1);
});
test('death action clears darkness, displays death room but is not termination', () => {
  const s = start({ rows: [row(7,0,[56,61])] });
  const result = s.submitCommand('do');
  assert.equal(text(result),'I am dead.\n'); assert.equal(result.status,'need-command');
  assert.ok(rooms(result)[0].startsWith('cavern\n'));
});
test('lamp exhaustion 1 -> 0 -> -1 then sentinel, still visible and carried', () => {
  const items = Array.from({length:10},(_,i)=>[i===9?'lamp/LAMP/':'internal',i===9?255:0]);
  const s = start({ items, light:1, rows:[row(7,0,[56]),row(2,0,[64])] });
  assert.equal(text(s.submitCommand('do')),'Your light has run out. ');
  assert.equal(text(s.submitCommand('look')),'Your light has run out. ');
  assert.equal(text(s.submitCommand('do')),''); assert.equal(fields(s)[37],-1); assert.equal(fields(s)[47],255);
  assert.ok(rooms(s.submitCommand('look'))[0].startsWith("I'm in a quiet alcove"));
});
test('lamp positive warnings at 20 not 24, distant timer runs without warning, retries do not tick', () => {
  const items = Array.from({length:10},(_,i)=>['internal',i===9?255:0]);
  const s = start({ items, light:25 });
  s.submitCommand('xyz'); s.submitCommand(''); assert.equal(fields(s)[37],25);
  assert.equal(text(s.submitCommand('do')),'');
  for(let i=0;i<3;i++) s.submitCommand('do');
  assert.equal(text(s.submitCommand('do')),'Your light is growing dim. ');
  items[9][1]=2; const distant = start({items, light:1});
  assert.equal(text(distant.submitCommand('do')),''); assert.equal(fields(distant)[37],0);
});
test('refill carries lamp, clears flag16 but not darkness, followed by normal tick', () => {
  const items = Array.from({length:10},()=>['internal',0]);
  const s = start({ items, light:21, rows:[row(7,0,[56,58,69],[param(16)])] });
  assert.equal(text(s.submitCommand('do')),'Your light is growing dim. ');
  assert.equal(fields(s)[37],20); assert.equal(fields(s)[47],255);
  assert.equal(fields(s)[32] & (1<<16),0); assert.notEqual(fields(s)[32] & (1<<15),0);
});
test('save prompt suspends at exact action position, wait does not sleep or accept commands', () => {
  const s = start({ rows:[row(7,0,[79,71,88,78],[param(7)])] });
  let result = s.submitCommand('do'); assert.equal(result.status,'need-save-identifier');
  assert.equal(result.events.at(-1).text,'Filename: '); assert.equal(fields(s)[35],7);
  assert.throws(()=>s.submitCommand('do'),SessionStateError); assert.throws(()=>s.notifyWaitComplete(),SessionStateError);
  result = s.provideSaveIdentifier('any whole identifier');
  assert.equal(text(result),'\nSaved.\n'); assert.equal(result.status,'need-wait');
  assert.deepEqual(result.events.at(-1),{kind:'wait',milliseconds:2000});
  assert.throws(()=>s.submitCommand('do'),SessionStateError);
  result = s.notifyWaitComplete(); assert.equal(text(result),'7 '); assert.equal(result.status,'need-command');
});
test('save failure emits newline and resumes remaining actions', () => {
  const s = start({ rows:[row(5,0,[71,1])] });
  s.submitCommand('save'); assert.equal(text(s.provideSaveIdentifier('id',false)),'\nUnable to create save file.\nmessage1\n');
});
test('save format exact field order, startup restore CRLF, modulo and darkness OR semantics', () => {
  const d = db({items:[['key/KEY/',1]], rows:[row(7,0,[58,79],[param(31),param(7)])]});
  const s = createSession(d); s.submitCommand('do');
  const save = s.serializeSave(); assert.equal(save, '0 0\n'.repeat(16) + '-2147483648 0 1 7 0 100\n1\n');
  const t = createSession(d,{restoreText:save.replaceAll('\n','\r\n')}); assert.equal(t.serializeSave(),save);
  const values = fields(s); values[32]=1<<15; values[33]=0; values[38]=-257;
  const dark = createSession(d,{restoreText:values.join(' ')});
  assert.deepEqual(rooms(dark.initialResult),["I can't see. It is too dark!\n"]); assert.equal(fields(dark)[38],255);
  values[32]=0; values[33]=1;
  assert.equal(fields(createSession(d,{restoreText:values.join(' ')}))[32],1<<15);
  assert.throws(()=>createSession(d,{restoreText:'0 0'}),SaveError);
});
test('wide decimal flags preserve low 32 bits on restore', () => {
  const d = db();
  const save = createSession(d).serializeSave().split('\n');
  save[16] = '9223372034707292160 0 1 0 0 100'; // Low bits: bit 31
  const s = createSession(d, { restoreText: save.join('\n') });
  assert.equal(fields(s)[32], -2147483648);
});
test('startup wait and save suspend automatic processing without replaying actions', () => {
  const s = start({ rows: [row(0,100,[1,88,71,2]),row(0,100,[3])] });
  assert.equal(s.initialResult.status, 'need-wait'); assert.equal(text(s.initialResult), 'message1\n');
  assert.equal(s.notifyWaitComplete().status, 'need-save-identifier');
  const result = s.provideSaveIdentifier('id');
  assert.equal(text(result), '\nSaved.\nmessage2\nmessage3\n'); assert.equal(result.status,'need-command');
});
test('action 76 looks immediately; clearing darkness alone does not redraw', () => {
  const s = start({ rows: [row(7,0,[56,76,57]),row(2,0,[76])] });
  assert.deepEqual(rooms(s.submitCommand('do')), ["I can't see. It is too dark!\n"]);
  assert.equal(rooms(s.submitCommand('look'))[0], "I'm in a quiet alcove\n\nObvious exits: none.\n\n");
});
test('unknown action missing diagnostic slots use zero, with no argument consumption', () => {
  const s = start({rows:[row(7,0,[101,1],Array(5).fill(cond(9,0)))]});
  const result = s.submitCommand('do');
  assert.equal(result.events[0].text,'Unknown action 101 [Param begins 0 0]\n');
  assert.equal(text(result),'message1\n');
});
test('shared database sessions remain isolated and restore retains immutable initial locations', () => {
  const d = db({items:[['key/KEY/',1]]}); const a = createSession(d), b = createSession(d);
  a.submitCommand('get key'); assert.equal(fields(a)[38],255); assert.equal(fields(b)[38],1); assert.equal(d.items[0].initialLocation,1);
});
test('clear response and picture no-op have distinct effects', () => {
  const s = start({rows:[row(7,0,[1,70,89,2],[param(999)])]});
  assert.deepEqual(s.submitCommand('do').events.map(e=>e.kind),['response','clear-response','response','command-prompt']);
});
