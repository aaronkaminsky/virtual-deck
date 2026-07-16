import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone zone controls (1039)", () => {
  it("gates the controls row on interactivity only, not on the zone being empty", () => {
    // The zone-controls row must render for any interactive zone…
    expect(SpreadZoneSrc).toMatch(/interactive !== false && \([\s\S]{0,80}zone-controls/);
    // …and must not be additionally gated on the zone having cards.
    expect(SpreadZoneSrc).not.toMatch(/interactive !== false && !isReallyEmpty && \([\s\S]{0,80}zone-controls/);
  });
});
