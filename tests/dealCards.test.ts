import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
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

describe("DEAL_CARDS handler", () => {
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

  it("distributes N cards per player in round-robin order from draw pile", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(drawPile.cards.length).toBeGreaterThanOrEqual(4);

    const initialCount = drawPile.cards.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    expect(drawPile.cards).toHaveLength(initialCount - 4);
  });

  it("sets phase to playing", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.phase).toBe("playing");
  });

  it("sends ERROR with code INSUFFICIENT_CARDS when draw pile has too few cards", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("A-s")];

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 5 }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INSUFFICIENT_CARDS");
  });

  it("deals only to connected players (skips disconnected)", async () => {
    room.gameState.players.push({ id: "player-3", connected: false });
    room.gameState.hands["player-3"] = [];

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const initialCount = drawPile.cards.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    expect(room.gameState.hands["player-3"]).toHaveLength(0);
    expect(drawPile.cards).toHaveLength(initialCount - 4);
  });

  it("sets dealt cards faceUp to true", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    for (const card of room.gameState.hands["player-1"]) {
      expect(card.faceUp).toBe(true);
    }
    for (const card of room.gameState.hands["player-2"]) {
      expect(card.faceUp).toBe(true);
    }
  });

  // Regression: DEAL_CARDS used to only deal to the player who sent the action.
  // Both players must receive cards even when the sender is only one of them.
  it("regression: non-sender players also receive cards (deal distributes to all, not just sender)", async () => {
    // sender is player-1; player-2 is the non-sending connected player
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 3 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(3);
    expect(room.gameState.hands["player-2"]).toHaveLength(3);
  });
});
