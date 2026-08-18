import { describe, it, expect } from "vitest";
import { buildDeck, defaultGameState } from "../party/index";
import type { Card } from "../src/shared/types";

describe("buildDeck", () => {
  it("returns exactly 52 cards", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
  });

  it("has no duplicate card IDs", () => {
    const deck = buildDeck();
    const ids = deck.map((c: Card) => c.id);
    expect(new Set(ids).size).toBe(52);
  });

  it("has 4 suits with 13 cards each", () => {
    const deck = buildDeck();
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    for (const suit of suits) {
      const count = deck.filter((c: Card) => c.suit === suit).length;
      expect(count).toBe(13);
    }
  });

  it("uses id format rank-suit[0] (e.g. A-s, 10-h)", () => {
    const deck = buildDeck();
    const aceOfSpades = deck.find((c: Card) => c.id === "A-s");
    expect(aceOfSpades).toBeDefined();
    expect(aceOfSpades!.suit).toBe("spades");
    expect(aceOfSpades!.rank).toBe("A");

    const tenOfHearts = deck.find((c: Card) => c.id === "10-h");
    expect(tenOfHearts).toBeDefined();
    expect(tenOfHearts!.suit).toBe("hearts");
    expect(tenOfHearts!.rank).toBe("10");
  });

  it("all cards start faceUp: false", () => {
    const deck = buildDeck();
    expect(deck.every((c: Card) => c.faceUp === false)).toBe(true);
  });

  it("returns 54 cards when jokers are included", () => {
    const deck = buildDeck(true);
    expect(deck).toHaveLength(54);
  });

  it("includes exactly one red and one black joker when included", () => {
    const deck = buildDeck(true);
    const jokers = deck.filter((c: Card) => c.rank === "JOKER");
    expect(jokers.map(c => c.id).sort()).toEqual(["JOKER-b", "JOKER-r"]);
    expect(jokers.find(c => c.id === "JOKER-r")!.suit).toBe("joker-red");
    expect(jokers.find(c => c.id === "JOKER-b")!.suit).toBe("joker-black");
    expect(jokers.every(c => c.faceUp === false)).toBe(true);
  });

  it("has no duplicate card IDs with jokers included", () => {
    const deck = buildDeck(true);
    expect(new Set(deck.map((c: Card) => c.id)).size).toBe(54);
  });

  it("still returns 52 cards with no jokers by default", () => {
    expect(buildDeck().some((c: Card) => c.rank === "JOKER")).toBe(false);
    expect(buildDeck(false)).toHaveLength(52);
  });
});

describe("defaultGameState", () => {
  it("places all 52 cards in draw pile", () => {
    const state = defaultGameState("test-room");
    const drawPile = state.piles.find(p => p.id === "draw");
    expect(drawPile).toBeDefined();
    expect(drawPile!.cards).toHaveLength(52);
  });

  it("has a discard pile with 0 cards", () => {
    const state = defaultGameState("test-room");
    const discard = state.piles.find(p => p.id === "discard");
    expect(discard).toBeDefined();
    expect(discard!.cards).toHaveLength(0);
  });

  it("has empty hands and players", () => {
    const state = defaultGameState("test-room");
    expect(state.players).toHaveLength(0);
    expect(Object.keys(state.hands)).toHaveLength(0);
  });

  it("sets phase to lobby", () => {
    const state = defaultGameState("test-room");
    expect(state.phase).toBe("lobby");
  });

  it("has 2 piles with ids draw and discard (Phase 31: communal grid removed)", () => {
    const state = defaultGameState("test-room");
    expect(state.piles).toHaveLength(2);
    const ids = state.piles.map(p => p.id);
    expect(ids).toContain("draw");
    expect(ids).toContain("discard");
    expect(ids).not.toContain("play");
  });

  it("initializes undoSnapshots as empty array", () => {
    const state = defaultGameState("test-room");
    expect(state.undoSnapshots).toEqual([]);
  });
});
