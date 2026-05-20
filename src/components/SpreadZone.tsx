import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientPile, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, SquareCheck } from 'lucide-react';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface SortableSpreadCardProps {
  card: Card;
  pileId: string;
  index: number;
  draggingCardId: string | null;
  isSelected: boolean;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
}

function SortableSpreadCard({ card, pileId, index, draggingCardId, isSelected, onToggleSelect }: SortableSpreadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'pile' as const, fromId: pileId, toZone: 'pile' as const, toId: pileId },
  });

  const resolvedTransform = isSelected
    ? 'translateY(-6px)'
    : isDragging
      ? undefined
      : CSS.Transform.toString(transform);

  const style: React.CSSProperties = {
    transform: resolvedTransform,
    transition,
    touchAction: 'none',
    opacity: draggingCardId === card.id ? 0 : 1,
  };

  return (
    <div
      className={cn('relative flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
      onClick={() => onToggleSelect(card.id, 'pile', pileId)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {draggingCardId === card.id && (
        <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
      )}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150'
        )}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}
      >
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
      </div>
    </div>
  );
}

function SortableSentinel({ id }: { id: string }) {
  const { setNodeRef } = useSortable({ id });
  return <div ref={setNodeRef} style={{ flex: 1, minWidth: 56, alignSelf: 'stretch', opacity: 0 }} aria-hidden />;
}

interface SpreadZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  className?: string;
  interactive?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onSelectAll?: (cardIds: string[], zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource?: { zone: 'hand' | 'pile'; zoneId: string } | null;
}

export function SpreadZone({ pile, sendAction, draggingCardId, className, interactive, selectedIds, onToggleSelect, onSelectAll, selectionSource }: SpreadZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  // Detect intra-spread card reorder
  const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);
  const sentinelId = `__sentinel-pile-${pile.id}__`;

  useDndMonitor({
    onDragEnd(event) {
      const over = event.over;
      if (!over) return;
      const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
      const overData = over.data.current as { fromZone?: string; fromId?: string } | undefined;

      const fromThisPile = activeData?.fromZone === 'pile' && activeData?.fromId === pile.id;
      const toThisPile =
        (overData?.fromZone === 'pile' && overData?.fromId === pile.id) ||
        String(over.id) === `pile-${pile.id}` ||
        String(over.id) === sentinelId;

      if (fromThisPile && toThisPile && activeData) {
        const draggedId = activeData.card.id;
        // D-03/D-06 (Phase 21): if the dragged card is part of a multi-selection, move ALL selected cards as a block.
        const isGroupReorder = !!selectedIds && selectedIds.size > 1 && selectedIds.has(draggedId);

        let reordered: Card[];
        if (isGroupReorder) {
          // D-06: (1) filter selected out, (2) find over-index in remainder, (3) splice selected at that index.
          const selected = faceUpCards.filter(c => selectedIds!.has(c.id));
          const remainder = faceUpCards.filter(c => !selectedIds!.has(c.id));
          // Sentinel or unknown → append to end.
          // Direction heuristic: compare the dragged card's original index with the over card's original index.
          // Dragging rightward (originalDragIdx < originalOverIdx) → insert AFTER over; leftward → insert BEFORE.
          // This is stable regardless of cumulative pointer displacement (unlike event.delta.x).
          const originalDragIdx = faceUpCards.findIndex(c => c.id === draggedId);
          const originalOverIdx = faceUpCards.findIndex(c => c.id === String(over.id));
          const overIdx = String(over.id) === sentinelId
            ? -1
            : remainder.findIndex(c => c.id === String(over.id));
          const insertAt = overIdx === -1
            ? remainder.length
            : originalDragIdx < originalOverIdx
              ? Math.min(overIdx + 1, remainder.length)
              : overIdx;
          remainder.splice(insertAt, 0, ...selected);
          reordered = remainder;
        } else {
          const activeIdx = faceUpCards.findIndex(c => c.id === draggedId);
          // Sentinel drop → move dragged card to the last position.
          const overIdx = String(over.id) === sentinelId
            ? faceUpCards.length - 1
            : faceUpCards.findIndex(c => c.id === String(over.id));
          if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;
          reordered = arrayMove(faceUpCards, activeIdx, overIdx);
        }
        sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id) });
      }
    },
  });

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !pile.faceUp });
  }

  function handleSelectAll() {
    if (!onSelectAll || interactive === false || faceUpCards.length === 0) return;
    onSelectAll(faceUpCards.map(c => c.id), 'pile', pile.id);
  }

  const isEmpty = pile.cards.length === 0;

  return (
    <div className="flex flex-col gap-1">
      {selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id && (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
          {selectedIds.size} selected
        </span>
      )}
      <div
        ref={setNodeRef}
        data-testid={`spread-zone-${pile.id}`}
        className={cn(
          isEmpty && interactive !== false
            ? isOver
              ? 'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2'
              : 'h-px opacity-0'
            : cn(
                'min-w-[56px] h-[64px] sm:min-w-[80px] sm:h-[88px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary',
                isEmpty ? 'border-dashed' : '',
                isOver ? 'border-primary' : 'border-border'
              ),
          className
        )}
      >
        {!isEmpty && interactive !== false ? (
          <SortableContext items={[...faceUpCards.map(c => c.id), sentinelId]} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center">
              {pile.cards.map((card, i) => (
                <div key={'id' in card ? (card as Card).id : `masked-${i}`}>
                  {'id' in card ? (
                    <SortableSpreadCard
                      card={card as Card}
                      pileId={pile.id}
                      index={i}
                      draggingCardId={draggingCardId}
                      isSelected={selectedIds?.has((card as Card).id) ?? false}
                      onToggleSelect={onToggleSelect ?? (() => {})}
                    />
                  ) : (
                    <div className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
                      <CardBack />
                    </div>
                  )}
                </div>
              ))}
              <SortableSentinel id={sentinelId} />
            </div>
          </SortableContext>
        ) : (
          <div className="flex items-center">
            {pile.cards.map((card, i) => (
              <div key={'id' in card ? (card as Card).id : `masked-${i}`} className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
                {'id' in card
                  ? ((card as Card).faceUp ? <CardFace card={card as Card} /> : <CardBack />)
                  : <CardBack />}
              </div>
            ))}
          </div>
        )}
      </div>
      {interactive !== false && !isEmpty && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleToggleFace}
            title={pile.faceUp !== false ? 'Cards land face-up (click to flip)' : 'Cards land face-down (click to flip)'}
            aria-label={pile.faceUp !== false ? 'Cards land face-up' : 'Cards land face-down'}
          >
            {pile.faceUp !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSelectAll}
            title="Select all cards in zone"
            aria-label="Select all"
            disabled={faceUpCards.length === 0}
          >
            <SquareCheck className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
