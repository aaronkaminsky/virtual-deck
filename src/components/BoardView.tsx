import type { ClientAction, ClientGameState } from '@/shared/types';

import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { SpreadZone } from './SpreadZone';
import { HandZone } from './HandZone';
import { ControlsBar } from './ControlsBar';
import { ConnectionBanner } from './ConnectionBanner';

interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  roomId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function BoardView({ gameState, playerId, roomId, connected, sendAction, draggingCardId, shufflingPileIds, selectedIds, onToggleSelect }: BoardViewProps) {
  const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
  const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
  const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
  const communalZone = spreadPiles.find(p => p.id === 'play');

  return (
    <div className="h-screen w-screen overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col bg-background">
      <ConnectionBanner connected={connected} />
      <div className="flex items-center justify-between px-4 py-2 gap-4 bg-card">
        <div className="flex items-start gap-4 flex-1 overflow-x-auto">
          {Object.entries(gameState.opponentHandCounts).map(([id, count]) => {
            const player = gameState.players.find(p => p.id === id);
            const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
            return (
              <div key={id} className="flex flex-col gap-1">
                <OpponentHand
                  playerId={id}
                  cardCount={count}
                  displayName={player?.displayName ?? ''}
                  connected={player?.connected ?? false}
                  sendAction={sendAction}
                />
                {opponentSpread && (
                  <SpreadZone pile={opponentSpread} sendAction={sendAction} draggingCardId={draggingCardId} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} roomId={roomId} />
        </div>
      </div>

      <div className="flex-1 flex items-center px-4 gap-4">
        {pilePiles.map((pile) => (
          <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} />
        ))}
        {communalZone && (
          <div className="flex-1 min-w-0">
            <SpreadZone
              pile={communalZone}
              sendAction={sendAction}
              draggingCardId={draggingCardId}
              className="w-full"
            />
          </div>
        )}
      </div>

      {mySpreadZone && (
        <div className="bg-card px-4 py-2">
          <SpreadZone
            pile={mySpreadZone}
            sendAction={sendAction}
            draggingCardId={draggingCardId}
          />
        </div>
      )}

      {(() => {
        const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);
        return (
          <HandZone
            cards={gameState.myHand}
            playerId={gameState.myPlayerId}
            displayName={myPlayer?.displayName ?? ''}
            connected={myPlayer?.connected ?? true}
            sendAction={sendAction}
            draggingCardId={draggingCardId}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        );
      })()}
    </div>
  );
}
