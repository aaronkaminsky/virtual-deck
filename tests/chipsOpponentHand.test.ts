import { describe, it, expect } from "vitest";
import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";

describe("OpponentHand chip support", () => {
  it("imports ChipBadge", () => {
    expect(OpponentHandSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
  });

  it("accepts chipsEnabled and chipsInHand props", () => {
    expect(OpponentHandSrc).toMatch(/chipsEnabled:\s*boolean/);
    expect(OpponentHandSrc).toMatch(/chipsInHand:\s*number/);
  });

  it("renders ChipBadge only when chipsEnabled is true, with no chip-transfer controls", () => {
    expect(OpponentHandSrc).toMatch(/chipsEnabled\s*&&[\s\S]{0,200}<ChipBadge/);
    expect(OpponentHandSrc).not.toMatch(/TRANSFER_CHIPS/);
  });
});
