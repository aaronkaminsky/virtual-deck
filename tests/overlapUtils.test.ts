import { describe, it, expect } from "vitest";
import { coversMajority, STACK_SHADOW, CARD_W, CARD_H } from "../src/lib/canvas-utils";

describe("coversMajority", () => {
  it("returns false when cards do not overlap at all", () => {
    // top at origin, bottom far away
    expect(coversMajority({ x: 0, y: 0 }, { x: 200, y: 200 })).toBe(false);
  });

  it("returns false at the exact 50% overlap threshold (strict > not >=)", () => {
    // Exact 50%: overlapW * overlapH === CARD_W * CARD_H * 0.5
    // With CARD_W=60, CARD_H=90: half area = 60*90*0.5 = 2700
    // To get exact 50%: overlapW=60 (full width), overlapH=45 (half height)
    // top at x=0, y=0; bottom at x=0, y=45 → overlapH = min(90,135)-max(0,45) = 90-45 = 45; overlapW = 60
    expect(coversMajority({ x: 0, y: 0 }, { x: 0, y: 45 })).toBe(false);
  });

  it("returns true when overlap area exceeds 50%", () => {
    // Small offset: nearly aligned, most area overlaps
    // top at (0,0), bottom at (5,5) → overlapW = min(60,65)-max(0,5) = 60-5=55, overlapH = min(90,95)-max(0,5) = 90-5=85
    // area = 55*85 = 4675 > 2700 = 60*90*0.5
    expect(coversMajority({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
  });

  it("returns true for full overlap (same position)", () => {
    expect(coversMajority({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(true);
  });

  it("handles negative-offset edge case (top to upper-left of bottom by small amount)", () => {
    // top at (-3, -3), bottom at (0, 0) → overlapW = min(57,60)-max(-3,0) = 57-0=57, overlapH = min(87,90)-max(-3,0) = 87-0=87
    // area = 57*87 = 4959 > 2700
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

  it("CARD_H is 90", () => {
    expect(CARD_H).toBe(90);
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
