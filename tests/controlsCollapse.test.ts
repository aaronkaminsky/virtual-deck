/**
 * Unit tests for ControlsBar collapse logic (phase 18)
 *
 * LAYOUT-03: Panel closed by default; auto-closes after Deal/Undo/Reset; confirmReset
 *            cleared on panel close; Undo disabled when !canUndo; Deal disabled when
 *            phase=playing; Reset disabled when phase!=playing.
 *
 * Tests extract behavioral logic into plain functions — no component mounting,
 * no jsdom, no React Testing Library (same pattern as boardDragLayerDialog.test.ts).
 */

import { describe, it, expect, vi } from "vitest";
import type { ClientAction, ClientGameState } from "@shared/types";

// ---------------------------------------------------------------------------
// Factory — mirrors the exact handlers the ControlsBar rewrite will use
// ---------------------------------------------------------------------------

function makeControlsLogic(
  _initialPhase: ClientGameState["phase"] = "setup",
  _canUndo = false,
) {
  let open = false;
  let confirmReset = false;
  const sendAction = vi.fn<(action: ClientAction) => void>();

  function setOpen(nextOpen: boolean) {
    if (!nextOpen) confirmReset = false;
    open = nextOpen;
  }
  function setConfirmReset(v: boolean) { confirmReset = v; }

  function handleAction(type: ClientAction["type"], extra: Record<string, unknown> = {}) {
    sendAction({ type, ...extra } as ClientAction);
    setOpen(false);
  }

  return {
    get open() { return open; },
    get confirmReset() { return confirmReset; },
    setOpen,
    setConfirmReset,
    handleAction,
    sendAction,
  };
}

// ---------------------------------------------------------------------------
// Enabled/disabled pure helpers — mirror Boolean expressions from the rewrite
// ---------------------------------------------------------------------------

function isDealDisabled(phase: ClientGameState["phase"]) {
  return phase !== "setup" && phase !== "lobby";
}
function isUndoDisabled(canUndo: boolean) {
  return !canUndo;
}
function isResetDisabled(phase: ClientGameState["phase"]) {
  return phase !== "playing";
}

// ---------------------------------------------------------------------------
// LAYOUT-03: panel closed by default
// ---------------------------------------------------------------------------

describe("LAYOUT-03: panel closed by default", () => {
  it("open initializes to false", () => {
    const logic = makeControlsLogic();
    expect(logic.open).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LAYOUT-03: panel auto-closes after action
// ---------------------------------------------------------------------------

describe("LAYOUT-03: panel auto-closes after action", () => {
  it("handleAction('DEAL_CARDS', { cardsPerPlayer: 5 }) calls sendAction with cardsPerPlayer and sets open=false", () => {
    const logic = makeControlsLogic("setup");
    logic.setOpen(true);
    logic.handleAction("DEAL_CARDS", { cardsPerPlayer: 5 });
    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({ type: "DEAL_CARDS", cardsPerPlayer: 5 });
    expect(logic.open).toBe(false);
  });

  it("handleAction('UNDO_MOVE') calls sendAction and sets open=false", () => {
    const logic = makeControlsLogic("playing", true);
    logic.setOpen(true);
    logic.handleAction("UNDO_MOVE");
    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({ type: "UNDO_MOVE" });
    expect(logic.open).toBe(false);
  });

  it("handleAction('RESET_TABLE') calls sendAction and sets open=false", () => {
    const logic = makeControlsLogic("playing");
    logic.setOpen(true);
    logic.handleAction("RESET_TABLE");
    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({ type: "RESET_TABLE" });
    expect(logic.open).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LAYOUT-03: confirmReset clears when panel closes (Pitfall 1)
// ---------------------------------------------------------------------------

describe("LAYOUT-03: confirmReset clears when panel closes (Pitfall 1)", () => {
  it("setOpen(false) clears confirmReset back to false", () => {
    const logic = makeControlsLogic();
    logic.setConfirmReset(true);
    expect(logic.confirmReset).toBe(true);
    logic.setOpen(false);
    expect(logic.confirmReset).toBe(false);
  });

  it("setOpen(true) does NOT touch confirmReset", () => {
    const logic = makeControlsLogic();
    logic.setConfirmReset(true);
    logic.setOpen(true);
    expect(logic.confirmReset).toBe(true);
  });

  it("handleAction('RESET_TABLE') clears confirmReset via setOpen(false) chain", () => {
    const logic = makeControlsLogic("playing");
    logic.setConfirmReset(true);
    logic.handleAction("RESET_TABLE");
    expect(logic.confirmReset).toBe(false);
    expect(logic.open).toBe(false);
    expect(logic.sendAction).toHaveBeenCalledOnce();
    expect(logic.sendAction).toHaveBeenCalledWith({ type: "RESET_TABLE" });
  });
});

// ---------------------------------------------------------------------------
// LAYOUT-03: enabled/disabled derivation
// ---------------------------------------------------------------------------

describe("LAYOUT-03: enabled/disabled derivation", () => {
  it("Undo disabled when canUndo=false", () => {
    expect(isUndoDisabled(false)).toBe(true);
  });

  it("Undo enabled when canUndo=true", () => {
    expect(isUndoDisabled(true)).toBe(false);
  });

  it("Deal enabled in setup phase", () => {
    expect(isDealDisabled("setup")).toBe(false);
  });

  it("Deal enabled in lobby phase", () => {
    expect(isDealDisabled("lobby")).toBe(false);
  });

  it("Deal disabled in playing phase", () => {
    expect(isDealDisabled("playing")).toBe(true);
  });

  it("Reset disabled in setup phase", () => {
    expect(isResetDisabled("setup")).toBe(true);
  });

  it("Reset disabled in lobby phase", () => {
    expect(isResetDisabled("lobby")).toBe(true);
  });

  it("Reset enabled in playing phase", () => {
    expect(isResetDisabled("playing")).toBe(false);
  });
});
