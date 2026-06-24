import { describe, it, expect } from "vitest";
import KonamiBannerSrc from "../src/components/KonamiBanner.tsx?raw";

describe("KonamiBanner", () => {
  it("accepts an active prop", () => {
    expect(KonamiBannerSrc).toMatch(/active:\s*boolean/);
  });

  it("renders nothing when not active", () => {
    expect(KonamiBannerSrc).toMatch(/if\s*\(!active\)\s*return null/);
  });

  it("shows the CHEATER DETECTED text", () => {
    expect(KonamiBannerSrc).toMatch(/CHEATER DETECTED/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(KonamiBannerSrc).toMatch(/data-testid="konami-banner"/);
  });
});
