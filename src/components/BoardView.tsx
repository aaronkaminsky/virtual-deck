import type { ClientGameState } from '@/shared/types';
import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { HandZone } from './HandZone';

interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: unknown) => void;
}

export function BoardView({ gameState }: BoardViewProps) {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <div className="h-[88px] flex items-center px-4 gap-6 bg-card">
        {Object.entries(gameState.opponentHandCounts).map(([id, count]) => (
          <OpponentHand key={id} playerId={id} cardCount={count} />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center gap-6 px-4">
        {gameState.piles.map((pile) => (
          <PileZone key={pile.id} pile={pile} />
        ))}
      </div>

      <HandZone cards={gameState.myHand} />
    </div>
  );
}
