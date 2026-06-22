import { describe, it, expect } from "vitest";
import PotZoneSrc from "../src/components/PotZone.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("PotZone", () => {
  it("imports ChipStack", () => {
    expect(PotZoneSrc).toMatch(/import\s*\{\s*ChipStack\s*\}\s*from\s*['"]\.\/ChipStack['"]/);
  });

  it("dispatches TRANSFER_CHIPS from pot to hand on the Take all action", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });

  it("offers a secondary control to move pot chips to the player's own spread", () => {
    expect(PotZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]pot['"][\s\S]{0,40}to:\s*['"]spread['"]/);
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
