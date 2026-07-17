import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("SET_TOKENS_MODE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("enables and disables tokens", async () => {
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.tokensEnabled).toBe(true);
    await send({ type: "SET_TOKENS_MODE", enabled: false });
    expect(room.gameState.tokensEnabled).toBe(false);
  });

  it("coerces non-boolean enabled to false", async () => {
    await send({ type: "SET_TOKENS_MODE", enabled: "true" });
    expect(room.gameState.tokensEnabled).toBe(false);
  });

  it("takes no undo snapshot", async () => {
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("toggling off preserves token positions; re-enable restores them", async () => {
    room.gameState.tokensEnabled = true;
    room.gameState.tokens[0].pos = { x: 100, y: 50, z: 5 };
    await send({ type: "SET_TOKENS_MODE", enabled: false });
    expect(room.gameState.tokens[0].pos).toEqual({ x: 100, y: 50, z: 5 });
    await send({ type: "SET_TOKENS_MODE", enabled: true });
    expect(room.gameState.tokens[0].pos).toEqual({ x: 100, y: 50, z: 5 });
  });
});
