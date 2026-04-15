import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientAction } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface SortableHandCardProps {
  card: Card;
  playerId: string;
}

function SortableHandCard({ card, playerId }: SortableHandCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'hand' as const, fromId: playerId, toZone: 'hand' as const, toId: playerId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {isDragging ? (
        <div className="w-[63px] h-[88px] rounded-md border border-dashed border-border" />
      ) : (
        card.faceUp ? <CardFace card={card} /> : <CardBack />
      )}
    </div>
  );
}

interface HandZoneProps {
  cards: Card[];
  playerId: string;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
}

export function HandZone({ cards, playerId, displayName, connected, sendAction }: HandZoneProps) {
  const { setNodeRef } = useDroppable({
    id: 'hand',
    data: { toZone: 'hand' as const, toId: playerId },
  });

  const { active, over } = useDndContext();
  const handCardIds = new Set(cards.map(c => c.id));
  const isOver =
    active != null &&
    over != null &&
    (over.id === 'hand' || handCardIds.has(String(over.id)));

  useDndMonitor({
    onDragEnd(event) {
      const over = event.over;
      if (!over) return;
      const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
      const overData = over.data.current as { fromZone?: string; fromId?: string } | undefined;

      const fromHand = activeData?.fromZone === 'hand' && activeData?.fromId === playerId;
      const toSameHand =
        (overData?.fromZone === 'hand' && overData?.fromId === playerId) ||
        over.id === 'hand';

      if (fromHand && toSameHand && activeData) {
        const activeIdx = cards.findIndex(c => c.id === activeData.card.id);
        const overIdx = cards.findIndex(c => c.id === String(over.id));
        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          const reordered = arrayMove(cards, activeIdx, overIdx);
          sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
        }
      }
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-4 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">{displayName || 'Player'}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'h-[128px] flex items-center px-4 gap-2 overflow-x-auto bg-card',
          isOver ? 'border-t-2 border-primary' : ''
        )}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {cards.map((card) => (
            <SortableHandCard key={card.id} card={card} playerId={playerId} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
