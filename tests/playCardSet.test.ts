import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent, CanvasCard } from "../src/shared/types";
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

  it("plays a set of cards from hand to a personal spread zone atomically", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", []);
    room.gameState.hands["player-1"] = [cardA, cardK, cardQ];

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromId: "player-1",
      toZone: "pile",
      toId: "spread-player-1",
    });
    await room.onMessage(msg, sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe("Q-d");
    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards.map(c => c.id)).toEqual(["A-s", "K-h"]);
  });

  it("sends UNAUTHORIZED_MOVE when fromId !== senderToken", async () => {
    const cardA = makeCard("A-s");
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", []);
    room.gameState.hands["player-1"] = [cardA];

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s"],
      fromId: "player-2", // different from sender id "player-1"
      toZone: "pile",
      toId: "spread-player-1",
    });
    await room.onMessage(msg, sender);

    // No mutation
    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards).toHaveLength(0);
    // Exactly one ERROR with code UNAUTHORIZED_MOVE
    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("UNAUTHORIZED_MOVE");
  });

  it("sends CARD_NOT_IN_SOURCE and does not mutate when any cardId is missing from hand", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", []);
    room.gameState.hands["player-1"] = [cardA, cardK];

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "Q-d"], // Q-d is NOT in the hand
      fromId: "player-1",
      toZone: "pile",
      toId: "spread-player-1",
    });
    await room.onMessage(msg, sender);

    // Hand is unchanged (no partial move)
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["A-s", "K-h"]);
    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards).toHaveLength(0);

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
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", []);
    room.gameState.hands["player-1"] = [cardA, cardK];
    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    spreadPile.faceUp = true;

    const msg = JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromId: "player-1",
      toZone: "pile",
      toId: "spread-player-1",
    });
    await room.onMessage(msg, sender);

    const refreshed = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(refreshed.cards.every(c => c.faceUp === true)).toBe(true);
  });

  it("takes snapshot before mutation so UNDO_MOVE reverts the set play", async () => {
    const cardA = makeCard("A-s");
    const cardK = makeCard("K-h");
    const cardQ = makeCard("Q-d");
    room.gameState = makeStateWithPileCards("player-1", "spread-player-1", []);
    room.gameState.hands["player-1"] = [cardA, cardK, cardQ];

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromId: "player-1",
      toZone: "pile",
      toId: "spread-player-1",
    }), sender);

    // Mid-state: 1 card in hand, 2 in spread pile
    expect(room.gameState.hands["player-1"]).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    // Reverted: hand has 3 cards, spread pile is empty again
    expect(room.gameState.hands["player-1"].map(c => c.id).sort()).toEqual(["A-s", "K-h", "Q-d"]);
    const spreadPile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(spreadPile.cards).toHaveLength(0);
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
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    const sourcePile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    const destPile = room.gameState.piles.find(p => p.id === "discard")!;
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
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    // No mutation
    const sourcePile = room.gameState.piles.find(p => p.id === "spread-player-1")!;
    expect(sourcePile.cards.map(c => c.id)).toEqual(["A-s"]);

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

function makeStateWithCanvasCards(playerId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "", handRevealed: false });
  state.hands[playerId] = [];
  state.canvasCards = cards.map((card, i): CanvasCard => ({ card, x: 10 + i * 20, y: 10, z: i + 1 }));
  return state;
}

describe("PLAY_CARD_SET canvas source (999.40)", () => {
  let mockRoom: ReturnType<typeof makeMockRoom>;
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  it("moves all named canvas cards to the discard pile and clears them from the canvas", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h", "Q-d"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);

    expect(room.gameState.canvasCards).toHaveLength(0);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["A-s", "K-h", "Q-d"]);
  });

  it("moves only the named subset, leaving other canvas cards in place", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "Q-d"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);

    expect(room.gameState.canvasCards.map(cc => cc.card.id)).toEqual(["K-h"]);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards.map(c => c.id)).toEqual(["A-s", "Q-d"]);
  });

  it("rejects atomically when a cardId is not on the canvas (no mutation)", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "NOT-ON-CANVAS"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);

    expect(room.gameState.canvasCards).toHaveLength(2);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]))
      .filter((e: { type: string }) => e.type === "ERROR");
    expect(errors.some((e: { code: string }) => e.code === "CARD_NOT_IN_SOURCE")).toBe(true);
  });

  it("UNDO_MOVE restores the canvas and pile to the pre-move state", async () => {
    room.gameState = makeStateWithCanvasCards("player-1", [makeCard("A-s"), makeCard("K-h")]);

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "K-h"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "discard",
    }), sender);
    expect(room.gameState.canvasCards).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);
    expect(room.gameState.canvasCards.map(cc => cc.card.id)).toEqual(["A-s", "K-h"]);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
  });
});

function lastMoveMessages(conn: ReturnType<typeof makeMockConnection>) {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string))
    .filter((e: { type: string }) => e.type === "LAST_MOVE");
}

describe("PLAY_CARD_SET LAST_MOVE broadcast", () => {
  it("emits LAST_MOVE with all cardIds after multi-card play", async () => {
    const conn1 = makeMockConnection("player-1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [
      { id: "A-s", suit: "spades", rank: "A", faceUp: true },
      { id: "2-s", suit: "spades", rank: "2", faceUp: true },
    ];

    await room.onMessage(JSON.stringify({
      type: "PLAY_CARD_SET",
      cardIds: ["A-s", "2-s"],
      fromZone: "hand", fromId: "player-1",
      toZone: "pile", toId: "discard",
    }), conn1);

    const msgs = lastMoveMessages(conn1);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].toZoneType).toBe("pile");
    expect(msgs[0].toZoneId).toBe("discard");
    expect(msgs[0].cardIds).toEqual(["A-s", "2-s"]);
  });
});
