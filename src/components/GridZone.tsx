import { useDroppable, useDraggable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card, MaskedCard, ClientPile, ClientAction } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

const COLS = 7;
const ROWS = 2;

function buildCellMap(
  cards: (Card | MaskedCard)[],
  gridPositions: Record<string, { row: number; col: number }> | undefined
): Map<string, Card[]> {
  const map = new Map<string, Card[]>();
  for (const card of cards) {
    if (!('id' in card)) continue; // skip MaskedCard entries
    const pos = gridPositions?.[card.id] ?? { row: 0, col: 0 };
    const key = `${pos.row},${pos.col}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(card as Card);
  }
  return map;
}

interface GridCellProps {
  row: number;
  col: number;
  pileId: string;
  cellCards: Card[];
  draggingCardId: string | null;
  sendAction: (action: ClientAction) => void;
  pileIsFaceUp: boolean;
}

function GridCell({ row, col, pileId, cellCards, draggingCardId, pileIsFaceUp }: GridCellProps) {
  const cellId = `grid-cell-${row}-${col}-${pileId}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: cellId,
    data: { toZone: 'pile' as const, toId: pileId, toRow: row, toCol: col },
  });

  const topCard = cellCards.length > 0 ? cellCards[cellCards.length - 1] : null;
  const isDraggingTopCard = !!draggingCardId && !!topCard && draggingCardId === topCard.id;

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: topCard?.id ?? `empty-${cellId}`,
    disabled: topCard === null,
    data: topCard
      ? { card: topCard, fromZone: 'pile' as const, fromId: pileId, fromRow: row, fromCol: col }
      : undefined,
  });

  function setRefs(el: HTMLElement | null) {
    setDropRef(el);
    if (topCard !== null) setDragRef(el);
  }

  const cardStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
  };

  const showCard = topCard !== null && !isDraggingTopCard;
  const showPlaceholder = isDraggingTopCard || isDragging;
  const cardIsFaceUp = topCard?.faceUp ?? pileIsFaceUp;

  return (
    <div
      ref={setDropRef}
      className={cn(
        'relative w-14 h-[79px] sm:w-20 sm:h-[112px] border rounded-md bg-secondary',
        isOver ? 'border-primary' : 'border-border',
        topCard === null ? 'border-dashed' : ''
      )}
    >
      {showPlaceholder && (
        <div className="absolute inset-0 rounded-md border-2 border-dashed border-muted-foreground" />
      )}
      {showCard && topCard !== null && (
        <div
          ref={setDragRef}
          style={cardStyle}
          {...listeners}
          {...attributes}
        >
          {cardIsFaceUp ? <CardFace card={topCard} /> : <CardBack />}
        </div>
      )}
      {cellCards.length > 1 && (
        <Badge className="absolute -bottom-2 -right-2">×{cellCards.length}</Badge>
      )}
    </div>
  );
}

interface GridZoneProps {
  pile: ClientPile;
  sendAction: (action: ClientAction) => void;
  draggingCardId: string | null;
  interactive?: boolean;
}

export function GridZone({ pile, sendAction, draggingCardId, interactive }: GridZoneProps) {
  const cellMap = buildCellMap(pile.cards, pile.gridPositions);

  useDndMonitor({
    onDragEnd(event) {
      const over = event.over;
      if (!over) return;
      const activeData = event.active.data.current as { card: Card; fromZone: string; fromId: string } | undefined;
      const overData = over.data.current as { toId?: string; toRow?: number; toCol?: number } | undefined;

      const fromGrid = activeData?.fromZone === 'pile' && activeData?.fromId === pile.id;
      const toGrid = overData?.toId === pile.id && overData?.toRow !== undefined;

      if (fromGrid && toGrid && activeData) {
        sendAction({
          type: 'MOVE_GRID_CARD',
          cardId: activeData.card.id,
          pileId: pile.id,
          toRow: overData!.toRow!,
          toCol: overData!.toCol!,
        });
      }
    },
  });

  function handleToggleFace() {
    sendAction({ type: 'SET_PILE_FACE', pileId: pile.id, faceUp: !(pile.faceUp !== false) });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground">Play Area</span>
      </div>
      <div data-testid="grid-zone-play" className="grid grid-cols-4 sm:grid-cols-7 gap-1">
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => (
            <GridCell
              key={`${row},${col}`}
              row={row}
              col={col}
              pileId={pile.id}
              cellCards={cellMap.get(`${row},${col}`) ?? []}
              draggingCardId={draggingCardId}
              sendAction={sendAction}
              pileIsFaceUp={pile.faceUp !== false}
            />
          ))
        )}
      </div>
      {interactive !== false && (
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
        </div>
      )}
    </div>
  );
}
