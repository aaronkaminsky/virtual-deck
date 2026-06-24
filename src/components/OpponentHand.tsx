import { useDroppable, useDndContext } from '@dnd-kit/core';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';
import { ChipBadge } from './ChipBadge';
import { cn } from '@/lib/utils';
import type { Card, ClientAction, LastMoveHighlight } from '@/shared/types';

const MAX_VISIBLE_OPPONENT_CARDS = 5;

interface OpponentHandProps {
  playerId: string;
  cardCount: number;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  revealedCards?: Card[];
  highlightedMove?: LastMoveHighlight | null;
  shortcutKey?: string;
  chipsEnabled: boolean;
  chipsInHand: number;
  konamiActive: boolean;
}

export function OpponentHand({ playerId, cardCount, displayName, connected, sendAction: _sendAction, revealedCards, highlightedMove, shortcutKey, chipsEnabled, chipsInHand, konamiActive }: OpponentHandProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `opponent-hand-${playerId}`,
    data: { toZone: 'opponent-hand' as const, toId: playerId },
  });

  const { active } = useDndContext();
  const dragIsActive = active !== null;
  const isZoneHighlighted =
    highlightedMove?.toZoneType === "hand" && highlightedMove.toZoneId === playerId;

  return (
    <div
      ref={setNodeRef}
      data-testid="opponent-hand"
      className={cn(
        'flex flex-col rounded-lg p-1 relative',
        isOver ? 'border-2 border-primary' : 'border-2 border-transparent'
      )}
    >
      {isZoneHighlighted && (
        <div key={highlightedMove!.nonce} className="last-move-highlight absolute inset-0 rounded-lg pointer-events-none" />
      )}
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}{cardCount > 0 ? ` (${cardCount})` : ''}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
        {chipsEnabled && <ChipBadge amount={chipsInHand} />}
      </div>
      <div className="flex items-center gap-1">
        <div className="flex items-center overflow-x-auto">
          {revealedCards && revealedCards.length > 0
            ? revealedCards.map((card, i) => (
                <CardFace
                  key={card.id}
                  card={konamiActive ? { ...card, rank: 'A' } : card}
                  className={cn('w-[40px] h-[60px]', i > 0 ? '-ml-3' : undefined)}
                />
              ))
            : Array.from({ length: Math.min(cardCount, MAX_VISIBLE_OPPONENT_CARDS) }).map((_, i) => (
                <CardBack
                  key={i}
                  className={cn('w-[40px] h-[60px]', i > 0 ? '-ml-3' : undefined)}
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
