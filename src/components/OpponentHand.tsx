import { useDroppable, useDndContext } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
import type { ClientAction } from '@/shared/types';

interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  playerLabel: string;
  sendAction: (action: ClientAction) => void;
}

export function OpponentHand({ playerId, cardCount, playerLabel, sendAction: _sendAction }: OpponentHandProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `opponent-hand-${playerId}`,
    data: { toZone: 'opponent-hand' as const, toId: playerId },
  });

  const { active } = useDndContext();
  const dragIsFromHand = active?.data.current?.fromZone === 'hand';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-1 rounded-lg p-1',
        isOver
          ? 'border-2 border-primary'
          : dragIsFromHand
            ? 'border-2 border-dashed border-primary/60'
            : 'border-2 border-transparent',
        dragIsFromHand && 'min-h-[44px] min-w-[80px]'
      )}
    >
      <span className="text-xs text-muted-foreground">{playerLabel}</span>
      <div className="flex items-center">
        {Array.from({ length: cardCount }).map((_, i) => (
          <CardBack
            key={i}
            className={i > 0 ? '-ml-4' : undefined}
          />
        ))}
      </div>
      {cardCount > 0 && <Badge>{cardCount}</Badge>}
      {dragIsFromHand && cardCount === 0 && (
        <span className="text-xs text-muted-foreground">Drop to pass</span>
      )}
    </div>
  );
}
