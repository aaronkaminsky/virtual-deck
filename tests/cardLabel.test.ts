import { describe, it, expect } from 'vitest';
import { cardLabel } from '../src/shared/types';
import type { Card } from '../src/shared/types';

describe('cardLabel (1039 fix wave)', () => {
  it('labels the red joker', () => {
    const card: Card = { id: 'JOKER-r', suit: 'joker-red', rank: 'JOKER', faceUp: false };
    expect(cardLabel(card)).toBe('Red joker');
  });

  it('labels the black joker', () => {
    const card: Card = { id: 'JOKER-b', suit: 'joker-black', rank: 'JOKER', faceUp: false };
    expect(cardLabel(card)).toBe('Black joker');
  });

  it('labels a standard card as "rank of suit"', () => {
    const card: Card = { id: 'A-s', suit: 'spades', rank: 'A', faceUp: false };
    expect(cardLabel(card)).toBe('A of spades');
  });
});
