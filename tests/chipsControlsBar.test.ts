import { describe, it, expect } from "vitest";
import ControlsBarSrc from "../src/components/ControlsBar.tsx?raw";

describe("ControlsBar chips toggle", () => {
  it("dispatches SET_CHIPS_MODE to flip chipsEnabled", () => {
    expect(ControlsBarSrc).toMatch(/type:\s*['"]SET_CHIPS_MODE['"][\s\S]{0,200}enabled:/);
  });

  it("includes a starting-amount number input bound to local state", () => {
    expect(ControlsBarSrc).toMatch(/startingChipsInput/);
    expect(ControlsBarSrc).toMatch(/type="number"[\s\S]{0,200}startingChipsInput/);
  });

  it("labels the toggle Poker Chips", () => {
    expect(ControlsBarSrc).toMatch(/Poker Chips/);
  });
});
