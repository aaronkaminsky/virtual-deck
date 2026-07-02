import { describe, it, expect } from "vitest";
import src from "../src/lib/critterLottie.ts?raw";

describe("critterLottie loader", () => {
  it("lazy-loads the light lottie build and the critter art via dynamic import", () => {
    expect(src).toMatch(/import\('lottie-web\/build\/player\/lottie_light'\)/);
    expect(src).toMatch(/import\('\.\.\/assets\/critter\.json'\)/);
  });

  it("returns null on any failure instead of throwing", () => {
    expect(src).toMatch(/catch[\s\S]{0,60}return null/);
  });

  it("applies the requested playback speed", () => {
    expect(src).toMatch(/setSpeed\(speed\)/);
  });
});

describe("critter art asset", () => {
  it("is valid bodymovin JSON with layers", async () => {
    const art = (await import("../src/assets/critter.json")).default as { v: string; layers: unknown[]; op: number };
    expect(art.v).toBeTruthy();
    expect(Array.isArray(art.layers)).toBe(true);
    expect(art.layers.length).toBeGreaterThanOrEqual(3);
    expect(art.op).toBeGreaterThan(0);
  });
});
