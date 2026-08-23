import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    setAlarm: vi.fn().mockResolvedValue(undefined),
    getAlarm: vi.fn().mockResolvedValue(null),
    deleteAlarm: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
    ...overrides,
  } as unknown as Party.Room;
}

function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

describe("DEAL_CARDS handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.hands["player-2"] = [];
  });

  it("distributes N cards per player in round-robin order from draw pile", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(drawPile.cards.length).toBeGreaterThanOrEqual(4);

    const initialCount = drawPile.cards.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    expect(drawPile.cards).toHaveLength(initialCount - 4);
  });

  it("sets phase to playing", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.phase).toBe("playing");
  });

  it("sends ERROR with code INSUFFICIENT_CARDS when draw pile has too few cards", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("A-s")];

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 5 }), sender);

    const errors = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INSUFFICIENT_CARDS");
  });

  it("deals only to connected players (skips disconnected)", async () => {
    room.gameState.players.push({ id: "player-3", connected: false, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-3"] = [];

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const initialCount = drawPile.cards.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    expect(room.gameState.hands["player-3"]).toHaveLength(0);
    expect(drawPile.cards).toHaveLength(initialCount - 4);
  });

  it("sets dealt cards faceUp to true", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    for (const card of room.gameState.hands["player-1"]) {
      expect(card.faceUp).toBe(true);
    }
    for (const card of room.gameState.hands["player-2"]) {
      expect(card.faceUp).toBe(true);
    }
  });

  // Regression: DEAL_CARDS used to only deal to the player who sent the action.
  // Both players must receive cards even when the sender is only one of them.
  it("regression: non-sender players also receive cards (deal distributes to all, not just sender)", async () => {
    // sender is player-1; player-2 is the non-sending connected player
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 3 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(3);
    expect(room.gameState.hands["player-2"]).toHaveLength(3);
  });

  it("snapshot captured before DEAL_CARDS has the original pre-shuffle pile order", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [
      makeCard("A-s"), makeCard("2-s"), makeCard("3-s"),
      makeCard("4-s"), makeCard("5-s"), makeCard("6-s"),
    ];
    const originalOrder = drawPile.cards.map(c => c.id);

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), sender);

    // The snapshot was taken before shuffle — snapshot pile order == original
    const snapshotPile = room.gameState.undoSnapshots[0].piles.find(p => p.id === "draw")!;
    expect(snapshotPile.cards.map(c => c.id)).toEqual(originalOrder);
  });

  it("undo after DEAL_CARDS restores pre-shuffle pile order and all cards", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const originalCards = drawPile.cards.map(c => c.id);

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), sender);

    // Snapshot should have the full original pile in original order
    const snap = room.gameState.undoSnapshots[0];
    expect(snap.piles.find(p => p.id === "draw")!.cards.map(c => c.id)).toEqual(originalCards);
    expect(snap.hands["player-1"]).toHaveLength(0);
    expect(snap.hands["player-2"]).toHaveLength(0);
  });

  it("late-joining player receives cards after reset and re-deal", async () => {
    // player-1 and player-2 exist from beforeEach
    // Simulate a prior deal then reset
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);
    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    // Late joiner: add player-3 after initial deal cycle, before re-deal
    room.gameState.players.push({ id: "player-3", connected: true, displayName: "Late", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    // Do NOT set room.gameState.hands["player-3"] — simulate the gap scenario

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    expect(room.gameState.hands["player-3"]).toHaveLength(2);
  });

  it("DEAL_CARDS initializes missing hand entry for connected player before dealing", async () => {
    // Manually add a player who is connected but has no hands entry
    room.gameState.players.push({ id: "orphan-player", connected: true, displayName: "Orphan", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    // Deliberately omit: room.gameState.hands["orphan-player"] = []

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.hands["orphan-player"]).toBeDefined();
    expect(room.gameState.hands["orphan-player"]).toHaveLength(1);
  });

  it("broadcasts PILE_SHUFFLED event to all connections on DEAL_CARDS", async () => {
    const conn1 = makeMockConnection("conn-1");
    const conn2 = makeMockConnection("conn-2");
    const connections = [conn1, conn2];
    const roomWithConns = makeMockRoom({
      getConnections: (() => connections[Symbol.iterator]()) as unknown as Party.Room["getConnections"],
    });
    const roomWithConnections = new GameRoom(roomWithConns);
    roomWithConnections.gameState.players.push({ id: "conn-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    roomWithConnections.gameState.players.push({ id: "conn-2", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    roomWithConnections.gameState.hands["conn-1"] = [];
    roomWithConnections.gameState.hands["conn-2"] = [];

    await roomWithConnections.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), conn1);

    const conn1Messages = conn1.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
    const conn2Messages = conn2.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);

    const shuffleEvents1 = conn1Messages.filter(e => e.type === "PILE_SHUFFLED");
    const shuffleEvents2 = conn2Messages.filter(e => e.type === "PILE_SHUFFLED");

    expect(shuffleEvents1).toHaveLength(1);
    expect((shuffleEvents1[0] as { type: "PILE_SHUFFLED"; pileId: string }).pileId).toBe("draw");
    expect(shuffleEvents2).toHaveLength(1);
    expect((shuffleEvents2[0] as { type: "PILE_SHUFFLED"; pileId: string }).pileId).toBe("draw");
  });

  it("deals more than 13 cards per player when the draw pile allows it", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 20 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(20);
    expect(room.gameState.hands["player-2"]).toHaveLength(20);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(12);
  });

  it("deals the entire deck to a single player", async () => {
    room.gameState.players = room.gameState.players.filter(p => p.id === "player-1");

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 52 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(52);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(0);
  });

  it("still refuses more cards than the draw pile holds", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 27 }), sender);

    const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
    expect(sent.some(e => e.type === "ERROR" && e.code === "INSUFFICIENT_CARDS")).toBe(true);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });

  it("still refuses zero, negative, and non-integer counts", async () => {
    for (const bad of [0, -3, 2.5]) {
      sender.send.mockClear();
      await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: bad }), sender);
      const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
      expect(sent.some(e => e.type === "ERROR" && e.code === "INVALID_CARDS_PER_PLAYER")).toBe(true);
    }
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });

  it("deals the entire 54-card joker deck to a single player", async () => {
    await room.onMessage(JSON.stringify({ type: "SET_JOKERS_MODE", enabled: true }), sender);
    room.gameState.players = room.gameState.players.filter(p => p.id === "player-1");

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 54 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(54);
    expect(room.gameState.piles.find(p => p.id === "draw")!.cards).toHaveLength(0);
  });

  // I-1: a bare setTimeout await does not hold the Durable Object's input gate, so a
  // second DEAL_CARDS delivered inside the 650ms shuffle-animation window used to pass
  // its own availability check against the not-yet-decremented pile, then crash the
  // handler mid-mutation when pop() returned undefined. Both onMessage calls are started
  // here without awaiting the first to completion, to reproduce the overlap.
  it("rejects a second concurrent deal that races the first inside the shuffle-animation window", async () => {
    vi.useFakeTimers();
    try {
      const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
      const initialCount = drawPile.cards.length; // 52, standard deck

      const first = room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 20 }), sender);
      const second = room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 20 }), sender);

      await vi.runAllTimersAsync();
      await expect(Promise.all([first, second])).resolves.toBeDefined();

      // First deal wins the race and completes normally.
      expect(room.gameState.hands["player-1"]).toHaveLength(20);
      expect(room.gameState.hands["player-2"]).toHaveLength(20);
      expect(drawPile.cards).toHaveLength(initialCount - 40);

      // Second deal is rejected, not silently corrupted or thrown.
      const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
      const insufficientErrors = sent.filter(e => e.type === "ERROR" && e.code === "INSUFFICIENT_CARDS");
      expect(insufficientErrors).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("DEAL_NEXT_HAND handler (1041)", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.phase = "playing";
  });

  it("deals more than 13 cards per player when the deck allows it", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 30 }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(30);
  });

  it("still refuses more cards than exist in the game", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 53 }), sender);

    const sent = sender.send.mock.calls.map(c => JSON.parse(c[0] as string) as ServerEvent);
    expect(sent.some(e => e.type === "ERROR" && e.code === "INSUFFICIENT_CARDS")).toBe(true);
  });
});
