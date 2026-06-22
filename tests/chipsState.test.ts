import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("chips data model defaults", () => {
  it("defaultGameState initializes chipsEnabled:false, startingChips:1000, pot:0, chipsInitialized:false", () => {
    const state = defaultGameState("room-1");
    expect(state.chipsEnabled).toBe(false);
    expect(state.startingChips).toBe(1000);
    expect(state.pot).toBe(0);
    expect(state.chipsInitialized).toBe(false);
  });

  it("onStart migrates persisted state from before chips existed", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    const legacyState = defaultGameState("room-1");
    legacyState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 } as any);
    delete (legacyState as any).chipsEnabled;
    delete (legacyState as any).startingChips;
    delete (legacyState as any).pot;
    delete (legacyState as any).chipsInitialized;
    delete (legacyState.players[0] as any).chipsInHand;
    delete (legacyState.players[0] as any).chipsInSpread;
    (room.room.storage.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(legacyState);

    await room.onStart();

    expect(room.gameState.chipsEnabled).toBe(false);
    expect(room.gameState.startingChips).toBe(1000);
    expect(room.gameState.pot).toBe(0);
    expect(room.gameState.chipsInitialized).toBe(false);
    expect(room.gameState.players[0].chipsInHand).toBe(0);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });
});
