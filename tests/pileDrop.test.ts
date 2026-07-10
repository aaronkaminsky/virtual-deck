/**
 * Unit tests for the pile-drop decision logic (1039).
 *
 * Replaces tests/boardDragLayerDialog.test.ts: the dialog is gone — a plain drop
 * on a non-empty pile inserts at top immediately, and drag-over flaps supply
 * insertPosition 'bottom' / 'random'. Unlike the old file (which tested copied
 * logic), these import the real functions used by BoardDragLayer.
 */
import { describe, it, expect } from "vitest";
import type { Card } from "@shared/types";
import {
  resolvePileDropAction,
  isFlapEligibleDrag,
  flapPlacement,
  FLAP_ROW_HEIGHT,
} from "@/lib/pileDrop";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

const baseArgs = {
  cardId: "A-s",
  fromZone: "hand" as const,
  fromId: "hand",
  toId: "draw",
  insertPosition: undefined,
  isIntraSpreadReorder: false,
};

describe("resolvePileDropAction", () => {
  it("empty pile: sends MOVE_CARD at top (flaps never render on empty piles)", () => {
    const action = resolvePileDropAction({ ...baseArgs, targetPile: { cards: [] } });
    expect(action).toEqual({
      type: "MOVE_CARD", cardId: "A-s", fromZone: "hand", fromId: "hand",
      toZone: "pile", toId: "draw", insertPosition: "top",
    });
  });

  it("missing pile (undefined): treated as empty, top", () => {
    const action = resolvePileDropAction({ ...baseArgs, targetPile: undefined });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "top", toId: "draw" }));
  });

  it("non-empty pile, plain drop (no insertPosition): sends MOVE_CARD at top immediately — no dialog", () => {
    const action = resolvePileDropAction({ ...baseArgs, targetPile: { cards: [makeCard("2-c")] } });
    expect(action).toEqual(expect.objectContaining({ type: "MOVE_CARD", insertPosition: "top" }));
  });

  it("non-empty pile, bottom flap: passes insertPosition through", () => {
    const action = resolvePileDropAction({
      ...baseArgs, targetPile: { cards: [makeCard("2-c")] }, insertPosition: "bottom",
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "bottom" }));
  });

  it("non-empty pile, random flap: passes insertPosition through", () => {
    const action = resolvePileDropAction({
      ...baseArgs, targetPile: { cards: [makeCard("2-c")] }, insertPosition: "random",
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "random" }));
  });

  it("spread zone: always top even if a flap position sneaks in (GAP-02)", () => {
    const action = resolvePileDropAction({
      ...baseArgs, toId: "spread-p1",
      targetPile: { region: "spread", cards: [makeCard("2-c")] }, insertPosition: "bottom",
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "top", toId: "spread-p1" }));
  });

  it("intra-spread reorder: returns null — SpreadZone's REORDER_PILE_SPREAD handles it (GAP-06)", () => {
    const action = resolvePileDropAction({
      ...baseArgs, fromZone: "pile", fromId: "spread-p1", toId: "spread-p1",
      targetPile: { region: "spread", cards: [makeCard("2-c")] }, isIntraSpreadReorder: true,
    });
    expect(action).toBeNull();
  });

  it("intra-spread onto EMPTY spread takes the isEmpty path and still sends (GAP-06-D)", () => {
    const action = resolvePileDropAction({
      ...baseArgs, fromZone: "pile", fromId: "spread-p1", toId: "spread-p1",
      targetPile: { region: "spread", cards: [] }, isIntraSpreadReorder: true,
    });
    expect(action).toEqual(expect.objectContaining({ insertPosition: "top" }));
  });
});

describe("isFlapEligibleDrag", () => {
  it("no active card drag: not eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: null, activePileId: null, selectedIds: new Set(), selectionSource: null,
    })).toBe(false);
  });

  it("whole-pile drag: not eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: null, activePileId: "pile-1", selectedIds: new Set(), selectionSource: null,
    })).toBe(false);
  });

  it("plain single-card drag: eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "A-s", activePileId: null, selectedIds: new Set(), selectionSource: null,
    })).toBe(true);
  });

  it("multi-card set drag (unmasked): eligible", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "A-s", activePileId: null,
      selectedIds: new Set(["A-s", "K-h"]),
      selectionSource: { zone: "hand", zoneId: "hand" },
    })).toBe(true);
  });

  it("masked-pile group drag: NOT eligible (resolves to MOVE_ALL_PILE_CARDS)", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "A-s", activePileId: null,
      selectedIds: new Set(["A-s"]),
      selectionSource: { zone: "pile", zoneId: "pile-1", hasMaskedCards: true },
    })).toBe(false);
  });

  it("masked selection but dragging a card OUTSIDE it: eligible (selection will be cleared on dragStart)", () => {
    expect(isFlapEligibleDrag({
      activeCardId: "Q-d", activePileId: null,
      selectedIds: new Set(["A-s"]),
      selectionSource: { zone: "pile", zoneId: "pile-1", hasMaskedCards: true },
    })).toBe(true);
  });
});

describe("flapPlacement", () => {
  it("renders below when the row fits above the viewport bottom", () => {
    expect(flapPlacement(600, 720)).toBe("below");
  });

  it("flips above when the row would overflow the viewport bottom", () => {
    expect(flapPlacement(720 - FLAP_ROW_HEIGHT, 720)).toBe("above");
  });
});
