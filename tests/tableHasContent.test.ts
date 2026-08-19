// Tests for tableHasContent, the predicate gating the jokers toggle's confirm
// dialog (1039). It answers "would a reset destroy anything visible?" — an
// earlier version gated on gameState.phase, which only becomes "playing" after
// a deal and so missed dragged-out arrangements on an undealt table.

import { describe, it, expect } from "vitest";
import { tableHasContent } from "../src/components/ControlsBar";
import type { Card, ClientGameState, ClientPile, Token } from "../src/shared/types";

function mkCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function mkState(overrides: Partial<ClientGameState> = {}): ClientGameState {
  const draw: ClientPile = { id: "draw", name: "Draw", cards: [], region: "pile", ownerId: null };
  const discard: ClientPile = { id: "discard", name: "Discard", cards: [], region: "pile", ownerId: null };
  return {
    roomId: "test-room",
    phase: "setup",
    players: [],
    myPlayerId: "player-1",
    myHand: [],
    myHandRevealed: false,
    opponentRevealedHands: {},
    opponentHandCounts: {},
    piles: [draw, discard],
    canUndo: false,
    myPlayZoneId: "spread-player-1",
    canvasCards: [],
    pot: 0,
    chipsEnabled: false,
    startingChips: 1000,
    tokens: [],
    tokensEnabled: false,
    jokersEnabled: false,
    ...overrides,
  };
}

function fullDrawPile(count = 52): ClientPile[] {
  return [
    { id: "draw", name: "Draw", cards: Array.from({ length: count }, (_, i) => mkCard(`c${i}`)), region: "pile", ownerId: null },
    { id: "discard", name: "Discard", cards: [], region: "pile", ownerId: null },
  ];
}

describe("tableHasContent", () => {
  it("is false for a fresh table with every card in the draw pile", () => {
    expect(tableHasContent(mkState({ piles: fullDrawPile() }))).toBe(false);
  });

  it("is false for an empty room with no cards anywhere", () => {
    expect(tableHasContent(mkState())).toBe(false);
  });

  it("is true when cards are in my hand", () => {
    const state = mkState({ piles: fullDrawPile(47), myHand: [mkCard("h1"), mkCard("h2")] });
    expect(tableHasContent(state)).toBe(true);
  });

  it("is true when only an opponent holds cards", () => {
    const state = mkState({ piles: fullDrawPile(47), opponentHandCounts: { "player-2": 5 } });
    expect(tableHasContent(state)).toBe(true);
  });

  it("is true when an opponent's revealed hand holds cards", () => {
    const state = mkState({
      piles: fullDrawPile(47),
      opponentRevealedHands: { "player-2": [mkCard("r1"), mkCard("r2")] },
    });
    expect(tableHasContent(state)).toBe(true);
  });

  it("is true when a card sits loose on the canvas — the undealt-arrangement case", () => {
    const state = mkState({
      phase: "setup",
      piles: fullDrawPile(51),
      canvasCards: [{ card: mkCard("x1"), x: 10, y: 10, z: 1 }],
    });
    expect(tableHasContent(state)).toBe(true);
  });

  it("is true when a non-draw pile holds cards", () => {
    const piles = fullDrawPile(51);
    piles[1].cards = [mkCard("d1")];
    expect(tableHasContent(mkState({ piles }))).toBe(true);
  });

  it("is true when a token is placed on the canvas and tokens are shown", () => {
    const tokens: Token[] = [{ id: "dealer", placement: { kind: "canvas", x: 5, y: 5, z: 1 } }];
    const state = mkState({ piles: fullDrawPile(), tokens, tokensEnabled: true });
    expect(tableHasContent(state)).toBe(true);
  });

  it("is true when a token is assigned to a player and tokens are shown", () => {
    const tokens: Token[] = [{ id: "dealer", placement: { kind: "player", playerId: "player-1" } }];
    const state = mkState({ piles: fullDrawPile(), tokens, tokensEnabled: true });
    expect(tableHasContent(state)).toBe(true);
  });

  it("ignores placed tokens while tokens are turned off — nothing visible to lose", () => {
    const tokens: Token[] = [{ id: "dealer", placement: { kind: "canvas", x: 5, y: 5, z: 1 } }];
    const state = mkState({ piles: fullDrawPile(), tokens, tokensEnabled: false });
    expect(tableHasContent(state)).toBe(false);
  });

  it("is false when every token is in the tray", () => {
    const tokens: Token[] = [
      { id: "dealer", placement: { kind: "tray" } },
      { id: "red", placement: { kind: "tray" } },
    ];
    const state = mkState({ piles: fullDrawPile(), tokens, tokensEnabled: true });
    expect(tableHasContent(state)).toBe(false);
  });
});
