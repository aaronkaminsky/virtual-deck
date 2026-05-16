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
});
