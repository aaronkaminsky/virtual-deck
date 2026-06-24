import { describe, it, expect } from "vitest";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";
import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";

describe("Konami all-aces cosmetic override", () => {
  it("HandZone accepts a konamiActive prop", () => {
    expect(HandZoneSrc).toMatch(/konamiActive:\s*boolean/);
  });

  it("HandZone overrides rank to 'A' on CardFace when konamiActive, without mutating the real card", () => {
    expect(HandZoneSrc).toMatch(/konamiActive\s*\?\s*\{\s*\.\.\.card,\s*rank:\s*['"]A['"]\s*\}\s*:\s*card/);
  });

  it("OpponentHand accepts a konamiActive prop", () => {
    expect(OpponentHandSrc).toMatch(/konamiActive:\s*boolean/);
  });

  it("OpponentHand overrides rank to 'A' on revealed CardFace when konamiActive, without mutating the real card", () => {
    expect(OpponentHandSrc).toMatch(/konamiActive\s*\?\s*\{\s*\.\.\.card,\s*rank:\s*['"]A['"]\s*\}\s*:\s*card/);
  });
});
