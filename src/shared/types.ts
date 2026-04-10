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
  faceUp?: boolean;  // whether the pile shows face-up by default
}

export type MaskedCard = { faceUp: false };

export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
}

export interface GameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  hands: Record<string, Card[]>;  // keyed by player token
  piles: Pile[];
  undoSnapshots: GameState[];
}

export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  opponentHandCounts: Record<string, number>;
  piles: ClientPile[];
  canUndo: boolean;
}

export type ClientAction =
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string }
  | { type: "REORDER_HAND"; orderedCardIds: string[] }
  | { type: "SET_PILE_FACE"; pileId: string; faceUp: boolean }
  | { type: "FLIP_CARD"; pileId: string; cardId: string }
  | { type: "PASS_CARD"; cardId: string; targetPlayerId: string }
  | { type: "DEAL_CARDS"; cardsPerPlayer: number }
  | { type: "SHUFFLE_PILE"; pileId: string }
  | { type: "RESET_TABLE" }
  | { type: "UNDO_MOVE" }
  | { type: "PING" };

export type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "ERROR"; code: string; message: string };
