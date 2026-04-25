import { useDroppable } from '@dnd-kit/core';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
}

export function SpreadZone({ pile, sendAction, draggingCardId: _draggingCardId }: SpreadZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
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
          'min-w-[80px] h-[112px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border'
        )}
      >
        {isEmpty ? (
          <span className="text-xs text-muted-foreground">{pile.name}</span>
        ) : (
          <div className="flex items-center">
            {pile.cards.map((card, i) => (
              <div
                key={'id' in card ? (card as Card).id : `masked-${i}`}
                className={cn('flex-shrink-0', i > 0 ? '-ml-5' : '')}
              >
                {'id' in card ? (
                  <DraggableCard card={card as Card} fromZone="pile" fromId={pile.id} />
                ) : (
                  <CardBack />
                )}
              </div>
            ))}
          </div>
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
