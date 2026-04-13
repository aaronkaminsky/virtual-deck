import { describe, it, expect, vi } from "vitest";
import GameRoom, { viewFor } from "../party/index";
import type { GameState, Card } from "../src/shared/types";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function makeTestState(): GameState {
  return {
    roomId: "test-room",
    phase: "lobby",
    players: [],
    hands: {},
    piles: [
      { id: "draw", name: "Draw", cards: [makeCard("A-s"), makeCard("K-s")], faceUp: false },
      { id: "discard", name: "Discard", cards: [], faceUp: true },
      { id: "play", name: "Play Area", cards: [], faceUp: true },
    ],
    undoSnapshots: [],
  };
}

function makeMockRoom(roomId = "room-abc") {
  return {
    id: roomId,
    getConnections: vi.fn(() => [][Symbol.iterator]()),
    broadcast: vi.fn(),
    storage: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  } as any;
}

function makeMockConnection(connId: string, playerToken?: string) {
  const conn = {
    id: connId,
    state: playerToken ? { playerToken } : null as any,
    setState: (s: any) => { conn.state = s; },
    send: vi.fn(),
    close: vi.fn(),
  } as any;
  return conn;
}

function makeMockCtx(url: string) {
  return { request: { url } } as any;
}

describe("displayName", () => {
  it("new player gets displayName from ?name= param", async () => {
    const room = new GameRoom(makeMockRoom());
    room.gameState = makeTestState();

    const conn = makeMockConnection("conn-1");
    const ctx = makeMockCtx("http://localhost?player=p1&name=Aaron");

    await room.onConnect(conn, ctx);

    expect(room.gameState.players[0].displayName).toBe("Aaron");
  });

  it("new player without ?name= gets empty displayName", async () => {
    const room = new GameRoom(makeMockRoom());
    room.gameState = makeTestState();

    const conn = makeMockConnection("conn-1");
    const ctx = makeMockCtx("http://localhost?player=p1");

    await room.onConnect(conn, ctx);

    expect(room.gameState.players[0].displayName).toBe("");
  });

  it("displayName truncated to 20 chars", async () => {
    const room = new GameRoom(makeMockRoom());
    room.gameState = makeTestState();

    const conn = makeMockConnection("conn-1");
    const longName = "A".repeat(25);
    const ctx = makeMockCtx(`http://localhost?player=p1&name=${longName}`);

    await room.onConnect(conn, ctx);

    expect(room.gameState.players[0].displayName.length).toBe(20);
  });

  it("reconnect updates displayName when non-empty", async () => {
    const room = new GameRoom(makeMockRoom());
    room.gameState = makeTestState();

    // First connect with name=Aaron
    const conn1 = makeMockConnection("conn-1");
    await room.onConnect(conn1, makeMockCtx("http://localhost?player=p1&name=Aaron"));
    expect(room.gameState.players[0].displayName).toBe("Aaron");

    // Reconnect with name=Bob
    const conn2 = makeMockConnection("conn-2");
    await room.onConnect(conn2, makeMockCtx("http://localhost?player=p1&name=Bob"));

    expect(room.gameState.players[0].displayName).toBe("Bob");
  });

  it("reconnect preserves displayName when name param is empty", async () => {
    const room = new GameRoom(makeMockRoom());
    room.gameState = makeTestState();

    // First connect with name=Aaron
    const conn1 = makeMockConnection("conn-1");
    await room.onConnect(conn1, makeMockCtx("http://localhost?player=p1&name=Aaron"));
    expect(room.gameState.players[0].displayName).toBe("Aaron");

    // Reconnect without ?name=
    const conn2 = makeMockConnection("conn-2");
    await room.onConnect(conn2, makeMockCtx("http://localhost?player=p1"));

    expect(room.gameState.players[0].displayName).toBe("Aaron");
  });

  it("viewFor includes displayName in players array", async () => {
    const room = new GameRoom(makeMockRoom());
    room.gameState = makeTestState();

    const conn = makeMockConnection("conn-1");
    await room.onConnect(conn, makeMockCtx("http://localhost?player=p1&name=Aaron"));

    const view = viewFor(room.gameState, "p1");
    expect(view.players[0].displayName).toBe("Aaron");
  });

  it("onStart migrates players without displayName", async () => {
    const mockRoom = makeMockRoom();
    const legacyState: any = {
      roomId: "test-room",
      phase: "lobby",
      players: [{ id: "p1", connected: true }],
      hands: { p1: [] },
      piles: [],
      undoSnapshots: [],
    };
    mockRoom.storage.get.mockResolvedValue(legacyState);

    const room = new GameRoom(mockRoom);
    await room.onStart();

    expect(room.gameState.players[0].displayName).toBe("");
  });
});
