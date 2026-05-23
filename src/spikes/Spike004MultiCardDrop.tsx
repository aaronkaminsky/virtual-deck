import { useState, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CardFace } from '@/components/CardFace';
import type { Card } from '@/shared/types';

interface CanvasCard {
  card: Card;
  x: number;
  y: number;
  z: number;
}

const INITIAL_CARDS: CanvasCard[] = [
  { card: { id: 'A-s',  suit: 'spades',   rank: 'A',  faceUp: true }, x: 60,  y: 80,  z: 1  },
  { card: { id: 'K-h',  suit: 'hearts',   rank: 'K',  faceUp: true }, x: 180, y: 60,  z: 2  },
  { card: { id: 'Q-d',  suit: 'diamonds', rank: 'Q',  faceUp: true }, x: 300, y: 80,  z: 3  },
  { card: { id: 'J-c',  suit: 'clubs',    rank: 'J',  faceUp: true }, x: 420, y: 60,  z: 4  },
  { card: { id: '10-h', suit: 'hearts',   rank: '10', faceUp: true }, x: 540, y: 80,  z: 5  },
  { card: { id: '9-s',  suit: 'spades',   rank: '9',  faceUp: true }, x: 660, y: 60,  z: 6  },
  // Resting cards lower on canvas to drop onto
  { card: { id: '8-d',  suit: 'diamonds', rank: '8',  faceUp: true }, x: 150, y: 260, z: 7  },
  { card: { id: '7-c',  suit: 'clubs',    rank: '7',  faceUp: true }, x: 400, y: 270, z: 8  },
  { card: { id: '6-h',  suit: 'hearts',   rank: '6',  faceUp: true }, x: 620, y: 255, z: 9  },
];

const CARD_W = 63;
const CARD_H = 88;
const STACK_SHADOW = '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db';

function coversMajority(top: { x: number; y: number }, bottom: CanvasCard) {
  const overlapW = Math.max(0, Math.min(top.x + CARD_W, bottom.x + CARD_W) - Math.max(top.x, bottom.x));
  const overlapH = Math.max(0, Math.min(top.y + CARD_H, bottom.y + CARD_H) - Math.max(top.y, bottom.y));
  return overlapW * overlapH > CARD_W * CARD_H * 0.5;
}

interface DraggableCardProps {
  cc: CanvasCard;
  isSelected: boolean;
  isDragHandle: boolean;
  coversAnother: boolean;
  onToggleSelect: (id: string) => void;
}

function DraggableCard({ cc, isSelected, isDragHandle, coversAnother, onToggleSelect }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cc.card.id,
    data: { cc },
  });

  // Track whether a drag occurred so onClick doesn't fire a selection toggle after a drag.
  // Mirrors the pattern in src/components/DraggableCard.tsx.
  const didDragRef = useRef(false);
  const prevIsDragging = useRef(false);
  useEffect(() => {
    if (prevIsDragging.current && !isDragging) {
      setTimeout(() => { didDragRef.current = false; }, 300);
    }
    if (isDragging) didDragRef.current = true;
    prevIsDragging.current = isDragging;
  }, [isDragging]);

  function handleClick() {
    if (didDragRef.current) return;
    onToggleSelect(cc.card.id);
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: cc.x,
        top: cc.y,
        zIndex: isDragHandle ? 999 : cc.z,
        opacity: isDragging ? 0 : 1,
        touchAction: 'none',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isSelected
          ? `0 0 0 2px #60a5fa, 0 0 0 4px rgba(96,165,250,0.3)${coversAnother ? `, ${STACK_SHADOW}` : ''}`
          : coversAnother ? STACK_SHADOW : undefined,
        borderRadius: isSelected || coversAnother ? 6 : undefined,
      }}
    >
      <CardFace card={cc.card} />
    </div>
  );
}

export function Spike004MultiCardDrop() {
  // Distance constraint: drag only activates after 8px movement, so plain clicks
  // never trigger isDragging and selection toggle works cleanly via onClick.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [cards, setCards] = useState<CanvasCard[]>(INITIAL_CARDS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const activeCard = cards.find(c => c.card.id === activeCardId) ?? null;

  // All cards moving as a group: the handle + any other selected cards
  const groupIds = useMemo(() => {
    if (!activeCardId) return new Set<string>();
    const ids = new Set(selectedIds);
    ids.add(activeCardId);
    return ids;
  }, [activeCardId, selectedIds]);

  const coveringIds = useMemo(() => {
    const ids = new Set<string>();
    for (const card of cards) {
      if (cards.some(other => other.z < card.z && coversMajority(card, other))) {
        ids.add(card.card.id);
      }
    }
    return ids;
  }, [cards]);

  const dragOverlapsAnother = useMemo(() => {
    if (!activeCard || !dragDelta) return false;
    const draggedPos = { x: activeCard.x + dragDelta.x, y: activeCard.y + dragDelta.y };
    return cards.some(c => !groupIds.has(c.card.id) && coversMajority(draggedPos, c));
  }, [activeCard, dragDelta, cards, groupIds]);

  function addLog(msg: string) {
    setLog(prev => [msg, ...prev].slice(0, 8));
  }

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(event.active.id as string);
    setDragDelta({ x: 0, y: 0 });
    const isGroup = selectedIds.size > 0;
    const cc = cards.find(c => c.card.id === event.active.id);
    const total = isGroup ? selectedIds.size + (selectedIds.has(event.active.id as string) ? 0 : 1) : 1;
    addLog(`drag start: ${cc?.card.rank}${cc?.card.suit[0]} — moving ${total} card${total > 1 ? 's' : ''}`);
  }

  function handleDragMove(event: DragMoveEvent) {
    setDragDelta({ x: event.delta.x, y: event.delta.y });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    const activeId = active.id as string;

    // Build the full group: handle + selected cards
    const movingIds = new Set(selectedIds);
    movingIds.add(activeId);

    setCards(prev => {
      const maxZ = Math.max(...prev.map(c => c.z));
      // Sort moving cards by their current z to preserve internal order
      const movingCards = prev
        .filter(c => movingIds.has(c.card.id))
        .sort((a, b) => a.z - b.z);

      return prev.map(c => {
        if (!movingIds.has(c.card.id)) return c;
        const rank = movingCards.findIndex(m => m.card.id === c.card.id);
        return { ...c, x: c.x + delta.x, y: c.y + delta.y, z: maxZ + 1 + rank };
      });
    });

    addLog(`dropped: group of ${movingIds.size} — z-order preserved, now on top`);
    setActiveCardId(null);
    setDragDelta(null);
    setSelectedIds(new Set());
  }

  function handleDragCancel() {
    addLog(`cancelled — group returned to origin`);
    setActiveCardId(null);
    setDragDelta(null);
  }

  function handleReset() {
    setCards(INITIAL_CARDS);
    setSelectedIds(new Set());
    setLog([]);
  }

  // Ghost cards for passengers (non-handle selected cards) during drag
  const passengerGhosts = useMemo(() => {
    if (!activeCard || !dragDelta) return [];
    return cards.filter(c => c.card.id !== activeCardId && groupIds.has(c.card.id));
  }, [activeCard, dragDelta, cards, activeCardId, groupIds]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-white text-sm font-medium tracking-wide opacity-70">
        Spike 004 — Multi-Card Group Drop
      </div>
      <div className="text-white/50 text-xs text-center">
        Click cards to select (blue ring) · Drag any selected card to move the group · Click again to deselect
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <div
          style={{
            position: 'relative',
            width: 800,
            height: 380,
            background: 'radial-gradient(ellipse at center, #1a6b3c 0%, #124d2b 100%)',
            borderRadius: 12,
            border: '2px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          {cards.map(cc => (
            <DraggableCard
              key={cc.card.id}
              cc={cc}
              isSelected={selectedIds.has(cc.card.id) || cc.card.id === activeCardId}
              isDragHandle={cc.card.id === activeCardId}
              coversAnother={coveringIds.has(cc.card.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}

          {/* Passenger ghosts — follow the drag handle at same delta */}
          {passengerGhosts.map(cc => (
            <div
              key={`ghost-${cc.card.id}`}
              style={{
                position: 'absolute',
                left: cc.x + (dragDelta?.x ?? 0),
                top: cc.y + (dragDelta?.y ?? 0),
                zIndex: 998,
                opacity: 0.5,
                pointerEvents: 'none',
                boxShadow: dragOverlapsAnother ? STACK_SHADOW : undefined,
                borderRadius: dragOverlapsAnother ? 6 : undefined,
              }}
            >
              <CardFace card={cc.card} />
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div style={{
              opacity: 0.5,
              transform: 'scale(1.05)',
              cursor: 'grabbing',
              boxShadow: dragOverlapsAnother ? STACK_SHADOW : undefined,
              borderRadius: dragOverlapsAnother ? 6 : undefined,
            }}>
              <CardFace card={activeCard.card} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="w-[800px] bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 min-h-[80px]">
        <div className="text-white/30 mb-1">
          selected: {selectedIds.size === 0 ? 'none' : [...selectedIds].join(', ')}
        </div>
        {log.length === 0 ? (
          <span className="text-white/30">drag events will appear here…</span>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.15 }}>{entry}</div>
          ))
        )}
      </div>

      <button onClick={handleReset} className="text-white/50 hover:text-white/80 text-xs underline transition-colors">
        Reset
      </button>
    </div>
  );
}
