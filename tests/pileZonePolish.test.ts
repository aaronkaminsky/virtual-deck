/**
 * Unit tests for PileZone visual polish (phase 26-01)
 *
 * POLISH-05: Badge renders only when pile.cards.length > 0 (no "0" badge on empty piles).
 * POLISH-06: Outer flex-column wrapper uses gap-0.5 (2px), not gap-1 (4px).
 *
 * Source-contract tests: read PileZone.tsx source and assert the implementation
 * patterns are present. These fail before the edits and pass after.
 */

import { describe, it, expect } from "vitest";

// Read PileZone.tsx via the Vite/Vitest ?raw import (ESM-compatible, no Node types needed)
import PileZoneSrc from "../src/components/PileZone.tsx?raw";

describe("PileZone — POLISH-05: conditional badge render", () => {
  it("guards the Badge with !isEmpty so it does not render on empty piles", () => {
    expect(PileZoneSrc).toMatch(/!isEmpty\s*&&\s*<Badge/);
  });

  it("does NOT render a bare unguarded <Badge", () => {
    // After the fix, every <Badge in the pile card area must be guarded.
    // We assert there is no <Badge that is NOT preceded by a && operator.
    const badgeMatches = [...(PileZoneSrc as string).matchAll(/<Badge/g)];
    for (const match of badgeMatches) {
      const before = (PileZoneSrc as string).slice(
        Math.max(0, match.index! - 30),
        match.index!
      );
      expect(before).toMatch(/&&\s*$/);
    }
  });
});

describe("PileZone — POLISH-06: tighter controls gap", () => {
  it("outer flex-col wrapper uses gap-0.5 (2px)", () => {
    expect(PileZoneSrc).toMatch(/flex flex-col gap-0\.5/);
  });

  it("does NOT have gap-1 on the outer flex-col wrapper", () => {
    expect(PileZoneSrc).not.toMatch(/flex flex-col gap-1/);
  });
});
