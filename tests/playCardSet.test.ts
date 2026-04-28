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
});
