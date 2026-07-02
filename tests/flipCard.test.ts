import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, takeSnapshot } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";
import { makeMockRoom as helpMakeMockRoom, makeMockConnection as helpMakeMockConnection } from "./helpers";

function makeCard(id: string, faceUp = false): Card {
  return { id, suit: "spades", rank: "A", faceUp };
}

function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
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

describe("FLIP_CARD handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
  });

  it("sets faceUp to true on a face-down pile card", async () => {
    const card = makeCard("A-s", false);
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(card);

    await room.onMessage(JSON.stringify({ type: "FLIP_CARD", pileId: "discard", cardId: "A-s" }), sender);

    const flipped = room.gameState.piles.find(p => p.id === "discard")!.cards[0];
    expect(flipped.faceUp).toBe(true);
  });

  it("toggles faceUp to false on a face-up pile card", async () => {
    const card = makeCard("A-s", true);
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(card);

    await room.onMessage(JSON.stringify({ type: "FLIP_CARD", pileId: "discard", cardId: "A-s" }), sender);

    const flipped = room.gameState.piles.find(p => p.id === "discard")!.cards[0];
    expect(flipped.faceUp).toBe(false);
  });

  it("sends ERROR with code PILE_NOT_FOUND for invalid pileId", async () => {
    await room.onMessage(JSON.stringify({ type: "FLIP_CARD", pileId: "nonexistent", cardId: "A-s" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("PILE_NOT_FOUND");
  });

  it("sends ERROR with code CARD_NOT_FOUND for invalid cardId", async () => {
    await room.onMessage(JSON.stringify({ type: "FLIP_CARD", pileId: "discard", cardId: "nonexistent" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("CARD_NOT_FOUND");
  });

  it("creates an undo snapshot for the sender", async () => {
    const card = makeCard("A-s", false);
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(card);

    await room.onMessage(JSON.stringify({ type: "FLIP_CARD", pileId: "discard", cardId: "A-s" }), sender);

    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });
});

function lastMoveMessages(conn: ReturnType<typeof helpMakeMockConnection>) {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string))
    .filter((e: { type: string }) => e.type === "LAST_MOVE");
}

describe("FLIP_CARD LAST_MOVE broadcast", () => {
  it("emits LAST_MOVE with toZoneType=pile after flipping a card", async () => {
    const conn1 = helpMakeMockConnection("player-1");
    const room = new GameRoom(helpMakeMockRoom([conn1]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    const discardPile = room.gameState.piles.find(p => p.id === "discard")!;
    discardPile.faceUp = true;
    discardPile.cards.push({ id: "Q-d", suit: "diamonds", rank: "Q", faceUp: true });

    await room.onMessage(JSON.stringify({
      type: "FLIP_CARD", pileId: "discard", cardId: "Q-d",
    }), conn1);

    const msgs = lastMoveMessages(conn1);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].toZoneType).toBe("pile");
    expect(msgs[0].toZoneId).toBe("discard");
    expect(msgs[0].cardIds).toEqual(["Q-d"]);
  });
});
