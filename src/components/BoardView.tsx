import React from 'react';
import type { ClientAction, ClientGameState, LastMoveHighlight, SelectionSource } from '@/shared/types';
import type { CursorPos } from '@/lib/keyboardUtils';

import { OpponentHand } from './OpponentHand';
import { PileZone } from './PileZone';
import { SpreadZone } from './SpreadZone';
import { HandZone, type SortMode } from './HandZone';
import { ControlsBar } from './ControlsBar';
import { ConnectionBanner } from './ConnectionBanner';
import { CanvasZone } from './CanvasZone';
import { ShortcutsOverlay } from './ShortcutsOverlay';

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
  onSelectAllCanvas: () => void;
  onDiscardAllCanvas: () => void;
  onDeselectAll: () => void;
  groupIds: Set<string>;
  activeCardId: string | null;
  dragDelta: { x: number; y: number } | null;
  highlightedMove: LastMoveHighlight | null;
  cursorCardId: string | null;
  altHeld: boolean;
  zoneLetterMap: Map<string, string>;
  menuFocused: boolean;
  menuTriggerRef: React.RefObject<HTMLButtonElement | null>;
  showShortcuts: boolean;
  onCloseShortcuts: () => void;
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  lastDealCount: string;
  onDealCountChange: (v: string) => void;
  setCursorPos: (pos: CursorPos | null) => void;
}

export function BoardView({ gameState, playerId, roomId, connected, sendAction, draggingCardId, shufflingPileIds, selectedIds, onToggleSelect, onSelectAll, selectionSource, canvasRef, onToggleSelectCanvas, onSelectAllCanvas, onDiscardAllCanvas, onDeselectAll, groupIds, activeCardId, dragDelta, highlightedMove, cursorCardId, altHeld, zoneLetterMap, menuFocused, menuTriggerRef, showShortcuts, onCloseShortcuts, sortMode, setSortMode, lastDealCount, onDealCountChange, setCursorPos }: BoardViewProps) {
  const pilePiles = gameState.piles.filter(p => (p.region ?? 'pile') === 'pile');
  const spreadPiles = gameState.piles.filter(p => p.region === 'spread');
  const mySpreadZone = spreadPiles.find(p => p.id === gameState.myPlayZoneId);
  const allOpponentIds = Array.from(new Set([
    ...Object.keys(gameState.opponentHandCounts),
    ...Object.keys(gameState.opponentRevealedHands),
  ]));
  const opponentCount = allOpponentIds.length;

  return (
    <div className="h-screen w-screen min-w-[320px] min-h-[480px] flex flex-col bg-felt">
      <ConnectionBanner connected={connected} />
      <div className="flex items-start justify-between px-4 py-2 gap-4 bg-card">
        <div className="flex items-start gap-4 flex-1 overflow-hidden p-1">
          {allOpponentIds.map((id) => {
            const player = gameState.players.find(p => p.id === id);
            const revealedCards = gameState.opponentRevealedHands[id];
            const cardCount = gameState.opponentHandCounts[id] ?? (revealedCards?.length ?? 0);
            return (
              <div key={id} className={`flex flex-col ${opponentCount === 1 ? 'flex-1 max-w-none' : 'flex-1 min-w-0'} sm:max-w-none`}>
                <OpponentHand
                  playerId={id}
                  cardCount={cardCount}
                  displayName={player?.displayName ?? ''}
                  connected={player?.connected ?? false}
                  sendAction={sendAction}
                  revealedCards={revealedCards}
                  highlightedMove={highlightedMove}
                  shortcutKey={altHeld ? zoneLetterMap.get(`opponent-hand-${id}`) : undefined}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 self-start">
          <ControlsBar gameState={gameState} sendAction={sendAction} roomId={roomId} menuFocused={menuFocused} triggerRef={menuTriggerRef as React.RefObject<HTMLButtonElement>} dealCount={lastDealCount} onDealCountChange={onDealCountChange} />
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
                      highlightedMove={highlightedMove}
                      cursorCardId={cursorCardId ?? undefined}
                      shortcutKey={altHeld ? zoneLetterMap.get(`pile-${opponentSpread.id}`) : undefined}
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
              <PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} onSelectAll={onSelectAll} selectedIds={selectedIds} highlightedMove={highlightedMove} cursorCardId={cursorCardId ?? undefined} shortcutKey={altHeld ? zoneLetterMap.get(`pile-${pile.id}`) : undefined} />
            ))}
          </div>
          <div className="flex-1 min-w-0 self-stretch flex">
            <CanvasZone canvasCards={gameState.canvasCards} canvasRef={canvasRef} selectedIds={selectedIds} selectionSource={selectionSource} groupIds={groupIds} activeCardId={activeCardId} dragDelta={dragDelta} onToggleSelectCanvas={onToggleSelectCanvas} onSelectAllCanvas={onSelectAllCanvas} onDiscardAllCanvas={onDiscardAllCanvas} onDeselectAll={onDeselectAll} highlightedMove={highlightedMove} cursorCardId={cursorCardId ?? undefined} shortcutKey={altHeld ? zoneLetterMap.get('canvas') : undefined} />
          </div>
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
              highlightedMove={highlightedMove}
              cursorCardId={cursorCardId ?? undefined}
              shortcutKey={altHeld ? zoneLetterMap.get(`pile-${mySpreadZone.id}`) : undefined}
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
              highlightedMove={highlightedMove}
              cursorCardId={cursorCardId ?? undefined}
              shortcutKey={altHeld ? zoneLetterMap.get('hand') : undefined}
              sortMode={sortMode}
              setSortMode={setSortMode}
              onCursorChange={(index) => setCursorPos({ zoneId: 'hand', index })}
            />
          );
        })()}
      </div>
      <ShortcutsOverlay open={showShortcuts} onClose={onCloseShortcuts} />
    </div>
  );
}
