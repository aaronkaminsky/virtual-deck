import type * as Party from "partykit/server";
import type { Card, ClientAction, ClientGameState, ClientPile, GameState, MaskedCard, ServerEvent, Suit, Rank } from "../src/shared/types";

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
    undoSnapshots: [],
  };
}

export function takeSnapshot(state: GameState): void {
  const snap = JSON.parse(JSON.stringify(state)) as GameState;
  snap.undoSnapshots = [];
  state.undoSnapshots.push(snap);
  if (state.undoSnapshots.length > 20) {
    state.undoSnapshots.shift();
  }
}

export function viewFor(state: GameState, playerToken: string | null): ClientGameState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    players: state.players,
    myPlayerId: playerToken ?? "",
    myHand: playerToken ? (state.hands[playerToken] ?? []) : [],
    opponentHandCounts: Object.fromEntries(
      Object.entries(state.hands)
        .filter(([token]) => token !== playerToken)
        .map(([token, cards]) => [token, cards.length])
    ),
    piles: state.piles.map(pile => ({
      id: pile.id,
      name: pile.name,
      faceUp: pile.faceUp,
      cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
        const isTop = i === arr.length - 1;
        return card.faceUp || isTop ? card : { faceUp: false as const };
      }),
    })) satisfies ClientPile[],
    canUndo: state.undoSnapshots.length > 0,
  };
}

type ConnectionState = { playerToken: string };

function getPlayerToken(connection: Party.Connection): string {
  const state = connection.state as ConnectionState | null | undefined;
  return state?.playerToken ?? connection.id;
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
    // Migrate state: Phase 3 had no undoSnapshots; Phase 4-01 had a per-player Record
    if (!this.gameState.undoSnapshots || !Array.isArray(this.gameState.undoSnapshots)) {
      this.gameState.undoSnapshots = [];
    }
    // Migrate state: Phase 9-01 adds displayName to Player
    for (const player of this.gameState.players) {
      if (!('displayName' in player)) {
        (player as any).displayName = '';
      }
    }
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const rawToken = url.searchParams.get("player") ?? connection.id;
    const playerToken = rawToken.slice(0, 64); // nanoid default is 21 chars; 64 is a generous cap
    const displayName = (url.searchParams.get("name") ?? '').slice(0, 20).replace(/[<>"'&]/g, '');

    const isExistingPlayer = this.gameState.players.some(p => p.id === playerToken);
    if (!isExistingPlayer && this.gameState.players.length >= 4) {
      connection.close(4000, "Room is full — maximum 4 players");
      return;
    }

    connection.setState({ playerToken });

    if (!this.gameState.players.find(p => p.id === playerToken)) {
      this.gameState.players.push({ id: playerToken, connected: true, displayName });
      this.gameState.hands[playerToken] = [];
    } else {
      const player = this.gameState.players.find(p => p.id === playerToken);
      if (player) {
        player.connected = true;
        if (displayName) player.displayName = displayName;
      }
    }

    await this.persist();
    this.broadcastState();
  }

  async onMessage(message: string, sender: Party.Connection) {
    if (typeof message !== 'string') {
      sender.send(JSON.stringify({ type: "ERROR", code: "INVALID_MESSAGE", message: "Binary messages not supported" } satisfies ServerEvent));
      return;
    }
    const senderToken = getPlayerToken(sender);
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
      case "MOVE_CARD": {
        const { cardId, fromZone, fromId, toZone, toId } = action;

        if (fromZone === "hand" && fromId !== senderToken) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_MOVE",
            message: "Cannot move another player's cards",
          } satisfies ServerEvent));
          break;
        }

        if (toZone === "hand" && toId !== senderToken) {
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

        takeSnapshot(this.gameState);
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
        const pos = action.insertPosition ?? 'top';
        if (pos === 'bottom') {
          dest.unshift(card);
        } else if (pos === 'random') {
          const buf = new Uint32Array(1);
          crypto.getRandomValues(buf);
          const idx = dest.length === 0 ? 0 : buf[0] % (dest.length + 1);
          dest.splice(idx, 0, card);
        } else {
          dest.push(card);
        }
        break;
      }
      case "REORDER_HAND": {
        const hand = this.gameState.hands[senderToken];
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
        this.gameState.hands[senderToken] = action.orderedCardIds.map(id => cardMap.get(id)!);
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
        takeSnapshot(this.gameState);
        flipCard.faceUp = !flipCard.faceUp;
        break;
      }
      case "PASS_CARD": {
        const sourceArr: Card[] | undefined =
          action.fromZone === "pile"
            ? this.gameState.piles.find(p => p.id === action.fromId)?.cards
            : this.gameState.hands[senderToken];
        if (!sourceArr) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: action.fromZone === "pile" ? "PILE_NOT_FOUND" : "HAND_NOT_FOUND",
            message: action.fromZone === "pile" ? `No pile with id: ${action.fromId}` : "Sender hand not found",
          } satisfies ServerEvent));
          break;
        }
        const passCardIdx = sourceArr.findIndex(c => c.id === action.cardId);
        if (passCardIdx === -1) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: action.fromZone === "pile" ? "CARD_NOT_IN_PILE" : "CARD_NOT_IN_HAND",
            message: `Card ${action.cardId} not found in source`,
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
        takeSnapshot(this.gameState);
        const [passedCard] = sourceArr.splice(passCardIdx, 1);
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
        takeSnapshot(this.gameState);                          // D-03: snapshot BEFORE shuffle
        dealDrawPile.cards = shuffle(dealDrawPile.cards);       // D-02: shuffle before popping
        this.broadcastShuffleEvent("draw");                     // D-05: broadcast to all clients
        await new Promise(resolve => setTimeout(resolve, 650)); // D-06: animation window (650ms)
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
        takeSnapshot(this.gameState);
        shufflePile.cards = shuffle(shufflePile.cards);
        this.broadcastShuffleEvent(action.pileId);   // D-05, D-07: broadcast to all clients
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
        this.gameState.undoSnapshots = [];
        break;
      }
      case "UNDO_MOVE": {
        const remainingSnapshots = [...this.gameState.undoSnapshots];
        const snap = remainingSnapshots.pop();
        if (!snap) {
          break;
        }
        this.gameState = snap;
        this.gameState.undoSnapshots = remainingSnapshots;
        break;
      }
      case "PING":
        break;
    }

    await this.persist();
    this.broadcastState();
  }

  async onClose(connection: Party.Connection) {
    const playerToken = getPlayerToken(connection);
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

  private broadcastShuffleEvent(pileId: string) {
    for (const conn of this.room.getConnections()) {
      conn.send(JSON.stringify({
        type: "PILE_SHUFFLED",
        pileId,
      } satisfies ServerEvent));
    }
  }

  private broadcastState() {
    for (const conn of this.room.getConnections()) {
      conn.send(JSON.stringify({
        type: "STATE_UPDATE",
        state: viewFor(this.gameState, getPlayerToken(conn)),
      } satisfies ServerEvent));
    }
  }
}

