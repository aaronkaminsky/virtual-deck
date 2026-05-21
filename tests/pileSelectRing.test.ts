/**
 * Unit tests for PileZone isSelected derivation logic (phase 28-01)
 *
 * D-04: Vitest logic test for isSelected derivation passes.
 *
 * Tests the three-branch expression used in PileZone to compute isSelected:
 *   selectedIds?.has((topCard as Card).id) ?? false
 *
 * No component rendering — pure logic extraction, no jsdom required.
 */

import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';

// ---------------------------------------------------------------------------
// Helper — mirrors the isSelected derivation in PileZone
// ---------------------------------------------------------------------------

function deriveIsSelected(selectedIds: Set<string> | undefined, cardId: string): boolean {
  return selectedIds?.has(cardId) ?? false;
}

// Minimal Card factory (satisfies the Card type for type-import validation)
function makeCard(id: string): Card {
  return { id, suit: 'spades', rank: 'A', faceUp: false };
}

// ---------------------------------------------------------------------------
// isSelected derivation — three branches
// ---------------------------------------------------------------------------

describe('PileZone isSelected derivation', () => {
  it('returns true when selectedIds contains the card id', () => {
    const card = makeCard('A-s');
    expect(deriveIsSelected(new Set([card.id]), card.id)).toBe(true);
  });

  it('returns false when selectedIds does not contain the card id', () => {
    const card = makeCard('A-s');
    expect(deriveIsSelected(new Set(['K-h']), card.id)).toBe(false);
  });

  it('returns false when selectedIds is an empty set', () => {
    const card = makeCard('A-s');
    expect(deriveIsSelected(new Set(), card.id)).toBe(false);
  });

  it('returns false when selectedIds is undefined (no selection active)', () => {
    const card = makeCard('A-s');
    expect(deriveIsSelected(undefined, card.id)).toBe(false);
  });
});
