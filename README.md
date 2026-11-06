# SABAL

SABAL (Scott Adams Brass-lamp Adventure Library) is a headless TypeScript engine for the uncompressed Scott Adams text adventure database format. It is a library, not a game player you run by itself. Version 0.1.0 is MIT licensed, ESM, and ES2022. It runs on Node 20+ and in browsers, and it has no runtime dependencies.

The engine never touches the filesystem, never sleeps, and has no terminal UI or wire protocol. Your program supplies the database text, for example with `fetch` or with its own Node `fs` code. Your program also draws the display, reads input, stores saves, and waits two seconds when the game asks.

This is a clean-room implementation. It was written from a supplied specification, not from other interpreters. The source is at https://github.com/visionik/sabal. It is not on the public npm registry.

## Install from GitHub and build from a clone

Do not run `npm install sabal`. That name is not published to the public registry. Install the package from the GitHub repository:

```sh
npm install github:visionik/sabal
```

The published package contains `dist`, `README.md`, and `LICENSE`. Corpus fixtures are not published. The entry point is `dist/index.js`, with types in `dist/index.d.ts`.

To build and test from a clone:

```sh
git clone https://github.com/visionik/sabal.git
cd sabal
npm install
npm run build
npm test
```

`npm run build` compiles TypeScript into `dist/`. `npm test` builds, then runs the Node test suite.

The package exports `loadDatabase`, `createSession`, and `Session`. It also exports the types `Database`, `Header`, `Room`, `Item`, `Vocabulary`, `ActionRow`, `Options`, `StepResult`, `Event`, and `Status`, and the errors `SabalError`, `DatabaseError`, `SaveError`, `InvalidIndexError`, `MissingArgumentError`, and `SessionStateError`.

## Start a session and send a command

`loadDatabase` parses uncompressed database text and returns a recursively frozen `Database`. You can share one database across sessions. It exposes the header, rooms, messages, items (text, automatic words, and immutable initial locations), vocabulary, decoded and packed actions, comments, version, and adventure number. Each session owns its own play state.

`createSession` runs startup immediately. Startup performs the first look and the automatic pass. Render `initialResult` before you ask for a command. Startup itself may ask for a save or a wait. `initialResult` is startup output, not a snapshot of a turn that was already in progress.

```ts
import { loadDatabase, createSession } from 'sabal';
import type { Event, StepResult } from 'sabal';

const response = await fetch('/games/adv01.dat');
const database = loadDatabase(await response.text());
const session = createSession(database);

let roomDisplay = '';
let responseDisplay = '';

function present(event: Event): void {
  switch (event.kind) {
    case 'room':
      roomDisplay = event.text;
      break;
    case 'response':
      responseDisplay += event.text;
      break;
    case 'clear-response':
      responseDisplay = '';
      break;
    case 'command-prompt':
    case 'save-prompt':
      showPrompt(event.text);
      break;
    case 'wait':
      scheduleWait(event.milliseconds);
      break;
    case 'diagnostic':
      showDiagnostic(event.text);
      break;
    case 'terminated':
      showEnded();
      break;
  }
}

function render(result: StepResult): void {
  for (const event of result.events) present(event);
}

render(session.initialResult);

if (session.status === 'need-command') {
  render(session.submitCommand('GET KEY'));
}
```

`session.status` is the current status. Each operation returns the ordered events from that operation only. Keep event order and the exact text, including spaces and newlines. Do not clear the response display when a room arrives, do not redraw after every command, and do not add terminal wrapping. Prompts are their own event kinds. They are not copied into response text.

An empty command, or a verb the vocabulary does not know, returns another command prompt and does not advance the turn. A recognized command advances even when it does not succeed. The parser, and the built-in movement, get, and drop behavior, use vocabulary numbers, not English meanings. There is no built-in RESTORE command.

Input may contain printable ASCII plus space, tab, CR, and LF as token separators. Any other character is rejected with `SessionStateError`.

## Present events until the game wants a command

A `StepResult.status` is one of four values:

- `need-command`: the host may call `submitCommand`.
- `need-save-identifier`: the host must store a save, then call `provideSaveIdentifier`.
- `need-wait`: the host must wait, then call `notifyWaitComplete`.
- `terminated`: the session is over. Accept no more input.

| `event.kind` | What the host should do |
| --- | --- |
| `room` | Replace the room display with `text`. Do not clear the response display. |
| `response` | Append `text` to the response display. |
| `clear-response` | Clear only the response display. |
| `command-prompt` | Show `text`, which is `\nTell me what to do ? `. |
| `save-prompt` | Show `text`, which is `Filename: `. |
| `wait` | Wait `milliseconds`, which is 2000, then call `notifyWaitComplete`. |
| `diagnostic` | Show `text` apart from narration. |
| `terminated` | End the session and accept no more input. |

A resumed result may ask for another save or another wait. Loop until the status is `need-command` or `terminated`. In the loop below, `present` is the host function from the previous example. `askForSaveIdentifier`, `saveStore`, and `delay` are host code, not library exports.

```ts
import type { Session, StepResult } from 'sabal';

async function settle(session: Session, result: StepResult): Promise<void> {
  let current = result;
  for (;;) {
    for (const event of current.events) present(event);
    if (current.status === 'need-command' || current.status === 'terminated') return;

    if (current.status === 'need-save-identifier') {
      const id = await askForSaveIdentifier();
      const savedText = session.serializeSave();
      let ok = true;
      try {
        await saveStore.put(id, savedText);
      } catch {
        ok = false;
      }
      current = session.provideSaveIdentifier(id, ok);
      continue;
    }

    await delay(2000);
    current = session.notifyWaitComplete();
  }
}
```

Call `submitCommand` only while the status is `need-command`. Call `provideSaveIdentifier` only while it is `need-save-identifier`. Call `notifyWaitComplete` only while it is `need-wait`. A call in the wrong status throws `SessionStateError` and does not resume execution. A terminated session rejects every input the same way. The library does not sleep, and it does not accept a command during a wait.

## Save, report a failed save, and restore

A save suspends execution at the exact action that requested it. While the status is `need-save-identifier`, call `serializeSave()` before you resume. The host chooses the identifier and stores the text. The identifier does not have to be a filesystem path. The save prompt asks for a whole line, not a two-word command.

`provideSaveIdentifier(id, ok?)` resumes the remaining actions. `ok` defaults to `true`. You must pass an identifier even when `ok` is false. There is no separate failure method. Success appends a response of `\n` and then `Saved.\n`. Failure appends a response of `\n` and then `Unable to create save file.\n`.

```ts
if (session.status === 'need-save-identifier') {
  const id = await askForSaveIdentifier();
  const savedText = session.serializeSave();
  let ok = true;
  try {
    await saveStore.put(id, savedText);
  } catch {
    ok = false;
  }
  render(session.provideSaveIdentifier(id, ok));
}
```

Restore by passing save text when you create the session. Restore runs before the first look and the automatic pass.

```ts
const restored = createSession(database, {
  restoreText: await saveStore.get(id),
});
render(restored.initialResult);
```

Saves use the reference whitespace-separated decimal format: sixteen counter and room-register lines, one six-field state line, then one item-location line per item. Serialization uses LF, a signed 32-bit flags field, and unsigned byte item locations. Readers also accept CRLF and wider decimal flag fields, and they keep bits 0 to 31. Malformed or truncated save text throws `SaveError` and is never applied in part. If the host cannot retrieve a save, it can display `Unable to restore game.` and create a fresh session.

Saves do not include remembered nouns, random state, or mid-turn execution. They are startup restores, not mid-turn snapshots. If you save during a suspended action and restore later, the new session starts the ordinary startup cycle. It does not resume the remaining actions of that row.

## Inject random draws for tests

Pass `random` in the session options when a test must replay chance. The function returns unsigned left-shift results, before `% 100`. It does not return a 0 to 99 roll, and it does not return a floating-point probability. Each value must be a nonnegative safe integer divisible by four.

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

Every chance test consumes one value. That includes chance 0 and chance 100, impossible conditions, and zero-selector continuation rows. A value that is not a nonnegative safe integer divisible by four throws `SabalError`.

The default backend uses host `Math.random` entropy and a 32-bit unsigned left shift by six. It is not a C-library generator. The library does not promise seed-only replay or cross-platform native-generator replay. Restore does not rewind a draw stream.

## Stay inside the text database contract

The engine implements the supplied clean-room specification: conditions 0 to 19, actions 0 to 89, both message ranges, diagnostics for actions 90 to 101, two-word bounded parsing, synonyms, directions, ALL, counters and registers, light, continuations, ordered automatic passes, deferred room redraws, and text saves. Only the specified first-person, default-lamp profile is offered.

Compressed formats, binary machine formats, graphics, combat, historical lamp modes, second-person modes, ACP, and portable mid-turn snapshots are out of scope. So are filesystem access and sleeping.

Typed errors extend `SabalError`. `DatabaseError` means the database text is invalid. `SaveError` means the save text is invalid. `InvalidIndexError` means an index is out of range. `MissingArgumentError` means an action ran out of arguments. `SessionStateError` means the host called a method in the wrong status, omitted a string identifier, or sent unsupported input.

Specified diagnostics keep their exact text. Invalid message indices are rejected while loading. State-dependent indices and missing arguments are checked when play reaches them. A score action with zero declared treasures throws instead of dividing by zero. After an execution error caused by malformed data, discard that session.

Edges the specification leaves undefined are closed this way: orphan vocabulary synonyms are rejected, out-of-range headers and indices are rejected, a missing unknown-action diagnostic slot prints as zero, data after the version and adventure number is ignored, pending redraws are discarded on termination, and counters and room numbers are ordinary JavaScript integers with no intentional overflow rule. A tiny invented game with no item 9 has no lamp timer and no nearby lamp.

## Run the tests and respect the corpus

`test/` holds invented tests written from the specification. They are not traces taken from another interpreter. No external interpreters or databases were consulted.

`corpus/` holds the 18 text databases supplied with the clean-room packet. They are Scott Adams's games, © Scott Adams, 1978–1985, which he distributes as shareware, and they come unchanged from The Scott Adams Collection 2.2 on the Interactive Fiction Archive, converted by Paul David Doherty. [`corpus/README.md`](corpus/README.md) has the full shareware notice and credits. Load and startup tests use them. The files are `adv01.dat`, `adv02.dat`, `adv03.dat`, `adv04.dat`, `adv05.dat`, `adv06.dat`, `adv07.dat`, `adv08.dat`, `adv09.dat`, `adv10.dat`, `adv11.dat`, `adv12.dat`, `adv13.dat`, `adv14a.dat`, `adv14b.dat`, `quest1.dat`, `quest2.dat`, and `sampler1.dat`.

The MIT license covers this library's code and documentation, not the games in `corpus/`. Those stay © Scott Adams and are not in the published `files` list.
