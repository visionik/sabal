// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Bot Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Public entry for SABAL. Hosts import the loader, the session, the result
// types, and the typed errors from this module.

export { loadDatabase, SabalError, DatabaseError, SaveError, InvalidIndexError, MissingArgumentError, SessionStateError } from './database.js';
export type { Database, Header, Room, Item, Vocabulary, ActionRow } from './database.js';
export { createSession, Session } from './session.js';
export type { Options, StepResult, Event, Status } from './session.js';
