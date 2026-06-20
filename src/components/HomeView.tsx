import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/slug';
import { probeOccupancy } from '@/lib/occupancy';

function navigateToRoom(slug: string) {
  window.location.assign(`${window.location.pathname}?room=${slug}`);
}

export default function HomeView() {
  const [name, setName] = useState('');
  const [probing, setProbing] = useState(false);
  const [occupied, setOccupied] = useState<{ slug: string; playerCount: number } | null>(null);

  const slug = slugify(name);
  const canCreate = slug.length > 0 && !probing;

  const handleCreate = async () => {
    if (!slug || probing) return;
    setProbing(true);
    setOccupied(null);
    const result = await probeOccupancy(slug);
    setProbing(false);
    if (result.occupied) {
      setOccupied({ slug, playerCount: result.playerCount });
      return;
    }
    navigateToRoom(slug);
  };

  const handleQuick = () => navigateToRoom(nanoid(8));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 felt-surface">
      <div className="bg-card rounded-xl p-8 w-full max-w-[480px] border border-border elev-2">
        <h1 className="text-[1.75rem] font-semibold leading-[1.2] mb-6">Virtual Deck</h1>

        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-1">Table name</p>
          <Input
            value={name}
            onChange={e => { setName(e.target.value.slice(0, 40)); setOccupied(null); }}
            placeholder="e.g. Friday Poker Night"
            maxLength={40}
            onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
            data-testid="table-name-input"
          />
          <p className="text-sm text-muted-foreground mt-1 min-h-[1.25rem]">
            {slug ? <>Shareable as <span className="text-primary font-medium">{slug}</span></> : ' '}
          </p>
        </div>

        {occupied && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3" data-testid="occupied-warning">
            <p className="text-sm mb-2">
              Table <span className="text-primary font-medium">{occupied.slug}</span> already has{' '}
              {occupied.playerCount} player{occupied.playerCount === 1 ? '' : 's'}.
            </p>
            <Button
              variant="outline"
              className="min-h-[44px] mr-2"
              onClick={() => navigateToRoom(occupied.slug)}
              data-testid="join-occupied"
            >
              Join them
            </Button>
            <span className="text-sm text-muted-foreground">or pick another name</span>
          </div>
        )}

        <Button
          className="w-full min-h-[44px] mb-3"
          disabled={!canCreate}
          onClick={handleCreate}
          data-testid="create-table"
        >
          {probing ? (<><Loader2 className="mr-2 size-4 animate-spin" />Checking…</>) : 'Create table'}
        </Button>

        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          onClick={handleQuick}
          data-testid="quick-table"
        >
          Quick table
        </Button>
      </div>
    </div>
  );
}
