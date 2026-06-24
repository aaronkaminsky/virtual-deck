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

  it("dismisses via a dedicated close button, not by clicking the panel", () => {
    expect(RickrollOverlaySrc).toMatch(/data-testid="rickroll-dismiss"[\s\S]{0,80}onClick=\{?\(\) => setRun\(0\)/);
  });

  it("does not swallow clicks on the panel or iframe (so the video's own controls, e.g. unmute, remain clickable)", () => {
    expect(RickrollOverlaySrc).not.toMatch(/pointerEvents:\s*['"]none['"]/);
    expect(RickrollOverlaySrc).not.toMatch(/data-testid="rickroll-overlay"[\s\S]{0,80}onClick/);
  });

  it("centers the panel on screen", () => {
    expect(RickrollOverlaySrc).toMatch(/top:\s*['"]50%['"]/);
    expect(RickrollOverlaySrc).toMatch(/left:\s*['"]50%['"]/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(RickrollOverlaySrc).toMatch(/data-testid="rickroll-overlay"/);
  });
});
