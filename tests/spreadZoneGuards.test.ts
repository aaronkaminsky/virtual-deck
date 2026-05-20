/**
 * Unit tests for SpreadZone guard/label changes (phase 26, plan 02)
 *
 * CTRL-05: Face-toggle button must not render on opponent spread zones (interactive === false)
 * LAYOUT-07: Name label span must be removed; header div renders only with active multi-selection
 *
 * Tests extract the guard conditions as pure boolean predicates — no component mounting.
 * Pattern mirrors controlsCollapse.test.ts and boardDragLayerDialog.test.ts.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// CTRL-05: face-toggle visibility predicate
// showFaceToggle mirrors: interactive !== false
// ---------------------------------------------------------------------------

function showFaceToggle(interactive: boolean | undefined): boolean {
  return interactive !== false;
}

describe("CTRL-05: face-toggle visibility", () => {
  it("renders when interactive is undefined (own zone default)", () => {
    expect(showFaceToggle(undefined)).toBe(true);
  });

  it("renders when interactive is true (own zone explicit)", () => {
    expect(showFaceToggle(true)).toBe(true);
  });

  it("does NOT render when interactive is false (opponent zone)", () => {
    expect(showFaceToggle(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LAYOUT-07: selection badge (header) visibility predicate
// showSelectionBadge mirrors:
//   selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id
// ---------------------------------------------------------------------------

function showSelectionBadge(
  selectedIds: Set<string> | undefined,
  selectionSourceZoneId: string | undefined,
  pileId: string
): boolean {
  return (
    selectedIds !== undefined &&
    selectedIds.size >= 2 &&
    selectionSourceZoneId === pileId
  );
}

describe("LAYOUT-07: selection badge (header) visibility", () => {
  it("does NOT render when selectedIds is undefined", () => {
    expect(showSelectionBadge(undefined, "pile-1", "pile-1")).toBe(false);
  });

  it("does NOT render when fewer than 2 cards selected", () => {
    expect(showSelectionBadge(new Set(["c1"]), "pile-1", "pile-1")).toBe(false);
  });

  it("does NOT render when 0 cards selected", () => {
    expect(showSelectionBadge(new Set(), "pile-1", "pile-1")).toBe(false);
  });

  it("does NOT render when selection source is a different zone", () => {
    expect(showSelectionBadge(new Set(["c1", "c2"]), "pile-2", "pile-1")).toBe(false);
  });

  it("does NOT render when selectionSourceZoneId is undefined", () => {
    expect(showSelectionBadge(new Set(["c1", "c2"]), undefined, "pile-1")).toBe(false);
  });

  it("renders when 2+ cards selected from this zone", () => {
    expect(showSelectionBadge(new Set(["c1", "c2"]), "pile-1", "pile-1")).toBe(true);
  });

  it("renders when 3+ cards selected from this zone", () => {
    expect(showSelectionBadge(new Set(["c1", "c2", "c3"]), "pile-1", "pile-1")).toBe(true);
  });
});
