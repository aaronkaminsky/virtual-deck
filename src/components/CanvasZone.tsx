import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ClientCanvasCard, LastMoveHighlight, SelectionSource } from '@/shared/types';
import { CanvasControls } from './CanvasControls';
import { CanvasDraggableCard } from './CanvasDraggableCard';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';
import { coversMajority, getCardDimensions, clampScroll, touchActionForOverflow, nudgeDelta, PAN_TAP_THRESHOLD_PX, type PanDir } from '@/lib/canvas-utils';

const PAN_STEP = 8; // px per interval tick — spike-tuned value (Spike003)
const PAN_INTERVAL = 16; // ms (~60fps) — spike-tuned value (Spike003)
const CANVAS_PADDING = 48; // px padding beyond the furthest card edge
const HOLD_DELAY_MS = 250; // press shorter than this = tap (jump); longer = hold (continuous scroll)

interface EdgeArrowProps {
  dir: PanDir;
  visible: boolean;
  onPanStart: (dir: PanDir) => void;
  onPanEnd: (dir: PanDir) => void;
  onPanCancel: () => void;
}

function EdgeArrow({ dir, visible, onPanStart, onPanEnd, onPanCancel }: EdgeArrowProps) {
  if (!visible) return null;

  const label = '‹';
  const rotate = { left: '0deg', right: '180deg', up: '90deg', down: '270deg' }[dir];

  const posStyle: React.CSSProperties =
    dir === 'left'  ? { left: 0, top: '50%', transform: 'translateY(-50%)' } :
    dir === 'right' ? { right: 0, top: '50%', transform: 'translateY(-50%)' } :
    dir === 'up'    ? { top: 0, left: '50%', transform: 'translateX(-50%)' } :
                      { bottom: 0, left: '50%', transform: 'translateX(-50%)' };

  const horizontal = dir === 'left' || dir === 'right';
  // CSS edge property for this direction ('up'/'down' are not CSS props → top/bottom).
  const edge: 'left' | 'right' | 'top' | 'bottom' =
    dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir;

  // Non-interactive gradient scrim along the overflowing edge ("more this way").
  // `edge` is already the CSS edge name, so the gradient direction reuses it directly.
  const scrimStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 999,
    pointerEvents: 'none',
    background: `linear-gradient(to ${edge}, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)`,
    ...(horizontal
      ? { top: 0, bottom: 0, width: 64, [edge]: 0 }
      : { left: 0, right: 0, height: 64, [edge]: 0 }),
  };

  return (
    <>
      <div data-testid={`edge-scrim-${dir}`} aria-hidden="true" style={scrimStyle} />
      <div
        data-testid={`edge-arrow-${dir}`}
        aria-label={
          dir === 'left'  ? 'Pan canvas left' :
          dir === 'right' ? 'Pan canvas right' :
          dir === 'up'    ? 'Pan canvas up' :
                            'Pan canvas down'
        }
        onPointerDown={e => { e.stopPropagation(); onPanStart(dir); }}
        onPointerUp={() => onPanEnd(dir)}
        onPointerLeave={onPanCancel}
        onPointerCancel={onPanCancel}
        onContextMenu={e => e.preventDefault()}
        style={{
          position: 'absolute',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: horizontal ? 34 : 80,
          height: horizontal ? 80 : 34,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          ...posStyle,
        }}
      >
        <span style={{
          color: 'white',
          fontSize: 26,
          lineHeight: 1,
          display: 'block',
          transform: `rotate(${rotate})`,
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          animation: 'canvas-edge-pulse 1.6s ease-in-out infinite',
        }}>
          {label}
        </span>
      </div>
    </>
  );
}

interface CanvasZoneProps {
  canvasCards: ClientCanvasCard[];
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selectedIds: Set<string>;
  selectionSource: SelectionSource;
  groupIds: Set<string>;
  activeCardId: string | null;
  dragDelta: { x: number; y: number } | null;
  onToggleSelectCanvas: (id: string) => void;
  onSelectAllCanvas: () => void;
  onDiscardAllCanvas: () => void;
  onDeselectAll: () => void;
  highlightedMove?: LastMoveHighlight | null;
  cursorCardId?: string;
}

export function CanvasZone({ canvasCards, canvasRef, selectedIds, selectionSource, groupIds, activeCardId, dragDelta, onToggleSelectCanvas, onSelectAllCanvas, onDiscardAllCanvas, onDeselectAll, highlightedMove, cursorCardId }: CanvasZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  // Dual-ref: attach both dnd-kit's setNodeRef and the forwarded canvasRef so
  // BoardDragLayer.handleDragEnd can call getBoundingClientRect() for bounds clamping (D-15).
  // CRITICAL: attaches to the INNER canvas div (not the outer viewport div) so
  // getBoundingClientRect() returns inner-canvas bounds for correct clamping math.
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  // Outer viewport div ref — target for ResizeObserver to track visible viewport size
  const viewportRef = useRef<HTMLDivElement>(null);
  // Interval ref for the pan loop — cleared on pointerUp/leave and unmount
  const panIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scroll offset state — drives the CSS translate on the inner canvas div
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  // Viewport size state — updated by ResizeObserver; used for overflow detection and pan clamping
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  // Direction of the edge arrow currently pressed (null = none). Keeping the pressed arrow
  // mounted while held is what makes its release/contextmenu handlers fire reliably even after
  // its overflow is exhausted — otherwise the arrow unmounts mid-press and the pan loop orphans.
  const [pressedDir, setPressedDir] = useState<PanDir | null>(null);

  // Drag-to-pan gesture state (refs, not state — live values inside pointer handlers, no re-render churn)
  const dragPanRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollX: number;
    startScrollY: number;
    moved: number;
  } | null>(null);

  // ResizeObserver: track outer viewport size so overflow detection stays accurate on resize
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Dynamic inner canvas size — derived from card positions + padding (D-02)
  // Uses getCardDimensions() so mobile card sizes (42×59) are accounted for
  const { innerW, innerH } = useMemo(() => {
    const { w: cardW, h: cardH } = getCardDimensions();
    if (canvasCards.length === 0) {
      return { innerW: viewportSize.w, innerH: viewportSize.h };
    }
    const maxX = Math.max(...canvasCards.map(c => c.x + cardW));
    const maxY = Math.max(...canvasCards.map(c => c.y + cardH));
    return {
      innerW: Math.max(viewportSize.w, maxX + CANVAS_PADDING),
      innerH: Math.max(viewportSize.h, maxY + CANVAS_PADDING),
    };
  }, [canvasCards, viewportSize.w, viewportSize.h]);

  // Overflow detection — which edges have content beyond the current viewport? (D-06)
  const hasOverflow = {
    left:  scroll.x > 0,
    right: scroll.x < innerW - viewportSize.w,
    up:    scroll.y > 0,
    down:  scroll.y < innerH - viewportSize.h,
  };

  // Latest pan bounds in a ref so the running pan interval clamps against current values,
  // not the stale closure captured when the hold began (e.g. a card landing mid-hold).
  const boundsRef = useRef({ innerW, innerH, vw: viewportSize.w, vh: viewportSize.h });
  useEffect(() => {
    boundsRef.current = { innerW, innerH, vw: viewportSize.w, vh: viewportSize.h };
  }, [innerW, innerH, viewportSize]);

  // clearPanTimers: clears both the hold-delay timeout and the continuous interval.
  const clearPanTimers = useCallback(() => {
    if (panTimeoutRef.current) {
      clearTimeout(panTimeoutRef.current);
      panTimeoutRef.current = null;
    }
    if (panIntervalRef.current) {
      clearInterval(panIntervalRef.current);
      panIntervalRef.current = null;
    }
  }, []);

  // nudge: a single half-viewport step toward the direction (clamped). Fired on a tap.
  const nudge = useCallback((dir: PanDir) => {
    const { dx, dy } = nudgeDelta(dir, viewportSize.w, viewportSize.h);
    setScroll(prev => clampScroll(prev.x + dx, prev.y + dy, innerW, innerH, viewportSize.w, viewportSize.h));
  }, [viewportSize, innerW, innerH]);

  // startPan (press): no immediate jump. After HOLD_DELAY_MS still held → begin continuous
  // PAN_STEP panning. A release before the delay is treated as a tap (nudge) in endPan.
  const startPan = useCallback((dir: PanDir) => {
    clearPanTimers();
    setPressedDir(dir);
    panTimeoutRef.current = setTimeout(() => {
      panTimeoutRef.current = null;
      panIntervalRef.current = setInterval(() => {
        const { innerW: iW, innerH: iH, vw, vh } = boundsRef.current;
        setScroll(prev => clampScroll(
          prev.x + (dir === 'left' ? -PAN_STEP : dir === 'right' ? PAN_STEP : 0),
          prev.y + (dir === 'up' ? -PAN_STEP : dir === 'down' ? PAN_STEP : 0),
          iW, iH, vw, vh,
        ));
      }, PAN_INTERVAL);
    }, HOLD_DELAY_MS);
  }, [clearPanTimers]);

  // endPan (release on the arrow): if released before the hold delay, it was a tap → nudge.
  const endPan = useCallback((dir: PanDir) => {
    const wasTap = panTimeoutRef.current !== null;
    clearPanTimers();
    setPressedDir(null);
    if (wasTap) nudge(dir);
  }, [clearPanTimers, nudge]);

  // cancelPan (pointer left the arrow or was cancelled): stop, no nudge.
  const cancelPan = useCallback(() => {
    clearPanTimers();
    setPressedDir(null);
  }, [clearPanTimers]);

  // Cleanup: clear timers on unmount (T-35-03)
  useEffect(() => () => clearPanTimers(), [clearPanTimers]);

  // Drag-to-pan: only when the press lands on empty felt (not a card or a control).
  // Edge arrows stopPropagation on pointerdown, so they never reach here.
  const onViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-card-id], button')) return;
    dragPanRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollX: scroll.x,
      startScrollY: scroll.y,
      moved: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = dragPanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    p.moved = Math.max(p.moved, Math.hypot(dx, dy));
    setScroll(clampScroll(p.startScrollX - dx, p.startScrollY - dy, innerW, innerH, viewportSize.w, viewportSize.h));
  };

  const onViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = dragPanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    dragPanRef.current = null;
    if (p.moved < PAN_TAP_THRESHOLD_PX) onDeselectAll(); // it was a tap, not a pan
  };

  const onViewportPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = dragPanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    dragPanRef.current = null;
  };

  // D-04: static shadow — set of card IDs that cover >50% of a lower-z card at rest
  const coveringIds = useMemo(() => {
    const ids = new Set<string>();
    for (const card of canvasCards) {
      if (canvasCards.some(other => other.z < card.z && coversMajority(card, other))) {
        ids.add(card.card.id);
      }
    }
    return ids;
  }, [canvasCards]);

  // Passenger ghost divs for canvas→canvas group drag (Spike004 pattern).
  // Only renders when there is an active drag (dragDelta !== null) with a group of 2+ canvas cards.
  // Hand/spread→canvas passengers do not render here — their stored x/y is unknown client-side.
  const passengerGhosts = useMemo(() => {
    if (dragDelta === null || groupIds.size === 0 || activeCardId === null) return [];
    return canvasCards.filter(cc => cc.card.id !== activeCardId && groupIds.has(cc.card.id));
  }, [dragDelta, canvasCards, activeCardId, groupIds]);

  return (
    // Outer viewport div — overflow:hidden, ResizeObserver target, click-to-deselect
    <div
      ref={viewportRef}
      aria-label="Play area"
      data-testid="canvas-zone"
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onPointerCancel={onViewportPointerCancel}
      style={{ touchAction: touchActionForOverflow(hasOverflow) }}
      className={cn(
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-felt',
        isOver && 'ring-1 ring-primary/30'
      )}
    >
      {/* Inner canvas div — dnd-kit droppable + canvasRef target; panned via CSS transform */}
      <div
        ref={setRefs}
        data-testid="canvas-inner"
        style={{
          position: 'absolute',
          width: innerW,
          height: innerH,
          transform: `translate(${-scroll.x}px, ${-scroll.y}px)`,
          // Isolate so card z-indexes stay contained here; the edge scrim/chevron
          // (siblings at z 999/1000) always render above cards regardless of card z.
          isolation: 'isolate',
        }}
      >
        {selectedIds.size >= 2 && selectionSource?.zone === 'canvas' && (
          <span
            data-testid="canvas-selection-count"
            className="absolute top-12 left-2 z-10 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5"
          >
            {selectedIds.size} selected
          </span>
        )}
        {canvasCards.map((cc) => (
          <CanvasDraggableCard
            key={cc.card.id}
            canvasCard={cc}
            coversAnother={coveringIds.has(cc.card.id)}
            isSelected={selectedIds.has(cc.card.id)}
            isPassenger={groupIds.has(cc.card.id) && cc.card.id !== activeCardId}
            onToggleSelect={onToggleSelectCanvas}
            isHighlighted={
              highlightedMove?.toZoneType === "canvas" &&
              highlightedMove.cardIds.includes(cc.card.id)
            }
            highlightNonce={highlightedMove?.nonce}
            hasCursor={cursorCardId === cc.card.id}
          />
        ))}
        {passengerGhosts.map(cc => (
          <div
            key={`ghost-${cc.card.id}`}
            data-testid={`canvas-ghost-${cc.card.id}`}
            style={{
              position: 'absolute',
              left: cc.x + (dragDelta?.x ?? 0),
              top: cc.y + (dragDelta?.y ?? 0),
              zIndex: 998,
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          >
            {cc.card.faceUp ? <CardFace card={cc.card} /> : <CardBack />}
          </div>
        ))}
      </div>

      {canvasCards.length > 0 && (
        <CanvasControls onSelectAll={onSelectAllCanvas} onDiscardAll={onDiscardAllCanvas} />
      )}

      {/* EdgeArrows — inside outer viewport, outside inner canvas; stays mounted while pressed
          (pressedDir) so its release/contextmenu handlers fire even after overflow is exhausted. */}
      <EdgeArrow dir="left"  visible={hasOverflow.left  || pressedDir === 'left'}  onPanStart={startPan} onPanEnd={endPan} onPanCancel={cancelPan} />
      <EdgeArrow dir="right" visible={hasOverflow.right || pressedDir === 'right'} onPanStart={startPan} onPanEnd={endPan} onPanCancel={cancelPan} />
      <EdgeArrow dir="up"    visible={hasOverflow.up    || pressedDir === 'up'}    onPanStart={startPan} onPanEnd={endPan} onPanCancel={cancelPan} />
      <EdgeArrow dir="down"  visible={hasOverflow.down  || pressedDir === 'down'}  onPanStart={startPan} onPanEnd={endPan} onPanCancel={cancelPan} />
    </div>
  );
}
