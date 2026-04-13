import { useDroppable, useDndContext } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
import type { ClientAction } from '@/shared/types';

interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
}

export function OpponentHand({ playerId, cardCount, displayName, connected, sendAction: _sendAction }: OpponentHandProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `opponent-hand-${playerId}`,
    data: { toZone: 'opponent-hand' as const, toId: playerId },
  });

  const { active } = useDndContext();
  const dragIsActive = active !== null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg p-1',
        isOver
          ? 'border-2 border-primary'
          : dragIsActive
            ? 'border-2 border-dashed border-primary/60'
            : 'border-2 border-transparent',
        dragIsActive && 'min-h-[44px] min-w-[80px]'
      )}
    >
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">{displayName || 'Player'}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          {Array.from({ length: cardCount }).map((_, i) => (
            <CardBack
              key={i}
              className={i > 0 ? '-ml-4' : undefined}
            />
          ))}
        </div>
        {cardCount > 0 && <Badge>{cardCount}</Badge>}
        {dragIsActive && cardCount === 0 && (
          <span className="text-xs text-muted-foreground">Drop to pass</span>
        )}
      </div>
    </div>
  );
}
