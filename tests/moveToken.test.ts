import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("MOVE_TOKEN", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.tokensEnabled = true;
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 9 }];
    room.gameState.players.push(
      { id: "player-1", connected: true, displayName: "P1", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 },
      { id: "player-2", connected: true, displayName: "P2", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 },
    );
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("places a token on canvas above all canvas cards and piles, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: 200, y: 150 } });
    const token = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(token.placement).toEqual({ kind: "canvas", x: 200, y: 150, z: 10 });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("anchors a token to a player, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "player-2" } });
    const token = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(token.placement).toEqual({ kind: "player", playerId: "player-2" });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("any player may anchor a token to a different player (no ownership check)", async () => {
    // sender is player-1, anchoring the token to player-2 — must succeed.
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "player", playerId: "player-2" } });
    expect(errorCodes(sender)).toEqual([]);
    expect(room.gameState.tokens.find(t => t.id === "red")!.placement).toEqual({ kind: "player", playerId: "player-2" });
  });

  it("returns a token to the tray, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "canvas", x: 50, y: 60 } });
    await send({ type: "MOVE_TOKEN", tokenId: "red", to: { kind: "tray" } });
    expect(room.gameState.tokens.find(t => t.id === "red")!.placement).toEqual({ kind: "tray" });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("re-anchors a token directly from one player to another", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "player-1" } });
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "player-2" } });
    expect(room.gameState.tokens.find(t => t.id === "dealer")!.placement).toEqual({ kind: "player", playerId: "player-2" });
  });

  it("silently no-ops while tokens are disabled", async () => {
    room.gameState.tokensEnabled = false;
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: 200, y: 150 } });
    expect(room.gameState.tokens.find(t => t.id === "dealer")!.placement).toEqual({ kind: "tray" });
    expect(errorCodes(sender)).toEqual([]);
  });

  it("errors TOKEN_NOT_FOUND for an unknown tokenId", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "purple", to: { kind: "tray" } });
    expect(errorCodes(sender)).toEqual(["TOKEN_NOT_FOUND"]);
  });

  it("rejects non-finite canvas coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "canvas", x: Infinity, y: 0 } });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("errors PLAYER_NOT_FOUND for an unknown playerId", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", to: { kind: "player", playerId: "nope" } });
    expect(errorCodes(sender)).toEqual(["PLAYER_NOT_FOUND"]);
  });

  it("token z participates in the shared canvas z-space (PLACE_ON_CANVAS lands above a token)", async () => {
    room.gameState.tokens.find(t => t.id === "blue")!.placement = { kind: "canvas", x: 5, y: 5, z: 40 };
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await send({ type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5 });
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    expect(placed.z).toBe(41);
  });

  it("a player-anchored token does not contribute to the canvas z-space", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "green", to: { kind: "player", playerId: "player-1" } });
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await send({ type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5 });
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    // z=9 came from the seeded canvas card in beforeEach; the anchored token must not raise it further.
    expect(placed.z).toBe(10);
  });
});
