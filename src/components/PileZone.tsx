import { useDroppable } from '@dnd-kit/core';
import { Eye, EyeOff, Shuffle, SquareCheck } from 'lucide-react';
import type { Card, ClientPile, ClientAction, LastMoveHighlight } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface PileZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds?: Set<string>;
  onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => void;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onCursorChange?: () => void;
  selectedIds?: Set<string>;
  highlightedMove?: LastMoveHighlight | null;
  cursorCardId?: string;
  shortcutKey?: string;
}

export function PileZone({ pile, sendAction, draggingCardId, shufflingPileIds = new Set(), onSelectAll, onToggleSelect, onCursorChange, selectedIds, highlightedMove, cursorCardId, shortcutKey }: PileZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  const isEmpty = pile.cards.length === 0;
  const topCard = isEmpty ? null : pile.cards[pile.cards.length - 1];
  const isDraggingTopCard = !!draggingCardId && !!topCard && 'id' in topCard && draggingCardId === (topCard as Card).id;
  const isShuffling = shufflingPileIds.has(pile.id);
  const isPileHighlighted =
    highlightedMove?.toZoneType === "pile" &&
    highlightedMove.toZoneId === pile.id &&
    pile.region !== "spread";

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
  }

  function handleShuffle() {
    sendAction({ type: 'SHUFFLE_PILE', pileId: pile.id });
  }

  function handleTopCardClick() {
    onCursorChange?.();
    if (topCard && 'id' in topCard) {
      onToggleSelect?.((topCard as Card).id, 'pile', pile.id);
    }
  }

  function handleSelectAll() {
    if (!onSelectAll || isEmpty) return;
    const allIds = pile.cards.filter(c => 'id' in c).map(c => (c as Card).id);
    if (allIds.length === 0) return;
    const hasMaskedCards = pile.cards.some(c => !('id' in c));
    onSelectAll(allIds, 'pile', pile.id, hasMaskedCards);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {pile.name}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleToggleFace}
            title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
            aria-label={pile.faceUp !== false ? 'Face up' : 'Face down'}
          >
            {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleShuffle}
            title="Shuffle pile"
            aria-label="Shuffle pile"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSelectAll}
            title="Select all cards in pile"
            aria-label="Select all"
            disabled={isEmpty || !topCard || !('id' in topCard)}
          >
            <SquareCheck className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        data-testid={`pile-${pile.id}`}
        className={cn(
          'w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary py-2',
          isEmpty ? 'border-dashed' : '',
          isOver ? 'border-primary' : 'border-border'
        )}
        onClick={handleTopCardClick}
      >
        {isPileHighlighted && (
          <div key={highlightedMove!.nonce} className="last-move-highlight absolute inset-0 rounded-lg pointer-events-none" />
        )}
        {isShuffling && (['shuffle-cut-right-1', 'shuffle-cut-right-2', 'shuffle-cut-mid', 'shuffle-cut-left-4', 'shuffle-cut-left-5'] as const).map((animName, i) => (
          <div
            key={i}
            className={`absolute inset-0 pointer-events-none flex items-center justify-center shuffle-card-${i + 1}`}
            style={{
              animationName: animName,
              animationDuration: '600ms',
              animationFillMode: 'forwards',
              animationTimingFunction: 'ease-in-out',
            } as React.CSSProperties}
          >
            <CardBack />
          </div>
        ))}
        {isDraggingTopCard && (
          <div className="absolute inset-0 rounded-lg border-2 border-dashed border-muted-foreground" />
        )}
        {'id' in (topCard ?? {}) ? <DraggableCard card={topCard as Card} fromZone="pile" fromId={pile.id} isSelected={selectedIds?.has((topCard as Card).id) ?? false} hasCursor={cursorCardId !== undefined && 'id' in (topCard ?? {}) && cursorCardId === (topCard as Card).id} /> : topCard && <CardBack />}
        {!isEmpty && <Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>}
      </div>
    </div>
  );
}
