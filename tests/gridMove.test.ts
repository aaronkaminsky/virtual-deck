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

describe("MOVE_GRID_CARD handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
  });

  it("Test 1: updates gridPositions[cardId] to { row: 1, col: 3 } when card is in the play pile", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";
    playPile.cards.push(makeCard("A-s"));
    playPile.gridPositions = { "A-s": { row: 0, col: 0 } };

    await room.onMessage(JSON.stringify({
      type: "MOVE_GRID_CARD",
      cardId: "A-s",
      pileId: "play",
      toRow: 1,
      toCol: 3,
    }), sender);

    expect(playPile.gridPositions["A-s"]).toEqual({ row: 1, col: 3 });
  });

  it("Test 2: sends ERROR code INVALID_POSITION when toRow is out of range [0,1]", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";
    playPile.cards.push(makeCard("A-s"));

    await room.onMessage(JSON.stringify({
      type: "MOVE_GRID_CARD",
      cardId: "A-s",
      pileId: "play",
      toRow: 2,
      toCol: 0,
    }), sender);

    const sentMsg = JSON.parse(sender.send.mock.calls[0][0]) as ServerEvent;
    expect(sentMsg.type).toBe("ERROR");
    expect((sentMsg as { type: "ERROR"; code: string; message: string }).code).toBe("INVALID_POSITION");
  });

  it("Test 3: sends ERROR code INVALID_POSITION when toCol is out of range [0,6]", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";
    playPile.cards.push(makeCard("A-s"));

    await room.onMessage(JSON.stringify({
      type: "MOVE_GRID_CARD",
      cardId: "A-s",
      pileId: "play",
      toRow: 0,
      toCol: 7,
    }), sender);

    const sentMsg = JSON.parse(sender.send.mock.calls[0][0]) as ServerEvent;
    expect(sentMsg.type).toBe("ERROR");
    expect((sentMsg as { type: "ERROR"; code: string; message: string }).code).toBe("INVALID_POSITION");
  });

  it("Test 4: MOVE_CARD with toRow/toCol to 'play' pile assigns gridPositions[cardId]", async () => {
    room.gameState.hands["player-1"] = [makeCard("K-h")];
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";

    await room.onMessage(JSON.stringify({
      type: "MOVE_CARD",
      cardId: "K-h",
      fromZone: "hand",
      fromId: "player-1",
      toZone: "pile",
      toId: "play",
      toRow: 0,
      toCol: 4,
    }), sender);

    expect(playPile.gridPositions?.["K-h"]).toEqual({ row: 0, col: 4 });
  });

  it("Test 5: MOVE_CARD out of 'play' pile deletes gridPositions[cardId] from the pile", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";
    playPile.cards.push(makeCard("Q-d"));
    playPile.gridPositions = { "Q-d": { row: 1, col: 2 } };
    room.gameState.hands["player-1"] = [];

    await room.onMessage(JSON.stringify({
      type: "MOVE_CARD",
      cardId: "Q-d",
      fromZone: "pile",
      fromId: "play",
      toZone: "hand",
      toId: "player-1",
    }), sender);

    expect(playPile.gridPositions?.["Q-d"]).toBeUndefined();
  });

  it("Test 6: RESET_TABLE clears gridPositions on the play pile (gridPositions becomes {})", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";
    playPile.cards.push(makeCard("J-c"));
    playPile.gridPositions = { "J-c": { row: 0, col: 1 } };

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(playPile.gridPositions).toEqual({});
  });

  it("Test 7: viewFor includes gridPositions in ClientPile output", () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.region = "spread";
    playPile.cards.push(makeCard("A-s"));
    playPile.gridPositions = { "A-s": { row: 1, col: 3 } };

    const view = viewFor(room.gameState, "player-1");
    const clientPlayPile = view.piles.find(p => p.id === "play")!;

    expect(clientPlayPile.gridPositions).toBeDefined();
    expect(clientPlayPile.gridPositions!["A-s"]).toEqual({ row: 1, col: 3 });
  });
});
