import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChipBadgeProps {
  amount: number;
  className?: string;
}

export function ChipBadge({ amount, className }: ChipBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 font-mono', className)} data-testid="chip-badge">
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary border border-primary-foreground/40" aria-hidden />
      {amount}
    </Badge>
  );
}
