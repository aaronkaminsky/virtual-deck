import type { ClientAction, ClientGameState } from '@/shared/types';
import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { HandZone } from './HandZone';
import { ControlsBar } from './ControlsBar';
import { ConnectionBanner } from './ConnectionBanner';
import { PlayerPresence } from './PlayerPresence';

interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
}

export function BoardView({ gameState, playerId, connected, sendAction }: BoardViewProps) {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <ConnectionBanner connected={connected} />
      <div className="h-[88px] flex items-center justify-between px-4 gap-4 bg-card">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {Object.entries(gameState.opponentHandCounts).map(([id, count]) => {
            const playerIndex = gameState.players.findIndex(p => p.id === id);
            const playerLabel = playerIndex >= 0 ? `P${playerIndex + 1}` : 'P?';
            return (
              <OpponentHand key={id} playerId={id} cardCount={count} playerLabel={playerLabel} sendAction={sendAction} />
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <PlayerPresence players={gameState.players} myPlayerId={gameState.myPlayerId} />
          <ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} />
        </div>
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
