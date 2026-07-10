import type { ClientAction, ClientPile, SelectionSource } from '@/shared/types';

export type InsertPosition = 'top' | 'bottom' | 'random';

// Height of the flap row in px — shared by PileDropFlaps (render) and flapPlacement (flip check).
export const FLAP_ROW_HEIGHT = 40;

// Decides the MOVE_CARD to dispatch for a single-card drop resolving to a pile (1039).
// Returns null when nothing should be dispatched (intra-spread reorder — SpreadZone's
// useDndMonitor sends REORDER_PILE_SPREAD instead, GAP-06).
export function resolvePileDropAction(args: {
  cardId: string;
  fromZone: 'hand' | 'pile' | 'canvas';
  fromId: string;
  toId: string;
  targetPile: Pick<ClientPile, 'region' | 'cards'> | undefined;
  insertPosition: InsertPosition | undefined;
  isIntraSpreadReorder: boolean;
}): ClientAction | null {
  const { cardId, fromZone, fromId, toId, targetPile, insertPosition, isIntraSpreadReorder } = args;
  const base = { type: 'MOVE_CARD' as const, cardId, fromZone, fromId, toZone: 'pile' as const, toId };
  const isEmpty = !targetPile || targetPile.cards.length === 0;
  // Empty pile: position is meaningless — always top (D-02, D-03).
  if (isEmpty) return { ...base, insertPosition: 'top' };
  // Spread zones always insert at top (GAP-02).
  if (targetPile.region === 'spread') {
    if (isIntraSpreadReorder) return null;
    return { ...base, insertPosition: 'top' };
  }
  // Non-empty regular pile: flap position if the drop hit one; plain drop = top.
  return { ...base, insertPosition: insertPosition ?? 'top' };
}

// True while the active drag could end in a positioned pile drop — gates flap rendering.
// Whole-pile drags reposition/merge (no position choice) and masked-pile group drags
// resolve to MOVE_ALL_PILE_CARDS (server moves the whole pile), so both are excluded.
export function isFlapEligibleDrag(args: {
  activeCardId: string | null;
  activePileId: string | null;
  selectedIds: Set<string>;
  selectionSource: SelectionSource;
}): boolean {
  const { activeCardId, activePileId, selectedIds, selectionSource } = args;
  if (activeCardId === null) return false;
  if (activePileId !== null) return false;
  const hasMaskedCardsInSource =
    selectionSource !== null &&
    selectionSource.zone !== 'canvas' &&
    selectionSource.hasMaskedCards === true;
  if (hasMaskedCardsInSource && selectedIds.has(activeCardId)) return false;
  return true;
}

// Flap row sits below the pile unless it would overflow the viewport bottom.
export function flapPlacement(pileBottom: number, viewportHeight: number): 'below' | 'above' {
  return pileBottom + FLAP_ROW_HEIGHT >= viewportHeight ? 'above' : 'below';
}
