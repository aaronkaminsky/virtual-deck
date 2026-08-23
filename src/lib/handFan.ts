// Fanning math for overlapping card rows. "Advance" is the distance between
// successive card left edges — the visible sliver of each covered card. Cards
// render at a fixed width and overlap via a negative margin, so the rendered
// value is the overlap (cardWidth - advance).

export interface FanMetrics {
  cardWidth: number;
  comfortableAdvance: number;
  minAdvance: number;
}

// Own-hand metrics. Mirrors getCardDimensions() in canvas-utils — same 640px
// breakpoint as Tailwind's `sm:`. The comfortable values reproduce the previous
// hardcoded overlaps exactly (-ml-5 desktop, -ml-3 mobile), so small hands do
// not move.
export function getHandFanMetrics(): FanMetrics {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return { cardWidth: 40, comfortableAdvance: 28, minAdvance: 12 };
  }
  return { cardWidth: 60, comfortableAdvance: 40, minAdvance: 16 };
}

// Opponent hands render at 40px with -ml-3 at every breakpoint.
export const OPPONENT_FAN_METRICS: FanMetrics = {
  cardWidth: 40,
  comfortableAdvance: 28,
  minAdvance: 12,
};

// The hand row's horizontal padding (px-4 on both sides).
export const HAND_PADDING_X = 32;

// Space kept clear for SortableSentinel, the invisible flex-1/minWidth-56
// droppable that makes drop-to-end reachable. Cards must not consume it.
export const SENTINEL_RESERVE = 56;

export function fanAdvance({
  containerWidth,
  cardWidth,
  count,
  comfortableAdvance,
  minAdvance,
}: {
  containerWidth: number;
  cardWidth: number;
  count: number;
  comfortableAdvance: number;
  minAdvance: number;
}): number {
  if (count <= 1) return comfortableAdvance;
  const ideal = (containerWidth - cardWidth) / (count - 1);
  if (!Number.isFinite(ideal)) return minAdvance;
  return Math.min(comfortableAdvance, Math.max(minAdvance, ideal));
}

export function fanMarginLeft(advance: number, cardWidth: number): number {
  const margin = -(cardWidth - advance);
  return margin === 0 ? 0 : margin;
}
