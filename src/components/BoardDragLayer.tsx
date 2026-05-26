import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision, defaultDropAnimation, useSensors, useSensor, PointerSensor, TouchSensor, MeasuringStrategy } from '@dnd-kit/core';
import type { CollisionDetection, DragStartEvent, DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import { Dialog } from '@base-ui/react/dialog';
import type { Card, ClientAction, ClientGameState, SelectionSource } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { BoardView } from './BoardView';
import { CardOverlay } from './CardOverlay';
import { coversMajority, getCardDimensions, STACK_SHADOW } from '@/lib/canvas-utils';

const customCollision: CollisionDetection = (args) => {
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
  shufflingPileIds: Set<string>;
}

type PendingMove = {
  card: Card;
  fromZone: 'hand' | 'pile' | 'canvas'; // D-11: widened to support canvas → pile dialog path
  fromId: string;
  toZone: 'hand' | 'pile';
  toId: string;
};

export function BoardDragLayer({ gameState, playerId, roomId, connected, sendAction, setDragging, shufflingPileIds }: BoardDragLayerProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const activeDragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [dragCoversSomeCard, setDragCoversSomeCard] = useState(false);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
  const passengerOffsetsRef = useRef<Record<string, { offsetX: number; offsetY: number }>>({});
  const dropSuccessRef = useRef(false);
  const topButtonRef = useRef<HTMLButtonElement>(null);
  const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const groupIds = useMemo(() => {
    if (activeCard === null) return new Set<string>();
    return new Set([...selectedIds, activeCard.id]);
  }, [activeCard, selectedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setSelectionSource(null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  function sendPendingMove(insertPosition: 'top' | 'bottom' | 'random') {
    if (!pendingMove) {
      if (import.meta.env.DEV) {
        console.error('sendPendingMove called with no pendingMove — this is a bug');
      }
      return;
    }
    sendAction({
      type: 'MOVE_CARD',
      cardId: pendingMove.card.id,
      fromZone: pendingMove.fromZone,
      fromId: pendingMove.fromId,
      toZone: pendingMove.toZone,
      toId: pendingMove.toId,
      insertPosition,
    });
    setPendingMove(null);
  }

  function handleDragStart(event: DragStartEvent) {
    // Cancel any in-flight snap-back timer from a previous failed drop
    if (snapBackTimerRef.current !== null) {
      clearTimeout(snapBackTimerRef.current);
      snapBackTimerRef.current = null;
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
        // hand/pile → canvas: derive pointer position relative to canvas (Pitfall 2)
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

    const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
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
      !isIntraHandReorder &&
      fromZoneAtEnd !== 'canvas';

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
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: (selectionSource !== null && selectionSource.zone !== 'canvas' ? selectionSource.zone : 'hand') as 'hand' | 'pile',
          fromId: selectionSource !== null && selectionSource.zone === 'pile'
            ? selectionSource.zoneId   // use selectionSource as canonical pile ID
            : playerId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
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

    // Phase 32: canvas → opponent-hand not supported; keep card on canvas (NOLOSS-01, T-32-11)
    if (isPassCard && dragDataRef.current?.fromZone === 'canvas') {
      dropSuccessRef.current = false;
      setActiveCard(null);
      dragDataRef.current = null;
      setDragging(false);
      return;
    }

    if (isPassCard) {
      setActiveCard(null);
      setDragDelta(null);
      passengerOffsetsRef.current = {};
      const { card, fromZone, fromId } = dragDataRef.current!;
      sendAction({
        type: 'PASS_CARD',
        cardId: card.id,
        targetPlayerId: overData!.toId,
        fromZone: fromZone as 'hand' | 'pile',
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
        const targetPile = gameState.piles.find(p => p.id === toId);
        const isEmpty = !targetPile || targetPile.cards.length === 0;
        if (isEmpty) {
          // Empty zone: bypass dialog, place at top immediately (D-02, D-03)
          sendAction({
            type: 'MOVE_CARD',
            cardId: card.id,
            fromZone: fromZone as 'hand' | 'pile' | 'canvas',
            fromId,
            toZone,
            toId,
            insertPosition: 'top',
          });
        } else {
          // Check if destination is a spread zone — spread zones always insert at top, no dialog (GAP-02)
          const isSpread = targetPile?.region === 'spread';
          if (isSpread) {
            // GAP-06: intra-spread reorder — skip MOVE_CARD so SpreadZone's useDndMonitor
            // REORDER_PILE_SPREAD handler can fire without BoardDragLayer racing it.
            // Reuse outer isIntraSpreadReorder (computed at top of handleDragEnd, D-02 Phase 21).
            if (!isIntraSpreadReorder) {
              sendAction({
                type: 'MOVE_CARD',
                cardId: card.id,
                fromZone: fromZone as 'hand' | 'pile' | 'canvas',
                fromId,
                toZone,
                toId,
                insertPosition: 'top',
              });
            }
          } else {
            // Non-empty pile (non-spread): intercept and show position dialog (D-01, D-11)
            setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile' | 'canvas', fromId, toZone, toId });
          }
        }
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

  return (
    <div className="contents">
      <DndContext
        sensors={sensors}
        collisionDetection={customCollision}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} shufflingPileIds={shufflingPileIds} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} selectionSource={selectionSource} canvasRef={canvasRef} onToggleSelectCanvas={handleToggleSelectCanvas} onDeselectAll={handleDeselectAll} groupIds={groupIds} activeCardId={activeCard?.id ?? null} dragDelta={dragDelta} />
        {createPortal(
          <DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
            {/* D-13: DragOverlay 0.5 opacity + scale 1.05 — applied globally for canvas drags; existing zone drags inherit the same */}
            {/* Shadow wrapper is outside the opacity div so it renders at full opacity (CSS opacity composites box-shadow) */}
            {activeCard ? (
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

      {/* Insert-position dialog — appears after non-empty pile drop (D-01) */}
      <Dialog.Root
        open={pendingMove !== null}
        onOpenChange={(_open) => {
          // Any dismissal cancels the move (D-01, D-02, D-03) — card stays at server origin
          if (!_open) setPendingMove(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/20" />
          <Dialog.Popup
            initialFocus={topButtonRef}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-lg bg-popover p-4 shadow-md ring-1 ring-foreground/10 max-w-xs w-full"
          >
            <p className="text-sm font-medium mb-3">Insert card where?</p>
            <div className="flex gap-2">
              <Button
                ref={topButtonRef}
                variant="default"
                className="flex-1"
                onClick={() => sendPendingMove('top')}
              >
                Top
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => sendPendingMove('bottom')}
              >
                Bottom
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => sendPendingMove('random')}
              >
                Random
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
