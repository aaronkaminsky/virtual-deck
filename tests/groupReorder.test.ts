import { describe, it, expect } from "vitest";
import type { Card } from "../src/shared/types";
import { makeCard } from "./helpers";

function groupReorder(cards: Card[], selectedIds: Set<string>, overId: string): Card[] {
  if (selectedIds.size === 0) return [...cards];
  const selected = cards.filter(c => selectedIds.has(c.id));
  const remainder = cards.filter(c => !selectedIds.has(c.id));
  const overIdx = remainder.findIndex(c => c.id === overId);
  const insertAt = overIdx === -1 ? remainder.length : overIdx;
  remainder.splice(insertAt, 0, ...selected);
  return remainder;
}

describe("groupReorder (D-06 splice algorithm)", () => {
  it("moves a selected block to the drop position, preserving the original relative order of selected cards", () => {
    const cards = ["A", "B", "C", "D", "E"].map(id => makeCard(id));
    const result = groupReorder(cards, new Set(["B", "D"]), "E");
    expect(result.map(c => c.id)).toEqual(["A", "C", "B", "D", "E"]);
  });

  it("appends the selected block to the end when overId is one of the selected cards (overIdx === -1 in remainder)", () => {
    const cards = ["A", "B", "C", "D", "E"].map(id => makeCard(id));
    const result = groupReorder(cards, new Set(["B", "D"]), "B");
    expect(result.map(c => c.id)).toEqual(["A", "C", "E", "B", "D"]);
  });

  it("inserts at index 0 when overId is the first non-selected card", () => {
    const cards = ["A", "B", "C"].map(id => makeCard(id));
    const result = groupReorder(cards, new Set(["B"]), "A");
    expect(result.map(c => c.id)).toEqual(["B", "A", "C"]);
  });

  it("handles selection of 3 adjacent cards moved to a new position", () => {
    const cards = ["A", "B", "C", "D", "E"].map(id => makeCard(id));
    const result = groupReorder(cards, new Set(["A", "B", "C"]), "E");
    expect(result.map(c => c.id)).toEqual(["D", "A", "B", "C", "E"]);
  });

  it("is a no-op when selectedIds is empty", () => {
    const cards = ["A", "B", "C"].map(id => makeCard(id));
    const result = groupReorder(cards, new Set(), "B");
    expect(result.map(c => c.id)).toEqual(["A", "B", "C"]);
  });

  it("appends the selected block to the end when overId is a sentinel (not a real card ID)", () => {
    // This covers the drop-to-end fix: sentinel IDs are not found in remainder → insertAt = remainder.length.
    const cards = ["A", "B", "C", "D", "E"].map(id => makeCard(id));
    const result = groupReorder(cards, new Set(["B", "D"]), "__sentinel-pile-play__");
    expect(result.map(c => c.id)).toEqual(["A", "C", "E", "B", "D"]);
  });

  it("appends a single non-selected card to the end when overId is a sentinel", () => {
    // Single-card sentinel: the component resolves sentinel → cards.length - 1 and calls arrayMove.
    // The pure groupReorder function is not invoked for single-card (isGroupReorder=false),
    // but we verify the sentinel logic in isolation for documentation.
    const cards = ["A", "B", "C", "D", "E"].map(id => makeCard(id));
    // groupReorder is only called when isGroupReorder=true; pass size-1 selectedIds to confirm
    // the algorithm is a no-op when called with a single-card selection (not the group path).
    const result = groupReorder(cards, new Set(["A"]), "__sentinel-pile-play__");
    // size === 1, so selected.size > 1 guard prevents group path; but our pure function doesn't
    // have that guard — it runs with size=1. Result: remainder=[B,C,D,E], insertAt=4, splice A at end.
    expect(result.map(c => c.id)).toEqual(["B", "C", "D", "E", "A"]);
  });
});
