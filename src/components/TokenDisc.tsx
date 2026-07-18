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

// Anchored-in-a-name-row size (18px) fits the existing compact strip
// (presence dot + name + chip badge); tray/canvas/drag-overlay use TOKEN_SIZE (32px).
const SIZE_PX: Record<'sm' | 'md', number> = { sm: 18, md: TOKEN_SIZE };

// Presentational disc shared by the tray, the canvas, name-row anchors, and the drag ghost.
export function TokenDisc({ tokenId, size = 'md' }: { tokenId: TokenId; size?: 'sm' | 'md' }) {
  const px = SIZE_PX[size];
  return (
    <div
      className={cn(
        'rounded-full border-2 shadow-md flex items-center justify-center select-none font-bold',
        size === 'sm' ? 'text-[9px]' : 'text-sm',
        TOKEN_STYLES[tokenId]
      )}
      style={{ width: px, height: px }}
    >
      {tokenId === 'dealer' ? 'D' : ''}
    </div>
  );
}
