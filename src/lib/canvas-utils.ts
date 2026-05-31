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

export const PAN_TAP_THRESHOLD_PX = 6;
export const NUDGE_FRACTION = 0.5; // a single arrow tap pans half a viewport

export type PanDir = "left" | "right" | "up" | "down";
export type Overflow = { left: boolean; right: boolean; up: boolean; down: boolean };

export function clampScroll(
  x: number,
  y: number,
  innerW: number,
  innerH: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(innerW - viewportW, x)),
    y: Math.max(0, Math.min(innerH - viewportH, y)),
  };
}

export function touchActionForOverflow(o: Overflow): "auto" | "pan-x" | "pan-y" | "none" {
  const horiz = o.left || o.right;
  const vert = o.up || o.down;
  if (horiz && vert) return "none";
  if (horiz) return "pan-y"; // browser scrolls the page vertically; we pan horizontally
  if (vert) return "pan-x";
  return "auto";
}

export function nudgeDelta(dir: PanDir, viewportW: number, viewportH: number): { dx: number; dy: number } {
  const stepX = viewportW * NUDGE_FRACTION;
  const stepY = viewportH * NUDGE_FRACTION;
  switch (dir) {
    case "left":  return { dx: -stepX, dy: 0 };
    case "right": return { dx: stepX, dy: 0 };
    case "up":    return { dx: 0, dy: -stepY };
    case "down":  return { dx: 0, dy: stepY };
  }
}
