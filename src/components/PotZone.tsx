import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { ClientAction } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChipStack } from './ChipStack';

interface PotZoneProps {
  pot: number;
  myPlayerId: string;
  sendAction: (action: ClientAction) => void;
}

export function PotZone({ pot, myPlayerId, sendAction }: PotZoneProps) {
  const [amount, setAmount] = useState(pot);
  const [popoverOpen, setPopoverOpen] = useState(false);

  function handlePopoverOpenChange(open: boolean) {
    setPopoverOpen(open);
    if (open) setAmount(pot);
  }

  function handleTakeAll() {
    if (pot > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount: pot });
  }

  function handleToHand() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount });
    setPopoverOpen(false);
  }

  function handleToSpread() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'spread', playerId: myPlayerId, amount });
    setPopoverOpen(false);
  }

  return (
    <div className="flex flex-col gap-0.5 zone-hover" data-testid="pot-zone">
      <div className="flex justify-between items-center">
        <span className="zone-label hidden sm:inline">Pot</span>
        <div className="flex gap-1 zone-controls">
          <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger render={
              <Button variant="ghost" className="h-7 w-7 p-0" aria-label="More chip actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            } />
            <PopoverContent side="bottom" align="end" className="w-48 p-2.5">
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={e => setAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleToHand}>Hand</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleToSpread}>Bet</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-lg border border-border flex items-center justify-center relative bg-secondary py-2">
        <ChipStack amount={pot} />
        <Badge className="absolute -bottom-2 -right-2">{pot}</Badge>
      </div>
      <div className="zone-controls">
        <Button variant="outline" size="sm" className="w-full" onClick={handleTakeAll} disabled={pot === 0}>Take all</Button>
      </div>
    </div>
  );
}
