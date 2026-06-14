import React, { useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ClientCanvasCard } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { STACK_SHADOW } from '@/lib/canvas-utils';
import { cn } from '@/lib/utils';

interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  coversAnother?: boolean;
  isSelected?: boolean;
  isPassenger?: boolean;
  onToggleSelect?: (id: string) => void;
  onCursorChange?: () => void;
  isHighlighted?: boolean;
  highlightNonce?: number;
  hasCursor?: boolean;
}

export function CanvasDraggableCard({ canvasCard, coversAnother, isSelected = false, isPassenger = false, onToggleSelect, onCursorChange, isHighlighted = false, highlightNonce, hasCursor }: CanvasDraggableCardProps) {
  // D-12: useDraggable only — no useDroppable on the card itself
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: canvasCard.card.id,
    data: { card: canvasCard.card, fromZone: 'canvas' as const, fromId: canvasCard.card.id },
  });

  const didDragRef = useRef(false);
  const prevIsDragging = useRef(false);
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (prevIsDragging.current && !isDragging) {
      timerId = setTimeout(() => { didDragRef.current = false; }, 300);
    }
    if (isDragging) didDragRef.current = true;
    prevIsDragging.current = isDragging;
    return () => {
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [isDragging]);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onCursorChange?.();
    onToggleSelect?.(canvasCard.card.id);
  }

  // D-13: source card opacity:0 while isDragging; absolutely positioned at stored (x, y, z)
  // D-17: passengers (group members that are not the drag handle) also render opacity:0 during drag
  const style: React.CSSProperties = {
    position: 'absolute',
    left: canvasCard.x,
    top: canvasCard.y,
    zIndex: canvasCard.z,
    opacity: (isDragging || isPassenger) ? 0 : 1,
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    touchAction: 'none',
    boxShadow: isSelected
      ? '0 0 0 2px #60a5fa, 0 0 0 4px rgba(96,165,250,0.3)' + (coversAnother ? `, ${STACK_SHADOW}` : '')
      : coversAnother ? STACK_SHADOW : undefined,
    borderRadius: (isSelected || coversAnother || hasCursor) ? 6 : undefined,
    outline: hasCursor ? '2px solid white' : undefined,
    outlineOffset: hasCursor ? '2px' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      data-card-id={canvasCard.card.id}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable card"
      aria-label={`${canvasCard.card.rank} of ${canvasCard.card.suit}`}
      aria-pressed={isSelected}
    >
      {isHighlighted && (
        <div key={highlightNonce} className="last-move-highlight absolute inset-0 rounded-md pointer-events-none" />
      )}
      {/* D-07: canvas cards are always face-up on server; ternary kept for defense in depth */}
      {canvasCard.card.faceUp ? <CardFace card={canvasCard.card} /> : <CardBack />}
    </div>
  );
}
