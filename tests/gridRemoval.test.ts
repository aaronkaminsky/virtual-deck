import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Pile } from "../src/shared/types";
import type * as Party from "partykit/server";

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

describe("Phase 31 — grid removal regression", () => {
  it("Test A: defaultGameState returns exactly draw and discard piles — no 'play' pile", () => {
    const state = defaultGameState("test-room");

    const pileIds = state.piles.map(p => p.id).sort();
    expect(pileIds).toEqual(["discard", "draw"]);

    const playPile = state.piles.find(p => p.id === "play");
    expect(playPile).toBeUndefined();

    // Confirm both piles have region: "pile" (not "spread")
    for (const pile of state.piles) {
      expect(pile.region).toBe("pile");
    }
  });

  it("Test B: sending MOVE_GRID_CARD does not throw and does not mutate state", async () => {
    const mockRoom = makeMockRoom();
    const room = new GameRoom(mockRoom);
    const sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });

    const beforePileIds = room.gameState.piles.map(p => p.id);
    const beforePileLengths = room.gameState.piles.map(p => p.cards.length);

    // Must not throw — unknown action falls through switch silently
    await room.onMessage(
      JSON.stringify({ type: "MOVE_GRID_CARD", cardId: "A-s", pileId: "play", toRow: 0, toCol: 0 }),
      sender,
    );

    // State must be unchanged
    expect(room.gameState.piles.map(p => p.id)).toEqual(beforePileIds);
    expect(room.gameState.piles.map(p => p.cards.length)).toEqual(beforePileLengths);
  });

  it("Test C: Pile type has no gridPositions field (compile-time assertion)", () => {
    // @ts-expect-error gridPositions removed in Phase 31
    const p: Pile = { id: "x", name: "x", cards: [], gridPositions: {} };
    // The @ts-expect-error above must suppress a real error — if gridPositions were still
    // present on the type, TypeScript would report "Unused '@ts-expect-error' directive".
    // That would cause the test file to fail typecheck, which is the intended loudly-failing guard.
    expect(p).toBeDefined(); // silence unused-variable lint
  });
});
