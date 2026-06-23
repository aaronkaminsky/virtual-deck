import { describe, it, expect } from "vitest";
import usePartySocketSrc from "../src/hooks/usePartySocket.ts?raw";

describe("usePartySocket effect kind handling", () => {
  it("tracks separate nonces for rickroll, tableflip, and jeer", () => {
    expect(usePartySocketSrc).toMatch(/rickrollNonce/);
    expect(usePartySocketSrc).toMatch(/tableFlipNonce/);
    expect(usePartySocketSrc).toMatch(/jeerNonce/);
  });

  it("bumps rickrollNonce only on kind 'rickroll'", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'rickroll'[\s\S]{0,80}setRickrollNonce/);
  });

  it("bumps tableFlipNonce only on kind 'tableflip'", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'tableflip'[\s\S]{0,80}setTableFlipNonce/);
  });

  it("bumps jeerNonce only on kind 'jeer'", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'jeer'[\s\S]{0,80}setJeerNonce/);
  });

  it("sets konamiActive true on kind 'konami' and clears it via a timer", () => {
    expect(usePartySocketSrc).toMatch(/kind === 'konami'[\s\S]{0,200}setKonamiActive\(true\)/);
    expect(usePartySocketSrc).toMatch(/setTimeout\(\(\) => setKonamiActive\(false\)/);
  });

  it("returns the new fields from the hook", () => {
    expect(usePartySocketSrc).toMatch(/return\s*\{[\s\S]*rickrollNonce[\s\S]*tableFlipNonce[\s\S]*jeerNonce[\s\S]*konamiActive[\s\S]*\}/);
  });

  it("uses a Map for shufflingPileIds keyed by animationType", () => {
    expect(usePartySocketSrc).toMatch(/shufflingPileIds.*Map<string,\s*["']normal["']\s*\|\s*["']flourish["']>/);
  });
});
