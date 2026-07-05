import { describe, it, expect } from "vitest";
import overlaySrc from "../src/components/AttractOverlay.tsx?raw";
import pileZoneSrc from "../src/components/PileZone.tsx?raw";
import appSrc from "../src/App.tsx?raw";

describe("AttractOverlay", () => {
  it("exposes testid and antic attributes for e2e", () => {
    expect(overlaySrc).toMatch(/data-testid="attract-overlay"/);
    expect(overlaySrc).toMatch(/data-antic=\{antic\}/);
  });

  it("collects candidate anchors via the data-attract-anchor hook and skips the fire when none exist", () => {
    expect(overlaySrc).toMatch(/querySelectorAll\('\[data-attract-anchor\]'\)/);
    expect(overlaySrc).toMatch(/onExited\(\); return;/);
  });

  it("peek-a-boo visits a sequence of hiding spots that have headroom above them", () => {
    expect(overlaySrc).toMatch(/PEEK_COUNT = 3/);
    expect(overlaySrc).toMatch(/r\.top >= CRITTER_SIZE/);
    expect(overlaySrc).toMatch(/attract-peek-once/);
    expect(overlaySrc).toMatch(/setPeekIndex/);
  });

  it("selects the critter art variant per antic", () => {
    expect(overlaySrc).toMatch(/antic === 'nap' \? 'sleepy' : antic === 'houseOfCards' \? 'gaze' : 'idle'/);
  });

  it("collapses the house at the natural end instead of vanishing", () => {
    expect(overlaySrc).toMatch(/ATTRACT_HOUSE_COLLAPSE_MS = 20_500/);
    expect(overlaySrc).toMatch(/setHouseCollapsed\(true\)/);
    expect(overlaySrc).toMatch(/attract-collapse/);
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
    expect(overlaySrc).toMatch(/houseOfCards: 24000/);
    expect(overlaySrc).toMatch(/ATTRACT_LEAVE_MS = 600/);
  });

  it("unmounts after the scurry exit completes (leave timer actually scheduled)", () => {
    expect(overlaySrc).toMatch(/if \(!leaving\) return;\s*\n\s*const t = setTimeout\(onExited, ATTRACT_LEAVE_MS\);/);
  });

  it("slows the lottie loop for the nap antic", () => {
    expect(overlaySrc).toMatch(/antic === 'nap' \? 0\.4 : 1/);
  });
});

describe("attract wiring", () => {
  it("PileZone renders the anchor attribute", () => {
    expect(pileZoneSrc).toMatch(/data-attract-anchor/);
  });

  it("PotZone, HandZone, and SpreadZone offer peek hiding spots", async () => {
    const potZoneSrc = (await import("../src/components/PotZone.tsx?raw")).default as unknown as string;
    const handZoneSrc = (await import("../src/components/HandZone.tsx?raw")).default as unknown as string;
    const spreadZoneSrc = (await import("../src/components/SpreadZone.tsx?raw")).default as unknown as string;
    expect(potZoneSrc).toMatch(/data-attract-anchor/);
    expect(handZoneSrc).toMatch(/data-attract-anchor/);
    expect(spreadZoneSrc).toMatch(/data-attract-anchor/);
  });

  it("App mounts the overlay with hook callbacks", () => {
    expect(appSrc).toMatch(/<AttractOverlay attract=\{attract\} onLocalDismiss=\{dismissAttract\} onExited=\{clearAttract\} \/>/);
  });
});
