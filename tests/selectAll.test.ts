// Wave-0 scaffold — stubs will be converted to real it() calls in Plan 23-03.
// This file exists so Plan 23-03 (Select All implementation) has automated verify targets
// ready from the start. The fixture helpers below mirror tests/playCardSet.test.ts so
// Plan 23-03 can wire assertions directly into this file without re-creating setup.

import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState } from "../src/shared/types";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

// Suppress unused-import warnings until Plan 23-03 wires up assertions.
const _typeCheck: [typeof expect?, typeof beforeEach?, typeof makeMockConnection?, typeof makeCard?, GameRoom?, typeof defaultGameState?] = [];
void _typeCheck;

// Fixture helpers copied from tests/playCardSet.test.ts — available for Plan 23-03 to use.

function makeStateWithPlayerAndCards(playerId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "" });
  state.hands[playerId] = cards;
  return state;
}

function makeStateWithPileCards(playerId: string, pileId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "" });
  state.hands[playerId] = [];
  // Personal spread zone for the player (mirrors onConnect creation)
  state.piles.push({ id: `spread-${playerId}`, name: "Spread", cards: [], faceUp: true, region: "spread", ownerId: playerId });
  const pile = state.piles.find(p => p.id === pileId);
  if (pile) pile.cards.push(...cards);
  return state;
}

// Expose helpers so Plan 23-03 can import them directly from this file if needed.
export { makeStateWithPlayerAndCards, makeStateWithPileCards };

// Suppress unused-variable warnings on helpers until Plan 23-03 uses them.
const _helpers: [typeof makeStateWithPlayerAndCards, typeof makeStateWithPileCards, typeof makeMockRoom] = [makeStateWithPlayerAndCards, makeStateWithPileCards, makeMockRoom];
void _helpers;

describe("Select All — server-observable behavior via PLAY_CARD_SET", () => {
  it.todo("SELECT-01: PLAY_CARD_SET with a single pile top-card id removes that card from the pile");
  it.todo("SELECT-02: PLAY_CARD_SET with all face-up card ids from a spread zone moves the whole group atomically");
  it.todo("SELECT-03: PLAY_CARD_SET with multi-card source produces an atomic move that all-present validation accepts");
});
