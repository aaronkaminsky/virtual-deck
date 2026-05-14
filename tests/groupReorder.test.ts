import { describe, it, expect } from "vitest";
import type { Card } from "../src/shared/types";
import { makeCard } from "./helpers";

// RED scaffold: deliberately incorrect — returns input unchanged.
// Plan 03 will replace this stub with the D-06 algorithm in tests AND inline the
// same algorithm into SpreadZone.tsx and HandZone.tsx.
function groupReorder(cards: Card[], _selectedIds: Set<string>, _overId: string): Card[] {
  return [...cards]; // STUB — to be replaced in Plan 03
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
