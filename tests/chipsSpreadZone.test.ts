import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone chip support", () => {
  it("imports ChipStack, Badge, MoreVertical, Popover, and ArrowRight", () => {
    expect(SpreadZoneSrc).toMatch(/import\s*\{\s*ChipStack\s*\}\s*from\s*['"]\.\/ChipStack['"]/);
    expect(SpreadZoneSrc).toMatch(/import\s*\{\s*Badge\s*\}\s*from\s*['"]@\/components\/ui\/badge['"]/);
    expect(SpreadZoneSrc).toMatch(/MoreVertical/);
    expect(SpreadZoneSrc).toMatch(/Popover/);
    expect(SpreadZoneSrc).toMatch(/ArrowRight/);
  });

  it("accepts chipsEnabled and chipsInSpread props", () => {
    expect(SpreadZoneSrc).toMatch(/chipsEnabled\?:\s*boolean/);
    expect(SpreadZoneSrc).toMatch(/chipsInSpread\?:\s*number/);
  });

  it("does not collapse to the thin empty strip when there is a bet but no cards", () => {
    expect(SpreadZoneSrc).toMatch(/const hasBet = chipsEnabled && chipsInSpread > 0;/);
    expect(SpreadZoneSrc).toMatch(/const isReallyEmpty = isEmpty && !hasBet;/);
  });

  it("renders the chip slot with an overlaid Badge for both owner and opponent views (no interactive gate on display)", () => {
    expect(SpreadZoneSrc).toMatch(/\{hasBet[\s\S]{0,400}<ChipStack/);
    expect(SpreadZoneSrc).toMatch(/<Badge className="absolute -bottom-2 -right-2">\{chipsInSpread\}<\/Badge>/);
  });

  it("gates the chip transfer CONTROLS (not the display) on interactive !== false", () => {
    expect(SpreadZoneSrc).toMatch(/interactive !== false[\s\S]{0,800}ArrowRight/);
  });

  it("orders chip controls before the eye/select-all controls with a divider between", () => {
    const controlsRowMatch = SpreadZoneSrc.match(/<div className="flex gap-1 zone-controls">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\);/);
    expect(controlsRowMatch).not.toBeNull();
    const row = controlsRowMatch![0];
    const arrowIdx = row.indexOf('ArrowRight');
    const eyeIdx = row.indexOf('handleToggleFace');
    expect(arrowIdx).toBeGreaterThan(-1);
    expect(eyeIdx).toBeGreaterThan(-1);
    expect(arrowIdx).toBeLessThan(eyeIdx);
  });

  it("dispatches TRANSFER_CHIPS from spread to pot on the always-visible action", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]pot['"]/);
  });

  it("dispatches TRANSFER_CHIPS from spread to hand from the popover", () => {
    expect(SpreadZoneSrc).toMatch(/type:\s*['"]TRANSFER_CHIPS['"][\s\S]{0,120}from:\s*['"]spread['"][\s\S]{0,40}to:\s*['"]hand['"]/);
  });

  it("the popover amount defaults to the current chipsInSpread value when opened", () => {
    expect(SpreadZoneSrc).toMatch(/setChipMoveAmount\(chipsInSpread\)/);
  });
});
