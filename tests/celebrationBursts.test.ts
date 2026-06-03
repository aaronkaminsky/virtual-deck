import { describe, it, expect } from "vitest";
import { generateBursts, CELEBRATION_BURST_COUNT, CELEBRATION_DURATION_MS } from "../src/lib/celebrationBursts";

describe("generateBursts", () => {
  it("returns the requested number of bursts", () => {
    expect(generateBursts(CELEBRATION_BURST_COUNT)).toHaveLength(CELEBRATION_BURST_COUNT);
  });

  it("produces minimum values when rand returns 0", () => {
    const [b] = generateBursts(1, () => 0);
    expect(b.xPct).toBe(12);
    expect(b.yPct).toBe(12);
    expect(b.delayMs).toBe(0);
    expect(b.particles).toBe(8);
    expect(b.radius).toBe(55);
  });

  it("keeps every burst within documented ranges", () => {
    const bursts = generateBursts(50, Math.random);
    for (const b of bursts) {
      expect(b.xPct).toBeGreaterThanOrEqual(12);
      expect(b.xPct).toBeLessThanOrEqual(88);
      expect(b.yPct).toBeGreaterThanOrEqual(12);
      expect(b.yPct).toBeLessThanOrEqual(62);
      expect(b.particles).toBeGreaterThanOrEqual(8);
      expect(b.particles).toBeLessThanOrEqual(11);
      expect(b.delayMs).toBeGreaterThanOrEqual(0);
      expect(b.delayMs).toBeLessThanOrEqual(CELEBRATION_DURATION_MS - 1700);
      expect(b.radius).toBeGreaterThanOrEqual(55);
      expect(b.radius).toBeLessThanOrEqual(95);
    }
  });
});
