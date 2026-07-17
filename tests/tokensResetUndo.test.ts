import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { GameState } from "../src/shared/types";

describe("tokens vs RESET_TABLE and UNDO_MOVE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.tokensEnabled = true;
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("RESET_TABLE returns all tokens to the tray", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 10, y: 20 });
    await send({ type: "MOVE_TOKEN", tokenId: "red", x: 30, y: 40 });
    await send({ type: "RESET_TABLE" });
    expect(room.gameState.tokens.every(t => t.pos === null)).toBe(true);
  });

  it("UNDO_MOVE restores cards but never teleports tokens or flips the toggle", async () => {
    // Seed an undoable card move (MOVE_CANVAS_PILE takes a snapshot)
    room.gameState.piles.push({
      id: "canvas-pile-abc", name: "Stack", cards: [makeCard("A-s", true)],
      faceUp: true, region: "canvas", ownerId: null, pos: { x: 10, y: 10, z: 2 },
    });
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: 200, y: 150 });
    // Token moves AFTER the snapshot
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 99, y: 88 });

    await send({ type: "UNDO_MOVE" });

    const pile = room.gameState.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 10, y: 10, z: 2 });          // card move undone
    const dealer = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(dealer.pos).toMatchObject({ x: 99, y: 88 });          // token untouched
    expect(room.gameState.tokensEnabled).toBe(true);             // toggle untouched
  });

  it("UNDO_MOVE migrates legacy snapshots that predate tokens", async () => {
    // Simulate a persisted pre-1035 snapshot: no tokens/tokensEnabled fields
    const legacySnap = JSON.parse(JSON.stringify(room.gameState)) as Partial<GameState>;
    delete legacySnap.tokens;
    delete legacySnap.tokensEnabled;
    legacySnap.undoSnapshots = [];
    room.gameState.undoSnapshots.push(legacySnap as GameState);

    await send({ type: "UNDO_MOVE" });

    expect(Array.isArray(room.gameState.tokens)).toBe(true);
    expect(room.gameState.tokens).toHaveLength(4);
    expect(room.gameState.tokensEnabled).toBe(true);
  });
});
