import type { Card } from '@/shared/types';
import { CardFace } from './CardFace';
import { cn } from '@/lib/utils';

interface HandZoneProps {
  cards: Card[];
  isOver?: boolean;
  setNodeRef?: (el: HTMLElement | null) => void;
}

export function HandZone({ cards, isOver, setNodeRef }: HandZoneProps) {
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-[128px] flex items-center px-4 gap-2 overflow-x-auto bg-card',
        isOver ? 'border-t-2 border-primary' : ''
      )}
    >
      {cards.map((card) => (
        <CardFace key={card.id} card={card} />
      ))}
    </div>
  );
}
