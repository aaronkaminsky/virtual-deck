import { describe, it, expect } from "vitest";
import { createDoubleKeyDetector, isEditableTarget } from "../src/lib/celebrationHotkey";

describe("createDoubleKeyDetector", () => {
  it("fires only on a second press within the window", () => {
    const detect = createDoubleKeyDetector(500);
    expect(detect(1000)).toBe(false); // first press
    expect(detect(1300)).toBe(true);  // 300ms later — double
  });

  it("does not fire when the second press is outside the window", () => {
    const detect = createDoubleKeyDetector(500);
    expect(detect(1000)).toBe(false);
    expect(detect(2000)).toBe(false); // 1000ms gap — too slow
    expect(detect(2200)).toBe(true);  // now within window of the 2000 press
  });

  it("consumes the pair so three quick presses fire once", () => {
    const detect = createDoubleKeyDetector(500);
    expect(detect(1000)).toBe(false);
    expect(detect(1100)).toBe(true);  // pair fires
    expect(detect(1200)).toBe(false); // third press is a fresh first press
  });
});

describe("isEditableTarget", () => {
  it("treats form fields and contenteditable as editable", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ isContentEditable: true })).toBe(true);
  });

  it("treats other elements and null as not editable", () => {
    expect(isEditableTarget({ tagName: "DIV" })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
