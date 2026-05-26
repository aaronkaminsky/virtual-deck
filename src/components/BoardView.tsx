import React from 'react';
import type { ClientAction, ClientGameState, SelectionSource } from '@/shared/types';

import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { SpreadZone } from './SpreadZone';
import { HandZone } from './HandZone';
import { ControlsBar } from './ControlsBar';
import { ConnectionBanner } from './ConnectionBanner';
import { CanvasZone } from './CanvasZone';

interface BoardViewProps {
  gameState: ClientGameState;
  playerId: string;
  roomId: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onSelectAll: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource: SelectionSource;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onToggleSelectCanvas: (id: string) => void;
  onDeselectAll: () => void;
  groupIds: Set<string>;
  activeCardId: string | null;
  dragDelta: { x: number; y: number } | null;
}

export function BoardView({ gameState, playerId, roomId, connected, sendAction, draggingCardId, shufflingPileIds, selectedIds, onToggleSelect, onSelectAll, selectionSource, canvasRef, onToggleSelectCanvas, onDeselectAll, groupIds, activeCardId, dragDelta }: BoardViewProps) {
  const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
  const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
  const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
  const allOpponentIds = Array.from(new Set([
    ...Object.keys(gameState.opponentHandCounts),
    ...Object.keys(gameState.opponentRevealedHands),
  ]));
  const opponentCount = allOpponentIds.length;

  return (
    <div className="h-screen w-screen min-w-[320px] min-h-[480px] flex flex-col bg-background">
      <ConnectionBanner connected={connected} />
      <div className="flex items-start justify-between px-4 py-2 gap-4 bg-card">
        <div className="flex items-start gap-4 flex-1 overflow-hidden">
          {allOpponentIds.map((id) => {
            const player = gameState.players.find(p => p.id === id);
            const revealedCards = gameState.opponentRevealedHands[id];
            const cardCount = gameState.opponentHandCounts[id] ?? (revealedCards?.length ?? 0);
            return (
              <div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}>
                <OpponentHand
                  playerId={id}
                  cardCount={cardCount}
                  displayName={player?.displayName ?? ''}
                  connected={player?.connected ?? false}
                  sendAction={sendAction}
                  revealedCards={revealedCards}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 self-start">
          <ControlsBar gameState={gameState} playerId={playerId} sendAction={sendAction} roomId={roomId} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col">
        <div className="flex items-start gap-4 px-4 flex-shrink-0">
          <div className="flex items-start gap-4 flex-1 overflow-hidden">
            {allOpponentIds.map((id) => {
              const opponentSpread = spreadPiles.find(p => p.id === `spread-${id}`);
              return (
                <div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none overflow-x-hidden`}>
                  {opponentSpread && (
                    <SpreadZone
                      pile={opponentSpread}
                      sendAction={sendAction}
                      draggingCardId={draggingCardId}
                      interactive={false}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-7 self-start shrink-0 pointer-events-none" aria-hidden="true" />
        </div>

        <div className="flex-1 min-h-0 flex items-start mt-1 pr-2">
          <div className="flex-shrink-0 self-stretch flex flex-col justify-center gap-2 py-2 px-2 border-r border-border">
            {pilePiles.map((pile) => (
              <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} onSelectAll={onSelectAll} selectedIds={selectedIds} />
            ))}
          </div>
          <CanvasZone canvasCards={gameState.canvasCards} canvasRef={canvasRef} />
        </div>

        {mySpreadZone && (
          <div className="flex-shrink-0 px-4 py-1">
            <SpreadZone
              pile={mySpreadZone}
              sendAction={sendAction}
              draggingCardId={draggingCardId}
              interactive={true}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
              selectionSource={selectionSource}
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
              selectionSource={selectionSource}
              isRevealed={gameState.myHandRevealed}
              onToggleReveal={() => sendAction({ type: 'SET_HAND_REVEALED', revealed: !gameState.myHandRevealed })}
            />
          );
        })()}
      </div>
    </div>
  );
}
