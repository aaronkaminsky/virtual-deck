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
      { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false },
      { id: "discard", name: "Discard", cards: [], faceUp: true },
      { id: "play", name: "Play Area", cards: [], faceUp: true },
    ],
    undoSnapshots: {},
  };
}

export function takeSnapshot(state: GameState, playerId: string): void {
  const snap = JSON.parse(JSON.stringify(state)) as GameState;
  snap.undoSnapshots = {};
  state.undoSnapshots[playerId] = snap;
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
    canUndo: playerToken ? (state.undoSnapshots[playerToken] != null) : false,
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
    // Migrate state from Phase 3 (undoSnapshots field did not exist)
    if (!this.gameState.undoSnapshots) {
      this.gameState.undoSnapshots = {};
    }
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
        if (!action.pileId) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "MISSING_PILE_ID",
            message: "pileId is required for DRAW_CARD",
          } satisfies ServerEvent));
          break;
        }
        const pile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!pile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        if (pile.cards.length === 0) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_EMPTY",
            message: `Pile ${action.pileId} has no cards`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState, sender.id);
        const playerToken = sender.id;
        const card = pile.cards.pop()!;
        card.faceUp = true;
        if (!this.gameState.hands[playerToken]) {
          this.gameState.hands[playerToken] = [];
        }
        this.gameState.hands[playerToken].push(card);
        break;
      }
      case "MOVE_CARD": {
        const { cardId, fromZone, fromId, toZone, toId } = action;

        if (fromZone === "hand" && fromId !== sender.id) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_MOVE",
            message: "Cannot move another player's cards",
          } satisfies ServerEvent));
          break;
        }

        if (toZone === "hand" && toId !== sender.id) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_MOVE",
            message: "Cannot place cards in another player's hand",
          } satisfies ServerEvent));
          break;
        }

        const source: Card[] | undefined =
          fromZone === "hand"
            ? this.gameState.hands[fromId]
            : this.gameState.piles.find(p => p.id === fromId)?.cards;

        if (source === undefined) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: fromZone === "hand" ? "HAND_NOT_FOUND" : "PILE_NOT_FOUND",
            message: fromZone === "hand"
              ? `No hand found for player: ${fromId}`
              : `No pile found with id: ${fromId}`,
          } satisfies ServerEvent));
          break;
        }

        const idx = source.findIndex(c => c.id === cardId);
        if (idx === -1) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "CARD_NOT_IN_SOURCE",
            message: `Card ${cardId} not found in source`,
          } satisfies ServerEvent));
          break;
        }

        const card = source.splice(idx, 1)[0];

        const dest: Card[] | undefined =
          toZone === "hand"
            ? (this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []))
            : this.gameState.piles.find(p => p.id === toId)?.cards;

        if (dest === undefined) {
          // Undo the splice — put card back
          source.splice(idx, 0, card);
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${toId}`,
          } satisfies ServerEvent));
          break;
        }

        if (toZone === "hand") {
          card.faceUp = true;
        } else {
          const destPile = this.gameState.piles.find(p => p.id === toId);
          card.faceUp = destPile?.faceUp ?? false;
        }
        dest.push(card);
        break;
      }
      case "REORDER_HAND": {
        const hand = this.gameState.hands[sender.id];
        if (!hand) break;
        const idSet = new Set(hand.map(c => c.id));
        if (
          action.orderedCardIds.length !== hand.length ||
          !action.orderedCardIds.every(id => idSet.has(id))
        ) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_REORDER",
            message: "orderedCardIds must contain exactly the player's current hand cards",
          } satisfies ServerEvent));
          break;
        }
        const cardMap = new Map(hand.map(c => [c.id, c]));
        this.gameState.hands[sender.id] = action.orderedCardIds.map(id => cardMap.get(id)!);
        break;
      }
      case "SET_PILE_FACE": {
        const pile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!pile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        pile.faceUp = action.faceUp;
        pile.cards.forEach(c => { c.faceUp = action.faceUp; });
        break;
      }
      case "FLIP_CARD": {
        const flipPile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!flipPile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        const flipCard = flipPile.cards.find(c => c.id === action.cardId);
        if (!flipCard) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "CARD_NOT_FOUND",
            message: `No card found with id: ${action.cardId}`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState, sender.id);
        flipCard.faceUp = !flipCard.faceUp;
        break;
      }
      case "PASS_CARD": {
        const senderHand = this.gameState.hands[sender.id];
        if (!senderHand) {
          break;
        }
        const passCardIdx = senderHand.findIndex(c => c.id === action.cardId);
        if (passCardIdx === -1) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "CARD_NOT_IN_HAND",
            message: `Card ${action.cardId} not in hand`,
          } satisfies ServerEvent));
          break;
        }
        if (!this.gameState.hands[action.targetPlayerId]) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PLAYER_NOT_FOUND",
            message: `Player ${action.targetPlayerId} not found`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState, sender.id);
        const [passedCard] = senderHand.splice(passCardIdx, 1);
        passedCard.faceUp = true;
        this.gameState.hands[action.targetPlayerId].push(passedCard);
        break;
      }
      case "DEAL_CARDS": {
        const dealDrawPile = this.gameState.piles.find(p => p.id === "draw");
        const connectedPlayers = this.gameState.players.filter(p => p.connected);
        const needed = action.cardsPerPlayer * connectedPlayers.length;
        if (!dealDrawPile || dealDrawPile.cards.length < needed) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INSUFFICIENT_CARDS",
            message: "Not enough cards in draw pile to deal",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState, sender.id);
        for (let i = 0; i < action.cardsPerPlayer; i++) {
          for (const player of connectedPlayers) {
            const dealt = dealDrawPile.cards.pop()!;
            dealt.faceUp = true;
            if (!this.gameState.hands[player.id]) {
              this.gameState.hands[player.id] = [];
            }
            this.gameState.hands[player.id].push(dealt);
          }
        }
        this.gameState.phase = "playing";
        break;
      }
      case "SHUFFLE_PILE": {
        const shufflePile = this.gameState.piles.find(p => p.id === action.pileId);
        if (!shufflePile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState, sender.id);
        shufflePile.cards = shuffle(shufflePile.cards);
        break;
      }
      case "RESET_TABLE": {
        const resetDrawPile = this.gameState.piles.find(p => p.id === "draw");
        if (!resetDrawPile) {
          break;
        }
        for (const hand of Object.values(this.gameState.hands)) {
          resetDrawPile.cards.push(...hand.splice(0));
        }
        for (const pile of this.gameState.piles) {
          if (pile.id !== "draw") {
            resetDrawPile.cards.push(...pile.cards.splice(0));
          }
        }
        resetDrawPile.faceUp = false;
        resetDrawPile.cards.forEach(c => { c.faceUp = false; });
        resetDrawPile.cards = shuffle(resetDrawPile.cards);
        this.gameState.phase = "setup";
        this.gameState.undoSnapshots = {};
        break;
      }
      case "UNDO_MOVE": {
        const snap = this.gameState.undoSnapshots[sender.id];
        if (!snap) {
          break;
        }
        this.gameState = snap;
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

