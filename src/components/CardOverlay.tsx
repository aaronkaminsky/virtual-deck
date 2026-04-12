import type { Card } from '@/shared/types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';

interface CardOverlayProps {
  card: Card;
}

export function CardOverlay({ card }: CardOverlayProps) {
  return (
    <div style={{ transform: 'scale(1.07)' }}>
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}
