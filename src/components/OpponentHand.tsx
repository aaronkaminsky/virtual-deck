import { Badge } from '@/components/ui/badge';
import { CardBack } from './CardBack';

interface OpponentHandProps {
  playerId: string;
  cardCount: number;
}

export function OpponentHand({ cardCount }: OpponentHandProps) {
  return (
    <div className="flex items-center gap-1">
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
