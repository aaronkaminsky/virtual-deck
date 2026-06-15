import { useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { cn } from '@/lib/utils';

interface DraggableCardProps {
  card: Card;
  fromZone: 'hand' | 'pile';
  fromId: string;
  onFlip?: () => void;
  isSelected?: boolean;
  hasCursor?: boolean;
}

export function DraggableCard({ card, fromZone, fromId, onFlip, isSelected, hasCursor }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, fromZone, fromId },
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

  function handleClick() {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onFlip?.();
  }

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} onClick={handleClick} data-card-id={card.id} {...listeners} {...attributes} className={cn(isSelected && 'outline outline-1 outline-primary/30 outline-offset-1 rounded-sm', hasCursor && 'outline outline-2 outline-white outline-offset-1 rounded-sm')}>
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}
