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

function unbiasedRandom(max: number): number {
  // Rejection sampling: discard values that fall in the biased tail of the 2^32 range.
  // For a 52-card deck the loop runs at most 2 iterations in the rare case; expected ~1.
  const limit = 2 ** 32 - (2 ** 32 % max);
  let value: number;
  do {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = unbiasedRandom(i + 1);
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
      { id: "draw", name: "Draw", cards: buildDeck(), faceUp: false, region: "pile", ownerId: null },
      { id: "discard", name: "Discard", cards: [], faceUp: true, region: "pile", ownerId: null },
      { id: "play", name: "Play Area", cards: [], faceUp: true, region: "spread", ownerId: null },
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
  if (playerToken === null) {
    throw new Error("viewFor requires a non-null playerToken");
  }
  return {
    roomId: state.roomId,
    phase: state.phase,
    players: state.players,
    myPlayerId: playerToken ?? "",
    myHand: playerToken ? (state.hands[playerToken] ?? []) : [],
    myHandRevealed: state.players.find(p => p.id === playerToken)?.handRevealed ?? false,
    opponentHandCounts: Object.fromEntries(
      Object.entries(state.hands)
        .filter(([token]) => token !== playerToken)
        .filter(([token]) => !state.players.find(p => p.id === token)?.handRevealed)
        .map(([token, cards]) => [token, cards.length])
    ),
    opponentRevealedHands: Object.fromEntries(
      Object.entries(state.hands)
        .filter(([token]) => token !== playerToken)
        .filter(([token]) => state.players.find(p => p.id === token)?.handRevealed)
    ),
    piles: state.piles.map(pile => ({
      id: pile.id,
      name: pile.name,
      faceUp: pile.faceUp,
      region: pile.region,
      ownerId: pile.ownerId,
      cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
        if (pile.region === 'spread') return card; // spread zones: all cards always visible
        const isTop = i === arr.length - 1;
        return card.faceUp || isTop ? card : { faceUp: false as const };
      }),
    })) satisfies ClientPile[],
    canUndo: state.undoSnapshots.length > 0,
    myPlayZoneId: playerToken ? `spread-${playerToken}` : "",
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
    // Migrate state: Phase 14 adds region and ownerId to Pile
    for (const pile of this.gameState.piles) {
      if (!('region' in pile)) {
        (pile as any).region = "pile";
      }
      if (!('ownerId' in pile)) {
        (pile as any).ownerId = null;
      }
    }
    // Migrate state: Phase 14-GAP04 — convert 'play' pile to region='spread', remove 'spread-communal'
    const playPile = this.gameState.piles.find(p => p.id === "play");
    if (playPile) {
      playPile.region = "spread";
    }
    // Remove 'spread-communal' if it exists (now replaced by the 'play' pile as the communal spread zone)
    const communalIdx = this.gameState.piles.findIndex(p => p.id === "spread-communal");
    if (communalIdx !== -1) {
      // Move any cards from spread-communal into the play pile before removing it
      if (playPile) {
        playPile.cards.push(...this.gameState.piles[communalIdx].cards);
      }
      this.gameState.piles.splice(communalIdx, 1);
    }
    // If 'play' pile doesn't exist at all (very old state), seed it as a spread zone
    if (!this.gameState.piles.find(p => p.id === "play")) {
      this.gameState.piles.push({
        id: "play",
        name: "Play Area",
        cards: [],
        faceUp: true,
        region: "spread",
        ownerId: null,
      });
    }
    // Migrate state: Phase 22 adds handRevealed to Player
    for (const player of this.gameState.players) {
      if (!('handRevealed' in player)) {
        (player as any).handRevealed = false;
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
      this.gameState.players.push({ id: playerToken, connected: true, displayName, handRevealed: false });
      this.gameState.hands[playerToken] = [];
    } else {
      const player = this.gameState.players.find(p => p.id === playerToken);
      if (player) {
        player.connected = true;
        if (displayName) player.displayName = displayName;
      }
    }

    // Create personal spread zone idempotently (Phase 14)
    const spreadZoneId = `spread-${playerToken}`;
    if (!this.gameState.piles.some(p => p.id === spreadZoneId)) {
      const player = this.gameState.players.find(p => p.id === playerToken);
      this.gameState.piles.push({
        id: spreadZoneId,
        name: player?.displayName || playerToken.slice(0, 8),
        cards: [],
        faceUp: true,
        region: "spread",
        ownerId: playerToken,
      });
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
          const idx = dest.length === 0 ? 0 : unbiasedRandom(dest.length + 1);
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
        takeSnapshot(this.gameState);
        const cardMap = new Map(hand.map(c => [c.id, c]));
        this.gameState.hands[senderToken] = action.orderedCardIds.map(id => cardMap.get(id)!);
        break;
      }
      case "REORDER_PILE_SPREAD": {
        const spreadPile = this.gameState.piles.find(p => p.id === action.pileId && p.region === "spread");
        if (!spreadPile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No spread pile found with id: ${action.pileId}`,
          } satisfies ServerEvent));
          break;
        }
        const spreadIdSet = new Set(spreadPile.cards.map(c => c.id));
        if (
          action.orderedCardIds.length !== spreadPile.cards.length ||
          !action.orderedCardIds.every(id => spreadIdSet.has(id))
        ) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_REORDER",
            message: "orderedCardIds must contain exactly the spread pile's current cards",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        const spreadCardMap = new Map(spreadPile.cards.map(c => [c.id, c]));
        spreadPile.cards = action.orderedCardIds.map(id => spreadCardMap.get(id)!);
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
        if (
          !Number.isInteger(action.cardsPerPlayer) ||
          action.cardsPerPlayer < 1 ||
          action.cardsPerPlayer > 13
        ) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_CARDS_PER_PLAYER",
            message: "cardsPerPlayer must be an integer between 1 and 13",
          } satisfies ServerEvent));
          break;
        }
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
        // Ensure every connected player has an initialized hand entry (GAP-01: late joiners)
        for (const player of connectedPlayers) {
          if (!this.gameState.hands[player.id]) {
            this.gameState.hands[player.id] = [];
          }
        }
        // D-06: animation window (650ms). Relies on the assumption that Cloudflare Workers do
        // not hibernate during an active onMessage handler, so the setTimeout will resolve
        // before any eviction. If the worker is evicted mid-await the timer is lost and the
        // deal may hang; treat the animation delay as best-effort under hibernation mode.
        await new Promise(resolve => setTimeout(resolve, 650));
        for (let i = 0; i < action.cardsPerPlayer; i++) {
          for (const player of connectedPlayers) {
            const dealt = dealDrawPile.cards.pop()!;
            dealt.faceUp = true;
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
      case "SET_HAND_REVEALED": {
        // V4 Access Control: use senderToken (from connection state) — never trust message body for identity
        const revealPlayer = this.gameState.players.find(p => p.id === senderToken);
        if (revealPlayer) {
          // V5 Input Validation: strict boolean equality — string "true", 1, or other truthy non-booleans resolve to false
          const isRevealed = action.revealed === true;
          revealPlayer.handRevealed = isRevealed;
        }
        // Intentionally no takeSnapshot() — reveal state is not undoable (consistent with RESET_TABLE)
        break;
      }
      case "RESET_TABLE": {
        // INTENTIONAL: No takeSnapshot before reset — a reset is a commitment and cannot be undone.
        // Undo history is cleared so no pre-reset state can be restored.
        // INTENTIONAL: No authorization check — any connected player can reset the table.
        // If room-owner semantics are added in the future, add an ownership guard here before mutations.
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
        // D-07: clear all reveal states on reset
        for (const player of this.gameState.players) {
          player.handRevealed = false;
        }
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
      case "PLAY_CARD_SET": {
        const { cardIds, fromZone, fromId, toZone, toId } = action;

        // V1 Basic validation: cardIds must be non-empty
        if (cardIds.length === 0) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "EMPTY_CARD_SET",
            message: "cardIds must contain at least one card",
          } satisfies ServerEvent));
          break;
        }

        // V4 Access Control:
        //   - hand source (default or explicit 'hand'): sender can only play their own hand
        //   - pile source: any authenticated player may play from any pile
        //     (personal spread zone ownership guard deferred per REQUIREMENTS.md "Future Requirements")
        if (!fromZone || fromZone === "hand") {
          if (fromId !== senderToken) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "UNAUTHORIZED_MOVE",
              message: "Cannot play another player's cards",
            } satisfies ServerEvent));
            break;
          }
        }
        // TODO(SPREAD-03 ownership): pile-source ownership guard deferred per REQUIREMENTS.md.

        // V4b Destination Access Control: sender cannot place cards into another player's hand.
        // Guard is placed before source resolution and takeSnapshot to prevent orphaned undo snapshots.
        // Note: no guard on spread-${victimToken} here — spread zone ownership is deferred per REQUIREMENTS.md.
        if (toZone === "hand" && toId !== senderToken) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_MOVE",
            message: "Cannot place cards in another player's hand",
          } satisfies ServerEvent));
          break;
        }

        // Resolve source array based on fromZone
        const source: Card[] | undefined =
          (!fromZone || fromZone === "hand")
            ? this.gameState.hands[fromId]
            : this.gameState.piles.find(p => p.id === fromId)?.cards;

        if (source === undefined) {
          const code = (!fromZone || fromZone === "hand") ? "HAND_NOT_FOUND" : "PILE_NOT_FOUND";
          const message = (!fromZone || fromZone === "hand")
            ? `No hand found for player: ${fromId}`
            : `No pile found with id: ${fromId}`;
          sender.send(JSON.stringify({ type: "ERROR", code, message } satisfies ServerEvent));
          break;
        }

        // V5 Input Validation: every cardId must exist in the source BEFORE any mutation
        const sourceIdSet = new Set(source.map(c => c.id));
        const allPresent = cardIds.every(id => sourceIdSet.has(id));
        if (!allPresent) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "CARD_NOT_IN_SOURCE",
            message: "One or more card IDs not found in source",
          } satisfies ServerEvent));
          break;
        }

        // V6 Duplicate check: cardIds must not contain duplicates
        const cardIdSet = new Set(cardIds);
        if (cardIdSet.size !== cardIds.length) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "DUPLICATE_CARD_IDS",
            message: "cardIds must not contain duplicates",
          } satisfies ServerEvent));
          break;
        }

        // Resolve destination — toZone is 'pile' or 'hand'
        let dest: Card[] | undefined;
        if (toZone === "pile") {
          const destPile = this.gameState.piles.find(p => p.id === toId);
          dest = destPile?.cards;
        } else {
          // toZone === "hand": auto-create the hand array if missing (mirrors MOVE_CARD line 260)
          dest = this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []);
        }

        if (dest === undefined) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `No pile found with id: ${toId}`,
          } satisfies ServerEvent));
          break;
        }

        // Snapshot BEFORE mutation so UNDO_MOVE can revert
        takeSnapshot(this.gameState);

        // Build cardsToPlay preserving the cardIds order
        const sourceById = new Map(source.map(c => [c.id, c]));
        const cardsToPlay: Card[] = cardIds.map(id => sourceById.get(id)!);

        // Remove from source first (before mutating faceUp to keep source array clean)
        if (!fromZone || fromZone === "hand") {
          this.gameState.hands[fromId] = source.filter(c => !cardIdSet.has(c.id));
        } else {
          const srcPile = this.gameState.piles.find(p => p.id === fromId)!;
          srcPile.cards = srcPile.cards.filter(c => !cardIdSet.has(c.id));
        }

        // Set faceUp after removal:
        //   - toZone === 'hand': always faceUp:true (mirrors MOVE_CARD line 274–275)
        //   - toZone === 'pile': inherit pile.faceUp (existing behavior)
        if (toZone === "hand") {
          cardsToPlay.forEach(card => { card.faceUp = true; });
        } else {
          const destPile = this.gameState.piles.find(p => p.id === toId)!;
          cardsToPlay.forEach(card => { card.faceUp = destPile.faceUp === true; });
        }
        dest.push(...cardsToPlay);
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
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "PILE_SHUFFLED",
        pileId,
      } satisfies ServerEvent));
    }
  }

  private broadcastState() {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "STATE_UPDATE",
        state: viewFor(this.gameState, getPlayerToken(conn)),
      } satisfies ServerEvent));
    }
  }
}

