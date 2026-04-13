import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
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

describe("PASS_CARD handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [];
    room.gameState.hands["player-2"] = [];
  });

  it("moves card from sender hand to target player hand", async () => {
    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);

    await room.onMessage(JSON.stringify({ type: "PASS_CARD", cardId: "A-s", targetPlayerId: "player-2" }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(0);
    expect(room.gameState.hands["player-2"]).toHaveLength(1);
    expect(room.gameState.hands["player-2"][0].id).toBe("A-s");
  });

  it("sets card faceUp to true in recipient hand", async () => {
    const card = makeCard("A-s", false);
    room.gameState.hands["player-1"].push(card);

    await room.onMessage(JSON.stringify({ type: "PASS_CARD", cardId: "A-s", targetPlayerId: "player-2" }), sender);

    expect(room.gameState.hands["player-2"][0].faceUp).toBe(true);
  });

  it("sends ERROR with code CARD_NOT_IN_HAND when card not in sender hand", async () => {
    await room.onMessage(JSON.stringify({ type: "PASS_CARD", cardId: "nonexistent", targetPlayerId: "player-2" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("CARD_NOT_IN_HAND");
  });

  it("sends ERROR with code PLAYER_NOT_FOUND for invalid targetPlayerId", async () => {
    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);

    await room.onMessage(JSON.stringify({ type: "PASS_CARD", cardId: "A-s", targetPlayerId: "nonexistent-player" }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("PLAYER_NOT_FOUND");
  });

  it("viewFor after PASS_CARD shows card in recipient's myHand, not in sender's; third player sees opponentHandCounts change", async () => {
    const player3 = makeMockConnection("player-3");
    room.gameState.players.push({ id: "player-3", connected: true, displayName: "" });
    room.gameState.hands["player-3"] = [];

    const card = makeCard("A-s");
    room.gameState.hands["player-1"].push(card);

    const beforeP1 = viewFor(room.gameState, "player-1");
    const beforeP2 = viewFor(room.gameState, "player-2");
    expect(beforeP1.myHand).toHaveLength(1);
    expect(beforeP2.myHand).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "PASS_CARD", cardId: "A-s", targetPlayerId: "player-2" }), sender);

    const afterP1 = viewFor(room.gameState, "player-1");
    const afterP2 = viewFor(room.gameState, "player-2");
    const afterP3 = viewFor(room.gameState, "player-3");

    expect(afterP1.myHand).toHaveLength(0);
    expect(afterP2.myHand).toHaveLength(1);
    expect(afterP2.myHand[0].id).toBe("A-s");
    expect(afterP3.opponentHandCounts["player-1"]).toBe(0);
    expect(afterP3.opponentHandCounts["player-2"]).toBe(1);
  });
});
