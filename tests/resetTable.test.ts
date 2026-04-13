import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeCard(id: string, faceUp = false): Card {
  return { id, suit: "spades", rank: "A", faceUp };
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

describe("RESET_TABLE handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [makeCard("A-s", true), makeCard("K-h", true)];
    room.gameState.hands["player-2"] = [makeCard("Q-d", true)];
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("2-c"), makeCard("3-c"), makeCard("4-c")];
    room.gameState.piles.find(p => p.id === "discard")!.cards = [makeCard("5-s", true)];
    room.gameState.phase = "playing";
  });

  it("collects all cards from all hands and non-draw piles into draw pile", async () => {
    const totalCards = 2 + 1 + 3 + 1;

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(drawPile.cards).toHaveLength(totalCards);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
    expect(room.gameState.hands["player-2"]).toHaveLength(0);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
  });

  it("reshuffles the draw pile (card set preserved)", async () => {
    const originalDrawIds = room.gameState.piles.find(p => p.id === "draw")!.cards.map(c => c.id);
    const handCardIds = ["A-s", "K-h", "Q-d", "5-s"];
    const allExpectedIds = new Set([...originalDrawIds, ...handCardIds]);

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    const shuffledIds = room.gameState.piles.find(p => p.id === "draw")!.cards.map(c => c.id);
    expect(new Set(shuffledIds)).toEqual(allExpectedIds);
  });

  it("sets all cards faceUp to false", async () => {
    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    for (const card of drawPile.cards) {
      expect(card.faceUp).toBe(false);
    }
  });

  it("sets draw pile faceUp to false", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.faceUp = true;

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(room.gameState.piles.find(p => p.id === "draw")!.faceUp).toBe(false);
  });

  it("sets phase to setup", async () => {
    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(room.gameState.phase).toBe("setup");
  });

  it("clears all undoSnapshots", async () => {
    room.gameState.undoSnapshots.push(defaultGameState("test-room"));
    room.gameState.undoSnapshots.push(defaultGameState("test-room"));

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(room.gameState.undoSnapshots).toEqual([]);
  });
});
