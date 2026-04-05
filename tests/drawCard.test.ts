import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, ServerEvent } from "../src/shared/types";
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

describe("DRAW_CARD handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    room.gameState = defaultGameState("test-room");
    sender = makeMockConnection("player-1");
  });

  it("sends MISSING_PILE_ID error when pileId is missing", async () => {
    const msg = JSON.stringify({ type: "DRAW_CARD" });
    await room.onMessage(msg, sender);

    expect(sender.send).toHaveBeenCalledTimes(1);
    const parsed: ServerEvent = JSON.parse(sender.send.mock.calls[0][0]);
    expect(parsed.type).toBe("ERROR");
    expect((parsed as { type: "ERROR"; code: string }).code).toBe("MISSING_PILE_ID");
  });

  it("sends PILE_NOT_FOUND error when pileId is nonexistent", async () => {
    const msg = JSON.stringify({ type: "DRAW_CARD", pileId: "nonexistent" });
    await room.onMessage(msg, sender);

    expect(sender.send).toHaveBeenCalledTimes(1);
    const parsed: ServerEvent = JSON.parse(sender.send.mock.calls[0][0]);
    expect(parsed.type).toBe("ERROR");
    expect((parsed as { type: "ERROR"; code: string }).code).toBe("PILE_NOT_FOUND");
  });

  it("sends PILE_EMPTY error when pile exists but has no cards", async () => {
    room.gameState.piles.find(p => p.id === "draw")!.cards = [];
    const msg = JSON.stringify({ type: "DRAW_CARD", pileId: "draw" });
    await room.onMessage(msg, sender);

    expect(sender.send).toHaveBeenCalledTimes(1);
    const parsed: ServerEvent = JSON.parse(sender.send.mock.calls[0][0]);
    expect(parsed.type).toBe("ERROR");
    expect((parsed as { type: "ERROR"; code: string }).code).toBe("PILE_EMPTY");
  });

  it("moves card to hand and sends no error when pile has cards", async () => {
    const initialCount = room.gameState.piles.find(p => p.id === "draw")!.cards.length;
    expect(initialCount).toBeGreaterThan(0);

    const msg = JSON.stringify({ type: "DRAW_CARD", pileId: "draw" });
    await room.onMessage(msg, sender);

    const afterCount = room.gameState.piles.find(p => p.id === "draw")!.cards.length;
    expect(afterCount).toBe(initialCount - 1);
    expect(room.gameState.hands["player-1"]).toHaveLength(1);

    const calls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errorCalls = calls.filter(c => {
      const parsed = JSON.parse(c);
      return parsed.type === "ERROR";
    });
    expect(errorCalls).toHaveLength(0);
  });
});
