import { describe, it, expect, vi } from "vitest";
import GameRoom, { defaultGameState, defaultTokens, viewFor } from "../party/index";
import { makeMockRoom } from "./helpers";
import type { GameState } from "../src/shared/types";

describe("token state plumbing", () => {
  it("defaultGameState starts with tokensEnabled false and all four tokens in the tray", () => {
    const state = defaultGameState("room-1");
    expect(state.tokensEnabled).toBe(false);
    expect(state.tokens).toEqual([
      { id: "dealer", pos: null },
      { id: "red", pos: null },
      { id: "blue", pos: null },
      { id: "green", pos: null },
    ]);
  });

  it("viewFor passes tokens and tokensEnabled through unmasked", () => {
    const state = defaultGameState("room-1");
    state.tokensEnabled = true;
    state.tokens[0].pos = { x: 10, y: 20, z: 3 };
    const view = viewFor(state, "player-1");
    expect(view.tokensEnabled).toBe(true);
    expect(view.tokens[0]).toEqual({ id: "dealer", pos: { x: 10, y: 20, z: 3 } });
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
});
