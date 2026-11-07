# Changelog

## Unreleased

`Session.snapshot` tells a host which room the player is in, whether it is dark, and where each item is, so the host can draw a picture or a map of the game.

SABAL now stands for Scott Adams Brass-lamp Adventure Library, after the lamp you carry into Adventureland. The package name and API are unchanged.

`npm install github:visionik/sabal` now builds `dist/` during install, so the package works when installed straight from GitHub. Before this, the install had no compiled code.

## 0.1.0 - 2026-11-06

You can now load an uncompressed Scott Adams text adventure database and play it from a host program. The engine does not touch the filesystem or sleep, and it has no terminal interface or wire protocol. Your program supplies the database text, draws the room and the response, stores each save, and waits two seconds when the game asks. You can restore a save when you start a session, report a save that failed to store, and inject your own random draws so tests stay repeatable.
