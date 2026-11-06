# sabal

Scott Adams Bot Adventure Library: a headless, clean-room TypeScript engine for the
uncompressed Scott Adams text database format. MIT-licensed library, ESM, ES2022,
Node 20+ and browsers. No runtime dependencies, filesystem calls, sleeps, terminal
UI, or wire protocol.

## Build and test

```sh
npm install
npm run build
npm test
```

The package entry point exports `loadDatabase`, `createSession`, `Session`, public
types, and typed errors. Built JavaScript and declarations are in `dist/`.

## Start and play

The host obtains database **text** (for example with browser `fetch`, or its own
Node filesystem code). The engine never opens a database or a save file.

```ts
import { loadDatabase, createSession } from 'sabal';
import type { Event, StepResult } from 'sabal';

const database = loadDatabase(databaseText);
const session = createSession(database);

// Startup already performed the first look and automatic pass. Render these
// events before requesting input. Startup itself may request a save or wait.
render(session.initialResult);

function render(result: StepResult) {
  for (const event of result.events) present(event);
  // result.status tells the host what kind of input is permitted next.
}

function present(event: Event) {
  // Implement in the host; see the event contract below.
}

// When status is need-command:
render(session.submitCommand('GET KEY'));
```

`Database` is recursively frozen and exposes its header, rooms, messages, item
text/automatic words/immutable initial locations, vocabulary, decoded and packed
actions, comments, version, and adventure number. Share it freely between sessions.
Every session owns its mutable play state. `session.status` reports its current
status; each operation returns the ordered events produced by that operation.
`initialResult` is startup output, not a mid-turn execution snapshot.

### Events and statuses

| `event.kind` | Payload / presentation |
| --- | --- |
| `room` | `text`: replace the room display only |
| `response` | `text`: append to the response display |
| `clear-response` | Clear only the response display |
| `command-prompt` | `text`: `\nTell me what to do ? ` |
| `save-prompt` | `text`: `Filename: ` |
| `wait` | `milliseconds`: 2000; schedule a host delay |
| `diagnostic` | `text`: diagnostic, separate from narration |
| `terminated` | Session ended; accept no more input |

Preserve event order and logical text, including spaces and newlines. Do not
implicitly clear responses on a room replacement, redraw after every command,
or add terminal wrapping. Prompts are separate event kinds, not duplicated in
response text. A `StepResult.status` is one of `need-command`,
`need-save-identifier`, `need-wait`, or `terminated`.

Empty commands and unknown verbs return another command prompt without advancing
the turn. Recognized commands advance even when unsuccessful. The parser and
built-in movement/get/drop behavior use vocabulary numbers, not English meanings.
There is no built-in RESTORE command.

## Save and wait requests

A save suspends execution at the exact action position. While the status is
`need-save-identifier`, serialize the state **before** resuming. The host chooses
and stores the identifier; it need not be a filesystem path.

```ts
if (session.status === 'need-save-identifier') {
  const id = await askForSaveIdentifier(); // Whole line, not a two-word command
  const savedText = session.serializeSave();
  let ok = true;
  try {
    await saveStore.put(id, savedText); // Host-managed storage
  } catch {
    ok = false;
  }
  render(session.provideSaveIdentifier(id, ok));
}
```

`ok` defaults to `true`. Success emits `\n` then `Saved.\n`; failure emits `\n`
then `Unable to create save file.\n`. Both resume the remaining actions. There is
no separate failure method, and an identifier is required even on failure.

For `need-wait`, the host waits two seconds and then calls
`session.notifyWaitComplete()`. Render that returned result too. The library does
not sleep or accept a command during the wait. A resumed result may request
another save or wait, so hosts should handle requests repeatedly until they reach
`need-command` or `terminated`.

Calling a method for the wrong status throws `SessionStateError` without resuming
execution. Terminated sessions reject all input.

## Restore at startup

```ts
const restored = createSession(database, {
  restoreText: await saveStore.get(id),
});
render(restored.initialResult);
```

Restore precedes the first look and automatic pass. Saves use the reference
whitespace-separated decimal format: sixteen counter/room-register lines, one
six-field state line, then one item-location line per item. Serialization uses LF,
a signed 32-bit flags field and unsigned byte item locations. Readers also accept
CRLF and wider decimal flag fields, preserving bits 0–31. Malformed/truncated
save text throws `SaveError`; it is never partially applied. A host unable to
retrieve a save can display `Unable to restore game.` and create a fresh session.

Saves do **not** include remembered nouns, random state or execution state. They
are startup restores, not mid-turn snapshots. Saving during a suspended action
and restoring later starts the ordinary startup cycle rather than resuming the
remaining actions of that row.

## Deterministic chance tests

```ts
const shiftedDraws = [96, 0, 64, 128];
let index = 0;
const reproducible = createSession(database, {
  random: () => {
    if (index === shiftedDraws.length) throw new Error('Draw stream exhausted');
    return shiftedDraws[index++];
  },
});
```

`random` returns **unsigned left-shift results**, before `% 100`, not a uniform
0–99 roll or a floating-point probability. Supply nonnegative safe integers
divisible by four. Each chance test consumes one value, including chance 0/100,
impossible conditions, and zero-selector continuation rows. The default backend
uses host `Math.random` entropy and a 32-bit unsigned left shift by six; it is not
a C-library generator emulation. No seed-only or cross-platform native-generator
replay is promised. Restore does not rewind a draw stream.

## Scope and errors

Implemented from the supplied clean-room specification and written answers only:
all conditions 0–19, actions 0–89, both message ranges, diagnostics for 90–101,
two-word bounded parsing, synonyms, directions, ALL, counters/registers, light,
continuations, ordered automatic passes, deferred room redraws, and text saves.
Only the specified first-person/default-lamp profile is offered. Compressed
formats, binary machine formats, graphics, combat, historical lamp modes,
second-person modes, ACP, and portable mid-turn snapshots are excluded.

Typed errors include `DatabaseError`, `SaveError`, `InvalidIndexError`,
`MissingArgumentError`, and `SessionStateError`, all extending `SabalError`.
Specified diagnostics retain their exact text. Invalid message indices are
rejected while loading; state-dependent indices and missing arguments are checked
when reached. A score action with zero declared treasures throws rather than
dividing by zero. After a malformed-data execution error, discard that session.

Safe choices for undefined edges: reject orphan vocabulary synonyms, reject
out-of-range headers/indices, use zero for missing unknown-action diagnostic
slots, ignore data following version/adventure metadata, discard pending redraws
on termination, and use exact ordinary JavaScript integers for counters/rooms
without intentional overflow rules. Input accepts printable ASCII and space/tab/
CR/LF token separators; unsupported characters are rejected. Tiny invented games
without item 9 have no lamp timer or nearby lamp.

## Tests and fixtures

`test/` contains invented specification-based tests, not comparison-driver traces.
`corpus/` contains exactly the 18 text databases supplied with the clean-room
packet, used for load/startup tests. No external interpreters or databases were
consulted. The MIT license applies to this library's code and documentation;
game database content retains its respective owners' rights. Fixtures are not
included in the published package's `files` list.
