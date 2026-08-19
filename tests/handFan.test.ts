import { describe, it, expect } from "vitest";
import { fanAdvance, fanMarginLeft } from "../src/lib/handFan";

const DESKTOP = { cardWidth: 60, comfortableAdvance: 40, minAdvance: 16 };

describe("fanAdvance", () => {
  it("uses the comfortable advance for a single card", () => {
    expect(fanAdvance({ containerWidth: 1200, count: 1, ...DESKTOP })).toBe(40);
  });

  it("uses the comfortable advance when the hand fits easily", () => {
    // 5 cards need 60 + 4*40 = 220px; 1200px is plenty.
    expect(fanAdvance({ containerWidth: 1200, count: 5, ...DESKTOP })).toBe(40);
  });

  it("tightens the advance when the hand would overflow", () => {
    // 40 cards: ideal = (1200 - 60) / 39 = 29.23, between the floor and the comfortable value.
    const advance = fanAdvance({ containerWidth: 1200, count: 40, ...DESKTOP });
    expect(advance).toBeCloseTo(29.23, 1);
    // The fanned hand fits the container.
    expect(60 + 39 * advance).toBeLessThanOrEqual(1200);
  });

  it("never tightens past the minimum sliver", () => {
    // 200 cards would need a sub-pixel advance to fit; the floor wins and the row scrolls.
    expect(fanAdvance({ containerWidth: 1200, count: 200, ...DESKTOP })).toBe(16);
  });

  it("returns the floor for a container that has not been measured yet", () => {
    expect(fanAdvance({ containerWidth: 0, count: 30, ...DESKTOP })).toBe(16);
    expect(fanAdvance({ containerWidth: -50, count: 30, ...DESKTOP })).toBe(16);
  });

  it("honours mobile metrics", () => {
    const MOBILE = { cardWidth: 40, comfortableAdvance: 28, minAdvance: 12 };
    expect(fanAdvance({ containerWidth: 360, count: 3, ...MOBILE })).toBe(28);
    expect(fanAdvance({ containerWidth: 360, count: 54, ...MOBILE })).toBe(12);
  });
});

describe("fanMarginLeft", () => {
  it("is the negative of the hidden portion of the card", () => {
    expect(fanMarginLeft(40, 60)).toBe(-20);
    expect(fanMarginLeft(16, 60)).toBe(-44);
  });

  it("is zero when cards do not overlap at all", () => {
    expect(fanMarginLeft(60, 60)).toBe(0);
  });
});
