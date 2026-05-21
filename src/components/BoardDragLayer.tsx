import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision, defaultDropAnimation, useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';
import type { CollisionDetection, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Dialog } from '@base-ui/react/dialog';
import type { Card, ClientAction, ClientGameState } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { BoardView } from './BoardView';
import { CardOverlay } from './CardOverlay';

const customCollision: CollisionDetection = (args) => {
  const zoneContainers = args.droppableContainers.filter(
    (c) => String(c.id) === 'hand' || String(c.id).startsWith('opponent-hand-')
  );
  const pileContainers = args.droppableContainers.filter(
    (c) => String(c.id).startsWith('pile-')
  );
  const gridCellContainers = args.droppableContainers.filter(
    (c) => String(c.id).startsWith('grid-cell-')
  );
  const cardContainers = args.droppableContainers.filter(
    (c) => String(c.id) !== 'hand' && !String(c.id).startsWith('opponent-hand-') && !String(c.id).startsWith('pile-') && !String(c.id).startsWith('grid-cell-')
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

  // Grid cell droppables (play area) — checked before pile bucket (T-24-06: prefix 'grid-cell-' never starts with 'pile-')
  const gridCollisions = pointerWithin({ ...args, droppableContainers: gridCellContainers });
  if (gridCollisions.length > 0) return gridCollisions;

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
  return [];
};

type SelectionSource = { zone: 'hand' | 'pile'; zoneId: string; hasMaskedCards?: boolean } | null;

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
  fromZone: 'hand' | 'pile';
  fromId: string;
  toZone: 'hand' | 'pile';
  toId: string;
};

export function BoardDragLayer({ gameState, playerId, roomId, connected, sendAction, setDragging, shufflingPileIds }: BoardDragLayerProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);
  const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
  const dropSuccessRef = useRef(false);
  const topButtonRef = useRef<HTMLButtonElement>(null);
  const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [gameState.myHand, gameState.piles, selectedIds, selectionSource]);

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
  }

  function handleDragEnd(event: DragEndEvent) {
    const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
    const activeId = String(event.active.id);
    // D-02 (Phase 21): compute intra-zone reorder flags ONCE, before any branch.
    const fromZoneAtEnd = dragDataRef.current?.fromZone;
    const fromIdAtEnd = dragDataRef.current?.fromId;
    const isIntraSpreadReorder = fromZoneAtEnd === 'pile' && fromIdAtEnd === overData?.toId;
    const isIntraHandReorder = fromZoneAtEnd === 'hand' && overData?.toZone === 'hand';
    const isMultiCardSet =
      (selectedIds.size > 1 || selectionSource?.hasMaskedCards === true) &&
      selectedIds.has(activeId) &&
      !!event.over &&
      (overData?.toZone === 'pile' || overData?.toZone === 'hand') &&
      !isIntraSpreadReorder &&
      !isIntraHandReorder;

    if (isMultiCardSet) {
      setActiveCard(null);
      setSelectedIds(new Set());
      setSelectionSource(null);
      setDragging(false);
      dropSuccessRef.current = true;
      dragDataRef.current = null;
      if (selectionSource?.hasMaskedCards) {
        // Face-down pile: client doesn't have all card IDs — server moves the whole pile
        sendAction({
          type: 'MOVE_ALL_PILE_CARDS',
          fromId: selectionSource.zoneId,
          toId: overData!.toId,
        });
      } else {
        const gridOverDataMulti = event.over?.data.current as { toRow?: number; toCol?: number } | undefined;
        sendAction({
          type: 'PLAY_CARD_SET',
          cardIds: [...selectedIds],
          fromZone: (selectionSource?.zone ?? 'hand') as 'hand' | 'pile',
          fromId: selectionSource?.zone === 'pile'
            ? (selectionSource.zoneId)   // use selectionSource as canonical pile ID
            : playerId,
          toZone: overData!.toZone === 'opponent-hand' ? 'hand' : overData!.toZone as 'pile' | 'hand',
          toId: overData!.toId,
          ...(gridOverDataMulti?.toRow !== undefined ? { toRow: gridOverDataMulti.toRow, toCol: gridOverDataMulti.toCol } : {}),
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
            fromZone: fromZone as 'hand' | 'pile',
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
              const gridOverData = event.over?.data.current as { toRow?: number; toCol?: number } | undefined;
              sendAction({
                type: 'MOVE_CARD',
                cardId: card.id,
                fromZone: fromZone as 'hand' | 'pile',
                fromId,
                toZone,
                toId,
                insertPosition: 'top',
                ...(gridOverData?.toRow !== undefined ? { toRow: gridOverData.toRow, toCol: gridOverData.toCol } : {}),
              });
            } else if (selectedIds.size > 1 && selectionSource?.zoneId === 'play') {
              const toRow = (event.over?.data.current as { toRow?: number })?.toRow;
              const toCol = (event.over?.data.current as { toCol?: number })?.toCol;
              if (toRow !== undefined && toCol !== undefined) {
                for (const cId of selectedIds) {
                  sendAction({ type: 'MOVE_GRID_CARD', cardId: cId, pileId: 'play', toRow, toCol });
                }
              }
              setSelectedIds(new Set());
              setSelectionSource(null);
            }
          } else {
            // Non-empty pile (non-spread): intercept and show position dialog (D-01)
            setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile', fromId, toZone, toId });
          }
        }
      } else {
        // Hand drop: send immediately, no position dialog needed
        sendAction({
          type: 'MOVE_CARD',
          cardId: card.id,
          fromZone: fromZone as 'hand' | 'pile',
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
    // Clear after animation completes.
    else {
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
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} shufflingPileIds={shufflingPileIds} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} selectionSource={selectionSource} />
        {createPortal(
          <DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
            {activeCard ? <CardOverlay card={activeCard} /> : null}
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
