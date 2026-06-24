import { describe, it, expect } from "vitest";
import { createDoubleKeyDetector, createSequenceDetector, isEditableTarget } from "../src/lib/celebrationHotkey";

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

describe("createSequenceDetector", () => {
  it("fires when the full sequence is typed in order within the window", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("g", 1300)).toBe(true);
  });

  it("does not fire if a step exceeds the window", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("g", 1600)).toBe(false); // 600ms gap — too slow
  });

  it("resets on a non-matching key", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("x", 1100)).toBe(false); // mismatch resets
    expect(detect("g", 1200)).toBe(false); // sequence restarted, "g" alone doesn't match "b"
  });

  it("treats a matching restart key as a fresh first step instead of losing it", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("b", 1100)).toBe(false); // second "b" restarts position 1, not a mismatch-to-zero
    expect(detect("g", 1200)).toBe(true);
  });

  it("supports longer sequences (Konami-style)", () => {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"];
    const detect = createSequenceDetector(seq, 2000);
    expect(detect("ArrowUp", 0)).toBe(false);
    expect(detect("ArrowUp", 200)).toBe(false);
    expect(detect("ArrowDown", 400)).toBe(false);
    expect(detect("ArrowDown", 600)).toBe(true);
  });

  it("consumes the sequence so it can fire again on a fresh repeat", () => {
    const detect = createSequenceDetector(["b", "g"], 500);
    expect(detect("b", 1000)).toBe(false);
    expect(detect("g", 1100)).toBe(true);
    expect(detect("b", 1200)).toBe(false);
    expect(detect("g", 1300)).toBe(true);
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
