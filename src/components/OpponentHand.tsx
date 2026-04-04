import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
import type { ClientAction } from '@/shared/types';

interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  sendAction: (action: ClientAction) => void;
}

export function OpponentHand({ playerId, cardCount, sendAction: _sendAction }: OpponentHandProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `opponent-hand-${playerId}`,
    data: { toZone: 'opponent-hand' as const, toId: playerId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-1 border-2 rounded-lg p-1',
        isOver ? 'border-primary' : 'border-transparent'
      )}
    >
      <span className="text-xs text-muted-foreground">Player</span>
      <div className="flex items-center">
        {Array.from({ length: cardCount }).map((_, i) => (
          <CardBack
            key={i}
            className={i > 0 ? '-ml-4' : undefined}
          />
        ))}
      </div>
      {cardCount > 0 && <Badge>{cardCount}</Badge>}
    </div>
  );
}
