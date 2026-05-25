export const CARD_W = 63;
export const CARD_H = 88;
export const STACK_SHADOW = '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db';

export function coversMajority(top: { x: number; y: number }, bottom: { x: number; y: number }): boolean {
  const overlapW = Math.max(0, Math.min(top.x + CARD_W, bottom.x + CARD_W) - Math.max(top.x, bottom.x));
  const overlapH = Math.max(0, Math.min(top.y + CARD_H, bottom.y + CARD_H) - Math.max(top.y, bottom.y));
  return overlapW * overlapH > CARD_W * CARD_H * 0.5;
}
