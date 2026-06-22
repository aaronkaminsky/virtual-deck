import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("SET_CHIPS_MODE handler", () => {
  it("first enable sets startingChips for all players and zeroes spread/pot", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 7 });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.pot = 3;

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 750 }), conn1);

    expect(room.gameState.chipsEnabled).toBe(true);
    expect(room.gameState.startingChips).toBe(750);
    expect(room.gameState.chipsInitialized).toBe(true);
    expect(room.gameState.players[0].chipsInHand).toBe(750);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
    expect(room.gameState.players[1].chipsInHand).toBe(750);
    expect(room.gameState.pot).toBe(0);
  });

  it("re-enabling after a prior disable does NOT reset existing amounts", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    // First enable — initializes
    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);
    // Simulate play: stack changes
    room.gameState.players[0].chipsInHand = 400;
    room.gameState.pot = 600;
    // Disable
    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: false, startingChips: 1000 }), conn1);
    // Re-enable
    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);

    expect(room.gameState.chipsEnabled).toBe(true);
    expect(room.gameState.players[0].chipsInHand).toBe(400);
    expect(room.gameState.pot).toBe(600);
  });

  it("updating startingChips while already initialized does not retroactively change existing players", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);
    room.gameState.players[0].chipsInHand = 250;

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 2000 }), conn1);

    expect(room.gameState.startingChips).toBe(2000);
    expect(room.gameState.players[0].chipsInHand).toBe(250);
  });

  it("SET_CHIPS_MODE takes no undo snapshot", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "SET_CHIPS_MODE", enabled: true, startingChips: 1000 }), conn1);

    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });
});
