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

describe("MOVE_TOKEN / RETURN_TOKEN", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.tokensEnabled = true;
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 9 }];
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("places a token above all canvas cards and piles, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 200, y: 150 });
    const token = room.gameState.tokens.find(t => t.id === "dealer")!;
    expect(token.pos).toEqual({ x: 200, y: 150, z: 10 });
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("silently no-ops while tokens are disabled", async () => {
    room.gameState.tokensEnabled = false;
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: 200, y: 150 });
    expect(room.gameState.tokens.find(t => t.id === "dealer")!.pos).toBeNull();
    expect(errorCodes(sender)).toEqual([]);
  });

  it("errors TOKEN_NOT_FOUND for an unknown tokenId", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "purple", x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["TOKEN_NOT_FOUND"]);
  });

  it("rejects non-finite coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "dealer", x: Infinity, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("RETURN_TOKEN sends a placed token back to the tray, without a snapshot", async () => {
    await send({ type: "MOVE_TOKEN", tokenId: "red", x: 50, y: 60 });
    await send({ type: "RETURN_TOKEN", tokenId: "red" });
    expect(room.gameState.tokens.find(t => t.id === "red")!.pos).toBeNull();
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("RETURN_TOKEN no-ops while tokens are disabled", async () => {
    room.gameState.tokens.find(t => t.id === "red")!.pos = { x: 1, y: 2, z: 3 };
    room.gameState.tokensEnabled = false;
    await send({ type: "RETURN_TOKEN", tokenId: "red" });
    expect(room.gameState.tokens.find(t => t.id === "red")!.pos).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("token z participates in the shared canvas z-space (PLACE_ON_CANVAS lands above a token)", async () => {
    room.gameState.tokens.find(t => t.id === "blue")!.pos = { x: 5, y: 5, z: 40 };
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await send({ type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5 });
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    expect(placed.z).toBe(41);
  });
});
