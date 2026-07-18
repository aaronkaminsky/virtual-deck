import { useDraggable } from '@dnd-kit/core';
import type { TokenId } from '@/shared/types';
import { TokenDisc, TOKEN_LABELS } from './TokenDisc';

// Draggable token anchored to a player's name row — same id/data contract as
// tray and canvas tokens (BoardDragLayer's token-drag-start detection is
// contract-based, not source-based), so it can be re-anchored directly in
// one drag without a forced stop in the tray (design 1035 revision).
export function AnchoredTokenDisc({ tokenId }: { tokenId: TokenId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `token-${tokenId}`,
    data: { type: 'token' as const, tokenId },
  });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-token=""
      data-testid={`anchored-token-${tokenId}`}
      aria-roledescription="Draggable token"
      aria-label={TOKEN_LABELS[tokenId]}
      style={{ touchAction: 'none', opacity: isDragging ? 0.3 : 1, cursor: 'grab', display: 'inline-flex' }}
    >
      <TokenDisc tokenId={tokenId} size="sm" />
    </span>
  );
}
