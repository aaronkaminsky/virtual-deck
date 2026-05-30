import { describe, it, expect } from "vitest";
import { coversMajority, STACK_SHADOW, CARD_W, CARD_H } from "../src/lib/canvas-utils";

describe("coversMajority", () => {
  it("returns false when cards do not overlap at all", () => {
    // top at origin, bottom far away
    expect(coversMajority({ x: 0, y: 0 }, { x: 200, y: 200 })).toBe(false);
  });

  it("returns false at the exact 50% overlap threshold (strict > not >=)", () => {
    // Exact 50%: overlapW * overlapH === CARD_W * CARD_H * 0.5
    // With CARD_W=60, CARD_H=88: half area = 60*88*0.5 = 2640
    // To get exact 50%: overlapW=60 (full width), overlapH=44 (half height)
    // top at x=0, y=0; bottom at x=0, y=44 → overlapH = min(88,132)-max(0,44) = 88-44 = 44; overlapW = 60
    expect(coversMajority({ x: 0, y: 0 }, { x: 0, y: 44 })).toBe(false);
  });

  it("returns true when overlap area exceeds 50%", () => {
    // Small offset: nearly aligned, most area overlaps
    // top at (0,0), bottom at (5,5) → overlapW = min(60,65)-max(0,5) = 60-5=55, overlapH = min(88,93)-max(0,5) = 88-5=83
    // area = 55*83 = 4565 > 2640 = 60*88*0.5
    expect(coversMajority({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
  });

  it("returns true for full overlap (same position)", () => {
    expect(coversMajority({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(true);
  });

  it("handles negative-offset edge case (top to upper-left of bottom by small amount)", () => {
    // top at (-3, -3), bottom at (0, 0) → overlapW = min(57,60)-max(-3,0) = 57-0=57, overlapH = min(85,88)-max(-3,0) = 85-0=85
    // area = 57*85 = 4845 > 2640
    expect(coversMajority({ x: -3, y: -3 }, { x: 0, y: 0 })).toBe(true);
  });
});

describe("STACK_SHADOW", () => {
  it("equals the spec string from Spike002", () => {
    expect(STACK_SHADOW).toBe("2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db");
  });
});

describe("CARD_W / CARD_H", () => {
  it("CARD_W is 60", () => {
    expect(CARD_W).toBe(60);
  });

  it("CARD_H is 88", () => {
    expect(CARD_H).toBe(88);
  });
});

describe("coveringIds inline scenario", () => {
  it("correctly identifies the covering card in a 3-card scenario", () => {
    // 3 cards: bottom (z=1), top (z=2) that covers bottom >50%, isolated (z=3) far away
    const cards = [
      { card: { id: "bottom-card", suit: "spades", rank: "A", faceUp: true }, x: 100, y: 100, z: 1 },
      { card: { id: "top-card",    suit: "hearts", rank: "K", faceUp: true }, x: 105, y: 105, z: 2 },
      { card: { id: "isolated",    suit: "clubs",  rank: "Q", faceUp: true }, x: 400, y: 400, z: 3 },
    ];

    // Replicate the useMemo loop from Spike002 lines 90-98
    const ids = new Set<string>();
    for (const card of cards) {
      if (cards.some(other => other.z < card.z && coversMajority(card, other))) {
        ids.add(card.card.id);
      }
    }

    // top-card covers bottom-card (offset 5,5 → well over 50%)
    expect(ids.has("top-card")).toBe(true);
    // bottom-card has no lower-z card beneath it
    expect(ids.has("bottom-card")).toBe(false);
    // isolated is far away from the others
    expect(ids.has("isolated")).toBe(false);
    // Set contains exactly 1 entry
    expect(ids.size).toBe(1);
  });
});
