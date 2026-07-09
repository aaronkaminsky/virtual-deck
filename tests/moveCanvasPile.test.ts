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

describe("MOVE_CANVAS_PILE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 9 }];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", true)],
      faceUp: true,
      region: "canvas",
      ownerId: null,
      pos: { x: 10, y: 10, z: 2 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("updates pos and bumps z above all loose cards and piles", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: 200, y: 150 });
    const pile = room.gameState.piles.find(p => p.id === "canvas-pile-abc")!;
    expect(pile.pos).toEqual({ x: 200, y: 150, z: 10 });
    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("rejects non-finite coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "canvas-pile-abc", x: Infinity, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("rejects non-canvas piles with INVALID_PILE_REGION", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "draw", x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_PILE_REGION"]);
  });

  it("errors PILE_NOT_FOUND for unknown pileId", async () => {
    await send({ type: "MOVE_CANVAS_PILE", pileId: "nope", x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["PILE_NOT_FOUND"]);
  });
});

describe("shared z-space with existing placements", () => {
  it("PLACE_ON_CANVAS lands above a canvas pile's z", async () => {
    const room = new GameRoom(makeMockRoom());
    const sender = makeMockConnection("player-1");
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", true)],
      faceUp: true,
      region: "canvas",
      ownerId: null,
      pos: { x: 10, y: 10, z: 40 },
    });
    room.gameState.piles.find(p => p.id === "discard")!.cards.push(makeCard("Q-d", true));
    await room.onMessage(JSON.stringify({
      type: "PLACE_ON_CANVAS", cardId: "Q-d", fromZone: "pile", fromId: "discard", x: 5, y: 5,
    }), sender);
    const placed = room.gameState.canvasCards.find(cc => cc.card.id === "Q-d")!;
    expect(placed.z).toBe(41);
  });
});
