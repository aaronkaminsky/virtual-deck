import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
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

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { card: Card; fromZone: string; fromId: string };
    dragDataRef.current = data;
    setActiveCard(data.card);
    setDragging(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    setDragging(false);

    if (!event.over || !dragDataRef.current) {
      dragDataRef.current = null;
      return;
    }

    const { card, fromZone, fromId } = dragDataRef.current;
    const overData = event.over.data.current as { toZone: string; toId: string };

    if (!overData || !overData.toZone) {
      dragDataRef.current = null;
      return;
    }

    sendAction({
      type: 'MOVE_CARD',
      cardId: card.id,
      fromZone: fromZone as 'hand' | 'pile',
      fromId,
      toZone: overData.toZone as 'hand' | 'pile',
      toId: overData.toId,
    });

    dragDataRef.current = null;
  }

  function handleDragCancel() {
    setActiveCard(null);
    setDragging(false);
    dragDataRef.current = null;
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
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
