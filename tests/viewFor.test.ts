import { describe, it, expect } from "vitest";
import { viewFor } from "../party/index";
import type { GameState, Card } from "../src/shared/types";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function makeTestState(): GameState {
  return {
    roomId: "test-room",
    phase: "playing",
    players: [
      { id: "player-1", connected: true },
      { id: "player-2", connected: true },
      { id: "player-3", connected: true },
    ],
    hands: {
      "player-1": [makeCard("A-s"), makeCard("K-s")],
      "player-2": [makeCard("Q-h"), makeCard("J-h"), makeCard("10-h")],
      "player-3": [makeCard("9-d")],
    },
    piles: [
      { id: "draw", name: "Draw", cards: [makeCard("2-c"), makeCard("3-c")], faceUp: false },
      { id: "discard", name: "Discard", cards: [], faceUp: true },
    ],
    undoSnapshots: [],
  };
}

describe("viewFor", () => {
  it("returns myHand with only the requesting player's cards", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.myHand).toHaveLength(2);
    expect(view.myHand.map(c => c.id)).toEqual(["A-s", "K-s"]);
  });

  it("returns opponentHandCounts with counts (not cards) for other players", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.opponentHandCounts["player-2"]).toBe(3);
    expect(view.opponentHandCounts["player-3"]).toBe(1);
  });

  it("does not include requesting player in opponentHandCounts", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.opponentHandCounts["player-1"]).toBeUndefined();
  });

  it("never includes a hands key in the output", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect("hands" in view).toBe(false);
  });

  it("includes piles and players", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.piles).toHaveLength(2);
    expect(view.players).toHaveLength(3);
    expect(view.roomId).toBe("test-room");
    expect(view.phase).toBe("playing");
  });

  it("returns empty myHand for null playerToken", () => {
    const state = makeTestState();
    const view = viewFor(state, null);
    expect(view.myHand).toHaveLength(0);
  });

  it("returns empty myHand for unknown playerToken", () => {
    const state = makeTestState();
    const view = viewFor(state, "unknown-player");
    expect(view.myHand).toHaveLength(0);
  });

  it("returns canUndo false when no snapshot exists for player", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.canUndo).toBe(false);
  });

  it("returns canUndo true when the shared undo stack is non-empty", () => {
    const state = makeTestState();
    state.undoSnapshots.push(makeTestState());
    const view = viewFor(state, "player-1");
    expect(view.canUndo).toBe(true);
  });

  it("returns canUndo false for null playerToken", () => {
    const state = makeTestState();
    const view = viewFor(state, null);
    expect(view.canUndo).toBe(false);
  });

  // Regression: viewFor used to omit myPlayerId from ClientGameState.
  // The client used localStorage playerId as the drag identity, which never matched
  // the server's connection.id (playerToken). Hand drags were always rejected with
  // UNAUTHORIZED_MOVE. Fix: viewFor populates myPlayerId = playerToken so the client
  // can use the server-assigned token for all drag identity checks.
  it("regression: myPlayerId equals the playerToken argument", () => {
    const state = makeTestState();
    const view = viewFor(state, "player-1");
    expect(view.myPlayerId).toBe("player-1");
  });

  it("regression: myPlayerId is empty string for null playerToken", () => {
    const state = makeTestState();
    const view = viewFor(state, null);
    expect(view.myPlayerId).toBe("");
  });
});
