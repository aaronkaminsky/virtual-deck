import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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

// Canvas is larger than the viewport — cards spill off edges deliberately
const CANVAS_W = 1400;
const CANVAS_H = 700;
const CARD_W = 63;
const CARD_H = 88;
const PAN_STEP = 8; // px per interval tick
const PAN_INTERVAL = 16; // ~60fps

const INITIAL_CARDS: CanvasCard[] = [
  { card: { id: 'A-s',  suit: 'spades',   rank: 'A',  faceUp: true }, x: 80,   y: 80,   z: 1  },
  { card: { id: 'K-h',  suit: 'hearts',   rank: 'K',  faceUp: true }, x: 300,  y: 60,   z: 2  },
  { card: { id: 'Q-d',  suit: 'diamonds', rank: 'Q',  faceUp: true }, x: 520,  y: 90,   z: 3  },
  { card: { id: 'J-c',  suit: 'clubs',    rank: 'J',  faceUp: true }, x: 750,  y: 70,   z: 4  },
  { card: { id: '10-h', suit: 'hearts',   rank: '10', faceUp: true }, x: 980,  y: 85,   z: 5  },
  { card: { id: '9-s',  suit: 'spades',   rank: '9',  faceUp: true }, x: 1200, y: 75,   z: 6  }, // off right
  { card: { id: '8-d',  suit: 'diamonds', rank: '8',  faceUp: true }, x: 150,  y: 300,  z: 7  },
  { card: { id: '7-c',  suit: 'clubs',    rank: '7',  faceUp: true }, x: 600,  y: 320,  z: 8  },
  { card: { id: '6-h',  suit: 'hearts',   rank: '6',  faceUp: true }, x: 1100, y: 310,  z: 9  }, // off right
  { card: { id: '5-s',  suit: 'spades',   rank: '5',  faceUp: true }, x: 200,  y: 560,  z: 10 }, // off bottom
  { card: { id: '4-d',  suit: 'diamonds', rank: '4',  faceUp: true }, x: 700,  y: 580,  z: 11 }, // off bottom
  { card: { id: '3-c',  suit: 'clubs',    rank: '3',  faceUp: true }, x: 1300, y: 580,  z: 12 }, // off right + bottom
];

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

type PanDir = 'left' | 'right' | 'up' | 'down';

interface EdgeArrowProps {
  dir: PanDir;
  visible: boolean;
  onPanStart: (dir: PanDir) => void;
  onPanEnd: () => void;
}

function EdgeArrow({ dir, visible, onPanStart, onPanEnd }: EdgeArrowProps) {
  if (!visible) return null;

  const label = '‹';
  const rotate = { left: '0deg', right: '180deg', up: '90deg', down: '270deg' }[dir];

  const posStyle: React.CSSProperties =
    dir === 'left'  ? { left: 0, top: '50%', transform: 'translateY(-50%)' } :
    dir === 'right' ? { right: 0, top: '50%', transform: 'translateY(-50%)' } :
    dir === 'up'    ? { top: 0, left: '50%', transform: 'translateX(-50%)' } :
                      { bottom: 0, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
      onPointerUp={onPanEnd}
      onPointerLeave={onPanEnd}
      style={{
        position: 'absolute',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dir === 'left' || dir === 'right' ? 32 : 80,
        height: dir === 'left' || dir === 'right' ? 80 : 32,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
        borderRadius: 6,
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        ...posStyle,
      }}
    >
      <span style={{
        color: 'white',
        fontSize: 20,
        lineHeight: 1,
        display: 'block',
        transform: `rotate(${rotate})`,
        opacity: 0.9,
      }}>
        {label}
      </span>
    </div>
  );
}

export function Spike003EdgePan() {
  const [cards, setCards] = useState<CanvasCard[]>(INITIAL_CARDS);
  const [activeCard, setActiveCard] = useState<CanvasCard | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scroll, setScroll] = useState({ x: 0, y: 0 });

  // Overflow detection: which edges have content beyond the viewport?
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 400 });
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const hasOverflow = {
    left:  scroll.x > 0,
    right: scroll.x < CANVAS_W - viewportSize.w,
    up:    scroll.y > 0,
    down:  scroll.y < CANVAS_H - viewportSize.h,
  };

  const stopPan = useCallback(() => {
    if (panIntervalRef.current) {
      clearInterval(panIntervalRef.current);
      panIntervalRef.current = null;
    }
  }, []);

  const startPan = useCallback((dir: PanDir) => {
    stopPan();
    panIntervalRef.current = setInterval(() => {
      setScroll(prev => {
        const dx = dir === 'left' ? -PAN_STEP : dir === 'right' ? PAN_STEP : 0;
        const dy = dir === 'up'   ? -PAN_STEP : dir === 'down'  ? PAN_STEP : 0;
        return {
          x: Math.max(0, Math.min(CANVAS_W - viewportSize.w, prev.x + dx)),
          y: Math.max(0, Math.min(CANVAS_H - viewportSize.h, prev.y + dy)),
        };
      });
    }, PAN_INTERVAL);
  }, [stopPan, viewportSize]);

  // Clean up on unmount
  useEffect(() => () => stopPan(), [stopPan]);

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
    setLog(prev => [msg, ...prev].slice(0, 6));
  }

  function handleDragStart(event: DragStartEvent) {
    const cc = cards.find(c => c.card.id === event.active.id) ?? null;
    setActiveCard(cc);
    setDragDelta({ x: 0, y: 0 });
    addLog(`grabbed: ${cc?.card.rank}${cc?.card.suit[0]}`);
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
    addLog(`dropped: ${cards.find(c => c.card.id === active.id)?.card.rank ?? '?'} — now on top`);
  }

  function handleDragCancel() {
    const card = activeCard;
    setActiveCard(null);
    setDragDelta(null);
    addLog(`cancelled: ${card?.card.rank}${card?.card.suit[0]} returned`);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-white text-sm font-medium tracking-wide opacity-70">
        Spike 003 — Mobile Edge Pan
      </div>
      <div className="text-white/50 text-xs text-center">
        Hold an edge arrow to pan · Drag cards as normal · Arrows appear only when content overflows that edge
      </div>

      {/* Scrollable viewport — fixed window onto the larger canvas */}
      <div
        ref={viewportRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 800,
          height: 400,
          overflow: 'hidden',
          borderRadius: 12,
          border: '2px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        <DndContext
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          {/* Canvas — panned via transform */}
          <div
            style={{
              position: 'absolute',
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `translate(${-scroll.x}px, ${-scroll.y}px)`,
              background: 'radial-gradient(ellipse at 40% 40%, #1a6b3c 0%, #124d2b 100%)',
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

          {/* Edge arrows — rendered inside viewport, outside DndContext canvas */}
          <EdgeArrow dir="left"  visible={hasOverflow.left}  onPanStart={startPan} onPanEnd={stopPan} />
          <EdgeArrow dir="right" visible={hasOverflow.right} onPanStart={startPan} onPanEnd={stopPan} />
          <EdgeArrow dir="up"    visible={hasOverflow.up}    onPanStart={startPan} onPanEnd={stopPan} />
          <EdgeArrow dir="down"  visible={hasOverflow.down}  onPanStart={startPan} onPanEnd={stopPan} />
        </DndContext>
      </div>

      {/* Scroll position indicator */}
      <div className="text-white/30 text-xs font-mono">
        scroll: ({Math.round(scroll.x)}, {Math.round(scroll.y)}) · canvas: {CANVAS_W}×{CANVAS_H}
      </div>

      <div className="w-full max-w-[800px] bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 min-h-[72px]">
        {log.length === 0 ? (
          <span className="text-white/30">pan and drag events will appear here…</span>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.15 }}>{entry}</div>
          ))
        )}
      </div>
    </div>
  );
}
