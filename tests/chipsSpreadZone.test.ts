import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone chip support", () => {
  it("imports ChipBadge", () => {
    expect(SpreadZoneSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
  });

  it("accepts chipsEnabled and chipsInSpread props", () => {
    expect(SpreadZoneSrc).toMatch(/chipsEnabled\?:\s*boolean/);
    expect(SpreadZoneSrc).toMatch(/chipsInSpread\?:\s*number/);
  });

  it("renders chip controls only when interactive (owner only)", () => {
    expect(SpreadZoneSrc).toMatch(/interactive\s*(!==\s*false|===\s*true)[\s\S]{0,400}<ChipBadge/);
  });

  it("dispatches TRANSFER_CHIPS from spread to pot on the Move to pot action", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });

  it("dispatches TRANSFER_CHIPS from spread to hand on the To hand action", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });
});
