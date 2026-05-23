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

// Three scenarios laid out deliberately for testing:
//   Left:   partial overlap — lower card's edge is clearly exposed
//   Center: ~80% overlap — only a sliver of lower card is visible
//   Right:  full overlap + a third card beneath — stacked 3 deep
const INITIAL_CARDS: CanvasCard[] = [
  // Partial overlap (left)
  { card: { id: 'A-s', suit: 'spades',   rank: 'A', faceUp: true }, x: 60,  y: 120, z: 1 },
  { card: { id: 'K-h', suit: 'hearts',   rank: 'K', faceUp: true }, x: 100, y: 100, z: 2 },

  // Heavy overlap — only sliver visible (center)
  { card: { id: 'Q-d', suit: 'diamonds', rank: 'Q', faceUp: true }, x: 330, y: 120, z: 3 },
  { card: { id: 'J-c', suit: 'clubs',    rank: 'J', faceUp: true }, x: 338, y: 108, z: 4 },

  // 3-deep stack (right)
  { card: { id: '10-h', suit: 'hearts',  rank: '10', faceUp: true }, x: 590, y: 130, z: 5 },
  { card: { id: '9-s',  suit: 'spades',  rank: '9',  faceUp: true }, x: 596, y: 116, z: 6 },
  { card: { id: '8-d',  suit: 'diamonds',rank: '8',  faceUp: true }, x: 602, y: 102, z: 7 },

  // Free cards for drop-target opacity testing
  { card: { id: '7-c', suit: 'clubs',    rank: '7', faceUp: true }, x: 200, y: 270, z: 8 },
  { card: { id: '6-h', suit: 'hearts',   rank: '6', faceUp: true }, x: 420, y: 270, z: 9 },
  { card: { id: '5-s', suit: 'spades',   rank: '5', faceUp: true }, x: 640, y: 270, z: 10 },
];

const CARD_W = 63;
const CARD_H = 88;
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

export function Spike002OverlapHitTesting() {
  const [cards, setCards] = useState<CanvasCard[]>(INITIAL_CARDS);
  const [activeCard, setActiveCard] = useState<CanvasCard | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);

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
    return cards.some(other => other.card.id !== activeCard.card.id && coversMajority(draggedPos, other));
  }, [activeCard, dragDelta, cards]);

  function addLog(msg: string) {
    setLog(prev => [msg, ...prev].slice(0, 8));
  }

  function handleDragStart(event: DragStartEvent) {
    const cc = cards.find(c => c.card.id === event.active.id) ?? null;
    setActiveCard(cc);
    setDragDelta({ x: 0, y: 0 });
    const rank = cc?.card.rank ?? '?';
    const suit = cc?.card.suit[0] ?? '?';
    const z = cc?.z ?? 0;
    addLog(`grabbed: ${rank}${suit} (z=${z})`);
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
    if (moved) addLog(`dropped: ${moved.card.rank}${moved.card.suit[0]} → now on top`);
  }

  function handleDragCancel() {
    const card = activeCard;
    setActiveCard(null);
    setDragDelta(null);
    addLog(`cancelled: ${card?.card.rank}${card?.card.suit[0]} returned`);
  }

  function handleReset() {
    setCards(INITIAL_CARDS);
    setLog([]);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-white text-sm font-medium tracking-wide opacity-70">
        Spike 002 — Overlap Hit Testing
      </div>

      {/* Scenario labels */}
      <div className="flex gap-0 text-white/40 text-xs" style={{ width: 800 }}>
        <div style={{ width: 260, paddingLeft: 60 }}>partial overlap</div>
        <div style={{ width: 260, paddingLeft: 50 }}>heavy overlap (~80%)</div>
        <div style={{ width: 280, paddingLeft: 60 }}>3-deep stack</div>
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
          {/* Dividers between scenarios */}
          <div style={{ position: 'absolute', left: 265, top: 20, bottom: 20, width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', left: 532, top: 20, bottom: 20, width: 1, background: 'rgba(255,255,255,0.06)' }} />

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

      <div className="w-[800px] bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 min-h-[72px]">
        <div className="text-white/30 mb-1">
          Try: click the exposed edge of a buried card · drag over a free card to see shadow · check 3-deep stack
        </div>
        {log.map((entry, i) => (
          <div key={i} style={{ opacity: 1 - i * 0.12 }}>{entry}</div>
        ))}
      </div>

      <button onClick={handleReset} className="text-white/50 hover:text-white/80 text-xs underline transition-colors">
        Reset positions
      </button>
    </div>
  );
}
