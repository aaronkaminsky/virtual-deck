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

  it("has 3 piles with ids draw, discard, play", () => {
    const state = defaultGameState("test-room");
    expect(state.piles).toHaveLength(3);
    const ids = state.piles.map(p => p.id);
    expect(ids).toContain("draw");
    expect(ids).toContain("discard");
    expect(ids).toContain("play");
  });

  it("play pile has name Play Area and 0 cards", () => {
    const state = defaultGameState("test-room");
    const play = state.piles.find(p => p.id === "play");
    expect(play).toBeDefined();
    expect(play!.name).toBe("Play Area");
    expect(play!.cards).toHaveLength(0);
  });

  it("initializes undoSnapshots as empty object", () => {
    const state = defaultGameState("test-room");
    expect(state.undoSnapshots).toEqual({});
  });
});
