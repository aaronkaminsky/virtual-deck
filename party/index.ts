import type * as Party from "partykit/server";
import type { AttractAntic, CanvasCard, Card, ClientAction, ClientGameState, ClientPile, EffectKind, GameState, MaskedCard, ServerEvent, Suit, Rank } from "../src/shared/types";
import { ATTRACT_ANTICS } from "../src/shared/types";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://aaronkaminsky.github.io",
];
const PROD_ORIGIN = "https://aaronkaminsky.github.io";

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function occupancyBody(connectionCount: number): { occupied: boolean; playerCount: number } {
  return { occupied: connectionCount > 0, playerCount: connectionCount };
}

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
    ],
    undoSnapshots: [],
    canvasCards: [],
    chipsEnabled: false,
    startingChips: 1000,
    pot: 0,
    chipsInitialized: false,
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

export function viewFor(state: GameState, playerToken: string): ClientGameState {
  if (!playerToken) throw new Error("viewFor requires a non-null playerToken");
  return {
    roomId: state.roomId,
    phase: state.phase,
    players: state.players,
    myPlayerId: playerToken,
    myHand: state.hands[playerToken] ?? [],
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
      pos: pile.pos,
      cards: pile.cards.map((card, i, arr): Card | MaskedCard => {
        if (pile.region === 'spread') return card; // spread zones: all cards always visible
        const isTop = i === arr.length - 1;
        return card.faceUp || isTop ? card : { faceUp: false as const };
      }),
    })) satisfies ClientPile[],
    canUndo: state.undoSnapshots.length > 0,
    pot: state.pot,
    chipsEnabled: state.chipsEnabled,
    startingChips: state.startingChips,
    myPlayZoneId: `spread-${playerToken}`,
    canvasCards: state.canvasCards.map(cc => ({ card: cc.card, x: cc.x, y: cc.y, z: cc.z })),
  };
}

export const ATTRACT_IDLE_MS = 180_000;
export const ATTRACT_REPEAT_MS = 300_000;
export const ATTRACT_MIN_OVERRIDE_MS = 5_000;

export function pickAttractAntic(previous: AttractAntic | undefined, rand: number): AttractAntic {
  const candidates = ATTRACT_ANTICS.filter(a => a !== previous);
  return candidates[Math.min(candidates.length - 1, Math.floor(rand * candidates.length))];
}

type ConnectionState = { playerToken: string };

function getPlayerToken(connection: Party.Connection): string {
  const state = connection.state as ConnectionState | null | undefined;
  return state?.playerToken ?? connection.id;
}

export default class GameRoom implements Party.Server {
  static options = { hibernate: true };
  gameState: GameState;
  attractIdleMsOverride: number | null = null;

  constructor(readonly room: Party.Room) {
    // Alarm wake on a hibernated room has no Party.id; the real state is
    // rehydrated from storage in onStart before any handler runs.
    let roomId = "";
    try { roomId = room.id; } catch { /* alarm-context wake */ }
    this.gameState = defaultGameState(roomId);
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
    // Migrate state: Phase 22 adds handRevealed to Player
    for (const player of this.gameState.players) {
      if (!('handRevealed' in player)) {
        (player as any).handRevealed = false;
      }
    }
    // Migrate state: Phase 32 adds canvasCards to GameState
    if (!Array.isArray((this.gameState as any).canvasCards)) {
      (this.gameState as unknown as GameState).canvasCards = [];
    }
    // Migrate state: Phase 999.17 adds chip fields to Player and GameState
    for (const player of this.gameState.players) {
      if (!('chipsInHand' in player)) {
        (player as any).chipsInHand = 0;
      }
      if (!('chipsInSpread' in player)) {
        (player as any).chipsInSpread = 0;
      }
    }
    if (!('chipsEnabled' in this.gameState)) {
      (this.gameState as unknown as GameState).chipsEnabled = false;
    }
    if (!('startingChips' in this.gameState)) {
      (this.gameState as unknown as GameState).startingChips = 1000;
    }
    if (!('pot' in this.gameState)) {
      (this.gameState as unknown as GameState).pot = 0;
    }
    if (!('chipsInitialized' in this.gameState)) {
      (this.gameState as unknown as GameState).chipsInitialized = false;
    }
    this.attractIdleMsOverride =
      (await this.room.storage.get<number>("attractIdleMsOverride")) ?? null;
  }

  async onRequest(req: Party.Request): Promise<Response> {
    const origin = req.headers.get("Origin");
    const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
    }
    const count = [...this.room.getConnections()].length;
    return new Response(JSON.stringify(occupancyBody(count)), { status: 200, headers });
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
      this.gameState.players.push({ id: playerToken, connected: true, displayName, handRevealed: false, chipsInHand: this.gameState.chipsEnabled ? this.gameState.startingChips : 0, chipsInSpread: 0 });
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

    const attractParam = url.searchParams.get("attractIdleMs");
    if (attractParam !== null) {
      const parsed = Number(attractParam);
      if (Number.isFinite(parsed)) {
        this.attractIdleMsOverride = Math.max(ATTRACT_MIN_OVERRIDE_MS, Math.floor(parsed));
        await this.room.storage.put("attractIdleMsOverride", this.attractIdleMsOverride);
      }
    }
    await this.armAttractAlarm(this.attractIdleMsOverride ?? ATTRACT_IDLE_MS);

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
    let lastMoveArgs: { toZoneType: "hand" | "pile" | "canvas"; toZoneId: string; cardIds: string[] } | null = null;
    let clearLastMove = false;
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

        // Canvas source: look up in canvasCards array
        if (fromZone === "canvas") {
          const canvasIdx = this.gameState.canvasCards.findIndex(c => c.card.id === cardId);
          if (canvasIdx === -1) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "CARD_NOT_IN_SOURCE",
              message: `Card ${cardId} not found on canvas`,
            } satisfies ServerEvent));
            break;
          }

          const dest: Card[] | undefined =
            toZone === "hand"
              ? (this.gameState.hands[toId] ?? (this.gameState.hands[toId] = []))
              : this.gameState.piles.find(p => p.id === toId)?.cards;

          if (dest === undefined) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "PILE_NOT_FOUND",
              message: `No pile found with id: ${toId}`,
            } satisfies ServerEvent));
            break;
          }

          takeSnapshot(this.gameState);
          const [removedCanvasEntry] = this.gameState.canvasCards.splice(canvasIdx, 1);
          const canvasCard = removedCanvasEntry.card;

          if (toZone === "hand") {
            canvasCard.faceUp = true;
          } else {
            const destPile = this.gameState.piles.find(p => p.id === toId);
            canvasCard.faceUp = destPile?.faceUp ?? false;
          }
          const canvasPos = action.insertPosition ?? 'top';
          if (canvasPos === 'bottom') {
            dest.unshift(canvasCard);
          } else if (canvasPos === 'random') {
            const randomIdx = dest.length === 0 ? 0 : unbiasedRandom(dest.length + 1);
            dest.splice(randomIdx, 0, canvasCard);
          } else {
            dest.push(canvasCard);
          }
          lastMoveArgs = { toZoneType: toZone, toZoneId: toId, cardIds: [cardId] };
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
        lastMoveArgs = { toZoneType: toZone, toZoneId: toId, cardIds: [cardId] };
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
        if (!action.skipSnapshot) {
          takeSnapshot(this.gameState);
        }
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
        if (!action.skipSnapshot) {
          takeSnapshot(this.gameState);
        }
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
        lastMoveArgs = { toZoneType: "pile", toZoneId: action.pileId, cardIds: [action.cardId] };
        break;
      }
      case "PASS_CARD": {
        if (!this.gameState.hands[action.targetPlayerId]) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PLAYER_NOT_FOUND",
            message: `Player ${action.targetPlayerId} not found`,
          } satisfies ServerEvent));
          break;
        }
        if (action.fromZone === "canvas") {
          const canvasIdx = this.gameState.canvasCards.findIndex(cc => cc.card.id === action.cardId);
          if (canvasIdx === -1) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "CARD_NOT_ON_CANVAS",
              message: `Card ${action.cardId} not found on canvas`,
            } satisfies ServerEvent));
            break;
          }
          takeSnapshot(this.gameState);
          const [removed] = this.gameState.canvasCards.splice(canvasIdx, 1);
          const canvasPassedCard = { ...removed.card, faceUp: true };
          this.gameState.hands[action.targetPlayerId].push(canvasPassedCard);
          lastMoveArgs = { toZoneType: "hand", toZoneId: action.targetPlayerId, cardIds: [action.cardId] };
          break;
        }
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
        takeSnapshot(this.gameState);
        const [passedCard] = sourceArr.splice(passCardIdx, 1);
        passedCard.faceUp = true;
        this.gameState.hands[action.targetPlayerId].push(passedCard);
        lastMoveArgs = { toZoneType: "hand", toZoneId: action.targetPlayerId, cardIds: [action.cardId] };
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
        this.broadcastEffect("deal");
        break;
      }
      case "DEAL_NEXT_HAND": {
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
        const nextHandPlayers = this.gameState.players.filter(p => p.connected);
        const nextHandNeeded = action.cardsPerPlayer * nextHandPlayers.length;
        const totalCards =
          Object.values(this.gameState.hands).reduce((sum, hand) => sum + hand.length, 0) +
          this.gameState.piles.reduce((sum, pile) => sum + pile.cards.length, 0) +
          this.gameState.canvasCards.length;
        if (totalCards < nextHandNeeded) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INSUFFICIENT_CARDS",
            message: "Not enough cards to deal",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        this.gatherAllCardsToDraw();
        this.broadcastShuffleEvent("draw");
        await new Promise(resolve => setTimeout(resolve, 650));
        const nextHandDrawPile = this.gameState.piles.find(p => p.id === "draw")!;
        for (const player of nextHandPlayers) {
          if (!this.gameState.hands[player.id]) {
            this.gameState.hands[player.id] = [];
          }
        }
        for (let i = 0; i < action.cardsPerPlayer; i++) {
          for (const player of nextHandPlayers) {
            const dealt = nextHandDrawPile.cards.pop()!;
            dealt.faceUp = true;
            this.gameState.hands[player.id].push(dealt);
          }
        }
        this.gameState.phase = "playing";
        this.broadcastEffect("deal");
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
        // 1013: occasionally (~1-in-10) flourish instead of the plain cut.
        const animationType = Math.random() < 0.1 ? "flourish" : "normal";
        this.broadcastShuffleEvent(action.pileId, animationType);   // D-05, D-07: broadcast to all clients
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
        const resetDrawPile = this.gameState.piles.find(p => p.id === "draw");
        if (!resetDrawPile) break;
        this.gatherAllCardsToDraw();
        this.gameState.phase = "setup";
        this.gameState.undoSnapshots = [];
        break;
      }
      case "PLACE_ON_CANVAS": {
        const { cardId, fromZone, fromId, x, y } = action;

        // V5: coordinate validation
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INVALID_COORDINATES",
            message: "x and y must be finite numbers",
          } satisfies ServerEvent));
          break;
        }

        // V4: hand source auth guard — mirrors MOVE_CARD pattern
        if (fromZone === "hand" && fromId !== senderToken) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_MOVE",
            message: "Cannot move another player's cards",
          } satisfies ServerEvent));
          break;
        }

        // Pre-validate source contains cardId (before takeSnapshot)
        let canvasCard: Card | undefined;
        // Compute maxZ before any splice so canvas→canvas repositioning always increments z
        const maxZBeforeSplice = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);
        if (fromZone === "hand") {
          const hand = this.gameState.hands[fromId];
          const idx = hand?.findIndex(c => c.id === cardId) ?? -1;
          if (idx === -1) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "CARD_NOT_IN_SOURCE",
              message: `Card ${cardId} not found in hand`,
            } satisfies ServerEvent));
            break;
          }
          takeSnapshot(this.gameState);
          [canvasCard] = hand.splice(idx, 1);
        } else if (fromZone === "pile") {
          const pile = this.gameState.piles.find(p => p.id === fromId);
          const idx = pile?.cards.findIndex(c => c.id === cardId) ?? -1;
          if (idx === -1) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "CARD_NOT_IN_SOURCE",
              message: `Card ${cardId} not found in pile`,
            } satisfies ServerEvent));
            break;
          }
          takeSnapshot(this.gameState);
          [canvasCard] = pile!.cards.splice(idx, 1);
        } else {
          // fromZone === "canvas"
          const idx = this.gameState.canvasCards.findIndex(c => c.card.id === cardId);
          if (idx === -1) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "CARD_NOT_IN_SOURCE",
              message: `Card ${cardId} not found on canvas`,
            } satisfies ServerEvent));
            break;
          }
          takeSnapshot(this.gameState);
          const [removed] = this.gameState.canvasCards.splice(idx, 1);
          canvasCard = removed.card;
        }

        canvasCard!.faceUp = true;
        const maxZ = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), maxZBeforeSplice);
        this.gameState.canvasCards.push({ card: canvasCard!, x, y, z: maxZ + 1 });
        lastMoveArgs = { toZoneType: "canvas", toZoneId: "canvas", cardIds: [cardId] };
        break;
      }
      case "GROUP_PLACE_ON_CANVAS": {
        const { fromZone, fromId, cards } = action;

        // V1: cards array must be non-empty
        if (cards.length === 0) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "EMPTY_CARD_SET",
            message: "cards must contain at least one card",
          } satisfies ServerEvent));
          break;
        }

        // V2: per-card finite coordinate check
        for (const c of cards) {
          if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) {
            sender.send(JSON.stringify({
              type: "ERROR",
              code: "INVALID_COORDINATES",
              message: "x and y must be finite numbers",
            } satisfies ServerEvent));
            break;
          }
        }
        // Re-check after loop so we can break out of the case
        if (cards.some(c => !Number.isFinite(c.x) || !Number.isFinite(c.y))) break;

        // V3: duplicate cardIds check
        const groupCardIdSet = new Set(cards.map(c => c.cardId));
        if (groupCardIdSet.size !== cards.length) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "DUPLICATE_CARD_IDS",
            message: "cardIds must be unique",
          } satisfies ServerEvent));
          break;
        }

        // V4: hand source auth guard
        if (fromZone === "hand" && fromId !== senderToken) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_MOVE",
            message: "Cannot move another player's cards",
          } satisfies ServerEvent));
          break;
        }

        // V5: resolve all cardIds in source (read-only — no mutation yet)
        // Compute maxZ BEFORE any splice so pre-splice z values are captured
        const maxZGroup = this.gameState.canvasCards.reduce((m, c) => Math.max(m, c.z), 0);

        type ResolvedGroupCard = { card: Card; preDragZ: number; x: number; y: number };
        const resolvedGroupCards: ResolvedGroupCard[] = [];

        let missingCardId: string | null = null;

        if (fromZone === "hand") {
          const hand = this.gameState.hands[fromId] ?? [];
          for (const { cardId, x, y } of cards) {
            const found = hand.find(c => c.id === cardId);
            if (!found) { missingCardId = cardId; break; }
            resolvedGroupCards.push({ card: found, preDragZ: 0, x, y });
          }
        } else if (fromZone === "pile") {
          const pile = this.gameState.piles.find(p => p.id === fromId);
          const pileCards = pile?.cards ?? [];
          for (const { cardId, x, y } of cards) {
            const found = pileCards.find(c => c.id === cardId);
            if (!found) { missingCardId = cardId; break; }
            resolvedGroupCards.push({ card: found, preDragZ: 0, x, y });
          }
        } else {
          // fromZone === "canvas"
          for (const { cardId, x, y } of cards) {
            const found = this.gameState.canvasCards.find(cc => cc.card.id === cardId);
            if (!found) { missingCardId = cardId; break; }
            resolvedGroupCards.push({ card: found.card, preDragZ: found.z, x, y });
          }
        }

        if (missingCardId !== null) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "CARD_NOT_IN_SOURCE",
            message: `Card ${missingCardId} not found in ${fromZone}`,
          } satisfies ServerEvent));
          break;
        }

        // All validation passed — take exactly one snapshot
        takeSnapshot(this.gameState);

        // Atomically remove all cards from source
        if (fromZone === "hand") {
          this.gameState.hands[fromId] = (this.gameState.hands[fromId] ?? []).filter(
            c => !groupCardIdSet.has(c.id),
          );
        } else if (fromZone === "pile") {
          const srcPile = this.gameState.piles.find(p => p.id === fromId)!;
          srcPile.cards = srcPile.cards.filter(c => !groupCardIdSet.has(c.id));
        } else {
          // fromZone === "canvas" — collect indices descending to avoid index shift
          const indicesToRemove = resolvedGroupCards
            .map(r => this.gameState.canvasCards.findIndex(cc => cc.card.id === r.card.id))
            .sort((a, b) => b - a);
          for (const idx of indicesToRemove) {
            if (idx !== -1) this.gameState.canvasCards.splice(idx, 1);
          }
        }

        // Sort by pre-drag z ascending, then assign z = maxZ + 1 + rank
        resolvedGroupCards.sort((a, b) => a.preDragZ - b.preDragZ);
        resolvedGroupCards.forEach((r, rank) => {
          r.card.faceUp = true;
          this.gameState.canvasCards.push({ card: r.card, x: r.x, y: r.y, z: maxZGroup + 1 + rank });
        });
        lastMoveArgs = { toZoneType: "canvas", toZoneId: "canvas", cardIds: resolvedGroupCards.map(r => r.card.id) };

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
        clearLastMove = true;
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
            : fromZone === "canvas"
              ? this.gameState.canvasCards.map(cc => cc.card)
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
        } else if (fromZone === "canvas") {
          this.gameState.canvasCards = this.gameState.canvasCards.filter(cc => !cardIdSet.has(cc.card.id));
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
        lastMoveArgs = { toZoneType: toZone, toZoneId: toId, cardIds };
        break;
      }
      case "MOVE_ALL_PILE_CARDS": {
        const { fromId, toId } = action;
        const srcPile = this.gameState.piles.find(p => p.id === fromId);
        const destPile = this.gameState.piles.find(p => p.id === toId);
        if (!srcPile || !destPile) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "PILE_NOT_FOUND",
            message: `Pile not found: ${!srcPile ? fromId : toId}`,
          } satisfies ServerEvent));
          break;
        }
        if (srcPile.cards.length === 0) break; // nothing to move
        takeSnapshot(this.gameState);
        const moving = srcPile.cards.splice(0); // remove all cards
        moving.forEach(card => { card.faceUp = destPile.faceUp === true; });
        destPile.cards.push(...moving);
        break;
      }
      case "CELEBRATE": {
        this.broadcastEffect(action.kind ?? "celebrate");
        break;
      }
      case "SET_CHIPS_MODE": {
        const wasInitialized = this.gameState.chipsInitialized;
        this.gameState.chipsEnabled = action.enabled === true;
        if (Number.isFinite(action.startingChips) && action.startingChips >= 0) {
          this.gameState.startingChips = Math.floor(action.startingChips);
        }
        if (this.gameState.chipsEnabled && !wasInitialized) {
          for (const player of this.gameState.players) {
            player.chipsInHand = this.gameState.startingChips;
            player.chipsInSpread = 0;
          }
          this.gameState.pot = 0;
          this.gameState.chipsInitialized = true;
        }
        // Intentionally no takeSnapshot() — mode toggle is not undoable (consistent with RESET_TABLE/SET_HAND_REVEALED)
        break;
      }
      case "TRANSFER_CHIPS": {
        const { from, to, playerId, amount } = action;
        if (!this.gameState.chipsEnabled || from === to || !Number.isInteger(amount) || amount <= 0) {
          break;
        }
        if ((from !== "pot" || to !== "pot") && playerId !== senderToken) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED_CHIP_TRANSFER",
            message: "Cannot move another player's chips",
          } satisfies ServerEvent));
          break;
        }
        const chipPlayer = this.gameState.players.find(p => p.id === playerId);
        if (!chipPlayer) break;
        const sourceAmount = from === "hand" ? chipPlayer.chipsInHand : from === "spread" ? chipPlayer.chipsInSpread : this.gameState.pot;
        if (sourceAmount < amount) {
          sender.send(JSON.stringify({
            type: "ERROR",
            code: "INSUFFICIENT_CHIPS",
            message: "Not enough chips at the source",
          } satisfies ServerEvent));
          break;
        }
        takeSnapshot(this.gameState);
        if (from === "hand") chipPlayer.chipsInHand -= amount;
        else if (from === "spread") chipPlayer.chipsInSpread -= amount;
        else this.gameState.pot -= amount;
        if (to === "hand") chipPlayer.chipsInHand += amount;
        else if (to === "spread") chipPlayer.chipsInSpread += amount;
        else this.gameState.pot += amount;
        if (from === "hand" && to === "spread") {
          this.broadcastEffect("chip-bet");
        } else if (to === "pot" || from === "pot") {
          this.broadcastEffect("chip-collect");
        }
        break;
      }
      case "PING":
        break;
    }

    await this.armAttractAlarm(this.attractIdleMsOverride ?? ATTRACT_IDLE_MS);
    await this.persist();
    this.broadcastState();
    if (lastMoveArgs) {
      this.broadcastLastMove(lastMoveArgs.toZoneType, lastMoveArgs.toZoneId, lastMoveArgs.cardIds);
    } else if (clearLastMove) {
      this.broadcastClearLastMove();
    }
  }

  // Room-wide idle: fires only when no message has re-armed the alarm for the
  // full idle window. Empty rooms stop the cycle; the next onConnect restarts it.
  // NB: alarm context has no Party.id — nothing in this method (or the constructor) may read room.id.
  async onAlarm() {
    const connections = [...this.room.getConnections()];
    if (connections.length === 0) return;
    const previous = await this.room.storage.get<AttractAntic>("lastAttractAntic");
    const antic = pickAttractAntic(previous, Math.random());
    await this.room.storage.put("lastAttractAntic", antic);
    this.broadcastEffect("attract", antic);
    // The attractIdleMs override intentionally governs the repeat cadence too (see design spec).
    await this.armAttractAlarm(this.attractIdleMsOverride ?? ATTRACT_REPEAT_MS);
  }

  private async armAttractAlarm(delayMs: number) {
    await this.room.storage.setAlarm(Date.now() + delayMs);
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

  private gatherAllCardsToDraw(): void {
    const drawPile = this.gameState.piles.find(p => p.id === "draw");
    if (!drawPile) return;
    for (const hand of Object.values(this.gameState.hands)) {
      drawPile.cards.push(...hand.splice(0));
    }
    for (const pile of this.gameState.piles) {
      if (pile.id !== "draw") {
        drawPile.cards.push(...pile.cards.splice(0));
      }
    }
    for (const canvasCard of this.gameState.canvasCards) {
      canvasCard.card.faceUp = false;
      drawPile.cards.push(canvasCard.card);
    }
    this.gameState.canvasCards = [];
    drawPile.faceUp = false;
    drawPile.cards.forEach(c => { c.faceUp = false; });
    drawPile.cards = shuffle(drawPile.cards);
    for (const player of this.gameState.players) {
      player.handRevealed = false;
    }
  }

  private broadcastShuffleEvent(pileId: string, animationType: "normal" | "flourish" = "normal") {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "PILE_SHUFFLED",
        pileId,
        animationType,
      } satisfies ServerEvent));
    }
  }

  private broadcastEffect(kind: EffectKind, antic?: AttractAntic) {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({
        type: "EFFECT",
        kind,
        ...(antic !== undefined ? { antic } : {}),
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

  private broadcastLastMove(toZoneType: "hand" | "pile" | "canvas", toZoneId: string, cardIds: string[]) {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({ type: "LAST_MOVE", toZoneType, toZoneId, cardIds } satisfies ServerEvent));
    }
  }

  private broadcastClearLastMove() {
    for (const conn of [...this.room.getConnections()]) {
      conn.send(JSON.stringify({ type: "CLEAR_LAST_MOVE" } satisfies ServerEvent));
    }
  }
}

