import { describe, it, expect, vi } from "vitest";
import {
  computeTabStops,
  computeZoneLetterMap,
  buildLetterToZoneMap,
  moveCursor,
  computeCursorCardId,
  buildAltShortcutAction,
  buildKeyDownHandler,
  buildKeyUpHandler,
  type CursorPos,
} from "../src/lib/keyboardUtils";
import type { ClientGameState, SelectionSource } from "../src/shared/types";

function makeCard(id: string) {
  return { id, suit: "spades" as const, rank: "A" as const, faceUp: true };
}

function makeState(overrides: Partial<ClientGameState> = {}): ClientGameState {
  return {
    roomId: "test",
    phase: "playing",
    players: [],
    myPlayerId: "player1",
    myHand: [],
    myHandRevealed: false,
    opponentRevealedHands: {},
    opponentHandCounts: {},
    piles: [],
    canUndo: false,
    myPlayZoneId: "spread-player1",
    canvasCards: [],
    ...overrides,
  };
}

// ─── computeTabStops ──────────────────────────────────────────────────────────

describe("computeTabStops", () => {
  it("returns only menu when all zones are empty", () => {
    const stops = computeTabStops(makeState());
    expect(stops).toEqual([{ zoneId: "menu", cardIds: [] }]);
  });

  it("includes hand before piles before canvas, menu last", () => {
    const state = makeState({
      myHand: [makeCard("h1"), makeCard("h2")],
      piles: [
        { id: "draw", name: "Draw", cards: [makeCard("d1")], region: undefined },
      ],
      canvasCards: [{ card: makeCard("c1"), x: 0, y: 0, z: 1 }],
    });
    const stops = computeTabStops(state);
    expect(stops.map((s) => s.zoneId)).toEqual(["hand", "pile-draw", "canvas", "menu"]);
    expect(stops[0].cardIds).toEqual(["h1", "h2"]);
  });

  it("places my spread zone after hand, before pile zones", () => {
    const state = makeState({
      myHand: [makeCard("h1")],
      myPlayZoneId: "spread-player1",
      piles: [
        {
          id: "spread-player1",
          name: "Player 1",
          cards: [makeCard("s1")],
          region: "spread",
          ownerId: "player1",
        },
        { id: "draw", name: "Draw", cards: [makeCard("d1")], region: undefined },
      ],
    });
    const stops = computeTabStops(state);
    expect(stops.map((s) => s.zoneId)).toEqual([
      "hand",
      "pile-spread-player1",
      "pile-draw",
      "menu",
    ]);
  });

  it("skips empty pile zones", () => {
    const state = makeState({
      piles: [
        { id: "draw", name: "Draw", cards: [], region: undefined },
        { id: "discard", name: "Discard", cards: [makeCard("d1")], region: undefined },
      ],
    });
    const stops = computeTabStops(state);
    expect(stops.map((s) => s.zoneId)).toEqual(["pile-discard", "menu"]);
  });
});

// ─── computeZoneLetterMap ─────────────────────────────────────────────────────

describe("computeZoneLetterMap", () => {
  it("assigns 'd' to draw and 'i' to discard", () => {
    const state = makeState({
      piles: [
        { id: "draw", name: "draw", cards: [], region: undefined },
        { id: "discard", name: "discard", cards: [], region: undefined },
      ],
    });
    const map = computeZoneLetterMap(state, "player1");
    expect(map.get("pile-draw")).toBe("d");
    expect(map.get("pile-discard")).toBe("i");
  });

  it("assigns 'h' to my hand", () => {
    const map = computeZoneLetterMap(makeState(), "player1");
    expect(map.get("hand")).toBe("h");
  });

  it("assigns first unique letter to opponent hand from their display name", () => {
    const state = makeState({
      players: [
        { id: "player1", displayName: "Alice", connected: true, handRevealed: false },
        { id: "player2", displayName: "Bob", connected: true, handRevealed: false },
      ],
      opponentHandCounts: { player2: 3 },
    });
    const map = computeZoneLetterMap(state, "player1");
    expect(map.get("opponent-hand-player2")).toBe("b");
  });

  it("resolves collisions by taking next available letter", () => {
    const state = makeState({
      piles: [
        { id: "draw", name: "draw", cards: [], region: undefined },
        { id: "custom", name: "delta", cards: [], region: undefined },
      ],
    });
    const map = computeZoneLetterMap(state, "player1");
    expect(map.get("pile-draw")).toBe("d");
    expect(map.get("pile-custom")).toBe("e");
  });

  it("does not include canvas", () => {
    const state = makeState({
      canvasCards: [{ card: makeCard("c1"), x: 0, y: 0, z: 1 }],
    });
    const map = computeZoneLetterMap(state, "player1");
    expect(map.has("canvas")).toBe(false);
  });
});

describe("buildLetterToZoneMap", () => {
  it("returns the reverse of zoneLetterMap", () => {
    const state = makeState({
      piles: [{ id: "draw", name: "draw", cards: [], region: undefined }],
    });
    const zoneMap = computeZoneLetterMap(state, "player1");
    const letterMap = buildLetterToZoneMap(zoneMap);
    expect(letterMap.get("d")).toBe("pile-draw");
    expect(letterMap.get("h")).toBe("hand");
  });
});

// ─── moveCursor ───────────────────────────────────────────────────────────────

describe("moveCursor", () => {
  const stops = [
    { zoneId: "hand", cardIds: ["h1", "h2", "h3"] },
    { zoneId: "pile-draw", cardIds: ["d1"] },
    { zoneId: "menu", cardIds: [] },
  ];

  it("returns first card stop when pos is null", () => {
    expect(moveCursor(null, "right", stops)).toEqual({ zoneId: "hand", index: 0 });
  });

  it("moves right within zone", () => {
    const pos: CursorPos = { zoneId: "hand", index: 0 };
    expect(moveCursor(pos, "right", stops)).toEqual({ zoneId: "hand", index: 1 });
  });

  it("advances to next zone at right boundary", () => {
    const pos: CursorPos = { zoneId: "hand", index: 2 };
    expect(moveCursor(pos, "right", stops)).toEqual({ zoneId: "pile-draw", index: 0 });
  });

  it("wraps right from last card stop back to first (skips menu)", () => {
    const pos: CursorPos = { zoneId: "pile-draw", index: 0 };
    expect(moveCursor(pos, "right", stops)).toEqual({ zoneId: "hand", index: 0 });
  });

  it("moves left within zone", () => {
    const pos: CursorPos = { zoneId: "hand", index: 2 };
    expect(moveCursor(pos, "left", stops)).toEqual({ zoneId: "hand", index: 1 });
  });

  it("wraps left from first stop to last card of last card-stop (skips menu)", () => {
    const pos: CursorPos = { zoneId: "hand", index: 0 };
    expect(moveCursor(pos, "left", stops)).toEqual({ zoneId: "pile-draw", index: 0 });
  });

  it("next-zone includes menu stop", () => {
    const pos: CursorPos = { zoneId: "pile-draw", index: 0 };
    expect(moveCursor(pos, "next-zone", stops)).toEqual({ zoneId: "menu", index: 0 });
  });

  it("prev-zone from menu goes to last card of pile-draw", () => {
    const pos: CursorPos = { zoneId: "menu", index: 0 };
    expect(moveCursor(pos, "prev-zone", stops)).toEqual({ zoneId: "pile-draw", index: 0 });
  });
});

// ─── computeCursorCardId ──────────────────────────────────────────────────────

describe("computeCursorCardId", () => {
  const stops = [
    { zoneId: "hand", cardIds: ["h1", "h2"] },
    { zoneId: "menu", cardIds: [] },
  ];

  it("returns null when pos is null", () => {
    expect(computeCursorCardId(null, stops)).toBeNull();
  });

  it("returns the card at the cursor index", () => {
    expect(computeCursorCardId({ zoneId: "hand", index: 1 }, stops)).toBe("h2");
  });

  it("returns null for menu stop", () => {
    expect(computeCursorCardId({ zoneId: "menu", index: 0 }, stops)).toBeNull();
  });
});

// ─── buildAltShortcutAction ───────────────────────────────────────────────────

describe("buildAltShortcutAction", () => {
  const selected = new Set(["card1", "card2"]);
  const handSource: SelectionSource = { zone: "hand", zoneId: "player1" };
  const pileSource: SelectionSource = { zone: "pile", zoneId: "draw" };
  const canvasSource: SelectionSource = { zone: "canvas", zoneId: "canvas" };

  it("returns null when selection is empty", () => {
    expect(
      buildAltShortcutAction({
        zoneId: "pile-draw",
        selectedIds: new Set(),
        selectionSource: handSource,
        myPlayerId: "player1",
      })
    ).toBeNull();
  });

  it("returns null when selectionSource is null", () => {
    expect(
      buildAltShortcutAction({
        zoneId: "pile-draw",
        selectedIds: selected,
        selectionSource: null,
        myPlayerId: "player1",
      })
    ).toBeNull();
  });

  it("dispatches PLAY_CARD_SET from hand to pile", () => {
    const action = buildAltShortcutAction({
      zoneId: "pile-discard",
      selectedIds: selected,
      selectionSource: handSource,
      myPlayerId: "player1",
    });
    expect(action).toEqual({
      type: "PLAY_CARD_SET",
      cardIds: ["card1", "card2"],
      fromZone: "hand",
      fromId: "player1",
      toZone: "pile",
      toId: "discard",
    });
  });

  it("dispatches PLAY_CARD_SET from pile to opponent hand", () => {
    const action = buildAltShortcutAction({
      zoneId: "opponent-hand-player2",
      selectedIds: selected,
      selectionSource: pileSource,
      myPlayerId: "player1",
    });
    expect(action).toEqual({
      type: "PLAY_CARD_SET",
      cardIds: ["card1", "card2"],
      fromZone: "pile",
      fromId: "draw",
      toZone: "hand",
      toId: "player2",
    });
  });

  it("dispatches PLAY_CARD_SET from canvas to pile", () => {
    const action = buildAltShortcutAction({
      zoneId: "pile-draw",
      selectedIds: selected,
      selectionSource: canvasSource,
      myPlayerId: "player1",
    });
    expect(action).toEqual({
      type: "PLAY_CARD_SET",
      cardIds: ["card1", "card2"],
      fromZone: "canvas",
      fromId: "canvas",
      toZone: "pile",
      toId: "draw",
    });
  });

  it("dispatches to my own hand", () => {
    const action = buildAltShortcutAction({
      zoneId: "hand",
      selectedIds: selected,
      selectionSource: pileSource,
      myPlayerId: "player1",
    });
    expect(action).toMatchObject({ toZone: "hand", toId: "player1" });
  });
});

// ─── buildKeyDownHandler ──────────────────────────────────────────────────────

type MockParams = {
  sendAction: ReturnType<typeof vi.fn>;
  setCursorPos: ReturnType<typeof vi.fn>;
  setSelectedIds: ReturnType<typeof vi.fn>;
  setSelectionSource: ReturnType<typeof vi.fn>;
  setAltHeld: ReturnType<typeof vi.fn>;
  setShowShortcuts: ReturnType<typeof vi.fn>;
};

function makeHandlerParams(
  overrides: Partial<Parameters<typeof buildKeyDownHandler>[0]> = {}
) {
  const mocks: MockParams = {
    sendAction: vi.fn(),
    setCursorPos: vi.fn(),
    setSelectedIds: vi.fn(),
    setSelectionSource: vi.fn(),
    setAltHeld: vi.fn(),
    setShowShortcuts: vi.fn(),
  };

  const gameState = makeState({ myHand: [makeCard("h1"), makeCard("h2")], canUndo: true });
  const tabStops = [
    { zoneId: "hand", cardIds: ["h1", "h2"] },
    { zoneId: "pile-draw", cardIds: ["d1"] },
    { zoneId: "menu", cardIds: [] },
  ];

  const handler = buildKeyDownHandler({
    connected: true,
    gameState,
    sendAction: mocks.sendAction as unknown as (action: import("../src/shared/types").ClientAction) => void,
    cursorPos: null,
    setCursorPos: mocks.setCursorPos as unknown as (pos: CursorPos | null) => void,
    selectedIds: new Set<string>(),
    setSelectedIds: mocks.setSelectedIds as unknown as (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void,
    selectionSource: null,
    setSelectionSource: mocks.setSelectionSource as unknown as (src: import("../src/shared/types").SelectionSource) => void,
    setAltHeld: mocks.setAltHeld as unknown as (held: boolean) => void,
    showShortcuts: false,
    setShowShortcuts: mocks.setShowShortcuts as unknown as (v: boolean | ((prev: boolean) => boolean)) => void,
    tabStops,
    letterToZoneMap: new Map([["d", "pile-draw"], ["h", "hand"]]),
    myPlayerId: "player1",
    ...overrides,
  });

  return { mocks, handler };
}

function fakeEvent(
  key: string,
  mods: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    repeat?: boolean;
  } = {},
  target: object = { tagName: "DIV" }
): KeyboardEvent {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    preventDefault: vi.fn(),
    target,
    ...mods,
  } as unknown as KeyboardEvent;
}

describe("buildKeyDownHandler — undo", () => {
  it("dispatches UNDO_MOVE on Cmd+Z when canUndo", () => {
    const { mocks, handler } = makeHandlerParams();
    handler(fakeEvent("z", { metaKey: true }));
    expect(mocks.sendAction).toHaveBeenCalledWith({ type: "UNDO_MOVE" });
  });

  it("does not dispatch when canUndo is false", () => {
    const { mocks, handler } = makeHandlerParams({
      gameState: makeState({ canUndo: false }),
    });
    handler(fakeEvent("z", { metaKey: true }));
    expect(mocks.sendAction).not.toHaveBeenCalled();
  });

  it("does not dispatch when not connected", () => {
    const { mocks, handler } = makeHandlerParams({ connected: false });
    handler(fakeEvent("z", { metaKey: true }));
    expect(mocks.sendAction).not.toHaveBeenCalled();
  });

  it("ignores when focus is in an editable target", () => {
    const { mocks, handler } = makeHandlerParams();
    handler(fakeEvent("z", { metaKey: true }, { tagName: "INPUT" }));
    expect(mocks.sendAction).not.toHaveBeenCalled();
  });
});

describe("buildKeyDownHandler — cheat sheet", () => {
  it("toggles showShortcuts on ?", () => {
    const { mocks, handler } = makeHandlerParams();
    handler(fakeEvent("?"));
    expect(mocks.setShowShortcuts).toHaveBeenCalled();
  });

  it("closes showShortcuts on Escape if open", () => {
    const { mocks, handler } = makeHandlerParams({ showShortcuts: true });
    handler(fakeEvent("Escape"));
    expect(mocks.setShowShortcuts).toHaveBeenCalledWith(false);
    expect(mocks.setCursorPos).not.toHaveBeenCalled();
  });
});

describe("buildKeyDownHandler — cursor navigation", () => {
  it("ArrowRight from null sets cursor to first card stop", () => {
    const { mocks, handler } = makeHandlerParams({ cursorPos: null });
    handler(fakeEvent("ArrowRight"));
    expect(mocks.setCursorPos).toHaveBeenCalledWith({ zoneId: "hand", index: 0 });
  });

  it("Tab advances to next zone (next-zone includes menu)", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "pile-draw", index: 0 },
    });
    handler(fakeEvent("Tab"));
    expect(mocks.setCursorPos).toHaveBeenCalledWith({ zoneId: "menu", index: 0 });
  });

  it("Shift+Tab goes to prev zone (wraps to menu)", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "hand", index: 0 },
    });
    handler(fakeEvent("Tab", { shiftKey: true }));
    expect(mocks.setCursorPos).toHaveBeenCalledWith({ zoneId: "menu", index: 0 });
  });

  it("Shift+Tab from menu goes to last card stop", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "menu", index: 0 },
    });
    handler(fakeEvent("Tab", { shiftKey: true }));
    expect(mocks.setCursorPos).toHaveBeenCalledWith({ zoneId: "pile-draw", index: 0 });
  });
});

describe("buildKeyDownHandler — Space selection", () => {
  it("Space on a card calls setSelectedIds", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "hand", index: 0 },
    });
    handler(fakeEvent(" "));
    expect(mocks.setSelectedIds).toHaveBeenCalled();
  });

  it("Space on menu clears cursor and calls focusMenuTrigger", () => {
    const focusMenuTrigger = vi.fn();
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "menu", index: 0 },
      focusMenuTrigger,
    });
    handler(fakeEvent(" "));
    expect(mocks.setCursorPos).toHaveBeenCalledWith(null);
    expect(focusMenuTrigger).toHaveBeenCalled();
  });
});

describe("buildKeyDownHandler — Cmd+A select all", () => {
  it("selects all cards in the cursor zone", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "hand", index: 0 },
    });
    handler(fakeEvent("a", { metaKey: true }));
    expect(mocks.setSelectedIds).toHaveBeenCalledWith(new Set(["h1", "h2"]));
    expect(mocks.setSelectionSource).toHaveBeenCalledWith({
      zone: "hand",
      zoneId: "player1",
    });
  });
});

describe("buildKeyDownHandler — F flip", () => {
  it("dispatches FLIP_CARD when cursor is on a pile", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "pile-draw", index: 0 },
    });
    handler(fakeEvent("f"));
    expect(mocks.sendAction).toHaveBeenCalledWith({
      type: "FLIP_CARD",
      pileId: "draw",
      cardId: "d1",
    });
  });

  it("does not flip when cursor is on hand", () => {
    const { mocks, handler } = makeHandlerParams({
      cursorPos: { zoneId: "hand", index: 0 },
    });
    handler(fakeEvent("f"));
    expect(mocks.sendAction).not.toHaveBeenCalled();
  });
});

describe("buildKeyDownHandler — Alt+letter", () => {
  it("dispatches PLAY_CARD_SET when selection + letter match a zone", () => {
    const { mocks, handler } = makeHandlerParams({
      selectedIds: new Set(["h1"]),
      selectionSource: { zone: "hand", zoneId: "player1" },
      cursorPos: { zoneId: "hand", index: 0 },
    });
    handler(fakeEvent("d", { altKey: true }));
    expect(mocks.sendAction).toHaveBeenCalledWith({
      type: "PLAY_CARD_SET",
      cardIds: ["h1"],
      fromZone: "hand",
      fromId: "player1",
      toZone: "pile",
      toId: "draw",
    });
    expect(mocks.setSelectedIds).toHaveBeenCalledWith(new Set());
  });

  it("no-ops when selection is empty", () => {
    const { mocks, handler } = makeHandlerParams();
    handler(fakeEvent("d", { altKey: true }));
    expect(mocks.sendAction).not.toHaveBeenCalled();
  });
});

describe("buildKeyUpHandler", () => {
  it("clears altHeld when Alt is released", () => {
    const setAltHeld = vi.fn();
    const handler = buildKeyUpHandler({ setAltHeld });
    handler({ key: "Alt" } as KeyboardEvent);
    expect(setAltHeld).toHaveBeenCalledWith(false);
  });

  it("does not clear altHeld for other keys", () => {
    const setAltHeld = vi.fn();
    const handler = buildKeyUpHandler({ setAltHeld });
    handler({ key: "d" } as KeyboardEvent);
    expect(setAltHeld).not.toHaveBeenCalled();
  });
});
