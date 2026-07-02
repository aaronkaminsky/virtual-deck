import { describe, it, expect } from "vitest";
import overlaySrc from "../src/components/AttractOverlay.tsx?raw";
import pileZoneSrc from "../src/components/PileZone.tsx?raw";
import appSrc from "../src/App.tsx?raw";

describe("AttractOverlay", () => {
  it("exposes testid and antic attributes for e2e", () => {
    expect(overlaySrc).toMatch(/data-testid="attract-overlay"/);
    expect(overlaySrc).toMatch(/data-antic=\{antic\}/);
  });

  it("anchors to the pile via the data-attract-anchor hook and skips the fire when absent", () => {
    expect(overlaySrc).toMatch(/querySelector\('\[data-attract-anchor\]'\)/);
    expect(overlaySrc).toMatch(/if \(!el\) \{ onExited\(\); return; \}/);
  });

  it("dismisses on real input only — pointerdown, keydown, wheel, never mousemove", () => {
    for (const evt of ["pointerdown", "keydown", "wheel"]) {
      expect(overlaySrc).toMatch(new RegExp(`addEventListener\\('${evt}'`));
    }
    expect(overlaySrc).not.toMatch(/mousemove/);
  });

  it("is a non-interactive cosmetic overlay below the celebration layers", () => {
    expect(overlaySrc).toMatch(/pointerEvents: 'none'/);
    expect(overlaySrc).toMatch(/zIndex: 9000/);
    expect(overlaySrc).toMatch(/aria-hidden="true"/);
  });

  it("defines per-antic performance durations and a scurry exit", () => {
    expect(overlaySrc).toMatch(/peekaboo: 16000/);
    expect(overlaySrc).toMatch(/nap: 20000/);
    expect(overlaySrc).toMatch(/houseOfCards: 22000/);
    expect(overlaySrc).toMatch(/ATTRACT_LEAVE_MS = 600/);
  });

  it("slows the lottie loop for the nap antic", () => {
    expect(overlaySrc).toMatch(/antic === 'nap' \? 0\.4 : 1/);
  });
});

describe("attract wiring", () => {
  it("PileZone renders the anchor attribute", () => {
    expect(pileZoneSrc).toMatch(/data-attract-anchor/);
  });

  it("App mounts the overlay with hook callbacks", () => {
    expect(appSrc).toMatch(/<AttractOverlay attract=\{attract\} onLocalDismiss=\{dismissAttract\} onExited=\{clearAttract\} \/>/);
  });
});
