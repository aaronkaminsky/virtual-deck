import type { Card, Rank, Suit } from './shared/types';

export const CARD_BACK_URL: string = `${import.meta.env.BASE_URL}cards/bellot/back.svg`;

const RANK_MAP: Record<Rank, string> = {
  A: '1',
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'jack', Q: 'queen', K: 'king',
};

const SUIT_MAP: Record<Suit, string> = {
  spades: 'spade',
  hearts: 'heart',
  diamonds: 'diamond',
  clubs: 'club',
};

const FACE_RANKS = new Set(['jack', 'queen', 'king']);

export function CARD_FACE_URL(card: Card): string {
  const rank = RANK_MAP[card.rank];
  const suit = SUIT_MAP[card.suit];
  const filename = FACE_RANKS.has(rank) ? `${rank} ${suit}.svg` : `${rank}_${suit}.svg`;
  return `${import.meta.env.BASE_URL}cards/bellot/${encodeURIComponent(filename)}`;
}
