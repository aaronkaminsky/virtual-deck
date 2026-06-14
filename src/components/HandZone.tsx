import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import type { Card, ClientAction, Suit, Rank, SelectionSource, LastMoveHighlight } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

// --- Sort mode types and constants ---

export type SortMode = 'original' | 'bySuit' | 'byRank';

export const SORT_CYCLE: SortMode[] = ['original', 'bySuit', 'byRank'];

const SUIT_ORDER: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];

const RANK_ORDER: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// --- Pure sort helpers (exported for tests) ---

export function sortCards(cards: Card[], mode: 'bySuit' | 'byRank'): Card[] {
  return [...cards].sort((a, b) => {
    if (mode === 'bySuit') {
      const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    } else {
      // byRank: rank primary, suit secondary
      const rankDiff = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
      if (rankDiff !== 0) return rankDiff;
      return SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    }
  });
}

// --- Tooltip copy per D-06 ---

const SORT_TITLES: Record<SortMode, string> = {
  original: 'Sort: Original order — click for By Suit',
  bySuit: 'Sort: By suit (♠ ♣ ♦ ♥) — click for By Rank',
  byRank: 'Sort: By rank (2→A) — click for Original order',
};

const SORT_ARIA_LABELS: Record<SortMode, string> = {
  original: 'Sort hand — current: Original order',
  bySuit: 'Sort hand — current: By suit',
  byRank: 'Sort hand — current: By rank',
};

// --- Sub-components ---

interface SortableHandCardProps {
  card: Card;
  playerId: string;
  isDraggingThis: boolean;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  onCursorChange?: (index: number) => void;
  isHighlighted: boolean;
  highlightNonce?: number;
  hasCursor?: boolean;
}

function SortableHandCard({ card, playerId, isDraggingThis, index, isSelected, onToggleSelect, onCursorChange, isHighlighted, highlightNonce, hasCursor }: SortableHandCardProps) {
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
      className={cn('relative w-[40px] h-[60px] sm:w-[60px] sm:h-[90px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
      onClick={() => { onCursorChange?.(index); onToggleSelect(card.id, 'hand', playerId); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isDraggingThis && (
        <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
      )}
      <div
        ref={setNodeRef}
        style={style}
        data-card-id={card.id}
        className={cn(
          'relative',
          isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-md transition-transform duration-150',
          hasCursor && 'outline outline-2 outline-white outline-offset-1 rounded-md'
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

interface HandZoneProps {
  cards: Card[];
  playerId: string;
  displayName: string;
  connected: boolean;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, zone: 'hand' | 'pile', zoneId: string) => void;
  selectionSource: SelectionSource;
  isRevealed: boolean;
  onToggleReveal: () => void;
  highlightedMove?: LastMoveHighlight | null;
  cursorCardId?: string;
  shortcutKey?: string;
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  onCursorChange?: (index: number) => void;
}

export function HandZone({ cards, playerId, displayName, connected, sendAction, draggingCardId, selectedIds, onToggleSelect, selectionSource, isRevealed, onToggleReveal, highlightedMove, cursorCardId, shortcutKey, sortMode, setSortMode, onCursorChange }: HandZoneProps) {
  const sentinelId = '__sentinel-hand__';
  const { setNodeRef } = useDroppable({
    id: 'hand',
    data: { toZone: 'hand' as const, toId: playerId },
  });


  const { active, over } = useDndContext();
  const isOver =
    active != null &&
    over != null &&
    over.id === 'hand';

  // Render-time visual sort: applied every render when a non-original mode is active.
  // This keeps the hand sorted visually without re-dispatching on every server update.
  const displayedCards = sortMode === 'original' ? cards : sortCards(cards, sortMode);

  function handleSort() {
    const nextMode = SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length];
    // Sort is render-time only (D-01) — displayedCards recomputes on next render.
    setSortMode(nextMode);
  }

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
          // Operate on displayedCards so indices match what the user sees.
          const selected = displayedCards.filter(c => selectedIds.has(c.id));
          const remainder = displayedCards.filter(c => !selectedIds.has(c.id));
          // Sentinel or unknown → append to end.
          // Direction heuristic: compare the dragged card's original index with the over card's original index.
          // Dragging rightward (originalDragIdx < originalOverIdx) → insert AFTER over; leftward → insert BEFORE.
          const originalDragIdx = displayedCards.findIndex(c => c.id === draggedId);
          const originalOverIdx = displayedCards.findIndex(c => c.id === String(over.id));
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
          // Operate on displayedCards so drag indices match visual positions.
          const activeIdx = displayedCards.findIndex(c => c.id === draggedId);
          // Sentinel drop → move dragged card to the last position.
          const overIdx = String(over.id) === sentinelId
            ? displayedCards.length - 1
            : displayedCards.findIndex(c => c.id === String(over.id));
          if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;
          reordered = arrayMove(displayedCards, activeIdx, overIdx);
        }
        // Drag-reorder: deliberate choice to clear sortMode so the manual drag order wins.
        // If we left sortMode active, the next render would re-apply the visual sort on top
        // of the newly dispatched server order, making the drag appear to "undo" itself.
        if (sortMode !== 'original') {
          setSortMode('original');
        }
        sendAction({ type: 'REORDER_HAND', orderedCardIds: reordered.map(c => c.id) });
        const newIdx = reordered.findIndex(c => c.id === draggedId);
        if (newIdx !== -1) onCursorChange?.(newIdx);
      }
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-4 mb-1">
        <span className={cn('rounded-full inline-block w-2 h-2', connected ? 'bg-green-500' : 'bg-gray-500')} />
        <span className="text-sm text-muted-foreground">
          {displayName || 'Player'}
          {shortcutKey && (
            <kbd className="ml-1 inline-flex items-center text-[10px] bg-primary text-primary-foreground rounded px-1 font-mono uppercase leading-tight">
              {shortcutKey}
            </kbd>
          )}
        </span>
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
        <Button
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleSort}
          title={SORT_TITLES[sortMode]}
          aria-label={SORT_ARIA_LABELS[sortMode]}
        >
          <ArrowUpDown className={cn('w-4 h-4', sortMode !== 'original' ? 'text-primary' : 'text-muted-foreground')} />
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
        <SortableContext items={[...displayedCards.map(c => c.id), sentinelId]} strategy={horizontalListSortingStrategy}>
          {displayedCards.map((card, index) => (
            <SortableHandCard
              key={card.id}
              card={card}
              playerId={playerId}
              isDraggingThis={draggingCardId === card.id}
              index={index}
              isSelected={selectedIds.has(card.id)}
              onToggleSelect={onToggleSelect}
              onCursorChange={onCursorChange}
              isHighlighted={
                highlightedMove?.toZoneType === "hand" &&
                highlightedMove.toZoneId === playerId &&
                highlightedMove.cardIds.includes(card.id)
              }
              highlightNonce={highlightedMove?.nonce}
              hasCursor={cursorCardId === card.id}
            />
          ))}
          <SortableSentinel id={sentinelId} />
        </SortableContext>
      </div>
    </div>
  );
}
