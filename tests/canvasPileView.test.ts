import { describe, it, expect } from "vitest";
import { viewFor, defaultGameState } from "../party/index";
import { makeCard } from "./helpers";
import type { Pile } from "../src/shared/types";

function stateWithCanvasPile() {
  const state = defaultGameState("room-1");
  const pile: Pile = {
    id: "canvas-pile-abc",
    name: "Stack",
    cards: [makeCard("A-s", false), makeCard("2-s", false), makeCard("3-s", false)],
    faceUp: false,
    region: "canvas",
    ownerId: null,
    pos: { x: 100, y: 50, z: 7 },
  };
  state.piles.push(pile);
  return state;
}

describe("viewFor canvas piles", () => {
  it("passes pos through to ClientPile", () => {
    const view = viewFor(stateWithCanvasPile(), "player-1");
    const pile = view.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 100, y: 50, z: 7 });
    expect(pile.region).toBe("canvas");
  });

  it("masks buried face-down cards like a column pile (not like a spread)", () => {
    const view = viewFor(stateWithCanvasPile(), "player-1");
    const pile = view.piles.find(p => p.id === "canvas-pile-abc")!;
    // bottom two cards masked, top card sent in full
    expect("id" in pile.cards[0]).toBe(false);
    expect("id" in pile.cards[1]).toBe(false);
    expect("id" in pile.cards[2]).toBe(true);
  });
});
