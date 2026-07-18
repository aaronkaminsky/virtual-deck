import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { Token, TokenId } from '@/shared/types';
import { TokenDisc, TOKEN_LABELS } from './TokenDisc';
import { TOKEN_SIZE } from '@/lib/tokenDrag';
import { cn } from '@/lib/utils';

function TrayToken({ tokenId }: { tokenId: TokenId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `token-${tokenId}`,
    data: { type: 'token' as const, tokenId },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-token=""
      data-testid={`tray-token-${tokenId}`}
      aria-roledescription="Draggable token"
      aria-label={TOKEN_LABELS[tokenId]}
      style={{ touchAction: 'none', opacity: isDragging ? 0.3 : 1, cursor: 'grab' }}
    >
      <TokenDisc tokenId={tokenId} />
    </div>
  );
}

export function TokenTray({ tokens }: { tokens: Token[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'token-tray' });
  return (
    <div className="flex flex-col gap-0.5 zone-hover" data-testid="token-tray">
      <span className="zone-label hidden sm:inline">Tokens</span>
      <div
        ref={setNodeRef}
        className={cn(
          'w-[56px] sm:w-[80px] rounded-lg border flex flex-wrap items-center justify-center gap-1 bg-secondary py-2 px-1',
          isOver ? 'border-primary' : 'border-border'
        )}
      >
        {tokens.map(t =>
          t.placement.kind === 'tray' ? (
            <TrayToken key={t.id} tokenId={t.id} />
          ) : (
            <div
              key={t.id}
              data-testid={`token-slot-${t.id}`}
              aria-hidden="true"
              className="rounded-full border-2 border-dashed border-muted-foreground/30"
              style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}
            />
          )
        )}
      </div>
    </div>
  );
}
