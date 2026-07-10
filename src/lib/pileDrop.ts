import type { ClientAction, ClientPile, SelectionSource } from '@/shared/types';

export type InsertPosition = 'top' | 'bottom' | 'random';

// Flap row dimensions in px — shared by PileDropFlaps (render) and the placement math
// (flapPlacement flip check / flapShiftX horizontal clamp).
export const FLAP_ROW_HEIGHT = 40;
export const FLAP_ROW_WIDTH = 112;

// Breathing room kept between the flap row and a clipping edge when shifting.
const FLAP_EDGE_MARGIN = 4;

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

// Flap row sits below the pile unless that would clip it against the nearest clipping
// ancestor (e.g. the overflow-hidden canvas viewport) — getBoundingClientRect() ignores
// CSS clipping, so an off-viewport-only check would leave the row invisible yet still an
// active drop target. 'above' is tried next; 'none' means neither placement fits, so the
// caller must not arm (no invisible drop target). Boundary touch (fits exactly) counts as
// fitting in both directions — hence the inclusive <=/>=.
export function flapPlacement(args: {
  anchorTop: number;
  anchorBottom: number;
  boundsTop: number;
  boundsBottom: number;
}): 'below' | 'above' | 'none' {
  const { anchorTop, anchorBottom, boundsTop, boundsBottom } = args;
  if (anchorBottom + FLAP_ROW_HEIGHT <= boundsBottom) return 'below';
  if (anchorTop - FLAP_ROW_HEIGHT >= boundsTop) return 'above';
  return 'none';
}

// Horizontal counterpart to flapPlacement: the row is wider than the pile, so when a
// pile hugs a clipping edge (the pile rail at the window's left, a canvas pile at the
// felt's right), a centered row pokes past it. Rather than shrinking the row (worse
// touch targets, still clips on 56px mobile piles), shift it sideways just enough to
// stay inside the bounds — the popover approach. Returns the px offset to add to the
// row's centered position; 0 when centered already fits. If the bounds are narrower
// than the row itself, best-effort: center the row within the bounds.
export function flapShiftX(args: {
  anchorCenterX: number;
  boundsLeft: number;
  boundsRight: number;
}): number {
  const { anchorCenterX, boundsLeft, boundsRight } = args;
  const half = FLAP_ROW_WIDTH / 2;
  const minCenter = boundsLeft + FLAP_EDGE_MARGIN + half;
  const maxCenter = boundsRight - FLAP_EDGE_MARGIN - half;
  if (minCenter > maxCenter) {
    return (boundsLeft + boundsRight) / 2 - anchorCenterX;
  }
  return Math.min(Math.max(anchorCenterX, minCenter), maxCenter) - anchorCenterX;
}
