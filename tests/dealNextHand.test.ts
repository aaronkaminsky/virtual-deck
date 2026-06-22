import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type * as Party from "partykit/server";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

describe("DEAL_NEXT_HAND handler", () => {
  let room: GameRoom;
  let mockRoom: Party.Room;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    // Start in playing phase with cards dealt to hands
    room.gameState.phase = "playing";
    room.gameState.hands["player-1"] = [makeCard("A-s", true), makeCard("K-h", true)];
    room.gameState.hands["player-2"] = [makeCard("Q-d", true)];
    // Trim draw pile to a known small set to control total card count
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("2-c"), makeCard("3-c"), makeCard("4-c"), makeCard("5-c"), makeCard("6-c")];
    // Total cards = 2 + 1 + 5 = 8
  });

  it("gathers all cards to draw pile before dealing", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    // After deal, 4 cards dealt (2 × 2 players), remainder stays in draw
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
    // 8 total - 4 dealt = 4 remaining in draw
    expect(drawPile.cards).toHaveLength(4);
  });

  it("all cards from all sources end up accounted for", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const totalAfter =
      drawPile.cards.length +
      room.gameState.hands["player-1"].length +
      room.gameState.hands["player-2"].length;
    expect(totalAfter).toBe(8); // Same total as before
  });

  it("dealt cards are face-up", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    for (const card of room.gameState.hands["player-1"]) {
      expect(card.faceUp).toBe(true);
    }
    for (const card of room.gameState.hands["player-2"]) {
      expect(card.faceUp).toBe(true);
    }
  });

  it("remaining draw pile cards are face-down", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    for (const card of drawPile.cards) {
      expect(card.faceUp).toBe(false);
    }
  });

  it("sets phase to playing", async () => {
    room.gameState.phase = "playing";
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.phase).toBe("playing");
  });

  it("takes exactly one snapshot (making it undoable)", async () => {
    room.gameState.undoSnapshots = [];
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.undoSnapshots).toHaveLength(1);
  });

  it("undo after DEAL_NEXT_HAND restores pre-action hand and table", async () => {
    const originalP1Hand = room.gameState.hands["player-1"].map(c => c.id);
    const originalP2Hand = room.gameState.hands["player-2"].map(c => c.id);

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(originalP1Hand);
    expect(room.gameState.hands["player-2"].map(c => c.id)).toEqual(originalP2Hand);
  });

  it("broadcasts PILE_SHUFFLED for draw pile", async () => {
    const conn1 = makeMockConnection("player-1");
    const conn2 = makeMockConnection("player-2");
    const connections = [conn1, conn2];
    const roomWithConns = makeMockRoom(connections);
    const r = new GameRoom(roomWithConns);
    r.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    r.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    r.gameState.hands["player-1"] = [makeCard("A-s", true)];
    r.gameState.hands["player-2"] = [];
    r.gameState.phase = "playing";
    const drawPile = r.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("2-c"), makeCard("3-c"), makeCard("4-c")];

    await r.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), conn1);

    const msgs = conn1.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
    const shuffleEvents = msgs.filter(e => e.type === "PILE_SHUFFLED");
    expect(shuffleEvents).toHaveLength(1);
    expect((shuffleEvents[0] as { type: "PILE_SHUFFLED"; pileId: string }).pileId).toBe("draw");
  });

  it("clears handRevealed for all players", async () => {
    room.gameState.players.find(p => p.id === "player-1")!.handRevealed = true;

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 1 }), sender);

    expect(room.gameState.players.find(p => p.id === "player-1")?.handRevealed).toBe(false);
  });

  it("gathers canvas cards before dealing", async () => {
    room.gameState.canvasCards = [{ card: makeCard("7-d", true), x: 100, y: 100, z: 1 }];
    // Total is now 9 (8 + 1 canvas)

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.canvasCards).toHaveLength(0);
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    const totalAfter =
      drawPile.cards.length +
      room.gameState.hands["player-1"].length +
      room.gameState.hands["player-2"].length;
    expect(totalAfter).toBe(9);
  });

  it("rejects cardsPerPlayer < 1 with INVALID_CARDS_PER_PLAYER error, no mutation", async () => {
    const snapsBefore = room.gameState.undoSnapshots.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 0 }), sender);

    const errors = sender.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INVALID_CARDS_PER_PLAYER");
    expect(room.gameState.undoSnapshots).toHaveLength(snapsBefore); // no snapshot taken
    expect(room.gameState.hands["player-1"]).toHaveLength(2); // unchanged
  });

  it("rejects cardsPerPlayer > 13 with INVALID_CARDS_PER_PLAYER error", async () => {
    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 14 }), sender);

    const errors = sender.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INVALID_CARDS_PER_PLAYER");
  });

  it("rejects when total cards across game < cardsPerPlayer * players, with INSUFFICIENT_CARDS error", async () => {
    // Total = 8 cards, 2 players — max is 4. Request 5.
    const snapsBefore = room.gameState.undoSnapshots.length;

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 5 }), sender);

    const errors = sender.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
      .filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { type: "ERROR"; code: string }).code).toBe("INSUFFICIENT_CARDS");
    expect(room.gameState.undoSnapshots).toHaveLength(snapsBefore); // no snapshot taken
  });

  it("skips disconnected players when dealing", async () => {
    room.gameState.players.push({ id: "player-3", connected: false, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-3"] = [];

    await room.onMessage(JSON.stringify({ type: "DEAL_NEXT_HAND", cardsPerPlayer: 2 }), sender);

    expect(room.gameState.hands["player-3"]).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(2);
    expect(room.gameState.hands["player-2"]).toHaveLength(2);
  });
});
