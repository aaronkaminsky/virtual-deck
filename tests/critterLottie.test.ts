import { describe, it, expect } from "vitest";
import src from "../src/lib/critterLottie.ts?raw";

type BodymovinLayer = {
  nm: string;
  ks: { s: { a: number; k: unknown } };
  shapes: { nm?: string; it: { ty: string; p?: { k: number[] } }[] }[];
};
type Bodymovin = { v: string; layers: BodymovinLayer[]; op: number };

describe("critterLottie loader", () => {
  it("lazy-loads the light lottie build and the critter art via dynamic import", () => {
    expect(src).toMatch(/import\('lottie-web\/build\/player\/lottie_light'\)/);
    expect(src).toMatch(/import\('\.\.\/assets\/critter\.json'\)/);
  });

  it("loads a per-expression art variant", () => {
    expect(src).toMatch(/CritterVariant/);
    expect(src).toMatch(/import\('\.\.\/assets\/critter-sleepy\.json'\)/);
    expect(src).toMatch(/import\('\.\.\/assets\/critter-gaze\.json'\)/);
  });

  it("returns null on any failure instead of throwing", () => {
    expect(src).toMatch(/catch[\s\S]{0,60}return null/);
  });

  it("applies the requested playback speed", () => {
    expect(src).toMatch(/setSpeed\(speed\)/);
  });
});

describe("critter art assets", () => {
  it("all three variants are valid bodymovin JSON with layers", async () => {
    for (const name of ["critter", "critter-sleepy", "critter-gaze"]) {
      const art = (await import(`../src/assets/${name}.json`)).default as Bodymovin;
      expect(art.v).toBeTruthy();
      expect(Array.isArray(art.layers)).toBe(true);
      expect(art.layers.length).toBeGreaterThanOrEqual(3);
      expect(art.op).toBeGreaterThan(0);
    }
  });

  it("sleepy variant keeps the eyes squashed to a slit", async () => {
    const art = (await import("../src/assets/critter-sleepy.json")).default as Bodymovin;
    const eye = art.layers.find(l => l.nm === "eye-left");
    expect(eye).toBeDefined();
    expect(eye!.ks.s.a).toBe(0);
    expect((eye!.ks.s.k as number[])[1]).toBeLessThanOrEqual(20);
  });

  it("gaze variant shifts the pupils toward the house (down-right)", async () => {
    const art = (await import("../src/assets/critter-gaze.json")).default as Bodymovin;
    const eye = art.layers.find(l => l.nm === "eye-left");
    const pupil = eye!.shapes.find(s => s.nm === "pupil");
    const ellipse = pupil!.it.find(i => i.ty === "el");
    expect(ellipse!.p!.k[0]).toBeGreaterThan(0);
    expect(ellipse!.p!.k[1]).toBeGreaterThan(0);
  });
});
