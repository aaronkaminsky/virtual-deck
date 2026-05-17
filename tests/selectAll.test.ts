import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState } from "../src/shared/types";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

function makeStateWithPlayerAndCards(playerId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "", handRevealed: false });
  state.hands[playerId] = cards;
  return state;
}

function makeStateWithPileCards(playerId: string, pileId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "", handRevealed: false });
  state.hands[playerId] = [];
  state.piles.push({ id: `spread-${playerId}`, name: "Spread", cards: [], faceUp: true, region: "spread", ownerId: playerId });
  const pile = state.piles.find(p => p.id === pileId);
  if (pile) { pile.cards = [...cards]; }
  return state;
}

export { makeStateWithPlayerAndCards, makeStateWithPileCards };

describe("Select All — server-observable behavior via PLAY_CARD_SET", () => {
  let mockRoom: ReturnType<typeof makeMockRoom>;
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  it("SELECT-01: PLAY_CARD_SET with a single pile top-card id removes that card from the pile", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    room.gameState = makeStateWithPileCards("player-1", "draw", [cardA, cardK, cardQ]);

    // Top card in the pile array is the last element (cardQ)
    const topCardId = "Q-d";
    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: [topCardId],
      fromZone: "pile",
      fromId: "draw",
      toZone: "pile",
      toId: "spread-player-1",
    }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(drawPile.cards.map(c => c.id)).not.toContain(topCardId);
    expect(drawPile.cards).toHaveLength(2);

    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards.map(c => c.id)).toContain(topCardId);
  });

  it("SELECT-02: PLAY_CARD_SET with all face-up card ids from a spread zone moves the whole group atomically", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    room.gameState = makeStateWithPileCards("player-1", "play", [cardA, cardK, cardQ]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h", "Q-d"],
      fromZone: "pile",
      fromId: "play",
      toZone: "pile",
      toId: "spread-player-1",
    }), sender);

    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(playPile.cards).toHaveLength(0);

    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards.map(c => c.id)).toEqual(["A-s", "K-h", "Q-d"]);
  });

  it("SELECT-03: PLAY_CARD_SET with multi-card source produces an atomic move that all-present validation accepts", async () => {
    const card1 = makeCard("A-s");
    const card2 = makeCard("K-h");
    const card3 = makeCard("Q-d");
    room.gameState = makeStateWithPileCards("player-1", "play", [card1, card2, card3]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "Q-d"],
      fromZone: "pile",
      fromId: "play",
      toZone: "pile",
      toId: "spread-player-1",
    }), sender);

    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(playPile.cards.map(c => c.id)).toEqual(["K-h"]);

    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards.map(c => c.id)).toEqual(["A-s", "Q-d"]);

    expect(sender.send).not.toHaveBeenCalledWith(expect.stringContaining("CARD_NOT_IN_SOURCE"));
  });
});
