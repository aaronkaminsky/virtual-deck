import { useDroppable } from '@dnd-kit/core';
import type { Card } from '@/shared/types';
import { DraggableCard } from './DraggableCard';
import { cn } from '@/lib/utils';

interface HandZoneProps {
  cards: Card[];
  playerId: string;
}

export function HandZone({ cards, playerId }: HandZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'hand',
    data: { toZone: 'hand' as const, toId: playerId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-[128px] flex items-center px-4 gap-2 overflow-x-auto bg-card',
        isOver ? 'border-t-2 border-primary' : ''
      )}
    >
      {cards.map((card) => (
        <DraggableCard key={card.id} card={card} fromZone="hand" fromId={playerId} />
      ))}
    </div>
  );
}
