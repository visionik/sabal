// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Tests that start with condition codes 1 to 19, then cover related
// action, room, and parser cases that share the same fixture helpers.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, loadDatabase, InvalidIndexError } from '../dist/index.js';
import { db, start, source, row, cond, param, text, fields, rooms } from './fixture.mjs';

// For each predicate, supply one satisfying and one failing state. Item zero's
// immutable initial location is one, independent of the restored location.
const cases = [
  [1,0,{ location:255 },{ location:1 }],
  [2,0,{ location:1 },{ location:255 }],
  [3,0,{ location:255 },{ location:2 }],
  [4,1,{ room:1 },{ room:2 }],
  [5,0,{ location:2 },{ location:1 }],
  [6,0,{ location:1 },{ location:255 }],
  [7,1,{ room:2 },{ room:1 }],
  [8,31,{ flags:-2147483648 },{ flags:0 }],
  [9,31,{ flags:0 },{ flags:-2147483648 }],
  [10,999,{ location:255 },{ location:1 }],
  [11,999,{ location:1 },{ location:255 }],
  [12,0,{ location:2 },{ location:255 }],
  [13,0,{ location:1 },{ location:0 }],
  [14,0,{ location:0 },{ location:1 }],
  [15,7,{ counter:7 },{ counter:8 }],
  [16,7,{ counter:8 },{ counter:7 }],
  [17,0,{ location:1 },{ location:255 }],
  [18,0,{ location:255 },{ location:1 }],
  [19,7,{ counter:7 },{ counter:6 }]
];
for (const [code,p,pass,fail] of cases) {
  test(`condition ${code} true/false semantics`, () => {
    const database = db({ items:[['key/KEY/',1]], rows:[row(7,0,[1],[cond(code,p)]),row(7,0,[2])] });
    const fresh = fields(createSession(database));
    for (const [state, expected] of [[pass,'message1\n'],[fail,'message2\n']]) {
      const saved = [...fresh];
      saved[32]=state.flags??0; saved[34]=state.room??1; saved[35]=state.counter??0; saved[38]=state.location??1;
      const session = createSession(database,{restoreText:saved.join(' ')});
      assert.equal(text(session.submitCommand('do')),expected);
    }
  });
}
test('16-bit unsigned row conversion applies to negative parameter tokens',()=>{
  const raw = source({rows:[row(7,0,[79,78],[param(7)])]}).split('\n');
  // Header then selector then first condition: -65516 converts to 20.
  raw[13] = '-65516';
  const database = loadDatabase(raw.join('\n'));
  assert.equal(database.actions[0].conditions[0],20);
  assert.equal(text(createSession(database).submitCommand('do')),'1 ');
});
test('flag set/clear dedicated and indexed actions preserve bit 31',()=>{
  const s = start({rows:[row(7,0,[58,67],[param(31)]),row(8,0,[60,68],[param(31)])]});
  s.submitCommand('do'); assert.equal(fields(s)[32],-2147483647);
  s.submitCommand('noun'); assert.equal(fields(s)[32],0);
});
test('get actions 52 and 74 carry and request redraw only when originally here',()=>{
  const s = start({items:[['key',1],['rock',2]],rows:[row(7,0,[52],[param(0)]),row(8,0,[74],[param(1)])]});
  assert.equal(rooms(s.submitCommand('do')).length,1); assert.equal(fields(s)[38],255);
  assert.equal(rooms(s.submitCommand('noun')).length,0); assert.equal(fields(s)[39],255);
});
test('safe invalid item and register indices throw',()=>{
  for (const [code,n] of [[52,100],[81,16],[87,16]]) {
    const s = start({rows:[row(7,0,[code],[param(n)])]});
    assert.throws(()=>s.submitCommand('do'),InvalidIndexError);
  }
});
test('ALL checks eligibility as it reaches each item, not a snapshot',()=>{
  const s = start({items:[['key/KEY/',1],['rock/ROCK/',2]],rows:[row(10,7,[53],[param(1)])]});
  assert.equal(text(s.submitCommand('get all')),'key: O.K.\nrock: O.K.\n');
  assert.deepEqual(fields(s).slice(38),[255,255]);
});
test('single get has no darkness test and individual starred automatic words retain their star',()=>{
  const s = start({items:[['ordinary/KEY/',1],['special/*KEY/',1]],rows:[row(7,0,[56])],nouns:{12:'*KEY'}});
  s.submitCommand('do');
  assert.equal(text(s.submitCommand('get key')),'O.K. ');
  assert.equal(text(s.submitCommand('get key')),"It's beyond my power to do that. ");
});
test('bare direction with second field retains that field for next automatic row',()=>{
  const s = start({rows:[row(0,100,[85])]});
  assert.equal(text(s.submitCommand('north KeY')),"I can't go in that direction. KeY\n");
});
test('room descriptions remove exactly one leading star',()=>{
  for(const [description, line] of [['*','\n'],['**hidden','*hidden\n']]) {
    const s = start({treasureRoom:1, rooms:[[0,0,0,0,0,0,'zero'],[0,0,0,0,0,0,description]]});
    assert.equal(rooms(s.initialResult)[0],line+'\nObvious exits: none.\n\n');
  }
});
test('room output lists all exits and objects with exact separators and treasure stars',()=>{
  const s = start({items:[['*gold/GOLD/',1],['table',1]],rooms:[[0,0,0,0,0,0,'zero'],[2,2,2,2,2,2,'quiet alcove'],[0,0,0,0,0,0,'other']]});
  assert.equal(rooms(s.initialResult)[0],"I'm in a quiet alcove\n\nObvious exits: North, South, East, West, Up, Down.\n\nI can also see: *gold - table\n");
});
test('room 255 lists carried items by equality',()=>{
  const allRooms = Array.from({length:256},()=>[0,0,0,0,0,0,'room']);
  const database = db({rooms:allRooms,items:[['carried',255]]});
  const save = fields(createSession(database)); save[34]=255;
  assert.ok(rooms(createSession(database,{restoreText:save.join(' ')}).initialResult)[0].includes('I can also see: carried\n'));
});
test('zero and lower score exact strings',()=>{
  const s = start({rows:[row(4,0,[65])]});
  assert.equal(text(s.submitCommand('score')),"I've stored 0  treasures.  On a scale of 0 to 100, that rates 0 .\n");
});
test('all seven letter expansions are vocabulary-driven directions or inventory',()=>{
  for(const abbreviation of ['n','s','e','w','u','d']) {
    assert.equal(text(start().submitCommand(abbreviation)),"I can't go in that direction. ");
  }
});
test('automatic refill does not tick until a command, then refills again on next auto pass',()=>{
  const items = Array.from({length:10},()=>['internal',0]);
  const s = start({items,light:21,rows:[row(7),row(0,100,[69])]});
  assert.equal(fields(s)[37],21);
  assert.equal(text(s.submitCommand('do')),'Your light is growing dim. ');
  assert.equal(fields(s)[37],21);
});
test('non-movement verb 1 with another recognized noun follows ordinary search',()=>{
  const s = start({rows:[row(1,7,[1])]});
  assert.equal(text(s.submitCommand('go key')),'message1\n');
});
