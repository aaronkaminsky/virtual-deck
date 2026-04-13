import { useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getDisplayName } from '@/hooks/usePlayerId';

interface LobbyPanelProps {
  roomId: string;
  onJoin: (name: string) => void;
  connected: boolean;
  error: string | null;
  joining: boolean;
}

export default function LobbyPanel({ roomId, onJoin, connected, error, joining }: LobbyPanelProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => getDisplayName());

  const handleCopy = () => {
    const base = import.meta.env.BASE_URL || '/virtual-deck/';
    const url = `${window.location.origin}${base}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
