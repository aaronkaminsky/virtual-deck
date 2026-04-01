import type * as Party from "partykit/server";
import type { Card, ClientGameState, GameState, Suit, Rank } from "../src/shared/types";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function buildDeck(): Card[] {
  return SUITS.flatMap(suit =>
    RANKS.map(rank => ({
      id: `${rank}-${suit[0]}`,
      suit,
      rank,
      faceUp: false,
    }))
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function defaultGameState(roomId: string): GameState {
  return {
    roomId,
    phase: "lobby",
    players: [],
    hands: {},
    piles: [
      { id: "draw", name: "Draw", cards: buildDeck() },
      { id: "discard", name: "Discard", cards: [] },
    ],
  };
}

export function viewFor(state: GameState, playerToken: string | null): ClientGameState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    players: state.players,
    myHand: playerToken ? (state.hands[playerToken] ?? []) : [],
    opponentHandCounts: Object.fromEntries(
      Object.entries(state.hands)
        .filter(([token]) => token !== playerToken)
        .map(([token, cards]) => [token, cards.length])
    ),
    piles: state.piles,
  };
}

export default class GameRoom implements Party.Server {
  gameState: GameState;
  constructor(readonly room: Party.Room) {
    this.gameState = defaultGameState(room.id);
  }
  async onStart() {}
  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {}
  async onMessage(message: string, sender: Party.Connection) {}
  async onClose(connection: Party.Connection) {}
}
