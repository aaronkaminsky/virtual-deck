import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision, defaultDropAnimation } from '@dnd-kit/core';
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
  const cardContainers = args.droppableContainers.filter(
    (c) => String(c.id) !== 'hand' && !String(c.id).startsWith('opponent-hand-') && !String(c.id).startsWith('pile-')
  );

  const zoneCollisions = pointerWithin({ ...args, droppableContainers: zoneContainers });

  if (zoneCollisions.length > 0) {
    // Opponent-hand zone always wins — card is being passed to another player.
    if (String(zoneCollisions[0].id).startsWith('opponent-hand-')) return zoneCollisions;
    // Inside the hand strip: prefer card-to-card sortable reorder over the zone itself.
    // closestCenter returns the nearest sibling card; zone wins only when the hand is empty.
    const cardCollisions = closestCenter({ ...args, droppableContainers: cardContainers });
    return cardCollisions.length > 0 ? cardCollisions : zoneCollisions;
  }

  // Pointer is outside all zones — pile drops only register when the pointer is inside the pile rect.
  return pointerWithin({ ...args, droppableContainers: pileContainers });
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
  fromZone: 'hand' | 'pile';
  fromId: string;
  toZone: 'hand' | 'pile';
  toId: string;
};

export function BoardDragLayer({ gameState, playerId, roomId, connected, sendAction, setDragging, shufflingPileIds }: BoardDragLayerProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
  const dropSuccessRef = useRef(false);
  const topButtonRef = useRef<HTMLButtonElement>(null);
  const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function sendPendingMove(insertPosition: 'top' | 'bottom' | 'random') {
    if (!pendingMove) {
      if (process.env.NODE_ENV === 'development') {
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
    const data = event.active.data.current as { card?: Card; fromZone?: string; fromId?: string } | undefined;
    if (!data?.card || !data.fromZone || !data.fromId) return; // guard against unexpected drag sources
    dragDataRef.current = data as { card: Card; fromZone: string; fromId: string };
    setActiveCard(data.card);
    setDragging(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
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
      setActiveCard(null);
      const { card, fromZone, fromId } = dragDataRef.current!;
      const toZone = overData!.toZone as 'hand' | 'pile';
      const toId = overData!.toId;

      if (toZone === 'pile') {
        const targetPile = gameState.piles.find(p => p.id === toId);
        const isEmpty = !targetPile || targetPile.cards.length === 0;
        if (isEmpty) {
          // Empty pile: bypass dialog, place at top immediately (D-02, D-03)
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
          // Non-empty pile: intercept and show position dialog (D-01)
          setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile', fromId, toZone, toId });
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
    <>
      <DndContext
        collisionDetection={customCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} shufflingPileIds={shufflingPileIds} />
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
    </>
  );
}
