import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState, defaultTokens, viewFor } from "../party/index";
import { makeMockRoom } from "./helpers";
import type { GameState } from "../src/shared/types";

describe("token state plumbing", () => {
  it("defaultGameState starts with tokensEnabled false and all four tokens in the tray", () => {
    const state = defaultGameState("room-1");
    expect(state.tokensEnabled).toBe(false);
    expect(state.tokens).toEqual([
      { id: "dealer", placement: { kind: "tray" } },
      { id: "red", placement: { kind: "tray" } },
      { id: "blue", placement: { kind: "tray" } },
      { id: "green", placement: { kind: "tray" } },
    ]);
  });

  it("viewFor passes tokens and tokensEnabled through unmasked", () => {
    const state = defaultGameState("room-1");
    state.tokensEnabled = true;
    state.tokens[0].placement = { kind: "canvas", x: 10, y: 20, z: 3 };
    const view = viewFor(state, "player-1");
    expect(view.tokensEnabled).toBe(true);
    expect(view.tokens[0]).toEqual({ id: "dealer", placement: { kind: "canvas", x: 10, y: 20, z: 3 } });
  });

  it("onStart defaults tokens fields for pre-token persisted state", async () => {
    const legacy = defaultGameState("room-1") as Partial<GameState>;
    delete legacy.tokens;
    delete legacy.tokensEnabled;
    const room = makeMockRoom();
    (room.storage.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string) => (key === "gameState" ? legacy : undefined)
    );
    const gameRoom = new GameRoom(room);
    await gameRoom.onStart();
    expect(gameRoom.gameState.tokens).toEqual(defaultTokens());
    expect(gameRoom.gameState.tokensEnabled).toBe(false);
  });

  it("onStart resets all tokens to tray when persisted tokens still use the old pos shape", async () => {
    const legacy = defaultGameState("room-1");
    // Simulate a dev room that persisted state under the pre-revision Token.pos shape.
    (legacy.tokens as unknown as { id: string; pos: { x: number; y: number; z: number } | null }[]) = [
      { id: "dealer", pos: null },
      { id: "red", pos: { x: 5, y: 5, z: 1 } },
      { id: "blue", pos: null },
      { id: "green", pos: null },
    ];
    const room = makeMockRoom();
    (room.storage.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string) => (key === "gameState" ? legacy : undefined)
    );
    const gameRoom = new GameRoom(room);
    await gameRoom.onStart();
    expect(gameRoom.gameState.tokens).toEqual(defaultTokens());
  });
});
