import { useState } from 'react';
import { Copy, Check, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ClientGameState } from '@/shared/types';

interface LobbyPanelProps {
  roomId: string;
  playerId: string;
  gameState: ClientGameState | null;
  connected: boolean;
  error: string | null;
}

export default function LobbyPanel({ roomId, playerId, gameState, connected, error }: LobbyPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const base = import.meta.env.BASE_URL || '/virtual-deck/';
    const url = `${window.location.origin}${base}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const players = gameState?.players ?? [];

  const errorMessage = error
    ? error.toLowerCase().includes('full')
      ? 'This room is full (4 players max). Ask the host to share a new link.'
      : 'Something went wrong. Refresh the page to reconnect.'
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-card rounded-xl p-8 w-full max-w-[480px] border border-border">
        <h1 className="text-[1.75rem] font-semibold leading-[1.2] mb-6">Virtual Deck</h1>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-1">Room code</p>
          <p className="text-[1.25rem] font-semibold text-primary mb-1">{roomId}</p>
          <p className="text-sm text-muted-foreground mb-3">Share this code with friends to play</p>
          <Button
            variant="outline"
            className="min-h-[44px] border-primary text-primary hover:bg-primary/10"
            onClick={handleCopy}
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
        </div>

        <Separator className="my-6" />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-4" />
            <h2 className="text-base font-semibold">Players</h2>
          </div>
          <ul className="space-y-2">
            {[0, 1, 2, 3].map((index) => {
              const player = players[index];
              if (player && connected) {
                const isSelf = player.id === playerId;
                return (
                  <li key={index} className="flex items-center gap-2">
                    <span className={`rounded-full w-2 h-2 ${isSelf ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    <span className="text-sm">{isSelf ? 'You' : 'Player'}</span>
                  </li>
                );
              }
              if (player && !connected) {
                return (
                  <li key={index} className="flex items-center gap-2">
                    <span className="bg-muted-foreground rounded-full w-2 h-2" />
                    <span className="text-sm text-muted-foreground">Player</span>
                  </li>
                );
              }
              return (
                <li key={index} className="flex items-center gap-2">
                  <span className="border border-dashed border-muted-foreground rounded-full w-2 h-2" />
                  <span className="text-sm text-muted-foreground">Waiting...</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="bg-primary rounded-full w-2 h-2" />
              <span className="text-sm text-muted-foreground">Connected</span>
            </>
          ) : (
            <>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
