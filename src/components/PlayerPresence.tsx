import { cn } from '@/lib/utils';
import type { Player } from '@/shared/types';

interface PlayerPresenceProps {
  players: Player[];
  myPlayerId: string;
}

export function PlayerPresence({ players, myPlayerId }: PlayerPresenceProps) {
  return (
    <div className="flex items-center gap-1.5">
      {players.map((player) => {
        const isMe = player.id === myPlayerId;
        const statusLabel = player.connected ? 'Connected' : 'Disconnected';
        const title = isMe ? `You (${statusLabel})` : statusLabel;
        return (
          <span
            key={player.id}
            title={title}
            className={cn(
              'rounded-full inline-block',
              player.connected ? 'bg-green-500' : 'bg-gray-500',
              isMe ? 'w-3 h-3 ring-2 ring-primary' : 'w-2.5 h-2.5'
            )}
          />
        );
      })}
    </div>
  );
}
