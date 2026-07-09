import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Eye, EyeOff, Shuffle, SquareCheck, Ungroup } from 'lucide-react';
import type { Card, ClientPile, ClientAction, LastMoveHighlight } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { PileShuffleAnimation } from './PileShuffleAnimation';
import { cn } from '@/lib/utils';

interface CanvasPileZoneProps {
  pile: ClientPile; // region === 'canvas'; pos is always defined for canvas piles
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  shufflingPileIds?: Map<string, 'normal' | 'flourish'>;
  onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string, hasMaskedCards?: boolean) => void;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectedIds?: Set<string>;
  highlightedMove?: LastMoveHighlight | null;
}

export function CanvasPileZone({ pile, sendAction, draggingCardId, shufflingPileIds = new Map(), onSelectAll, onToggleSelect, selectedIds, highlightedMove }: CanvasPileZoneProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `canvas-pile-drag-${pile.id}`,
    data: { type: 'canvas-pile' as const, pileId: pile.id },
  });
  const setRefs = (node: HTMLDivElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  // Server prunes empty canvas piles; guard against transient renders anyway.
  if (pile.cards.length === 0 || !pile.pos) return null;

  const topCard = pile.cards[pile.cards.length - 1];
  const topCardId = 'id' in topCard ? (topCard as Card).id : null;
  const isTopCardSelected = topCardId !== null && (selectedIds?.has(topCardId) ?? false);
  const isDraggingTopCard = !!draggingCardId && topCardId !== null && draggingCardId === topCardId;
  const shuffleAnimationType = shufflingPileIds.get(pile.id);
  const isPileHighlighted =
    highlightedMove?.toZoneType === 'pile' && highlightedMove.toZoneId === pile.id;

  function handleTopCardClick() {
    if (topCardId !== null) onToggleSelect?.(topCardId, 'pile', pile.id);
  }

  function handleSelectAll() {
    if (!onSelectAll) return;
    const allIds = pile.cards.filter(c => 'id' in c).map(c => (c as Card).id);
    if (allIds.length === 0) return;
    const hasMaskedCards = pile.cards.some(c => !('id' in c));
    onSelectAll(allIds, 'pile', pile.id, hasMaskedCards);
  }

  return (
    <div
      ref={setRefs}
      data-canvas-pile=""
      data-testid={`canvas-pile-${pile.id}`}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        left: pile.pos.x,
        top: pile.pos.y,
        zIndex: pile.pos.z,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
        cursor: 'grab',
      }}
      className={cn(
        'rounded-lg border bg-secondary/90 p-1 zone-hover',
        isOver ? 'border-primary' : 'border-border',
        isTopCardSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Header strip: primary whole-pile drag target (full width) + controls */}
      <div data-testid={`canvas-pile-handle-${pile.id}`} className="flex items-center justify-between gap-1 px-0.5">
        <span className="zone-label">{pile.name}</span>
        <div
          className="flex gap-0.5 zone-controls"
          // Buttons must not arm the whole-pile drag or bubble clicks to the canvas.
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp })}
            title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
            aria-label={pile.faceUp !== false ? 'Face up' : 'Face down'}
          >
            {pile.faceUp !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => sendAction({ type: 'SHUFFLE_PILE', pileId: pile.id })}
            title="Shuffle pile"
            aria-label="Shuffle pile"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleSelectAll}
            title="Select all cards in pile"
            aria-label="Select all"
          >
            <SquareCheck className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => sendAction({ type: 'UNSTACK_CANVAS_PILE', pileId: pile.id })}
            title="Unstack pile onto the canvas"
            aria-label="Unstack pile"
          >
            <Ungroup className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {/* Card area: pointer events stop here so grabbing the top card never drags the pile */}
      <div
        className="w-[56px] sm:w-[80px] min-h-[75px] sm:min-h-[104px] rounded-md flex flex-col items-center justify-center relative py-1"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); handleTopCardClick(); }}
      >
        {isPileHighlighted && (
          <div key={highlightedMove!.nonce} className="last-move-highlight absolute inset-0 rounded-md pointer-events-none" />
        )}
        {shuffleAnimationType !== undefined && <PileShuffleAnimation animationType={shuffleAnimationType} />}
        {isDraggingTopCard && (
          <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
        )}
        {'id' in topCard
          ? <DraggableCard card={topCard as Card} fromZone="pile" fromId={pile.id} isSelected={isTopCardSelected} />
          : <CardBack />}
        <Badge data-testid={`canvas-pile-count-${pile.id}`} className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>
      </div>
    </div>
  );
}
