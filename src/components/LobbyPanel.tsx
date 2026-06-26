import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDisplayName } from '@/hooks/usePlayerId';

interface LobbyPanelProps {
  roomId: string;
  onJoin: (name: string) => void;
  connected: boolean;
  error: string | null;
  joining: boolean;
}

export default function LobbyPanel({ roomId, onJoin, connected, error, joining }: LobbyPanelProps) {
  const [name, setName] = useState(() => getDisplayName());

  useEffect(() => {
    document.title = `${roomId} · Virtual Deck`;
  }, [roomId]);

  const errorMessage = error
    ? error.toLowerCase().includes('full')
      ? 'This room is full (4 players max). Ask the host to share a new link.'
      : error.startsWith("Can't reach")
      ? error
      : 'Something went wrong. Refresh the page to reconnect.'
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 felt-surface">
      <div className="bg-card rounded-xl p-8 w-full max-w-[480px] border border-border elev-2">
        <h1 className="text-[1.75rem] font-semibold leading-[1.2] mb-1">Virtual Deck</h1>
        <p className="text-sm text-muted-foreground mb-6">Joining: {roomId}</p>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-1">Your name</p>
          <Input
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            placeholder="Your name"
            maxLength={20}
            disabled={joining}
          />
        </div>

        <Button
          className="w-full min-h-[44px]"
          disabled={name.trim().length === 0 || joining}
          onClick={() => onJoin(name.trim())}
        >
          {joining ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Joining...
            </>
          ) : (
            'Join Game'
          )}
        </Button>

        <div className="flex items-center gap-2 mt-6">
          {joining && connected ? (
            <>
              <span className="bg-primary rounded-full w-2 h-2" />
              <span className="text-sm text-muted-foreground">Connected</span>
            </>
          ) : joining ? (
            <>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </>
          ) : null}
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
