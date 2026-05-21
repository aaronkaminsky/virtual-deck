/**
 * Source-contract tests for OpponentHand drop-target behavior (phase 27 CTRL-06)
 *
 * CTRL-06: Drop-target border is hover-only — appears only when isOver === true.
 * No dashed amber border at drag-start; no size expansion at drag-start.
 * "Drop to pass" text hint preserved (D-03).
 */

import { describe, it, expect } from "vitest";

import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";

describe("OpponentHand — CTRL-06: hover-only drop-target border", () => {
  it("uses a two-branch isOver-only ternary for the border class", () => {
    expect(OpponentHandSrc).toMatch(
      /isOver \? 'border-2 border-primary' : 'border-2 border-transparent'/
    );
  });

  it("does NOT contain the drag-active dashed amber border branch", () => {
    expect(OpponentHandSrc).not.toMatch(/border-dashed border-primary\/60/);
  });

  it("does NOT contain the drag-active min-h size expansion", () => {
    expect(OpponentHandSrc).not.toMatch(/min-h-\[44px\]/);
  });

  it("does NOT contain the drag-active min-w size expansion", () => {
    expect(OpponentHandSrc).not.toMatch(/min-w-\[80px\]/);
  });
});

describe("OpponentHand — D-03: preserved behaviors", () => {
  it("still contains the 'Drop to pass' text hint", () => {
    expect(OpponentHandSrc).toContain("Drop to pass");
  });

  it("still imports useDndContext from @dnd-kit/core", () => {
    expect(OpponentHandSrc).toMatch(/useDndContext/);
  });
});
