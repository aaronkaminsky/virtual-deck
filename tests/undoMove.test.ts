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
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

describe("takeSnapshot", () => {
  it("stores a deep clone of GameState with undoSnapshots stripped to {}", () => {
    const state = defaultGameState("test-room");
    state.undoSnapshots["player-2"] = defaultGameState("test-room");

    takeSnapshot(state, "player-1");

    const snap = state.undoSnapshots["player-1"]!;
    expect(snap).not.toBe(state);
    expect(snap.undoSnapshots).toEqual({});
    expect(snap.undoSnapshots["player-2"]).toBeUndefined();
  });
});

describe("UNDO_MOVE handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true });
    room.gameState.players.push({ id: "player-2", connected: true });
    room.gameState.hands["player-1"] = [];
    room.gameState.hands["player-2"] = [];
  });

  it("restores gameState from the sender's snapshot", async () => {
    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);
    takeSnapshot(room.gameState, "player-1");

    room.gameState.hands["player-1"].pop();
    expect(room.gameState.hands["player-1"]).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe("A-s");
  });

  it("is a no-op when no snapshot exists (no error, state unchanged)", async () => {
    const card = makeCard("K-h");
    room.gameState.hands["player-1"].push(card);

    expect(room.gameState.undoSnapshots["player-1"]).toBeUndefined();

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(1);
  });

  it("after undo, canUndo is false for that player in ClientGameState", async () => {
    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);
    takeSnapshot(room.gameState, "player-1");

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    const view = viewFor(room.gameState, "player-1");
    expect(view.canUndo).toBe(false);
  });

  it("does not affect other players' snapshots", async () => {
    const snapshotForP2 = defaultGameState("test-room");
    room.gameState.undoSnapshots["player-2"] = snapshotForP2;

    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);
    takeSnapshot(room.gameState, "player-1");

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.undoSnapshots["player-2"]).not.toBeNull();
  });
});
