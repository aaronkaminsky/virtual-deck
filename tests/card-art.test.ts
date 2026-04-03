import { describe, it, expect } from 'vitest';
import { CARD_BACK_URL, CARD_FACE_URL } from '../src/card-art';
import type { Card } from '../src/shared/types';

describe('card-art (DECK-03)', () => {
  const testCard: Card = { id: 'A-s', suit: 'spades', rank: 'A', faceUp: false };

  it('exports CARD_BACK_URL as a string', () => {
    expect(typeof CARD_BACK_URL).toBe('string');
  });

  it('exports CARD_FACE_URL as a function', () => {
    expect(typeof CARD_FACE_URL).toBe('function');
  });

  it('CARD_FACE_URL returns a string for a valid card', () => {
    const result = CARD_FACE_URL(testCard);
    expect(typeof result).toBe('string');
  });
});
