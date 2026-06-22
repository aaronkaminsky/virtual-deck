import { describe, it, expect } from "vitest";
import PotZoneSrc from "../src/components/PotZone.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("PotZone", () => {
  it("imports ChipStack, Badge, MoreVertical, and Popover", () => {
    expect(PotZoneSrc).toMatch(/import\s*\{\s*ChipStack\s*\}\s*from\s*['"]\.\/ChipStack['"]/);
    expect(PotZoneSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(PotZoneSrc).toMatch(/MoreVertical/);
    expect(PotZoneSrc).toMatch(/Popover/);
  });

  it("wraps the zone in zone-hover and has a label+kebab row matching the PileZone pattern", () => {
    expect(PotZoneSrc).toMatch(/zone-hover/);
    expect(PotZoneSrc).toMatch(/zone-label/);
    expect(PotZoneSrc).toMatch(/flex justify-between items-center/);
  });

  it("renders the coin stack inside a bg-secondary box with the pot amount as an overlaid Badge", () => {
    expect(PotZoneSrc).toMatch(/bg-secondary/);
    expect(PotZoneSrc).toMatch(/<ChipStack/);
    expect(PotZoneSrc).toMatch(/<Badge className="absolute -bottom-2 -right-2">\{pot\}<\/Badge>/);
  });

  it("hides Take all behind zone-controls", () => {
    expect(PotZoneSrc).toMatch(/zone-controls[\s\S]{0,300}Take all/);
  });

  it("dispatches TRANSFER_CHIPS from pot to hand on the Take all action", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });

  it("offers a secondary control to move pot chips to the player's own spread", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]spread['"]/);
  });

  it("the popover amount input defaults to the current pot value when opened", () => {
    expect(PotZoneSrc).toMatch(/setAmount\(pot\)/);
  });
});

describe("BoardView renders PotZone in the rail when chips are enabled", () => {
  it("imports PotZone", () => {
    expect(BoardViewSrc).toMatch(/import\s*\{\s*PotZone\s*\}\s*from\s*['"]\.\/PotZone['"]/);
  });

  it("guards PotZone with gameState.chipsEnabled", () => {
    expect(BoardViewSrc).toMatch(/gameState\.chipsEnabled\s*&&[\s\S]{0,300}<PotZone/);
  });
});
