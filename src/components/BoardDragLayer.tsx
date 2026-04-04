import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, defaultDropAnimation } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Card, ClientAction, ClientGameState } from '@/shared/types';
import { BoardView } from './BoardView';
import { CardOverlay } from './CardOverlay';

interface BoardDragLayerProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
  setDragging: (d: boolean) => void;
}

export function BoardDragLayer({ gameState, playerId, sendAction, setDragging }: BoardDragLayerProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const dragDataRef = useRef<{ card: Card; fromZone: string; fromId: string } | null>(null);
  const dropSuccessRef = useRef(false);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { card: Card; fromZone: string; fromId: string };
    dragDataRef.current = data;
    setActiveCard(data.card);
    setDragging(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const overData = event.over?.data.current as { toZone: string; toId: string } | undefined;
    const isSuccess = !!(event.over && dragDataRef.current && overData?.toZone);
    dropSuccessRef.current = isSuccess;
    setDragging(false);

    if (isSuccess) {
      setActiveCard(null);
      const { card, fromZone, fromId } = dragDataRef.current!;
      sendAction({
        type: 'MOVE_CARD',
        cardId: card.id,
        fromZone: fromZone as 'hand' | 'pile',
        fromId,
        toZone: overData!.toZone as 'hand' | 'pile',
        toId: overData!.toId,
      });
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
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <BoardView gameState={gameState} playerId={playerId} sendAction={sendAction} />
      {createPortal(
        <DragOverlay dropAnimation={dropSuccessRef.current ? null : defaultDropAnimation}>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
