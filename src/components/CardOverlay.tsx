import type { Card } from '@/shared/types';
import { CardFace } from './CardFace';

interface CardOverlayProps {
  card: Card;
}

export function CardOverlay({ card }: CardOverlayProps) {
  return (
    <div style={{ transform: 'scale(1.07)' }}>
      <CardFace card={card} />
    </div>
  );
}
