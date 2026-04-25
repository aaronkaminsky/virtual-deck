import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type { GameState } from "../src/shared/types";
import type * as Party from "partykit/server";
import { makeMockRoom } from "./helpers";

// Local helper that includes setState — required for onConnect calls
function makeConnectableConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    setState: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

function makeOldShapeState(): GameState {
  // Simulates state persisted before Phase 14 — no region/ownerId fields, no communal.
  return {
    roomId: "test-room",
    phase: "playing",
    players: [{ id: "alice", connected: true, displayName: "Alice" }],
    hands: { alice: [] },
    piles: [
      // region and ownerId INTENTIONALLY absent — onStart migration must add them
      { id: "draw", name: "Draw", cards: [], faceUp: false } as any,
      { id: "discard", name: "Discard", cards: [], faceUp: true } as any,
      { id: "play", name: "Play Area", cards: [], faceUp: true } as any,
    ],
    undoSnapshots: [],
  };
}

function makeTestState(): GameState {
  return {
    roomId: "test-room",
    phase: "playing",
    players: [{ id: "player-1", connected: true, displayName: "Alice" }],
    hands: { "player-1": [] },
    piles: [
      { id: "draw", name: "Draw", cards: [], faceUp: false, region: "pile", ownerId: null },
      { id: "spread-communal", name: "Communal", cards: [], faceUp: true, region: "spread", ownerId: null },
    ],
    undoSnapshots: [],
  };
}

describe("spread zone creation", () => {
  it("defaultGameState includes spread-communal in piles", () => {
    const state = defaultGameState("room-id");
    const communal = state.piles.find(p => p.id === "spread-communal");
    expect(communal).toBeDefined();
    expect(communal?.region).toBe("spread");
    expect(communal?.ownerId).toBeNull();
    expect(communal?.faceUp).toBe(true);
    expect(communal?.cards).toHaveLength(0);
  });

  it("defaultGameState existing piles have region pile and ownerId null", () => {
    const state = defaultGameState("room-id");
    const draw = state.piles.find(p => p.id === "draw");
    const discard = state.piles.find(p => p.id === "discard");
    const play = state.piles.find(p => p.id === "play");
    expect(draw?.region).toBe("pile");
    expect(draw?.ownerId).toBeNull();
    expect(discard?.region).toBe("pile");
    expect(discard?.ownerId).toBeNull();
    expect(play?.region).toBe("pile");
    expect(play?.ownerId).toBeNull();
  });

  it("viewFor returns myPlayZoneId equal to spread-{playerToken} for a connected player", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.myPlayZoneId).toBe("spread-player-1");
  });

  it("viewFor returns empty string myPlayZoneId for null playerToken", () => {
    const state = makeTestState();
    const view = viewFor(state, null);
    expect(view.myPlayZoneId).toBe("");
  });

  it("onConnect creates personal spread zone for new player", async () => {
    const mockRoom = makeMockRoom();
    const room = new GameRoom(mockRoom);
    const conn = makeConnectableConnection("alice");
    const mockCtx = {
      request: { url: "http://localhost?player=alice&name=Alice" },
    } as unknown as Party.ConnectionContext;

    await room.onConnect(conn, mockCtx);

    const spreadZone = room.gameState.piles.find(p => p.id === "spread-alice");
    expect(spreadZone).toBeDefined();
    expect(spreadZone?.ownerId).toBe("alice");
    expect(spreadZone?.region).toBe("spread");
    expect(spreadZone?.faceUp).toBe(true);
    expect(spreadZone?.cards).toHaveLength(0);
  });

  it("onConnect does not create duplicate zone on reconnect (SC-4)", async () => {
    const mockRoom = makeMockRoom();
    const room = new GameRoom(mockRoom);
    const conn = makeConnectableConnection("alice");
    const mockCtx = {
      request: { url: "http://localhost?player=alice&name=Alice" },
    } as unknown as Party.ConnectionContext;

    await room.onConnect(conn, mockCtx);
    await room.onConnect(conn, mockCtx);

    const spreadZones = room.gameState.piles.filter(p => p.id === "spread-alice");
    expect(spreadZones).toHaveLength(1);
  });

  it("onStart migration adds region and ownerId defaults to existing piles", async () => {
    const mockRoom = makeMockRoom([], {
      storage: {
        get: vi.fn().mockResolvedValue(makeOldShapeState()),
        put: vi.fn().mockResolvedValue(undefined),
      } as any,
    });
    const room = new GameRoom(mockRoom);
    await room.onStart();

    for (const pile of room.gameState.piles) {
      expect("region" in pile).toBe(true);
      expect("ownerId" in pile).toBe(true);
    }
  });

  it("onStart migration seeds spread-communal if missing from persisted state", async () => {
    const mockRoom = makeMockRoom([], {
      storage: {
        get: vi.fn().mockResolvedValue(makeOldShapeState()),
        put: vi.fn().mockResolvedValue(undefined),
      } as any,
    });
    const room = new GameRoom(mockRoom);
    await room.onStart();

    const communal = room.gameState.piles.find(p => p.id === "spread-communal");
    expect(communal).toBeDefined();
    expect(communal?.region).toBe("spread");
    expect(communal?.ownerId).toBeNull();
  });
});
