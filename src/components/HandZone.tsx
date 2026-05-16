import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff } from 'lucide-react';
import type { Card, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface SortableHandCardProps {
  card: Card;
  playerId: string;
  isDraggingThis: boolean;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
}

function SortableHandCard({ card, playerId, isDraggingThis, index, isSelected, onToggleSelect }: SortableHandCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, fromZone: 'hand' as const, fromId: playerId, toZone: 'hand' as const, toId: playerId },
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
    opacity: isDraggingThis ? 0 : 1,
  };

  return (
    <div
      className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
      onClick={() => onToggleSelect(card.id, 'hand', playerId)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isDraggingThis && (
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

interface HandZoneProps {
  cards: Card[];
  playerId: string;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource: { zone: 'hand' | 'pile'; zoneId: string } | null;
  isRevealed: boolean;
  onToggleReveal: () => void;
}

export function HandZone({ cards, playerId, displayName, connected, sendAction, draggingCardId, selectedIds, onToggleSelect, selectionSource, isRevealed, onToggleReveal }: HandZoneProps) {
  const sentinelId = '__sentinel-hand__';
  const { setNodeRef } = useDroppable({
    id: 'hand',
    data: { toZone: 'hand' as const, toId: playerId },
  });

  const { active, over } = useDndContext();
  const handCardIds = new Set(cards.map(c => c.id));
  const isOver =
    active != null &&
    over != null &&
    (over.id === 'hand' || handCardIds.has(String(over.id)));

  useDndMonitor({
    onDragEnd(event) {
      const over = event.over;
      if (!over) return;
      const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
      const overData = over.data.current as { fromZone?: string; fromId?: string } | undefined;

      const fromHand = activeData?.fromZone === 'hand' && activeData?.fromId === playerId;
      const toSameHand =
        (overData?.fromZone === 'hand' && overData?.fromId === playerId) ||
        over.id === 'hand' ||
        String(over.id) === sentinelId;

      if (fromHand && toSameHand && activeData) {
        const draggedId = activeData.card.id;
        // D-03/D-06 (Phase 21): if the dragged card is part of a multi-selection, move ALL selected cards as a block.
        const isGroupReorder = selectedIds.size > 1 && selectedIds.has(draggedId);

        let reordered: Card[];
        if (isGroupReorder) {
          // D-06: (1) filter selected out, (2) find over-index in remainder, (3) splice selected at that index.
          const selected = cards.filter(c => selectedIds.has(c.id));
          const remainder = cards.filter(c => !selectedIds.has(c.id));
          // Sentinel or unknown → append to end.
          // Direction heuristic: compare the dragged card's original index with the over card's original index.
          // Dragging rightward (originalDragIdx < originalOverIdx) → insert AFTER over; leftward → insert BEFORE.
          // This is stable regardless of cumulative pointer displacement (unlike event.delta.x).
          const originalDragIdx = cards.findIndex(c => c.id === draggedId);
          const originalOverIdx = cards.findIndex(c => c.id === String(over.id));
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
          const activeIdx = cards.findIndex(c => c.id === draggedId);
          // Sentinel drop → move dragged card to the last position.
          const overIdx = String(over.id) === sentinelId
            ? cards.length - 1
            : cards.findIndex(c => c.id === String(over.id));
          if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;
          reordered = arrayMove(cards, activeIdx, overIdx);
        }
        sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
      }
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-4 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">{displayName || 'Player'}</span>
        {selectedIds.size >= 2 && selectionSource?.zone === 'hand' && selectionSource.zoneId === playerId && (
          <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
            {selectedIds.size} selected
          </span>
        )}
        <Button
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onToggleReveal}
          title={isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'}
          aria-label={isRevealed ? 'Hide hand' : 'Show hand'}
          aria-pressed={isRevealed}
        >
          {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>
      <div
        ref={setNodeRef}
        data-testid="hand-zone"
        className={cn(
          'h-[100px] sm:h-[128px] flex items-center px-4 overflow-x-auto bg-card',
          isOver ? 'border-t-2 border-primary' : '',
          isRevealed ? 'ring-1 ring-primary/50 ring-inset' : ''
        )}
      >
        <SortableContext items={[...cards.map(c => c.id), sentinelId]} strategy={horizontalListSortingStrategy}>
          {cards.map((card, index) => (
            <SortableHandCard
              key={card.id}
              card={card}
              playerId={playerId}
              isDraggingThis={draggingCardId === card.id}
              index={index}
              isSelected={selectedIds.has(card.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
          <SortableSentinel id={sentinelId} />
        </SortableContext>
      </div>
    </div>
  );
}
