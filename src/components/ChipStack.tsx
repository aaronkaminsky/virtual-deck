import { cn } from '@/lib/utils';

interface ChipStackProps {
  amount: number;
  className?: string;
}

const DISC_COLOR_CLASSES = ['bg-secondary', 'bg-primary', 'bg-muted'];

export function ChipStack({ amount, className }: ChipStackProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)} data-testid="chip-stack">
      <div className="flex flex-col-reverse items-center">
        <div className={cn('w-[22px] h-[22px] rounded-full border-2 border-card', DISC_COLOR_CLASSES[2])} />
        <div className={cn('w-[22px] h-[22px] rounded-full border-2 border-card -mt-[13px]', DISC_COLOR_CLASSES[1])} />
        <div className={cn('w-[22px] h-[22px] rounded-full border-2 border-card -mt-[13px]', DISC_COLOR_CLASSES[0])} />
      </div>
      <span className="text-xs font-semibold font-mono">{amount}</span>
    </div>
  );
}
