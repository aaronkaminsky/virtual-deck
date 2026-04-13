import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ClientAction, ClientGameState } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { HandZone } from './HandZone';
import { ControlsBar } from './ControlsBar';
import { ConnectionBanner } from './ConnectionBanner';

interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  roomId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
}

export function BoardView({ gameState, playerId, roomId, connected, sendAction }: BoardViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const base = import.meta.env.BASE_URL || '/virtual-deck/';
    const url = `${window.location.origin}${base}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard write failed (e.g., permission denied or non-HTTPS context)
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <ConnectionBanner connected={connected} />
      <div className="h-[104px] flex items-center justify-between px-4 gap-4 bg-card">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {Object.entries(gameState.opponentHandCounts).map(([id, count]) => {
            const player = gameState.players.find(p => p.id === id);
            return (
              <OpponentHand
                key={id}
                playerId={id}
                cardCount={count}
                displayName={player?.displayName ?? ''}
                connected={player?.connected ?? false}
                sendAction={sendAction}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label="Copy room link"
          >
            {copied ? (
              <>
                <Check className="mr-2 size-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 size-4" />
                Copy link
              </>
            )}
          </Button>
          <ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-6 px-4">
        {gameState.piles.map((pile) => (
          <PileZone key={pile.id} pile={pile} sendAction={sendAction} />
        ))}
      </div>

      {(() => {
        const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);
        return (
          <HandZone
            cards={gameState.myHand}
            playerId={gameState.myPlayerId}
            displayName={myPlayer?.displayName ?? ''}
            connected={myPlayer?.connected ?? true}
            sendAction={sendAction}
          />
        );
      })()}
    </div>
  );
}
