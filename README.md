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

## Show the pictures from the illustrated releases

Scott Adams's games were also sold with pictures, as Scott Adams Graphic Adventures (SAGA). SABAL can read those pictures from the player's own copies of some of the illustrated releases and tell you which one to show. The pictures are © Scott Adams and Adventure International. None are included, and SABAL doesn't fetch them.

As with databases and saves, your program supplies the files. Give a `PictureLibrary` the bytes of any tapes, snapshots or disk images the player has; it recognises the games in them from their contents, whatever the file names. Then ask it for the game you're playing, by its database, and ask that for a picture after each room event:

```js
import { PictureLibrary } from 'sabal';

const library = new PictureLibrary([{ name: 'S1ADVLND.TAP', data: tapeBytes }]);
const pictures = library.forGame(database); // undefined if no file has this game's pictures
const picture = pictures?.forState(session.snapshot); // the room's picture, with objects drawn in
if (picture) show(picture.image); // { width, height, pixels, palette, scale }
const closeUp = pictures?.forMessage(responseText); // e.g. the genie appearing
```

A picture is an indexed-colour image: one palette index per pixel, a palette of RGB triples, and `scale`, the whole-pixel enlargement that gives its usual size. Its `key` is stable, so you can skip showing the same picture twice in a row. There is no picture in the dark unless the release has one.

| Game | Release | File | Pictures |
| --- | --- | --- | --- |
| Adventureland | ZX Spectrum | `.tap`, `.tzx` or `.sna` | every room, objects drawn in, three close-ups |
| | Atari 8-bit | picture disk `.atr` | every room and the dark |
| | Apple II (version 2.2) | picture disk (side A) `.dsk` | every room, objects drawn in, and the dark |
| Pirate Adventure | Atari 8-bit | picture disk `.atr` | every room and the dark |
| | Apple II | picture disk (side A) `.dsk` | every room, objects drawn in, and the dark |
| Secret Mission | ZX Spectrum | `.tap`, `.tzx` or `.sna` | every room, the dark, two close-ups |
| | Apple II (as Mission Impossible) | picture disk (side A) `.dsk` | every room, objects drawn in, and the dark |
| Voodoo Castle | Apple II | picture disk (side A) `.dsk` | every room, objects drawn in, and the dark |
| The Count | Apple II | picture disk (side A) `.dsk` | every room, objects drawn in, and the dark |
| Strange Odyssey | Atari 8-bit | picture disk `.atr` | 24 of 35 rooms, and the dark |
| | Apple II | picture disk (side A) `.dsk` | 24 of 35 rooms, objects drawn in, and the dark |
| The Sorcerer of Claymorgue Castle | Commodore 64 | disk `.d64` | every room, objects drawn in, and the dark |
| | Atari 8-bit | picture disk `.atr` | every room and the dark |
| | Apple II | picture disk (side A) `.dsk` | every room, objects drawn in, and the dark |
| | ZX Spectrum | `.tap`, `.tzx` or `.sna` | 15 of 32 rooms |
| Savage Island, Part I | ZX Spectrum | `.tap`, `.tzx` or `.sna` | 12 of 34 rooms |
| Savage Island, Part II | ZX Spectrum | `.tap`, `.tzx` or `.sna` | 12 of 30 rooms |
| Return to Pirate's Isle | TI-99/4A | cartridge `.rpk`, or its two `.bin` files | 21 of 24 rooms (the cartridge has none for the other three) |
| The Incredible Hulk | Atari 8-bit | picture disk (side B) `.atr` | 19 of 20 rooms (the disk has none for the fuzzy area), the dark, six close-ups |
| Spider-Man | Commodore 64 | disk `.d64` | 39 of 40 rooms, objects and villains drawn in |
| | ZX Spectrum | `.tap`, `.tzx` or `.sna` | 33 of 40 rooms |
| Buckaroo Banzai | Commodore 64 | disk `.d64` | 28 of 35 rooms, objects drawn in |
| Mystery Fun House | SABAL's own | none needed | every room, objects drawn in |
| Pyramid of Doom | SABAL's own | none needed | every room, objects and creatures drawn in |
| Ghost Town | SABAL's own | none needed | every room, objects and ghosts drawn in |
| The Golden Voyage | SABAL's own | none needed | every room you can reach, objects and people drawn in |
| Mini-Adventure Sampler | SABAL's own | none needed | every room you can reach, objects drawn in |

When the files hold more than one release of a game, the first listed for it wins. The Spectrum games choose their pictures in their own code, so those were matched to rooms, objects and messages by eye; a room whose match wasn't clear has no picture rather than a wrong one. The C64 and Apple II releases name each picture after its room or item; an item's picture is drawn over the room while the item is there. The Atari releases store theirs in room order or list them in an index. Return to Pirate's Isle draws its pictures with its own machine code, so SABAL runs that code on a small built-in TMS9900 emulator and reads the picture back from video memory.

Some games never had pictures. For those, SABAL draws its own, new pictures in the style of the 8-bit releases: 160×80, a few colours, dithered skies and shading. They ship with the library, so they need no files, and a real release of the game, if one turns up, still wins. That covers Mystery Fun House, Pyramid of Doom, Ghost Town, The Golden Voyage and the Mini-Adventure Sampler, so every game in the corpus now has pictures.

### Next-gen pictures

Alongside the originals, SABAL ships next-gen pictures: new, high-resolution paintings of each room, inspired by the original pictures and the game's text. They live in [`ng/`](ng/): each room is a 1024×512 PNG, and each item that the originals draw over a room is a PNG with a transparent background. `ng/manifest.json` lists them and says where each item goes; that's wherever the original release draws it.

`NgLibrary` (in the core) takes the manifest and, like `GamePictures`, gives the picture for the player's state. It returns the layers to stack (the room, then each item in its box), so a browser can simply stack `<img>` elements. `sabal/node` adds `loadNg()`, which reads the `ng/` folder that ships with the package, and `composeNg(picture, read, scale)`, which blends the layers into one PNG.

The pictures were generated with an image model from the prompts kept beside them (`ng/<game>/prompts.json`, with the shared style in `ng/style.json`), so any of them can be redrawn. `tools/ng/generate.py` asks Codex to paint the missing ones, `tools/ng/process.py` crops and shrinks them, and `tools/ng/manifest.mjs` places each item by drawing the original room with and without it.

So far: Pyramid of Doom.

### Node conveniences: `sabal/node`

The core never touches the filesystem, so it runs in browsers too. Node programs can import `sabal/node` for two shortcuts: `loadPictures(dir)` reads the picture files in a folder into a `PictureLibrary` (opening TI-99/4A `.rpk` cartridge packs into their ROM files), and `encodePng(image, scale)` turns a picture into a PNG, enlarged without smoothing so the blocky originals stay sharp. `scale` multiplies the picture's usual size and can be any number, such as `1.5`.

The Spectrum and Atari/C64 bitmap decoders are adapted from David Lodge's MIT-licensed `sagadraw.c` and `arledraw.c`, written with help from Paul David Doherty (see [`NOTICE`](NOTICE)). The line-drawing formats of the first Atari and Apple II releases are undocumented; they were worked out from the pictures and from the games' own drawing code. Apple II colours are produced the way a colour monitor shows them, from how the lit pixels are spaced. Later Apple II releases (Adventureland 2.2, Voodoo Castle, The Count, Claymorgue) keep their pictures packed straight on the disk, with tables on track 0 saying where each lies; those are read too, recognised by a checksum of the tables.

## Stay inside the text database contract

The engine implements the supplied clean-room specification: conditions 0 to 19, actions 0 to 89, both message ranges, diagnostics for actions 90 to 101, two-word bounded parsing, synonyms, directions, ALL, counters and registers, light, continuations, ordered automatic passes, deferred room redraws, and text saves. Only the specified first-person, default-lamp profile is offered.

Compressed formats, binary machine formats (except for reading pictures), combat, historical lamp modes, second-person modes, ACP, and portable mid-turn snapshots are out of scope. So are filesystem access and sleeping in the core; `sabal/node` adds file reading for Node programs.

Typed errors extend `SabalError`. `DatabaseError` means the database text is invalid. `SaveError` means the save text is invalid. `InvalidIndexError` means an index is out of range. `MissingArgumentError` means an action ran out of arguments. `SessionStateError` means the host called a method in the wrong status, omitted a string identifier, or sent unsupported input.

Specified diagnostics keep their exact text. Invalid message indices are rejected while loading. State-dependent indices and missing arguments are checked when play reaches them. A score action with zero declared treasures throws instead of dividing by zero. After an execution error caused by malformed data, discard that session.

Edges the specification leaves undefined are closed this way: orphan vocabulary synonyms are rejected, out-of-range headers and indices are rejected, a missing unknown-action diagnostic slot prints as zero, data after the version and adventure number is ignored, pending redraws are discarded on termination, and counters and room numbers are ordinary JavaScript integers with no intentional overflow rule. A tiny invented game with no item 9 has no lamp timer and no nearby lamp.

## Run the tests and respect the corpus

`test/` holds invented tests written from the specification. They are not traces taken from another interpreter. No external interpreters or databases were consulted.

`corpus/` holds the 18 text databases supplied with the clean-room packet. They are Scott Adams's games, © Scott Adams, 1978–1985, which he distributes as shareware, and they come unchanged from The Scott Adams Collection 2.2 on the Interactive Fiction Archive, converted by Paul David Doherty. [`corpus/README.md`](corpus/README.md) has the full shareware notice and credits. Load and startup tests use them. The files are `adv01.dat`, `adv02.dat`, `adv03.dat`, `adv04.dat`, `adv05.dat`, `adv06.dat`, `adv07.dat`, `adv08.dat`, `adv09.dat`, `adv10.dat`, `adv11.dat`, `adv12.dat`, `adv13.dat`, `adv14a.dat`, `adv14b.dat`, `quest1.dat`, `quest2.dat`, and `sampler1.dat`.

The MIT license covers this library's code and documentation, not the games in `corpus/`. Those stay © Scott Adams and are not in the published `files` list.
