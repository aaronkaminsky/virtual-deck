import { useState } from 'react';
import type { ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChipStack } from './ChipStack';

interface PotZoneProps {
  pot: number;
  myPlayerId: string;
  sendAction: (action: ClientAction) => void;
}

export function PotZone({ pot, myPlayerId, sendAction }: PotZoneProps) {
  const [amount, setAmount] = useState(10);

  function handleTakeAll() {
    if (pot > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount: pot });
  }

  function handleToHand() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'hand', playerId: myPlayerId, amount });
  }

  function handleToSpread() {
    if (amount > 0) sendAction({ type: 'TRANSFER_CHIPS', from: 'pot', to: 'spread', playerId: myPlayerId, amount });
  }

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-2" data-testid="pot-zone">
      <span className="zone-label hidden sm:inline">Pot</span>
      <ChipStack amount={pot} />
      <Button variant="outline" size="sm" onClick={handleTakeAll} disabled={pot === 0}>Take all</Button>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={e => setAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-16 h-7"
        />
        <Button variant="ghost" size="sm" onClick={handleToHand}>Hand</Button>
        <Button variant="ghost" size="sm" onClick={handleToSpread}>Bet</Button>
      </div>
    </div>
  );
}
