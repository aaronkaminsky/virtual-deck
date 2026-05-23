import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  useDraggable,
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
  { card: { id: 'A-s', suit: 'spades',   rank: 'A',  faceUp: true }, x: 60,  y: 60,  z: 1 },
  { card: { id: 'K-h', suit: 'hearts',   rank: 'K',  faceUp: true }, x: 180, y: 40,  z: 2 },
  { card: { id: 'Q-d', suit: 'diamonds', rank: 'Q',  faceUp: true }, x: 140, y: 130, z: 3 },
  { card: { id: 'J-c', suit: 'clubs',    rank: 'J',  faceUp: true }, x: 320, y: 80,  z: 4 },
  { card: { id: '10-h',suit: 'hearts',   rank: '10', faceUp: true }, x: 440, y: 55,  z: 5 },
  { card: { id: '9-s', suit: 'spades',   rank: '9',  faceUp: true }, x: 390, y: 170, z: 6 },
  { card: { id: '8-d', suit: 'diamonds', rank: '8',  faceUp: true }, x: 560, y: 100, z: 7 },
  { card: { id: '7-c', suit: 'clubs',    rank: '7',  faceUp: true }, x: 680, y: 60,  z: 8 },
  { card: { id: '6-h', suit: 'hearts',   rank: '6',  faceUp: true }, x: 620, y: 200, z: 9 },
  { card: { id: '5-s', suit: 'spades',   rank: '5',  faceUp: true }, x: 240, y: 230, z: 10 },
];

const CARD_W = 63;
const CARD_H = 88;
// Single-layer shadow: one card back peeking out beneath
const STACK_SHADOW = '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db';

function coversMajority(top: { x: number; y: number }, bottom: CanvasCard) {
  const overlapW = Math.max(0, Math.min(top.x + CARD_W, bottom.x + CARD_W) - Math.max(top.x, bottom.x));
  const overlapH = Math.max(0, Math.min(top.y + CARD_H, bottom.y + CARD_H) - Math.max(top.y, bottom.y));
  return overlapW * overlapH > CARD_W * CARD_H * 0.5;
}

function FreeDraggableCard({ cc, coversAnother }: { cc: CanvasCard; coversAnother: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cc.card.id,
    data: { cc },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        left: cc.x,
        top: cc.y,
        zIndex: cc.z,
        opacity: isDragging ? 0 : 1,
        touchAction: 'none',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: coversAnother ? STACK_SHADOW : undefined,
        borderRadius: coversAnother ? 6 : undefined,
      }}
    >
      <CardFace card={cc.card} />
    </div>
  );
}

export function Spike001FreeDrag() {
  const [cards, setCards] = useState<CanvasCard[]>(INITIAL_CARDS);
  const [activeCard, setActiveCard] = useState<CanvasCard | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // Shadow on stationary cards that are covering a lower-z card spatially.
  const coveringIds = useMemo(() => {
    const ids = new Set<string>();
    for (const card of cards) {
      if (cards.some(other => other.z < card.z && coversMajority(card, other))) {
        ids.add(card.card.id);
      }
    }
    return ids;
  }, [cards]);

  // Shadow on DragOverlay when the dragged card's current position overlaps any stationary card.
  const dragOverlapsAnother = useMemo(() => {
    if (!activeCard || !dragDelta) return false;
    const draggedPos = { x: activeCard.x + dragDelta.x, y: activeCard.y + dragDelta.y };
    return cards.some(other => other.card.id !== activeCard.card.id && coversMajority(draggedPos, other));
  }, [activeCard, dragDelta, cards]);

  function addLog(msg: string) {
    setLog(prev => [msg, ...prev].slice(0, 6));
  }

  function handleDragStart(event: DragStartEvent) {
    const cc = cards.find(c => c.card.id === event.active.id) ?? null;
    setActiveCard(cc);
    setDragDelta({ x: 0, y: 0 });
    addLog(`grab: ${cc?.card.rank}${cc?.card.suit[0]} at (${Math.round(cc?.x ?? 0)}, ${Math.round(cc?.y ?? 0)})`);
  }

  function handleDragMove(event: DragMoveEvent) {
    setDragDelta({ x: event.delta.x, y: event.delta.y });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    setActiveCard(null);
    setDragDelta(null);
    setCards(prev => {
      const maxZ = Math.max(...prev.map(c => c.z));
      return prev.map(c =>
        c.card.id === active.id
          ? { ...c, x: c.x + delta.x, y: c.y + delta.y, z: maxZ + 1 }
          : c
      );
    });
    const moved = cards.find(c => c.card.id === active.id);
    if (moved) {
      addLog(`drop: ${moved.card.rank}${moved.card.suit[0]} → (${Math.round(moved.x + delta.x)}, ${Math.round(moved.y + delta.y)}) [now on top]`);
    }
  }

  function handleDragCancel() {
    const card = activeCard;
    setActiveCard(null);
    setDragDelta(null);
    addLog(`cancel: ${card?.card.rank}${card?.card.suit[0]} returned to origin`);
  }

  function handleReset() {
    setCards(INITIAL_CARDS);
    setLog([]);
    addLog('reset to initial positions');
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-white text-sm font-medium tracking-wide opacity-70">
        Spike 001 — Free Drag Positioning
      </div>

      <div className="text-white/50 text-xs text-center">
        Drag cards freely · Press <kbd className="bg-white/10 px-1 rounded">Esc</kbd> to cancel · Dropped card lands on top
      </div>

      <DndContext
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
            <FreeDraggableCard key={cc.card.id} cc={cc} coversAnother={coveringIds.has(cc.card.id)} />
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
        {log.length === 0 ? (
          <span className="text-white/30">drag events will appear here…</span>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.15 }}>{entry}</div>
          ))
        )}
      </div>

      <button
        onClick={handleReset}
        className="text-white/50 hover:text-white/80 text-xs underline transition-colors"
      >
        Reset positions
      </button>
    </div>
  );
}
