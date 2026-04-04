import { useDroppable } from '@dnd-kit/core';
import type { Pile, ClientAction } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { DraggableCard } from './DraggableCard';
import { cn } from '@/lib/utils';

interface PileZoneProps {
  pile: Pile;
  sendAction: (action: ClientAction) => void;
}

export function PileZone({ pile, sendAction }: PileZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  const isEmpty = pile.cards.length === 0;
  const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1];

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{pile.name}</span>
      <div
        ref={setNodeRef}
        className={cn(
          'w-[80px] h-[112px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border'
        )}
      >
        {topCard && <DraggableCard card={topCard} fromZone="pile" fromId={pile.id} />}
        <Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
      </div>
      <button
        onClick={handleToggleFace}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
      >
        {pile.faceUp !== false ? 'Face up' : 'Face down'}
      </button>
    </div>
  );
}
