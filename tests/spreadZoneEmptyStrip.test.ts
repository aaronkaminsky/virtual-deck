/**
 * Source-contract tests for SpreadZone empty resting state (phase 27 LAYOUT-06)
 *
 * LAYOUT-06: Empty personal spread zones show a faint dashed strip at ~¼ normal height,
 * replacing the invisible `h-px opacity-0` resting state.
 * isOver expanded drop-target, controls guard, and opponent/non-empty paths unchanged.
 */

import { describe, it, expect } from "vitest";

import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone — LAYOUT-06: faint dashed strip for empty resting state", () => {
  it("contains the new faint dashed strip class string", () => {
    expect(SpreadZoneSrc).toContain(
      "h-4 border border-dashed border-muted-foreground/30 rounded-md"
    );
  });

  it("does NOT contain the old invisible resting state", () => {
    expect(SpreadZoneSrc).not.toContain("h-px opacity-0");
  });
});

describe("SpreadZone — D-06: isOver expanded drop-target unchanged", () => {
  it("still contains the expanded isOver border", () => {
    expect(SpreadZoneSrc).toContain("border border-dashed border-primary rounded-lg");
  });

  it("still contains the isOver expanded height", () => {
    expect(SpreadZoneSrc).toContain("h-[40px] sm:h-[56px]");
  });
});

describe("SpreadZone — D-07: controls guard unchanged", () => {
  it("still has the interactive !== false && !isEmpty controls guard", () => {
    expect(SpreadZoneSrc).toContain("interactive !== false && !isEmpty");
  });
});

describe("SpreadZone — non-empty slot uses intrinsic sizing (GAP-04)", () => {
  it("populated slot has intrinsic sizing — no fixed h-[64px] or sm:h-[88px]", () => {
    expect(SpreadZoneSrc).not.toContain("h-[64px]");
    expect(SpreadZoneSrc).not.toContain("sm:h-[88px]");
  });

  it("populated slot retains min-w and symmetric padding", () => {
    expect(SpreadZoneSrc).toContain(
      "min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-2 overflow-x-auto bg-secondary"
    );
  });
});
