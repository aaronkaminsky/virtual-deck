import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface SortableSpreadCardProps {
  card: Card;
  pileId: string;
  index: number;
  draggingCardId: string | null;
}

function SortableSpreadCard({ card, pileId, index, draggingCardId }: SortableSpreadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId },
  });

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
    opacity: draggingCardId === card.id ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
    >
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}

interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
}

export function SpreadZone({ pile, sendAction, draggingCardId, className }: SpreadZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  // Detect intra-spread card reorder
  const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);

  useDndMonitor({
    onDragEnd(event) {
      const over = event.over;
      if (!over) return;
      const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
      const overData = over.data.current as { fromZone?: string; fromId?: string } | undefined;

      const fromThisPile = activeData?.fromZone === 'pile' && activeData?.fromId === pile.id;
      const toThisPile =
        (overData?.fromZone === 'pile' && overData?.fromId === pile.id) ||
        String(over.id) === `pile-${pile.id}`;

      if (fromThisPile && toThisPile && activeData) {
        const activeIdx = faceUpCards.findIndex(c => c.id === activeData.card.id);
        const overIdx = faceUpCards.findIndex(c => c.id === String(over.id));
        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          const reordered = arrayMove(faceUpCards, activeIdx, overIdx);
          sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id) });
        }
      }
    },
  });

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
  }

  const isEmpty = pile.cards.length === 0;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{pile.name}</span>
      <div
        ref={setNodeRef}
        data-testid={`spread-zone-${pile.id}`}
        className={cn(
          'min-w-[56px] h-[79px] sm:min-w-[80px] sm:h-[112px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border',
          className
        )}
      >
        {isEmpty ? (
          <span className="text-xs text-muted-foreground">{pile.name}</span>
        ) : (
          <SortableContext items={faceUpCards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center">
              {pile.cards.map((card, i) => (
                <div
                  key={'id' in card ? (card as Card).id : `masked-${i}`}
                >
                  {'id' in card ? (
                    <SortableSpreadCard
                      card={card as Card}
                      pileId={pile.id}
                      index={i}
                      draggingCardId={draggingCardId}
                    />
                  ) : (
                    <div className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
                      <CardBack />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        )}
      </div>
      <Button
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={handleToggleFace}
        title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
      >
        {pile.faceUp !== false ? 'Face up' : 'Face down'}
      </Button>
    </div>
  );
}
