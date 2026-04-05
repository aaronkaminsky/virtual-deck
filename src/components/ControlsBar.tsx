import { useState } from 'react';
import { ChevronDown, Undo2, RotateCcw } from 'lucide-react';
import type { ClientAction, ClientGameState } from '@/shared/types';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface ControlsBarProps {
  gameState: ClientGameState;
  playerId: string;
  sendAction: (action: ClientAction) => void;
}

export function ControlsBar({ gameState, sendAction }: ControlsBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dealCount, setDealCount] = useState('1');

  if (gameState.phase === 'setup' || gameState.phase === 'lobby') {
    const drawPileCount = gameState.piles.find(p => p.id === 'draw')?.cards.length ?? 0;
    const connectedPlayerCount = gameState.players.filter(p => p.connected).length || 1;
    const maxCards = Math.floor(drawPileCount / connectedPlayerCount);

    function handleDeal() {
      sendAction({ type: 'DEAL_CARDS', cardsPerPlayer: parseInt(dealCount, 10) });
      setPopoverOpen(false);
    }

    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger className={buttonVariants({ variant: 'default', size: 'sm' })}>
            Deal <ChevronDown className="w-4 h-4 ml-1" />
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-[200px] p-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Cards per player</label>
              <Input
                type="number"
                min={1}
                max={maxCards}
                value={dealCount}
                onChange={e => setDealCount(e.target.value)}
              />
              <Button variant="default" className="w-full mt-2" onClick={handleDeal}>
                Deal
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (gameState.phase === 'playing') {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          disabled={!gameState.canUndo}
          onClick={() => sendAction({ type: 'UNDO_MOVE' })}
        >
          <Undo2 className="w-4 h-4 mr-1" /> Undo
        </Button>
        <AlertDialog>
          <AlertDialogTrigger render={
            <Button variant="destructive" size="sm">
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
          } />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset table?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                All cards return to the draw pile and will be reshuffled. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep playing</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => sendAction({ type: 'RESET_TABLE' })}
              >
                Reset table
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
