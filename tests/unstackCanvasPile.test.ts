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

describe("UNSTACK_CANVAS_PILE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.canvasCards = [{ card: makeCard("K-h", true), x: 0, y: 0, z: 5 }];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", false), makeCard("2-s", false), makeCard("3-s", true)],
      faceUp: false,
      region: "canvas",
      ownerId: null,
      pos: { x: 100, y: 60, z: 2 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("fans cards out at 24px x-offsets from pos, bottom-to-top = left-to-right", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    const loose = room.gameState.canvasCards.filter(cc => cc.card.id !== "K-h");
    expect(loose.map(cc => ({ id: cc.card.id, x: cc.x, y: cc.y }))).toEqual([
      { id: "A-s", x: 100, y: 60 },
      { id: "2-s", x: 124, y: 60 },
      { id: "3-s", x: 148, y: 60 },
    ]);
  });

  it("assigns fresh ascending z above the current canvas max", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    const loose = room.gameState.canvasCards.filter(cc => cc.card.id !== "K-h");
    expect(loose.map(cc => cc.z)).toEqual([6, 7, 8]); // maxCanvasZ was 5 (K-h)
  });

  it("forces all fanned cards faceUp (loose canvas cards are always face-up)", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    const loose = room.gameState.canvasCards.filter(cc => cc.card.id !== "K-h");
    expect(loose.every(cc => cc.card.faceUp)).toBe(true);
  });

  it("deletes the pile and takes one undo snapshot", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "canvas-pile-abc" });
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("rejects non-canvas piles with INVALID_PILE_REGION (draw pile stays intact)", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "draw" });
    expect(errorCodes(sender)).toEqual(["INVALID_PILE_REGION"]);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(52);
  });

  it("errors PILE_NOT_FOUND for unknown pileId", async () => {
    await send({ type: "UNSTACK_CANVAS_PILE", pileId: "nope" });
    expect(errorCodes(sender)).toEqual(["PILE_NOT_FOUND"]);
  });
});
