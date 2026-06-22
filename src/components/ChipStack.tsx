import { cn } from '@/lib/utils';

interface ChipStackProps {
  amount: number;
  className?: string;
}

const COIN_OFFSETS = [10, 5, 0];

export function ChipStack({ amount, className }: ChipStackProps) {
  return (
    <div
      className={cn('relative w-[18px] h-[28px]', className)}
      data-testid="chip-stack"
      aria-label={`${amount} chips`}
    >
      <div
        className="absolute left-0 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.3)]"
        style={{ top: 10, zIndex: 0 }}
      />
      <div
        className="absolute left-0 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.3)]"
        style={{ top: 5, zIndex: 1 }}
      />
      <div
        className="absolute left-0 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.3)]"
        style={{ top: 0, zIndex: 2 }}
      />
    </div>
  );
}
