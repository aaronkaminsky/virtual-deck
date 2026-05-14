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
});
