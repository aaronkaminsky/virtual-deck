import { useState } from 'react';
import React from 'react';
import { Menu, Copy, Check, Undo2, Volume2, VolumeX } from 'lucide-react';
import type { ClientAction, ClientGameState } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getMuted, setMuted } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface ControlsBarProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
  roomId: string;
  menuFocused?: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  dealCount: string;
  onDealCountChange: (v: string) => void;
}

export function ControlsBar({ gameState, sendAction, roomId, menuFocused, triggerRef, dealCount, onDealCountChange }: ControlsBarProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [muted, setMutedState] = useState(getMuted());

  function handleToggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  const drawPileCount = gameState.piles.find(p => p.id === 'draw')?.cards.length ?? 0;
  const connectedPlayerCount = gameState.players.filter(p => p.connected).length || 1;

  const totalCardsInGame =
    gameState.myHand.length +
    Object.values(gameState.opponentHandCounts).reduce((a, b) => a + b, 0) +
    Object.values(gameState.opponentRevealedHands).reduce((acc, cards) => acc + cards.length, 0) +
    gameState.piles.reduce((acc, p) => acc + p.cards.length, 0) +
    gameState.canvasCards.length;

  const maxCards = gameState.phase === 'playing'
    ? Math.floor(totalCardsInGame / connectedPlayerCount)
    : Math.floor(drawPileCount / connectedPlayerCount);
  const undoDisabled = !gameState.canUndo;

  function handleCopy() {
    const base = import.meta.env.BASE_URL || '/virtual-deck/';
    const url = `${window.location.origin}${base}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    }).catch(() => {
      setOpen(false);
    });
  }

  function handleDeal() {
    const parsed = parseInt(dealCount, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > maxCards) return;
    if (gameState.phase === 'playing') {
      sendAction({ type: 'DEAL_NEXT_HAND', cardsPerPlayer: parsed });
    } else {
      sendAction({ type: 'DEAL_CARDS', cardsPerPlayer: parsed });
    }
    setOpen(false);
  }

  function handleUndo() {
    sendAction({ type: 'UNDO_MOVE' });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(menuFocused && 'outline outline-2 outline-white outline-offset-1 rounded-lg')}>
        <PopoverTrigger render={
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon-sm"
            aria-label={open ? 'Close controls' : 'Open controls'}
          >
            <Menu className="size-4" />
          </Button>
        } />
      </div>
      <PopoverContent side="bottom" align="end" className="w-56 p-4">
        <div className="flex flex-col gap-3">
          {/* Copy link */}
          <Button variant="outline" size="sm" className="w-full" onClick={handleCopy} aria-label="Copy room link">
            {copied ? (
              <><Check className="mr-2 size-4" /> Copied!</>
            ) : (
              <><Copy className="mr-2 size-4" /> Copy link</>
            )}
          </Button>

          <Separator />

          {/* Sound toggle */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleToggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? (
              <><VolumeX className="mr-2 size-4" /> Sound off</>
            ) : (
              <><Volume2 className="mr-2 size-4" /> Sound on</>
            )}
          </Button>

          <Separator />

          {/* Deal section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Cards per player</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={maxCards}
                value={dealCount}
                onChange={e => onDealCountChange(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleDeal}
              >
                {gameState.phase === 'playing' ? 'Deal next hand' : 'Deal'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Undo */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={undoDisabled}
              onClick={handleUndo}
              className="flex-1"
            >
              <Undo2 className="mr-1 size-4" /> Undo
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
