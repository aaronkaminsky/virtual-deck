import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";

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

describe("SHUFFLE_PILE handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [];
  });

  it("randomizes the target pile's card order (same set of cards)", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const originalIds = drawPile.cards.map(c => c.id);

    await room.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "draw" }), sender);

    const shuffledIds = room.gameState.piles.find(p => p.id === "draw")!.cards.map(c => c.id);

    expect(shuffledIds).toHaveLength(originalIds.length);
    expect(new Set(shuffledIds)).toEqual(new Set(originalIds));
  });

  it("sends ERROR with code PILE_NOT_FOUND for invalid pileId", async () => {
    await room.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "nonexistent" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("PILE_NOT_FOUND");
  });

  it("creates an undo snapshot for the sender", async () => {
    await room.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "draw" }), sender);

    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("broadcasts PILE_SHUFFLED event to all connections", async () => {
    const conn1 = makeMockConnection("conn-1");
    const conn2 = makeMockConnection("conn-2");
    const connections = [conn1, conn2];
    const roomWithConns = makeMockRoom({
      getConnections: (() => connections[Symbol.iterator]()) as unknown as Party.Room["getConnections"],
    });
    const connectedRoom = new GameRoom(roomWithConns);
    connectedRoom.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    connectedRoom.gameState.hands["player-1"] = [];

    await connectedRoom.onMessage(JSON.stringify({ type: "SHUFFLE_PILE", pileId: "draw" }), conn1);

    const conn1Messages = conn1.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
    const conn2Messages = conn2.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);

    const shuffleEvents1 = conn1Messages.filter(e => e.type === "PILE_SHUFFLED");
    const shuffleEvents2 = conn2Messages.filter(e => e.type === "PILE_SHUFFLED");

    expect(shuffleEvents1).toHaveLength(1);
    expect((shuffleEvents1[0] as { type: "PILE_SHUFFLED"; pileId: string }).pileId).toBe("draw");
    expect(shuffleEvents2).toHaveLength(1);
    expect((shuffleEvents2[0] as { type: "PILE_SHUFFLED"; pileId: string }).pileId).toBe("draw");
  });
});
