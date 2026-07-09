import { describe, it, expect, beforeEach } from "vitest";
import GameRoom, { maxCanvasZ, defaultGameState } from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("maxCanvasZ", () => {
  it("computes the max over loose cards and canvas pile positions", () => {
    const state = defaultGameState("r");
    state.canvasCards.push({ card: makeCard("A-s", true), x: 0, y: 0, z: 3 });
    state.piles.push({ id: "canvas-pile-x", name: "Stack", cards: [makeCard("2-s", true)], region: "canvas", ownerId: null, pos: { x: 0, y: 0, z: 9 } });
    expect(maxCanvasZ(state)).toBe(9);
  });

  it("returns 0 for an empty canvas", () => {
    expect(maxCanvasZ(defaultGameState("r"))).toBe(0);
  });
});

describe("CREATE_CANVAS_PILE", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.canvasCards = [
      { card: makeCard("A-s", true), x: 10, y: 10, z: 1 },
      { card: makeCard("2-s", false), x: 40, y: 10, z: 3 },
      { card: makeCard("3-s", true), x: 70, y: 10, z: 2 },
    ];
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("stacks selected loose cards into a new canvas pile at (x, y) above current z", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 25, y: 30 });
    const pile = room.gameState.piles.find(p => p.region === "canvas");
    expect(pile).toBeDefined();
    expect(pile!.id).toMatch(/^canvas-pile-/);
    expect(pile!.name).toBe("Stack");
    expect(pile!.pos).toEqual({ x: 25, y: 30, z: 4 });
    expect(room.gameState.canvasCards).toHaveLength(0);
  });

  it("orders stacked cards by ascending pre-stack z (last element = top)", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 0, y: 0 });
    const pile = room.gameState.piles.find(p => p.region === "canvas")!;
    expect(pile.cards.map(c => c.id)).toEqual(["A-s", "3-s", "2-s"]);
  });

  it("inherits pile.faceUp from the top card and preserves per-card faces", async () => {
    // top card by z is "2-s" (z:3) which is faceUp:false
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 0, y: 0 });
    const pile = room.gameState.piles.find(p => p.region === "canvas")!;
    expect(pile.faceUp).toBe(false);
    expect(pile.cards.map(c => c.faceUp)).toEqual([true, true, false]);
  });

  it("rejects fewer than 2 cards with INVALID_CARD_SET and mutates nothing", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s"], x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_CARD_SET"]);
    expect(room.gameState.canvasCards).toHaveLength(3);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("rejects duplicate card ids with DUPLICATE_CARD_IDS", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "A-s"], x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["DUPLICATE_CARD_IDS"]);
  });

  it("rejects non-finite coordinates with INVALID_COORDINATES", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s"], x: NaN, y: 0 });
    expect(errorCodes(sender)).toEqual(["INVALID_COORDINATES"]);
  });

  it("errors CARD_NOT_IN_SOURCE atomically if any card is not loose on the canvas", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "9-h"], x: 0, y: 0 });
    expect(errorCodes(sender)).toEqual(["CARD_NOT_IN_SOURCE"]);
    expect(room.gameState.canvasCards).toHaveLength(3);
    expect(room.gameState.piles.some(p => p.region === "canvas")).toBe(false);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("takes one undo snapshot; UNDO_MOVE restores the loose cards", async () => {
    await send({ type: "CREATE_CANVAS_PILE", cardIds: ["A-s", "2-s", "3-s"], x: 0, y: 0 });
    expect(room.gameState.undoSnapshots).toHaveLength(1);
    await send({ type: "UNDO_MOVE" });
    expect(room.gameState.canvasCards).toHaveLength(3);
    expect(room.gameState.piles.some(p => p.region === "canvas")).toBe(false);
  });
});
