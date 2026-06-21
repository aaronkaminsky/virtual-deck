import { describe, it, expect } from "vitest";
import ChipBadgeSrc from "../src/components/ChipBadge.tsx?raw";
import ChipStackSrc from "../src/components/ChipStack.tsx?raw";

describe("ChipBadge", () => {
  it("renders the amount inside a Badge with a primary-colored dot", () => {
    expect(ChipBadgeSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(ChipBadgeSrc).toMatch(/bg-primary/);
    expect(ChipBadgeSrc).toMatch(/\{amount\}/);
  });
});

describe("ChipStack", () => {
  it("renders exactly 3 discs regardless of amount, using only existing theme utility classes", () => {
    const discMatches = [...ChipStackSrc.matchAll(/rounded-full/g)];
    expect(discMatches.length).toBe(3);
    expect(ChipStackSrc).toMatch(/bg-primary/);
    expect(ChipStackSrc).toMatch(/bg-muted/);
    expect(ChipStackSrc).toMatch(/bg-secondary/);
    expect(ChipStackSrc).not.toMatch(/amount\s*>\s*\d+.*rounded-full/); // height must not scale with amount
    expect(ChipStackSrc).toMatch(/\{amount\}/);
  });
});
