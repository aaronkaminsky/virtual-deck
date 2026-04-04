import { CARD_BACK_URL } from '@/card-art';
import { cn } from '@/lib/utils';

interface CardBackProps {
  className?: string;
}

export function CardBack({ className }: CardBackProps) {
  if (CARD_BACK_URL) {
    return (
      <img
        src={CARD_BACK_URL}
        alt="Card back"
        className={cn('w-[63px] h-[88px] rounded-md select-none object-cover', className)}
        draggable={false}
      />
    );
  }

  return (
    <div
      className={cn('w-[63px] h-[88px] rounded-md border border-gray-600 select-none', className)}
      style={{
        background:
          'repeating-linear-gradient(45deg, #1e3a5f 0, #1e3a5f 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #1e3a5f 0, #1e3a5f 1px, transparent 0, transparent 50%)',
        backgroundSize: '8px 8px',
        backgroundColor: '#1a3050',
      }}
    />
  );
}
