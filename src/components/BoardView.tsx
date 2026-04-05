import type { ClientAction, ClientGameState } from '@/shared/types';
import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { HandZone } from './HandZone';
import { ControlsBar } from './ControlsBar';

interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
}

export function BoardView({ gameState, playerId, sendAction }: BoardViewProps) {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <div className="h-[88px] flex items-center justify-between px-4 gap-4 bg-card">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {Object.entries(gameState.opponentHandCounts).map(([id, count]) => (
            <OpponentHand key={id} playerId={id} cardCount={count} sendAction={sendAction} />
          ))}
        </div>
        <ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} />
      </div>

      <div className="flex-1 flex items-center justify-center gap-6 px-4">
        {gameState.piles.map((pile) => (
          <PileZone key={pile.id} pile={pile} sendAction={sendAction} />
        ))}
      </div>

      <HandZone cards={gameState.myHand} playerId={gameState.myPlayerId} sendAction={sendAction} />
    </div>
  );
}
