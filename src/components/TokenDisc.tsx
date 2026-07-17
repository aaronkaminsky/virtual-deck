import type { TokenId } from '@/shared/types';
import { TOKEN_SIZE } from '@/lib/tokenDrag';
import { cn } from '@/lib/utils';

const TOKEN_STYLES: Record<TokenId, string> = {
  dealer: 'bg-white text-neutral-900 border-neutral-400',
  red: 'bg-red-700 border-red-900',
  blue: 'bg-blue-700 border-blue-900',
  green: 'bg-green-700 border-green-900',
};

export const TOKEN_LABELS: Record<TokenId, string> = {
  dealer: 'Dealer button',
  red: 'Red token',
  blue: 'Blue token',
  green: 'Green token',
};

// Presentational disc shared by the tray, the canvas, and the drag ghost.
export function TokenDisc({ tokenId }: { tokenId: TokenId }) {
  return (
    <div
      className={cn(
        'rounded-full border-2 shadow-md flex items-center justify-center select-none font-bold text-sm',
        TOKEN_STYLES[tokenId]
      )}
      style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}
    >
      {tokenId === 'dealer' ? 'D' : ''}
    </div>
  );
}
