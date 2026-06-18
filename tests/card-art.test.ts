import { describe, it, expect } from 'vitest';
import { CARD_BACK_URL, CARD_FACE_URL } from '../src/card-art';
import type { Card } from '../src/shared/types';

describe('card-art (DECK-03)', () => {
  it('exports CARD_BACK_URL as a string', () => {
    expect(typeof CARD_BACK_URL).toBe('string');
  });

  it('CARD_BACK_URL points to the jumbo back', () => {
    expect(CARD_BACK_URL).toBe('/cards/jumbo/back.svg');
  });

  it('exports CARD_FACE_URL as a function', () => {
    expect(typeof CARD_FACE_URL).toBe('function');
  });

  it('maps Ace of Spades', () => {
    const card: Card = { id: 'A-s', suit: 'spades', rank: 'A', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/jumbo/spadeAce.png');
  });

  it('maps 10 of Hearts', () => {
    const card: Card = { id: '10-h', suit: 'hearts', rank: '10', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/jumbo/heart10.png');
  });

  it('maps 2 of Clubs', () => {
    const card: Card = { id: '2-c', suit: 'clubs', rank: '2', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/jumbo/club2.png');
  });

  it('maps Jack of Diamonds', () => {
    const card: Card = { id: 'J-d', suit: 'diamonds', rank: 'J', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/jumbo/diamondJack.png');
  });

  it('maps Queen of Clubs', () => {
    const card: Card = { id: 'Q-c', suit: 'clubs', rank: 'Q', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/jumbo/clubQueen.png');
  });

  it('maps King of Hearts', () => {
    const card: Card = { id: 'K-h', suit: 'hearts', rank: 'K', faceUp: false };
    expect(CARD_FACE_URL(card)).toBe('/cards/jumbo/heartKing.png');
  });
});
