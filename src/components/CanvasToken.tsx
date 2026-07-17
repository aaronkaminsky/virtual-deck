import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Token } from '@/shared/types';
import { TokenDisc, TOKEN_LABELS } from './TokenDisc';

// Absolutely-positioned token on the felt. Purely positional: no selection,
// no drop-target semantics, no click behavior (design 1035).
export function CanvasToken({ token }: { token: Token }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `token-${token.id}`,
    data: { type: 'token' as const, tokenId: token.id },
  });

  if (!token.pos) return null;

  return (
    <div
      ref={setNodeRef}
      data-token=""
      data-testid={`canvas-token-${token.id}`}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable token"
      aria-label={TOKEN_LABELS[token.id]}
      style={{
        position: 'absolute',
        left: token.pos.x,
        top: token.pos.y,
        zIndex: token.pos.z,
        opacity: isDragging ? 0 : 1,
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <TokenDisc tokenId={token.id} />
    </div>
  );
}
