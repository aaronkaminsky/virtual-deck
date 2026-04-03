export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  id: string;      // format: "${rank}-${suit[0]}" e.g. "A-s", "10-h", "K-d"
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface Player {
  id: string;        // stable player token (= connection.id via PartySocket id param)
  connected: boolean;
}

export interface Pile {
  id: string;        // "draw" | "discard" | custom
  name: string;
  cards: Card[];     // top of stack = last element
}

export interface GameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];
  hands: Record<string, Card[]>;  // keyed by player token
  piles: Pile[];
}

export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "playing";
  players: Player[];
  myHand: Card[];
  opponentHandCounts: Record<string, number>;
  piles: Pile[];
}

export type ClientAction =
  | { type: "SHUFFLE_DECK" }
  | { type: "DRAW_CARD"; pileId: string }
  | { type: "PING" };

export type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "ERROR"; code: string; message: string };
