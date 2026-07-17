import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone zone controls (1039)", () => {
  it("gates the controls row on interactivity only, not on the zone being empty", () => {
    // The zone-controls row must render for any interactive zone…
    expect(SpreadZoneSrc).toMatch(/interactive !== false && \([\s\S]{0,160}zone-controls/);
    // …and must not be additionally gated on the zone having cards.
    expect(SpreadZoneSrc).not.toMatch(/interactive !== false && !isReallyEmpty && \([\s\S]{0,160}zone-controls/);
  });

  it("floats the controls above the panel when the zone is empty, so they cost no flow height", () => {
    // Empty zone: absolutely-positioned row above the strip (in the rail column's
    // empty bottom space); populated zone: the normal in-flow zone-controls row.
    expect(SpreadZoneSrc).toMatch(/isReallyEmpty[\s\S]{0,120}zone-controls-floating absolute bottom-full left-0/);
  });
});
