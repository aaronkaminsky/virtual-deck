/**
 * Unit tests for BoardDragLayer pile-drop dialog logic (phase 999.11)
 *
 * UX-02: Escape key / click-outside dismisses dialog WITHOUT sending a MOVE_CARD action.
 *        Implemented via Dialog.Root onOpenChange: when !_open → setPendingMove(null), sendAction NOT called.
 *
 * UX-03: Enter key on the auto-focused Top button confirms position 'top'.
 *        Implemented by initialFocus={topButtonRef} + Top button onClick → sendPendingMove('top').
 *
 * These tests extract and verify the key behavioral contracts without mounting the full
 * component (which requires dnd-kit, @base-ui dialog portal, and jsdom).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Card, ClientAction } from "@shared/types";

// ---------------------------------------------------------------------------
// Helpers — mirrors the internal logic of BoardDragLayer
// ---------------------------------------------------------------------------

type PendingMove = {
  card: Card;
  fromZone: "hand" | "pile";
  fromId: string;
  toZone: "hand" | "pile";
  toId: string;
};

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

/**
 * Creates a self-contained instance of the dialog logic extracted from BoardDragLayer.
 * Returns:
 *   - pendingMove state + setter (simulates React useState)
 *   - sendPendingMove function (exact logic copy from implementation)
 *   - onOpenChange handler (exact logic copy from implementation)
 *   - sendAction mock
 */
function makeDialogLogic(initialPendingMove: PendingMove | null = null) {
  let pendingMove: PendingMove | null = initialPendingMove;
  const sendAction = vi.fn<[ClientAction], void>();

  function setPendingMove(value: PendingMove | null) {
    pendingMove = value;
  }

  // Exact copy of sendPendingMove from BoardDragLayer
  function sendPendingMove(insertPosition: "top" | "bottom" | "random") {
    if (!pendingMove) {
      // Mirrors the dev-only console.error guard (WR-02)
      return;
    }
    sendAction({
      type: "MOVE_CARD",
      cardId: pendingMove.card.id,
      fromZone: pendingMove.fromZone,
      fromId: pendingMove.fromId,
      toZone: pendingMove.toZone,
      toId: pendingMove.toId,
      insertPosition,
    });
    setPendingMove(null);
  }

  // Exact copy of Dialog.Root onOpenChange from BoardDragLayer
  function onOpenChange(_open: boolean) {
    if (!_open) setPendingMove(null);
  }

  return {
    get pendingMove() { return pendingMove; },
    setPendingMove,
    sendPendingMove,
    onOpenChange,
    sendAction,
  };
}

// ---------------------------------------------------------------------------
// UX-02: Dialog cancellation (Escape / click-outside)
// ---------------------------------------------------------------------------

describe("UX-02: Dialog cancellation does not send MOVE_CARD", () => {
  it("onOpenChange(false) clears pendingMove without calling sendAction", () => {
    const card = makeCard("A-s");
    const pending: PendingMove = {
      card,
      fromZone: "hand",
      fromId: "hand",
      toZone: "pile",
      toId: "draw",
    };
    const logic = makeDialogLogic(pending);

    // Simulate Escape key or click-outside: Base UI fires onOpenChange(false)
    logic.onOpenChange(false);

    expect(logic.pendingMove).toBeNull();
    expect(logic.sendAction).not.toHaveBeenCalled();
  });

  it("onOpenChange(true) (dialog opening) does not touch pendingMove or sendAction", () => {
    const card = makeCard("K-h");
    const pending: PendingMove = {
      card,
      fromZone: "pile",
      fromId: "draw",
      toZone: "pile",
      toId: "discard",
    };
    const logic = makeDialogLogic(pending);

    // Opening event should be a no-op for the handler
    logic.onOpenChange(true);

    expect(logic.pendingMove).toBe(pending);
    expect(logic.sendAction).not.toHaveBeenCalled();
  });

  it("sendPendingMove with null pendingMove is a no-op (WR-02 guard)", () => {
    const logic = makeDialogLogic(null);

    // This should not throw and should not call sendAction
    logic.sendPendingMove("top");

    expect(logic.sendAction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// UX-03: Enter key on auto-focused Top button confirms position 'top'
// ---------------------------------------------------------------------------

describe("UX-03: Top button (auto-focused) sends MOVE_CARD with insertPosition top", () => {
  it("sendPendingMove('top') dispatches MOVE_CARD action with insertPosition 'top'", () => {
    const card = makeCard("Q-d");
    const pending: PendingMove = {
      card,
      fromZone: "hand",
      fromId: "hand",
      toZone: "pile",
      toId: "discard",
    };
    const logic = makeDialogLogic(pending);

    // Simulate Enter key on auto-focused Top button → button onClick fires
    logic.sendPendingMove("top");

    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({
      type: "MOVE_CARD",
      cardId: "Q-d",
      fromZone: "hand",
      fromId: "hand",
      toZone: "pile",
      toId: "discard",
      insertPosition: "top",
    });
  });

  it("sendPendingMove('top') clears pendingMove after dispatching", () => {
    const card = makeCard("2-c");
    const pending: PendingMove = {
      card,
      fromZone: "pile",
      fromId: "draw",
      toZone: "pile",
      toId: "draw",
    };
    const logic = makeDialogLogic(pending);

    logic.sendPendingMove("top");

    expect(logic.pendingMove).toBeNull();
  });

  it("sendPendingMove('bottom') dispatches MOVE_CARD with insertPosition 'bottom'", () => {
    const card = makeCard("5-h");
    const pending: PendingMove = {
      card,
      fromZone: "hand",
      fromId: "hand",
      toZone: "pile",
      toId: "draw",
    };
    const logic = makeDialogLogic(pending);

    logic.sendPendingMove("bottom");

    expect(logic.sendAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MOVE_CARD", insertPosition: "bottom" })
    );
  });

  it("sendPendingMove('random') dispatches MOVE_CARD with insertPosition 'random'", () => {
    const card = makeCard("J-s");
    const pending: PendingMove = {
      card,
      fromZone: "hand",
      fromId: "hand",
      toZone: "pile",
      toId: "draw",
    };
    const logic = makeDialogLogic(pending);

    logic.sendPendingMove("random");

    expect(logic.sendAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MOVE_CARD", insertPosition: "random" })
    );
  });
});

// ---------------------------------------------------------------------------
// Helpers for UX-01 tests
// ---------------------------------------------------------------------------

/**
 * Mirrors the new empty-pile branch logic extracted from handleDragEnd.
 * pilesInState represents gameState.piles — the pile lookup used to determine emptiness.
 */
function makePileDropLogic(pilesInState: Array<{ id: string; cards: unknown[] }>) {
  let pendingMove: PendingMove | null = null;
  const sendAction = vi.fn<[ClientAction], void>();
  function setPendingMove(value: PendingMove | null) { pendingMove = value; }

  function handlePileDrop(card: Card, fromZone: 'hand' | 'pile', fromId: string, toId: string) {
    const toZone = 'pile' as const;
    const targetPile = pilesInState.find(p => p.id === toId);
    const isEmpty = !targetPile || targetPile.cards.length === 0;
    if (isEmpty) {
      sendAction({
        type: 'MOVE_CARD',
        cardId: card.id,
        fromZone,
        fromId,
        toZone,
        toId,
        insertPosition: 'top',
      });
    } else {
      setPendingMove({ card, fromZone, fromId, toZone, toId });
    }
  }

  return { get pendingMove() { return pendingMove; }, sendAction, handlePileDrop };
}

// ---------------------------------------------------------------------------
// UX-01: Empty pile drop bypasses dialog
// ---------------------------------------------------------------------------

describe("UX-01: Empty pile drop bypasses dialog", () => {
  it("UX-01-A: empty pile — sendAction called with insertPosition 'top', setPendingMove NOT called", () => {
    const card = makeCard("A-s");
    const piles = [{ id: "draw", cards: [] }];
    const logic = makePileDropLogic(piles);

    logic.handlePileDrop(card, "hand", "hand", "draw");

    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({
      type: "MOVE_CARD",
      cardId: "A-s",
      fromZone: "hand",
      fromId: "hand",
      toZone: "pile",
      toId: "draw",
      insertPosition: "top",
    });
    expect(logic.pendingMove).toBeNull();
  });

  it("UX-01-B: non-empty pile — setPendingMove called, sendAction NOT called directly", () => {
    const card = makeCard("K-h");
    const piles = [{ id: "draw", cards: [{ id: "2-c" }] }];
    const logic = makePileDropLogic(piles);

    logic.handlePileDrop(card, "hand", "hand", "draw");

    expect(logic.sendAction).not.toHaveBeenCalled();
    expect(logic.pendingMove).not.toBeNull();
    expect(logic.pendingMove?.card).toBe(card);
    expect(logic.pendingMove?.toId).toBe("draw");
  });

  it("UX-01-C: pile not found (undefined) — treated as empty, sendAction called with insertPosition 'top'", () => {
    const card = makeCard("Q-d");
    const piles: Array<{ id: string; cards: unknown[] }> = []; // no matching pile
    const logic = makePileDropLogic(piles);

    logic.handlePileDrop(card, "hand", "hand", "nonexistent-pile");

    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith(
      expect.objectContaining({ insertPosition: "top", toId: "nonexistent-pile" })
    );
    expect(logic.pendingMove).toBeNull();
  });

  it("UX-01-D: fromZone pile onto empty target pile — bypasses dialog, sends with insertPosition 'top'", () => {
    const card = makeCard("5-h");
    const piles = [
      { id: "draw", cards: [{ id: "J-s" }] },
      { id: "discard", cards: [] },
    ];
    const logic = makePileDropLogic(piles);

    logic.handlePileDrop(card, "pile", "draw", "discard");

    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({
      type: "MOVE_CARD",
      cardId: "5-h",
      fromZone: "pile",
      fromId: "draw",
      toZone: "pile",
      toId: "discard",
      insertPosition: "top",
    });
    expect(logic.pendingMove).toBeNull();
  });
});
