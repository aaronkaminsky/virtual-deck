import { CARD_FACE_URL } from '@/card-art';
import type { Card, Suit } from '@/shared/types';
import { cn } from '@/lib/utils';

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

interface CardFaceProps {
  card: Card;
  className?: string;
}

export function CardFace({ card, className }: CardFaceProps) {
  const imageUrl = CARD_FACE_URL(card);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${card.rank} of ${card.suit}`}
        className={cn('w-[63px] h-[88px] rounded-md select-none object-cover', className)}
        draggable={false}
      />
    );
  }

  const color = isRed(card.suit) ? 'text-red-600' : 'text-gray-900';
  const symbol = SUIT_SYMBOL[card.suit];

  return (
    <div
      className={cn(
        'w-[63px] h-[88px] relative bg-white rounded-md border border-gray-300 select-none',
        className
      )}
    >
      <span className={cn('absolute top-1 left-1.5 text-xs font-semibold leading-none', color)}>
        {card.rank}
      </span>
      <span className={cn('absolute inset-0 flex items-center justify-center text-2xl', color)}>
        {symbol}
      </span>
      <span
        className={cn(
          'absolute bottom-1 right-1.5 text-xs font-semibold leading-none rotate-180',
          color
        )}
      >
        {card.rank}
      </span>
    </div>
  );
}
