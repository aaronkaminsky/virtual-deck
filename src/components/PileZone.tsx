import { useDroppable } from '@dnd-kit/core';
import { Shuffle } from 'lucide-react';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface PileZoneProps {
  pile: ClientPile;
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

  function handleShuffle() {
    sendAction({ type: 'SHUFFLE_PILE', pileId: pile.id });
  }

  function handleFlipCard() {
    if (!topCard || !('id' in topCard)) return;
    sendAction({ type: 'FLIP_CARD', pileId: pile.id, cardId: topCard.id });
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
        {'id' in (topCard ?? {}) ? <DraggableCard card={topCard as Card} fromZone="pile" fromId={pile.id} onFlip={handleFlipCard} /> : topCard && <CardBack />}
        <Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
      </div>
      <div className="flex gap-1 mt-1">
        <Button
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={handleToggleFace}
          title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
        >
          {pile.faceUp !== false ? 'Face up' : 'Face down'}
        </Button>
        <Button
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={handleShuffle}
        >
          <Shuffle className="w-3 h-3 mr-1" /> Shuffle
        </Button>
      </div>
    </div>
  );
}
