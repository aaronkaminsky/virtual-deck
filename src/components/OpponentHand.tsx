import { useDroppable, useDndContext } from '@dnd-kit/core';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';
import { cn } from '@/lib/utils';
import type { Card, ClientAction } from '@/shared/types';

const MAX_VISIBLE_OPPONENT_CARDS = 5;

interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  revealedCards?: Card[];
}

export function OpponentHand({ playerId, cardCount, displayName, connected, sendAction: _sendAction, revealedCards }: OpponentHandProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `opponent-hand-${playerId}`,
    data: { toZone: 'opponent-hand' as const, toId: playerId },
  });

  const { active } = useDndContext();
  const dragIsActive = active !== null;

  return (
    <div
      ref={setNodeRef}
      data-testid="opponent-hand"
      className={cn(
        'flex flex-col rounded-lg p-1',
        isOver ? 'border-2 border-primary' : 'border-2 border-transparent'
      )}
    >
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}{cardCount > 0 ? ` (${cardCount})` : ''}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex items-center overflow-x-auto">
          {revealedCards && revealedCards.length > 0
            ? revealedCards.map((card, i) => (
                <CardFace
                  key={card.id}
                  card={card}
                  className={cn('w-[42px] h-[59px]', i > 0 ? '-ml-3' : undefined)}
                />
              ))
            : Array.from({ length: Math.min(cardCount, MAX_VISIBLE_OPPONENT_CARDS) }).map((_, i) => (
                <CardBack
                  key={i}
                  className={cn('w-[42px] h-[59px]', i > 0 ? '-ml-3' : undefined)}
                />
              ))
          }
        </div>
        {dragIsActive && cardCount === 0 && !(revealedCards && revealedCards.length > 0) && (
          <span className="text-xs text-muted-foreground">Drop to pass</span>
        )}
      </div>
    </div>
  );
}
