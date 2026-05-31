export const CARD_W = 60;
export const CARD_H = 90;
export const STACK_SHADOW = '2px 2px 0 0 #fff, 2px 2px 0 1px #d1d5db';

export function getCardDimensions(): { w: number; h: number } {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return { w: 40, h: 60 };
  }
  return { w: CARD_W, h: CARD_H };
}

export function coversMajority(top: { x: number; y: number }, bottom: { x: number; y: number }): boolean {
  const { w: cardW, h: cardH } = getCardDimensions();
  const overlapW = Math.max(0, Math.min(top.x + cardW, bottom.x + cardW) - Math.max(top.x, bottom.x));
  const overlapH = Math.max(0, Math.min(top.y + cardH, bottom.y + cardH) - Math.max(top.y, bottom.y));
  return overlapW * overlapH > cardW * cardH * 0.5;
}
