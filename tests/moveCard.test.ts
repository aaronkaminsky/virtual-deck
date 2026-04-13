import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
    ...overrides,
  } as unknown as Party.Room;
}

function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

function makeStateWithPlayerAndCards(playerId: string, cards: Card[]): GameState {
  const state = defaultGameState("test-room");
  state.players.push({ id: playerId, connected: true, displayName: "" });
  state.hands[playerId] = cards;
  return state;
}

describe("MOVE_CARD handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  it("moves card from player hand to named pile", async () => {
    const card = makeCard("A-s");
    room.gameState = makeStateWithPlayerAndCards("player-1", [card]);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "hand",
      fromId: "player-1",
      toZone: "pile",
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(0);
    const discardPile = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discardPile.cards).toHaveLength(1);
    expect(discardPile.cards[0].id).toBe("A-s");
  });

  it("moves card from pile to player hand", async () => {
    const card = makeCard("K-h");
    room.gameState = makeStateWithPlayerAndCards("player-1", []);
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(card);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "K-h",
      fromZone: "pile",
      fromId: "discard",
      toZone: "hand",
      toId: "player-1",
    });
    await room.onMessage(msg, sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe("K-h");
    const discardPile = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discardPile.cards).toHaveLength(0);
  });

  it("moves card between piles (pile->pile)", async () => {
    const card = makeCard("Q-d");
    room.gameState = makeStateWithPlayerAndCards("player-1", []);
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(card);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "Q-d",
      fromZone: "pile",
      fromId: "discard",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    const play = room.gameState.piles.find(p => p.id === "play")!;
    expect(discard.cards).toHaveLength(0);
    expect(play.cards).toHaveLength(1);
    expect(play.cards[0].id).toBe("Q-d");
  });

  it("sends CARD_NOT_IN_SOURCE when cardId not found in source", async () => {
    room.gameState = makeStateWithPlayerAndCards("player-1", []);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "nonexistent-card",
      fromZone: "pile",
      fromId: "discard",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("CARD_NOT_IN_SOURCE");
  });

  it("sends PILE_NOT_FOUND when source pile id is invalid", async () => {
    room.gameState = makeStateWithPlayerAndCards("player-1", []);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "pile",
      fromId: "nonexistent-pile",
      toZone: "pile",
      toId: "play",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("PILE_NOT_FOUND");
  });

  it("sends PILE_NOT_FOUND when destination pile id is invalid", async () => {
    const card = makeCard("A-s");
    room.gameState = makeStateWithPlayerAndCards("player-1", [card]);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "hand",
      fromId: "player-1",
      toZone: "pile",
      toId: "nonexistent-pile",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("PILE_NOT_FOUND");
  });

  it("sends UNAUTHORIZED_MOVE when fromZone=hand and fromId != sender.id", async () => {
    const card = makeCard("A-s");
    room.gameState = makeStateWithPlayerAndCards("player-2", [card]);
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [];

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "hand",
      fromId: "player-2",
      toZone: "pile",
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("UNAUTHORIZED_MOVE");
    // Card should NOT have moved
    expect(room.gameState.hands["player-2"]).toHaveLength(1);
  });

  it("sends UNAUTHORIZED_MOVE when toZone=hand and toId != sender.id", async () => {
    const card = makeCard("A-s");
    room.gameState = makeStateWithPlayerAndCards("player-1", []);
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(card);
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-2"] = [];

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "pile",
      fromId: "discard",
      toZone: "hand",
      toId: "player-2",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("UNAUTHORIZED_MOVE");
  });

  // Regression: MOVE_CARD with fromZone="hand" used to accept any fromId because the
  // server compared fromId against a localStorage-derived playerId that was never set
  // as the connection's playerToken. After fixing onConnect to use connection.id as
  // playerToken, the UNAUTHORIZED_MOVE guard now correctly blocks cross-player moves
  // and correctly allows moves where fromId matches the sender's connection.id.
  it("regression: MOVE_CARD fromZone=hand rejected when fromId does not match sender token", async () => {
    const card = makeCard("7-s");
    room.gameState = makeStateWithPlayerAndCards("player-2", [card]);
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [];

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "7-s",
      fromZone: "hand",
      fromId: "player-2",  // mismatches sender (player-1)
      toZone: "pile",
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("UNAUTHORIZED_MOVE");
    // State must be unchanged — card stays in player-2's hand
    expect(room.gameState.hands["player-2"]).toHaveLength(1);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
  });

  it("regression: MOVE_CARD fromZone=hand accepted when fromId matches sender token", async () => {
    const card = makeCard("7-s");
    room.gameState = makeStateWithPlayerAndCards("player-1", [card]);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "7-s",
      fromZone: "hand",
      fromId: "player-1",  // matches sender
      toZone: "pile",
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map(c => JSON.parse(c) as ServerEvent).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(1);
  });

  it("hand->pile move updates opponentHandCounts via viewFor", async () => {
    const card = makeCard("A-s");
    room.gameState = makeStateWithPlayerAndCards("player-1", [card]);

    const beforeView = viewFor(room.gameState, "player-2");
    expect(beforeView.opponentHandCounts["player-1"]).toBe(1);

    const msg = JSON.stringify({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "hand",
      fromId: "player-1",
      toZone: "pile",
      toId: "discard",
    });
    await room.onMessage(msg, sender);

    const afterView = viewFor(room.gameState, "player-2");
    expect(afterView.opponentHandCounts["player-1"]).toBe(0);
  });
});
