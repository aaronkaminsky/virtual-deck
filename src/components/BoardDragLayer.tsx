import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, pointerWithin, getFirstCollision, defaultDropAnimation } from '@dnd-kit/core';
import type { CollisionDetection, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Dialog } from '@base-ui/react/dialog';
import type { Card, ClientAction, ClientGameState } from '@/shared/types';
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

  // Pointer is outside all zones — only pile targets are valid.
  return closestCenter({ ...args, droppableContainers: pileContainers });
};

interface BoardDragLayerProps {
  gameState: ClientGameState;
  playerId: string;
  roomId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  setDragging: (d: boolean) => void;
}

type PendingMove = {
  card: Card;
  fromZone: 'hand' | 'pile';
  fromId: string;
  toZone: 'hand' | 'pile';
  toId: string;
};

export function BoardDragLayer({ gameState, playerId, roomId, connected, sendAction, setDragging }: BoardDragLayerProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
  const dropSuccessRef = useRef(false);

  function sendPendingMove(insertPosition: 'top' | 'bottom' | 'random') {
    if (!pendingMove) return;
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
    const data = event.active.data.current as { card: Card; fromZone: string; fromId: string };
    dragDataRef.current = data;
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
        // Intercept: show position dialog before sending (D-01, D-04)
        setPendingMove({ card, fromZone: fromZone as 'hand' | 'pile', fromId, toZone, toId });
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
      setTimeout(() => setActiveCard(null), defaultDropAnimation.duration + 50);
    }

    dragDataRef.current = null;
  }

  function handleDragCancel() {
    dropSuccessRef.current = false;
    setDragging(false);
    dragDataRef.current = null;
    setTimeout(() => setActiveCard(null), defaultDropAnimation.duration + 50);
  }

  return (
    <>
      <DndContext
        collisionDetection={customCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <BoardView gameState={gameState} playerId={playerId} roomId={roomId} connected={connected} sendAction={sendAction} draggingCardId={activeCard?.id ?? null} />
        {createPortal(
          <DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
            {activeCard ? <CardOverlay card={activeCard} /> : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* Insert-position dialog — appears after any pile drop (D-01, D-04) */}
      <Dialog.Root
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open) sendPendingMove('top'); // dismiss = Top (D-03); click-outside and Escape both trigger this
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/20" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-lg bg-popover p-4 shadow-md ring-1 ring-foreground/10 max-w-xs w-full">
            <p className="text-sm font-medium mb-3">Insert card where?</p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded border px-3 py-2 text-sm hover:bg-accent"
                onClick={() => sendPendingMove('top')}
              >
                Top
              </button>
              <button
                className="flex-1 rounded border px-3 py-2 text-sm hover:bg-accent"
                onClick={() => sendPendingMove('bottom')}
              >
                Bottom
              </button>
              <button
                className="flex-1 rounded border px-3 py-2 text-sm hover:bg-accent"
                onClick={() => sendPendingMove('random')}
              >
                Random
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
