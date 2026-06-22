import { describe, it, expect } from "vitest";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";

describe("HandZone chip support", () => {
  it("imports ChipBadge, MoreVertical, and Popover", () => {
    expect(HandZoneSrc).toMatch(/import\s*\{\s*ChipBadge\s*\}\s*from\s*['"]\.\/ChipBadge['"]/);
    expect(HandZoneSrc).toMatch(/MoreVertical/);
    expect(HandZoneSrc).toMatch(/Popover/);
  });

  it("accepts chipsEnabled and chipsInHand props", () => {
    expect(HandZoneSrc).toMatch(/chipsEnabled:\s*boolean/);
    expect(HandZoneSrc).toMatch(/chipsInHand:\s*number/);
  });

  it("renders ChipBadge in the name row (same block as the connected-dot span), not a separate row", () => {
    const nameRowMatch = HandZoneSrc.match(/<div className="flex items-center gap-2 px-4 mb-1">[\s\S]*?<\/div>\s*<div\s/);
    expect(nameRowMatch).not.toBeNull();
    expect(nameRowMatch![0]).toMatch(/<ChipBadge/);
  });

  it("wraps the bet input, Bet button, and kebab together in zone-controls", () => {
    expect(HandZoneSrc).toMatch(/zone-controls[\s\S]{0,80}>[\s\S]{0,600}type="number"[\s\S]{0,500}Bet \{betAmount\}[\s\S]{0,500}MoreVertical/);
  });

  it("dispatches TRANSFER_CHIPS from hand to spread on the Bet action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });

  it("dispatches TRANSFER_CHIPS from hand to pot on the popover's To pot action", () => {
    expect(HandZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]hand['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });

  it("no standalone always-visible chip row remains outside zone-controls", () => {
    // The old shipped version had a second top-level "flex items-center gap-2 px-4 mb-1" row
    // dedicated to chips. After this change there must be exactly one such row (the name row).
    const matches = [...HandZoneSrc.matchAll(/<div className="flex items-center gap-2 px-4 mb-1">/g)];
    expect(matches.length).toBe(1);
  });
});
