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
  displayName: string;
  handRevealed: boolean;
}

export interface Pile {
  id: string;        // "draw" | "discard" | custom
  name: string;
  cards: Card[];     // top of stack = last element
  faceUp?: boolean;  // whether the pile shows face-up by default
  region?: "pile" | "spread";
  ownerId?: string | null;
}

export type MaskedCard = { faceUp: false };

export interface ClientPile {
  id: string;
  name: string;
  cards: (Card | MaskedCard)[];
  faceUp?: boolean;
  region?: "pile" | "spread";
  ownerId?: string | null;
}

export interface CanvasCard {
  card: Card;
  x: number;
  y: number;
  z: number;
}

// ClientCanvasCard is identical in phase 32 — no masking on canvas
export type ClientCanvasCard = CanvasCard;

export interface GameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  hands: Record<string, Card[]>;  // keyed by player token
  piles: Pile[];
  undoSnapshots: GameState[];
  canvasCards: CanvasCard[];
}

export interface ClientGameState {
  roomId: string;
  phase: "lobby" | "setup" | "playing";
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  myHandRevealed: boolean;
  opponentRevealedHands: Record<string, Card[]>;
  opponentHandCounts: Record<string, number>;
  piles: ClientPile[];
  canUndo: boolean;
  myPlayZoneId: string;
  canvasCards: ClientCanvasCard[];
}

export type ClientAction =
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile" | "canvas"; fromId: string; toZone: "hand" | "pile"; toId: string; insertPosition?: 'top' | 'bottom' | 'random' }
  | { type: "REORDER_HAND"; orderedCardIds: string[]; skipSnapshot?: boolean }
  | { type: "REORDER_PILE_SPREAD"; pileId: string; orderedCardIds: string[]; skipSnapshot?: boolean }
  | { type: "SET_PILE_FACE"; pileId: string; faceUp: boolean }
  | { type: "FLIP_CARD"; pileId: string; cardId: string }
  | { type: "PASS_CARD"; cardId: string; targetPlayerId: string; fromZone?: "hand" | "pile"; fromId?: string }
  | { type: "DEAL_CARDS"; cardsPerPlayer: number }
  | { type: "DEAL_NEXT_HAND"; cardsPerPlayer: number }
  | { type: "SHUFFLE_PILE"; pileId: string }
  | { type: "PLAY_CARD_SET"; cardIds: string[]; fromZone?: "hand" | "pile" | "canvas"; fromId: string; toZone: "pile" | "hand"; toId: string }
  | { type: "MOVE_ALL_PILE_CARDS"; fromId: string; toId: string }
  | { type: "SET_HAND_REVEALED"; revealed: boolean }
  | { type: "RESET_TABLE" }
  | { type: "UNDO_MOVE" }
  | { type: "PING" }
  | { type: "CELEBRATE" }
  | { type: "PLACE_ON_CANVAS"; cardId: string; fromZone: "hand" | "pile" | "canvas"; fromId: string; x: number; y: number }
  | { type: "GROUP_PLACE_ON_CANVAS"; fromZone: "hand" | "pile" | "canvas"; fromId: string; cards: { cardId: string; x: number; y: number }[] };

export type SelectionSource =
  | { zone: 'hand' | 'pile'; zoneId: string; hasMaskedCards?: boolean }
  | { zone: 'canvas'; zoneId: 'canvas' }
  | null;

export type LastMoveHighlight = {
  toZoneType: "hand" | "pile" | "canvas";
  toZoneId: string;
  cardIds: string[];
};

export type ServerEvent =
  | { type: "STATE_UPDATE"; state: ClientGameState }
  | { type: "ERROR"; code: string; message: string }
  | { type: "PILE_SHUFFLED"; pileId: string }
  | { type: "EFFECT"; kind: "deal" | "celebrate" }
  | { type: "LAST_MOVE"; toZoneType: "hand" | "pile" | "canvas"; toZoneId: string; cardIds: string[] }
  | { type: "CLEAR_LAST_MOVE" };
