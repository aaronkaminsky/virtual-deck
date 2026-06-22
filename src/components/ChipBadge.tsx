import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChipBadgeProps {
  amount: number;
  className?: string;
}

export function ChipBadge({ amount, className }: ChipBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 font-mono', className)} data-testid="chip-badge">
      <span
        className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-[#f5d77a] via-primary to-[#9a7416] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.3)]"
        aria-hidden
      />
      {amount}
    </Badge>
  );
}
