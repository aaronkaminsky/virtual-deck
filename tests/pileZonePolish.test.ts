/**
 * Unit tests for PileZone visual polish (phase 26-01)
 *
 * POLISH-05: Badge renders only when pile.cards.length > 0 (no "0" badge on empty piles).
 * POLISH-06: Outer flex-column wrapper uses gap-0.5 (2px), not gap-1 (4px).
 *
 * These tests verify the source-code contracts by reading the file directly.
 * No DOM mounting (the project has no jsdom test environment).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(
  resolve(__dirname, "../src/components/PileZone.tsx"),
  "utf-8"
);

describe("PileZone — POLISH-05: conditional badge render", () => {
  it("guards the Badge with !isEmpty so it does not render on empty piles", () => {
    expect(SRC).toMatch(/!isEmpty\s*&&\s*<Badge/);
  });

  it("does NOT render a bare Badge without a conditional guard", () => {
    // A bare <Badge without any guard means the badge always renders.
    // After the fix, every <Badge in the pile card area must be preceded by a conditional.
    // The simplest check: there should be no '<Badge' that is NOT preceded by '&&'.
    const badgeMatches = [...SRC.matchAll(/<Badge/g)];
    for (const match of badgeMatches) {
      const before = SRC.slice(Math.max(0, match.index! - 30), match.index!);
      expect(before).toMatch(/&&\s*$/);
    }
  });
});

describe("PileZone — POLISH-06: tighter controls gap", () => {
  it("outer wrapper uses gap-0.5 (2px), not gap-1 (4px)", () => {
    expect(SRC).toMatch(/flex flex-col gap-0\.5/);
  });

  it("does NOT have gap-1 on the outer flex-col wrapper", () => {
    // The outer wrapper must not use gap-1; gap-1 is only allowed on inner rows.
    // Strategy: the outer "flex flex-col" should use gap-0.5.
    // We confirm the old pattern is gone by checking there is no 'flex flex-col gap-1'.
    expect(SRC).not.toMatch(/flex flex-col gap-1/);
  });
});
