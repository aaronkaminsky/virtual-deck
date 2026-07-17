// Token disc diameter in px — sized so two tokens fit per row in the 80px
// desktop rail (and one per row in the 56px mobile rail) with the tray's
// padding and gaps.
export const TOKEN_SIZE = 32;

export type TokenDropResolution =
  | { kind: 'place'; x: number; y: number }
  | { kind: 'return' }
  | { kind: 'none' };

// Routes a token drop. Mirrors resolvePileDrop's clamp math (canvasPileDrag.ts).
// `base` is the unclamped candidate top-left in inner-canvas coordinates —
// the caller derives it from stored pos + delta (canvas source) or from the
// pointer position (tray source).
export function resolveTokenDrop(args: {
  overId: string | null;
  fromTray: boolean;
  base: { x: number; y: number };
  canvasW: number;
  canvasH: number;
  tokenSize: number;
}): TokenDropResolution {
  const { overId, fromTray, base, canvasW, canvasH, tokenSize } = args;
  if (overId === null) return { kind: 'none' };
  if (overId === 'token-tray') return fromTray ? { kind: 'none' } : { kind: 'return' };
  if (overId === 'canvas') {
    return {
      kind: 'place',
      x: Math.max(0, Math.min(base.x, Math.max(0, canvasW - tokenSize))),
      y: Math.max(0, Math.min(base.y, Math.max(0, canvasH - tokenSize))),
    };
  }
  return { kind: 'none' };
}
