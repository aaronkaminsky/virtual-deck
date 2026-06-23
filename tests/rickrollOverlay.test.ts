import { describe, it, expect } from "vitest";
import RickrollOverlaySrc from "../src/components/RickrollOverlay.tsx?raw";

describe("RickrollOverlay", () => {
  it("accepts a nonce prop", () => {
    expect(RickrollOverlaySrc).toMatch(/nonce:\s*number/);
  });

  it("renders an iframe embed", () => {
    expect(RickrollOverlaySrc).toMatch(/<iframe/);
  });

  it("auto-dismisses after 10 seconds", () => {
    expect(RickrollOverlaySrc).toMatch(/setTimeout\(\(\) => setRun\(0\),\s*10_?000\)/);
  });

  it("dismisses on click", () => {
    expect(RickrollOverlaySrc).toMatch(/onClick=\{?\(\) => setRun\(0\)/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(RickrollOverlaySrc).toMatch(/data-testid="rickroll-overlay"/);
  });
});
