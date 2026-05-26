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
}

export function DraggableCard({ card, fromZone, fromId, onFlip, isSelected }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, fromZone, fromId },
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
    onFlip?.();
  }

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} onClick={handleClick} data-card-id={card.id} {...listeners} {...attributes} className={cn(isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm')}>
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}
