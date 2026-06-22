import { describe, it, expect } from "vitest";
import ChipBadgeSrc from "../src/components/ChipBadge.tsx?raw";
import ChipStackSrc from "../src/components/ChipStack.tsx?raw";

describe("ChipBadge", () => {
  it("renders the amount inside a Badge with a gradient gold-coin dot", () => {
    expect(ChipBadgeSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(ChipBadgeSrc).toMatch(/bg-gradient-to-br/);
    expect(ChipBadgeSrc).toMatch(/from-\[#f5d77a\]/);
    expect(ChipBadgeSrc).toMatch(/via-primary/);
    expect(ChipBadgeSrc).toMatch(/to-\[#9a7416\]/);
    expect(ChipBadgeSrc).toMatch(/\{amount\}/);
  });
});

describe("ChipStack", () => {
  it("renders exactly 3 absolutely-positioned coins with a fixed 5px gap, no inline amount text", () => {
    const coinMatches = [...ChipStackSrc.matchAll(/rounded-full/g)];
    expect(coinMatches.length).toBe(3);
    expect(ChipStackSrc).toMatch(/position:\s*['"]absolute['"]|className=.*absolute/);
    expect(ChipStackSrc).toMatch(/top:\s*10/);
    expect(ChipStackSrc).toMatch(/top:\s*5/);
    expect(ChipStackSrc).toMatch(/top:\s*0/);
    expect(ChipStackSrc).not.toMatch(/amount\s*>\s*\d+.*rounded-full/); // height must not scale with amount
    expect(ChipStackSrc).not.toMatch(/>\{amount\}</); // no inline visible number — consumers render it themselves
    expect(ChipStackSrc).toMatch(/aria-label=\{`\$\{amount\}/);
    expect(ChipStackSrc).toMatch(/bg-gradient-to-br/);
  });
});
