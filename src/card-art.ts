import type { Card, Rank, Suit } from './shared/types';

// Jumbo-index deck by Saul Spatz (CC0 / public domain), rasterized to PNG from
// the Vertical2 (two-color, traditional index) sprite for readability at small
// sizes. Source: https://opengameart.org/content/jumbo-index-playing-cards
const DECK = 'jumbo';

export const CARD_BACK_URL: string = `${import.meta.env.BASE_URL}cards/${DECK}/back.svg`;

const RANK_MAP: Record<Rank, string> = {
  A: 'Ace',
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'Jack', Q: 'Queen', K: 'King',
};

const SUIT_MAP: Record<Suit, string> = {
  spades: 'spade',
  hearts: 'heart',
  diamonds: 'diamond',
  clubs: 'club',
};

export function CARD_FACE_URL(card: Card): string {
  return `${import.meta.env.BASE_URL}cards/${DECK}/${SUIT_MAP[card.suit]}${RANK_MAP[card.rank]}.png`;
}
