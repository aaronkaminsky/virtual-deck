import { useState } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ClientPile, ClientAction, SelectionSource, LastMoveHighlight } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Eye, EyeOff, SquareCheck, MoreVertical, ArrowRight } from 'lucide-react';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { ChipStack } from './ChipStack';
import { cn } from '@/lib/utils';

interface SortableSpreadCardProps {
  card: Card;
  pileId: string;
  index: number;
  draggingCardId: string | null;
  isSelected: boolean;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onCursorChange?: () => void;
  isHighlighted: boolean;
  highlightNonce?: number;
  hasCursor?: boolean;
}

function SortableSpreadCard({ card, pileId, index, draggingCardId, isSelected, onToggleSelect, onCursorChange, isHighlighted, highlightNonce, hasCursor }: SortableSpreadCardProps) {
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
      onClick={() => { onCursorChange?.(); onToggleSelect(card.id, 'pile', pileId); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {draggingCardId === card.id && (
        <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
      )}
      <div
        ref={setNodeRef}
        style={style}
        data-card-id={card.id}
        className={cn(
          'relative',
          isSelected && 'outline outline-1 outline-primary/30 outline-offset-1 rounded-md transition-transform duration-150',
          hasCursor && 'outline outline-2 outline-white outline-offset-2 rounded-md'
        )}
        {...listeners}
        {...attributes}
        aria-pressed={isSelected}
      >
        {isHighlighted && (
          <div key={highlightNonce} className="last-move-highlight absolute inset-0 rounded-md pointer-events-none" />
        )}
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
  selectionSource?: SelectionSource;
  highlightedMove?: LastMoveHighlight | null;
  cursorCardId?: string;
  shortcutKey?: string;
  onCursorChange?: (index: number) => void;
  chipsEnabled?: boolean;
  chipsInSpread?: number;
}

export function SpreadZone({ pile, sendAction, draggingCardId, className, interactive, selectedIds, onToggleSelect, onSelectAll, selectionSource, highlightedMove, cursorCardId, shortcutKey, onCursorChange, chipsEnabled, chipsInSpread = 0 }: SpreadZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pile-${pile.id}`,
    data: { toZone: 'pile' as const, toId: pile.id },
  });

  // Detect intra-spread card reorder
  const faceUpCards = pile.cards.filter((c): c is Card => 'id' in c);
  const sentinelId = `__sentinel-pile-${pile.id}__`;

  const [chipMoveAmount, setChipMoveAmount] = useState(chipsInSpread);
  const [chipPopoverOpen, setChipPopoverOpen] = useState(false);

  function handleChipPopoverOpenChange(open: boolean) {
    setChipPopoverOpen(open);
    if (open) setChipMoveAmount(chipsInSpread);
  }

  function handleMoveToPot() {
    if (chipsInSpread > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'pot', playerId: pile.ownerId, amount: chipsInSpread });
    }
  }

  function handlePopoverToPot() {
    if (chipMoveAmount > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'pot', playerId: pile.ownerId, amount: chipMoveAmount });
    }
    setChipPopoverOpen(false);
  }

  function handlePopoverToHand() {
    if (chipMoveAmount > 0 && pile.ownerId) {
      sendAction({ type: 'TRANSFER_CHIPS', from: 'spread', to: 'hand', playerId: pile.ownerId, amount: chipMoveAmount });
    }
    setChipPopoverOpen(false);
  }

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
        sendAction({ type: 'REORDER_PILE_SPREAD', pileId: pile.id, orderedCardIds: reordered.map(c => c.id), skipSnapshot: true });
        const newIdx = reordered.findIndex(c => c.id === draggedId);
        if (newIdx !== -1) onCursorChange?.(newIdx);
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
  const hasBet = chipsEnabled && chipsInSpread > 0;
  const isReallyEmpty = isEmpty && !hasBet;

  return (
    <div className="flex flex-col gap-1 zone-hover">
      {selectedIds !== undefined && selectedIds.size >= 2 && selectionSource?.zoneId === pile.id && (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
          {selectedIds.size} selected
        </span>
      )}
      {shortcutKey && (
        <kbd className="text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight self-start">
          {shortcutKey}
        </kbd>
      )}
      <div
        ref={setNodeRef}
        data-testid={`spread-zone-${pile.id}`}
        className={cn(
          isReallyEmpty
            ? isOver
              ? 'min-w-[56px] sm:min-w-[80px] h-[40px] sm:h-[56px] border border-dashed border-primary rounded-lg flex items-center px-2 py-2'
              : 'h-4 border border-dashed border-muted-foreground/30 rounded-md'
            : cn(
                'min-w-[56px] sm:min-w-[80px] rounded-lg border flex items-center px-2 py-3 overflow-x-auto [overflow-y:clip] [overflow-clip-margin:4px] bg-secondary',
                isOver ? 'border-primary' : 'border-border'
              ),
          className
        )}
      >
        {!isReallyEmpty && (
          <>
            {hasBet && (
              <>
                <div className="relative flex-shrink-0 w-[40px] sm:w-[56px] h-[60px] sm:h-[90px] flex items-center justify-center mr-2">
                  <ChipStack amount={chipsInSpread} />
                  <Badge className="absolute -bottom-2 -right-2">{chipsInSpread}</Badge>
                </div>
                <div className="w-px self-stretch bg-border mr-2" />
              </>
            )}
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
                          onCursorChange={onCursorChange ? () => { const idx = faceUpCards.findIndex(c => c.id === (card as Card).id); if (idx !== -1) onCursorChange(idx); } : undefined}
                          isHighlighted={
                            highlightedMove?.toZoneType === "pile" &&
                            highlightedMove.toZoneId === pile.id &&
                            highlightedMove.cardIds.includes((card as Card).id)
                          }
                          highlightNonce={highlightedMove?.nonce}
                          hasCursor={cursorCardId === (card as Card).id}
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
          </>
        )}
      </div>
      {interactive !== false && !isReallyEmpty && (
        <div className="flex gap-1 zone-controls">
          {chipsEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMoveToPot}
                disabled={chipsInSpread === 0}
                className="gap-1"
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416]" aria-hidden />
                <ArrowRight className="w-3 h-3" />
                Pot
              </Button>
              <Popover open={chipPopoverOpen} onOpenChange={handleChipPopoverOpenChange}>
                <PopoverTrigger render={
                  <Button variant="ghost" className="h-7 w-7 p-0" aria-label="More chip actions">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                } />
                <PopoverContent side="bottom" align="start" className="w-48 p-2.5">
                  <div className="flex flex-col gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={chipMoveAmount}
                      onChange={e => setChipMoveAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={handlePopoverToPot}>To pot</Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={handlePopoverToHand}>To hand</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border mx-1 self-center" />
            </>
          )}
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
