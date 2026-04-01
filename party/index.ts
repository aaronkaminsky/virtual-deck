import type * as Party from "partykit/server";
import type { Card, ClientAction, ClientGameState, GameState, ServerEvent, Suit, Rank } from "../src/shared/types";

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
  static options = { hibernate: true };
  gameState: GameState;

  constructor(readonly room: Party.Room) {
    this.gameState = defaultGameState(room.id);
  }

  async onStart() {
    this.gameState =
      (await this.room.storage.get<GameState>("gameState")) ??
      defaultGameState(this.room.id);
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const count = [...this.room.getConnections()].length;
    if (count > 4) {
      connection.close(4000, "Room is full — maximum 4 players");
      return;
    }

    const playerToken = connection.id;

    if (!this.gameState.players.find(p => p.id === playerToken)) {
      this.gameState.players.push({ id: playerToken, connected: true });
      this.gameState.hands[playerToken] = [];
    } else {
      const player = this.gameState.players.find(p => p.id === playerToken);
      if (player) player.connected = true;
    }

    await this.persist();
    this.broadcastState();
  }

  async onMessage(message: string, sender: Party.Connection) {
    let action: ClientAction;
    try {
      action = JSON.parse(message) as ClientAction;
    } catch {
      sender.send(JSON.stringify({
        type: "ERROR",
        code: "INVALID_MESSAGE",
        message: "Could not parse message as JSON",
      } satisfies ServerEvent));
      return;
    }

    switch (action.type) {
      case "SHUFFLE_DECK": {
        const drawPile = this.gameState.piles.find(p => p.id === "draw");
        if (drawPile) {
          drawPile.cards = shuffle(drawPile.cards);
        }
        break;
      }
      case "DRAW_CARD": {
        const pile = this.gameState.piles.find(p => p.id === action.pileId);
        const playerToken = sender.id;
        if (pile && pile.cards.length > 0) {
          const card = pile.cards.pop()!;
          if (!this.gameState.hands[playerToken]) {
            this.gameState.hands[playerToken] = [];
          }
          this.gameState.hands[playerToken].push(card);
        }
        break;
      }
      case "PING":
        break;
    }

    await this.persist();
    this.broadcastState();
  }

  async onClose(connection: Party.Connection) {
    const playerToken = connection.id;
    const player = this.gameState.players.find(p => p.id === playerToken);
    if (player) {
      player.connected = false;
    }
    await this.persist();
    this.broadcastState();
  }

  private async persist() {
    await this.room.storage.put("gameState", this.gameState);
  }

  private broadcastState() {
    for (const conn of this.room.getConnections()) {
      conn.send(JSON.stringify({
        type: "STATE_UPDATE",
        state: viewFor(this.gameState, conn.id),
      } satisfies ServerEvent));
    }
  }
}

