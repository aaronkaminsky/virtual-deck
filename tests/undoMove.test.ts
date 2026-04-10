import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, takeSnapshot, viewFor } from "../party/index";
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

describe("takeSnapshot", () => {
  it("pushes a deep clone onto the shared undoSnapshots array with nested snapshots stripped", () => {
    const state = defaultGameState("test-room");
    const existing = defaultGameState("test-room");
    state.undoSnapshots.push(existing);

    takeSnapshot(state);

    expect(state.undoSnapshots).toHaveLength(2);
    const snap = state.undoSnapshots[1];
    expect(snap).not.toBe(state);
    expect(snap.undoSnapshots).toEqual([]);
  });

  it("caps the stack at 20 entries", () => {
    const state = defaultGameState("test-room");
    for (let i = 0; i < 22; i++) {
      takeSnapshot(state);
    }
    expect(state.undoSnapshots).toHaveLength(20);
  });
});

describe("UNDO_MOVE handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };
  let player2: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    player2 = makeMockConnection("player-2");
    room.gameState.players.push({ id: "player-1", connected: true });
    room.gameState.players.push({ id: "player-2", connected: true });
    room.gameState.hands["player-1"] = [];
    room.gameState.hands["player-2"] = [];
  });

  it("restores gameState from the top of the shared stack", async () => {
    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);
    takeSnapshot(room.gameState);

    room.gameState.hands["player-1"].pop();
    expect(room.gameState.hands["player-1"]).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe("A-s");
  });

  it("is a no-op when the stack is empty (no error, state unchanged)", async () => {
    const card = makeCard("K-h");
    room.gameState.hands["player-1"].push(card);

    expect(room.gameState.undoSnapshots).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(1);
  });

  it("after undo, canUndo is false when stack is empty", async () => {
    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);
    takeSnapshot(room.gameState);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    const view = viewFor(room.gameState, "player-1");
    expect(view.canUndo).toBe(false);
  });

  it("any player can undo another player's move", async () => {
    // Use only a single card in the draw pile for clarity
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards.length = 0;
    drawPile.cards.push(makeCard("A-s"));

    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);
    expect(room.gameState.hands["player-1"]).toHaveLength(1);

    // player-2 sends UNDO_MOVE — should revert player-1's draw
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), player2);

    expect(room.gameState.hands["player-1"]).toHaveLength(0);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(1);
  });

  it("stack clears on RESET_TABLE", async () => {
    room.gameState.undoSnapshots.push(defaultGameState("test-room"));
    room.gameState.undoSnapshots.push(defaultGameState("test-room"));

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(room.gameState.undoSnapshots).toEqual([]);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(false);
  });

  it("re-enables canUndo after MOVE_CARD following an undo", async () => {
    const card1 = makeCard("A-s");
    const card2 = makeCard("K-h");
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards.push(card1, card2);

    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "K-h", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(false);

    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "K-h", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);

    const handCard = room.gameState.hands["player-1"][0];
    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: handCard.id, fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard" }),
      sender,
    );

    expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);
  });

  it("MOVE_CARD undo restores card to original zone", async () => {
    const card = makeCard("A-s");
    room.gameState.piles.find(p => p.id === "draw")!.cards.push(card);

    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);
    const handCard = room.gameState.hands["player-1"][0];
    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: handCard.id, fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard" }),
      sender,
    );

    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe(handCard.id);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
  });

  it("canUndo reflects shared stack depth (multiple moves)", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards.push(makeCard("A-s"), makeCard("2-s"), makeCard("3-s"));

    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "3-s", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);
    await room.onMessage(JSON.stringify({ type: "MOVE_CARD", cardId: "2-s", fromZone: "pile", fromId: "draw", toZone: "hand", toId: "player-1" }), sender);

    expect(room.gameState.undoSnapshots).toHaveLength(2);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);
    expect(viewFor(room.gameState, "player-2").canUndo).toBe(true);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);
    expect(room.gameState.undoSnapshots).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(false);
  });
});
