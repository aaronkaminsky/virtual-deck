import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

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

describe("PLAY_CARD_SET handler", () => {
  let mockRoom: ReturnType<typeof makeMockRoom>;
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  it("plays a set of cards from hand to a pile atomically", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    room.gameState = makeStateWithPlayerAndCards("player-1", [cardA, cardK, cardQ]);

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromId: "player-1",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe("Q-d");
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(playPile.cards.map(c => c.id)).toEqual(["A-s", "K-h"]);
  });

  it("sends UNAUTHORIZED_MOVE when fromId !== senderToken", async () => {
    const cardA = makeCard("A-s");
    room.gameState = makeStateWithPlayerAndCards("player-1", [cardA]);

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s"],
      fromId: "player-2", // different from sender id "player-1"
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    // No mutation
    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(playPile.cards).toHaveLength(0);
    // Exactly one ERROR with code UNAUTHORIZED_MOVE
    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("UNAUTHORIZED_MOVE");
  });

  it("sends CARD_NOT_IN_SOURCE and does not mutate when any cardId is missing from hand", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    room.gameState = makeStateWithPlayerAndCards("player-1", [cardA, cardK]);

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "Q-d"], // Q-d is NOT in the hand
      fromId: "player-1",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    // Hand is unchanged (no partial move)
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["A-s", "K-h"]);
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(playPile.cards).toHaveLength(0);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("CARD_NOT_IN_SOURCE");
  });

  it("sets card faceUp to match destination pile", async () => {
    const cardA = makeCard("A-s");
    cardA.faceUp = false;
    const cardK = makeCard("K-h");
    cardK.faceUp = false;
    room.gameState = makeStateWithPlayerAndCards("player-1", [cardA, cardK]);
    // The "play" communal pile is faceUp:true by defaultGameState convention
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.faceUp = true;

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromId: "player-1",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    const refreshed = room.gameState.piles.find(p => p.id === "play")!;
    expect(refreshed.cards.every(c => c.faceUp === true)).toBe(true);
  });

  it("takes snapshot before mutation so UNDO_MOVE reverts the set play", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    room.gameState = makeStateWithPlayerAndCards("player-1", [cardA, cardK, cardQ]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromId: "player-1",
      toZone: "pile",
      toId: "play",
    }), sender);

    // Mid-state: 1 card in hand, 2 in play pile
    expect(room.gameState.hands["player-1"]).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    // Reverted: hand has 3 cards, play pile is empty again
    expect(room.gameState.hands["player-1"].map(c => c.id).sort()).toEqual(["A-s", "K-h", "Q-d"]);
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(playPile.cards).toHaveLength(0);
  });

  it("plays a set of cards from a pile to another pile when fromZone is 'pile'", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    // Seed cards into the player's personal spread zone "spread-player-1"
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", [cardA, cardK, cardQ]);

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromZone: "pile",
      fromId: "spread-player-1",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    const sourcePile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    const destPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(sourcePile.cards.map(c => c.id)).toEqual(["Q-d"]);
    expect(destPile.cards.map(c => c.id)).toEqual(["A-s", "K-h"]);
  });

  it("plays a set of cards from a pile to a player's hand when toZone is 'hand' (D-06)", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", [cardA, cardK]);

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromZone: "pile",
      fromId: "spread-player-1",
      toZone: "hand",
      toId: "player-1",
    });
    await room.onMessage(msg, sender);

    const sourcePile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(sourcePile.cards).toHaveLength(0);
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["A-s", "K-h"]);
  });

  it("rejects pile-source PLAY_CARD_SET with PILE_NOT_FOUND when source pile id is unknown", async () => {
    const cardA = makeCard("A-s");
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", [cardA]);

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s"],
      fromZone: "pile",
      fromId: "spread-does-not-exist",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    // No mutation
    const sourcePile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    const destPile = room.gameState.piles.find(p => p.id === "play")!;
    expect(sourcePile.cards.map(c => c.id)).toEqual(["A-s"]);
    expect(destPile.cards).toHaveLength(0);

    const errors = (sender.send.mock.calls.map((c: string[]) => c[0]) as string[])
      .map(c => JSON.parse(c) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("PILE_NOT_FOUND");
  });

  it("sets card.faceUp=true when toZone is 'hand' regardless of source pile faceUp", async () => {
    // Cards start face-down in the spread pile (faceUp:true on pile, but cards explicitly false)
    const cardA = makeCard("A-s", false);
    const cardK = makeCard("K-h", false);
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", [cardA, cardK]);
    // Force pile.faceUp to false to prove hand-destination overrides pile.faceUp
    const sourcePile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    sourcePile.faceUp = false;

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromZone: "pile",
      fromId: "spread-player-1",
      toZone: "hand",
      toId: "player-1",
    });
    await room.onMessage(msg, sender);

    const handCards = room.gameState.hands["player-1"];
    expect(handCards).toHaveLength(2);
    expect(handCards.every(c => c.faceUp === true)).toBe(true);
  });
});
