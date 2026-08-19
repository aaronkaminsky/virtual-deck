import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom from "../party/index";
import type { Card } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeCard(id: string, faceUp = false): Card {
  return { id, suit: "spades", rank: "A", faceUp };
}

function makeMockRoom(): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    setAlarm: vi.fn().mockResolvedValue(undefined),
    getAlarm: vi.fn().mockResolvedValue(null),
    deleteAlarm: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
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

describe("SET_JOKERS_MODE handler (1039)", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [makeCard("A-s", true), makeCard("K-h", true)];
    room.gameState.piles.find(p => p.id === "discard")!.cards = [makeCard("5-s", true)];
    room.gameState.canvasCards.push({ card: makeCard("2-c", true), x: 10, y: 10, z: 1 });
    room.gameState.phase = "playing";
  });

  function drawPile() {
    return room.gameState.piles.find(p => p.id === "draw")!;
  }

  function allCardIds(): string[] {
    return [
      ...Object.values(room.gameState.hands).flat(),
      ...room.gameState.piles.flatMap(p => p.cards),
      ...room.gameState.canvasCards.map(c => c.card),
    ].map(c => c.id);
  }

  it("enabling puts 54 cards in the draw pile and resets the table", async () => {
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: true }), sender);

    expect(room.gameState.jokersEnabled).toBe(true);
    expect(drawPile().cards).toHaveLength(54);
    expect(drawPile().cards.filter(c => c.rank === "JOKER")).toHaveLength(2);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
    expect(room.gameState.canvasCards).toHaveLength(0);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(0);
    expect(room.gameState.phase).toBe("setup");
    expect(room.gameState.undoSnapshots).toEqual([]);
    expect(drawPile().cards.every(c => c.faceUp === false)).toBe(true);
  });

  it("disabling removes every joker from the game", async () => {
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: true }), sender);
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: false }), sender);

    expect(room.gameState.jokersEnabled).toBe(false);
    expect(drawPile().cards).toHaveLength(52);
    expect(allCardIds()).not.toContain("JOKER-r");
    expect(allCardIds()).not.toContain("JOKER-b");
  });

  it("toggling to the value already set is a no-op", async () => {
    room.gameState.phase = "playing";
    const handBefore = room.gameState.hands["player-1"].map(c => c.id);

    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: false }), sender);

    expect(room.gameState.phase).toBe("playing");
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(handBefore);
  });

  it("treats a non-boolean enabled as false", async () => {
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: true }), sender);
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: "true" }), sender);

    expect(room.gameState.jokersEnabled).toBe(false);
    expect(drawPile().cards).toHaveLength(52);
  });

  it("leaves chips, pot, and players untouched", async () => {
    room.gameState.chipsEnabled = true;
    room.gameState.pot = 250;
    room.gameState.players[0].chipsInHand = 750;

    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: true }), sender);

    expect(room.gameState.chipsEnabled).toBe(true);
    expect(room.gameState.pot).toBe(250);
    expect(room.gameState.players[0].chipsInHand).toBe(750);
  });

  it("is not undoable", async () => {
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: true }), sender);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });
});
