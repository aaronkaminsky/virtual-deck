import { describe, it, expect } from "vitest";
import { computeStackOrigin, resolvePileDrop } from "@/lib/canvasPileDrag";

describe("computeStackOrigin", () => {
  it("returns the top-left corner (min x, min y) of the selection", () => {
    expect(computeStackOrigin([
      { x: 40, y: 80 },
      { x: 10, y: 120 },
      { x: 70, y: 60 },
    ])).toEqual({ x: 10, y: 60 });
  });
});

const base = {
  pileId: "canvas-pile-abc",
  pos: { x: 100, y: 50 },
  delta: { x: 30, y: -20 },
  canvasW: 800,
  canvasH: 600,
  cardW: 80,
  cardH: 112,
};

describe("resolvePileDrop", () => {
  it("repositions (clamped) when dropped on the canvas", () => {
    expect(resolvePileDrop({ ...base, overId: "canvas", overData: undefined }))
      .toEqual({ kind: "reposition", x: 130, y: 30 });
  });

  it("repositions when dropped on its own droppable (tiny drag)", () => {
    expect(resolvePileDrop({ ...base, overId: "pile-canvas-pile-abc", overData: { toZone: "pile", toId: "canvas-pile-abc" } }))
      .toEqual({ kind: "reposition", x: 130, y: 30 });
  });

  it("clamps reposition within canvas bounds", () => {
    expect(resolvePileDrop({ ...base, delta: { x: 9999, y: -9999 }, overId: "canvas", overData: undefined }))
      .toEqual({ kind: "reposition", x: 720, y: 0 }); // 800-80, clamped to 0
  });

  it("merges into another pile", () => {
    expect(resolvePileDrop({ ...base, overId: "pile-discard", overData: { toZone: "pile", toId: "discard" } }))
      .toEqual({ kind: "mergeIntoPile", toId: "discard" });
  });

  it("moves to hand when dropped on the hand zone", () => {
    expect(resolvePileDrop({ ...base, overId: "hand", overData: { toZone: "hand", toId: "player-1" } }))
      .toEqual({ kind: "moveToHand" });
  });

  it("returns none for opponent hands and missed drops", () => {
    expect(resolvePileDrop({ ...base, overId: "opponent-hand-p2", overData: { toZone: "opponent-hand", toId: "p2" } }))
      .toEqual({ kind: "none" });
    expect(resolvePileDrop({ ...base, overId: null, overData: undefined }))
      .toEqual({ kind: "none" });
  });
});
