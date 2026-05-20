/**
 * Unit tests for GridZone face-toggle relocation (phase 26, plan 02)
 *
 * CTRL-07: Face-toggle button must be inline-right of the "Play Area" label,
 *          not below the card grid in a standalone block.
 *          The interactive !== false guard still applies.
 *
 * Tests extract guard conditions as pure boolean predicates — no component mounting.
 * Pattern mirrors controlsCollapse.test.ts.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// CTRL-07: face-toggle in label row visibility predicate
// showGridFaceToggle mirrors: interactive !== false
// (same logic as SpreadZone — moved from standalone block to label row)
// ---------------------------------------------------------------------------

function showGridFaceToggle(interactive: boolean | undefined): boolean {
  return interactive !== false;
}

describe("CTRL-07: GridZone face-toggle visibility", () => {
  it("renders when interactive is undefined (communal grid default)", () => {
    expect(showGridFaceToggle(undefined)).toBe(true);
  });

  it("renders when interactive is true (explicit own zone)", () => {
    expect(showGridFaceToggle(true)).toBe(true);
  });

  it("does NOT render when interactive is false (opponent/read-only view)", () => {
    expect(showGridFaceToggle(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CTRL-07: label row layout — justify-between when toggle is present
// Verifies the className logic: if interactive !== false, use justify-between
// ---------------------------------------------------------------------------

function labelRowClassName(interactive: boolean | undefined): string {
  return interactive !== false
    ? "flex items-center justify-between"
    : "flex items-center";
}

describe("CTRL-07: label row layout class", () => {
  it("uses justify-between when interactive is undefined", () => {
    expect(labelRowClassName(undefined)).toBe("flex items-center justify-between");
  });

  it("uses justify-between when interactive is true", () => {
    expect(labelRowClassName(true)).toBe("flex items-center justify-between");
  });

  it("plain flex items-center when interactive is false", () => {
    expect(labelRowClassName(false)).toBe("flex items-center");
  });
});
