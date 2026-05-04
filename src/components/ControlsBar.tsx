import { useState } from 'react';
import { Menu, Copy, Check, Undo2, RotateCcw } from 'lucide-react';
import type { ClientAction, ClientGameState } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface ControlsBarProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
  roomId: string;
}

export function ControlsBar({ gameState, sendAction, roomId }: ControlsBarProps) {
  const [open, setOpen] = useState(false);
  const [dealCount, setDealCount] = useState('1');
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);

  const drawPileCount = gameState.piles.find(p => p.id === 'draw')?.cards.length ?? 0;
  const connectedPlayerCount = gameState.players.filter(p => p.connected).length || 1;
  const maxCards = Math.floor(drawPileCount / connectedPlayerCount);

  const dealDisabled = gameState.phase !== 'setup' && gameState.phase !== 'lobby';
  const undoDisabled = !gameState.canUndo;
  const resetDisabled = gameState.phase !== 'playing';

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setConfirmReset(false);
    setOpen(nextOpen);
  }

  function handleCopy() {
    const base = import.meta.env.BASE_URL || '/virtual-deck/';
    const url = `${window.location.origin}${base}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    }).catch(() => {});
  }

  function handleDeal() {
    sendAction({ type: 'DEAL_CARDS', cardsPerPlayer: parseInt(dealCount, 10) });
    setOpen(false);
  }

  function handleUndo() {
    sendAction({ type: 'UNDO_MOVE' });
    setOpen(false);
  }

  function handleResetConfirm() {
    sendAction({ type: 'RESET_TABLE' });
    setConfirmReset(false);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={
        <Button variant="ghost" size="icon-sm" aria-label={open ? 'Close controls' : 'Open controls'}>
          <Menu className="size-4" />
        </Button>
      } />
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

          {/* Deal section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Cards per player</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={maxCards}
                value={dealCount}
                onChange={e => setDealCount(e.target.value)}
                className="flex-1"
                disabled={dealDisabled}
              />
              <Button
                variant="default"
                size="sm"
                disabled={dealDisabled}
                onClick={handleDeal}
              >
                Deal
              </Button>
            </div>
          </div>

          <Separator />

          {/* Undo + Reset */}
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
            {!confirmReset && (
              <Button
                variant="destructive"
                size="sm"
                disabled={resetDisabled}
                onClick={() => setConfirmReset(true)}
                className="flex-1"
              >
                <RotateCcw className="mr-1 size-4" /> Reset table
              </Button>
            )}
          </div>

          {confirmReset && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Are you sure?</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmReset(false)}>
                  Keep playing
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={handleResetConfirm}>
                  Reset table
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
