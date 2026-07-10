import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

describe("empty canvas-pile pruning", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", true)],
      faceUp: true,
      region: "canvas",
      ownerId: null,
      pos: { x: 10, y: 10, z: 1 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("removes a canvas pile when its last card is moved off", async () => {
    await send({
      type: "MOVE_CARD", cardId: "A-s",
      fromZone: "pile", fromId: "canvas-pile-abc",
      toZone: "pile", toId: "discard",
    });
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards.map(c => c.id)).toContain("A-s");
  });

  it("never prunes empty column piles or spreads", async () => {
    room.gameState.piles.push({ id: "spread-player-1", name: "p1", cards: [], faceUp: true, region: "spread", ownerId: "player-1" });
    // discard starts empty; send any action to trigger the post-switch prune
    await send({ type: "PING" });
    expect(room.gameState.piles.some(p => p.id === "discard")).toBe(true);
    expect(room.gameState.piles.some(p => p.id === "spread-player-1")).toBe(true);
  });

  it("undo restores a pruned pile", async () => {
    await send({
      type: "MOVE_CARD", cardId: "A-s",
      fromZone: "pile", fromId: "canvas-pile-abc",
      toZone: "pile", toId: "discard",
    });
    await send({ type: "UNDO_MOVE" });
    const restored = room.gameState.piles.find(p => p.id === "canvas-pile-abc");
    expect(restored).toBeDefined();
    expect(restored!.cards.map(c => c.id)).toEqual(["A-s"]);
  });

  it("RESET_TABLE sweeps canvas-pile cards to draw and removes the pile", async () => {
    await send({ type: "RESET_TABLE" });
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(53);
  });
});
