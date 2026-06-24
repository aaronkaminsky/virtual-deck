import { describe, it, expect } from "vitest";
import JeerOverlaySrc from "../src/components/JeerOverlay.tsx?raw";

describe("JeerOverlay", () => {
  it("accepts a nonce prop", () => {
    expect(JeerOverlaySrc).toMatch(/nonce:\s*number/);
  });

  it("reuses the existing burst generator", () => {
    expect(JeerOverlaySrc).toMatch(/import\s*\{[\s\S]*generateBursts[\s\S]*\}\s*from\s*['"]@\/lib\/celebrationBursts['"]/);
  });

  it("renders CardBack glyphs drooping downward", () => {
    expect(JeerOverlaySrc).toMatch(/<CardBack/);
    expect(JeerOverlaySrc).toMatch(/jeer-droop/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(JeerOverlaySrc).toMatch(/data-testid="jeer-overlay"/);
  });
});
