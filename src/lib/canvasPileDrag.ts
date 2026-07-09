export function computeStackOrigin(entries: { x: number; y: number }[]): { x: number; y: number } {
  return {
    x: Math.min(...entries.map(e => e.x)),
    y: Math.min(...entries.map(e => e.y)),
  };
}

export type PileDropResolution =
  | { kind: 'reposition'; x: number; y: number }
  | { kind: 'mergeIntoPile'; toId: string }
  | { kind: 'moveToHand' }
  | { kind: 'none' };

// Routes a whole-pile drag drop. Self-drop (pointer still over the dragged pile's own
// droppable) counts as a reposition — a short drag shouldn't merge a pile into itself.
export function resolvePileDrop(args: {
  pileId: string;
  pos: { x: number; y: number };
  delta: { x: number; y: number };
  overId: string | null;
  overData: { toZone?: string; toId?: string } | undefined;
  canvasW: number;
  canvasH: number;
  cardW: number;
  cardH: number;
}): PileDropResolution {
  const { pileId, pos, delta, overId, overData, canvasW, canvasH, cardW, cardH } = args;
  if (overId === null) return { kind: 'none' };
  if (overId === 'canvas' || overId === `pile-${pileId}`) {
    return {
      kind: 'reposition',
      x: Math.max(0, Math.min(pos.x + delta.x, Math.max(0, canvasW - cardW))),
      y: Math.max(0, Math.min(pos.y + delta.y, Math.max(0, canvasH - cardH))),
    };
  }
  if (overData?.toZone === 'pile' && overData.toId) {
    return { kind: 'mergeIntoPile', toId: overData.toId };
  }
  if (overData?.toZone === 'hand') {
    return { kind: 'moveToHand' };
  }
  return { kind: 'none' };
}
