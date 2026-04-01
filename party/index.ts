import type * as Party from "partykit/server";
import type { Card, ClientGameState, GameState } from "../src/shared/types";

// Stub functions — implementations come in Plan 02
export function buildDeck(): Card[] { return []; }
export function shuffle<T>(arr: T[]): T[] { return arr; }
export function defaultGameState(roomId: string): GameState {
  return { roomId, phase: "lobby", players: [], hands: {}, piles: [] };
}
export function viewFor(state: GameState, playerToken: string | null): ClientGameState {
  return { roomId: state.roomId, phase: state.phase, players: state.players, myHand: [], opponentHandCounts: {}, piles: state.piles };
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
