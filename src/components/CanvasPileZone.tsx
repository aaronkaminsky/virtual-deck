import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useEffect, useRef } from 'react';
import { Eye, EyeOff, GripHorizontal, Shuffle, Ungroup } from 'lucide-react';
import type { Card, ClientPile, ClientAction, LastMoveHighlight } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DraggableCard } from './DraggableCard';
import { CardFace } from './CardFace';
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

// Two buried-card layers peeking out bottom-right of the top card — reads as "stack"
// without a text label. Muted so the top card stays the visual focus; border uses
// muted-foreground (not the near-invisible --border token) so the peeking edge is
// actually legible against the felt.
function StackedEdges() {
  return (
    <>
      <div
        className="absolute w-[40px] h-[60px] sm:w-[60px] sm:h-[90px] rounded-md border border-muted-foreground/40 bg-secondary/70"
        style={{ top: 6, left: 6, zIndex: 0 }}
      />
      <div
        className="absolute w-[40px] h-[60px] sm:w-[60px] sm:h-[90px] rounded-md border border-muted-foreground/50 bg-secondary/90"
        style={{ top: 3, left: 3, zIndex: 1 }}
      />
    </>
  );
}

// Presentational pile visual: stacked-edge layers + top card + count badge.
// Shared by the live zone's card area (interactive `topCard` override) and the
// whole-pile DragOverlay ghost (default non-interactive render), so the ghost
// looks like the thing being dragged instead of a bare CardBack.
export function CanvasPileVisual({ pile, topCard }: { pile: ClientPile; topCard?: React.ReactNode }) {
  const top = pile.cards[pile.cards.length - 1];
  const defaultTopCard = 'id' in top
    ? ((top as Card).faceUp ? <CardFace card={top as Card} /> : <CardBack />)
    : <CardBack />;
  return (
    <div className="relative w-[40px] h-[60px] sm:w-[60px] sm:h-[90px]">
      <StackedEdges />
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {topCard ?? defaultTopCard}
      </div>
      <Badge data-testid={`canvas-pile-count-${pile.id}`} className="absolute -bottom-2 -right-2" style={{ zIndex: 3 }}>
        {pile.cards.length}
      </Badge>
    </div>
  );
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

  // Click-after-drag guard (same pattern as CanvasDraggableCard.tsx:29-41): a frame
  // click that ends a drag should not also select the stack.
  const didDragRef = useRef(false);
  const prevIsDragging = useRef(false);
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (prevIsDragging.current && !isDragging) {
      timerId = setTimeout(() => { didDragRef.current = false; }, 300);
    }
    if (isDragging) didDragRef.current = true;
    prevIsDragging.current = isDragging;
    return () => {
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [isDragging]);

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

  function handleFrameClick() {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    handleSelectAll();
  }

  return (
    <div
      ref={setRefs}
      data-canvas-pile=""
      data-testid={`canvas-pile-${pile.id}`}
      {...listeners}
      {...attributes}
      onClick={handleFrameClick}
      aria-label={`Move ${pile.name} pile (${pile.cards.length} cards)`}
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
        'rounded-lg border bg-secondary/60 p-1',
        isOver ? 'border-primary' : 'border-border',
        isTopCardSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Grip strip: slim whole-pile drag affordance, no text label. */}
      <div data-testid={`canvas-pile-handle-${pile.id}`} className="h-3.5 flex items-center px-0.5">
        <GripHorizontal className="w-3 h-3 text-muted-foreground/60" />
      </div>
      {/* Card area: pointer events stop here so grabbing the top card never drags the pile */}
      <div
        className="relative"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); handleTopCardClick(); }}
      >
        {isPileHighlighted && (
          <div key={highlightedMove!.nonce} className="last-move-highlight absolute inset-0 rounded-md pointer-events-none" style={{ zIndex: 4 }} />
        )}
        {shuffleAnimationType !== undefined && <PileShuffleAnimation animationType={shuffleAnimationType} />}
        {isDraggingTopCard && (
          <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" style={{ zIndex: 4 }} />
        )}
        <CanvasPileVisual
          pile={pile}
          topCard={'id' in topCard
            ? <DraggableCard card={topCard as Card} fromZone="pile" fromId={pile.id} isSelected={isTopCardSelected} />
            : undefined}
        />
      </div>
      {/* Floating controls: absolutely positioned so they don't widen the frame; revealed on pile
          hover/focus only (globals.css). This outer div is an invisible hover bridge — the
          padding-bottom extends its (pointer-events-gated) hit area down to the frame's top edge,
          so moving the pointer from the frame up into the toolbar never leaves a hovered element
          mid-crossing (frame -> bridge -> buttons), which previously dropped :hover on
          [data-canvas-pile] and faded the controls before the pointer arrived (1031). The visible
          toolbar chrome (bg, blur, rounding) lives on the inner div so the bridge stays invisible. */}
      <div
        className="absolute -top-9 -right-2 pb-2 canvas-pile-controls"
        // Sits fully above the frame (clear of the grip strip) so a revealed-on-hover button
        // never shadows the frame's own click-to-select area. Buttons still stop propagation
        // so they never arm the whole-pile drag or bubble clicks to the frame/canvas.
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-0.5 rounded-md bg-card/80 backdrop-blur-sm p-0.5">
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
            onClick={() => sendAction({ type: 'UNSTACK_CANVAS_PILE', pileId: pile.id })}
            title="Unstack pile onto the canvas"
            aria-label="Unstack pile"
          >
            <Ungroup className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
