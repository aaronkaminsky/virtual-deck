import { describe, it, expect } from "vitest";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";

describe("HandZone chip support", () => {
  it("imports ChipBadge", () => {
    expect(HandZoneSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
  });

  it("accepts chipsEnabled and chipsInHand props", () => {
    expect(HandZoneSrc).toMatch(/chipsEnabled:\s*boolean/);
    expect(HandZoneSrc).toMatch(/chipsInHand:\s*number/);
  });

  it("renders ChipBadge only when chipsEnabled is true", () => {
    expect(HandZoneSrc).toMatch(/chipsEnabled\s*&&[\s\S]{0,400}<ChipBadge/);
  });

  it("dispatches TRANSFER_CHIPS from hand to spread on the Bet action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });

  it("dispatches TRANSFER_CHIPS from hand to pot on the To pot action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });
});
