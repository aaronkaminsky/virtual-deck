import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';

interface DraggableCardProps {
  card: Card;
  fromZone: 'hand' | 'pile';
  fromId: string;
}

export function DraggableCard({ card, fromZone, fromId }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, fromZone, fromId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}
