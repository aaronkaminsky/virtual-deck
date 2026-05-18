import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { viewFor } from "../party/index";
import type * as Party from "partykit/server";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";

describe("REORDER_PILE_SPREAD undo", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [];
  });

  it("takes a snapshot before mutating the spread pile", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.cards.push(makeCard("A-s"), makeCard("K-h"), makeCard("Q-d"));

    await room.onMessage(
      JSON.stringify({ type: "REORDER_PILE_SPREAD", pileId: "play", orderedCardIds: ["K-h", "A-s", "Q-d"] }),
      sender,
    );

    expect(room.gameState.piles.find(p => p.id === "play")!.cards.map(c => c.id))
      .toEqual(["K-h", "A-s", "Q-d"]);
    expect(room.gameState.undoSnapshots).toHaveLength(1);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);
  });

  it("UNDO_MOVE restores the previous spread pile order", async () => {
    const playPile = room.gameState.piles.find(p => p.id === "play")!;
    playPile.cards.push(makeCard("A-s"), makeCard("K-h"), makeCard("Q-d"));

    await room.onMessage(
      JSON.stringify({ type: "REORDER_PILE_SPREAD", pileId: "play", orderedCardIds: ["K-h", "A-s", "Q-d"] }),
      sender,
    );
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.piles.find(p => p.id === "play")!.cards.map(c => c.id))
      .toEqual(["A-s", "K-h", "Q-d"]);
  });
});

describe("REORDER_HAND undo", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    room = new GameRoom(makeMockRoom());
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [];
  });

  it("takes a snapshot before mutating the player's hand", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")];

    await room.onMessage(
      JSON.stringify({ type: "REORDER_HAND", orderedCardIds: ["K-h", "A-s", "Q-d"] }),
      sender,
    );

    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["K-h", "A-s", "Q-d"]);
    expect(room.gameState.undoSnapshots).toHaveLength(1);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(true);
  });

  it("UNDO_MOVE restores the previous hand order", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")];

    await room.onMessage(
      JSON.stringify({ type: "REORDER_HAND", orderedCardIds: ["K-h", "A-s", "Q-d"] }),
      sender,
    );
    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["A-s", "K-h", "Q-d"]);
  });

  it("does NOT take a snapshot when skipSnapshot is true", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-h"), makeCard("Q-d")];

    await room.onMessage(
      JSON.stringify({ type: "REORDER_HAND", orderedCardIds: ["K-h", "A-s", "Q-d"], skipSnapshot: true }),
      sender,
    );

    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["K-h", "A-s", "Q-d"]);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
    expect(viewFor(room.gameState, "player-1").canUndo).toBe(false);
  });

  it("still emits INVALID_REORDER and does not snapshot when skipSnapshot is true with bad ids", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "REORDER_HAND", orderedCardIds: ["X-y"], skipSnapshot: true }),
      sender,
    );

    const errorCalls = sender.send.mock.calls.map((c: string[]) => c[0]);
    const errors = errorCalls.map((c: string) => JSON.parse(c)).filter((e: { type: string }) => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_REORDER");
    expect(room.gameState.undoSnapshots).toHaveLength(0);
    expect(room.gameState.hands["player-1"].map((c: { id: string }) => c.id)).toEqual(["A-s"]);
  });
});
