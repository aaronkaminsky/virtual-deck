import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision, defaultDropAnimation, useSensors, useSensor, PointerSensor, TouchSensor, MeasuringStrategy } from '@dnd-kit/core';
import type { CollisionDetection, DragStartEvent, DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import type { Card, ClientAction, ClientGameState, LastMoveHighlight, SelectionSource, TokenId } from '@/shared/types';
import { BoardView } from './BoardView';
import { CardOverlay } from './CardOverlay';
import { CanvasPileVisual } from './CanvasPileZone';
import { TokenDisc } from './TokenDisc';
import { coversMajority, getCardDimensions, STACK_SHADOW } from '@/lib/canvas-utils';
import { computeStackOrigin, resolvePileDrop } from '@/lib/canvasPileDrag';
import { resolveTokenDrop, TOKEN_SIZE } from '@/lib/tokenDrag';
import { resolvePileDropAction, isFlapEligibleDrag, type InsertPosition } from '@/lib/pileDrop';
import {
  computeTabStops,
  computeZoneLetterMap,
  buildLetterToZoneMap,
  computeCursorCardId,
  type CursorPos,
} from '@/lib/keyboardUtils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { type SortMode, SORT_CYCLE, getHandOrderSyncAction } from './HandZone';

const customCollision: CollisionDetection = (args) => {
  const tokenData = args.active.data.current as { type?: string } | undefined;
  if (tokenData?.type === 'token') {
    const trayContainers = args.droppableContainers.filter(c => String(c.id) === 'token-tray');
    const trayCollisions = pointerWithin({ ...args, droppableContainers: trayContainers });
    if (trayCollisions.length > 0) return trayCollisions;
    const handContainers = args.droppableContainers.filter(
      c => String(c.id) === 'hand' || String(c.id).startsWith('opponent-hand-')
    );
    const handCollisions = pointerWithin({ ...args, droppableContainers: handContainers });
    if (handCollisions.length > 0) return handCollisions;
    const tokenCanvasContainers = args.droppableContainers.filter(c => String(c.id) === 'canvas');
    return pointerWithin({ ...args, droppableContainers: tokenCanvasContainers });
  }
  const zoneContainers = args.droppableContainers.filter(
    (c) => String(c.id) === 'hand' || String(c.id).startsWith('opponent-hand-')
  );
  const pileContainers = args.droppableContainers.filter(
    (c) => String(c.id).startsWith('pile-')
  );
  const cardContainers = args.droppableContainers.filter(
    (c) => String(c.id) !== 'hand' && !String(c.id).startsWith('opponent-hand-') && !String(c.id).startsWith('pile-')
  );

  const zoneCollisions = pointerWithin({ ...args, droppableContainers: zoneContainers });

  if (zoneCollisions.length > 0) {
    // Opponent-hand zone always wins — card is being passed to another player.
    if (String(zoneCollisions[0].id).startsWith('opponent-hand-')) return zoneCollisions;
    // Inside the hand strip: prefer card-to-card sortable reorder only for intra-hand drags.
    // Cross-zone drags (e.g. spread→hand) must resolve to the 'hand' zone so overData.toZone
    // is defined; closestCenter could return __sentinel-hand__ which has no toZone data.
    const activeData = args.active.data.current as { fromZone?: string } | undefined;
    if (activeData?.fromZone === 'hand') {
      const cardCollisions = closestCenter({ ...args, droppableContainers: cardContainers });
      return cardCollisions.length > 0 ? cardCollisions : zoneCollisions;
    }
    return zoneCollisions;
  }

  // Pointer is outside all zones — pile drops only register when the pointer is inside the pile rect.
  const pileCollisions = pointerWithin({ ...args, droppableContainers: pileContainers });
  if (pileCollisions.length > 0) {
    // For intra-pile reorder only: prefer card-level closestCenter so SpreadZone.useDndMonitor
    // receives a card ID in over.id (not 'pile-{id}') and can compute the correct insert position.
    // Cross-zone drags (hand→pile, pile-A→pile-B) stay at pile-droppable resolution to avoid
    // closestCenter picking hand cards or cards from the source pile as the collision target.
    const activeData = args.active.data.current as { fromZone?: string; fromId?: string } | undefined;
    const isIntraPileDrag = activeData?.fromZone === 'pile' &&
      pileCollisions.some(c => String(c.id) === `pile-${activeData?.fromId}`);
    if (isIntraPileDrag) {
      const cardCollisions = closestCenter({ ...args, droppableContainers: cardContainers });
      return cardCollisions.length > 0 ? cardCollisions : pileCollisions;
    }
    return pileCollisions;
  }
  // D-08: canvas is the FINAL fallback — after zone and pile checks both return empty
  const canvasContainers = args.droppableContainers.filter(
    (c) => String(c.id) === 'canvas'
  );
  const canvasCollisions = pointerWithin({ ...args, droppableContainers: canvasContainers });
  if (canvasCollisions.length > 0) return canvasCollisions;
  return [];
};

interface BoardDragLayerProps {
  gameState: ClientGameState;
  playerId: string;
  roomId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  setDragging: (d: boolean) => void;
  shufflingPileIds: Map<string, "normal" | "flourish">;
  highlightedMove: LastMoveHighlight | null;
  konamiActive: boolean;
}

export function BoardDragLayer({ gameState, playerId, roomId, connected, sendAction, setDragging, shufflingPileIds, highlightedMove, konamiActive }: BoardDragLayerProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activePileId, setActivePileId] = useState<string | null>(null);
  const activePileIdRef = useRef<string | null>(null);
  const [activeTokenId, setActiveTokenId] = useState<TokenId | null>(null);
  const activeTokenIdRef = useRef<TokenId | null>(null);
  const activeDragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [dragCoversSomeCard, setDragCoversSomeCard] = useState(false);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<CursorPos | null>(null);
  const [altHeld, setAltHeld] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
  const passengerOffsetsRef = useRef<Record<string, { offsetX: number; offsetY: number }>>({});
  const dropSuccessRef = useRef(false);
  const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [sortMode, setSortMode] = useState<SortMode>('original');
  const [lastDealCount, setLastDealCount] = useState('1');

  const handleToggleSelect = (id: string, zone: 'hand' | 'pile', zoneId: string) => {
    const isDifferentZone = selectionSource !== null &&
      (selectionSource.zone !== zone || selectionSource.zoneId !== zoneId);

    if (isDifferentZone) {
      setSelectionSource({ zone, zoneId });
      setSelectedIds(new Set([id]));
      return;
    }

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (selectionSource === null) setSelectionSource({ zone, zoneId });
    // selectionSource-on-empty-Set behavior (intentional, per RESEARCH.md Pattern 2 safe variant):
    // When selectedIds becomes empty via deselection, selectionSource intentionally stays set to
    // the current zone (not cleared). The badge won't show (size < 2). Clears on Escape or when
    // user clicks in a different zone. This is the chosen approach — no stale badge visible,
    // no risk of losing zone context on momentary zero-selection state.
  };

  const handleSelectAll = (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => {
    if (cardIds.length === 0) return; // guard against empty-zone clicks (defense in depth)
    // Toggle: clicking Select All on the already-selected zone clears the selection
    if (selectionSource?.zone === zone && selectionSource?.zoneId === zoneId) {
      setSelectedIds(new Set());
      setSelectionSource(null);
      return;
    }
    setSelectedIds(new Set(cardIds));
    setSelectionSource({ zone, zoneId, hasMaskedCards });
  };

  const handleToggleSelectCanvas = (id: string) => {
    // Zone-exclusive: if currently in hand/pile zone, switch to canvas and start fresh selection
    if (selectionSource !== null && selectionSource.zone !== 'canvas') {
      setSelectionSource({ zone: 'canvas', zoneId: 'canvas' });
      setSelectedIds(new Set([id]));
      return;
    }
    // Already canvas or null: toggle the card
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) {
        // Defer clearing selectionSource — must set after selectedIds resolves
        setSelectionSource(null);
      } else if (selectionSource === null) {
        setSelectionSource({ zone: 'canvas', zoneId: 'canvas' });
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    setSelectionSource(null);
  };

  const handleSelectAllCanvas = () => {
    if (selectionSource?.zone === 'canvas') {
      setSelectedIds(new Set());
      setSelectionSource(null);
      return;
    }
    const ids = gameState.canvasCards.map(cc => cc.card.id);
    if (ids.length === 0) return;
    setSelectedIds(new Set(ids));
    setSelectionSource({ zone: 'canvas', zoneId: 'canvas' });
  };

  const handleDiscardAllCanvas = () => {
    const ids = gameState.canvasCards.map(cc => cc.card.id);
    if (ids.length === 0) return;
    setSelectedIds(new Set());
    setSelectionSource(null);
    sendAction({
      type: 'PLAY_CARD_SET',
      cardIds: ids,
      fromZone: 'canvas',
      fromId: 'canvas',
      toZone: 'pile',
      toId: 'discard',
    });
  };

  const handleStackSelected = () => {
    if (selectionSource?.zone !== 'canvas' || selectedIds.size < 2) return;
    const entries = gameState.canvasCards.filter(cc => selectedIds.has(cc.card.id));
    if (entries.length < 2) return; // stale selection — cards left the canvas
    const { x, y } = computeStackOrigin(entries);
    setSelectedIds(new Set());
    setSelectionSource(null);
    sendAction({
      type: 'CREATE_CANVAS_PILE',
      cardIds: entries.map(cc => cc.card.id),
      x,
      y,
    });
  };

  const groupIds = useMemo(() => {
    if (activeCard === null) return new Set<string>();
    return new Set([...selectedIds, activeCard.id]);
  }, [activeCard, selectedIds]);

  const menuFocused = cursorPos?.zoneId === 'menu';
  const tabStops = useMemo(() => computeTabStops(gameState), [gameState]);
  const zoneLetterMap = useMemo(
    () => computeZoneLetterMap(gameState, playerId),
    [gameState, playerId]
  );
  const letterToZoneMap = useMemo(
    () => buildLetterToZoneMap(zoneLetterMap),
    [zoneLetterMap]
  );
  const cursorCardId = useMemo(
    () => computeCursorCardId(cursorPos, tabStops),
    [cursorPos, tabStops]
  );
  const focusMenuTrigger = useCallback(() => {
    menuTriggerRef.current?.click();
  }, []);

  const handleSetSortMode = useCallback((mode: SortMode) => {
    setSortMode(mode);
    if (gameState.myHandRevealed) {
      const syncAction = getHandOrderSyncAction(mode, gameState.myHand);
      if (syncAction) sendAction(syncAction);
    }
  }, [gameState.myHandRevealed, gameState.myHand, sendAction]);

  const cycleSortMode = useCallback(() => {
    const next = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
    handleSetSortMode(next);
  }, [sortMode, handleSetSortMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  useKeyboardShortcuts({
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
    focusMenuTrigger,
    cycleSortMode,
    lastDealCount,
  });

  // Clear stale selection when selected cards are no longer in their source zone
  // (e.g. after RESET_TABLE, deal, or any server action that moves cards out of the selection zone).
  useEffect(() => {
    if (selectedIds.size === 0 || !selectionSource) return;
    let sourceCardIds: Set<string>;
    if (selectionSource.zone === 'hand') {
      sourceCardIds = new Set(gameState.myHand.map(c => c.id));
    } else if (selectionSource.zone === 'canvas') {
      sourceCardIds = new Set(gameState.canvasCards.map(cc => cc.card.id));
    } else {
      const pile = gameState.piles.find(p => p.id === selectionSource.zoneId);
      sourceCardIds = new Set(
        pile ? pile.cards.filter((c): c is Card => 'id' in c).map(c => c.id) : []
      );
    }
    if ([...selectedIds].some(id => !sourceCardIds.has(id))) {
      setSelectedIds(new Set());
      setSelectionSource(null);
    }
  }, [gameState.myHand, gameState.piles, gameState.canvasCards, selectedIds, selectionSource]);

  function handleDragStart(event: DragStartEvent) {
    // Cancel any in-flight snap-back timer from a previous failed drop
    if (snapBackTimerRef.current !== null) {
      clearTimeout(snapBackTimerRef.current);
      snapBackTimerRef.current = null;
    }
    const maybeToken = event.active.data.current as { type?: string; tokenId?: TokenId } | undefined;
    if (maybeToken?.type === 'token' && maybeToken.tokenId) {
      activeTokenIdRef.current = maybeToken.tokenId;
      setActiveTokenId(maybeToken.tokenId);
      setActiveCard(null);
      setDragging(true);
      return;
    }
    const maybePile = event.active.data.current as { type?: string; pileId?: string } | undefined;
    if (maybePile?.type === 'canvas-pile' && maybePile.pileId) {
      activePileIdRef.current = maybePile.pileId;
      setActivePileId(maybePile.pileId);
      setActiveCard(null);
      setDragging(true);
      return;
    }
    const data = event.active.data.current as { card?: Card; fromZone?: string; fromId?: string; toId?: string } | undefined;
    if (!data?.card || !data.fromZone || !data.fromId) return; // guard against unexpected drag sources
    dragDataRef.current = data as { card: Card; fromZone: string; fromId: string };
    // D-04 + D-01: clear selection when dragging an unselected card; preserve when dragging a selected card.
    // selectedIds.has check is sufficient for both cases — no zone-based guard needed.
    if (!selectedIds.has(String(event.active.id))) {
      setSelectedIds(new Set());
      setSelectionSource(null);
    }
    setActiveCard(data.card);
    setDragging(true);
    // Capture canvas-card origin for drag-time shadow check (D-05, D-06, RESEARCH Pitfall 1)
    if (data.fromZone === 'canvas') {
      const existing = gameState.canvasCards.find(cc => cc.card.id === dragDataRef.current!.card.id);
      activeDragOriginRef.current = existing ? { x: existing.x, y: existing.y } : null;
    } else {
      activeDragOriginRef.current = null;
    }
    dragDeltaRef.current = { x: 0, y: 0 };

    // DOM offset capture for passenger cards (D-11)
    const activeIdStr = String(event.active.id);
    if (data.fromZone !== 'canvas' && selectedIds.size > 0 && selectedIds.has(activeIdStr)) {
      // Hand/spread source group drag: capture offsets relative to the drag handle DOM element.
      const handleEl = document.querySelector<HTMLElement>(`[data-card-id="${activeIdStr}"]`);
      const handleRect = handleEl?.getBoundingClientRect();
      if (handleRect) {
        const offsets: Record<string, { offsetX: number; offsetY: number }> = {};
        for (const cardId of selectedIds) {
          const el = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
          if (el) {
            const r = el.getBoundingClientRect();
            offsets[cardId] = { offsetX: r.left - handleRect.left, offsetY: r.top - handleRect.top };
          }
        }
        passengerOffsetsRef.current = offsets;
      } else {
        passengerOffsetsRef.current = {};
      }
    } else {
      // Canvas source or single-card drag: offsets not needed; clear for safety.
      passengerOffsetsRef.current = {};
    }

    // Initialize dragDelta so passenger ghosts render at resting positions immediately.
    setDragDelta({ x: 0, y: 0 });
  }

  function handleDragMove(event: DragMoveEvent) {
    // Update dragDelta state for passenger ghost rendering (dual ref+state pattern per RESEARCH Pitfall 1).
    // Must update unconditionally so cross-zone group drags also get delta (not just canvas→canvas).
    setDragDelta({ x: event.delta.x, y: event.delta.y });
    if (dragDataRef.current?.fromZone !== 'canvas') return;
    if (activeDragOriginRef.current === null) return;
    dragDeltaRef.current = { x: event.delta.x, y: event.delta.y };
    const origin = activeDragOriginRef.current;
    const draggedPos = { x: origin.x + event.delta.x, y: origin.y + event.delta.y };
    const draggedId = dragDataRef.current.card.id;
    const nowCovers = gameState.canvasCards.some(
      other => other.card.id !== draggedId && coversMajority(draggedPos, other)
    );
    if (nowCovers !== dragCoversSomeCard) setDragCoversSomeCard(nowCovers);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragCoversSomeCard(false);
    activeDragOriginRef.current = null;

    // TOKEN DRAG BRANCH (1035): place on canvas, anchor to a player, or return to tray.
    if (activeTokenIdRef.current !== null) {
      const tokenId = activeTokenIdRef.current;
      activeTokenIdRef.current = null;
      setActiveTokenId(null);
      setDragging(false);
      dropSuccessRef.current = true; // token ghost clears immediately; skip snap-back animation
      const token = gameState.tokens.find(t => t.id === tokenId);
      if (!token) return;
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      let base: { x: number; y: number };
      if (token.placement.kind === 'canvas') {
        // canvas → canvas: stored position + delta (MOVE_CANVAS_PILE pattern)
        base = { x: token.placement.x + event.delta.x, y: token.placement.y + event.delta.y };
      } else {
        // tray or player source: only used if the drop resolves to canvas;
        // computed from pointer position relative to the inner canvas (PLACE_ON_CANVAS pattern).
        const activator = event.activatorEvent as PointerEvent;
        base = {
          x: activator.clientX + event.delta.x - (canvasBounds?.left ?? 0) - TOKEN_SIZE / 2,
          y: activator.clientY + event.delta.y - (canvasBounds?.top ?? 0) - TOKEN_SIZE / 2,
        };
      }
      const overData = event.over?.data.current as { toId?: string } | undefined;
      const resolution = resolveTokenDrop({
        overId: event.over ? String(event.over.id) : null,
        overToId: overData?.toId ?? null,
        fromTray: token.placement.kind === 'tray',
        base,
        canvasW: canvasBounds?.width ?? 0,
        canvasH: canvasBounds?.height ?? 0,
        tokenSize: TOKEN_SIZE,
      });
      if (resolution.kind === 'place') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, to: { kind: 'canvas', x: resolution.x, y: resolution.y } });
      } else if (resolution.kind === 'anchor') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, to: { kind: 'player', playerId: resolution.playerId } });
      } else if (resolution.kind === 'return') {
        sendAction({ type: 'MOVE_TOKEN', tokenId, to: { kind: 'tray' } });
      }
      return;
    }

    // WHOLE-PILE DRAG BRANCH: reposition on canvas, merge into a pile/spread, or empty into own hand.
    if (activePileIdRef.current !== null) {
      const pileId = activePileIdRef.current;
      activePileIdRef.current = null;
      setActivePileId(null);
      setDragging(false);
      dropSuccessRef.current = true; // pile ghost clears immediately; skip snap-back animation
      const pile = gameState.piles.find(p => p.id === pileId);
      if (!pile?.pos) return;
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const { w: CARD_W, h: CARD_H } = getCardDimensions();
      const resolution = resolvePileDrop({
        pileId,
        pos: { x: pile.pos.x, y: pile.pos.y },
        delta: { x: event.delta.x, y: event.delta.y },
        overId: event.over ? String(event.over.id) : null,
        overData: event.over?.data.current as { toZone?: string; toId?: string } | undefined,
        canvasW: canvasBounds?.width ?? 0,
        canvasH: canvasBounds?.height ?? 0,
        cardW: CARD_W,
        cardH: CARD_H,
      });
      if (resolution.kind === 'reposition') {
        sendAction({ type: 'MOVE_CANVAS_PILE', pileId, x: resolution.x, y: resolution.y });
      } else if (resolution.kind === 'mergeIntoPile') {
        sendAction({ type: 'MOVE_ALL_PILE_CARDS', fromId: pileId, toId: resolution.toId });
      } else if (resolution.kind === 'moveToHand') {
        sendAction({ type: 'MOVE_ALL_PILE_CARDS', fromId: pileId, toId: playerId, toZone: 'hand' });
      }
      return;
    }

    // CANVAS BRANCH: drop on canvas → GROUP_PLACE_ON_CANVAS or PLACE_ON_CANVAS (D-08, D-15)
    if (event.over?.id === 'canvas' && dragDataRef.current) {
      const { card, fromZone, fromId } = dragDataRef.current;
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const canvasW = canvasBounds?.width ?? 0;
      const canvasH = canvasBounds?.height ?? 0;
      const { w: CARD_W, h: CARD_H } = getCardDimensions();

      // GROUP PATH: 2+ selected cards and drag handle is in the selection (D-08, D-13, D-14, D-15)
      if (canvasBounds && selectedIds.size >= 2 && selectedIds.has(String(event.active.id))) {
        const activeIdStr = String(event.active.id);

        // Compute handle drop coordinates (unclamped) — same formula as single-card path below.
        let handleDropX: number;
        let handleDropY: number;
        if (fromZone === 'canvas') {
          const existing = gameState.canvasCards.find(c => c.card.id === card.id);
          handleDropX = (existing?.x ?? 0) + event.delta.x;
          handleDropY = (existing?.y ?? 0) + event.delta.y;
        } else {
          const activator = event.activatorEvent as PointerEvent;
          const pointerFinalX = activator.clientX + event.delta.x;
          const pointerFinalY = activator.clientY + event.delta.y;
          handleDropX = pointerFinalX - canvasBounds.left - CARD_W / 2;
          handleDropY = pointerFinalY - canvasBounds.top - CARD_H / 2;
        }

        // Build the cards array for all selected cards (D-11).
        const cards: Array<{ cardId: string; x: number; y: number }> = [];
        for (const cardId of selectedIds) {
          if (fromZone === 'canvas') {
            const cc = gameState.canvasCards.find(c => c.card.id === cardId);
            if (cc) {
              cards.push({ cardId, x: cc.x + event.delta.x, y: cc.y + event.delta.y });
            }
          } else {
            // hand/pile source: use DOM-captured offsets (captured at drag start)
            const offsets = passengerOffsetsRef.current[cardId] ?? { offsetX: 0, offsetY: 0 };
            // Handle card itself uses offsetX:0, offsetY:0 (always the anchor)
            const isHandle = cardId === activeIdStr;
            const ox = isHandle ? 0 : offsets.offsetX;
            const oy = isHandle ? 0 : offsets.offsetY;
            cards.push({ cardId, x: handleDropX + ox, y: handleDropY + oy });
          }
        }

        // WR-02: stale-selection guard — if canvas source cards are no longer present,
        // cards.length will be 0 (or shorter than expected). Snap back silently rather
        // than dispatching GROUP_PLACE_ON_CANVAS with an empty array.
        if (fromZone === 'canvas' && cards.length === 0) {
          setActiveCard(null);
          setDragging(false);
          setSelectedIds(new Set());
          setSelectionSource(null);
          setDragDelta(null);
          passengerOffsetsRef.current = {};
          dragDataRef.current = null;
          return;
        }

        // All-or-nothing bounds check (D-13, D-14): every card must be within canvas bounds.
        const allInBounds = cards.every(({ x, y }) =>
          x >= 0 && x <= Math.max(0, canvasW - CARD_W) &&
          y >= 0 && y <= Math.max(0, canvasH - CARD_H)
        );

        if (!allInBounds) {
          // D-15: silent snap-back — do not dispatch, clear all state.
          setActiveCard(null);
          setDragging(false);
          setSelectedIds(new Set());
          setSelectionSource(null);
          setDragDelta(null);
          passengerOffsetsRef.current = {};
          dragDataRef.current = null;
          return;
        }

        // All in bounds: dispatch GROUP_PLACE_ON_CANVAS.
        dropSuccessRef.current = true;
        setActiveCard(null);
        setDragging(false);
        setSelectedIds(new Set());
        setSelectionSource(null);
        setDragDelta(null);
        passengerOffsetsRef.current = {};
        sendAction({
          type: 'GROUP_PLACE_ON_CANVAS',
          fromZone: fromZone as 'hand' | 'pile' | 'canvas',
          fromId,
          cards,
        });
        dragDataRef.current = null;
        return;
      }

      // SINGLE-CARD PATH: fewer than 2 selected, or active card not in selection.
      let newX: number;
      let newY: number;
      if (fromZone === 'canvas') {
        // canvas → canvas: baseX/Y from stored position, apply delta (D-12, D-15)
        const existing = gameState.canvasCards.find(c => c.card.id === card.id);
        const baseX = existing?.x ?? 0;
        const baseY = existing?.y ?? 0;
        newX = Math.max(0, Math.min(baseX + event.delta.x, Math.max(0, canvasW - CARD_W)));
        newY = Math.max(0, Math.min(baseY + event.delta.y, Math.max(0, canvasH - CARD_H)));
      } else {
        // hand/pile → canvas: pointer coords minus the inner canvas bounds.
        // getBoundingClientRect() on the translated inner div already encodes scroll offset,
        // so no explicit scroll addend is needed (adding it would double-count).
        const activator = event.activatorEvent as PointerEvent;
        const pointerFinalX = activator.clientX + event.delta.x;
        const pointerFinalY = activator.clientY + event.delta.y;
        const baseX = pointerFinalX - (canvasBounds?.left ?? 0) - CARD_W / 2;
        const baseY = pointerFinalY - (canvasBounds?.top ?? 0) - CARD_H / 2;
        newX = Math.max(0, Math.min(baseX, Math.max(0, canvasW - CARD_W)));
        newY = Math.max(0, Math.min(baseY, Math.max(0, canvasH - CARD_H)));
      }

      dropSuccessRef.current = true;
      setActiveCard(null);
      setDragging(false);
      setSelectedIds(new Set());
      setSelectionSource(null);
      setDragDelta(null);
      passengerOffsetsRef.current = {};
      sendAction({
        type: 'PLACE_ON_CANVAS',
        cardId: card.id,
        fromZone: fromZone as 'hand' | 'pile' | 'canvas',
        fromId,
        x: newX,
        y: newY,
      });
      dragDataRef.current = null;
      return;
    }

    const overData = event.over?.data.current as { toZone: string; toId: string; insertPosition?: InsertPosition } | undefined;
    const activeId = String(event.active.id);
    // D-02 (Phase 21): compute intra-zone reorder flags ONCE, before any branch.
    const fromZoneAtEnd = dragDataRef.current?.fromZone;
    const fromIdAtEnd = dragDataRef.current?.fromId;
    const isIntraSpreadReorder = fromZoneAtEnd === 'pile' && fromIdAtEnd === overData?.toId;
    const isIntraHandReorder = fromZoneAtEnd === 'hand' && overData?.toZone === 'hand';
    const hasMaskedCardsInSource = selectionSource !== null && selectionSource.zone !== 'canvas' && selectionSource.hasMaskedCards === true;
    const isMultiCardSet =
      (selectedIds.size > 1 || hasMaskedCardsInSource) &&
      selectedIds.has(activeId) &&
      !!event.over &&
      (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
      !isIntraSpreadReorder &&
      !isIntraHandReorder;

    if (isMultiCardSet) {
      setActiveCard(null);
      setSelectedIds(new Set());
      setSelectionSource(null);
      setDragDelta(null);
      passengerOffsetsRef.current = {};
      setDragging(false);
      dropSuccessRef.current = true;
      dragDataRef.current = null;
      if (hasMaskedCardsInSource) {
        // Face-down pile: client doesn't have all card IDs — server moves the whole pile
        sendAction({
          type: 'MOVE_ALL_PILE_CARDS',
          fromId: selectionSource.zoneId,
          toId: overData!.toId,
        });
      } else {
        const setFromZone: 'hand' | 'pile' | 'canvas' =
          selectionSource?.zone === 'canvas' ? 'canvas'
          : selectionSource?.zone === 'pile' ? 'pile'
          : 'hand';
        const setFromId =
          selectionSource?.zone === 'canvas' ? 'canvas'
          : selectionSource?.zone === 'pile' ? selectionSource.zoneId
          : playerId;
        // Spread zones always insert at top (GAP-02) — mirror resolvePileDropAction's
        // single-card guard so a flap position can't sneak through on the set path.
        const targetIsSpread = gameState.piles.find(p => p.id === overData!.toId)?.region === 'spread';
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: setFromZone,
          fromId: setFromId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
          // 1039: flap drops carry bottom/random; undefined (plain drop / hand dest / spread) = top
          insertPosition: targetIsSpread ? undefined : overData!.insertPosition,
        });
      }
      return;
    }

    const isHandReorder = dragDataRef.current?.fromZone === 'hand' && overData?.toZone === 'hand' && event.over?.id !== 'hand';
    const isHandMissed = dragDataRef.current?.fromZone === 'hand' && event.over?.id === 'hand';
    const isPassCard = !!(overData?.toZone === 'opponent-hand' && dragDataRef.current);
    const isSuccess = !!(event.over && dragDataRef.current && overData?.toZone && !isHandReorder && !isHandMissed && !isPassCard);
    dropSuccessRef.current = isSuccess || isHandReorder || isPassCard;
    setDragging(false);

    if (isPassCard) {
      setActiveCard(null);
      setDragDelta(null);
      passengerOffsetsRef.current = {};
      const { card, fromZone, fromId } = dragDataRef.current!;
      sendAction({
        type: 'PASS_CARD',
        cardId: card.id,
        targetPlayerId: overData!.toId,
        fromZone: fromZone as 'hand' | 'pile' | 'canvas',
        fromId,
      });
    } else if (isSuccess) {
      // D-02 (Phase 21): preserve selection across intra-zone reorder; clear for all other successful drops.
      if (!isIntraSpreadReorder && !isIntraHandReorder) {
        setSelectedIds(new Set());
        setSelectionSource(null);
        setDragDelta(null);
        passengerOffsetsRef.current = {};
      }
      setActiveCard(null);
      const { card, fromZone, fromId } = dragDataRef.current!;
      const toZone = overData!.toZone as 'hand' | 'pile';
      const toId = overData!.toId;

      if (toZone === 'pile') {
        // 1039: plain drop = top immediately; drag-over flaps supply bottom/random via overData.
        const action = resolvePileDropAction({
          cardId: card.id,
          fromZone: fromZone as 'hand' | 'pile' | 'canvas',
          fromId,
          toId,
          targetPile: gameState.piles.find(p => p.id === toId),
          insertPosition: overData!.insertPosition,
          isIntraSpreadReorder,
        });
        if (action) sendAction(action);
      } else {
        // Hand drop: send immediately, no position dialog needed
        sendAction({
          type: 'MOVE_CARD',
          cardId: card.id,
          fromZone: fromZone as 'hand' | 'pile' | 'canvas',
          fromId,
          toZone,
          toId,
        });
      }
    } else if (isHandReorder) {
      // Reorder handled by useDndMonitor in HandZone — just clear the overlay
      setActiveCard(null);
    }
    // Failed drop: keep activeCard set so overlay has content during snap-back animation.
    // defaultDropAnimation's sideEffects hide the source card while the overlay animates.
    // Clear after animation completes. Selection and passenger offsets clear immediately (D-06).
    else {
      setSelectedIds(new Set());
      setSelectionSource(null);
      setDragDelta(null);
      passengerOffsetsRef.current = {};
      snapBackTimerRef.current = setTimeout(() => {
        setActiveCard(null);
        snapBackTimerRef.current = null;
      }, defaultDropAnimation.duration + 50);
    }

    dragDataRef.current = null;
  }

  function handleDragCancel() {
    activePileIdRef.current = null;
    setActivePileId(null);
    activeTokenIdRef.current = null;
    setActiveTokenId(null);
    dropSuccessRef.current = false;
    setDragging(false);
    dragDataRef.current = null;
    setDragCoversSomeCard(false);
    setDragDelta(null);
    passengerOffsetsRef.current = {};
    activeDragOriginRef.current = null;
    snapBackTimerRef.current = setTimeout(() => {
      setActiveCard(null);
      snapBackTimerRef.current = null;
    }, defaultDropAnimation.duration + 50);
  }

  const activePile = activePileId ? gameState.piles.find(p => p.id === activePileId) ?? null : null;

  const flapDragActive = isFlapEligibleDrag({
    activeCardId: activeCard?.id ?? null,
    activePileId,
    selectedIds,
    selectionSource,
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollision}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} shufflingPileIds={shufflingPileIds} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} selectionSource={selectionSource} canvasRef={canvasRef} onToggleSelectCanvas={handleToggleSelectCanvas} onSelectAllCanvas={handleSelectAllCanvas} onDiscardAllCanvas={handleDiscardAllCanvas} onStackSelected={handleStackSelected} onDeselectAll={handleDeselectAll} groupIds={groupIds} activeCardId={activeCard?.id ?? null} dragDelta={dragDelta} highlightedMove={highlightedMove} cursorCardId={cursorCardId} altHeld={altHeld} zoneLetterMap={zoneLetterMap} menuFocused={menuFocused} menuTriggerRef={menuTriggerRef} showShortcuts={showShortcuts} onCloseShortcuts={() => setShowShortcuts(false)} sortMode={sortMode} setSortMode={handleSetSortMode} lastDealCount={lastDealCount} onDealCountChange={setLastDealCount} setCursorPos={setCursorPos} konamiActive={konamiActive} flapDragActive={flapDragActive} />
        {createPortal(
          <DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
            {/* D-13: DragOverlay 0.5 opacity + scale 1.05 — applied globally for canvas drags; existing zone drags inherit the same */}
            {/* Shadow wrapper is outside the opacity div so it renders at full opacity (CSS opacity composites box-shadow) */}
            {activeTokenId ? (
              <div style={{ opacity: 0.7 }}>
                <TokenDisc tokenId={activeTokenId} />
              </div>
            ) : activePile ? (
              <div style={{ opacity: 0.7 }}>
                <CanvasPileVisual pile={activePile} />
              </div>
            ) : activeCard ? (
              <div style={{ boxShadow: dragCoversSomeCard ? STACK_SHADOW : undefined, borderRadius: dragCoversSomeCard ? 6 : undefined }}>
                <div style={{ opacity: 0.5, transform: 'scale(1.05)' }}>
                  <CardOverlay card={activeCard} />
                </div>
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
