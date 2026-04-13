import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
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
  };
  return conn;
}

function makeMockCtx(url: string) {
  return { request: { url } };
}

describe("onConnect: player identity uses ?player= query param", () => {
  it("sets playerToken from ?player= query param, not connection.id", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    gameRoom.gameState = makeTestState();

    const conn = makeMockConnection("conn-abc123");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=stable-player-id");

    await gameRoom.onConnect(conn as any, ctx as any);

    expect(conn.state?.playerToken).toBe("stable-player-id");
    expect(conn.state?.playerToken).not.toBe("conn-abc123");
  });

  it("adds player to gameState.players with the stable token from ?player= param", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    gameRoom.gameState = makeTestState();

    const conn = makeMockConnection("conn-abc123");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=stable-player-id");

    await gameRoom.onConnect(conn as any, ctx as any);

    const playerEntry = gameRoom.gameState.players.find(p => p.id === "stable-player-id");
    expect(playerEntry).toBeDefined();
    expect(playerEntry?.connected).toBe(true);
  });
});

describe("onConnect: reconnecting player restores state", () => {
  it("reconnecting player (same ?player= token, different connection.id) gets connected:true restored", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    gameRoom.gameState = {
      ...makeTestState(),
      players: [{ id: "stable-player-id", connected: false, displayName: "" }],
      hands: { "stable-player-id": [makeCard("A-s")] },
    };

    const conn = makeMockConnection("conn-new-connection");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=stable-player-id");

    await gameRoom.onConnect(conn as any, ctx as any);

    const player = gameRoom.gameState.players.find(p => p.id === "stable-player-id");
    expect(player?.connected).toBe(true);
  });

  it("reconnecting player's hand is preserved, not reset to empty array", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    const existingHand = [makeCard("A-s"), makeCard("K-h")];
    gameRoom.gameState = {
      ...makeTestState(),
      players: [{ id: "stable-player-id", connected: false, displayName: "" }],
      hands: { "stable-player-id": existingHand },
    };

    const conn = makeMockConnection("conn-new-connection");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=stable-player-id");

    await gameRoom.onConnect(conn as any, ctx as any);

    expect(gameRoom.gameState.hands["stable-player-id"]).toHaveLength(2);
    expect(gameRoom.gameState.hands["stable-player-id"].map(c => c.id)).toEqual(["A-s", "K-h"]);
  });

  it("reconnecting player does not create a duplicate player entry", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    gameRoom.gameState = {
      ...makeTestState(),
      players: [{ id: "stable-player-id", connected: false, displayName: "" }],
      hands: { "stable-player-id": [makeCard("A-s")] },
    };

    const conn = makeMockConnection("conn-new-connection");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=stable-player-id");

    await gameRoom.onConnect(conn as any, ctx as any);

    const entries = gameRoom.gameState.players.filter(p => p.id === "stable-player-id");
    expect(entries).toHaveLength(1);
  });
});

describe("onConnect: slot-based 4-player cap", () => {
  it("rejects a 5th unique player even when some existing players are disconnected", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    gameRoom.gameState = {
      ...makeTestState(),
      players: [
        { id: "player-1", connected: true, displayName: "" },
        { id: "player-2", connected: true, displayName: "" },
        { id: "player-3", connected: false, displayName: "" },
        { id: "player-4", connected: false, displayName: "" },
      ],
      hands: {
        "player-1": [],
        "player-2": [],
        "player-3": [],
        "player-4": [],
      },
    };

    const conn = makeMockConnection("conn-new");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=player-5");

    await gameRoom.onConnect(conn as any, ctx as any);

    expect(conn.close).toHaveBeenCalledWith(4000, "Room is full — maximum 4 players");
    expect(gameRoom.gameState.players).toHaveLength(4);
  });

  it("reconnecting as an existing player is NOT blocked by the 4-player cap", async () => {
    const room = makeMockRoom();
    const gameRoom = new GameRoom(room);
    gameRoom.gameState = {
      ...makeTestState(),
      players: [
        { id: "player-1", connected: true, displayName: "" },
        { id: "player-2", connected: true, displayName: "" },
        { id: "player-3", connected: false, displayName: "" },
        { id: "player-4", connected: false, displayName: "" },
      ],
      hands: {
        "player-1": [],
        "player-2": [],
        "player-3": [makeCard("A-s")],
        "player-4": [],
      },
    };

    const conn = makeMockConnection("conn-player3-reconnect");
    const ctx = makeMockCtx("http://localhost:1999/parties/main/room-abc?player=player-3");

    await gameRoom.onConnect(conn as any, ctx as any);

    expect(conn.close).not.toHaveBeenCalled();
    const player3 = gameRoom.gameState.players.find(p => p.id === "player-3");
    expect(player3?.connected).toBe(true);
  });
});
