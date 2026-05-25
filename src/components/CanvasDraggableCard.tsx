import { useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ClientCanvasCard } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { STACK_SHADOW } from '@/lib/canvas-utils';

interface CanvasDraggableCardProps {
  canvasCard: ClientCanvasCard;
  isDraggingActive?: boolean; // currently unused — held for Phase 33 layered effects
  coversAnother?: boolean;
}

export function CanvasDraggableCard({ canvasCard, coversAnother }: CanvasDraggableCardProps) {
  // D-12: useDraggable only — no useDroppable on the card itself
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: canvasCard.card.id,
    data: { card: canvasCard.card, fromZone: 'canvas' as const, fromId: canvasCard.card.id },
  });

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
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    // Phase 32: no flip; click reserved for Phase 33+
  }

  // D-13: source card opacity:0 while isDragging; absolutely positioned at stored (x, y, z)
  const style: React.CSSProperties = {
    position: 'absolute',
    left: canvasCard.x,
    top: canvasCard.y,
    zIndex: canvasCard.z,
    opacity: isDragging ? 0 : 1,
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    touchAction: 'none',
    boxShadow: coversAnother ? STACK_SHADOW : undefined,
    borderRadius: coversAnother ? 6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable card"
      aria-label={`${canvasCard.card.rank} of ${canvasCard.card.suit}`}
      aria-pressed={undefined}
    >
      {/* D-07: canvas cards are always face-up on server; ternary kept for defense in depth */}
      {canvasCard.card.faceUp ? <CardFace card={canvasCard.card} /> : <CardBack />}
    </div>
  );
}
