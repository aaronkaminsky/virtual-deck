import type { ClientGameState, ClientAction, SelectionSource, Card } from "@/shared/types";
import { isEditableTarget } from "@/lib/celebrationHotkey";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CursorPos = {
  /** 'hand' | 'pile-{id}' | 'canvas' | 'menu' */
  zoneId: string;
  /** card index within zone; 0 for menu */
  index: number;
};

export type TabStop = {
  zoneId: string;
  cardIds: string[]; // empty for 'menu'
};

// ─── Tab stop computation ─────────────────────────────────────────────────────

export function computeTabStops(gameState: ClientGameState): TabStop[] {
  const stops: TabStop[] = [];

  // 1. My hand
  if (gameState.myHand.length > 0) {
    stops.push({ zoneId: "hand", cardIds: gameState.myHand.map((c) => c.id) });
  }

  // 2. My spread zone (if present and has face-up cards)
  const mySpread = gameState.piles.find(
    (p) => p.id === gameState.myPlayZoneId && p.region === "spread"
  );
  if (mySpread) {
    const ids = mySpread.cards
      .filter((c): c is Card => "id" in c)
      .map((c) => c.id);
    if (ids.length > 0) stops.push({ zoneId: `pile-${mySpread.id}`, cardIds: ids });
  }

  // 3. Non-spread piles in clockwise order: discard first, draw second, then others
  const nonSpreadPiles = gameState.piles.filter((p) => (p.region ?? "pile") === "pile");
  const discard = nonSpreadPiles.find((p) => p.id === "discard");
  const draw = nonSpreadPiles.find((p) => p.id === "draw");
  const otherPiles = nonSpreadPiles.filter((p) => p.id !== "discard" && p.id !== "draw");
  for (const pile of [discard, draw, ...otherPiles]) {
    if (!pile) continue;
    const cards = pile.cards.filter((c): c is Card => "id" in c);
    if (cards.length > 0) {
      stops.push({ zoneId: `pile-${pile.id}`, cardIds: [cards[cards.length - 1].id] });
    }
  }

  // 4. Menu — always present, before canvas in clockwise order
  stops.push({ zoneId: "menu", cardIds: [] });

  // 5. Canvas last (x-position ascending: left → right for arrow-key navigation)
  if (gameState.canvasCards.length > 0) {
    const sorted = [...gameState.canvasCards].sort((a, b) => a.x - b.x);
    stops.push({ zoneId: "canvas", cardIds: sorted.map((cc) => cc.card.id) });
  }

  return stops;
}

// ─── Zone letter map ──────────────────────────────────────────────────────────

type ZoneEntry = { zoneId: string; sourceName: string };

function assignLetters(entries: ZoneEntry[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const { zoneId, sourceName } of entries) {
    const letters = sourceName.toLowerCase().replace(/[^a-z]/g, "");
    let assigned = "";
    for (const ch of letters) {
      if (!used.has(ch)) {
        assigned = ch;
        break;
      }
    }
    if (assigned) {
      used.add(assigned);
      map.set(zoneId, assigned);
    }
  }
  return map;
}

/**
 * Returns Map<zoneId, letter> for all Alt+shortcut send-targets.
 * Order: hand → pile zones → my spread → opponent spreads → opponent hands → canvas.
 */
export function computeZoneLetterMap(
  gameState: ClientGameState,
  myPlayerId: string
): Map<string, string> {
  const entries: ZoneEntry[] = [];

  // 1. My hand
  entries.push({ zoneId: "hand", sourceName: "hand" });

  // 2. Non-spread piles in gameState order
  for (const pile of gameState.piles.filter((p) => (p.region ?? "pile") === "pile")) {
    entries.push({ zoneId: `pile-${pile.id}`, sourceName: pile.name });
  }

  // 3. My spread zone
  const mySpread = gameState.piles.find(
    (p) => p.id === gameState.myPlayZoneId && p.region === "spread"
  );
  if (mySpread) {
    entries.push({ zoneId: `pile-${mySpread.id}`, sourceName: mySpread.name + " spread" });
  }

  // 4. Opponent spread zones
  for (const pile of gameState.piles.filter(
    (p) => p.region === "spread" && p.ownerId !== myPlayerId
  )) {
    const owner = gameState.players.find((pl) => pl.id === pile.ownerId);
    entries.push({
      zoneId: `pile-${pile.id}`,
      sourceName: (owner?.displayName || pile.name) + " spread",
    });
  }

  // 5. Opponent hands
  const opponentIds = [
    ...new Set([
      ...Object.keys(gameState.opponentHandCounts),
      ...Object.keys(gameState.opponentRevealedHands),
    ]),
  ];
  for (const id of opponentIds) {
    const player = gameState.players.find((p) => p.id === id);
    entries.push({
      zoneId: `opponent-hand-${id}`,
      sourceName: player?.displayName || id.slice(0, 8),
    });
  }

  // 6. Canvas
  entries.push({ zoneId: "canvas", sourceName: "canvas" });

  return assignLetters(entries);
}

/** Reverse map: letter → zoneId. */
export function buildLetterToZoneMap(
  zoneLetterMap: Map<string, string>
): Map<string, string> {
  const rev = new Map<string, string>();
  for (const [zoneId, letter] of zoneLetterMap) {
    rev.set(letter, zoneId);
  }
  return rev;
}

// ─── Cursor movement ──────────────────────────────────────────────────────────

export function moveCursor(
  pos: CursorPos | null,
  direction: "left" | "right" | "next-zone" | "prev-zone",
  tabStops: TabStop[]
): CursorPos {
  // Arrow navigation excludes menu (menu has no cards).
  // next-zone (Tab) and prev-zone (Shift+Tab) both include menu so it is
  // reachable in both directions of the zone cycle.
  const stops =
    direction === "left" || direction === "right"
      ? tabStops.filter((s) => s.cardIds.length > 0)
      : tabStops;

  if (stops.length === 0) return { zoneId: "menu", index: 0 };

  if (pos === null) {
    const first = stops[0];
    return { zoneId: first.zoneId, index: 0 };
  }

  const currentIdx = stops.findIndex((s) => s.zoneId === pos.zoneId);
  if (currentIdx === -1) {
    return { zoneId: stops[0].zoneId, index: 0 };
  }
  const currentStop = stops[currentIdx];

  if (direction === "left") {
    if (pos.index > 0) {
      return { zoneId: pos.zoneId, index: pos.index - 1 };
    }
    const prevIdx = (currentIdx - 1 + stops.length) % stops.length;
    const prev = stops[prevIdx];
    return { zoneId: prev.zoneId, index: Math.max(0, prev.cardIds.length - 1) };
  }

  if (direction === "right") {
    if (pos.index < (currentStop?.cardIds.length ?? 1) - 1) {
      return { zoneId: pos.zoneId, index: pos.index + 1 };
    }
    const nextIdx = (currentIdx + 1) % stops.length;
    const next = stops[nextIdx];
    return { zoneId: next.zoneId, index: 0 };
  }

  if (direction === "next-zone") {
    const nextIdx = (currentIdx + 1) % stops.length;
    const next = stops[nextIdx];
    return { zoneId: next.zoneId, index: 0 };
  }

  // "prev-zone"
  const prevIdx = (currentIdx - 1 + stops.length) % stops.length;
  const prev = stops[prevIdx];
  return { zoneId: prev.zoneId, index: Math.max(0, prev.cardIds.length - 1) };
}

export function computeCursorCardId(
  pos: CursorPos | null,
  tabStops: TabStop[]
): string | null {
  if (!pos) return null;
  const stop = tabStops.find((s) => s.zoneId === pos.zoneId);
  if (!stop || stop.cardIds.length === 0) return null;
  return stop.cardIds[pos.index] ?? null;
}

// ─── Alt+letter action builder ────────────────────────────────────────────────

export function buildAltShortcutAction(params: {
  zoneId: string;
  selectedIds: Set<string>;
  selectionSource: SelectionSource;
  myPlayerId: string;
}): ClientAction | null {
  const { zoneId, selectedIds, selectionSource, myPlayerId } = params;
  if (selectedIds.size === 0 || !selectionSource) return null;

  const fromZone: "hand" | "pile" | "canvas" =
    selectionSource.zone === "canvas"
      ? "canvas"
      : selectionSource.zone === "pile"
        ? "pile"
        : "hand";
  const fromId =
    selectionSource.zone === "canvas"
      ? "canvas"
      : selectionSource.zone === "pile"
        ? selectionSource.zoneId
        : myPlayerId;

  if (zoneId === "canvas") {
    const cards = [...selectedIds].map((cardId, i) => ({
      cardId,
      x: 300 + i * 20,
      y: 200 + i * 15,
    }));
    return {
      type: "GROUP_PLACE_ON_CANVAS",
      fromZone,
      fromId,
      cards,
    };
  }

  let toZone: "pile" | "hand";
  let toId: string;

  if (zoneId === "hand") {
    toZone = "hand";
    toId = myPlayerId;
  } else if (zoneId.startsWith("opponent-hand-")) {
    toZone = "hand";
    toId = zoneId.slice("opponent-hand-".length);
  } else if (zoneId.startsWith("pile-")) {
    toZone = "pile";
    toId = zoneId.slice("pile-".length);
  } else {
    return null;
  }

  return {
    type: "PLAY_CARD_SET",
    cardIds: [...selectedIds],
    fromZone,
    fromId,
    toZone,
    toId,
  };
}

// ─── Key handlers (exported for testing) ─────────────────────────────────────

export interface KeyDownParams {
  connected: boolean;
  gameState: ClientGameState;
  sendAction: (action: ClientAction) => void;
  cursorPos: CursorPos | null;
  setCursorPos: (pos: CursorPos | null) => void;
  selectedIds: Set<string>;
  setSelectedIds: (
    ids: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  selectionSource: SelectionSource;
  setSelectionSource: (src: SelectionSource) => void;
  setAltHeld: (held: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void;
  tabStops: TabStop[];
  letterToZoneMap: Map<string, string>;
  focusMenuTrigger?: () => void;
  myPlayerId: string;
  cycleSortMode?: () => void;
  lastDealCount: string;
}

export function buildKeyDownHandler(
  params: KeyDownParams
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (
      isEditableTarget(
        e.target as { tagName?: string; isContentEditable?: boolean } | null
      )
    )
      return;

    // Don't intercept keyboard events when focus is inside an open popover or modal.
    // Base UI popovers and dialogs render their popup with role="dialog"; let them
    // manage their own Tab/arrow navigation instead of moving the game cursor.
    if ((e.target as HTMLElement | null)?.closest?.("[role=\"dialog\"]")) return;

    const {
      connected,
      gameState,
      sendAction,
      cursorPos,
      setCursorPos,
      selectedIds,
      setSelectedIds,
      selectionSource,
      setSelectionSource,
      setAltHeld,
      showShortcuts,
      setShowShortcuts,
      tabStops,
      letterToZoneMap,
      focusMenuTrigger,
      myPlayerId,
      cycleSortMode,
      lastDealCount,
    } = params;

    // Track Alt held
    if (e.altKey) setAltHeld(true);

    // ? — toggle shortcuts overlay
    if (e.key === "?" && !e.repeat) {
      e.preventDefault();
      setShowShortcuts((prev) => !prev);
      return;
    }

    // Escape — close overlay first, else clear cursor + selection
    if (e.key === "Escape") {
      if (showShortcuts) {
        setShowShortcuts(false);
        return;
      }
      setCursorPos(null);
      setSelectedIds(new Set());
      setSelectionSource(null);
      return;
    }

    if (!connected) return;

    // Cmd/Ctrl+Z — undo
    if (
      e.key === "z" &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.repeat
    ) {
      if (gameState.canUndo) {
        e.preventDefault();
        sendAction({ type: "UNDO_MOVE" });
      }
      return;
    }

    // Cmd/Ctrl+D — deal or re-deal
    if (e.key === "d" && (e.metaKey || e.ctrlKey) && !e.repeat) {
      e.preventDefault();
      const parsed = parseInt(lastDealCount, 10);
      const cardsPerPlayer = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      if (gameState.phase === "playing") {
        sendAction({ type: "DEAL_NEXT_HAND", cardsPerPlayer });
      } else {
        sendAction({ type: "DEAL_CARDS", cardsPerPlayer });
      }
      return;
    }

    // Alt+letter — move selected cards to zone
    // Use e.code (e.g. "KeyD") to avoid macOS Option key composition (e.g. "∂")
    if (e.altKey && e.code.startsWith("Key") && !e.repeat) {
      const letter = e.code.slice(3).toLowerCase();
      const zoneId = letterToZoneMap.get(letter);
      if (zoneId && selectedIds.size > 0 && selectionSource) {
        e.preventDefault();

        if (zoneId.startsWith("opponent-hand-")) {
          // PLAY_CARD_SET is blocked server-side for cross-player hand moves; use PASS_CARD per card
          const targetPlayerId = zoneId.slice("opponent-hand-".length);
          const fromZone: "hand" | "pile" | "canvas" =
            selectionSource.zone === "canvas" ? "canvas"
            : selectionSource.zone === "pile" ? "pile"
            : "hand";
          const fromId =
            selectionSource.zone === "canvas" ? "canvas"
            : selectionSource.zone === "pile" ? selectionSource.zoneId
            : myPlayerId;
          for (const cardId of selectedIds) {
            sendAction({ type: "PASS_CARD", cardId, targetPlayerId, fromZone, fromId });
          }
          setSelectedIds(new Set());
          setSelectionSource(null);
          setCursorPos(null);
          return;
        }

        const action = buildAltShortcutAction({
          zoneId,
          selectedIds,
          selectionSource,
          myPlayerId,
        });
        if (action) {
          sendAction(action);
          setSelectedIds(new Set());
          setSelectionSource(null);
          setCursorPos(null);
        }
      }
      return;
    }

    // Tab / Shift+Tab — zone navigation (includes menu)
    if (e.key === "Tab" && !e.repeat) {
      e.preventDefault();
      // Blur any DOM-focused element (e.g. a button that got :focus-visible after
      // Tab exited an open popover) so its outline doesn't linger while the game
      // cursor takes over.
      if (typeof document !== "undefined")
        (document.activeElement as HTMLElement)?.blur?.();
      setCursorPos(
        moveCursor(cursorPos, e.shiftKey ? "prev-zone" : "next-zone", tabStops)
      );
      return;
    }

    // ArrowLeft / ArrowRight — card navigation within zone (skips menu)
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.repeat) {
      e.preventDefault();
      if (typeof document !== "undefined")
        (document.activeElement as HTMLElement)?.blur?.();
      setCursorPos(
        moveCursor(cursorPos, e.key === "ArrowLeft" ? "left" : "right", tabStops)
      );
      return;
    }

    // Space — toggle selection or open menu
    if (e.key === " " && !e.repeat && cursorPos !== null) {
      e.preventDefault();

      if (cursorPos.zoneId === "menu") {
        setCursorPos(null);
        focusMenuTrigger?.();
        return;
      }

      const cardId = computeCursorCardId(cursorPos, tabStops);
      if (!cardId) return;

      let newSource: SelectionSource;
      if (cursorPos.zoneId === "hand") {
        newSource = { zone: "hand", zoneId: myPlayerId };
      } else if (cursorPos.zoneId === "canvas") {
        newSource = { zone: "canvas", zoneId: "canvas" };
      } else {
        newSource = {
          zone: "pile",
          zoneId: cursorPos.zoneId.slice("pile-".length),
        };
      }

      if (
        selectionSource !== null &&
        !(
          selectionSource.zone === newSource.zone &&
          selectionSource.zoneId === newSource.zoneId
        )
      ) {
        setSelectionSource(newSource);
        setSelectedIds(new Set([cardId]));
        return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
      if (selectionSource === null) setSelectionSource(newSource);
      return;
    }

    // Cmd/Ctrl+A — select all in cursor zone
    if (
      e.key === "a" &&
      (e.metaKey || e.ctrlKey) &&
      !e.repeat &&
      cursorPos !== null
    ) {
      e.preventDefault();
      const stop = tabStops.find((s) => s.zoneId === cursorPos.zoneId);
      if (!stop || stop.cardIds.length === 0) return;

      let newSource: SelectionSource;
      let allIds: string[];

      if (cursorPos.zoneId === "hand") {
        newSource = { zone: "hand", zoneId: myPlayerId };
        allIds = stop.cardIds;
      } else if (cursorPos.zoneId === "canvas") {
        newSource = { zone: "canvas", zoneId: "canvas" };
        allIds = stop.cardIds;
      } else {
        // For pile/spread zones the tab stop only tracks the top card (for
        // cursor positioning). Look up all client-visible card IDs from the
        // actual pile so Cmd+A selects every card the player can see.
        const pileId = cursorPos.zoneId.slice("pile-".length);
        const pile = gameState.piles.find((p) => p.id === pileId);
        const visibleCards = pile?.cards.filter((c): c is Card => "id" in c) ?? [];
        allIds = visibleCards.length > 0 ? visibleCards.map((c) => c.id) : stop.cardIds;
        const hasMaskedCards = pile?.cards.some((c) => !("id" in c)) ?? false;
        newSource = { zone: "pile", zoneId: pileId, ...(hasMaskedCards && { hasMaskedCards }) };
      }

      setSelectedIds(new Set(allIds));
      setSelectionSource(newSource);
      return;
    }

    // F — toggle pile / spread zone face-up / face-down (same as zone face button)
    if (e.key === "f" && !e.repeat && cursorPos !== null) {
      if (!cursorPos.zoneId.startsWith("pile-")) return;
      const pileId = cursorPos.zoneId.slice("pile-".length);
      const pile = gameState.piles.find((p) => p.id === pileId);
      if (!pile) return;
      e.preventDefault();
      sendAction({ type: "SET_PILE_FACE", pileId, faceUp: !pile.faceUp });
      return;
    }

    // S — shuffle pile (non-spread) or cycle hand sort
    if (e.key === "s" && !e.repeat && cursorPos !== null) {
      if (cursorPos.zoneId === "hand") {
        e.preventDefault();
        cycleSortMode?.();
        return;
      }
      if (cursorPos.zoneId.startsWith("pile-")) {
        const pileId = cursorPos.zoneId.slice("pile-".length);
        const pile = gameState.piles.find((p) => p.id === pileId);
        if (pile && (pile.region ?? "pile") !== "spread") {
          e.preventDefault();
          sendAction({ type: "SHUFFLE_PILE", pileId });
        }
        return;
      }
    }

  };
}

export function buildKeyUpHandler(params: {
  setAltHeld: (held: boolean) => void;
}): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === "Alt") {
      params.setAltHeld(false);
    }
  };
}
